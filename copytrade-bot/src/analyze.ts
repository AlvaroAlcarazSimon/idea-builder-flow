/**
 * Analiza una wallet para ver si de verdad merece la pena copiarla.
 *   npm run analyze -- <WALLET> [numTxs=300]      historial reciente
 *   npm run analyze -- <WALLET> --live [min=30]   escucha en directo sus operaciones
 */
import "dotenv/config";
import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { fromParsedTransaction, parseSwaps, type SwapEvent } from "./parser.js";

const args = process.argv.slice(2);
const wallet = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a)) ?? process.env.TARGET_WALLETS?.split(/[,\s]+/)[0];
const liveMode = args.includes("--live");
const numArg = Number(args.find((a) => /^\d+$/.test(a)));
const limit = liveMode ? 0 : numArg || 300;
const liveMinutes = liveMode ? numArg || 30 : 0;
if (!wallet) {
  console.error("Uso: npm run analyze -- <WALLET> [numTxs]   ·   npm run analyze -- <WALLET> --live [minutos]");
  process.exit(1);
}

const conn = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", {
  commitment: "confirmed",
  wsEndpoint: process.env.WS_URL || undefined,
});
/** Más menciones por minuto que esto = la wallet sale en txs de terceros y el historial no sirve. */
const NOISY_PER_MIN = 100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TokenStats {
  spent: number;
  received: number;
  buys: number;
  sells: number;
  firstBuy?: number;
  lastSell?: number;
  stillHolding: boolean;
}

async function main() {
  if (liveMode) return live();
  const pk = new PublicKey(wallet!);
  const sigs: ConfirmedSignatureInfo[] = [];
  let before: string | undefined;
  while (sigs.length < limit) {
    const page = await conn.getSignaturesForAddress(pk, { limit: Math.min(1000, limit - sigs.length), before });
    if (page.length === 0) break;
    sigs.push(...page);
    before = page[page.length - 1].signature;
  }
  const ok = sigs.filter((s) => !s.err);
  const times = sigs.map((s) => s.blockTime ?? 0).filter(Boolean);
  const spanMin = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 60 : 0;
  if (sigs.length >= 200 && sigs.length / Math.max(spanMin, 0.1) > NOISY_PER_MIN && !args.includes("--force")) {
    console.log(`\n⚠️  Esta wallet aparece en ~${Math.round(sigs.length / Math.max(spanMin, 0.1))} transacciones por minuto.`);
    console.log("   Casi todas son de otras wallets (bots, spam) que la mencionan sin que ella opere,");
    console.log("   así que su historial público no sirve para analizarla. Escúchala en directo:\n");
    console.log(`     npm run analyze -- ${wallet} --live 30\n`);
    console.log("   (El bot no se ve afectado: solo reacciona a las transacciones que ella firma.)");
    return;
  }
  console.log(`Analizando ${ok.length} transacciones de ${wallet}…`);

  const stats = new Map<string, TokenStats>();
  const buySizes: number[] = [];
  // De la más antigua a la más reciente
  const ordered = ok.reverse();
  for (let i = 0; i < ordered.length; i += 10) {
    const batch = ordered.slice(i, i + 10);
    const txs = await Promise.all(
      batch.map((s) => conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 1 }).catch(() => null)),
    );
    txs.forEach((tx, j) => {
      if (!tx) return;
      for (const ev of parseSwaps(fromParsedTransaction(tx), wallet!, batch[j].signature)) {
        const st = stats.get(ev.mint) ?? { spent: 0, received: 0, buys: 0, sells: 0, stillHolding: false };
        const t = (ev.blockTime ?? 0) * 1000;
        if (ev.side === "buy") {
          st.buys++;
          st.spent += Math.max(0, -ev.solDelta);
          st.firstBuy ??= t;
          if (-ev.solDelta > 0) buySizes.push(-ev.solDelta);
        } else if (!ev.isTransfer) {
          st.sells++;
          st.received += Math.max(0, ev.solDelta);
          st.lastSell = t;
        }
        st.stillHolding = ev.tokenPost > 0n;
        stats.set(ev.mint, st);
      }
    });
    process.stdout.write(`\r  ${Math.min(i + 10, ordered.length)}/${ordered.length}`);
    await sleep(150);
  }
  console.log("\n");

  // Solo tokens con ciclo completo (comprado y vendido dentro de la ventana analizada)
  const closed = [...stats.entries()].filter(([, s]) => s.buys > 0 && s.sells > 0 && s.spent > 0);
  if (closed.length === 0) {
    console.log("No hay trades cerrados de memecoins en esta ventana. Prueba con más transacciones.");
    return;
  }
  const pnls = closed.map(([mint, s]) => ({ mint, pnl: s.received - s.spent, pct: (s.received / s.spent - 1) * 100, s }));
  const wins = pnls.filter((p) => p.pnl > 0);
  const total = pnls.reduce((a, p) => a + p.pnl, 0);
  const totalSpent = pnls.reduce((a, p) => a + p.s.spent, 0);
  const holds = closed.map(([, s]) => ((s.lastSell ?? 0) - (s.firstBuy ?? 0)) / 60_000).filter((m) => m >= 0).sort((a, b) => a - b);
  const sizes = buySizes.sort((a, b) => a - b);
  const median = (arr: number[]) => (arr.length ? arr[Math.floor(arr.length / 2)] : 0);
  const best = [...pnls].sort((a, b) => b.pnl - a.pnl);

  console.log("═══════════════ RESUMEN ═══════════════");
  console.log(`Tokens operados (cerrados): ${closed.length}`);
  console.log(`Win rate:                   ${((wins.length / closed.length) * 100).toFixed(1)}%`);
  console.log(`PnL realizado:              ${total >= 0 ? "+" : ""}${total.toFixed(3)} SOL sobre ${totalSpent.toFixed(2)} SOL invertidos (${((total / totalSpent) * 100).toFixed(1)}%)`);
  console.log(`Tamaño mediano de compra:   ${median(sizes).toFixed(3)} SOL`);
  console.log(`Tiempo mediano en posición: ${median(holds).toFixed(1)} min`);
  console.log(`Abiertos sin vender:        ${[...stats.values()].filter((s) => s.stillHolding).length}`);
  console.log("\nMejores trades:");
  for (const p of best.slice(0, 5)) console.log(`  ${p.mint}  ${p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(3)} SOL (${p.pct.toFixed(0)}%)`);
  console.log("Peores trades:");
  for (const p of best.slice(-5).reverse()) console.log(`  ${p.mint}  ${p.pnl.toFixed(3)} SOL (${p.pct.toFixed(0)}%)`);

  console.log("\n⚠️  Cómo leer esto:");
  if (median(holds) < 1) console.log("  • Mantiene posiciones menos de 1 minuto: copiarle con retraso es MUY difícil, entrarás más caro que él.");
  if (total > 0 && best[0] && best[0].pnl > total) console.log("  • Casi todo el beneficio viene de 1 solo trade: puede ser suerte, no habilidad.");
  if (wins.length / closed.length < 0.35) console.log("  • Win rate bajo: vive de pocos pelotazos. Usa stop loss y tamaño pequeño.");
  console.log("  • Recuerda: tú entras después que él, así que tu resultado será peor que el suyo.");
}

/** Escucha a la wallet en directo (igual que el bot, pero sin operar) y resume lo que hace. */
async function live() {
  process.env.TARGET_WALLETS ||= wallet;
  const { Watcher } = await import("./watcher.js");
  const trades: SwapEvent[] = [];
  const seen = new Set<string>();
  const watcher = new Watcher(conn, [wallet!], (tx, sig) => {
    if (seen.has(sig)) return;
    seen.add(sig);
    for (const ev of parseSwaps(tx, wallet!, sig)) {
      trades.push(ev);
      const t = new Date((ev.blockTime ?? Date.now() / 1000) * 1000).toLocaleTimeString();
      const link = `https://dexscreener.com/solana/${ev.mint}`;
      if (ev.side === "buy") console.log(`${t}  🟢 COMPRA ${(-ev.solDelta).toFixed(3)} SOL  ${link}`);
      else {
        const what = ev.isTransfer ? "MUEVE" : "VENDE";
        const got = ev.solDelta > 0 ? `  +${ev.solDelta.toFixed(3)} SOL` : "";
        console.log(`${t}  🔴 ${what} el ${((ev.sellFraction ?? 1) * 100).toFixed(0)}%${got}  ${link}`);
      }
    }
  });
  console.log(`Escuchando a ${wallet} durante ${liveMinutes} min (Ctrl+C para terminar antes)…\n`);
  await watcher.start();
  const startedAt = Date.now();

  const finish = async () => {
    await watcher.stop();
    const buys = trades.filter((t) => t.side === "buy");
    const sells = trades.filter((t) => t.side === "sell" && !t.isTransfer);
    const spent = buys.reduce((a, t) => a - t.solDelta, 0);
    const got = sells.reduce((a, t) => a + Math.max(0, t.solDelta), 0);
    const tokens = new Set(trades.map((t) => t.mint));
    console.log("\n═══════════════ RESUMEN EN DIRECTO ═══════════════");
    console.log(`Compras: ${buys.length} (${spent.toFixed(2)} SOL, media ${(spent / Math.max(1, buys.length)).toFixed(2)} SOL) · Ventas: ${sells.length} (${got.toFixed(2)} SOL) · Tokens: ${tokens.size}`);
    const hours = (Date.now() - startedAt) / 3_600_000;
    console.log(`Ritmo: ${(buys.length / Math.max(hours, 1 / 60)).toFixed(1)} compras/hora`);
    if (buys.length === 0) console.log("No ha comprado nada en este rato. Prueba a escuchar más tiempo.");
    process.exit(0);
  };
  setTimeout(() => void finish(), liveMinutes * 60_000);
  process.on("SIGINT", () => void finish());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

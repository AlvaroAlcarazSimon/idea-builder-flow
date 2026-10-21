/**
 * Analiza el historial reciente de una wallet para ver si de verdad merece la pena copiarla.
 *   npm run analyze -- <WALLET> [numTxs=300]
 */
import "dotenv/config";
import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { parseSwaps } from "./parser.js";

const wallet = process.argv[2] ?? process.env.TARGET_WALLETS?.split(/[,\s]+/)[0];
const limit = Number(process.argv[3] ?? 300);
if (!wallet) {
  console.error("Uso: npm run analyze -- <WALLET> [numTxs]");
  process.exit(1);
}

const conn = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
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
  console.log(`Analizando ${ok.length} transacciones de ${wallet}…`);

  const stats = new Map<string, TokenStats>();
  const buySizes: number[] = [];
  // De la más antigua a la más reciente
  const ordered = ok.reverse();
  for (let i = 0; i < ordered.length; i += 10) {
    const batch = ordered.slice(i, i + 10);
    const txs = await Promise.all(
      batch.map((s) => conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 }).catch(() => null)),
    );
    txs.forEach((tx, j) => {
      if (!tx) return;
      for (const ev of parseSwaps(tx, wallet!, batch[j].signature)) {
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

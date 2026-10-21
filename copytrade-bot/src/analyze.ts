/**
 * Analiza una wallet para ver si de verdad merece la pena copiarla.
 *   npm run analyze -- <WALLET> [numTxs=300]      historial reciente
 *   npm run analyze -- <WALLET> --live [min=30]   escucha en directo sus operaciones
 */
import "dotenv/config";
import { Connection } from "@solana/web3.js";
import { analyzeHistory } from "./history.js";
import { parseSwaps, type SwapEvent } from "./parser.js";

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
async function main() {
  if (liveMode) return live();
  console.log(`Analizando las últimas ${limit} transacciones de ${wallet}…`);
  const r = await analyzeHistory(conn, wallet!, limit, (done, total) => process.stdout.write(`\r  ${done}/${total}`));
  console.log("\n");
  if (r.noisy && !args.includes("--force")) {
    console.log(`⚠️  Esta wallet aparece en ~${Math.round(r.mentionsPerMin)} transacciones por minuto.`);
    console.log("   Casi todas son de otras wallets (bots, spam) que la mencionan sin que ella opere,");
    console.log("   así que su historial público no sirve para analizarla. Escúchala en directo:\n");
    console.log(`     npm run analyze -- ${wallet} --live 30\n`);
    console.log("   (El bot no se ve afectado: solo reacciona a las transacciones que ella firma.)");
    return;
  }
  if (r.trades.length === 0) {
    console.log("No hay trades cerrados de memecoins en esta ventana. Prueba con más transacciones.");
    return;
  }
  const best = [...r.trades].sort((a, b) => b.pnl - a.pnl);
  const sign = (n: number) => (n >= 0 ? "+" : "");
  console.log("═══════════════ RESUMEN ═══════════════");
  console.log(`Periodo analizado:          ${r.windowHours.toFixed(1)} h · ${r.buys} compras (${r.buysPerDay.toFixed(1)}/día)`);
  console.log(`Tokens operados (cerrados): ${r.trades.length} · abiertos sin vender: ${r.openPositions}`);
  console.log(`Win rate:                   ${(r.winRate * 100).toFixed(1)}%`);
  console.log(`PnL realizado:              ${sign(r.pnlSol)}${r.pnlSol.toFixed(3)} SOL sobre ${r.investedSol.toFixed(2)} SOL invertidos (${((r.pnlSol / r.investedSol) * 100).toFixed(1)}%)`);
  console.log(`Tamaño mediano de compra:   ${r.medianBuySol.toFixed(3)} SOL`);
  console.log(`Tiempo mediano en posición: ${r.medianHoldMin.toFixed(1)} min · <1 min: ${r.scalpPct.toFixed(0)}% · <5 min: ${r.under5MinPct.toFixed(0)}%`);
  if (r.pnlSol > 0) console.log(`Peso del mejor trade:       ${(r.topTradeShare * 100).toFixed(0)}% del beneficio`);
  console.log("\nMejores trades:");
  for (const t of best.slice(0, 5)) console.log(`  ${t.mint}  ${sign(t.pnl)}${t.pnl.toFixed(3)} SOL (${t.pct.toFixed(0)}%) · ${t.holdMin.toFixed(1)} min`);
  console.log("Peores trades:");
  for (const t of best.slice(-5).reverse()) console.log(`  ${t.mint}  ${t.pnl.toFixed(3)} SOL (${t.pct.toFixed(0)}%) · ${t.holdMin.toFixed(1)} min`);
  const icon = { ok: "✅", dudoso: "⚠️ ", no: "❌" }[r.verdict.level];
  console.log(`\nVeredicto: ${icon} ${r.verdict.reason}`);
  console.log("Recuerda: tú entras después que él, así que tu resultado será peor que el suyo.");
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

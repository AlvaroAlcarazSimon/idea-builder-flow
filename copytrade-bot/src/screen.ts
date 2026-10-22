/**
 * Criba varias wallets y dice cuáles se pueden copiar.
 *   npm run screen -- <wallet1> <wallet2> ...
 *   npm run screen -- --kolscan        coge los candidatos de la clasificación de kolscan.io
 *   Opciones: --txs 500 (transacciones por wallet) · --min-profit 300 · --max-trades-day 15
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { analyzeHistory, type HistoryReport } from "./history.js";

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const txs = opt("txs", 500);
const minProfit = opt("min-profit", 300);
const maxTradesDay = opt("max-trades-day", 15);
const optionValues = new Set(["txs", "min-profit", "max-trades-day"].map((n) => args[args.indexOf(`--${n}`) + 1]));

const conn = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", {
  commitment: "confirmed",
  disableRetryOnRateLimit: true,
});

interface Candidate {
  wallet: string;
  name?: string;
  kolscan?: string;
}

interface KolscanEntry {
  wallet_address: string;
  name: string;
  profit: number;
  wins: number;
  losses: number;
  timeframe: number;
}

/** La clasificación viene incrustada en el HTML de kolscan.io (puede romperse si cambian la web). */
async function kolscanCandidates(): Promise<Candidate[]> {
  const res = await fetch("https://kolscan.io/leaderboard", {
    headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" },
    signal: AbortSignal.timeout(20_000),
  });
  const html = (await res.text()).replace(/\\"/g, '"');
  const entries: KolscanEntry[] = [];
  for (const m of html.matchAll(/\{"wallet_address":"[1-9A-HJ-NP-Za-km-z]{32,44}".*?"currency":"\w+"\}/g)) {
    try {
      entries.push(JSON.parse(m[0]));
    } catch {
      // entrada con formato raro: se ignora
    }
  }
  if (entries.length === 0) throw new Error("No he podido leer la clasificación de kolscan.io (¿han cambiado la web?)");

  const byWallet = new Map<string, Partial<Record<number, KolscanEntry>>>();
  for (const e of entries) byWallet.set(e.wallet_address, { ...byWallet.get(e.wallet_address), [e.timeframe]: e });

  const out: Candidate[] = [];
  console.log(`Kolscan: ${byWallet.size} traders. Filtro previo: ≥${minProfit} SOL en 30 días, ≤${maxTradesDay} trades/día, sin win rates imposibles, sin perder esta semana\n`);
  for (const [wallet, tf] of byWallet) {
    const m = tf[30];
    if (!m) continue;
    const n = m.wins + m.losses;
    const perDay = n / 30;
    const wr = n ? m.wins / n : 0;
    const week = tf[7]?.profit;
    if (m.profit < minProfit || perDay > maxTradesDay || n === 0 || (wr > 0.9 && n > 50) || (week !== undefined && week < 0)) continue;
    const kolscan = `30d ${m.profit >= 0 ? "+" : ""}${m.profit.toFixed(0)} SOL, ${perDay.toFixed(1)} trades/día, WR ${(wr * 100).toFixed(0)}%`;
    out.push({ wallet, name: m.name, kolscan });
  }
  return out;
}

const fmt = (n: number, d = 1) => n.toFixed(d);

async function main() {
  let candidates: Candidate[] = args
    .filter((a) => !a.startsWith("--") && !optionValues.has(a))
    .map((wallet) => {
      new PublicKey(wallet);
      return { wallet };
    });
  if (args.includes("--kolscan")) candidates = [...(await kolscanCandidates()), ...candidates];
  if (candidates.length === 0) {
    console.error("Uso: npm run screen -- <wallet1> <wallet2> ...   ·   npm run screen -- --kolscan");
    process.exit(1);
  }

  const results: (Candidate & { report?: HistoryReport; error?: string })[] = [];
  for (const [i, c] of candidates.entries()) {
    const label = `${c.name ?? c.wallet.slice(0, 8)}`;
    process.stdout.write(`[${i + 1}/${candidates.length}] ${label}…`);
    try {
      const report = await analyzeHistory(conn, c.wallet, txs, (done, total) =>
        process.stdout.write(`\r[${i + 1}/${candidates.length}] ${label}… ${done}/${total}   `),
      );
      results.push({ ...c, report });
      process.stdout.write(`\r[${i + 1}/${candidates.length}] ${label}: ${report.verdict.reason}                    \n`);
    } catch (e) {
      results.push({ ...c, error: String(e) });
      process.stdout.write(`\r[${i + 1}/${candidates.length}] ${label}: error (${String(e).slice(0, 80)})\n`);
    }
  }

  const rank = { ok: 0, dudoso: 1, no: 2 } as const;
  results.sort((a, b) => {
    const la = a.report ? rank[a.report.verdict.level] : 3;
    const lb = b.report ? rank[b.report.verdict.level] : 3;
    return la - lb || (b.report?.netPnl ?? 0) - (a.report?.netPnl ?? 0);
  });

  console.log("\n═════════════════════════════ RESULTADO ═════════════════════════════");
  console.log("Trader            Veredicto  Neto (todo)      PnL cerrado      Copiable (>5 min)       WR   Mediana  <1min  Compras/día  Compra media  Periodo");
  for (const r of results) {
    const name = (r.name ?? r.wallet.slice(0, 8)).slice(0, 16).padEnd(16);
    if (!r.report) {
      console.log(`${name}  ❓ error`);
      continue;
    }
    const x = r.report;
    const icon = { ok: "✅ sí   ", dudoso: "⚠️  duda ", no: "❌ no   " }[x.verdict.level];
    if (x.noisy) {
      console.log(`${name}  ${icon}  (historial con ruido de terceros: usa npm run analyze -- ${r.wallet} --live 30)`);
      continue;
    }
    const sol = (n: number) => `${n >= 0 ? "+" : ""}${fmt(n, 2)} SOL`;
    console.log(
      `${name}  ${icon}  ${sol(x.netPnl).padEnd(15)}  ${sol(x.pnlSol).padEnd(15)}  ${`${sol(x.copyablePnl)} (${x.copyableTrades})`.padEnd(22)}` +
        `${fmt(x.winRate * 100, 0).padStart(3)}%  ${fmt(x.medianHoldMin).padStart(6)}m  ${fmt(x.scalpPct, 0).padStart(4)}%  ${fmt(x.buysPerDay).padStart(11)}  ${fmt(x.medianBuySol, 2).padStart(9)} SOL  ${fmt(x.windowHours, 0)} h`,
    );
  }
  console.log("\nCopiables (✅) primero. Antes de meter dinero: déjalos en DRY_RUN unos días con el bot.");
  for (const r of results.filter((r) => r.report?.verdict.level === "ok")) {
    console.log(`  ${r.name ?? ""} ${r.wallet}${r.kolscan ? `  (Kolscan: ${r.kolscan})` : ""}`);
  }

  mkdirSync("data", { recursive: true });
  const file = `data/screen-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(results, null, 2));
  console.log(`\nDetalle guardado en ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

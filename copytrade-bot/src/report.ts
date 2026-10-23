/**
 * Resumen de la simulación en Markdown, por trader.
 *   STATE_FILE=… LOG_FILE=… npm run report -- [--names simulacion/traders.json] > RESUMEN.md
 */
import { existsSync, readFileSync } from "node:fs";
import { State } from "./state.js";

const args = process.argv.slice(2);
const namesFile = args[args.indexOf("--names") + 1];
const names: Record<string, string> = args.includes("--names") && existsSync(namesFile) ? JSON.parse(readFileSync(namesFile, "utf8")) : {};
const state = new State(process.env.STATE_FILE || "./data/state.json");
const logFile = process.env.LOG_FILE || "./data/bot.log";
const log = existsSync(logFile) ? readFileSync(logFile, "utf8").split("\n") : [];

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const name = (w: string) => names[w] ?? short(w);
const sol = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(3).replace(".", ",")} SOL`;
const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1).replace(".", ",")}%`;
/** Horas en la zona del usuario (por defecto, España). */
const TZ = process.env.REPORT_TZ || "Europe/Madrid";
const TZ_LABEL = TZ === "Europe/Madrid" ? "hora de España" : TZ;
const when = (ms: number) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date(ms))
    .replace(",", "");
const ago = (ms: number) => {
  const min = (Date.now() - ms) / 60_000;
  return min < 90 ? `${Math.round(min)} min` : `${(min / 60).toFixed(1).replace(".", ",")} h`;
};

// Señales vistas en el log: "[8oQo…vRgs compra XXXX…pump] el trader gastó"
const byShort = new Map(Object.keys(names).map((w) => [short(w), w]));
const signals = new Map<string, number>();
for (const line of log) {
  const m = line.match(/\[(\S+…\S+) compra \S+\] el trader gastó/);
  if (!m) continue;
  const w = byShort.get(m[1]) ?? m[1];
  signals.set(w, (signals.get(w) ?? 0) + 1);
}
const firstLogTime = log.map((l) => Date.parse(l.slice(0, 24))).find((t) => !Number.isNaN(t));

interface Row {
  copied: number;
  closed: number;
  wins: number;
  pnl: number;
  cost: number;
  open: number;
  openCost: number;
  openValue: number;
}
const rows = new Map<string, Row>();
const row = (w: string) => {
  let r = rows.get(w);
  if (!r) rows.set(w, (r = { copied: 0, closed: 0, wins: 0, pnl: 0, cost: 0, open: 0, openCost: 0, openValue: 0 }));
  return r;
};
for (const w of Object.keys(names)) row(w);
for (const t of state.closed) {
  const r = row(t.source);
  r.copied++;
  r.closed++;
  r.wins += t.realizedPnlSol > 0 ? 1 : 0;
  r.pnl += t.realizedPnlSol;
  r.cost += t.totalCostSol;
}
for (const p of state.positions) {
  const r = row(p.source);
  r.copied++;
  r.open++;
  // Resultado de la posición hasta ahora = lo ya vendido (take profit parcial) + lo que vale lo que queda
  r.openCost += p.totalCostSol;
  r.openValue += p.totalCostSol + p.realizedPnlSol + (p.lastValueSol ?? p.costSol) - p.costSol;
}

const out: string[] = [];
const started = firstLogTime ?? Math.min(...state.closed.map((t) => t.openedAt), ...state.positions.map((p) => p.openedAt), Date.now());
out.push("# 🧪 Simulación del bot de copytrade", "");
out.push(`**Actualizado:** ${when(Date.now())} · **en marcha desde:** ${when(started)} (${ago(started)}) · ${TZ_LABEL}`, "");
out.push("Dinero ficticio: 0,1 SOL por trade, con precios reales de Jupiter y el retraso real del bot. No se ha gastado nada.", "");
const withFees = [...state.closed, ...state.positions].filter((t) => t.feesSol);
if (withFees.length) {
  const fees = withFees.reduce((s, t) => s + (t.feesSol ?? 0), 0);
  out.push(
    `Comisiones estimadas ya descontadas en los resultados: ${fees.toFixed(3).replace(".", ",")} SOL en ${withFees.length} operaciones ` +
      "(comisión de cada compra/venta + depósito de la cuenta de cada token nuevo). Las operaciones anteriores a activar este cálculo no las incluyen.",
    "",
  );
}

out.push("## Resultado por trader", "");
out.push("| Trader | Señales | Copiadas | Cerradas | Aciertos | Resultado cerrado | Abiertas (valor ahora) |");
out.push("|---|---|---|---|---|---|---|");
const sorted = [...rows].sort((a, b) => b[1].pnl + (b[1].openValue - b[1].openCost) - (a[1].pnl + (a[1].openValue - a[1].openCost)));
let totPnl = 0;
let totCost = 0;
let totOpenCost = 0;
let totOpenValue = 0;
for (const [w, r] of sorted) {
  totPnl += r.pnl;
  totCost += r.cost;
  totOpenCost += r.openCost;
  totOpenValue += r.openValue;
  const result = r.closed ? `${sol(r.pnl)} (${pct((r.pnl / r.cost) * 100)})` : "—";
  const open = r.open ? `${r.open} (${pct((r.openValue / r.openCost - 1) * 100)})` : "—";
  const wr = r.closed ? `${Math.round((r.wins / r.closed) * 100)}%` : "—";
  out.push(`| ${name(w)} | ${signals.get(w) ?? 0} | ${r.copied} | ${r.closed} | ${wr} | ${result} | ${open} |`);
}
out.push("");
out.push(
  `**Total cerrado:** ${sol(totPnl)}${totCost ? ` (${pct((totPnl / totCost) * 100)})` : ""} · ` +
    `**abierto:** ${sol(totOpenValue - totOpenCost)} sobre ${totOpenCost.toFixed(2).replace(".", ",")} SOL`,
  "",
);
out.push("_Señales = compras del trader que ha visto el bot. Copiadas = las que ha copiado tras pasar los filtros._", "");

out.push(`## Posiciones abiertas (${state.positions.length})`, "");
if (state.positions.length) {
  out.push("| Token | Trader | Coste | Valor ahora | Pico | Abierta hace |", "|---|---|---|---|---|---|");
  for (const p of state.positions) {
    const value = p.lastValueSol ?? p.costSol;
    out.push(
      `| [${short(p.mint)}](https://dexscreener.com/solana/${p.mint}) | ${name(p.source)} | ${p.costSol.toFixed(3).replace(".", ",")} SOL | ${pct((value / p.costSol - 1) * 100)} | ×${p.peakMultiple.toFixed(2).replace(".", ",")} | ${ago(p.openedAt)} |`,
    );
  }
  out.push("");
}

const recent = state.closed.slice(-20).reverse();
out.push(`## Últimos trades cerrados (${state.closed.length} en total)`, "");
if (recent.length) {
  out.push(`| Cerrado (${TZ_LABEL}) | Token | Trader | Resultado | Duró | Motivo |`, "|---|---|---|---|---|---|");
  for (const t of recent) {
    out.push(
      `| ${when(t.closedAt)} | [${short(t.mint)}](https://dexscreener.com/solana/${t.mint}) | ${name(t.source)} | ${sol(t.realizedPnlSol)} (${pct((t.realizedPnlSol / t.totalCostSol) * 100)}) | ${Math.max(1, Math.round((t.closedAt - t.openedAt) / 60_000))} min | ${t.reason} |`,
    );
  }
}
console.log(out.join("\n"));

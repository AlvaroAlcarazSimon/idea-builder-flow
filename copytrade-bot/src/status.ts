/** Muestra posiciones abiertas e historial.  npm run status */
import { config } from "./config.js";
import { State } from "./state.js";

const state = new State(config.stateFile);
const fmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(4)}`;

console.log(`\nModo: ${config.dryRun ? "SIMULACIÓN" : "REAL"} · PnL hoy: ${fmt(state.todayPnl())} SOL\n`);

console.log(`Posiciones abiertas (${state.positions.length}):`);
for (const p of state.positions) {
  const value = p.lastValueSol;
  const pct = value !== undefined && p.costSol > 0 ? ((value / p.costSol - 1) * 100).toFixed(1) + "%" : "¿?";
  const mins = Math.round((Date.now() - p.openedAt) / 60_000);
  console.log(
    `  ${p.mint}  coste ${p.costSol.toFixed(4)} SOL · valor ${value?.toFixed(4) ?? "¿?"} SOL (${pct}) · pico x${p.peakMultiple.toFixed(2)} · ${mins} min`,
  );
}

const closed = state.closed;
const total = closed.reduce((a, t) => a + t.realizedPnlSol, 0);
const wins = closed.filter((t) => t.realizedPnlSol > 0).length;
console.log(`\nCerradas: ${closed.length} · win rate ${closed.length ? ((wins / closed.length) * 100).toFixed(1) : 0}% · PnL total ${fmt(total)} SOL`);
for (const t of closed.slice(-15).reverse()) {
  console.log(`  ${new Date(t.closedAt).toLocaleString()}  ${t.mint.slice(0, 8)}…  ${fmt(t.realizedPnlSol)} SOL  (${t.reason})`);
}

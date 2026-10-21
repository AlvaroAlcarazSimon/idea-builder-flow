import assert from "node:assert/strict";
import { test } from "node:test";
import { verdictFor, type ClosedTrade, type HistoryReport } from "../src/history.js";

const trade = (pnl: number, holdMin: number): ClosedTrade => ({ mint: "m", spent: 1, received: 1 + pnl, pnl, pct: pnl * 100, holdMin });

function report(trades: ClosedTrade[], extra: Partial<HistoryReport> = {}): HistoryReport {
  const copyable = trades.filter((t) => t.holdMin >= 5);
  const copyablePnl = copyable.reduce((a, t) => a + t.pnl, 0);
  return {
    wallet: "w", signatures: 100, mentionsPerMin: 1, noisy: false, analyzedTxs: 100, ownTxs: 100, windowHours: 24,
    buys: trades.length, buysPerDay: trades.length, medianBuySol: 1, trades, openPositions: 0,
    pnlSol: trades.reduce((a, t) => a + t.pnl, 0), investedSol: trades.length, winRate: 0.5, medianHoldMin: 10,
    scalpPct: 0, under5MinPct: 0, topTradeShare: 0.2,
    copyablePnl, copyableTrades: copyable.length,
    topCopyableShare: copyablePnl > 0 ? Math.max(...copyable.map((t) => t.pnl)) / copyablePnl : 0,
    scalpPnl: trades.filter((t) => t.holdMin < 1).reduce((a, t) => a + t.pnl, 0),
    verdict: { level: "no", reason: "" },
    ...extra,
  };
}

test("copiable: gana con trades largos repartidos", () => {
  const r = report([trade(0.5, 30), trade(0.4, 60), trade(-0.2, 10), trade(0.3, 120), trade(-0.1, 8)]);
  assert.equal(verdictFor(r).level, "ok");
});

test("scalper: gana, pero solo con trades de segundos", () => {
  const r = report([trade(0.5, 0.2), trade(0.4, 0.5), trade(0.3, 0.1), trade(-0.1, 0.3), trade(0.2, 0.4)]);
  assert.equal(verdictFor(r).level, "no");
  assert.match(verdictFor(r).reason, /scalper/);
});

test("gana en total pero lo copiable pierde → no", () => {
  const r = report([trade(2, 0.2), trade(1, 0.5), trade(-0.3, 10), trade(-0.2, 20), trade(-0.1, 30)]);
  assert.match(verdictFor(r).reason, /solo gana con trades de menos/);
});

test("un solo pelotazo → dudoso", () => {
  const r = report([trade(5, 300), trade(-0.2, 10), trade(-0.3, 20), trade(0.1, 15), trade(-0.1, 6)]);
  assert.equal(verdictFor(r).level, "dudoso");
});

test("historial de airdrops de terceros", () => {
  const r = report([trade(0.1, 10)], { analyzedTxs: 100, ownTxs: 5 });
  assert.match(verdictFor(r).reason, /airdrops/);
});

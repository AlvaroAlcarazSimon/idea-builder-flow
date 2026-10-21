import { Connection, PublicKey, type ConfirmedSignatureInfo, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { fromParsedTransaction, parseSwaps } from "./parser.js";

/** Más menciones por minuto que esto = la wallet sale en txs de terceros y el historial no sirve. */
export const NOISY_PER_MIN = 100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ClosedTrade {
  mint: string;
  spent: number;
  received: number;
  pnl: number;
  pct: number;
  holdMin: number;
}

export interface HistoryReport {
  wallet: string;
  signatures: number;
  mentionsPerMin: number;
  noisy: boolean;
  /** Transacciones leídas y cuántas firmó la propia wallet (el resto son de terceros: airdrops, spam, bots). */
  analyzedTxs: number;
  ownTxs: number;
  /** Horas entre su primera y su última operación analizada. */
  windowHours: number;
  buys: number;
  buysPerDay: number;
  medianBuySol: number;
  /** Tokens comprados y vendidos dentro de la ventana. */
  trades: ClosedTrade[];
  openPositions: number;
  pnlSol: number;
  investedSol: number;
  winRate: number;
  medianHoldMin: number;
  /** % de trades cerrados en menos de 1 minuto. */
  scalpPct: number;
  under5MinPct: number;
  /** Parte del beneficio total que viene del mejor trade (1 = todo). */
  topTradeShare: number;
  verdict: { level: "ok" | "dudoso" | "no"; reason: string };
}

interface TokenStats {
  spent: number;
  received: number;
  buys: number;
  sells: number;
  firstBuy?: number;
  lastSell?: number;
  stillHolding: boolean;
}

const median = (arr: number[]) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

async function getTx(conn: Connection, signature: string): Promise<ParsedTransactionWithMeta | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await conn.getParsedTransaction(signature, { maxSupportedTransactionVersion: 1, commitment: "confirmed" });
    } catch (e) {
      if (!/429|too many/i.test(String(e))) return null;
      await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

/** Lee las últimas `limit` transacciones de la wallet y mide cómo opera. */
export async function analyzeHistory(
  conn: Connection,
  wallet: string,
  limit: number,
  onProgress?: (done: number, total: number) => void,
): Promise<HistoryReport> {
  const pk = new PublicKey(wallet);
  const sigs: ConfirmedSignatureInfo[] = [];
  let before: string | undefined;
  while (sigs.length < limit) {
    const page = await conn.getSignaturesForAddress(pk, { limit: Math.min(1000, limit - sigs.length), before });
    if (page.length === 0) break;
    sigs.push(...page);
    before = page[page.length - 1].signature;
  }
  const times = sigs.map((s) => s.blockTime ?? 0).filter(Boolean);
  const spanMin = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 60 : 0;
  const mentionsPerMin = sigs.length / Math.max(spanMin, 0.1);
  const report: HistoryReport = {
    wallet,
    signatures: sigs.length,
    mentionsPerMin,
    noisy: sigs.length >= 200 && mentionsPerMin > NOISY_PER_MIN,
    analyzedTxs: 0,
    ownTxs: 0,
    windowHours: 0,
    buys: 0,
    buysPerDay: 0,
    medianBuySol: 0,
    trades: [],
    openPositions: 0,
    pnlSol: 0,
    investedSol: 0,
    winRate: 0,
    medianHoldMin: 0,
    scalpPct: 0,
    under5MinPct: 0,
    topTradeShare: 0,
    verdict: { level: "no", reason: "" },
  };
  if (report.noisy) {
    report.verdict = { level: "no", reason: "historial lleno de ruido de terceros: analízala con --live" };
    return report;
  }

  const stats = new Map<string, TokenStats>();
  const buySizes: number[] = [];
  const eventTimes: number[] = [];
  // De la más antigua a la más reciente, de 5 en 5 para no saturar el RPC
  const ordered = sigs.filter((s) => !s.err).reverse();
  for (let i = 0; i < ordered.length; i += 5) {
    const batch = ordered.slice(i, i + 5);
    const txs = await Promise.all(batch.map((s) => getTx(conn, s.signature)));
    txs.forEach((tx, j) => {
      if (!tx) return;
      const like = fromParsedTransaction(tx);
      report.analyzedTxs++;
      if (like.accountKeys.some((k) => k.signer && k.pubkey === wallet)) report.ownTxs++;
      for (const ev of parseSwaps(like, wallet, batch[j].signature)) {
        const st = stats.get(ev.mint) ?? { spent: 0, received: 0, buys: 0, sells: 0, stillHolding: false };
        const t = (ev.blockTime ?? 0) * 1000;
        eventTimes.push(t);
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
    onProgress?.(Math.min(i + 5, ordered.length), ordered.length);
    await sleep(200);
  }

  const trades: ClosedTrade[] = [...stats.entries()]
    .filter(([, s]) => s.buys > 0 && s.sells > 0 && s.spent > 0 && s.firstBuy !== undefined && s.lastSell !== undefined)
    .map(([mint, s]) => ({
      mint,
      spent: s.spent,
      received: s.received,
      pnl: s.received - s.spent,
      pct: (s.received / s.spent - 1) * 100,
      holdMin: Math.max(0, (s.lastSell! - s.firstBuy!) / 60_000),
    }));
  const pnl = trades.reduce((a, t) => a + t.pnl, 0);
  const best = trades.reduce((a, t) => Math.max(a, t.pnl), 0);
  const windowMs = eventTimes.length > 1 ? Math.max(...eventTimes) - Math.min(...eventTimes) : 0;
  const pct = (n: number) => (trades.length ? (n / trades.length) * 100 : 0);

  Object.assign(report, {
    windowHours: windowMs / 3_600_000,
    buys: buySizes.length,
    buysPerDay: buySizes.length / Math.max(windowMs / 86_400_000, 1 / 24),
    medianBuySol: median(buySizes),
    trades,
    openPositions: [...stats.values()].filter((s) => s.stillHolding).length,
    pnlSol: pnl,
    investedSol: trades.reduce((a, t) => a + t.spent, 0),
    winRate: trades.length ? trades.filter((t) => t.pnl > 0).length / trades.length : 0,
    medianHoldMin: median(trades.map((t) => t.holdMin)),
    scalpPct: pct(trades.filter((t) => t.holdMin < 1).length),
    under5MinPct: pct(trades.filter((t) => t.holdMin < 5).length),
    topTradeShare: pnl > 0 ? best / pnl : 0,
  });
  report.verdict = verdictFor(report);
  return report;
}

/** ¿Se puede copiar con unos segundos de retraso y salir con beneficio? */
export function verdictFor(r: HistoryReport): HistoryReport["verdict"] {
  if (r.trades.length < 5) {
    if (r.analyzedTxs > 0 && r.ownTxs / r.analyzedTxs < 0.3) {
      return {
        level: "no",
        reason: `solo ${r.ownTxs} de ${r.analyzedTxs} transacciones son suyas (el resto, airdrops y spam de terceros): analízala con --live o más --txs`,
      };
    }
    return { level: "no", reason: `pocos trades cerrados para juzgar (${r.trades.length})` };
  }
  if (r.pnlSol <= 0) return { level: "no", reason: "pierde en el periodo analizado" };
  if (r.scalpPct > 40 || r.medianHoldMin < 2) return { level: "no", reason: "scalper: aguanta demasiado poco para copiarle" };
  if (r.topTradeShare > 0.7) return { level: "dudoso", reason: "casi todo el beneficio viene de un solo trade" };
  if (r.winRate < 0.3) return { level: "dudoso", reason: "acierta poco: vive de pocos pelotazos" };
  return { level: "ok", reason: "copiable" };
}

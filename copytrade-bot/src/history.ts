import { Connection, PublicKey, type ConfirmedSignatureInfo, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { fromParsedTransaction, parseSwaps } from "./parser.js";

/** Más menciones por minuto que esto = la wallet sale en txs de terceros y el historial no sirve. */
export const NOISY_PER_MIN = 100;
/** Trades más largos que esto se pueden copiar con unos segundos de retraso. */
export const COPYABLE_MIN = 5;
/** Máximo de tokens vendidos en la ventana cuya compra (anterior) se busca en el historial de su cuenta. */
const MAX_PREWINDOW_LOOKUPS = 20;

const TOKEN_PROGRAMS = [
  new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
];
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

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
  /** Beneficio de los trades de ≥ COPYABLE_MIN minutos: lo que un copiador con retraso puede capturar. */
  copyablePnl: number;
  copyableTrades: number;
  /** Parte del beneficio copiable que viene de su mejor trade copiable. */
  topCopyableShare: number;
  /** Beneficio de los trades de menos de 1 minuto (no copiable). */
  scalpPnl: number;
  /**
   * Beneficio neto de TODOS los tokens que compró en la ventana (lo no vendido cuenta como pérdida).
   * Es lo que importa: el bot copia todas sus compras, no sabe de antemano cuáles aguantará.
   */
  netPnl: number;
  netTokens: number;
  /** netPnl sin su mejor token: si es negativo, todo depende de un pelotazo. */
  netPnlWithoutBest: number;
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
    copyablePnl: 0,
    copyableTrades: 0,
    topCopyableShare: 0,
    scalpPnl: 0,
    netPnl: 0,
    netTokens: 0,
    netPnlWithoutBest: 0,
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
        const st = stats.get(ev.mint) ?? emptyStats();
        accumulate(st, ev);
        stats.set(ev.mint, st);
        eventTimes.push((ev.blockTime ?? 0) * 1000);
        if (ev.side === "buy" && -ev.solDelta > 0) buySizes.push(-ev.solDelta);
      }
    });
    onProgress?.(Math.min(i + 5, ordered.length), ordered.length);
    await sleep(200);
  }

  // Tokens que vende en la ventana pero compró antes: son sus posiciones largas (las más copiables).
  // Su compra se busca en el historial de su cuenta de ese token, que no tiene ruido de terceros.
  const processed = new Set(ordered.map((s) => s.signature));
  const preWindow = [...stats.entries()]
    .filter(([, s]) => s.sells > 0 && s.buys === 0)
    .sort((a, b) => b[1].received - a[1].received)
    .slice(0, MAX_PREWINDOW_LOOKUPS);
  for (const [mint] of preWindow) {
    const full = await tokenHistory(conn, pk, new PublicKey(mint), processed);
    if (full && full.buys > 0) stats.set(mint, full);
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
  const copyable = trades.filter((t) => t.holdMin >= COPYABLE_MIN);
  const copyablePnl = copyable.reduce((a, t) => a + t.pnl, 0);
  const bestCopyable = copyable.reduce((a, t) => Math.max(a, t.pnl), 0);
  const bought = [...stats.values()].filter((s) => s.buys > 0 && s.spent > 0).map((s) => s.received - s.spent);
  const netPnl = bought.reduce((a, p) => a + p, 0);
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
    copyablePnl,
    copyableTrades: copyable.length,
    topCopyableShare: copyablePnl > 0 ? bestCopyable / copyablePnl : 0,
    scalpPnl: trades.filter((t) => t.holdMin < 1).reduce((a, t) => a + t.pnl, 0),
    netPnl,
    netTokens: bought.length,
    netPnlWithoutBest: bought.length ? netPnl - Math.max(...bought) : 0,
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
  if (r.copyableTrades < 3) return { level: "no", reason: `scalper: casi no aguanta más de ${COPYABLE_MIN} min` };
  if (r.copyablePnl <= 0) {
    return { level: "no", reason: r.pnlSol > 0 ? `solo gana con trades de menos de ${COPYABLE_MIN} min (no copiable)` : "pierde en el periodo analizado" };
  }
  if (r.netPnl <= 0) {
    return { level: "no", reason: "copiando todas sus compras se pierde (lo que no vende cuenta como pérdida)" };
  }
  if (r.topCopyableShare > 0.7 || r.netPnlWithoutBest <= 0) {
    return { level: "dudoso", reason: "su beneficio viene casi todo de un solo trade" };
  }
  return { level: "ok", reason: `copiable: gana copiando todas sus compras y con trades de más de ${COPYABLE_MIN} min` };
}

function emptyStats(): TokenStats {
  return { spent: 0, received: 0, buys: 0, sells: 0, stillHolding: false };
}

function accumulate(st: TokenStats, ev: ReturnType<typeof parseSwaps>[number]) {
  const t = (ev.blockTime ?? 0) * 1000;
  if (ev.side === "buy") {
    st.buys++;
    st.spent += Math.max(0, -ev.solDelta);
    st.firstBuy ??= t;
  } else if (!ev.isTransfer) {
    st.sells++;
    st.received += Math.max(0, ev.solDelta);
    st.lastSell = t;
  }
  st.stillHolding = ev.tokenPost > 0n;
}

/** Historial completo de la wallet en un token, leído de su cuenta de ese token (Token y Token-2022). */
async function tokenHistory(conn: Connection, owner: PublicKey, mint: PublicKey, known: Set<string>): Promise<TokenStats | null> {
  const sigs: ConfirmedSignatureInfo[] = [];
  for (const program of TOKEN_PROGRAMS) {
    const [ata] = PublicKey.findProgramAddressSync([owner.toBuffer(), program.toBuffer(), mint.toBuffer()], ATA_PROGRAM);
    sigs.push(...(await conn.getSignaturesForAddress(ata, { limit: 200 }).catch(() => [])));
  }
  if (sigs.length === 0) return null;
  const st = emptyStats();
  const unique = [...new Map(sigs.filter((s) => !s.err).map((s) => [s.signature, s])).values()];
  unique.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  for (const s of unique) {
    const tx = await getTx(conn, s.signature);
    if (!tx) continue;
    known.add(s.signature);
    for (const ev of parseSwaps(fromParsedTransaction(tx), owner.toBase58(), s.signature)) {
      if (ev.mint === mint.toBase58()) accumulate(st, ev);
    }
    await sleep(100);
  }
  return st;
}

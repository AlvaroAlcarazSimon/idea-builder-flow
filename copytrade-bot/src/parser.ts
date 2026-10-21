import type { ParsedTransactionWithMeta } from "@solana/web3.js";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const STABLE_MINTS = new Set([USDC_MINT, USDT_MINT]);
export const QUOTE_MINTS = new Set([WSOL_MINT, ...STABLE_MINTS]);

const LAMPORTS_PER_SOL = 1_000_000_000;
/** Por debajo de esto un cambio de SOL se considera ruido (fees, rent, tips). */
const SOL_DUST = 0.003;

export interface SwapEvent {
  signature: string;
  wallet: string;
  side: "buy" | "sell";
  mint: string;
  decimals: number;
  /** Cantidad de tokens (raw) antes y después de la tx para esa wallet. */
  tokenPre: bigint;
  tokenPost: bigint;
  /** Variación de SOL (+WSOL) de la wallet, sin contar la fee de la tx. Negativo = gastó SOL. */
  solDelta: number;
  /** Variación de USDC/USDT en unidades (no raw). */
  stableDelta: number;
  /** Solo en ventas: fracción de la bolsa que ha vendido (0..1). */
  sellFraction?: number;
  /** Venta sin recibir nada a cambio: tokens enviados a otra wallet. */
  isTransfer?: boolean;
  blockTime: number | null;
  slot: number;
}

/**
 * Lo mínimo que necesita el parser. Sirve igual para una tx de getParsedTransaction
 * que para una tx de un bloque leído en modo "accounts" (que no trae instrucciones).
 */
export interface TxLike {
  slot: number;
  blockTime?: number | null;
  meta: {
    err: unknown;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: TokenBalanceLike[] | null;
    postTokenBalances?: TokenBalanceLike[] | null;
  } | null;
  /** Direcciones en base58: comparar strings es mucho más rápido que crear miles de PublicKey por bloque. */
  accountKeys: { pubkey: string; signer: boolean }[];
}

export interface TokenBalanceLike {
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
}

export function fromParsedTransaction(tx: ParsedTransactionWithMeta): TxLike {
  return {
    slot: tx.slot,
    blockTime: tx.blockTime,
    meta: tx.meta,
    accountKeys: tx.transaction.message.accountKeys.map((k) => ({ pubkey: k.pubkey.toBase58(), signer: k.signer })),
  };
}

interface MintBalance {
  pre: bigint;
  post: bigint;
  decimals: number;
}

function addBalances(map: Map<string, MintBalance>, balances: TokenBalanceLike[] | null | undefined, wallet: string, key: "pre" | "post") {
  for (const b of balances ?? []) {
    if (b.owner !== wallet) continue;
    const entry = map.get(b.mint) ?? { pre: 0n, post: 0n, decimals: b.uiTokenAmount.decimals };
    entry[key] += BigInt(b.uiTokenAmount.amount);
    map.set(b.mint, entry);
  }
}

/** Variaciones de tokens SPL (incluye Token-2022) de `wallet` en una tx. */
export function tokenBalanceChanges(tx: TxLike, wallet: string): Map<string, MintBalance> {
  const map = new Map<string, MintBalance>();
  addBalances(map, tx.meta?.preTokenBalances, wallet, "pre");
  addBalances(map, tx.meta?.postTokenBalances, wallet, "post");
  return map;
}

/**
 * Variación de SOL nativo + WSOL de la wallet. Con `excludeFee` se devuelve la fee si ella la pagó
 * (para medir el tamaño del swap del trader); sin ella, es el impacto real en el saldo (para nuestro PnL).
 */
export function solChange(
  tx: TxLike,
  wallet: string,
  tokenChanges = tokenBalanceChanges(tx, wallet),
  excludeFee = true,
): number {
  const meta = tx.meta;
  if (!meta) return 0;
  const idx = tx.accountKeys.findIndex((k) => k.pubkey === wallet);
  let lamports = 0;
  if (idx >= 0) {
    lamports = meta.postBalances[idx] - meta.preBalances[idx];
    if (idx === 0 && excludeFee) lamports += meta.fee;
  }
  const wsol = tokenChanges.get(WSOL_MINT);
  if (wsol) lamports += Number(wsol.post - wsol.pre);
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Detecta compras y ventas de memecoins de `wallet` en una transacción.
 * Funciona con cualquier DEX/agregador (Pump.fun, Raydium, Meteora, Jupiter, Photon, BullX, Axiom...)
 * porque mira cómo cambian los balances, no qué programa se ha usado.
 */
export function parseSwaps(tx: TxLike, wallet: string, signature: string): SwapEvent[] {
  if (!tx.meta || tx.meta.err) return [];
  // Solo cuentan las txs que firma la propia wallet. Hay programas de terceros que la incluyen como
  // cuenta de solo lectura en cientos de txs por segundo, y eso no son operaciones suyas.
  if (!tx.accountKeys.some((k) => k.signer && k.pubkey === wallet)) return [];

  const changes = tokenBalanceChanges(tx, wallet);
  const solDelta = solChange(tx, wallet, changes);
  let stableDelta = 0;
  for (const mint of STABLE_MINTS) {
    const c = changes.get(mint);
    if (c) stableDelta += Number(c.post - c.pre) / 10 ** c.decimals;
  }

  const memeChanges = [...changes.entries()].filter(([mint, c]) => !QUOTE_MINTS.has(mint) && c.post !== c.pre);
  const anyMemeDecreased = memeChanges.some(([, c]) => c.post < c.pre);
  const paidSomething = solDelta < -SOL_DUST || stableDelta < -0.5 || anyMemeDecreased;
  const receivedSomething = solDelta > SOL_DUST || stableDelta > 0.5;

  const events: SwapEvent[] = [];
  for (const [mint, c] of memeChanges) {
    const base = {
      signature,
      wallet,
      mint,
      decimals: c.decimals,
      tokenPre: c.pre,
      tokenPost: c.post,
      solDelta,
      stableDelta,
      blockTime: tx.blockTime ?? null,
      slot: tx.slot,
    };
    if (c.post > c.pre) {
      // Recibir tokens sin pagar nada = airdrop / transferencia entrante → no es señal
      if (paidSomething) events.push({ ...base, side: "buy" });
    } else {
      const sold = c.pre - c.post;
      // Escalamos a 1e6 para no perder precisión al convertir bigint → number
      const fraction = c.pre > 0n ? Number((sold * 1_000_000n) / c.pre) / 1_000_000 : 1;
      const isTransfer = !receivedSomething && memeChanges.length === 1;
      events.push({ ...base, side: "sell", sellFraction: Math.min(1, fraction), isTransfer });
    }
  }
  return events;
}

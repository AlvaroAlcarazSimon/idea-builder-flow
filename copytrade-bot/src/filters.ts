import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";
import { config } from "./config.js";

/**
 * Comprobaciones de seguridad antes de comprar. Devuelve el motivo para NO comprar, o null si pasa.
 * Se ejecutan en paralelo para no perder velocidad.
 */
export async function checkToken(conn: Connection, mint: string): Promise<string | null> {
  if (config.tokenBlacklist.has(mint)) return "token en la blacklist";

  const checks: Promise<string | null>[] = [];
  if (config.requireNoMintAuthority || config.requireNoFreezeAuthority) checks.push(checkAuthorities(conn, mint));
  if (config.minLiquidityUsd > 0 || config.maxMarketCapUsd > 0) checks.push(checkMarket(mint));

  const results = await Promise.all(checks);
  return results.find((r) => r !== null) ?? null;
}

async function checkAuthorities(conn: Connection, mint: string): Promise<string | null> {
  const acc = await conn.getParsedAccountInfo(new PublicKey(mint), "confirmed");
  const info = (acc.value?.data as ParsedAccountData | undefined)?.parsed?.info;
  if (!info) return "no se pudo leer el mint";
  // Con mint authority el dev puede imprimir tokens infinitos; con freeze authority te puede congelar (honeypot).
  if (config.requireNoMintAuthority && info.mintAuthority) return "el token tiene mint authority activa";
  if (config.requireNoFreezeAuthority && info.freezeAuthority) return "el token tiene freeze authority (posible honeypot)";
  return null;
}

interface DexPair {
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
}

async function checkMarket(mint: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, { signal: AbortSignal.timeout(4000) });
    const pairs = (await res.json()) as DexPair[];
    if (!Array.isArray(pairs) || pairs.length === 0) return "sin datos de mercado en DexScreener";
    const liquidity = Math.max(...pairs.map((p) => p.liquidity?.usd ?? 0));
    const mcap = Math.max(...pairs.map((p) => p.marketCap ?? p.fdv ?? 0));
    if (config.minLiquidityUsd > 0 && liquidity < config.minLiquidityUsd) return `liquidez baja ($${liquidity.toFixed(0)})`;
    if (config.maxMarketCapUsd > 0 && mcap > config.maxMarketCapUsd) return `market cap demasiado alto ($${mcap.toFixed(0)})`;
    return null;
  } catch {
    return "DexScreener no responde";
  }
}

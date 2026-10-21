import "dotenv/config";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

function str(name: string, def?: string): string {
  const v = process.env[name]?.trim();
  if (v === undefined || v === "") {
    if (def === undefined) throw new Error(`Falta la variable de entorno ${name} (mira .env.example)`);
    return def;
  }
  return v;
}

function num(name: string, def: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return def;
  const n = Number(raw.replace(/_/g, ""));
  if (!Number.isFinite(n)) throw new Error(`${name} debe ser un número, recibido "${raw}"`);
  return n;
}

function bool(name: string, def: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return def;
  return ["1", "true", "yes", "si", "sí", "on"].includes(raw);
}

function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePubkeys(name: string, values: string[]): string[] {
  return values.map((v) => {
    try {
      return new PublicKey(v).toBase58();
    } catch {
      throw new Error(`${name}: "${v}" no es una dirección de Solana válida`);
    }
  });
}

export type BuyMode = "fixed" | "proportional";

function loadConfig() {
  const dryRun = bool("DRY_RUN", true);
  const rpcUrl = str("RPC_URL", "https://api.mainnet-beta.solana.com");

  const targets = parsePubkeys("TARGET_WALLETS", list("TARGET_WALLETS"));
  if (targets.length === 0) throw new Error("TARGET_WALLETS está vacío: pon la wallet del trader a copiar");

  const buyMode = str("BUY_MODE", "fixed") as BuyMode;
  if (buyMode !== "fixed" && buyMode !== "proportional") throw new Error("BUY_MODE debe ser fixed o proportional");

  return {
    dryRun,
    rpcUrl,
    wsUrl: process.env.WS_URL?.trim() || rpcUrl.replace(/^http/, "ws"),
    commitment: "confirmed" as const,
    targets,

    // Tamaño de las compras
    buyMode,
    buyAmountSol: num("BUY_AMOUNT_SOL", 0.1),
    copyRatio: num("COPY_RATIO", 0.1),
    minBuySol: num("MIN_BUY_SOL", 0.01),
    maxBuySol: num("MAX_BUY_SOL", 0.5),
    minTargetBuySol: num("MIN_TARGET_BUY_SOL", 0.05),
    allowAddOnRebuy: bool("ALLOW_ADD_ON_REBUY", false),
    maxSignalAgeSec: num("MAX_SIGNAL_AGE_SEC", 30),
    /** No comprar si entraríamos más de este % por encima del precio al que compró el trader. 0 = sin límite. */
    maxEntryPremiumPct: num("MAX_ENTRY_PREMIUM_PCT", 25),

    // Ejecución
    slippageBps: num("SLIPPAGE_BPS", 1500),
    sellSlippageBps: num("SELL_SLIPPAGE_BPS", 2500),
    priorityLevel: str("PRIORITY_LEVEL", "veryHigh") as "medium" | "high" | "veryHigh",
    priorityFeeMaxLamports: num("PRIORITY_FEE_MAX_LAMPORTS", 2_000_000),
    maxPriceImpactPct: num("MAX_PRICE_IMPACT_PCT", 15),
    jupiterApiUrl: str("JUPITER_API_URL", "https://lite-api.jup.ag/swap/v1").replace(/\/$/, ""),
    jupiterApiKey: process.env.JUPITER_API_KEY?.trim() || undefined,
    sellRetries: num("SELL_RETRIES", 3),

    // Ventas / gestión de la posición
    mirrorSells: bool("MIRROR_SELLS", true),
    mirrorTransfersAsSell: bool("MIRROR_TRANSFERS_AS_SELL", true),
    takeProfitPct: num("TAKE_PROFIT_PCT", 100),
    takeProfitSellPct: num("TAKE_PROFIT_SELL_PCT", 50),
    stopLossPct: num("STOP_LOSS_PCT", 40),
    trailingStopPct: num("TRAILING_STOP_PCT", 30),
    trailingActivationPct: num("TRAILING_ACTIVATION_PCT", 30),
    maxHoldMinutes: num("MAX_HOLD_MINUTES", 0),
    priceCheckIntervalSec: num("PRICE_CHECK_INTERVAL_SEC", 5),

    // Riesgo
    maxOpenPositions: num("MAX_OPEN_POSITIONS", 5),
    maxDailyLossSol: num("MAX_DAILY_LOSS_SOL", 1),
    minSolReserve: num("MIN_SOL_RESERVE", 0.05),

    // Filtros de seguridad del token
    requireNoMintAuthority: bool("REQUIRE_NO_MINT_AUTHORITY", true),
    requireNoFreezeAuthority: bool("REQUIRE_NO_FREEZE_AUTHORITY", true),
    checkSellRoute: bool("CHECK_SELL_ROUTE", true),
    maxRoundTripLossPct: num("MAX_ROUNDTRIP_LOSS_PCT", 40),
    minLiquidityUsd: num("MIN_LIQUIDITY_USD", 0),
    maxMarketCapUsd: num("MAX_MARKET_CAP_USD", 0),
    tokenBlacklist: new Set(list("TOKEN_BLACKLIST")),

    // Detección: respaldo por si el websocket se pierde algo
    pollIntervalSec: num("POLL_INTERVAL_SEC", 2),
    maxBackfillSlots: num("MAX_BACKFILL_SLOTS", 25),
    maxScansPerMin: num("MAX_SCANS_PER_MIN", 60),
    /** Cada cuánto se comprueba el saldo del trader en los tokens que tenemos (detecta ventas perdidas). */
    sourceCheckIntervalSec: num("SOURCE_CHECK_INTERVAL_SEC", 15),

    // Notificaciones
    telegramToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
    telegramChatId: process.env.TELEGRAM_CHAT_ID?.trim() || undefined,

    stateFile: str("STATE_FILE", "./data/state.json"),
    logFile: process.env.LOG_FILE?.trim() || "./data/bot.log",
  };
}

export const config = loadConfig();
export type Config = typeof config;

/** Keypair del bot. En DRY_RUN es opcional; si no hay, se usa una wallet efímera solo para cotizar. */
export function loadKeypair(): Keypair | undefined {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) {
    if (!config.dryRun) throw new Error("PRIVATE_KEY es obligatoria con DRY_RUN=false");
    return undefined;
  }
  try {
    if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch {
    throw new Error("PRIVATE_KEY no es válida (base58 o array JSON de 64 bytes)");
  }
}

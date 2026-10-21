import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";
import type { SwapEvent } from "../src/parser.js";

const TARGET = Keypair.generate().publicKey.toBase58();
const MEME = Keypair.generate().publicKey.toBase58();
const dir = mkdtempSync(join(tmpdir(), "copybot-"));
Object.assign(process.env, {
  TARGET_WALLETS: TARGET,
  DRY_RUN: "true",
  PRIVATE_KEY: "",
  BUY_MODE: "fixed",
  BUY_AMOUNT_SOL: "0.1",
  TAKE_PROFIT_PCT: "100",
  TAKE_PROFIT_SELL_PCT: "50",
  STOP_LOSS_PCT: "40",
  TRAILING_STOP_PCT: "30",
  TRAILING_ACTIVATION_PCT: "30",
  STATE_FILE: join(dir, "state.json"),
  LOG_FILE: join(dir, "bot.log"),
});

const { State } = await import("../src/state.js");
const { Trader } = await import("../src/trader.js");

const LAMPORTS = 1_000_000_000;
/** Precio simulado: SOL que vale 1 token (raw). */
let price = 0.1 / 1_000_000;
/** Tokens que tiene el trader según el RPC (para la red de seguridad de ventas). */
let sourceBalance = 1000n;

const fakeExec = {
  conn: { getParsedAccountInfo: async () => ({ value: { data: { parsed: { info: { mintAuthority: null, freezeAuthority: null } } } } }) },
  pubkey: undefined,
  solBalance: async () => Infinity,
  tokenBalance: async () => sourceBalance,
  quoteBuy: async (mint: string, sol: number) => ({
    inputMint: "SOL",
    outputMint: mint,
    inAmount: String(Math.floor(sol * LAMPORTS)),
    outAmount: String(Math.floor(sol / price)),
    priceImpactPct: "0.01",
  }),
  quoteSell: async (mint: string, tokens: bigint) => ({
    inputMint: mint,
    outputMint: "SOL",
    inAmount: tokens.toString(),
    outAmount: String(Math.floor(Number(tokens) * price * LAMPORTS)),
    priceImpactPct: "0.01",
  }),
  execute: async (q: { inAmount: string; outAmount: string }) => ({
    signature: "SIM",
    inAmount: BigInt(q.inAmount),
    outAmount: BigInt(q.outAmount),
  }),
};

const ev = (side: "buy" | "sell", extra: Partial<SwapEvent> = {}): SwapEvent => ({
  signature: Math.random().toString(),
  wallet: TARGET,
  side,
  mint: MEME,
  decimals: 6,
  tokenPre: 0n,
  tokenPost: 0n,
  solDelta: side === "buy" ? -1 : 1,
  stableDelta: 0,
  blockTime: Math.floor(Date.now() / 1000),
  slot: 1,
  ...extra,
});

const flush = () => new Promise((r) => setTimeout(r, 20));

test("ciclo completo: compra → take profit parcial → trailing stop", async () => {
  const state = new State(join(dir, "s1.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;

  trader.onSwap(ev("buy"));
  await flush();
  const pos = state.getPosition(MEME)!;
  assert.ok(pos, "debería haber abierto posición");
  assert.ok(Math.abs(pos.costSol - 0.1) < 1e-6);

  price *= 2.5; // +150% → take profit vende el 50%
  await trader.checkPosition(MEME);
  assert.equal(state.getPosition(MEME)!.takeProfitDone, true);
  assert.ok(Math.abs(state.getPosition(MEME)!.costSol - 0.05) < 1e-6);

  price *= 1.2; // nuevo pico x3
  await trader.checkPosition(MEME);
  price *= 0.6; // cae 40% desde el pico → trailing stop
  await trader.checkPosition(MEME);
  assert.equal(state.getPosition(MEME), undefined, "el trailing stop debería cerrar");
  const [closed] = state.closed;
  assert.ok(closed.realizedPnlSol > 0, `PnL=${closed.realizedPnlSol}`);
});

test("copia la venta parcial del trader y no compra dos veces el mismo token", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s2.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;

  trader.onSwap(ev("buy", { tokenPost: 1000n }));
  trader.onSwap(ev("buy", { tokenPre: 1000n, tokenPost: 2000n }));
  await flush();
  assert.ok(Math.abs(state.getPosition(MEME)!.totalCostSol - 0.1) < 1e-6, "solo una compra");
  assert.equal(state.getPosition(MEME)!.sourceTokens, "2000", "recuerda lo que tiene el trader");

  trader.onSwap(ev("sell", { tokenPre: 2000n, tokenPost: 1000n, sellFraction: 0.5 }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "500000");

  trader.onSwap(ev("sell", { tokenPre: 1000n, tokenPost: 0n, sellFraction: 1 }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined);
});

test("stop loss y señales viejas", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s3.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;

  trader.onSwap(ev("buy", { blockTime: Math.floor(Date.now() / 1000) - 600 }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined, "no debe copiar una señal de hace 10 min");

  trader.onSwap(ev("buy"));
  await flush();
  price *= 0.5;
  await trader.checkPosition(MEME);
  assert.equal(state.getPosition(MEME), undefined);
  assert.ok(state.closed[0].reason.startsWith("stop loss"));
  assert.ok(state.todayPnl() < 0);
});

test("red de seguridad: detecta la venta por saldo, exige verla dos veces y no vende doble", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s4.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;

  trader.onSwap(ev("buy", { tokenPost: 1000n }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "1000000");

  // El trader vende el 60% y el aviso en tiempo real se pierde
  sourceBalance = 400n;
  await trader.checkSource(MEME);
  assert.equal(state.getPosition(MEME)!.tokens, "1000000", "una sola lectura no basta");
  await trader.checkSource(MEME);
  assert.equal(state.getPosition(MEME)!.tokens, "400000", "vende el 60% como él");

  // Llega tarde el aviso en tiempo real de esa misma venta: no hay que vender otra vez
  trader.onSwap(ev("sell", { tokenPre: 1000n, tokenPost: 400n, sellFraction: 0.6 }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "400000");

  // Un nodo RPC desfasado que da 0 una vez no provoca una venta
  sourceBalance = 0n;
  await trader.checkSource(MEME);
  sourceBalance = 400n;
  await trader.checkSource(MEME);
  assert.equal(state.getPosition(MEME)!.tokens, "400000");
});

test("entryPremiumPct: compara nuestro precio con el del trader", async () => {
  const { entryPremiumPct } = await import("../src/trader.js");
  // Él: 1 SOL por 1.000.000 tokens. Nosotros: 0,1 SOL por 80.000 tokens → un 25% más caro
  const e = ev("buy", { solDelta: -1, tokenPre: 0n, tokenPost: 1_000_000n });
  assert.ok(Math.abs(entryPremiumPct(e, String(0.1 * LAMPORTS), "80000")! - 25) < 1e-9);
  // Si pagó en USDC no se puede comparar
  assert.equal(entryPremiumPct(ev("buy", { solDelta: 0, stableDelta: -100, tokenPost: 1000n }), "1", "1"), undefined);
});

test("no copia si el precio ya ha subido demasiado desde su compra", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s5.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;
  // Él compró 1 SOL al precio de 1 SOL por 15M tokens; ahora cuesta 0,1 SOL por 1M → un 50% más caro
  trader.onSwap(ev("buy", { solDelta: -1, tokenPre: 0n, tokenPost: 15_000_000n }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined);
  // Al mismo precio que él (1 SOL por 10M tokens) sí copia
  trader.onSwap(ev("buy", { solDelta: -1, tokenPre: 0n, tokenPost: 10_000_000n }));
  await flush();
  assert.ok(state.getPosition(MEME));
});

test("no vuelve a entrar en un token recién cerrado (REBUY_COOLDOWN_MIN)", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s6.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;
  trader.onSwap(ev("buy", { tokenPost: 1000n }));
  await flush();
  trader.onSwap(ev("sell", { tokenPre: 1000n, tokenPost: 0n, sellFraction: 1 }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined);
  trader.onSwap(ev("buy", { tokenPost: 1000n }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined, "no recompra a los pocos segundos");
});

test("no copia ampliaciones: si el trader ya tenía el token, no es una entrada", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s7.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;
  trader.onSwap(ev("buy", { tokenPre: 5000n, tokenPost: 6000n }));
  await flush();
  assert.equal(state.getPosition(MEME), undefined);
  trader.onSwap(ev("buy", { tokenPre: 0n, tokenPost: 1000n }));
  await flush();
  assert.ok(state.getPosition(MEME));
});

test("acumula reducciones pequeñas del trader y vende cuando suman suficiente", async () => {
  price = 0.1 / 1_000_000;
  const state = new State(join(dir, "s8.json"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trader = new Trader(fakeExec as any, state) as any;
  trader.onSwap(ev("buy", { tokenPost: 1000n }));
  await flush();
  // Suelta un 4% y otro 4%: aún no merece la pena vender
  trader.onSwap(ev("sell", { tokenPre: 1000n, tokenPost: 960n, sellFraction: 0.04, isTransfer: true }));
  trader.onSwap(ev("sell", { tokenPre: 960n, tokenPost: 920n, sellFraction: 0.042, isTransfer: true }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "1000000");
  // Otro 4% más: ya suma un 12% desde la última referencia → vende ese 12%
  trader.onSwap(ev("sell", { tokenPre: 920n, tokenPost: 880n, sellFraction: 0.043, isTransfer: true }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "880000");
});

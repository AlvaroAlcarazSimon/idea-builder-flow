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

const fakeExec = {
  conn: { getParsedAccountInfo: async () => ({ value: { data: { parsed: { info: { mintAuthority: null, freezeAuthority: null } } } } }) },
  pubkey: undefined,
  solBalance: async () => Infinity,
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

  trader.onSwap(ev("buy"));
  trader.onSwap(ev("buy"));
  await flush();
  assert.ok(Math.abs(state.getPosition(MEME)!.totalCostSol - 0.1) < 1e-6, "solo una compra");

  trader.onSwap(ev("sell", { sellFraction: 0.5 }));
  await flush();
  assert.equal(state.getPosition(MEME)!.tokens, "500000");

  trader.onSwap(ev("sell", { sellFraction: 1 }));
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

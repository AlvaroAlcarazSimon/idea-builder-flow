import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair } from "@solana/web3.js";

Object.assign(process.env, {
  TARGET_WALLETS: Keypair.generate().publicKey.toBase58(),
  DRY_RUN: "true",
  PRIVATE_KEY: "",
  SIM_FEE_LAMPORTS: "2005000",
  SIM_TOKEN_ACCOUNT_LAMPORTS: "2039280",
});

const { Executor } = await import("../src/executor.js");
const { WSOL_MINT } = await import("../src/parser.js");

const MEME = Keypair.generate().publicKey.toBase58();
const quote = (inputMint: string, outputMint: string, inAmount: number, outAmount: number) => ({
  inputMint,
  outputMint,
  inAmount: String(inAmount),
  outAmount: String(outAmount),
  otherAmountThreshold: "0",
  priceImpactPct: "0",
  slippageBps: 0,
  routePlan: [],
});

test("simulación: cada compra y venta paga comisión y la cuenta del token se paga una sola vez", async () => {
  const exec = new Executor({} as never, undefined);

  const buy = await exec.execute(quote(WSOL_MINT, MEME, 100_000_000, 5_000));
  assert.equal(buy.inAmount, 100_000_000n + 2_005_000n + 2_039_280n);
  assert.equal(buy.outAmount, 5_000n);
  assert.ok(Math.abs((buy.feeSol ?? 0) - 0.00404428) < 1e-12);

  const sell = await exec.execute(quote(MEME, WSOL_MINT, 5_000, 150_000_000));
  assert.equal(sell.inAmount, 5_000n);
  assert.equal(sell.outAmount, 150_000_000n - 2_005_000n);
  assert.equal(sell.feeSol, 0.002005);

  const rebuy = await exec.execute(quote(WSOL_MINT, MEME, 100_000_000, 5_000));
  assert.equal(rebuy.inAmount, 100_000_000n + 2_005_000n, "la cuenta ya existe: solo la comisión");
});

test("simulación: lo recibido no baja de 0 y los tokens ya operados no vuelven a pagar la cuenta", async () => {
  const exec = new Executor({} as never, undefined);

  const dust = await exec.execute(quote(MEME, WSOL_MINT, 10, 1_000_000));
  assert.equal(dust.outAmount, 0n);
  assert.equal(dust.feeSol, 0.001);

  exec.knowAccounts([MEME]);
  const buy = await exec.execute(quote(WSOL_MINT, MEME, 100_000_000, 5_000));
  assert.equal(buy.inAmount, 100_000_000n + 2_005_000n);
});

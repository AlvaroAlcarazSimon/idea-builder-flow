import assert from "node:assert/strict";
import { test } from "node:test";
import { Keypair, type ParsedTransactionWithMeta, type TokenBalance } from "@solana/web3.js";
import { parseSwaps, USDC_MINT, WSOL_MINT } from "../src/parser.js";

const trader = Keypair.generate().publicKey;
const other = Keypair.generate().publicKey;
const W = trader.toBase58();
const MEME = "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump";
const SOL = 1_000_000_000;

function bal(accountIndex: number, mint: string, owner: string, amount: bigint, decimals = 6): TokenBalance {
  return { accountIndex, mint, owner, uiTokenAmount: { amount: amount.toString(), decimals, uiAmount: null } };
}

function makeTx(opts: {
  solPre: number;
  solPost: number;
  pre: TokenBalance[];
  post: TokenBalance[];
  fee?: number;
  err?: unknown;
}): ParsedTransactionWithMeta {
  return {
    slot: 1,
    blockTime: Math.floor(Date.now() / 1000),
    transaction: {
      signatures: ["sig"],
      message: {
        accountKeys: [
          { pubkey: trader, signer: true, writable: true },
          { pubkey: other, signer: false, writable: true },
        ],
        instructions: [],
        recentBlockhash: "x",
      },
    },
    meta: {
      err: opts.err ?? null,
      fee: opts.fee ?? 5000,
      preBalances: [opts.solPre, 0],
      postBalances: [opts.solPost, 0],
      preTokenBalances: opts.pre,
      postTokenBalances: opts.post,
      innerInstructions: [],
      logMessages: [],
    },
  } as unknown as ParsedTransactionWithMeta;
}

test("compra con SOL (ATA creada en la misma tx)", () => {
  const tx = makeTx({ solPre: 10 * SOL, solPost: 8.5 * SOL - 5000, pre: [], post: [bal(2, MEME, W, 1_000_000_000n)] });
  const [ev] = parseSwaps(tx, W, "s1");
  assert.equal(ev.side, "buy");
  assert.equal(ev.mint, MEME);
  assert.ok(Math.abs(ev.solDelta + 1.5) < 1e-9, `solDelta=${ev.solDelta}`);
});

test("compra pagando con WSOL", () => {
  const tx = makeTx({
    solPre: 1 * SOL,
    solPost: 1 * SOL - 5000,
    pre: [bal(3, WSOL_MINT, W, 2n * BigInt(SOL), 9)],
    post: [bal(3, WSOL_MINT, W, 1n * BigInt(SOL), 9), bal(2, MEME, W, 500n)],
  });
  const [ev] = parseSwaps(tx, W, "s2");
  assert.equal(ev.side, "buy");
  assert.ok(Math.abs(ev.solDelta + 1) < 1e-9);
});

test("compra pagando con USDC", () => {
  const tx = makeTx({
    solPre: 1 * SOL,
    solPost: 1 * SOL - 5000,
    pre: [bal(3, USDC_MINT, W, 100_000_000n)],
    post: [bal(3, USDC_MINT, W, 0n), bal(2, MEME, W, 500n)],
  });
  const [ev] = parseSwaps(tx, W, "s3");
  assert.equal(ev.side, "buy");
  assert.equal(ev.stableDelta, -100);
});

test("venta parcial calcula la fracción vendida", () => {
  const tx = makeTx({ solPre: 1 * SOL, solPost: 3 * SOL, pre: [bal(2, MEME, W, 1000n)], post: [bal(2, MEME, W, 750n)] });
  const [ev] = parseSwaps(tx, W, "s4");
  assert.equal(ev.side, "sell");
  assert.equal(ev.sellFraction, 0.25);
  assert.equal(ev.isTransfer, false);
});

test("venta total cerrando la cuenta de token (no aparece en postTokenBalances)", () => {
  const tx = makeTx({ solPre: 1 * SOL, solPost: 2 * SOL, pre: [bal(2, MEME, W, 1000n)], post: [] });
  const [ev] = parseSwaps(tx, W, "s5");
  assert.equal(ev.side, "sell");
  assert.equal(ev.sellFraction, 1);
});

test("airdrop / transferencia entrante NO es compra", () => {
  const tx = makeTx({ solPre: 1 * SOL, solPost: 1 * SOL - 5000, pre: [], post: [bal(2, MEME, W, 1000n)] });
  assert.deepEqual(parseSwaps(tx, W, "s6"), []);
});

test("mover tokens a otra wallet se marca como transferencia", () => {
  const tx = makeTx({
    solPre: 1 * SOL,
    solPost: 1 * SOL - 5000,
    pre: [bal(2, MEME, W, 1000n)],
    post: [bal(2, MEME, W, 0n), bal(4, MEME, other.toBase58(), 1000n)],
  });
  const [ev] = parseSwaps(tx, W, "s7");
  assert.equal(ev.side, "sell");
  assert.equal(ev.isTransfer, true);
});

test("ignora balances de otras wallets y txs fallidas", () => {
  const tx = makeTx({ solPre: 10 * SOL, solPost: 9 * SOL, pre: [], post: [bal(2, MEME, other.toBase58(), 1000n)] });
  assert.deepEqual(parseSwaps(tx, W, "s8"), []);
  const failed = makeTx({ solPre: 10 * SOL, solPost: 9 * SOL, pre: [], post: [bal(2, MEME, W, 1000n)], err: { x: 1 } });
  assert.deepEqual(parseSwaps(failed, W, "s9"), []);
});

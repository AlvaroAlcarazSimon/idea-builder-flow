import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { config } from "./config.js";
import { getQuote, getSwapTransaction, type QuoteResponse } from "./jupiter.js";
import { fromParsedTransaction, solChange, tokenBalanceChanges, WSOL_MINT } from "./parser.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

export interface SwapResult {
  signature: string;
  /** Cantidad realmente gastada (raw: lamports o tokens). */
  inAmount: bigint;
  /** Cantidad realmente recibida (raw). */
  outAmount: bigint;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Executor {
  readonly pubkey: string | undefined;

  constructor(
    readonly conn: Connection,
    private keypair: Keypair | undefined,
  ) {
    this.pubkey = keypair?.publicKey.toBase58();
  }

  quoteBuy(mint: string, sol: number, slippageBps = config.slippageBps) {
    return getQuote(WSOL_MINT, mint, BigInt(Math.floor(sol * LAMPORTS_PER_SOL)), slippageBps);
  }

  quoteSell(mint: string, tokens: bigint, slippageBps = config.sellSlippageBps) {
    return getQuote(mint, WSOL_MINT, tokens, slippageBps);
  }

  /** Ejecuta un quote de Jupiter. En DRY_RUN devuelve el resultado simulado del propio quote. */
  async execute(quote: QuoteResponse): Promise<SwapResult> {
    if (config.dryRun) {
      return {
        signature: `SIM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        inAmount: BigInt(quote.inAmount),
        outAmount: BigInt(quote.outAmount),
      };
    }
    if (!this.keypair || !this.pubkey) throw new Error("No hay PRIVATE_KEY");

    const { swapTransaction, lastValidBlockHeight } = await getSwapTransaction(quote, this.pubkey);
    const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
    tx.sign([this.keypair]);
    const raw = tx.serialize();
    const signature = await this.conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 });
    await this.confirm(signature, raw, lastValidBlockHeight);
    return this.actualAmounts(signature, quote);
  }

  /** Espera la confirmación reenviando la tx cada ~2s (mejora mucho la tasa de aterrizaje). */
  private async confirm(signature: string, raw: Uint8Array, lastValidBlockHeight: number) {
    const started = Date.now();
    while (Date.now() - started < 90_000) {
      const { value } = await this.conn.getSignatureStatuses([signature]);
      const st = value[0];
      if (st?.err) throw new Error(`Tx fallida on-chain ${signature}: ${JSON.stringify(st.err)}`);
      if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return;

      const height = await this.conn.getBlockHeight("confirmed");
      if (height > lastValidBlockHeight) throw new Error(`Tx expirada sin confirmar ${signature}`);

      this.conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
      await sleep(2000);
    }
    throw new Error(`Timeout confirmando ${signature}`);
  }

  /** Lee de la tx confirmada lo que realmente entró y salió (el quote es solo una estimación). */
  private async actualAmounts(signature: string, quote: QuoteResponse): Promise<SwapResult> {
    const fallback = { signature, inAmount: BigInt(quote.inAmount), outAmount: BigInt(quote.outAmount) };
    for (let i = 0; i < 5; i++) {
      const parsed = await this.conn
        .getParsedTransaction(signature, { maxSupportedTransactionVersion: 1, commitment: "confirmed" })
        .catch(() => null);
      if (parsed?.meta) {
        const tx = fromParsedTransaction(parsed);
        const changes = tokenBalanceChanges(tx, this.pubkey!);
        const lamports = BigInt(Math.round(solChange(tx, this.pubkey!, changes, false) * LAMPORTS_PER_SOL));
        const tokenMint = quote.inputMint === WSOL_MINT ? quote.outputMint : quote.inputMint;
        const c = changes.get(tokenMint);
        const tokenDelta = c ? c.post - c.pre : 0n;
        if (quote.inputMint === WSOL_MINT) {
          return { signature, inAmount: -lamports, outAmount: tokenDelta > 0n ? tokenDelta : fallback.outAmount };
        }
        return { signature, inAmount: tokenDelta < 0n ? -tokenDelta : fallback.inAmount, outAmount: lamports > 0n ? lamports : 0n };
      }
      await sleep(800);
    }
    return fallback;
  }

  async solBalance(): Promise<number> {
    if (!this.keypair) return Infinity;
    return (await this.conn.getBalance(this.keypair.publicKey, "confirmed")) / LAMPORTS_PER_SOL;
  }

  /** Tokens (raw) de `mint` que tiene `owner`, sumando todas sus cuentas de ese mint. */
  async tokenBalance(owner: string, mint: string): Promise<bigint> {
    const { value } = await this.conn.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) }, "confirmed");
    let total = 0n;
    for (const acc of value) total += BigInt(acc.account.data.parsed?.info?.tokenAmount?.amount ?? 0);
    return total;
  }
}

import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config.js";
import { log } from "./logger.js";
import { short } from "./notify.js";
import type { TxLike } from "./parser.js";

/** Bloque en modo "accounts" tal cual lo devuelve el RPC (sin pasar por web3.js, que tarda ~2 s en procesarlo). */
interface RawBlock {
  blockTime: number | null;
  transactions: { transaction: { accountKeys: { pubkey: string; signer: boolean }[]; signatures: string[] }; meta: TxLike["meta"] }[];
}

type TxHandler = (tx: TxLike, signature: string, wallet: string) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Vigila las wallets objetivo sin depender de cuánta gente las mencione.
 *
 * Suscribirse a "las txs que mencionan la wallet" no sirve con traders conocidos: programas de
 * terceros (bots de arbitraje, spam) los incluyen como cuenta de solo lectura en cientos de txs por
 * segundo. En cambio, el saldo en SOL de una wallet solo cambia cuando ELLA opera (paga la fee) o le
 * envían SOL. Así que:
 *  1. accountSubscribe avisa cuando cambia su saldo, con el slot.
 *  2. Se lee ese bloque en modo "accounts" (~0,4 s) y se quedan solo las txs firmadas por ella.
 *  3. Respaldo: un sondeo de saldo detecta cambios que el websocket se haya perdido y escanea esos slots.
 */
export class Watcher {
  private wallets: Map<string, PublicKey>;
  private subs: number[] = [];
  private lastLamports = new Map<string, number>();
  private lastPolledSlot = new Map<string, number>();
  private scanned = new Map<string, Set<number>>();
  private scanTimes = new Map<string, number[]>();
  private queues = new Map<string, Promise<void>>();
  private blockCache = new Map<number, Promise<RawBlock | null>>();
  private pollTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    private conn: Connection,
    targets: string[],
    private onTx: TxHandler,
  ) {
    this.wallets = new Map(targets.map((t) => [t, new PublicKey(t)]));
  }

  async start() {
    for (const [wallet, pk] of this.wallets) {
      const { value, context } = await this.conn.getBalanceAndContext(pk, config.commitment);
      this.lastLamports.set(wallet, value);
      this.lastPolledSlot.set(wallet, context.slot);
      this.scanned.set(wallet, new Set());

      const id = this.conn.onAccountChange(
        pk,
        (info, ctx) => {
          this.lastLamports.set(wallet, info.lamports);
          this.enqueue(wallet, [ctx.slot]);
        },
        { commitment: config.commitment },
      );
      this.subs.push(id);
      log.info(`👀 Vigilando ${wallet} (${(value / 1e9).toFixed(2)} SOL)`);
    }
    this.schedulePoll();
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.pollTimer);
    await Promise.all(this.subs.map((id) => this.conn.removeAccountChangeListener(id).catch(() => {})));
  }

  /** Cola por wallet: sus txs se procesan en orden (una venta nunca adelanta a su compra). */
  private enqueue(wallet: string, slots: number[]) {
    const next = (this.queues.get(wallet) ?? Promise.resolve())
      .then(() => this.scan(wallet, slots))
      .catch((e) => log.warn(`Error escaneando ${short(wallet)}`, e));
    this.queues.set(wallet, next);
  }

  private async scan(wallet: string, slots: number[]) {
    const seen = this.scanned.get(wallet)!;
    const pending = slots.filter((s) => !seen.has(s));
    for (const [i, slot] of pending.entries()) {
      if (!this.withinRateLimit(wallet)) continue;
      seen.add(slot);
      if (seen.size > 2000) seen.delete(seen.values().next().value!);

      // Se piden los bloques de 4 en 4 en paralelo, pero se procesan en orden
      for (const next of pending.slice(i + 1, i + 4)) void this.getBlock(next);
      const block = await this.getBlock(slot);
      if (!block) continue;
      for (const t of block.transactions) {
        if (!t.meta || t.meta.err) continue;
        if (!t.transaction.accountKeys.some((k) => k.signer && k.pubkey === wallet)) continue;
        this.onTx(
          { slot, blockTime: block.blockTime, meta: t.meta, accountKeys: t.transaction.accountKeys },
          t.transaction.signatures[0],
          wallet,
        );
      }
    }
  }

  /** Si una wallet cambia de saldo en casi todos los slots es un bot de alta frecuencia: no merece leer tantos bloques. */
  private withinRateLimit(wallet: string): boolean {
    const now = Date.now();
    const times = (this.scanTimes.get(wallet) ?? []).filter((t) => now - t < 60_000);
    if (times.length >= config.maxScansPerMin) {
      if (times.length === config.maxScansPerMin) log.warn(`${short(wallet)} opera demasiado (>${config.maxScansPerMin} bloques/min), salto bloques`);
      times.push(now);
      this.scanTimes.set(wallet, times);
      return false;
    }
    times.push(now);
    this.scanTimes.set(wallet, times);
    return true;
  }

  /** Si varias wallets operan en el mismo slot, el bloque se lee una sola vez. */
  private getBlock(slot: number) {
    let p = this.blockCache.get(slot);
    if (!p) {
      p = this.fetchBlock(slot);
      this.blockCache.set(slot, p);
      if (this.blockCache.size > 30) this.blockCache.delete(this.blockCache.keys().next().value!);
    }
    return p;
  }

  private async fetchBlock(slot: number): Promise<RawBlock | null> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: slot,
      method: "getBlock",
      params: [
        slot,
        { encoding: "jsonParsed", transactionDetails: "accounts", rewards: false, maxSupportedTransactionVersion: 1, commitment: config.commitment },
      ],
    });
    let lastError = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await fetch(this.conn.rpcEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(15_000),
        });
        const json = (await res.json()) as { result?: RawBlock | null; error?: { code: number; message: string } };
        if (json.result) return json.result;
        lastError = json.error?.message ?? `HTTP ${res.status}`;
        // -32007: slot saltado por el líder · -32009: fuera del almacenamiento → no hay bloque que leer
        if (json.error && [-32007, -32009].includes(json.error.code)) return null;
      } catch (e) {
        lastError = String(e);
      }
      // Justo tras confirmarse el bloque puede no estar disponible aún, o hay rate limit: reintentar
      await sleep(150 + attempt * 250);
    }
    log.warn(`No se pudo leer el bloque ${slot}: ${lastError}`);
    return null;
  }

  private schedulePoll() {
    if (this.stopped || config.pollIntervalSec <= 0) return;
    this.pollTimer = setTimeout(async () => {
      await Promise.all([...this.wallets.keys()].map((w) => this.poll(w)));
      this.schedulePoll();
    }, config.pollIntervalSec * 1000);
  }

  /** Red de seguridad: si el saldo cambió sin que el websocket avisara, escanea los slots intermedios. */
  private async poll(wallet: string) {
    try {
      const pk = this.wallets.get(wallet)!;
      const { value, context } = await this.conn.getBalanceAndContext(pk, config.commitment);
      const from = this.lastPolledSlot.get(wallet)! + 1;
      this.lastPolledSlot.set(wallet, context.slot);
      if (value === this.lastLamports.get(wallet) || context.slot < from) return;
      this.lastLamports.set(wallet, value);

      let slots = await this.conn.getBlocks(from, context.slot, config.commitment);
      if (slots.length > config.maxBackfillSlots) {
        log.warn(`${short(wallet)}: el websocket se perdió ${slots.length} bloques, reviso solo los ${config.maxBackfillSlots} últimos`);
        slots = slots.slice(-config.maxBackfillSlots);
      }
      this.enqueue(wallet, slots);
    } catch (e) {
      log.warn(`Sondeo de ${short(wallet)} falló`, e);
    }
  }
}

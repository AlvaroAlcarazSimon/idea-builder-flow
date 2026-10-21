import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "./config.js";
import { log } from "./logger.js";
import { short } from "./notify.js";

type Handler = (signature: string, wallet: string) => void;

/**
 * Vigila las wallets objetivo por dos vías a la vez:
 *  - WebSocket (logsSubscribe): la más rápida, ~400ms tras confirmarse el bloque.
 *  - Polling de getSignaturesForAddress: red de seguridad si el websocket se corta.
 * Las firmas duplicadas se filtran aguas abajo.
 */
export class Watcher {
  private subs: number[] = [];
  private lastSeen = new Map<string, string>();
  private pollTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    private conn: Connection,
    private targets: string[],
    private onSignature: Handler,
  ) {}

  async start() {
    for (const wallet of this.targets) {
      const pk = new PublicKey(wallet);
      // Punto de partida: no reprocesar el historial anterior al arranque
      const [latest] = await this.conn.getSignaturesForAddress(pk, { limit: 1 }, "confirmed");
      if (latest) this.lastSeen.set(wallet, latest.signature);

      const id = this.conn.onLogs(
        pk,
        (logs) => {
          if (!logs.err) this.onSignature(logs.signature, wallet);
        },
        config.commitment,
      );
      this.subs.push(id);
      log.info(`👀 Vigilando ${wallet}`);
    }
    this.schedulePoll();
  }

  private schedulePoll() {
    if (this.stopped || config.pollIntervalSec <= 0) return;
    this.pollTimer = setTimeout(async () => {
      await Promise.all(this.targets.map((w) => this.poll(w)));
      this.schedulePoll();
    }, config.pollIntervalSec * 1000);
  }

  private async poll(wallet: string) {
    try {
      const until = this.lastSeen.get(wallet);
      const sigs = await this.conn.getSignaturesForAddress(new PublicKey(wallet), { limit: 25, until }, "confirmed");
      if (sigs.length === 0) return;
      this.lastSeen.set(wallet, sigs[0].signature);
      // De la más antigua a la más nueva, para respetar el orden compra → venta
      for (const s of sigs.reverse()) if (!s.err) this.onSignature(s.signature, wallet);
    } catch (e) {
      log.warn(`Polling de ${short(wallet)} falló`, e);
    }
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.pollTimer);
    await Promise.all(this.subs.map((id) => this.conn.removeOnLogsListener(id).catch(() => {})));
  }
}

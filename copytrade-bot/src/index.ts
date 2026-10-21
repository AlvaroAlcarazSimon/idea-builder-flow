import { Connection } from "@solana/web3.js";
import { config, loadKeypair } from "./config.js";
import { Executor } from "./executor.js";
import { log, setLogFile } from "./logger.js";
import { notify, short } from "./notify.js";
import { parseSwaps } from "./parser.js";
import { State } from "./state.js";
import { Trader } from "./trader.js";
import { Watcher } from "./watcher.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  setLogFile(config.logFile);
  const conn = new Connection(config.rpcUrl, { commitment: config.commitment, wsEndpoint: config.wsUrl });
  const keypair = loadKeypair();
  const exec = new Executor(conn, keypair);
  const state = new State(config.stateFile);
  const trader = new Trader(exec, state);

  log.info("════════════ MEMECOIN COPYTRADE BOT ════════════");
  log.info(`Modo: ${config.dryRun ? "🧪 SIMULACIÓN (DRY_RUN=true, no se gasta nada)" : "🔥 REAL"}`);
  log.info(`Wallet del bot: ${exec.pubkey ?? "(ninguna, solo simulación)"}`);
  if (keypair) log.info(`Saldo: ${(await exec.solBalance()).toFixed(4)} SOL`);
  log.info(
    `Compra: ${config.buyMode === "fixed" ? `${config.buyAmountSol} SOL fijo` : `${config.copyRatio * 100}% del trader`}` +
      ` (min ${config.minBuySol}, max ${config.maxBuySol}) · SL ${config.stopLossPct}% · TP ${config.takeProfitPct}%` +
      ` · trailing ${config.trailingStopPct}% · copiar ventas: ${config.mirrorSells ? "sí" : "no"}`,
  );
  log.info(`Posiciones abiertas recuperadas: ${state.positions.length}`);

  const handleSignature = async (signature: string, wallet: string) => {
    if (!state.markProcessed(signature)) return;
    // La tx puede tardar unos cientos de ms en estar disponible por RPC
    for (let attempt = 0; attempt < 8; attempt++) {
      const tx = await conn
        .getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" })
        .catch(() => null);
      if (tx) {
        for (const ev of parseSwaps(tx, wallet, signature)) trader.onSwap(ev);
        return;
      }
      await sleep(300 + attempt * 200);
    }
    log.warn(`No se pudo leer la tx ${signature} de ${short(wallet)}`);
  };

  // Cola por wallet: las txs de un mismo trader se procesan en orden (una venta nunca adelanta a su compra)
  const queues = new Map<string, Promise<void>>();
  const enqueue = (sig: string, wallet: string) => {
    const next = (queues.get(wallet) ?? Promise.resolve()).then(() => handleSignature(sig, wallet)).catch((e) => log.error("handleSignature", e));
    queues.set(wallet, next);
  };

  const watcher = new Watcher(conn, config.targets, enqueue);
  await watcher.start();
  trader.startMonitor();
  const saver = setInterval(() => state.save(), 30_000);

  await notify(
    `🤖 Bot arrancado. Copiando a ${config.targets.map(short).join(", ")}. Posiciones abiertas: ${state.positions.length}`,
  );

  const shutdown = async (signal: string) => {
    log.info(`${signal} recibido, guardando y saliendo… (las posiciones abiertas se mantienen)`);
    clearInterval(saver);
    trader.stopMonitor();
    await watcher.stop();
    state.save();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (e) => log.error("unhandledRejection", e));
}

main().catch((e) => {
  log.error("Error fatal", e);
  process.exit(1);
});

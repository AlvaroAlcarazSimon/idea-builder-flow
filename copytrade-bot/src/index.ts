import { Connection } from "@solana/web3.js";
import { config, loadKeypair } from "./config.js";
import { Executor } from "./executor.js";
import { log, setLogFile } from "./logger.js";
import { notify, short } from "./notify.js";
import { parseSwaps } from "./parser.js";
import { State } from "./state.js";
import { Trader } from "./trader.js";
import { Watcher } from "./watcher.js";

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

  const watcher = new Watcher(conn, config.targets, (tx, signature, wallet) => {
    if (!state.markProcessed(signature)) return;
    for (const ev of parseSwaps(tx, wallet, signature)) trader.onSwap(ev);
  });
  await watcher.start();
  trader.startMonitor();
  trader.startSourceCheck();
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

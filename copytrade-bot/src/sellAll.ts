/** Botón del pánico: vende todas las posiciones abiertas a SOL.  npm run sell-all */
import { Connection } from "@solana/web3.js";
import { config, loadKeypair } from "./config.js";
import { Executor } from "./executor.js";
import { log } from "./logger.js";
import { State } from "./state.js";
import { Trader } from "./trader.js";

const conn = new Connection(config.rpcUrl, { commitment: config.commitment });
const state = new State(config.stateFile);
const trader = new Trader(new Executor(conn, loadKeypair()), state);

log.info(`Vendiendo ${state.positions.length} posiciones (${config.dryRun ? "simulación" : "REAL"})…`);
await trader.sellAll();
log.info("Hecho.");

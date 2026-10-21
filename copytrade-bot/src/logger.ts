import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let logFile: string | undefined;

export function setLogFile(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  logFile = path;
}

function write(level: string, msg: string, extra?: unknown) {
  const line = `${new Date().toISOString()} ${level.padEnd(5)} ${msg}${
    extra === undefined ? "" : " " + (extra instanceof Error ? extra.message : JSON.stringify(extra))
  }`;
  (level === "ERROR" ? console.error : console.log)(line);
  if (logFile) {
    try {
      appendFileSync(logFile, line + "\n");
    } catch {
      // el log a fichero nunca debe tumbar el bot
    }
  }
}

export const log = {
  info: (msg: string, extra?: unknown) => write("INFO", msg, extra),
  warn: (msg: string, extra?: unknown) => write("WARN", msg, extra),
  error: (msg: string, extra?: unknown) => write("ERROR", msg, extra),
  trade: (msg: string, extra?: unknown) => write("TRADE", msg, extra),
};

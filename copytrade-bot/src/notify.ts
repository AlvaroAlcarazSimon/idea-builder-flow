import { config } from "./config.js";
import { log } from "./logger.js";

/** Envía un mensaje a Telegram si está configurado. Nunca lanza. */
export async function notify(text: string) {
  if (!config.telegramToken || !config.telegramChatId) return;
  try {
    const prefix = config.dryRun ? "🧪 [SIMULACIÓN] " : "";
    await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: prefix + text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    log.warn("No se pudo enviar a Telegram", e);
  }
}

export const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
export const dexLink = (mint: string) => `<a href="https://dexscreener.com/solana/${mint}">${short(mint)}</a>`;
export const txLink = (sig: string) => `<a href="https://solscan.io/tx/${sig}">tx</a>`;

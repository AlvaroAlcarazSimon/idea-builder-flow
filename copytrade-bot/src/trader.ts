import { config } from "./config.js";
import type { Executor } from "./executor.js";
import { checkToken } from "./filters.js";
import { log } from "./logger.js";
import { dexLink, notify, short, txLink } from "./notify.js";
import type { SwapEvent } from "./parser.js";
import type { Position, State } from "./state.js";

const LAMPORTS_PER_SOL = 1_000_000_000;
const sol = (lamports: bigint) => Number(lamports) / LAMPORTS_PER_SOL;
const fmt = (n: number, d = 4) => n.toFixed(d);

export class Trader {
  /** Cola por mint: compra, venta y monitor del mismo token nunca se pisan. */
  private locks = new Map<string, Promise<unknown>>();
  /** Cuántos chequeos de precio seguidos han fallado por token (rug / sin liquidez). */
  private quoteFailures = new Map<string, number>();
  private monitorTimer?: NodeJS.Timeout;

  constructor(
    private exec: Executor,
    private state: State,
  ) {}

  private withLock<T>(mint: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(mint) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    this.locks.set(
      mint,
      next.catch(() => {}),
    );
    return next;
  }

  onSwap(ev: SwapEvent) {
    const job = ev.side === "buy" ? () => this.handleBuy(ev) : () => this.handleSell(ev);
    this.withLock(ev.mint, job).catch((e) => log.error(`Error procesando ${ev.side} de ${short(ev.mint)}`, e));
  }

  // ───────────────────────────── COMPRAS ─────────────────────────────

  private async handleBuy(ev: SwapEvent) {
    const tag = `[${short(ev.wallet)} compra ${short(ev.mint)}]`;
    const targetSol = -ev.solDelta;
    log.info(`${tag} el trader gastó ${fmt(targetSol)} SOL${ev.stableDelta < 0 ? ` / ${fmt(-ev.stableDelta, 2)} USD` : ""}`);

    const skip = (why: string) => log.info(`${tag} ⏭  no copio: ${why}`);

    if (ev.blockTime && Date.now() / 1000 - ev.blockTime > config.maxSignalAgeSec) {
      return skip(`señal demasiado vieja (${Math.round(Date.now() / 1000 - ev.blockTime)}s)`);
    }
    if (config.tokenBlacklist.has(ev.mint)) return skip("token en blacklist");

    const existing = this.state.getPosition(ev.mint);
    if (existing && !config.allowAddOnRebuy) return skip("ya tengo posición (ALLOW_ADD_ON_REBUY=false)");
    if (!existing && this.state.positions.length >= config.maxOpenPositions) {
      return skip(`máximo de posiciones abiertas (${config.maxOpenPositions})`);
    }
    if (this.state.todayPnl() <= -config.maxDailyLossSol) {
      return skip(`límite de pérdida diaria alcanzado (${fmt(this.state.todayPnl())} SOL)`);
    }

    const paidInSol = targetSol > 0.003;
    if (paidInSol && targetSol < config.minTargetBuySol) return skip(`compra del trader muy pequeña (${fmt(targetSol)} SOL)`);

    let size = config.buyAmountSol;
    if (config.buyMode === "proportional" && paidInSol) size = targetSol * config.copyRatio;
    size = Math.min(config.maxBuySol, Math.max(config.minBuySol, size));

    const balance = await this.exec.solBalance();
    if (balance - size < config.minSolReserve) return skip(`saldo insuficiente (${fmt(balance)} SOL)`);

    // Filtros de seguridad y quote de compra en paralelo
    const [reason, quote] = await Promise.all([
      checkToken(this.exec.conn, ev.mint),
      this.exec.quoteBuy(ev.mint, size).catch((e: Error) => e),
    ]);
    if (reason) return skip(reason);
    if (quote instanceof Error) return skip(quote.message);

    const impact = Number(quote.priceImpactPct) * 100;
    if (impact > config.maxPriceImpactPct) return skip(`price impact ${fmt(impact, 1)}% > ${config.maxPriceImpactPct}%`);

    if (config.checkSellRoute) {
      // Simula vender lo que vamos a comprar: detecta honeypots y tokens con impuestos abusivos
      const back = await this.exec.quoteSell(ev.mint, BigInt(quote.outAmount)).catch(() => null);
      if (!back) return skip("no hay ruta de venta (posible honeypot)");
      const loss = (1 - Number(back.outAmount) / Number(quote.inAmount)) * 100;
      if (loss > config.maxRoundTripLossPct) return skip(`ida y vuelta pierde ${fmt(loss, 1)}% (impuestos/liquidez)`);
    }

    const res = await this.exec.execute(quote);
    const spent = sol(res.inAmount);
    log.trade(`${tag} ✅ COMPRADO ${fmt(spent)} SOL → ${res.outAmount} tokens (${res.signature})`);

    if (existing) {
      existing.tokens = (BigInt(existing.tokens) + res.outAmount).toString();
      existing.costSol += spent;
      existing.totalCostSol += spent;
      existing.buySignatures.push(res.signature);
      this.state.upsertPosition(existing);
    } else {
      const pos: Position = {
        mint: ev.mint,
        source: ev.wallet,
        decimals: ev.decimals,
        tokens: res.outAmount.toString(),
        costSol: spent,
        totalCostSol: spent,
        realizedPnlSol: 0,
        openedAt: Date.now(),
        peakMultiple: 1,
        takeProfitDone: false,
        buySignatures: [res.signature],
      };
      this.state.upsertPosition(pos);
    }
    await notify(
      `🟢 <b>COMPRA</b> ${dexLink(ev.mint)}\n` +
        `Copiando a ${short(ev.wallet)} (${fmt(targetSol, 3)} SOL)\n` +
        `Yo: ${fmt(spent, 3)} SOL · impacto ${fmt(impact, 1)}% · ${txLink(res.signature)}`,
    );
  }

  // ───────────────────────────── VENTAS ─────────────────────────────

  private async handleSell(ev: SwapEvent) {
    const pos = this.state.getPosition(ev.mint);
    if (!pos) return;
    const tag = `[${short(ev.wallet)} vende ${short(ev.mint)}]`;
    if (!config.mirrorSells) return log.info(`${tag} MIRROR_SELLS=false, mantengo`);
    if (pos.source !== ev.wallet) return log.info(`${tag} la posición la abrió otra wallet (${short(pos.source)}), ignoro`);
    if (ev.isTransfer && !config.mirrorTransfersAsSell) return log.info(`${tag} es una transferencia, ignoro`);

    // Si vende el 90% o más lo tratamos como salida completa
    const fraction = (ev.sellFraction ?? 1) >= 0.9 ? 1 : (ev.sellFraction ?? 1);
    log.info(`${tag} el trader ${ev.isTransfer ? "ha movido" : "ha vendido"} el ${fmt(fraction * 100, 0)}% → copio`);
    await this.sell(pos, fraction, ev.isTransfer ? "trader movió los tokens" : "copia venta del trader");
  }

  /** Vende `fraction` (0..1) de la posición, con reintentos subiendo el slippage. */
  private async sell(pos: Position, fraction: number, reason: string) {
    const tag = `[venta ${short(pos.mint)}]`;
    let held = BigInt(pos.tokens);
    if (!config.dryRun) {
      held = await this.exec.tokenBalance(pos.mint);
      if (held === 0n) {
        log.warn(`${tag} no hay tokens en la wallet, cierro la posición`);
        this.state.closePosition(pos.mint, "sin tokens en la wallet");
        return;
      }
    }
    const amount = fraction >= 1 ? held : (held * BigInt(Math.round(fraction * 10_000))) / 10_000n;
    if (amount <= 0n) return;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= config.sellRetries; attempt++) {
      const slippage = Math.min(5000, config.sellSlippageBps + attempt * 1000);
      try {
        const quote = await this.exec.quoteSell(pos.mint, amount, slippage);
        const res = await this.exec.execute(quote);
        this.recordSell(pos, held, res.inAmount, sol(res.outAmount), reason, res.signature, fraction >= 1);
        return;
      } catch (e) {
        lastErr = e;
        log.warn(`${tag} intento ${attempt + 1} falló (slippage ${slippage / 100}%)`, e);
      }
    }
    log.error(`${tag} ❌ no se pudo vender`, lastErr);
    await notify(`🔴 <b>NO SE PUDO VENDER</b> ${dexLink(pos.mint)} (${reason}). Revísalo a mano.`);
  }

  private recordSell(pos: Position, held: bigint, sold: bigint, received: number, reason: string, sig: string, full: boolean) {
    const portion = held > 0n ? Number((sold * 1_000_000n) / held) / 1_000_000 : 1;
    const costPart = pos.costSol * Math.min(1, portion);
    const pnl = received - costPart;
    pos.costSol -= costPart;
    pos.realizedPnlSol += pnl;
    pos.tokens = (held - sold > 0n ? held - sold : 0n).toString();
    this.state.addRealized(pnl);

    const emoji = pnl >= 0 ? "💰" : "🔻";
    log.trade(`[venta ${short(pos.mint)}] ${emoji} VENDIDO ${fmt(portion * 100, 0)}% → ${fmt(received)} SOL (PnL ${fmt(pnl)} SOL) · ${reason} (${sig})`);

    if (full || BigInt(pos.tokens) === 0n) {
      const total = pos.realizedPnlSol;
      this.state.closePosition(pos.mint, reason);
      void notify(
        `${emoji} <b>CERRADA</b> ${dexLink(pos.mint)} · ${reason}\n` +
          `PnL: <b>${total >= 0 ? "+" : ""}${fmt(total)} SOL</b> (${fmt((total / pos.totalCostSol) * 100, 1)}%) · ${txLink(sig)}`,
      );
    } else {
      this.state.upsertPosition(pos);
      void notify(`${emoji} <b>VENTA PARCIAL</b> ${fmt(portion * 100, 0)}% ${dexLink(pos.mint)} · ${reason}\nPnL: ${fmt(pnl)} SOL · ${txLink(sig)}`);
    }
  }

  // ───────────────────────────── TP / SL / TRAILING ─────────────────────────────

  startMonitor() {
    const tick = async () => {
      for (const pos of this.state.positions) {
        await this.withLock(pos.mint, () => this.checkPosition(pos.mint)).catch((e) =>
          log.warn(`Monitor ${short(pos.mint)}`, e),
        );
      }
      this.monitorTimer = setTimeout(tick, config.priceCheckIntervalSec * 1000);
    };
    this.monitorTimer = setTimeout(tick, config.priceCheckIntervalSec * 1000);
  }

  stopMonitor() {
    clearTimeout(this.monitorTimer);
  }

  private async checkPosition(mint: string) {
    const pos = this.state.getPosition(mint);
    if (!pos || pos.costSol <= 0) return;
    const tokens = BigInt(pos.tokens);
    if (tokens === 0n) return;

    let value: number;
    try {
      // Valor = lo que realmente recibiríamos vendiendo todo ahora (incluye price impact)
      value = sol(BigInt((await this.exec.quoteSell(mint, tokens)).outAmount));
      this.quoteFailures.delete(mint);
    } catch (e) {
      const n = (this.quoteFailures.get(mint) ?? 0) + 1;
      this.quoteFailures.set(mint, n);
      if (n === 5) {
        log.warn(`[${short(mint)}] 5 quotes seguidos fallando: ¿rug o sin liquidez?`, e);
        void notify(`⚠️ ${dexLink(mint)}: no hay precio de venta desde hace un rato. ¿Rug?`);
      }
      return;
    }

    const multiple = value / pos.costSol;
    const pnlPct = (multiple - 1) * 100;
    pos.lastValueSol = value;
    if (multiple > pos.peakMultiple) pos.peakMultiple = multiple;

    const ageMin = (Date.now() - pos.openedAt) / 60_000;
    const trailingArmed = config.trailingStopPct > 0 && pos.peakMultiple >= 1 + config.trailingActivationPct / 100;

    if (config.stopLossPct > 0 && pnlPct <= -config.stopLossPct) {
      return this.sell(pos, 1, `stop loss (${fmt(pnlPct, 1)}%)`);
    }
    if (trailingArmed && multiple <= pos.peakMultiple * (1 - config.trailingStopPct / 100)) {
      return this.sell(pos, 1, `trailing stop (pico x${fmt(pos.peakMultiple, 2)}, ahora x${fmt(multiple, 2)})`);
    }
    if (config.takeProfitPct > 0 && !pos.takeProfitDone && pnlPct >= config.takeProfitPct) {
      pos.takeProfitDone = true;
      return this.sell(pos, config.takeProfitSellPct / 100, `take profit (+${fmt(pnlPct, 0)}%)`);
    }
    if (config.maxHoldMinutes > 0 && ageMin >= config.maxHoldMinutes) {
      return this.sell(pos, 1, `tiempo máximo (${Math.round(ageMin)} min)`);
    }
    this.state.upsertPosition(pos);
  }

  /** Vende todas las posiciones (usado por `npm run sell-all`). */
  async sellAll() {
    for (const pos of this.state.positions) {
      await this.withLock(pos.mint, () => this.sell(pos, 1, "venta manual (sell-all)"));
    }
  }
}

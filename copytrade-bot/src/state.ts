import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface Position {
  mint: string;
  /** Wallet copiada que originó la posición. */
  source: string;
  decimals: number;
  /** Tokens que tenemos ahora (raw, como string para poder serializar bigint). */
  tokens: string;
  /** SOL invertido que queda "dentro" de la posición (se reduce en ventas parciales). */
  costSol: number;
  /** SOL invertido en total. */
  totalCostSol: number;
  realizedPnlSol: number;
  openedAt: number;
  /** Múltiplo máximo alcanzado (valor / coste) para el trailing stop. */
  peakMultiple: number;
  lastValueSol?: number;
  takeProfitDone: boolean;
  buySignatures: string[];
  /** Tokens que tenía el trader la última vez que lo vimos (raw): sirve para medir sus ventas. */
  sourceTokens?: string;
}

export interface ClosedTrade {
  mint: string;
  source: string;
  totalCostSol: number;
  realizedPnlSol: number;
  openedAt: number;
  closedAt: number;
  reason: string;
}

interface StateData {
  positions: Record<string, Position>;
  closed: ClosedTrade[];
  processed: string[];
  dailyPnl: Record<string, number>;
}

const empty = (): StateData => ({ positions: {}, closed: [], processed: [], dailyPnl: {} });

export class State {
  private data: StateData;
  private processedSet: Set<string>;

  constructor(private file: string) {
    this.data = existsSync(file) ? { ...empty(), ...JSON.parse(readFileSync(file, "utf8")) } : empty();
    this.processedSet = new Set(this.data.processed);
  }

  save() {
    mkdirSync(dirname(this.file), { recursive: true });
    this.data.processed = [...this.processedSet].slice(-5000);
    this.processedSet = new Set(this.data.processed);
    const tmp = this.file + ".tmp";
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.file);
  }

  /** Devuelve true si la firma es nueva (y la marca como vista). */
  markProcessed(sig: string): boolean {
    if (this.processedSet.has(sig)) return false;
    this.processedSet.add(sig);
    return true;
  }

  get positions(): Position[] {
    return Object.values(this.data.positions);
  }
  get closed(): ClosedTrade[] {
    return this.data.closed;
  }
  getPosition(mint: string): Position | undefined {
    return this.data.positions[mint];
  }
  /** Cuándo cerramos por última vez una posición en este token (ms), si alguna vez lo hicimos. */
  lastClosedAt(mint: string): number | undefined {
    for (let i = this.data.closed.length - 1; i >= 0; i--) if (this.data.closed[i].mint === mint) return this.data.closed[i].closedAt;
    return undefined;
  }
  upsertPosition(p: Position) {
    this.data.positions[p.mint] = p;
    this.save();
  }

  closePosition(mint: string, reason: string) {
    const p = this.data.positions[mint];
    if (!p) return;
    this.data.closed.push({
      mint,
      source: p.source,
      totalCostSol: p.totalCostSol,
      realizedPnlSol: p.realizedPnlSol,
      openedAt: p.openedAt,
      closedAt: Date.now(),
      reason,
    });
    delete this.data.positions[mint];
    this.save();
  }

  addRealized(sol: number) {
    const day = new Date().toISOString().slice(0, 10);
    this.data.dailyPnl[day] = (this.data.dailyPnl[day] ?? 0) + sol;
  }

  todayPnl(): number {
    return this.data.dailyPnl[new Date().toISOString().slice(0, 10)] ?? 0;
  }
}

/**
 * Tap tempo for the primary instrument.
 * Timestamps are monotonic milliseconds supplied by the caller (performance.now).
 * Two taps produce a tempo. Further taps refine it. A double tap and a missed
 * beat are rejected. A real tempo change is allowed to move. Old taps expire.
 */
const DEFAULT_MIN = 20;
const DEFAULT_MAX = 400;
const WINDOW = 4;

function clampBpm(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export class TapTempo {
  private taps: number[] = [];
  private intervals: number[] = [];
  private lastBpm: number | null = null;
  private minBpm: number;
  private maxBpm: number;

  constructor(minBpm = DEFAULT_MIN, maxBpm = DEFAULT_MAX) {
    this.minBpm = minBpm;
    this.maxBpm = maxBpm;
  }

  setRange(minBpm: number, maxBpm: number): void {
    this.minBpm = minBpm;
    this.maxBpm = maxBpm;
  }

  reset(): void {
    this.taps = [];
    this.intervals = [];
    this.lastBpm = null;
  }

  tap(now = globalThis.performance?.now?.() ?? Date.now()): number | null {
    const minInterval = 60000 / this.maxBpm;
    const maxInterval = 60000 / this.minBpm;
    const stale = Math.max(2500, maxInterval * 1.35);
    const last = this.taps[this.taps.length - 1];
    if (last != null && now - last > stale) {
      this.reset();
      this.taps.push(now);
      return null;
    }
    if (last != null) {
      const gap = now - last;
      if (gap < minInterval * 0.62) {
        return this.lastBpm;
      }
      let interval = gap;
      const recent = this.intervals.length ? median(this.intervals) : null;
      if (recent != null && gap > recent * 1.65 && gap < recent * 2.45) {
        interval = gap / 2;
      } else if (gap > maxInterval) {
        interval = maxInterval;
      } else if (gap < minInterval) {
        this.taps.push(now);
        this.taps = this.taps.slice(-2);
        return this.lastBpm;
      }
      this.intervals.push(interval);
      if (this.intervals.length > WINDOW) this.intervals = this.intervals.slice(-WINDOW);
    }
    this.taps.push(now);
    if (this.taps.length > WINDOW + 1) this.taps = this.taps.slice(-(WINDOW + 1));
    if (!this.intervals.length) return this.lastBpm;

    const mid = median(this.intervals);
    const kept = this.intervals.filter((value) => Math.abs(value - mid) / mid < 0.34);
    const used = kept.length ? kept : [mid];
    const raw = 60000 / (used.reduce((sum, value) => sum + value, 0) / used.length);
    const next = this.lastBpm == null || Math.abs(raw - this.lastBpm) >= 8
      ? raw
      : this.lastBpm * 0.35 + raw * 0.65;
    this.lastBpm = clampBpm(next, this.minBpm, this.maxBpm);
    return this.lastBpm;
  }
}

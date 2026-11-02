const DIAL_MIN_BPM = 20;
const DIAL_MAX_BPM = 400;

/**
 * Exact 2-BPM tick emphasis.
 * Even BPM lights that tick. Odd BPM splits the two neighbors.
 * Fractional BPM interpolates between those neighbors.
 */
export function dialTickEmphasis(bpm: number, tick: number): number {
  if (!Number.isFinite(bpm) || !Number.isFinite(tick)) return 0;
  const clamped = Math.min(DIAL_MAX_BPM, Math.max(DIAL_MIN_BPM, bpm));
  const lower = Math.floor(clamped / 2) * 2;
  const upper = Math.min(DIAL_MAX_BPM, lower + (clamped >= DIAL_MAX_BPM ? 0 : 2));
  if (upper <= lower) return tick === lower ? 1 : 0;
  const span = upper - lower;
  const t = (clamped - lower) / span;
  if (tick === lower) return 1 - t;
  if (tick === upper) return t;
  return 0;
}

/** Contextual landmark weight. Full at the labeled BPM, gentle at ±5, gone outside. */
export function dialLandmarkEmphasis(bpm: number, mark: number): number {
  if (!Number.isFinite(bpm) || !Number.isFinite(mark)) return 0;
  const distance = Math.abs(bpm - mark);
  if (distance > 5) return 0;
  return Math.max(0.08, 1 - distance / 5);
}

export type BeatControlMetrics = {
  diameter: number;
  gap: number;
  groupGap: number;
};

/**
 * Spread `count` beat controls across the rail. Diameter follows the
 * meter; leftover width becomes the gap so the row is not a center cluster.
 */
export function beatControlMetrics(
  count: number,
  width: number,
  height: number,
  groupCount: number
): BeatControlMetrics {
  const n = Math.max(1, Math.round(count));
  const groups = Math.max(1, Math.min(n, Math.round(groupCount)));
  const margin = 12;
  const inner = Math.max(0, width - margin * 2);
  const gaps = Math.max(0, n - 1);
  const groupGaps = Math.max(0, groups - 1);
  const regularGaps = Math.max(0, gaps - groupGaps);
  const groupWeight = 1.45;
  const weight = regularGaps + groupGaps * groupWeight;
  const heightCap = Math.max(18, height - 16);
  const maxD =
    n <= 4 ? heightCap : n <= 5 ? 46 : n <= 6 ? 40 : n <= 8 ? 32 : n <= 9 ? 26 : 22;
  const floor = n >= 12 ? 14 : 16;
  const minUnit = n >= 12 ? 2 : 3;
  const raw = Math.floor((inner - minUnit * weight) / Math.max(1, n));
  const diameter = Math.max(floor, Math.min(maxD, heightCap, raw));
  const leftover = Math.max(0, inner - diameter * n);
  const unit = weight > 0 ? leftover / weight : 0;
  return {
    diameter,
    gap: unit,
    groupGap: groupGaps > 0 ? unit * groupWeight : 0,
  };
}

/** One row through six beats. Wider meters split into two reachable rows. */
export function proFaderRows(count: number): number[][] {
  const n = Math.max(1, Math.round(count));
  if (n <= 6) return [Array.from({ length: n }, (_, index) => index)];
  const top = Math.ceil(n / 2);
  return [
    Array.from({ length: top }, (_, index) => index),
    Array.from({ length: n - top }, (_, index) => index + top),
  ];
}

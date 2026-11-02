/** Absolute angular tracking for the Pro vault dial. No velocity acceleration. */

export const DEG_PER_BPM = 12;

export function wrapDelta(delta: number): number {
  'worklet';
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

export function pointerAngle(x: number, y: number, cx: number, cy: number): number {
  'worklet';
  return Math.atan2(y - cy, x - cx);
}

export function bpmFromAngleDelta(currentBpm: number, deltaRad: number, min: number, max: number): number {
  const deg = (wrapDelta(deltaRad) * 180) / Math.PI;
  const next = currentBpm + deg / DEG_PER_BPM;
  if (!Number.isFinite(next)) return currentBpm;
  return Math.min(max, Math.max(min, next));
}

export function rotationFromBpm(bpm: number): number {
  return bpm * DEG_PER_BPM;
}

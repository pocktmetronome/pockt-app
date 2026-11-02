/** Pulse circular tempo track. Two full rotations unwrap across 12 o'clock. */

export const PULSE_TRACK_MIN_BPM = 20;
export const PULSE_TRACK_SPLIT_BPM = 200;
export const PULSE_TRACK_MAX_BPM = 400;
export const PULSE_TURNS = 2;

export function wrapDelta(delta: number): number {
  'worklet';
  if (!Number.isFinite(delta)) return 0;
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return Number.isFinite(value) ? value : 0;
}

/** atan2 angle → degrees clockwise from 12 o'clock, 0..360. */
export function degreesFromNorth(angleRad: number): number {
  'worklet';
  let deg = (angleRad * 180) / Math.PI + 90;
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

export function pulseBpmToTurns(bpm: number, min = PULSE_TRACK_MIN_BPM, split = PULSE_TRACK_SPLIT_BPM, max = PULSE_TRACK_MAX_BPM): number {
  'worklet';
  if (!Number.isFinite(bpm)) return 0;
  const lo = Math.min(max, Math.max(min, bpm));
  if (lo <= split) return (lo - min) / Math.max(1, split - min);
  return 1 + (lo - split) / Math.max(1, max - split);
}

export function pulseTurnsToBpm(turns: number, min = PULSE_TRACK_MIN_BPM, split = PULSE_TRACK_SPLIT_BPM, max = PULSE_TRACK_MAX_BPM): number {
  'worklet';
  if (!Number.isFinite(turns)) return min;
  const t = Math.min(PULSE_TURNS, Math.max(0, turns));
  if (t <= 1) return min + t * (split - min);
  return split + (t - 1) * (max - split);
}

/** Absolute atan2 angle for the visual dot. */
export function pulseTurnsToAngle(turns: number): number {
  'worklet';
  return turns * Math.PI * 2 - Math.PI / 2;
}

export function pulseBpmToAngle(bpm: number, min = PULSE_TRACK_MIN_BPM, max = PULSE_TRACK_MAX_BPM): number {
  'worklet';
  return pulseTurnsToAngle(pulseBpmToTurns(bpm, min, PULSE_TRACK_SPLIT_BPM, max));
}

/** Rotation degrees for a view whose 0 is 12 o'clock. */
export function pulseBpmToRotate(bpm: number, min = PULSE_TRACK_MIN_BPM, max = PULSE_TRACK_MAX_BPM): number {
  'worklet';
  return pulseBpmToTurns(bpm, min, PULSE_TRACK_SPLIT_BPM, max) * 360 - 90;
}

/** Legacy single-turn helper kept for tests that still map 0–360. */
export function pulseAngleToBpm(angleRad: number, min = PULSE_TRACK_MIN_BPM, max = PULSE_TRACK_MAX_BPM): number {
  'worklet';
  const t = degreesFromNorth(angleRad) / 360;
  const next = min + t * (max - min);
  if (!Number.isFinite(next)) return min;
  return Math.min(max, Math.max(min, next));
}

export function isPulseTrackHit(
  x: number,
  y: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number
): boolean {
  'worklet';
  const d = Math.hypot(x - cx, y - cy);
  return d >= innerRadius && d <= outerRadius;
}

export function pulseTrackRadii(circleSize: number): { inner: number; outer: number; visual: number } {
  'worklet';
  return {
    inner: circleSize * 0.36,
    outer: circleSize * 0.62,
    visual: circleSize * 0.48,
  };
}

/** True when the pointer is on/near the current tempo dot, not merely elsewhere on the lane. */
export function isPulseDotHit(
  x: number,
  y: number,
  cx: number,
  cy: number,
  bpm: number,
  visualRadius: number,
  hitRadius = 56
): boolean {
  'worklet';
  const tempo = pulseBpmToAngle(bpm);
  const dx = cx + Math.cos(tempo) * visualRadius;
  const dy = cy + Math.sin(tempo) * visualRadius;
  return Math.hypot(x - dx, y - dy) <= hitRadius;
}

/** Drag keeps the two-turn lane. Crossing 12 o'clock adds a small delta, it does not jump a turn. */
export function pulseTurnsAfterDrag(turns: number, deltaRad: number, invert = false): number {
  'worklet';
  const signed = invert ? -deltaRad : deltaRad;
  const next = turns + signed / (Math.PI * 2);
  if (!Number.isFinite(next)) return turns;
  return Math.min(PULSE_TURNS, Math.max(0, next));
}

/** Wave scale relative to the circular instrument. 1 is the visible rim. */
export const PULSE_WAVE_ORIGIN = 0.3;
export const PULSE_WAVE_OUTER = 1.78;

export function pulseWaveReachesBoundary(outer = PULSE_WAVE_OUTER): boolean {
  return outer >= 1;
}

/**
 * Open a wave for every authoritative beat, including the first.
 * Beat index 0 does not change, so the host time is the edge.
 */
export function pulseBeatShouldLaunch(previousHost: number | null, host: number, playing: boolean): boolean {
  'worklet';
  if (!playing || !(host > 0)) return false;
  if (previousHost === null) return true;
  return host !== previousHost;
}

/**
 * Dial interaction model. Video A angle↔BPM map is unchanged.
 * During drag the rendered ring follows the finger. BPM emit is latest-integer
 * only — never a queued step train. Grab deadzone unlocks tracking; it does
 * not snap the ring back to a parked integer.
 */

import {
  DIAL_HOME_ANGLE,
  DIAL_HOME_BPM,
  DIAL_MAX_ANGLE,
  DIAL_MAX_BPM,
  DIAL_MIN_ANGLE,
  DIAL_MIN_BPM,
  angleFromDialBpm,
} from '@/lib/pockt-dial-scale';

export const DIAL_HYSTERESIS_BPM = 0.85;
export const DIAL_ANGLE_DEADZONE_DEG = 0.4;
export const DIAL_HAPTIC_MIN_GAP_S = 0.03;

export function rawBpmFromDialAngle(angle: number): number {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM);
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM);
}

export function clampDialInt(value: number): number {
  if (!Number.isFinite(value)) return DIAL_HOME_BPM;
  return Math.min(DIAL_MAX_BPM, Math.max(DIAL_MIN_BPM, Math.round(value)));
}

export function clampDialAngle(angle: number): number {
  return Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
}

/** Latest integer only. A large jump emits the destination, not every hop. */
export function latestInteger(committed: number, raw: number, flush = false): number | null {
  const start = clampDialInt(committed);
  if (flush) {
    const snapped = clampDialInt(raw);
    return snapped === start ? null : snapped;
  }
  if (raw >= start + DIAL_HYSTERESIS_BPM) {
    const dest = Math.min(DIAL_MAX_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  if (raw <= start - DIAL_HYSTERESIS_BPM) {
    const dest = Math.max(DIAL_MIN_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  return null;
}

export function applyDialSample(
  committed: number,
  sampleAngle: number,
  flush = false
): { next: number; emitted: number[]; renderAngle: number } {
  const live = clampDialAngle(sampleAngle);
  const raw = rawBpmFromDialAngle(live);
  const dest = latestInteger(committed, raw, flush);
  const next = dest ?? clampDialInt(committed);
  return {
    next,
    emitted: dest == null ? [] : [dest],
    renderAngle: flush ? angleFromDialBpm(next) : live,
  };
}

export function grabUnlocks(deltaDeg: number): boolean {
  return Math.abs(deltaDeg) >= DIAL_ANGLE_DEADZONE_DEG;
}

export function sweepDial(from: number, to: number, samples: number): number[] {
  let committed = from;
  const seen: number[] = [];
  const a0 = angleFromDialBpm(from);
  const a1 = angleFromDialBpm(to);
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const result = applyDialSample(committed, a0 + (a1 - a0) * t, i === samples);
    for (const bpm of result.emitted) seen.push(bpm);
    committed = result.next;
  }
  return seen;
}

export function jitterEmits(committed: number, deltaDeg: number, cycles: number): number[] {
  const parked = angleFromDialBpm(committed);
  const d = (deltaDeg * Math.PI) / 180;
  let current = committed;
  const seen: number[] = [];
  for (let i = 0; i < cycles; i += 1) {
    const sign = i % 2 === 0 ? 1 : -1;
    const result = applyDialSample(current, parked + sign * d);
    for (const bpm of result.emitted) seen.push(bpm);
    current = result.next;
  }
  return seen;
}

/** B6: Video A map only — 1 finger-degree = 1 dial-degree. */
export function bpmDeltaForFingerDegrees(fromBpm: number, deltaDeg: number): number {
  const next = rawBpmFromDialAngle(angleFromDialBpm(fromBpm) + (deltaDeg * Math.PI) / 180);
  return next - fromBpm;
}

export function hapticKind(prev: number, next: number): 'hardstop' | 'ten' | 'detent' {
  if ((next === DIAL_MIN_BPM && prev > DIAL_MIN_BPM) || (next === DIAL_MAX_BPM && prev < DIAL_MAX_BPM)) {
    return 'hardstop';
  }
  return next % 10 === 0 ? 'ten' : 'detent';
}

export function hapticAllowed(lastAt: number, now: number): boolean {
  return now - lastAt >= DIAL_HAPTIC_MIN_GAP_S;
}

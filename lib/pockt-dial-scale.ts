/** Piecewise BPM ↔ angle for the POCKT Metal dial face. 120 sits at 12 o'clock. */

export const DIAL_MIN_BPM = 20;
export const DIAL_MAX_BPM = 400;
export const DIAL_HOME_BPM = 120;
export const DIAL_MIN_ANGLE = (-130 * Math.PI) / 180;
export const DIAL_MAX_ANGLE = (140 * Math.PI) / 180;
export const DIAL_HOME_ANGLE = 0;

export const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400] as const;

/** One scale. Majors are the labeled marks. Minors sit on the same angle law, every 10 BPM. */
export function dialScaleTicks(): { bpm: number; major: boolean }[] {
  const majors = new Set<number>(DIAL_MARKS);
  const ticks: { bpm: number; major: boolean }[] = [];
  for (let bpm = DIAL_MIN_BPM; bpm <= DIAL_MAX_BPM; bpm += 10) {
    ticks.push({ bpm, major: majors.has(bpm) });
  }
  return ticks;
}

export function clampDialBpm(value: number): number {
  if (!Number.isFinite(value)) return DIAL_HOME_BPM;
  return Math.min(DIAL_MAX_BPM, Math.max(DIAL_MIN_BPM, Math.round(value)));
}

export function angleFromDialBpm(bpm: number): number {
  const safe = clampDialBpm(bpm);
  if (safe <= DIAL_HOME_BPM) {
    const t = (safe - DIAL_MIN_BPM) / (DIAL_HOME_BPM - DIAL_MIN_BPM);
    return DIAL_MIN_ANGLE + t * (DIAL_HOME_ANGLE - DIAL_MIN_ANGLE);
  }
  const t = (safe - DIAL_HOME_BPM) / (DIAL_MAX_BPM - DIAL_HOME_BPM);
  return DIAL_HOME_ANGLE + t * (DIAL_MAX_ANGLE - DIAL_HOME_ANGLE);
}

/** Console +/− path. Same 20–400 clamp as the native dial. */
export function stepDialBpm(current: number, delta: number): number {
  return clampDialBpm(clampDialBpm(current) + delta);
}

/** The index needle is fixed at 12 o'clock. The scale turns underneath it. */
export const DIAL_POINTER_ANGLE = 0;

/**
 * Clockwise finger travel decreases the native angle and rotates the scale
 * clockwise by the same amount, so the dial stays stuck to the finger.
 */
export function dialScaleRotation(pointerAngle: number): number {
  'worklet';
  return -pointerAngle;
}

export function bpmFromDialAngle(angle: number): number {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return clampDialBpm(DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM));
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return clampDialBpm(DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM));
}

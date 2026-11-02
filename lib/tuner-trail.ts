/** Bounded pitch history for the vinyl stylus. Not a second detector. */

export const TUNER_TRAIL_LIMIT = 18;
export const TUNER_TRAIL_LIFE_MS = 1400;
export const TUNER_CENTS_SPAN = 50;

export type TunerTrailSample = {
  cents: number;
  at: number;
};

export function clampTunerCents(cents: number): number {
  'worklet';
  if (!Number.isFinite(cents)) return 0;
  return Math.max(-TUNER_CENTS_SPAN, Math.min(TUNER_CENTS_SPAN, cents));
}

/** Negative cents (flat) swing one way. Positive cents (sharp) swing the other. Zero is in tune. */
export function stylusDegrees(cents: number): number {
  return clampTunerCents(cents) * 0.36;
}

export function pushTunerTrail(trail: TunerTrailSample[], cents: number, at: number): TunerTrailSample[] {
  const next = trail.filter((sample) => at - sample.at < TUNER_TRAIL_LIFE_MS);
  next.push({ cents: clampTunerCents(cents), at });
  if (next.length > TUNER_TRAIL_LIMIT) next.splice(0, next.length - TUNER_TRAIL_LIMIT);
  return next;
}

/** Negative cents are flat. Positive cents are sharp. In-tune wins over a residual cent. */
export function tunerDirection(cents: number, state: string): 'flat' | 'sharp' | 'in-tune' | 'open' {
  if (state === 'in-tune') return 'in-tune';
  if (!Number.isFinite(cents) || cents === 0) return 'open';
  return cents < 0 ? 'flat' : 'sharp';
}

export function tunerTrailOpacity(ageMs: number): number {
  'worklet';
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= TUNER_TRAIL_LIFE_MS) return 0;
  const u = ageMs / TUNER_TRAIL_LIFE_MS;
  return (1 - u) * (1 - u);
}

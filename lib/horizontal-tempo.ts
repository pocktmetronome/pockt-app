/**
 * Shared roller for Pro and Beatline.
 * The cylinder engraving stays at 28 px per BPM so the visible knurl matches the BPM.
 * Finger transfer is separate: a slow finger uses that same 28 px, and a fast finger
 * covers a real swipe of the 20–400 range without leaving the roller.
 */
export const HORIZONTAL_PX_PER_BPM = 28;
export const WHEEL_FAST_PX_PER_BPM = 2.5;
const WHEEL_FAST_SPEED = 1200;
const WHEEL_MIN_BPM = 20;
const WHEEL_MAX_BPM = 400;

function clampWheelBpm(value: number, fallback: number): number {
  'worklet';
  if (!Number.isFinite(value)) return fallback;
  return Math.min(WHEEL_MAX_BPM, Math.max(WHEEL_MIN_BPM, value));
}

/** Precision map. 28 px of slow travel is one BPM. */
export function horizontalBpmFromDrag(origin: number, translationX: number, invert = false): number {
  'worklet';
  const px = invert ? -translationX : translationX;
  const raw = origin - px / HORIZONTAL_PX_PER_BPM;
  const rounded = Math.round(raw);
  if (!Number.isFinite(rounded)) return origin;
  return clampWheelBpm(rounded, origin);
}

/**
 * One continuous gain curve. Slow fingers stay near 28 px per BPM.
 * Faster fingers travel farther. The ends meet with a flat slope, so there is no gear step.
 */
export function horizontalPxPerBpm(velocityPxPerSec: number): number {
  'worklet';
  const speed = Math.abs(velocityPxPerSec);
  if (!Number.isFinite(speed) || speed <= 0) return HORIZONTAL_PX_PER_BPM;
  const t = Math.min(1, speed / WHEEL_FAST_SPEED);
  const shaped = t * t * (3 - 2 * t);
  return HORIZONTAL_PX_PER_BPM + (WHEEL_FAST_PX_PER_BPM - HORIZONTAL_PX_PER_BPM) * shaped;
}

/**
 * Finger sample. The roller is continuous. Musical BPM changes only when the roller
 * reaches the next integer. Positive px lowers the roller. A bound drops extra travel.
 */
export function horizontalAdvanceBpm(
  roller: number,
  bpm: number,
  deltaPx: number,
  velocityPxPerSec: number,
  invert = false
): { roller: number; bpm: number; crossings: number } {
  'worklet';
  const px = invert ? -deltaPx : deltaPx;
  const gain = horizontalPxPerBpm(velocityPxPerSec);
  let next = (Number.isFinite(roller) ? roller : bpm) - px / gain;
  if (!Number.isFinite(next)) next = roller;
  if (next < WHEEL_MIN_BPM) next = WHEEL_MIN_BPM;
  if (next > WHEEL_MAX_BPM) next = WHEEL_MAX_BPM;
  let detent = Number.isFinite(bpm) ? bpm : Math.round(next);
  if (next >= detent + 1 - 1e-6) detent = Math.min(WHEEL_MAX_BPM, Math.floor(next + 1e-6));
  else if (next <= detent - 1 + 1e-6) detent = Math.max(WHEEL_MIN_BPM, Math.ceil(next - 1e-6));
  return { roller: next, bpm: detent, crossings: Math.abs(detent - bpm) };
}

export function horizontalRollerPose(
  origin: number,
  samples: { x: number; v: number }[],
  invert = false
): { roller: number; bpm: number; crossings: number } {
  let roller = origin;
  let bpm = clampWheelBpm(Math.round(origin), origin);
  let crossings = 0;
  let last = 0;
  for (const sample of samples) {
    const stepped = horizontalAdvanceBpm(roller, bpm, sample.x - last, sample.v, invert);
    roller = stepped.roller;
    crossings += stepped.crossings;
    bpm = stepped.bpm;
    last = sample.x;
  }
  return { roller, bpm, crossings };
}

export function horizontalTrackDrag(
  origin: number,
  samples: { x: number; v: number }[],
  invert = false
): number {
  return horizontalRollerPose(origin, samples, invert).bpm;
}

/** Unwrapped roller position projected onto a cylinder. Null when the tooth is behind the cheek. */
export function cylinderRidge(mark: number, bpm: number, width: number, pxPerBpm = HORIZONTAL_PX_PER_BPM) {
  if (!Number.isFinite(mark) || !Number.isFinite(bpm) || !Number.isFinite(width) || width < 8) return null;
  if (mark < WHEEL_MIN_BPM || mark > WHEEL_MAX_BPM) return null;
  const radius = Math.max(72, width * 0.52);
  const angle = ((mark - bpm) * pxPerBpm) / radius;
  if (Math.abs(angle) > 1.18) return null;
  const cosine = Math.cos(angle);
  return {
    mark,
    x: width / 2 + Math.sin(angle) * (width * 0.46),
    shade: Math.pow(Math.max(0, cosine), 1.35),
    thickness: Math.max(0.8, 3.2 * cosine),
    major: Math.abs(mark % 10) < 0.001,
  };
}

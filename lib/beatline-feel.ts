import { DEG_PER_BPM } from '@/lib/pro-dial';

/** Tiny, overdamped hardware travel. Not a game-spring. */
export const BEATLINE_PRESS_DOWN_MS = 42;
export const BEATLINE_PRESS_UP_MS = 88;
export const BEATLINE_PRESS_SCALE = 1;
export const BEATLINE_PRESS_TRAVEL = 0.65;
export const BEATLINE_NAV_SCALE = 1;
export const BEATLINE_NAV_TRAVEL = 0.42;
export const BEATLINE_TAP_SCALE = 1;
export const BEATLINE_TAP_TRAVEL = 0.85;
export const BEATLINE_DIAL_DEAD_RATIO = 0.7;
export const BEATLINE_DIAL_RESIST = 0.94;
export const BEATLINE_DIAL_MAX_DEG = 22;
export const BEATLINE_DIAL_SEAT = 0.996;
/** Mechanical encoder ceiling. Faster than this becomes a machine-gun click. */
export const BEATLINE_DETENT_MIN_GAP_MS = 48;
/** Overdamped rest after a fractional BPM release. */
export const BEATLINE_DIAL_SETTLE_MS = 96;
/** Native mixer gain coalesce. Visual thumb stays on the UI thread. */
export const BEATLINE_VOLUME_GAIN_MS = 32;
export const BEATLINE_LIGHT_IN_MS = 56;
export const BEATLINE_LIGHT_OUT_MS = 92;
export const BEATLINE_STRENGTH_MS = 78;

export function beatlineDialPointerInRing(x: number, y: number, size: number, deadRatio = BEATLINE_DIAL_DEAD_RATIO): boolean {
  'worklet';
  const dx = x - size / 2;
  const dy = y - size / 2;
  const radius = Math.hypot(dx, dy);
  return radius >= size * deadRatio * 0.5 && radius <= size * 0.5;
}

export function beatlineDialResistDeg(deg: number): number {
  'worklet';
  if (!Number.isFinite(deg) || deg === 0) return 0;
  const mag = Math.min(Math.abs(deg), BEATLINE_DIAL_MAX_DEG);
  const resisted = mag * BEATLINE_DIAL_RESIST / (1 + mag * 0.012);
  return (deg < 0 ? -1 : 1) * resisted;
}

export function beatlineDialApply(live: number, resistedDeg: number, min: number, max: number): { bpm: number; appliedDeg: number } {
  'worklet';
  const raw = live + resistedDeg / DEG_PER_BPM;
  if (!Number.isFinite(raw)) return { bpm: live, appliedDeg: 0 };
  const bpm = Math.min(max, Math.max(min, raw));
  return { bpm, appliedDeg: (bpm - live) * DEG_PER_BPM };
}

/** Shortest visual seat. Tap jumps must not unwind extra revolutions. */
export function beatlineDialSeatDeg(currentDeg: number, bpm: number): number {
  'worklet';
  const wantedMod = ((bpm * DEG_PER_BPM) % 360 + 360) % 360;
  const currentMod = ((currentDeg % 360) + 360) % 360;
  let delta = wantedMod - currentMod;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return currentDeg + delta;
}

export function beatlineVolumeEdge(prev: number, next: number): 0 | 1 | null {
  'worklet';
  if (prev > 0.02 && next <= 0) return 0;
  if (prev < 0.98 && next >= 1) return 1;
  return null;
}

export function beatlineRectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function beatlineExpandSlot(
  slot: { x: number; y: number; w: number; h: number },
  padX: number,
  padY: number
) {
  return { x: slot.x - padX, y: slot.y - padY, w: slot.w + padX * 2, h: slot.h + padY * 2 };
}

export function beatlinePressDepth(kind: 'tap' | 'play' | 'nav' | 'rail'): { scale: number; travel: number } {
  if (kind === 'tap') return { scale: BEATLINE_TAP_SCALE, travel: BEATLINE_TAP_TRAVEL };
  if (kind === 'nav') return { scale: BEATLINE_NAV_SCALE, travel: BEATLINE_NAV_TRAVEL };
  if (kind === 'rail') return { scale: 0.94, travel: 1.05 };
  return { scale: BEATLINE_PRESS_SCALE, travel: BEATLINE_PRESS_TRAVEL };
}

export const PENDULUM_AXIS_THRESHOLD = 10;
export const PENDULUM_RELEASE_START_PX = 18;
export const PENDULUM_MAX_DEG = 26;

export type PendulumAxis = 'none' | 'vertical' | 'horizontal';

export function lockPendulumAxis(dx: number, dy: number, threshold = PENDULUM_AXIS_THRESHOLD): PendulumAxis {
  'worklet';
  if (Math.hypot(dx, dy) < threshold) return 'none';
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
}

export function horizontalAngleFromDrag(
  dx: number,
  width: number,
  maxDeg = PENDULUM_MAX_DEG,
  origin = 0
): number {
  'worklet';
  const span = Math.max(64, width * 0.42);
  // Negative X is left. Positive X is right. Do not invert here or in render.
  const next = origin + (dx / span) * maxDeg;
  return Math.min(maxDeg, Math.max(-maxDeg, next));
}

export function releaseShouldStart(axis: PendulumAxis, dx: number, threshold = PENDULUM_RELEASE_START_PX): boolean {
  'worklet';
  return axis === 'horizontal' && Math.abs(dx) >= threshold;
}

/**
 * Smart Pendulum release. The native clock stays authoritative.
 * A horizontal throw while stopped starts it. A swing while playing rejoins it.
 * Vertical weight drags never take the arm.
 */
export function smartPendulumRelease(playing: boolean, swinging: boolean, dx: number): 'start' | 'rejoin' | 'park' {
  'worklet';
  if (!swinging) return 'park';
  if (playing) return 'rejoin';
  if (Math.abs(dx) >= PENDULUM_RELEASE_START_PX) return 'start';
  return 'park';
}

export function tapShouldStop(playing: boolean, axis: PendulumAxis): boolean {
  'worklet';
  return playing && axis === 'none';
}

export function tapShouldStart(playing: boolean, axis: PendulumAxis): boolean {
  'worklet';
  return !playing && axis === 'none';
}

export function elapsedFromMechanicalAngle(angleDeg: number, amplitudeDeg: number): number {
  const amp = Math.max(1, Math.abs(amplitudeDeg));
  const ratio = Math.min(1, Math.max(-1, angleDeg / amp));
  return Math.acos(ratio) / Math.PI;
}

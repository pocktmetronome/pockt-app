/** Mechanical pendulum modes. Exactly one may drive the arm. */
export const PENDULUM_MODE = {
  stopped: 0,
  manualDragging: 1,
  starting: 2,
  clockDriven: 3,
  settling: 4,
} as const;

export type PendulumModeName = keyof typeof PENDULUM_MODE;

/**
 * Screen/visual convention used everywhere:
 * negative X and negative degrees are LEFT.
 * positive X and positive degrees are RIGHT.
 * Rendered rotation is this signed angle with a bottom pivot.
 */
export function pendulumModeName(mode: number): PendulumModeName {
  if (mode === PENDULUM_MODE.manualDragging) return 'manualDragging';
  if (mode === PENDULUM_MODE.starting) return 'starting';
  if (mode === PENDULUM_MODE.clockDriven) return 'clockDriven';
  if (mode === PENDULUM_MODE.settling) return 'settling';
  return 'stopped';
}

export function isAuthoritativePendulumMode(mode: number): boolean {
  return (
    mode === PENDULUM_MODE.stopped ||
    mode === PENDULUM_MODE.manualDragging ||
    mode === PENDULUM_MODE.starting ||
    mode === PENDULUM_MODE.clockDriven ||
    mode === PENDULUM_MODE.settling
  );
}

export function canDriveClock(mode: number, playing: boolean): boolean {
  return playing && (mode === PENDULUM_MODE.starting || mode === PENDULUM_MODE.clockDriven);
}

export function shouldSettle(mode: number, playing: boolean, held: boolean): boolean {
  if (held || playing) return false;
  return mode === PENDULUM_MODE.settling || mode === PENDULUM_MODE.stopped;
}

/**
 * centerOrigin elapsed:
 * 0.0 center outbound left, 0.5 left extreme, 1.0 center, 1.5 right extreme, 2.0 center.
 */
export function seedElapsedTowardCenter(angleDeg: number, amplitudeDeg: number): number {
  return seedElapsedFromRelease(angleDeg, amplitudeDeg, -Math.sign(angleDeg) || -1);
}

/**
 * Inverse of center-origin `pendulumAngle`:
 * angle = amp * cos((elapsed + 0.5) * π)
 *
 * Two solutions exist. `travelSign` is visual velocity:
 * negative = moving left, positive = moving right.
 */
export function seedElapsedFromRelease(
  angleDeg: number,
  amplitudeDeg: number,
  travelSign: number
): number {
  const amp = Math.max(1, Math.abs(amplitudeDeg));
  const ratio = Math.min(1, Math.max(-1, angleDeg / amp));
  const arc = Math.acos(ratio) / Math.PI;
  const leftward = ((arc - 0.5) % 2 + 2) % 2;
  const rightward = ((2 - arc - 0.5) % 2 + 2) % 2;
  if (Math.abs(ratio) >= 0.995) {
    return ratio > 0 ? 1.5 : 0.5;
  }
  if (travelSign < 0) return leftward;
  if (travelSign > 0) return rightward;
  if (Math.abs(ratio) < 0.02) return 0;
  return ratio >= 0 ? rightward : leftward;
}

export function travelSignFromDelta(dx: number, fallback = -1): number {
  'worklet';
  if (!Number.isFinite(dx) || Math.abs(dx) < 0.5) return fallback;
  return Math.sign(dx);
}

export function handoffAngleError(fromDeg: number, toDeg: number): number {
  return Math.abs(toDeg - fromDeg);
}

export function mechanicalVisualPlaying(playing: boolean, mode: number, held: boolean): boolean {
  if (held) return false;
  return playing && (mode === PENDULUM_MODE.starting || mode === PENDULUM_MODE.clockDriven);
}

export function mechanicalInvariantBroken(playing: boolean, mode: number, held: boolean): boolean {
  if (held) return false;
  if (playing && (mode === PENDULUM_MODE.stopped || mode === PENDULUM_MODE.settling)) return true;
  return false;
}

export function repairMechanicalMode(playing: boolean, mode: number, held: boolean): number {
  if (held) return PENDULUM_MODE.manualDragging;
  if (mechanicalInvariantBroken(playing, mode, held)) return PENDULUM_MODE.clockDriven;
  if (!playing && mode === PENDULUM_MODE.clockDriven) return PENDULUM_MODE.settling;
  return mode;
}

export function nextExtremeElapsed(seedElapsed: number): number {
  const e = ((seedElapsed % 2) + 2) % 2;
  if (Math.abs(e - 0.5) < 0.04) return 0.5;
  if (Math.abs(e - 1.5) < 0.04) return 1.5;
  if (e < 0.5) return 0.5;
  if (e < 1.5) return 1.5;
  return 2.5;
}

export function pickupBeatsToExtreme(seedElapsed: number): number {
  const next = nextExtremeElapsed(seedElapsed);
  const raw = next - seedElapsed;
  const beats = ((raw % 2) + 2) % 2;
  if (beats < 0.04) return 0.04;
  return Math.min(1, Math.max(0.04, beats));
}

export function phaseOffsetForFirstClick(nextExtreme: number): number {
  return nextExtreme - 0.5;
}

export function clockElapsedForBeat(beatIndex: number, phaseOffset = 0): number {
  const beat = Math.max(0, Math.round(beatIndex));
  return phaseOffset + beat + 0.5;
}

export function firstFrameSnapDeg(
  fromDeg: number,
  toDeg: number,
  epsilon = 4
): boolean {
  return Math.abs(toDeg - fromDeg) > epsilon;
}

export function tapShouldStart(playing: boolean): boolean {
  return !playing;
}

export function buttonStartSeed(): { elapsed: number; phaseOffset: number; pickup: number } {
  return { elapsed: 0, phaseOffset: 0, pickup: 0.5 };
}

export function classifyPendulumPointer(dx: number, dy: number, dragPx = 18): 'tap' | 'drag' {
  'worklet';
  return Math.hypot(dx, dy) >= dragPx ? 'drag' : 'tap';
}

export function adoptNativeElapsed(
  current: number,
  nativeElapsed: number,
  firstTick: boolean
): number {
  'worklet';
  const err = nativeElapsed - current;
  if (firstTick) {
    if (Math.abs(err) <= 0.12) return nativeElapsed;
    return current;
  }
  if (err < -0.08) return current;
  if (Math.abs(err) <= 0.18) return current + err * 0.28;
  if (err > 0 && err < 1.02) return current + Math.min(0.06, err);
  return current;
}

export function samplePendulumTrajectory(args: {
  seedElapsed: number;
  frames: number;
  dtMs: number;
  periodMs: number;
  amplitude: number;
  nativeAtFrame?: { frame: number; elapsed: number };
}): { frame: number; elapsed: number; angle: number; velocity: number }[] {
  const out: { frame: number; elapsed: number; angle: number; velocity: number }[] = [];
  let elapsed = args.seedElapsed;
  let prevAngle = pendulumAngleForSeed(elapsed, args.amplitude);
  for (let frame = 0; frame < args.frames; frame += 1) {
    if (args.nativeAtFrame && frame === args.nativeAtFrame.frame) {
      elapsed = adoptNativeElapsed(elapsed, args.nativeAtFrame.elapsed, true);
    } else {
      elapsed += args.dtMs / args.periodMs;
    }
    const angle = pendulumAngleForSeed(elapsed, args.amplitude);
    out.push({
      frame,
      elapsed,
      angle,
      velocity: frame === 0 ? 0 : (angle - prevAngle) / (args.dtMs / 1000),
    });
    prevAngle = angle;
  }
  return out;
}

function pendulumAngleForSeed(elapsed: number, amplitude: number): number {
  return amplitude * Math.cos((elapsed + 0.5) * Math.PI);
}

export function trajectoryMaxJump(
  samples: { angle: number }[],
  epsilon = 4
): number {
  let max = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const jump = Math.abs(samples[i].angle - samples[i - 1].angle);
    if (jump > max) max = jump;
  }
  return max;
}

export function dragBlocksTap(axis: 'none' | 'vertical' | 'horizontal'): boolean {
  return axis !== 'none';
}

export function releaseTriggersSingleStart(
  axis: 'none' | 'vertical' | 'horizontal',
  dx: number,
  alreadyArmed: boolean,
  threshold = 18
): boolean {
  if (alreadyArmed) return false;
  return axis === 'horizontal' && Math.abs(dx) >= threshold;
}

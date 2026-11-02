/**
 * Isolated pendulum reference. Visual only.
 *
 * INPUT: authoritative musical phase (native primary-beat index + phase within that beat).
 * OUTPUT: visual angle in degrees.
 *
 * LOCKED CONTRACT — conventional digital metronome presentation
 * Musical beat / click / beat haptic = CENTER crossing.
 * Visual extremes are turnarounds BETWEEN pulses.
 *
 * beat N phase 0.00 → CENTER, even beats travel RIGHT, odd beats travel LEFT
 * beat N phase 0.50 → EXTREME
 * beat N+1 phase 0.00 → CENTER
 *
 * Native musical clock is authoritative. Display clocks SAMPLE this function.
 * They must not become musical truth, generate audio, or generate beat haptic.
 * Skipped UI frames change smoothness only — never the mapping for a given phase.
 */

export const PENDULUM_REFERENCE_AMPLITUDE = 34;

export function clampPendulumPhase(phase: number): number {
  'worklet';
  if (!Number.isFinite(phase)) return 0;
  if (phase <= 0) return 0;
  if (phase >= 1) return 1;
  return phase;
}

/** Even beats leave CENTER toward RIGHT (+). Odd beats leave CENTER toward LEFT (−). */
export function pendulumTravelSign(beatIndex: number): 1 | -1 {
  'worklet';
  const beat = Number.isFinite(beatIndex) ? Math.max(0, Math.floor(beatIndex)) : 0;
  return beat % 2 === 0 ? 1 : -1;
}

/** @deprecated Use pendulumTravelSign. Even/odd still alternate; origin is now center. */
export function pendulumExtremeSign(beatIndex: number): 1 | -1 {
  'worklet';
  return pendulumTravelSign(beatIndex);
}

/**
 * Pure mapping: musical phase → visual degrees.
 * beatIndex is the native primary-beat index at the last center crossing.
 * phase01 is travel toward the next center in [0, 1].
 */
export function pendulumVisualFromPhase(
  beatIndex: number,
  phase01: number,
  amplitude = PENDULUM_REFERENCE_AMPLITUDE
): number {
  'worklet';
  const amp = Number.isFinite(amplitude) ? amplitude : PENDULUM_REFERENCE_AMPLITUDE;
  const phase = clampPendulumPhase(phase01);
  return pendulumTravelSign(beatIndex) * amp * Math.sin(Math.PI * phase);
}

/**
 * Interpolate phase inside the current native beat.
 * Age past one period is clamped — the next native beat must advance beatIndex.
 * Dropped frames therefore skip samples instead of wrapping into a guessed next beat.
 */
export function pendulumPhaseFromDisplayAge(ageMs: number, periodMs: number): number {
  'worklet';
  if (!(periodMs > 0) || !Number.isFinite(ageMs)) return 0;
  if (ageMs <= 0) return 0;
  return Math.min(1, ageMs / periodMs);
}

export function pendulumVisualFromNative(
  beatIndex: number,
  ageMs: number,
  periodMs: number,
  amplitude = PENDULUM_REFERENCE_AMPLITUDE
): number {
  'worklet';
  return pendulumVisualFromPhase(beatIndex, pendulumPhaseFromDisplayAge(ageMs, periodMs), amplitude);
}

export function pendulumIsExtreme(phase01: number, epsilon = 0.04): boolean {
  'worklet';
  return Math.abs(clampPendulumPhase(phase01) - 0.5) <= epsilon;
}

export function pendulumIsCenter(phase01: number, epsilon = 0.04): boolean {
  'worklet';
  const phase = clampPendulumPhase(phase01);
  return phase <= epsilon || phase >= 1 - epsilon;
}

/**
 * Where the native beat haptic conceptually sits for a sampled visual phase.
 * Animation must never emit this — native audio/haptic remain the only beat event.
 */
export function pendulumBeatHapticAtPhase(phase01: number): 'center' | 'none' {
  return pendulumIsCenter(phase01) ? 'center' : 'none';
}

export function pendulumCenterHapticAllowed(): false {
  return false;
}

/**
 * Live BPM change: keep the current visual phase, retarget remaining travel to the new period.
 * Musical beat index is unchanged until the next native beat.
 */
export function remapPendulumAnchor(
  nowMs: number,
  previousAnchorMs: number,
  oldPeriodMs: number,
  newPeriodMs: number
): number {
  'worklet';
  const phase = pendulumPhaseFromDisplayAge(nowMs - previousAnchorMs, oldPeriodMs);
  if (!(newPeriodMs > 0) || !Number.isFinite(nowMs)) return previousAnchorMs;
  return nowMs - phase * newPeriodMs;
}

/**
 * Advance the visual epoch by native beat identity, not display now.
 * A late JS tick therefore samples a later phase instead of snapping back to center.
 */
export function pendulumAnchorFromNativeBeat(opts: {
  nowMs: number;
  previousAnchorMs: number;
  previousBeat: number;
  nextBeat: number;
  periodMs: number;
}): number {
  'worklet';
  const jumped = opts.nextBeat - opts.previousBeat;
  if (
    opts.previousAnchorMs > 0 &&
    jumped > 0 &&
    Number.isFinite(jumped) &&
    opts.periodMs > 0 &&
    Number.isFinite(opts.previousBeat)
  ) {
    const next = opts.previousAnchorMs + jumped * opts.periodMs;
    return Number.isFinite(next) ? next : opts.nowMs;
  }
  return Number.isFinite(opts.nowMs) ? opts.nowMs : opts.previousAnchorMs;
}

export type PendulumProofSample = {
  beatIndex: number;
  phase: number;
  angle: number;
  at: 'center' | 'toward-extreme' | 'extreme' | 'returning';
  direction: 'right' | 'left';
};

export function pendulumProofCycle(amplitude = PENDULUM_REFERENCE_AMPLITUDE): PendulumProofSample[] {
  return [
    { beatIndex: 0, phase: 0, angle: pendulumVisualFromPhase(0, 0, amplitude), at: 'center', direction: 'right' },
    { beatIndex: 0, phase: 0.25, angle: pendulumVisualFromPhase(0, 0.25, amplitude), at: 'toward-extreme', direction: 'right' },
    { beatIndex: 0, phase: 0.5, angle: pendulumVisualFromPhase(0, 0.5, amplitude), at: 'extreme', direction: 'right' },
    { beatIndex: 0, phase: 0.75, angle: pendulumVisualFromPhase(0, 0.75, amplitude), at: 'returning', direction: 'right' },
    { beatIndex: 1, phase: 0, angle: pendulumVisualFromPhase(1, 0, amplitude), at: 'center', direction: 'left' },
    { beatIndex: 1, phase: 0.25, angle: pendulumVisualFromPhase(1, 0.25, amplitude), at: 'toward-extreme', direction: 'left' },
    { beatIndex: 1, phase: 0.5, angle: pendulumVisualFromPhase(1, 0.5, amplitude), at: 'extreme', direction: 'left' },
    { beatIndex: 1, phase: 0.75, angle: pendulumVisualFromPhase(1, 0.75, amplitude), at: 'returning', direction: 'left' },
    { beatIndex: 2, phase: 0, angle: pendulumVisualFromPhase(2, 0, amplitude), at: 'center', direction: 'right' },
  ];
}

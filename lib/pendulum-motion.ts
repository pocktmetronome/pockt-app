/** Shared pendulum physics. Visual only — audio timestamps remain master. */

export function beatPeriodMs(bpm: number): number {
  'worklet';
  return 60000 / Math.max(1, bpm);
}

/** One full left → right → left oscillation is two beats. */
export function oscillationPeriodMs(bpm: number): number {
  'worklet';
  return 120000 / Math.max(1, bpm);
}

/** Full visual swing in degrees. BPM changes speed only — never amplitude. */
export const PENDULUM_SWING_DEG = 34;

export function swingAmplitude(_bpm?: number): number {
  'worklet';
  return PENDULUM_SWING_DEG;
}

/** Pivot at the rod bottom. Tip is `rodHeight` above the pivot. */
export function tipSwingDegrees(rodHeight: number, viewportWidth: number, tipHalfWidth = 2.5): number {
  const reach = Math.max(1, viewportWidth / 2 - tipHalfWidth);
  const length = Math.max(1, rodHeight);
  const ratio = Math.min(0.999999, reach / length);
  return (Math.asin(ratio) * 180) / Math.PI;
}

/** Derived from viewport + rod length. No guessed overshoot multiplier. */
export function edgeSwingDegrees(rodHeight: number, canvasWidth: number, _margin = 0, _bobRadius = 23, _bobTopRatio = 0.16): number {
  return tipSwingDegrees(rodHeight, canvasWidth);
}

/**
 * Phase in −1…+1 from master-clock elapsed beats.
 * elapsed 0 (start) is CENTER. Integer+0.5 beats are alternating extrema (click).
 * Integer beats are center (max velocity).
 */
export function pendulumPhase(elapsedBeats: number, centerOrigin = true): number {
  'worklet';
  return Math.cos((elapsedBeats + (centerOrigin ? 0.5 : 0)) * Math.PI);
}

export function pendulumAngle(elapsedBeats: number, amplitude: number, centerOrigin = true): number {
  'worklet';
  return amplitude * pendulumPhase(elapsedBeats, centerOrigin);
}

/**
 * Native-phase pendulum. THE BEAT OCCURS AT CENTER.
 * Conventional digital metronome: click/haptic at the center crossing.
 * Extremes are turnarounds between pulses.
 *
 * even beatIndex starts CENTER and travels RIGHT (+).
 * odd beatIndex starts CENTER and travels LEFT (−).
 * theta = travelSign * amplitude * sin(PI * beatPhase)
 *
 * Position is a pure function of native beat epoch + display time.
 * Dropped frames skip samples. They do not integrate, drift, or catch up.
 * Animation does not generate audio or beat haptic.
 */
export function pendulumBeatPhase(ageMs: number, periodMs: number): number {
  'worklet';
  if (!(periodMs > 0) || !Number.isFinite(ageMs) || ageMs < 0) return 0;
  const traveled = ageMs / periodMs;
  return traveled - Math.floor(traveled);
}

export function pendulumBeatTravel(ageMs: number, periodMs: number): { whole: number; phase: number } {
  'worklet';
  if (!(periodMs > 0) || !Number.isFinite(ageMs) || ageMs < 0) return { whole: 0, phase: 0 };
  const traveled = ageMs / periodMs;
  const whole = Math.floor(traveled);
  return { whole, phase: traveled - whole };
}

/** Even beats leave CENTER toward RIGHT (+). Odd beats leave CENTER toward LEFT (−). */
export function pendulumDirection(beatIndex: number): 1 | -1 {
  'worklet';
  const beat = Math.max(0, Math.floor(beatIndex));
  return beat % 2 === 0 ? 1 : -1;
}

export function pendulumTheta(beatIndex: number, beatPhase: number, amplitude: number): number {
  'worklet';
  const phase = Math.min(1, Math.max(0, Number.isFinite(beatPhase) ? beatPhase : 0));
  const amp = Number.isFinite(amplitude) ? amplitude : 0;
  return pendulumDirection(beatIndex) * amp * Math.sin(Math.PI * phase);
}

export function pendulumThetaFromNative(
  beatIndex: number,
  ageMs: number,
  periodMs: number,
  amplitude: number
): number {
  'worklet';
  if (!(periodMs > 0) || !Number.isFinite(ageMs) || ageMs < 0) {
    return pendulumTheta(beatIndex, 0, amplitude);
  }
  return pendulumTheta(beatIndex, Math.min(1, ageMs / periodMs), amplitude);
}

export function pendulumIsBeatExtreme(beatPhase: number, epsilon = 0.04): boolean {
  'worklet';
  const phase = beatPhase - Math.floor(beatPhase);
  return Math.abs(phase - 0.5) <= epsilon;
}

export function pendulumIsVisualCenter(beatPhase: number, epsilon = 0.04): boolean {
  'worklet';
  const phase = beatPhase - Math.floor(beatPhase);
  return phase <= epsilon || phase >= 1 - epsilon;
}

/**
 * Anchor epoch once. A late JS tick must not snap visual phase back to the beat.
 */
export function pendulumEpochFromTick(nowMs: number, existingEpochMs: number, ageAtTickMs = 0): number {
  'worklet';
  if (existingEpochMs > 0) return existingEpochMs;
  return nowMs - Math.max(0, ageAtTickMs);
}

export function delayedTickDoesNotResetEpoch(
  epochMs: number,
  lateArrivalMs: number
): number {
  'worklet';
  return pendulumEpochFromTick(lateArrivalMs, epochMs, 0);
}

/** Remap the beat epoch so a tempo change keeps the current visual phase. */
export function remapEpochForTempo(
  nowMs: number,
  epochMs: number,
  oldPeriodMs: number,
  newPeriodMs: number
): number {
  'worklet';
  if (!(oldPeriodMs > 0) || !(newPeriodMs > 0) || !Number.isFinite(nowMs)) return epochMs;
  const phase = Math.min(1, Math.max(0, (nowMs - epochMs) / oldPeriodMs));
  return nowMs - phase * newPeriodMs;
}

export function seedPhaseFromAngle(angleDeg: number, amplitude: number, travelSign: number): {
  beatIndex: number;
  beatPhase: number;
} {
  const amp = Math.max(1, Math.abs(amplitude));
  const ratio = Math.min(1, Math.max(-1, Number.isFinite(angleDeg) ? angleDeg / amp : 0));
  const fromCenter = Math.asin(Math.min(1, Math.abs(ratio))) / Math.PI;
  const beatIndex = travelSign >= 0 ? 0 : 1;
  const outbound = travelSign >= 0 ? ratio >= 0 : ratio <= 0;
  const beatPhase = outbound ? fromCenter : Math.min(0.999, 1 - fromCenter);
  return { beatIndex, beatPhase: Math.min(0.999, Math.max(0, beatPhase)) };
}

/** Remaining beats until the next visual extreme (halfway between musical beats). */
export function pickupBeatsToNextExtreme(beatPhase: number): number {
  const phase = Math.min(1, Math.max(0, Number.isFinite(beatPhase) ? beatPhase : 0));
  if (phase <= 0.5) return Math.max(0.04, 0.5 - phase);
  return Math.max(0.04, 1.5 - phase);
}

/** Remaining beats until the next musical center (authoritative beat). */
export function pickupBeatsToNextCenter(beatPhase: number): number {
  const phase = Math.min(1, Math.max(0, Number.isFinite(beatPhase) ? beatPhase : 0));
  if (phase < 0.02 || phase > 0.98) return 0;
  return Math.min(1, Math.max(0.04, 1 - phase));
}

/** Advance elapsed beats from a frame delta. BPM changes only affect future rate. */
export function integrateElapsed(elapsedBeats: number, dtMs: number, period: number): number {
  'worklet';
  if (!(period > 0) || !Number.isFinite(dtMs) || dtMs <= 0) return elapsedBeats;
  if (dtMs > 10000) return elapsedBeats + 10000 / period;
  return elapsedBeats + dtMs / period;
}

/** Steady-state helper: integer beat = extreme, half-beat = center. */
export function harmonicAngle(progress: number, side: number, amplitude: number): number {
  'worklet';
  return side * amplitude * Math.cos(progress * Math.PI);
}

export function isEndpointBeat(elapsedBeats: number, epsilon = 0.04, centerOrigin = true): boolean {
  if (!Number.isFinite(elapsedBeats)) return false;
  const shifted = elapsedBeats + (centerOrigin ? 0.5 : 0);
  if (shifted < 1 - epsilon && !centerOrigin) return false;
  if (centerOrigin && elapsedBeats < 0.5 - epsilon) return false;
  const nearest = Math.round(shifted);
  return Math.abs(shifted - nearest) <= epsilon;
}

export function endpointSide(elapsedBeats: number): -1 | 1 {
  const beat = Math.round(Math.max(0.5, elapsedBeats + 0.5));
  return beat % 2 === 1 ? -1 : 1;
}

export function swingDurationMs(bpm: number): number {
  'worklet';
  return Math.min(1200, Math.max(70, beatPeriodMs(bpm)));
}

export const PENDULUM_SETTLE_MS = 520;

/** @deprecated Use pendulumAngle. Kept so older callers compile during the cutover. */
/**
 * Horizontal arm motion swings. A clearly vertical drag that began on the
 * bob is the separate weight/BPM control.
 */
export function pendulumGestureMode(startedOnBob: boolean, dx: number, dy: number): 'swing' | 'weight' {
  'worklet';
  if (startedOnBob && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.8) return 'weight';
  return 'swing';
}

export function pendulumArmChangesBpm(mode: 'swing' | 'weight'): boolean {
  return mode === 'weight';
}

/** Weight travel is the console range. 0 is 20 BPM. 1 is 400 BPM. */
export const PENDULUM_WEIGHT_MIN_BPM = 20;
export const PENDULUM_WEIGHT_MAX_BPM = 400;

export function pendulumWeightT(bpm: number): number {
  'worklet';
  const span = PENDULUM_WEIGHT_MAX_BPM - PENDULUM_WEIGHT_MIN_BPM;
  const clamped = Math.min(PENDULUM_WEIGHT_MAX_BPM, Math.max(PENDULUM_WEIGHT_MIN_BPM, bpm));
  return (clamped - PENDULUM_WEIGHT_MIN_BPM) / span;
}

export function pendulumBpmFromWeight(t: number): number {
  'worklet';
  const u = Math.min(1, Math.max(0, t));
  return Math.round(PENDULUM_WEIGHT_MIN_BPM + u * (PENDULUM_WEIGHT_MAX_BPM - PENDULUM_WEIGHT_MIN_BPM));
}

export function pendulumWeightFromDrag(originT: number, translationY: number, rodH: number, invert = false): number {
  'worklet';
  const dy = invert ? -translationY : translationY;
  return Math.min(1, Math.max(0, originT + dy / Math.max(1, rodH)));
}

/** Bob center in tower coordinates. Pivot is the bottom center of the rod. */
export function pendulumBobCenter(
  weightT: number,
  angleDeg: number,
  rodH: number,
  towerH: number,
  cx: number,
  bobH = 72
): { x: number; y: number } {
  'worklet';
  const slow = rodH * 0.16;
  const fast = Math.max(slow + 8, rodH - 58);
  const top = slow + Math.min(1, Math.max(0, weightT)) * (fast - slow);
  const localY = -(rodH - (top + bobH / 2));
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx - localY * Math.sin(rad),
    y: towerH + localY * Math.cos(rad),
  };
}

export function pendulumBobHit(
  x: number,
  y: number,
  weightT: number,
  angleDeg: number,
  rodH: number,
  towerH: number,
  cx: number,
  radius = 52
): boolean {
  'worklet';
  const bob = pendulumBobCenter(weightT, angleDeg, rodH, towerH, cx);
  return Math.hypot(x - bob.x, y - bob.y) <= radius;
}

export function continuousPendulumAngle(elapsedBeats: number, amplitude: number): number {
  'worklet';
  return pendulumAngle(elapsedBeats, amplitude);
}

/**
 * Absolute pendulum renderer. Visual only.
 *
 * Musical clock: native POCKT engine (beat index + host timestamp + secondsPerBeat).
 * Visual renderer: evaluate this function at the current compatible host time.
 *
 * Clock domain (iOS, proven same mach timebase, seconds):
 *   native eventHostTime     = AVAudioTime.seconds(forHostTime:) + musical offset
 *   visualHostSeconds()      = AVAudioTime.seconds(forHostTime: mach_absolute_time())
 *   Reanimated frame.timestamp = CADisplayLink.timestamp * 1000 (CACurrentMediaTime ms)
 * Conversion: nowHost = frame.timestamp / 1000.
 * Do NOT add Date.now(), performance.now(), or a JS receipt-time epoch.
 *
 * angle = A * sin(π * p)
 * integer p     → center
 * integer p+0.5 → alternating extreme
 * next integer  → center
 *
 * Position is a pure function of (beat epoch, now). Prior frames have
 * zero effect. Dropped frames skip samples; they never integrate or catch up.
 */

export const PENDULUM_ABSOLUTE_AMPLITUDE = 34;

export type PendulumStartEpoch = {
  beatIndex: number;
  beatHostSeconds: number;
  secondsPerBeat: number;
};

/** Native start report → renderer epoch. Null means the arm must not enter moving state. */
export function pendulumEpochFromNativeStart(report: {
  firstBeatHostTime?: unknown;
  firstBeatIndex?: unknown;
  secondsPerBeat?: unknown;
} | null | undefined): PendulumStartEpoch | null {
  if (!report) return null;
  const host = Number(report.firstBeatHostTime);
  const beat = Number(report.firstBeatIndex);
  const spb = Number(report.secondsPerBeat);
  if (!(host > 0) || !Number.isFinite(host)) return null;
  return {
    beatIndex: Number.isFinite(beat) ? beat : 0,
    beatHostSeconds: host,
    secondsPerBeat: spb > 0 && Number.isFinite(spb) ? spb : 0.5,
  };
}

export function pendulumSecondsPerBeat(bpm: number): number {
  'worklet';
  if (!(bpm > 0) || !Number.isFinite(bpm)) return 0.5;
  return 60 / bpm;
}

export function pendulumDisplayToHostSeconds(frameTimestampMs: number, hostFromDisplayOffset = 0): number {
  'worklet';
  if (!Number.isFinite(frameTimestampMs)) return hostFromDisplayOffset;
  return frameTimestampMs / 1000 + hostFromDisplayOffset;
}

/**
 * Continuous beat position on the native timeline.
 * Does not clamp, wrap, or depend on a previous sample.
 */
export function pendulumMusicalPosition(
  beatIndex: number,
  beatHostSeconds: number,
  nowHostSeconds: number,
  secondsPerBeat: number
): number {
  'worklet';
  const beat = Number.isFinite(beatIndex) ? beatIndex : 0;
  if (!(secondsPerBeat > 0) || !Number.isFinite(nowHostSeconds) || !Number.isFinite(beatHostSeconds)) {
    return beat;
  }
  const elapsed = nowHostSeconds - beatHostSeconds;
  if (!Number.isFinite(elapsed)) return beat;
  return beat + elapsed / secondsPerBeat;
}

/** Signed degrees. Center is 0. Even beats leave toward +RIGHT. Odd beats leave toward −LEFT. */
export function pendulumAbsoluteAngle(position: number, amplitude = PENDULUM_ABSOLUTE_AMPLITUDE): number {
  'worklet';
  const p = Number.isFinite(position) ? position : 0;
  const amp = Number.isFinite(amplitude) ? amplitude : 0;
  const angle = amp * Math.sin(Math.PI * p);
  return Number.isFinite(angle) ? angle : 0;
}

export function pendulumAngleAtHost(opts: {
  beatIndex: number;
  beatHostSeconds: number;
  nowHostSeconds: number;
  secondsPerBeat: number;
  amplitude?: number;
}): number {
  'worklet';
  const p = pendulumMusicalPosition(
    opts.beatIndex,
    opts.beatHostSeconds,
    opts.nowHostSeconds,
    opts.secondsPerBeat
  );
  return pendulumAbsoluteAngle(p, opts.amplitude ?? PENDULUM_ABSOLUTE_AMPLITUDE);
}

/**
 * Keep visual position continuous when native seconds-per-beat changes
 * before the next tick overwrites the epoch. Beat index is unchanged.
 *
 * Native applyPhaseContinuousTempo also keeps beat/bar index and only
 * changes spacing after already-committed clicks. This remap does not
 * create a second musical epoch: it solves for a new beatHost such that
 * p(now, newSpb) == p(now, oldSpb). The next native tick remains authority.
 */
export function remapBeatHostForTempo(opts: {
  nowHostSeconds: number;
  beatIndex: number;
  previousHostSeconds: number;
  oldSecondsPerBeat: number;
  newSecondsPerBeat: number;
}): number {
  'worklet';
  if (!(opts.newSecondsPerBeat > 0) || !Number.isFinite(opts.nowHostSeconds)) {
    return opts.previousHostSeconds;
  }
  const p = pendulumMusicalPosition(
    opts.beatIndex,
    opts.previousHostSeconds,
    opts.nowHostSeconds,
    opts.oldSecondsPerBeat
  );
  const host = opts.nowHostSeconds - (p - opts.beatIndex) * opts.newSecondsPerBeat;
  return Number.isFinite(host) ? host : opts.previousHostSeconds;
}

export type PendulumDiagnosticSample = {
  beatIndex: number;
  beatHostSeconds: number;
  nowHostSeconds: number;
  secondsPerBeat: number;
  musicalPosition: number;
  expectedAngle: number;
  renderedAngle: number;
};

export function pendulumDiagnosticSample(opts: {
  beatIndex: number;
  beatHostSeconds: number;
  nowHostSeconds: number;
  secondsPerBeat: number;
  amplitude?: number;
  renderedAngle?: number;
}): PendulumDiagnosticSample {
  'worklet';
  const musicalPosition = pendulumMusicalPosition(
    opts.beatIndex,
    opts.beatHostSeconds,
    opts.nowHostSeconds,
    opts.secondsPerBeat
  );
  const expectedAngle = pendulumAbsoluteAngle(musicalPosition, opts.amplitude);
  return {
    beatIndex: opts.beatIndex,
    beatHostSeconds: opts.beatHostSeconds,
    nowHostSeconds: opts.nowHostSeconds,
    secondsPerBeat: opts.secondsPerBeat,
    musicalPosition,
    expectedAngle,
    renderedAngle: opts.renderedAngle ?? expectedAngle,
  };
}

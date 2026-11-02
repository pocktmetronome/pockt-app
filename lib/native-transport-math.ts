/**
 * JS mirror of modules/pockt-timing/ios/PocktTransport.swift
 * Offline diagnostics only. Never used as a playback clock.
 */

export const TRANSPORT_LOOKAHEAD_SECONDS = 0.22;
export const TRANSPORT_ARCHITECTURE = 'v13-sample-schedule';

export type TempoSegment = {
  startTick: number;
  startSample: number;
  bpm: number;
  ticksPerBeat: number;
};

export function clampBpm(bpm: number): number {
  return Math.min(900, Math.max(1, bpm));
}

export function initialSegment(bpm: number, ticksPerBeat = 1, startSample = 0): TempoSegment {
  return {
    startTick: 0,
    startSample: Math.max(0, startSample),
    bpm: clampBpm(bpm),
    ticksPerBeat: Math.max(1, ticksPerBeat),
  };
}

export function secondsPerTick(segment: TempoSegment): number {
  return 60 / clampBpm(segment.bpm) / Math.max(1, segment.ticksPerBeat);
}

export function segmentForTick(tick: number, segments: TempoSegment[]): TempoSegment {
  let chosen = segments[0] ?? initialSegment(120);
  for (const segment of segments) {
    if (segment.startTick <= tick) chosen = segment;
  }
  return chosen;
}

export function sampleForTick(tick: number, segments: TempoSegment[], sampleRate: number): number {
  const rate = Math.max(1, sampleRate);
  const segment = segmentForTick(tick, segments);
  const delta = (tick - segment.startTick) * secondsPerTick(segment);
  return segment.startSample + Math.round(delta * rate);
}

export function applyTempo(
  segments: TempoSegment[],
  lastScheduledTick: number | null,
  newBpm: number,
  ticksPerBeat: number,
  sampleRate: number
): TempoSegment[] {
  const next = segments.map((item) => ({ ...item }));
  const bpm = clampBpm(newBpm);
  const tpb = Math.max(1, ticksPerBeat);
  if (!next.length) return [initialSegment(bpm, tpb)];
  if (lastScheduledTick == null || lastScheduledTick < 0) {
    next[0] = { ...next[0], bpm, ticksPerBeat: tpb };
    return next;
  }
  const last = next[next.length - 1];
  if (last && last.startTick === lastScheduledTick) {
    next[next.length - 1] = { ...last, bpm, ticksPerBeat: tpb };
    return next;
  }
  const lastSample = sampleForTick(lastScheduledTick, next, sampleRate);
  next.push({ startTick: lastScheduledTick, startSample: lastSample, bpm, ticksPerBeat: tpb });
  return next;
}

export function constantTempoReport(options: {
  bpm: number;
  sampleRate: number;
  beatCount: number;
  ticksPerBeat?: number;
}) {
  const tpb = options.ticksPerBeat ?? 1;
  const segments = [initialSegment(options.bpm, tpb)];
  const interval = secondsPerTick(segments[0]);
  const count = Math.max(2, options.beatCount);
  const samples: number[] = [];
  for (let tick = 0; tick < count; tick += 1) {
    samples.push(sampleForTick(tick, segments, options.sampleRate));
  }
  let maxDev = 0;
  let sumDev = 0;
  let sumSq = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const actual = (samples[index] - samples[index - 1]) / options.sampleRate;
    const dev = actual - interval;
    maxDev = Math.max(maxDev, Math.abs(dev));
    sumDev += dev;
    sumSq += dev * dev;
  }
  const pairs = Math.max(1, samples.length - 1);
  const avg = sumDev / pairs;
  const jitter = Math.sqrt(Math.max(0, sumSq / pairs - avg * avg));
  const expectedElapsed = (count - 1) * interval;
  const scheduledElapsed = (samples[samples.length - 1] - samples[0]) / options.sampleRate;
  const drift = scheduledElapsed - expectedElapsed;
  const samplePeriod = 1 / options.sampleRate;
  return {
    bpm: options.bpm,
    theoreticalIntervalSeconds: interval,
    theoreticalIntervalMs: interval * 1000,
    measuredMeanIntervalSeconds: scheduledElapsed / (count - 1),
    maxErrorSeconds: maxDev,
    averageErrorSeconds: avg,
    stdDeviationSeconds: jitter,
    cumulativeDriftSeconds: drift,
    scheduledEventCount: count,
    sampleRate: options.sampleRate,
    passed: Math.abs(drift) < samplePeriod * 1.1 && maxDev < samplePeriod * 1.1,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

export function phaseChangeReport(options: {
  fromBpm: number;
  toBpm: number;
  changeAfterBeats: number;
  sampleRate: number;
}) {
  let segments = [initialSegment(options.fromBpm)];
  const changeAt = Math.max(1, options.changeAfterBeats) - 1;
  segments = applyTempo(segments, changeAt, options.toBpm, 1, options.sampleRate);
  const before = sampleForTick(changeAt, segments, options.sampleRate);
  const after = sampleForTick(changeAt + 1, segments, options.sampleRate);
  const oldInterval = 60 / clampBpm(options.fromBpm);
  const newInterval = 60 / clampBpm(options.toBpm);
  const observed = (after - before) / options.sampleRate;
  const samplePeriod = 1 / options.sampleRate;
  const committedWasOld =
    Math.abs(before / options.sampleRate - changeAt * oldInterval) < samplePeriod * 1.1;
  return {
    fromBpm: options.fromBpm,
    toBpm: options.toBpm,
    changeAfterBeats: options.changeAfterBeats,
    committedTick: changeAt,
    oldIntervalSeconds: oldInterval,
    newIntervalSeconds: newInterval,
    observedNextIntervalSeconds: observed,
    beatIndexReset: false,
    duplicateBeat: after <= before,
    playerStopUsed: false,
    passed:
      Math.abs(observed - newInterval) < samplePeriod * 1.1 && after > before && committedWasOld,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

export function rapidDragReport(sampleRate: number) {
  const stream = [80, 81, 83, 86, 90, 95, 101, 108, 115, 120];
  let segments = [initialSegment(80)];
  const lastTick = 0;
  for (const bpm of stream.slice(1)) {
    segments = applyTempo(segments, lastTick, bpm, 1, sampleRate);
  }
  const next = sampleForTick(lastTick + 1, segments, sampleRate);
  const expected = sampleForTick(lastTick, segments, sampleRate) + Math.round((60 / 120) * sampleRate);
  return {
    commandCount: stream.length,
    segmentCount: segments.length,
    restartCount: 0,
    finalBpm: segments[segments.length - 1]?.bpm ?? 0,
    coalesced: segments.length <= 2,
    passed: next === expected && segments.length <= 2,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

export function diagnosticSuite(sampleRate = 48000) {
  const bpms = [40, 50, 60, 80, 100, 120, 180, 200, 240, 300, 400];
  const constantTempo = bpms.map((bpm) =>
    constantTempoReport({
      bpm,
      sampleRate,
      beatCount: bpm >= 240 ? 4000 : 2000,
    })
  );
  const pairs: Array<[number, number]> = [
    [50, 70],
    [70, 50],
    [80, 100],
    [100, 80],
    [80, 160],
    [160, 240],
    [240, 400],
    [200, 400],
    [400, 120],
  ];
  const phaseContinuity = pairs.map(([fromBpm, toBpm]) =>
    phaseChangeReport({ fromBpm, toBpm, changeAfterBeats: 8, sampleRate })
  );
  const rapidDrag = rapidDragReport(sampleRate);
  const failures = [
    ...constantTempo.filter((item) => !item.passed).map((item) => `constant ${item.bpm}`),
    ...phaseContinuity.filter((item) => !item.passed).map((item) => `phase ${item.fromBpm}->${item.toBpm}`),
    ...(rapidDrag.passed ? [] : ['rapid-drag']),
  ];
  return {
    passed: failures.length === 0,
    failures,
    constantTempo,
    phaseContinuity,
    rapidDrag,
    sampleRate,
    lookAheadSeconds: TRANSPORT_LOOKAHEAD_SECONDS,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

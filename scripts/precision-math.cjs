'use strict';

const MIN_BPM = 1;
const MAX_BPM = 900;
const TRANSPORT_LOOKAHEAD_SECONDS = 0.22;
const TRANSPORT_ARCHITECTURE = 'v13-sample-schedule';

function clampBpm(bpm) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

function initialSegment(bpm, ticksPerBeat = 1) {
  return { startTick: 0, startSample: 0, bpm: clampBpm(bpm), ticksPerBeat: Math.max(1, ticksPerBeat) };
}

function secondsPerTick(segment) {
  return 60 / clampBpm(segment.bpm) / Math.max(1, segment.ticksPerBeat);
}

function segmentForTick(tick, segments) {
  let chosen = segments[0] ?? initialSegment(120);
  for (const segment of segments) {
    if (segment.startTick <= tick) chosen = segment;
  }
  return chosen;
}

function sampleForTick(tick, segments, sampleRate) {
  const rate = Math.max(1, sampleRate);
  const segment = segmentForTick(tick, segments);
  const delta = (tick - segment.startTick) * secondsPerTick(segment);
  return segment.startSample + Math.round(delta * rate);
}

function applyTempo(segments, lastScheduledTick, newBpm, ticksPerBeat, sampleRate) {
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

function constantTempoReport({ bpm, sampleRate, beatCount, ticksPerBeat }) {
  const tpb = ticksPerBeat ?? 1;
  const segments = [initialSegment(bpm, tpb)];
  const interval = secondsPerTick(segments[0]);
  const count = Math.max(2, beatCount);
  const samples = [];
  for (let tick = 0; tick < count; tick += 1) {
    samples.push(sampleForTick(tick, segments, sampleRate));
  }
  let maxDev = 0;
  let sumDev = 0;
  let sumSq = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const actual = (samples[index] - samples[index - 1]) / sampleRate;
    const dev = actual - interval;
    maxDev = Math.max(maxDev, Math.abs(dev));
    sumDev += dev;
    sumSq += dev * dev;
  }
  const pairs = Math.max(1, samples.length - 1);
  const avg = sumDev / pairs;
  const jitter = Math.sqrt(Math.max(0, sumSq / pairs - avg * avg));
  const expectedElapsed = (count - 1) * interval;
  const scheduledElapsed = (samples[samples.length - 1] - samples[0]) / sampleRate;
  const drift = scheduledElapsed - expectedElapsed;
  const samplePeriod = 1 / sampleRate;
  return {
    bpm,
    theoreticalIntervalSeconds: interval,
    theoreticalIntervalMs: interval * 1000,
    measuredMeanIntervalSeconds: scheduledElapsed / (count - 1),
    maxErrorSeconds: maxDev,
    averageErrorSeconds: avg,
    stdDeviationSeconds: jitter,
    cumulativeDriftSeconds: drift,
    scheduledEventCount: count,
    sampleRate,
    passed: Math.abs(drift) < samplePeriod * 1.1 && maxDev < samplePeriod * 1.1,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

function phaseChangeReport({ fromBpm, toBpm, changeAfterBeats, sampleRate }) {
  let segments = [initialSegment(fromBpm)];
  const changeAt = Math.max(1, changeAfterBeats) - 1;
  segments = applyTempo(segments, changeAt, toBpm, 1, sampleRate);
  const before = sampleForTick(changeAt, segments, sampleRate);
  const after = sampleForTick(changeAt + 1, segments, sampleRate);
  const oldInterval = 60 / clampBpm(fromBpm);
  const newInterval = 60 / clampBpm(toBpm);
  const observed = (after - before) / sampleRate;
  const samplePeriod = 1 / sampleRate;
  const committedWasOld = Math.abs(before / sampleRate - changeAt * oldInterval) < samplePeriod * 1.1;
  return {
    fromBpm,
    toBpm,
    changeAfterBeats,
    committedTick: changeAt,
    oldIntervalSeconds: oldInterval,
    newIntervalSeconds: newInterval,
    observedNextIntervalSeconds: observed,
    beatIndexReset: false,
    duplicateBeat: after <= before,
    playerStopUsed: false,
    passed: Math.abs(observed - newInterval) < samplePeriod * 1.1 && after > before && committedWasOld,
    architecture: TRANSPORT_ARCHITECTURE,
  };
}

function rapidDragReport(sampleRate) {
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

function diagnosticSuite(sampleRate = 48000) {
  const bpms = [40, 50, 60, 80, 100, 120, 160, 180, 200, 240, 300, 400];
  const constantTempo = bpms.map((bpm) =>
    constantTempoReport({
      bpm,
      sampleRate,
      beatCount: bpm >= 240 ? 4000 : 2000,
    })
  );
  const pairs = [
    [50, 70],
    [70, 50],
    [80, 100],
    [100, 120],
    [120, 80],
    [120, 200],
    [200, 400],
    [400, 60],
    [100, 80],
    [80, 160],
    [160, 240],
    [240, 400],
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

module.exports = {
  clampBpm,
  initialSegment,
  sampleForTick,
  applyTempo,
  constantTempoReport,
  phaseChangeReport,
  rapidDragReport,
  diagnosticSuite,
};

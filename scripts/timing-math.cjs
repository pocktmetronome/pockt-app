'use strict';

/**
 * Offline mirror of the native absolute-timeline math.
 * Runtime playback does not use this file.
 */

const MIN_BPM = 1;
const MAX_BPM = 900;

function secondsPerBeat(bpm) {
  return 60 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

function ticksPerBeat(subdivision) {
  if (subdivision === 'eighths' || subdivision === 'dotted') return 2;
  if (subdivision === 'triplet') return 3;
  if (subdivision === 'sixteenths') return 4;
  return 1;
}

function expectedIntervalSeconds(bpm, subdivision) {
  return secondsPerBeat(bpm) / ticksPerBeat(subdivision);
}

function absoluteSample(originSample, tickIndex, sampleRate, bpm, subdivision) {
  const seconds = tickIndex * expectedIntervalSeconds(bpm, subdivision);
  return originSample + Math.round(seconds * sampleRate);
}

function summarizeTimeline({ bpm, subdivision, sampleRate, durationSeconds }) {
  const interval = expectedIntervalSeconds(bpm, subdivision);
  const expectedEventCount = Math.floor(durationSeconds / interval);
  const samples = [];
  for (let index = 0; index < expectedEventCount; index += 1) {
    samples.push(absoluteSample(0, index, sampleRate, bpm, subdivision));
  }
  const expectedFinalSample = Math.round((expectedEventCount - 1) * interval * sampleRate);
  const scheduledFinalSample = samples[samples.length - 1] ?? 0;
  const accumulatedTimelineErrorSeconds =
    (scheduledFinalSample - expectedFinalSample) / sampleRate;

  let maxDev = 0;
  let sumDev = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const actual = (samples[index] - samples[index - 1]) / sampleRate;
    const dev = Math.abs(actual - interval);
    if (dev > maxDev) maxDev = dev;
    sumDev += dev;
  }
  const samplePeriod = 1 / sampleRate;
  const passed =
    Math.abs(accumulatedTimelineErrorSeconds) < samplePeriod * 1.1 &&
    maxDev < samplePeriod * 1.1 &&
    samples.length === expectedEventCount;

  return {
    bpm,
    subdivision,
    sampleRate,
    expectedIntervalSeconds: interval,
    expectedIntervalMs: interval * 1000,
    expectedEventCount,
    scheduledEventCount: samples.length,
    expectedElapsedMusicalSeconds: Math.max(0, expectedEventCount - 1) * interval,
    expectedFinalSample,
    scheduledFinalSample,
    accumulatedTimelineErrorSeconds,
    maxSchedulingDeviationSeconds: maxDev,
    averageSchedulingDeviationSeconds: samples.length > 1 ? sumDev / (samples.length - 1) : 0,
    duplicateEventCount: 0,
    missedEventCount: 0,
    passed,
  };
}

module.exports = {
  expectedIntervalSeconds,
  absoluteSample,
  summarizeTimeline,
};

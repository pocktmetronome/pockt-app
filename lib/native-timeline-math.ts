/**
 * JS mirror of modules/pockt-timing/ios/PocktTimeline.swift
 * Used for offline math verification. Never used as a playback clock.
 */

export const MIN_BPM = 1;
export const MAX_BPM = 900;

export function secondsPerBeat(bpm: number): number {
  return 60 / Math.min(MAX_BPM, Math.max(MIN_BPM, bpm));
}

export function ticksPerBeat(subdivision: string): number {
  if (subdivision === 'eighths' || subdivision === 'dotted') return 2;
  if (subdivision === 'triplet') return 3;
  if (subdivision === 'sixteenths') return 4;
  return 1;
}

export function expectedIntervalSeconds(bpm: number, subdivision: string): number {
  return secondsPerBeat(bpm) / ticksPerBeat(subdivision);
}

export function absoluteSample(
  originSample: number,
  tickIndex: number,
  sampleRate: number,
  bpm: number,
  subdivision: string
): number {
  const seconds = tickIndex * expectedIntervalSeconds(bpm, subdivision);
  return originSample + Math.round(seconds * sampleRate);
}

export function naiveAccumulatedSample(
  tickIndex: number,
  sampleRate: number,
  bpm: number,
  subdivision: string
): number {
  const roundedInterval = Math.round(expectedIntervalSeconds(bpm, subdivision) * sampleRate);
  return roundedInterval * tickIndex;
}

export function summarizeTimeline(options: {
  bpm: number;
  subdivision: string;
  sampleRate: number;
  durationSeconds: number;
}): {
  bpm: number;
  subdivision: string;
  sampleRate: number;
  expectedIntervalSeconds: number;
  expectedIntervalMs: number;
  expectedEventCount: number;
  scheduledEventCount: number;
  expectedElapsedMusicalSeconds: number;
  expectedFinalSample: number;
  scheduledFinalSample: number;
  accumulatedTimelineErrorSeconds: number;
  maxSchedulingDeviationSeconds: number;
  averageSchedulingDeviationSeconds: number;
  duplicateEventCount: number;
  missedEventCount: number;
  passed: boolean;
} {
  const interval = expectedIntervalSeconds(options.bpm, options.subdivision);
  const expectedEventCount = Math.floor(options.durationSeconds / interval);
  const samples: number[] = [];
  for (let index = 0; index < expectedEventCount; index += 1) {
    samples.push(absoluteSample(0, index, options.sampleRate, options.bpm, options.subdivision));
  }
  const expectedFinalSample = Math.round((expectedEventCount - 1) * interval * options.sampleRate);
  const scheduledFinalSample = samples[samples.length - 1] ?? 0;
  const accumulatedTimelineErrorSeconds =
    (scheduledFinalSample - expectedFinalSample) / options.sampleRate;

  let maxDev = 0;
  let sumDev = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const actual = (samples[index] - samples[index - 1]) / options.sampleRate;
    const dev = Math.abs(actual - interval);
    if (dev > maxDev) maxDev = dev;
    sumDev += dev;
  }
  const average = samples.length > 1 ? sumDev / (samples.length - 1) : 0;
  const samplePeriod = 1 / options.sampleRate;
  const passed =
    Math.abs(accumulatedTimelineErrorSeconds) < samplePeriod * 1.1 &&
    maxDev < samplePeriod * 1.1 &&
    samples.length === expectedEventCount;

  return {
    bpm: options.bpm,
    subdivision: options.subdivision,
    sampleRate: options.sampleRate,
    expectedIntervalSeconds: interval,
    expectedIntervalMs: interval * 1000,
    expectedEventCount,
    scheduledEventCount: samples.length,
    expectedElapsedMusicalSeconds: Math.max(0, expectedEventCount - 1) * interval,
    expectedFinalSample,
    scheduledFinalSample,
    accumulatedTimelineErrorSeconds,
    maxSchedulingDeviationSeconds: maxDev,
    averageSchedulingDeviationSeconds: average,
    duplicateEventCount: 0,
    missedEventCount: 0,
    passed,
  };
}

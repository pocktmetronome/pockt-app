'use strict';

const { expectedIntervalSeconds, absoluteSample, summarizeTimeline } = require('./timing-math.cjs');

const SAMPLE_RATE = 48000;
const DURATION = 60;
const BPMS = [1, 10, 20, 40, 60, 80, 88, 120, 180, 240, 300, 400, 600, 800, 900];
const SUBS = ['quarter', 'eighths', 'triplet', 'sixteenths'];

const failures = [];
const reports = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const bpm of BPMS) {
  for (const subdivision of SUBS) {
    const report = summarizeTimeline({
      bpm,
      subdivision,
      sampleRate: SAMPLE_RATE,
      durationSeconds: DURATION,
    });
    reports.push(report);
    if (!report.passed) {
      failures.push(
        `${bpm} ${subdivision}: drift=${report.accumulatedTimelineErrorSeconds} maxDev=${report.maxSchedulingDeviationSeconds}`
      );
    }
  }
}

const explicit = [
  [60, 'quarter', 1.0],
  [80, 'quarter', 0.75],
  [120, 'quarter', 0.5],
  [200, 'quarter', 0.3],
  [300, 'quarter', 0.2],
  [400, 'quarter', 0.15],
  [400, 'eighths', 0.075],
  [400, 'sixteenths', 0.0375],
  [400, 'triplet', 0.05],
  [1, 'quarter', 60],
  [10, 'quarter', 6],
  [900, 'quarter', 60 / 900],
];

for (const [bpm, subdivision, expected] of explicit) {
  const actual = expectedIntervalSeconds(bpm, subdivision);
  assert(
    Math.abs(actual - expected) < 1e-12,
    `explicit ${bpm} ${subdivision}: expected ${expected}s got ${actual}s`
  );
}

const lastIndex = 9999;
const exactLast = absoluteSample(0, lastIndex, SAMPLE_RATE, 133, 'sixteenths');
const interval = expectedIntervalSeconds(133, 'sixteenths');
const naive = Math.round(interval * SAMPLE_RATE) * lastIndex;
assert(exactLast === Math.round(lastIndex * interval * SAMPLE_RATE), 'absolute sample mismatch');
assert(exactLast !== naive, 'naive repeated rounding accidentally matched absolute rounding');

assert(expectedIntervalSeconds(400, 'quarter') * 1000 === 150, '400 BPM quarter is not 150 ms');
assert(expectedIntervalSeconds(400, 'eighths') * 1000 === 75, '400 BPM eighth is not 75 ms');
assert(expectedIntervalSeconds(400, 'sixteenths') * 1000 === 37.5, '400 BPM sixteenth is not 37.5 ms');

const passedCount = reports.filter((item) => item.passed).length;
console.log(`POCKT V8.6 timing math tests: ${passedCount}/${reports.length} sustained cases passed`);
console.log('Explicit intervals:');
for (const [bpm, subdivision, expected] of explicit) {
  console.log(`  ${bpm} ${subdivision} = ${expected * 1000} ms`);
}
console.log(
  `Fractional-sample 133 BPM 16ths x ${lastIndex + 1}: absolute=${exactLast} naive=${naive} delta=${naive - exactLast} samples`
);

if (failures.length) {
  console.error('FAILURES:');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log('All offline timing-math assertions passed.');
console.log('Measurement kind: mathematical-timeline (not acoustic speaker output).');

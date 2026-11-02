'use strict';

const {
  constantTempoReport,
  phaseChangeReport,
  rapidDragReport,
  diagnosticSuite,
  sampleForTick,
  applyTempo,
  initialSegment,
} = require('./precision-math.cjs');

const SAMPLE_RATE = 48000;
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const suite = diagnosticSuite(SAMPLE_RATE);
assert(suite.passed, `diagnostic suite failed: ${suite.failures.join(', ')}`);

for (const report of suite.constantTempo) {
  console.log(
    `  ${report.bpm} BPM  interval=${(report.theoreticalIntervalMs).toFixed(3)}ms  mean=${(report.measuredMeanIntervalSeconds * 1000).toFixed(6)}ms  maxErr=${(report.maxErrorSeconds * 1e6).toFixed(3)}µs  drift=${(report.cumulativeDriftSeconds * 1e9).toFixed(3)}ns  ${report.passed ? 'PASS' : 'FAIL'}`
  );
}

for (const report of suite.phaseContinuity) {
  console.log(
    `  phase ${report.fromBpm}->${report.toBpm}  next=${(report.observedNextIntervalSeconds * 1000).toFixed(3)}ms  expected=${(report.newIntervalSeconds * 1000).toFixed(3)}ms  reset=${report.beatIndexReset}  ${report.passed ? 'PASS' : 'FAIL'}`
  );
}

const drag = rapidDragReport(SAMPLE_RATE);
console.log(
  `  rapid drag commands=${drag.commandCount} segments=${drag.segmentCount} restarts=${drag.restartCount} ${drag.passed ? 'PASS' : 'FAIL'}`
);

let segments = [initialSegment(80)];
segments = applyTempo(segments, 7, 100, 1, SAMPLE_RATE);
assert(sampleForTick(7, segments, SAMPLE_RATE) === Math.round((7 * 60) / 80 * SAMPLE_RATE), 'committed 80 BPM deadline moved');
assert(sampleForTick(8, segments, SAMPLE_RATE) - sampleForTick(7, segments, SAMPLE_RATE) === Math.round((60 / 100) * SAMPLE_RATE), '100 BPM did not start at committed boundary');

const fiftySeventy = phaseChangeReport({ fromBpm: 50, toBpm: 70, changeAfterBeats: 8, sampleRate: SAMPLE_RATE });
assert(fiftySeventy.passed && fiftySeventy.beatIndexReset === false, '50→70 must stay in phase');

if (failures.length) {
  console.error('POCKT precision tests FAILED');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`POCKT precision engine tests: PASS (${suite.constantTempo.length} tempos, ${suite.phaseContinuity.length} phase changes, rapid drag)`);
console.log(`architecture=${suite.architecture} lookahead=${suite.lookAheadSeconds}s`);

'use strict';

const assert = require('assert');
const {
  acceptBeat,
  acceptTempoProposal,
  angleFromNorthStarBpm,
  clampTempo,
  degreesPerBpm,
  stepEncoder,
  stopBeats,
  wrapPi,
  NORTH_STAR_MARKS,
  TEMPO_MIN,
  TEMPO_MAX,
} = require('../lib/native-interaction-math.ts');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log('ok', name);
}

check('wraps across ±pi', () => {
  assert.ok(Math.abs(wrapPi(Math.PI + 0.2) - (-Math.PI + 0.2)) < 1e-9);
  assert.ok(Math.abs(wrapPi(-Math.PI - 0.2) - (Math.PI - 0.2)) < 1e-9);
  assert.ok(Math.abs(wrapPi(0.4) - 0.4) < 1e-9);
});

check('slow gear is 3° per BPM and fast gear is 1.5°', () => {
  assert.strictEqual(degreesPerBpm(10), 3);
  assert.strictEqual(degreesPerBpm(180), 3);
  assert.strictEqual(degreesPerBpm(360), 1.5);
  assert.strictEqual(degreesPerBpm(900), 1.5);
  const mid = degreesPerBpm(270);
  assert.ok(mid < 3 && mid > 1.5);
});

check('tap under 3° does not change tempo', () => {
  const sample = stepEncoder({ bpm: 120, deltaRadians: (2 * Math.PI) / 180, dtSeconds: 1 / 60, engaged: false, pendingDegrees: 0 });
  assert.strictEqual(sample.bpm, 120);
  assert.strictEqual(sample.applied, false);
  assert.strictEqual(sample.engaged, false);
});

check('slow finger samples still land on every integer', () => {
  let bpm = 118;
  let pending = 0;
  let engaged = false;
  const slice = (0.5 * Math.PI) / 180;
  for (let i = 0; i < 48; i += 1) {
    const sample = stepEncoder({ bpm, deltaRadians: slice, dtSeconds: 1 / 60, engaged, pendingDegrees: pending });
    bpm = sample.bpm;
    pending = sample.pendingDegrees;
    engaged = sample.engaged;
  }
  assert.strictEqual(bpm, 126);
});

check('slow 3° step changes exactly 1 BPM', () => {
  const first = stepEncoder({ bpm: 120, deltaRadians: (3 * Math.PI) / 180, dtSeconds: 0.2, engaged: false, pendingDegrees: 0 });
  assert.strictEqual(first.engaged, true);
  assert.strictEqual(first.bpm, 121);
});

check('every integer from 20 to 400 is reachable one BPM at a time', () => {
  let bpm = 20;
  for (let i = 0; i < 380; i += 1) {
    const sample = stepEncoder({
      bpm,
      deltaRadians: (3 * Math.PI) / 180,
      dtSeconds: 0.25,
      engaged: true,
      pendingDegrees: 0,
    });
    assert.strictEqual(sample.bpm, bpm + 1);
    bpm = sample.bpm;
  }
  assert.strictEqual(bpm, 400);
});

check('hard stops clamp at 20 and 400', () => {
  const down = stepEncoder({ bpm: 20, deltaRadians: (-30 * Math.PI) / 180, dtSeconds: 0.05, engaged: true, pendingDegrees: 0 });
  assert.strictEqual(down.bpm, TEMPO_MIN);
  assert.strictEqual(down.hitMin, true);
  const up = stepEncoder({ bpm: 400, deltaRadians: (30 * Math.PI) / 180, dtSeconds: 0.05, engaged: true, pendingDegrees: 0 });
  assert.strictEqual(up.bpm, TEMPO_MAX);
  assert.strictEqual(up.hitMax, true);
  assert.strictEqual(clampTempo(12), 20);
  assert.strictEqual(clampTempo(900), 400);
});

check('no ±pi jump in a full clockwise turn', () => {
  let bpm = 120;
  let engaged = true;
  const step = (20 * Math.PI) / 180;
  for (let i = 0; i < 18; i += 1) {
    const sample = stepEncoder({ bpm, deltaRadians: step, dtSeconds: 0.05, engaged, pendingDegrees: 0 });
    assert.ok(sample.bpm >= bpm);
    assert.ok(sample.bpm - bpm < 30);
    bpm = sample.bpm;
    engaged = sample.engaged;
  }
  assert.ok(bpm > 120);
});

check('north star marks are evenly spaced in angle', () => {
  const angles = NORTH_STAR_MARKS.map((mark) => angleFromNorthStarBpm(mark));
  assert.ok(Math.abs(angles[0] - (-135 * Math.PI) / 180) < 1e-9);
  assert.ok(Math.abs(angles[angles.length - 1] - (135 * Math.PI) / 180) < 1e-9);
  for (let i = 1; i < angles.length; i += 1) {
    const gap = angles[i] - angles[i - 1];
    assert.ok(Math.abs(gap - (27 * Math.PI) / 180) < 1e-9);
  }
  const mid = angleFromNorthStarBpm(70);
  assert.ok(mid > angleFromNorthStarBpm(60) && mid < angleFromNorthStarBpm(80));
});

check('stale tempo proposals are ignored', () => {
  assert.deepStrictEqual(acceptTempoProposal(4, 3, 90), null);
  assert.deepStrictEqual(acceptTempoProposal(4, 5, 91.2), { latest: 5, bpm: 91 });
});

check('beat schedule drops stale generation and clears on stop', () => {
  const armed = { generation: 1, playing: true, pending: [1] };
  const next = acceptBeat(armed, { generation: 2, id: 9 });
  assert.deepStrictEqual(next.pending, [9]);
  assert.strictEqual(next.generation, 2);
  const kept = acceptBeat(next, { generation: 2, id: 10 });
  assert.deepStrictEqual(kept.pending, [9, 10]);
  assert.deepStrictEqual(stopBeats(kept).pending, []);
});

console.log(`native interaction tests passed: ${passed}`);

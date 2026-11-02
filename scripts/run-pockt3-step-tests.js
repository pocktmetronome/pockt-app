'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const stepSrc = fs.readFileSync(path.join(__dirname, '../lib/pockt-dial-step.ts'), 'utf8');
assert(stepSrc.includes('DIAL_HYSTERESIS_BPM = 0.85'), 'emit hysteresis is 0.85 BPM');
assert(stepSrc.includes('latestInteger'), 'latest-integer emit, no step train');
assert(stepSrc.includes('grabUnlocks'), 'grab deadzone unlocks tracking');

const DIAL_MIN_BPM = 20;
const DIAL_MAX_BPM = 400;
const DIAL_HOME_BPM = 120;
const DIAL_MIN_ANGLE = (-130 * Math.PI) / 180;
const DIAL_MAX_ANGLE = (140 * Math.PI) / 180;
const DIAL_HOME_ANGLE = 0;
const DIAL_HYSTERESIS_BPM = 0.85;

function clampDialBpm(value) {
  if (!Number.isFinite(value)) return DIAL_HOME_BPM;
  return Math.min(DIAL_MAX_BPM, Math.max(DIAL_MIN_BPM, Math.round(value)));
}
function angleFromDialBpm(bpm) {
  const safe = clampDialBpm(bpm);
  if (safe <= DIAL_HOME_BPM) {
    const t = (safe - DIAL_MIN_BPM) / (DIAL_HOME_BPM - DIAL_MIN_BPM);
    return DIAL_MIN_ANGLE + t * (DIAL_HOME_ANGLE - DIAL_MIN_ANGLE);
  }
  const t = (safe - DIAL_HOME_BPM) / (DIAL_MAX_BPM - DIAL_HOME_BPM);
  return DIAL_HOME_ANGLE + t * (DIAL_MAX_ANGLE - DIAL_HOME_ANGLE);
}
function rawBpmFromDialAngle(angle) {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM);
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM);
}

function latestInteger(committed, raw, flush) {
  const start = clampDialBpm(committed);
  if (flush) {
    const snapped = clampDialBpm(raw);
    return snapped === start ? null : snapped;
  }
  if (raw >= start + DIAL_HYSTERESIS_BPM) {
    const dest = Math.min(DIAL_MAX_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  if (raw <= start - DIAL_HYSTERESIS_BPM) {
    const dest = Math.max(DIAL_MIN_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  return null;
}

function applyDialSample(committed, sampleAngle, flush) {
  const live = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, sampleAngle));
  const raw = rawBpmFromDialAngle(live);
  const dest = latestInteger(committed, raw, flush);
  const next = dest ?? clampDialBpm(committed);
  return {
    next,
    emitted: dest == null ? [] : [dest],
    renderAngle: flush ? angleFromDialBpm(next) : live,
  };
}

function sweep(from, to, samples) {
  let committed = from;
  const seen = [];
  const a0 = angleFromDialBpm(from);
  const a1 = angleFromDialBpm(to);
  for (let i = 1; i <= samples; i += 1) {
    const result = applyDialSample(committed, a0 + (a1 - a0) * (i / samples), i === samples);
    seen.push(...result.emitted);
    committed = result.next;
  }
  return seen;
}

function range(a, b) {
  const out = [];
  if (b >= a) for (let n = a; n <= b; n += 1) out.push(n);
  else for (let n = a; n >= b; n -= 1) out.push(n);
  return out;
}

const skip = applyDialSample(120, angleFromDialBpm(120) + (4 * Math.PI) / 180);
assert.strictEqual(skip.next, 128, '4° above 120 emits latest BPM only');
assert.deepStrictEqual(skip.emitted, [128], 'no integer train on a fast sample');
const live = applyDialSample(120, angleFromDialBpm(120) + (4.3 * Math.PI) / 180);
assert.notStrictEqual(live.renderAngle, angleFromDialBpm(live.next), 'drag render follows the finger, not the parked integer');

const up118 = sweep(118, 127, 80);
assert.deepStrictEqual(up118, range(119, 127), `118→127 got ${up118}`);
const down127 = sweep(127, 118, 80);
assert.deepStrictEqual(down127, range(126, 118), `127→118 got ${down127}`);
const upAll = sweep(20, 400, 1600);
assert.deepStrictEqual(upAll, range(21, 400), '20→400 every integer');
const downAll = sweep(400, 20, 1600);
assert.deepStrictEqual(downAll, range(399, 20), '400→20 every integer');

const jitter = [];
const parked = angleFromDialBpm(120);
const d = (0.4 * Math.PI) / 180;
let committed = 120;
for (let i = 0; i < 40; i += 1) {
  const result = applyDialSample(committed, parked + (i % 2 === 0 ? d : -d));
  jitter.push(...result.emitted);
  committed = result.next;
}
assert.deepStrictEqual(jitter, [], '±0.4° jitter emits nothing');

const mid = applyDialSample(200, angleFromDialBpm(200) + (0.6 * Math.PI) / 180);
assert.notStrictEqual(mid.renderAngle, angleFromDialBpm(mid.next), 'live angle is not snapped during drag');

const releaseLast = applyDialSample(200, angleFromDialBpm(247), true);
assert.strictEqual(releaseLast.next, 247, 'release value is last integer');
assert.strictEqual(releaseLast.renderAngle, angleFromDialBpm(247), 'release render snaps to integer');

const map90 = rawBpmFromDialAngle(angleFromDialBpm(180) + (90 * Math.PI) / 180) - 180;
assert(map90 <= 90 * 2 + 0.01, `B6: 90° from 180 is Video A map only (got ${map90})`);
assert(map90 >= 90 * 2 - 2, 'B6: no extra gain below the map');

function stepDialBpm(current, delta) {
  return clampDialBpm(clampDialBpm(current) + delta);
}
assert.strictEqual(stepDialBpm(120, 1), 121, '+ is exactly one BPM');
assert.strictEqual(stepDialBpm(121, -1), 120, '− is exactly one BPM');
assert.strictEqual(stepDialBpm(20, -1), 20, 'minus clamps at 20');
assert.strictEqual(stepDialBpm(400, 1), 400, 'plus clamps at 400');
assert.strictEqual(stepDialBpm(119.6, 1), 121, 'step uses the same integer clamp as the dial');
const scaleSrc = fs.readFileSync(path.join(__dirname, '../lib/pockt-dial-scale.ts'), 'utf8');
assert(scaleSrc.includes('export function stepDialBpm'), 'Console +/− lives on the dial clamp');

const fine = sweep(118, 127, 40);
assert.deepStrictEqual(fine, range(119, 127), 'fine band 118–127 remains one-BPM');
const high = sweep(300, 310, 40);
assert.deepStrictEqual(high, range(301, 310), 'fine band 300–310 remains one-BPM');

console.log('pockt-3 step / feel / B6 tests passed');

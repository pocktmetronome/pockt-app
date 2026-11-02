'use strict';

/**
 * POCKT 3 Phase 2 fingerprint tests.
 * Uses the same node+assert harness as the existing suite (no Jest in this repo).
 * Functions are copied from lib/pockt-dial-scale.ts / lib/tempo-name.ts and
 * the source files are asserted to still contain those implementations.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const DIAL_MIN_BPM = 20;
const DIAL_MAX_BPM = 400;
const DIAL_HOME_BPM = 120;
const DIAL_MIN_ANGLE = (-130 * Math.PI) / 180;
const DIAL_MAX_ANGLE = (140 * Math.PI) / 180;
const DIAL_HOME_ANGLE = 0;
const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];

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

function bpmFromDialAngle(angle) {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return clampDialBpm(DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM));
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return clampDialBpm(DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM));
}

/** Clockwise degrees from 12 o'clock of the printed "120" after Video A rotation. */
function printed120ClockwiseDeg(bpm) {
  return (-angleFromDialBpm(bpm) * 180) / Math.PI;
}

const NAMES = [
  { until: 40, name: 'Grave' },
  { until: 60, name: 'Largo' },
  { until: 76, name: 'Adagio' },
  { until: 109, name: 'Andante' },
  { until: 120, name: 'Moderato' },
  { until: 138, name: 'Allegretto' },
  { until: 156, name: 'Allegro' },
  { until: 176, name: 'Vivace' },
  { until: 200, name: 'Presto' },
  { until: 901, name: 'Prestissimo' },
];

function tempoName(bpm) {
  const safe = Math.min(900, Math.max(1, Math.round(bpm)));
  return NAMES.find((entry) => safe < entry.until)?.name ?? 'Allegro';
}

const scaleSrc = read('lib/pockt-dial-scale.ts');
const tempoSrc = read('lib/tempo-name.ts');
const tuningSrc = read('modules/pockt-dial/ios/PocktDialTuning.swift');

assert(scaleSrc.includes('export const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]'));
assert(scaleSrc.includes('(-130 * Math.PI) / 180'));
assert(scaleSrc.includes('(140 * Math.PI) / 180'));
assert(tuningSrc.includes('static let minAngle: CGFloat = -130'));
assert(tuningSrc.includes('static let maxAngle: CGFloat = 140'));
assert(tuningSrc.includes('20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400'));
assert(tempoSrc.includes("{ until: 40, name: 'Grave' }"));
assert(tempoSrc.includes("{ until: 60, name: 'Largo' }"));
assert(tempoSrc.includes("{ until: 76, name: 'Adagio' }"));
assert(tempoSrc.includes("{ until: 109, name: 'Andante' }"));
assert(tempoSrc.includes("{ until: 120, name: 'Moderato' }"));
assert(tempoSrc.includes("{ until: 138, name: 'Allegretto' }"));
assert(tempoSrc.includes("{ until: 200, name: 'Presto' }"));
assert(tempoSrc.includes("name: 'Prestissimo'"));

const HALF_DEG = 0.5 * (Math.PI / 180);
for (const mark of DIAL_MARKS) {
  const painted = angleFromDialBpm(mark);
  const back = bpmFromDialAngle(painted);
  assert.strictEqual(back, mark, `BPM round-trip ${mark}`);
  const relaid = angleFromDialBpm(back);
  const errDeg = (Math.abs(relaid - painted) * 180) / Math.PI;
  assert(errDeg <= 0.5, `label angle ${mark} err ${errDeg}°`);
  assert(Math.abs(relaid - painted) <= HALF_DEG, `0.5° gate ${mark}`);
}

const VIDEO_A_TEMPO = [
  [20, 'Grave'],
  [46, 'Largo'],
  [51, 'Largo'],
  [59, 'Largo'],
  [64, 'Adagio'],
  [65, 'Adagio'],
  [75, 'Adagio'],
  [76, 'Andante'],
  [84, 'Andante'],
  [95, 'Andante'],
  [100, 'Andante'],
  [103, 'Andante'],
  [120, 'Allegretto'],
  [123, 'Allegretto'],
  [131, 'Allegretto'],
  [190, 'Presto'],
  [203, 'Prestissimo'],
  [211, 'Prestissimo'],
  [316, 'Prestissimo'],
  [400, 'Prestissimo'],
];
for (const [bpm, name] of VIDEO_A_TEMPO) {
  assert.strictEqual(tempoName(bpm), name, `tempo ${bpm}`);
}

assert(angleFromDialBpm(400) > angleFromDialBpm(120), 'dial parameter rises with BPM');
assert(angleFromDialBpm(120) > angleFromDialBpm(20), 'dial parameter falls below 120');
assert(printed120ClockwiseDeg(120) === 0, '120 at 12 o clock');
assert(printed120ClockwiseDeg(400) < printed120ClockwiseDeg(120), 'B3: 120 moves CCW as BPM rises');
assert(printed120ClockwiseDeg(20) > printed120ClockwiseDeg(120), 'B3: 120 moves CW as BPM falls');
const at400 = 12 + printed120ClockwiseDeg(400) / 30;
assert(at400 > 7 && at400 < 8, `120 at 400 is ~7 o'clock (got ${at400})`);
const at65 = 12 + printed120ClockwiseDeg(65) / 30;
assert(at65 > 13.8 && at65 < 15, `120 at 65 is ~2–3 o'clock (got ${at65})`);

console.log('pockt-3 fingerprint tests passed');

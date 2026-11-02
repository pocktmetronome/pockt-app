'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const room = read('components/classic/FoundationDialRoom.tsx');
const lamp = read('modules/pockt-controls/ios/PocktLampView.swift');
const dial = read('modules/pockt-controls/ios/PocktDialControl.swift');
const instrument = read('components/classic/PocktInstrument.tsx');
const layout = read('lib/compute-foundation-layout.ts');
const { angleFromNorthStarBpm } = require('../lib/native-interaction-math.ts');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');

assert.ok(room.includes('<PocktInstrument'), 'dial room mounts the live instrument');
assert.ok(room.includes('<PocktDialView'), 'north star dial uses the proven pockt-dial view');
assert.ok(!room.includes('<NorthStarDialTurn'), 'gesture ring is not the home dial');
assert.ok(!room.includes('<PocktDialControl'), 'failed dial control is off the home screen');
assert.ok(!room.includes('dial-body-empty.png'), 'production dial does not mount the blank photographic face');
assert.ok(!room.includes('dial-scale-clean.png'), 'production dial does not mount a printed scale');
assert.ok(!room.includes('needle-shaft.png'), 'production needle is not a baked shaft');
assert.ok(dial.includes('rebuildMachined'), 'native dial draws its own face');
assert.ok(dial.includes('PocktEncoder.angle'), 'needle uses the encoder angle');
assert.ok(lamp.includes('return 1.16'), 'strong lamp bloom stays on the lens');
assert.ok(!lamp.includes('return 1.32') && !lamp.includes('return 2.0'), 'lamp halo is not a blob');
assert.ok(instrument.includes("glyph=\"minus\""), 'minus control exists');
assert.ok(instrument.includes("glyph=\"plus\""), 'plus control exists');
assert.ok(layout.includes('const bpmMinus = rect(sideX, stepY'), 'minus is the left tempo key');
assert.ok(layout.includes('const bpmPlus = rect(width - sideX - step'), 'plus is the right tempo key');

const placed = computeFoundationLayout(390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
assert.ok(placed.bpmMinus.x < placed.bpmPlus.x, 'minus sits left of plus');
let previous = -Infinity;
for (let bpm = 20; bpm <= 400; bpm += 1) {
  const angle = angleFromNorthStarBpm(bpm);
  assert.ok(Number.isFinite(angle), `angle ${bpm}`);
  assert.ok(angle >= previous - 1e-9, `angle moves forward at ${bpm}`);
  previous = angle;
}
assert.notStrictEqual(angleFromNorthStarBpm(20), angleFromNorthStarBpm(400));

const proofs = [
  'FULL SCREEN/120-rest.png',
  'FULL SCREEN/120-running.png',
  'DIAL/20.png',
  'DIAL/120.png',
  'DIAL/400.png',
  'BUTTONS/play-rest.png',
  'BUTTONS/play-down.png',
  'BEATS/beat-strong-peak.png',
  'LAYOUT/standard-iphone.png',
];
for (const file of proofs) {
  const full = path.join(root, 'artifacts/final-rescue/proofs', file);
  assert.ok(fs.existsSync(full), `missing proof ${file}`);
  assert.ok(fs.statSync(full).size > 800, `proof too small ${file}`);
}

console.log('visual rescue checks passed');

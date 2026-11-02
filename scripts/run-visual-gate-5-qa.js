'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, instrumentFurniture, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { BOSS_SCALE } = require('../lib/dial-scale-geometry.js');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-5');
const failures = [];
const fail = (message) => failures.push(message);

const screen = fs.readFileSync(path.join(root, 'scripts', 'render-visual-gate-5.js'), 'utf8');
const art = screen.slice(screen.indexOf('const ART'), screen.indexOf('const ICONS'));
if (art.includes('dial-scale-clean') || art.includes('dial-body-empty')) fail('gate 5 proof still mounts a broken dial source');
if (!screen.includes('instrumentFurniture') || !screen.includes('dialAngleDeg') || !screen.includes('CURRENT_FACE_FOR_GREGG')) {
  fail('gate 5 proof is not sharing production layout');
}
const instrument = fs.readFileSync(path.join(root, 'components', 'classic', 'PocktInstrument.tsx'), 'utf8');
if (!instrument.includes('instrumentFurniture') || instrument.includes('dial-body-empty') || instrument.includes('dial-scale-clean')) {
  fail('production instrument is not on the shared deck');
}
const swift = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktDialControl.swift'), 'utf8');
if (!swift.includes('PocktEncoder.angle') || !swift.includes(`* ${BOSS_SCALE}`)) fail('native boss scale drifted from shared geometry');
if (swift.includes('dial-body') || swift.includes('dial-scale-clean')) fail('native dial remounted a broken source');

const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG.png')));
const running = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_RUNNING_FOR_GREGG.png')));
if (face.width !== 390 || running.width !== 390) fail(`Gregg faces are ${face.width}x${face.height}, expected 390 logical width`);
let changed = 0;
const n = Math.min(face.data.length, running.data.length);
for (let i = 0; i < n; i += 24) changed += Math.abs(face.data[i] - running.data[i]);
if (changed < 400) fail('running face is not visibly different from the stopped face');

const required = [
  'CURRENT_FACE_FOR_GREGG.png',
  'CURRENT_RUNNING_FOR_GREGG.png',
  'FINAL_REVIEW_BOARD_G5.png',
  'FINAL_DETAIL_BOARD_G5.png',
  'proofs/FULL/390-rest.png',
  'proofs/FULL/390-running.png',
  'proofs/FULL/393-rest.png',
  'proofs/FULL/393-running.png',
  'proofs/FULL/small-rest.png',
  'proofs/FULL/pro-max-rest.png',
  'proofs/SURFACE.txt',
  'proofs/DETAIL/header-detail.png',
  'proofs/DETAIL/tempo-detail.png',
  'proofs/DETAIL/dial-detail.png',
  'proofs/DETAIL/beat-detail.png',
  'proofs/DETAIL/transport-detail.png',
  'proofs/DETAIL/nav-detail.png',
  'proofs/BUTTONS/tap-rest.png',
  'proofs/BUTTONS/tap-down.png',
  'proofs/BUTTONS/play-rest.png',
  'proofs/BUTTONS/play-down.png',
  'proofs/BUTTONS/play-running.png',
  'proofs/BUTTONS/minus-rest.png',
  'proofs/BUTTONS/minus-down.png',
  'proofs/BUTTONS/plus-rest.png',
  'proofs/BUTTONS/plus-down.png',
  'proofs/BEATS/beat-rail-rest.png',
  'proofs/BEATS/beat-soft-peak.png',
  'proofs/BEATS/beat-normal-peak.png',
  'proofs/BEATS/beat-strong-peak.png',
];
for (const bpm of [20, 40, 60, 80, 100, 120, 160, 200, 240, 260, 320, 400]) required.push(`proofs/DIAL/${bpm}.png`);
for (const file of required) {
  const full = path.join(gate, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 40) fail(`missing ${file}`);
}
const disclosure = fs.readFileSync(path.join(gate, 'proofs', 'SURFACE.txt'), 'utf8');
if (!disclosure.includes('SIMULATED NATIVE SURFACE')) fail('proof disclosure missing');

const rest = PNG.sync.read(fs.readFileSync(path.join(gate, 'proofs', 'BUTTONS', 'play-rest.png')));
const down = PNG.sync.read(fs.readFileSync(path.join(gate, 'proofs', 'BUTTONS', 'play-down.png')));
let delta = 0;
const samples = Math.min(rest.data.length, down.data.length);
for (let i = 0; i < samples; i += 16) delta += Math.abs(rest.data[i] - down.data[i]);
if (delta < 400) fail('play-down is not visibly different from play-rest');

const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
const furniture = instrumentFurniture(small);
if (layoutOverlaps(small.dial, small.beats) || small.bpmMinus.x > small.bpmHit.x) fail('small phone layout regressed');
if (furniture.upperDeck.y + furniture.upperDeck.h > small.dial.y + 2) fail('upper deck collides with the dial');
void furniture;

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('visual gate 5 qa passed');

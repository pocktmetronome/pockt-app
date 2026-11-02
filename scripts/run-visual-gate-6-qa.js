'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-6');
const failures = [];
const fail = (message) => failures.push(message);

const swift = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktDialControl.swift'), 'utf8');
const instrument = fs.readFileSync(path.join(root, 'components/classic/PocktInstrument.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'scripts/render-visual-gate-6.js'), 'utf8');
if (!swift.includes('PocktEncoder.angle') || swift.includes('dial-scale-clean') || swift.includes('dial-body')) fail('native dial architecture drifted');
if (!instrument.includes('instrumentFurniture') || !instrument.includes('NorthStarLiveButton') || !instrument.includes('PocktLampView')) fail('production instrument lost live controls');
const art = screen.slice(screen.indexOf('const ART'), screen.indexOf('const ICONS'));
if (!screen.includes('computeFoundationLayout') || !screen.includes('dialAngleDeg') || art.includes('dial-scale-clean') || art.includes('dial-body-empty')) fail('proof is not production-derived');

const phones = [
  [320, 568, 20, 0],
  [375, 667, 20, 0],
  [390, 844, 47, 34],
  [393, 852, 59, 34],
  [430, 932, 59, 34],
];
for (const [w, h, top, bottom] of phones) {
  const layout = computeFoundationLayout(w, h, { top, bottom, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const bad = layout.D < 160
    || layout.D > w - 8
    || layout.tuner.w < 48
    || layout.play.h < 52
    || layout.faceRail.h < 52
    || layout.bpmMinus.x > layout.bpmHit.x
    || layout.bpmPlus.x < layout.bpmHit.x
    || layoutOverlaps(layout.dial, layout.beats)
    || layoutOverlaps(layout.beats, layout.tap)
    || layoutOverlaps(layout.play, layout.faceRail)
    || layoutOverlaps(layout.bpmMinus, layout.bpmHit)
    || layoutOverlaps(layout.tuner, layout.bpmMinus)
    || layout.dial.y + layout.dial.h > layout.beats.y;
  if (bad) fail(`${w} layout collision or undersized hardware`);
}
const standard = computeFoundationLayout(390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
if (standard.tuner.w < small.tuner.w) fail('390 header is smaller than the small phone');
if (standard.play.h < small.play.h) fail('390 transport is smaller than the small phone');
if (standard.bpmHit.h < small.bpmHit.h) fail('390 tempo plate is smaller than the small phone');

const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG_G6.png')));
if (face.width !== 390 || face.height !== 844) fail(`Gregg face is ${face.width}x${face.height}`);
const required = [
  'CURRENT_FACE_FOR_GREGG_G6.png',
  'G5_TO_G6.png',
  'GATE_6_DETAIL_BOARD.png',
  'proofs/LOGICAL/small-logical.png',
  'proofs/LOGICAL/375-logical.png',
  'proofs/LOGICAL/390-logical.png',
  'proofs/LOGICAL/393-logical.png',
  'proofs/LOGICAL/430-logical.png',
  'proofs/DIAL/60.png',
  'proofs/DIAL/120.png',
  'proofs/DIAL/240.png',
  'proofs/DIAL/400.png',
  'proofs/BUTTONS/play-rest.png',
  'proofs/BUTTONS/play-down.png',
  'proofs/BUTTONS/play-running.png',
  'proofs/BUTTONS/tap-rest.png',
  'proofs/BUTTONS/tap-down.png',
  'proofs/BUTTONS/minus-rest.png',
  'proofs/BUTTONS/minus-down.png',
  'proofs/BUTTONS/plus-rest.png',
  'proofs/BUTTONS/plus-down.png',
  'proofs/BEATS/beat-normal-rest.png',
  'proofs/BEATS/beat-normal-peak.png',
  'proofs/BEATS/beat-strong-rest.png',
  'proofs/BEATS/beat-strong-peak.png',
  'proofs/SURFACE.txt',
];
for (const file of required) {
  const full = path.join(gate, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 40) fail(`missing ${file}`);
}
if (!fs.readFileSync(path.join(gate, 'proofs/SURFACE.txt'), 'utf8').includes('SIMULATED NATIVE SURFACE')) fail('disclosure missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('visual gate 6 qa passed');

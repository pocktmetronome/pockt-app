'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-10');
let failed = 0;
const fail = (message) => {
  failed += 1;
  console.error('FAIL', message);
};

const layout = fs.readFileSync(path.join(root, 'lib', 'compute-foundation-layout.ts'), 'utf8');
const instrument = fs.readFileSync(path.join(root, 'components', 'classic', 'PocktInstrument.tsx'), 'utf8');
const swift = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktDialControl.swift'), 'utf8');
const lamp = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktLampView.swift'), 'utf8');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const thesis = fs.readFileSync(path.join(gate, 'DESIGN_THESIS.md'), 'utf8');

if (layout.includes('const plateH')) fail('plateH returned');
if (!layout.includes('const bpmMinus = rect(sideX, stepY')) fail('minus left of the rotary');
if (!layout.includes('const bpmPlus = rect(width - sideX - step')) fail('plus right of the rotary');
const room = fs.readFileSync(path.join(root, 'components', 'classic', 'FoundationDialRoom.tsx'), 'utf8');
if (!instrument.includes('NorthStarLiveButton') || !instrument.includes('PocktLampView') || !instrument.includes('PocktReadout')) fail('live controls left the face');
if (!room.includes('<PocktDialView') || room.includes('<PocktDialControl')) fail('dial driver missing');
if (!instrument.includes('shell-utility') || !instrument.includes('shell-primary') || !instrument.includes('navLatch')) fail('control family missing');
if (!swift.includes('bezelPlate.setAffineTransform') || !swift.includes('updatePositionArc')) fail('live rotary cue missing');
if (!lamp.includes('return 1.16')) fail('beat halo scale drifted');
if (app.expo.ios.buildNumber !== '165') fail('build number changed');
if (thesis.length < 400) fail('design thesis missing');

function gap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  return Math.max(dx, dy);
}

const phones = [
  [320, 568, 20, 0],
  [375, 667, 20, 0],
  [390, 844, 47, 34],
  [393, 852, 59, 34],
  [430, 932, 59, 34],
];
const pairs = [['dial', 'bpmMinus'], ['dial', 'bpmPlus'], ['dial', 'beats'], ['beats', 'transport'], ['transport', 'faceRail'], ['play', 'tap'], ['play', 'meter'], ['meter', 'pockt']];
for (const [w, h, top, bottom] of phones) {
  const L = computeFoundationLayout(w, h, { top, bottom, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const hit = L.bpmHit;
  const cx = hit.x + hit.w / 2;
  const cy = hit.y + hit.h / 2;
  const inDial = cx > L.dial.x && cx < L.dial.x + L.dial.w && cy > L.dial.y && cy < L.dial.y + L.dial.h;
  if (!inDial || layoutOverlaps(hit, L.bpmMinus) || layoutOverlaps(hit, L.bpmPlus)) fail(`${w} readout left the fixed center`);
  const bad = pairs.filter(([a, b]) => layoutOverlaps(L[a], L[b]) || gap(L[a], L[b]) < 4);
  if (bad.length) fail(`${w} overlap ${bad.map((pair) => pair.join('/')).join(',')}`);
  if (L.D < 160 || L.dial.w !== L.dial.h) fail(`${w} dial`);
  if (L.bpmMinus.x > L.dial.x || L.bpmPlus.x < L.dial.x) fail(`${w} stepper side`);
  if (L.play.w <= L.tap.w || L.play.h < 52 || L.faceRail.h < 52) fail(`${w} transport`);
  if (L.faceRail.w % 6 !== 0) fail(`${w} nav slots`);
  if (L.faceRail.y + L.faceRail.h > h - bottom + 0.5) fail(`${w} safe area`);
  if (L.beats.h > 180) fail(`${w} beats`);
}
const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
const standard = computeFoundationLayout(390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
if (standard.play.h < small.play.h || standard.tuner.w < small.tuner.w) fail('390 chrome shrank below the small phone');

for (const file of [
  'CURRENT_FACE_FOR_GREGG_G10.png',
  'CURRENT_RUNNING_FOR_GREGG_G10.png',
  'G8_TO_G10.png',
  'G10_DESIGN_DIRECTIONS.png',
  'G10_DETAIL_BOARD.png',
  'G10_INTERACTION_BOARD.png',
  'DESIGN_THESIS.md',
  'SURFACE.txt',
]) {
  if (!fs.existsSync(path.join(gate, file))) fail(`missing ${file}`);
}
const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG_G10.png')));
if (face.width !== 390 || face.height !== 844) fail(`face ${face.width}x${face.height}`);
const running = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_RUNNING_FOR_GREGG_G10.png')));
if (running.width !== 390 || running.height !== 844) fail('running size');

if (failed) {
  console.error(`visual gate 10 qa failed ${failed}`);
  process.exit(1);
}
console.log('visual gate 10 qa passed');

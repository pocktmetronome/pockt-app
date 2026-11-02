'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, faceplateApertures, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-11');
let failed = 0;
const fail = (message) => {
  failed += 1;
  console.error('FAIL', message);
};

const layoutSrc = fs.readFileSync(path.join(root, 'lib', 'compute-foundation-layout.ts'), 'utf8');
const instrument = fs.readFileSync(path.join(root, 'components', 'classic', 'PocktInstrument.tsx'), 'utf8');
const room = fs.readFileSync(path.join(root, 'components', 'classic', 'FoundationDialRoom.tsx'), 'utf8');
const lamp = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktLampView.swift'), 'utf8');
const swift = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktDialControl.swift'), 'utf8');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

if (layoutSrc.includes('const plateH')) fail('plateH returned');
if (!layoutSrc.includes('faceplateApertures')) fail('layout authority missing');
if (!instrument.includes('NorthStarLiveButton') || !instrument.includes('PocktLampView') || !instrument.includes('PocktReadout') || !instrument.includes('faceplateApertures')) fail('live controls left the faceplate');
if (!room.includes('<PocktDialView') || room.includes('<PocktDialControl') || !room.includes('faceplate-')) fail('dial is not mounted on the faceplate');
if (!swift.includes('bezelPlate.setAffineTransform') || !swift.includes('updatePositionArc')) fail('live rotary cue missing');
if (!lamp.includes('return 1.16')) fail('beat halo scale drifted');
if (app.expo.ios.buildNumber !== '165') fail('build number changed');

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
  const apertures = faceplateApertures(L, 4);
  const hit = L.bpmHit;
  const cx = hit.x + hit.w / 2;
  const cy = hit.y + hit.h / 2;
  const inDial = cx > L.dial.x && cx < L.dial.x + L.dial.w && cy > L.dial.y && cy < L.dial.y + L.dial.h;
  if (!inDial || layoutOverlaps(hit, L.bpmMinus) || layoutOverlaps(hit, L.bpmPlus)) fail(`${w} readout left the fixed center`);
  const bad = pairs.filter(([a, b]) => layoutOverlaps(L[a], L[b]) || gap(L[a], L[b]) < 4);
  if (bad.length) fail(`${w} overlap ${bad.map((pair) => pair.join('/')).join(',')}`);
  if (L.D < 160 || L.play.h < 52 || L.faceRail.w % 6 !== 0) fail(`${w} structure`);
  if (L.faceRail.y + L.faceRail.h > h - bottom + 0.5) fail(`${w} safe area`);
  const seat = apertures.dialSeat;
  if (L.dial.x < seat.x - 0.5 || L.dial.y < seat.y - 0.5 || L.dial.x + L.dial.w > seat.x + seat.w + 0.5) fail(`${w} dial is not in its seat`);
  if (L.play.x < apertures.play.x || L.play.y < apertures.play.y) fail(`${w} play is not in its well`);
  const socket = apertures.sockets[0];
  if (!socket || socket.w < 18) fail(`${w} lamp socket`);
  const plate = path.join(root, 'assets', 'faceplate', `faceplate-${w}x${h}.png`);
  if (!fs.existsSync(plate)) fail(`missing plate ${w}x${h}`);
  else {
    const png = PNG.sync.read(fs.readFileSync(plate));
    if (png.width !== w || png.height !== h) fail(`plate ${w}x${h} is ${png.width}x${png.height}`);
  }
}

for (const file of [
  'FACEPLATE_ONLY_G11.png',
  'G11_FACEPLATE_DESIGNS.png',
  'CURRENT_FACE_FOR_GREGG_G11.png',
  'CURRENT_RUNNING_FOR_GREGG_G11.png',
  'BEAT_LIGHT_LEVELS_G11.png',
  'G11_INTERACTION_BOARD.png',
  'G11_FACEPLATE_FIT_BOARD.png',
  'SURFACE.txt',
]) {
  if (!fs.existsSync(path.join(gate, file))) fail(`missing ${file}`);
}
const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG_G11.png')));
const blank = PNG.sync.read(fs.readFileSync(path.join(gate, 'FACEPLATE_ONLY_G11.png')));
if (face.width !== 390 || face.height !== 844) fail('face size');
if (blank.width !== 390 || blank.height !== 844) fail('faceplate size');

if (failed) {
  console.error(`visual gate 11 qa failed ${failed}`);
  process.exit(1);
}
console.log('visual gate 11 qa passed');

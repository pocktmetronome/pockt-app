'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-9');
const failures = [];
const fail = (message) => failures.push(message);

const swift = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktDialControl.swift'), 'utf8');
const instrument = fs.readFileSync(path.join(root, 'components/classic/PocktInstrument.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'scripts/render-visual-gate-9.js'), 'utf8');
const layoutSrc = fs.readFileSync(path.join(root, 'lib/compute-foundation-layout.ts'), 'utf8');
const button = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktMechButton.swift'), 'utf8');
const haptics = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktHaptics.swift'), 'utf8');
const lamp = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktLampView.swift'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
const geometry = JSON.parse(fs.readFileSync(path.join(gate, 'HERITAGE_GEOMETRY.json'), 'utf8'));

if (geometry.sourceCommit !== '535f7d1') fail('heritage geometry file missing');
if (!swift.includes('PocktEncoder.angle') || !swift.includes('bezelPlate.setAffineTransform') || swift.includes('dial-scale-clean') || swift.includes('dial-body')) fail('native dial architecture drifted');
if (!instrument.includes('NorthStarLiveButton') || !instrument.includes('PocktLampView') || !instrument.includes('PocktReadout')) fail('production instrument lost live controls');
if (!instrument.includes('shell-utility') || !instrument.includes('shell-primary') || !instrument.includes('navLatch')) fail('production chassis family drifted');
if (!layoutSrc.includes('const bpmMinus = rect(sideX, stepY') || !layoutSrc.includes('const bpmPlus = rect(width - sideX - step')) fail('minus left / plus right drifted');
if (!button.includes('PocktHaptics') || !button.includes('setShell') || !haptics.includes('token')) fail('button haptics drifted');
if (!lamp.includes('return 1.16')) fail('strong lamp scale drifted');
if (!app.includes('"buildNumber": "165"')) fail('build number changed');
const art = screen.slice(screen.indexOf('const ART'), screen.indexOf('const ICONS'));
if (!screen.includes('computeFoundationLayout') || !screen.includes('dialAngleDeg') || art.includes('dial-scale-clean') || art.includes('dial-body-empty')) fail('proof is not production-derived');

const phones = [
  [320, 568, 20, 0],
  [375, 667, 20, 0],
  [390, 844, 47, 34],
  [393, 852, 59, 34],
  [430, 932, 59, 34],
];
function gap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  return Math.max(dx, dy);
}
for (const [w, h, top, bottom] of phones) {
  const layout = computeFoundationLayout(w, h, { top, bottom, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
  const voidGap = layout.faceRail.y - (layout.transport.y + layout.transport.h);
  const bad = layout.D < 160
    || layout.D > w - 8
    || layout.tuner.w < 48
    || layout.play.h < 52
    || layout.play.w < layout.tap.w
    || layout.faceRail.h < 52
    || layout.bpmMinus.x > layout.bpmHit.x
    || layout.bpmPlus.x < layout.bpmHit.x
    || voidGap > 48
    || layoutOverlaps(layout.dial, layout.beats)
    || layoutOverlaps(layout.beats, layout.tap)
    || layoutOverlaps(layout.play, layout.faceRail)
    || gap(layout.dial, layout.beats) < 4
    || gap(layout.transport, layout.faceRail) < 4
    || layout.faceRail.w % 6 !== 0
    || layout.faceRail.y + layout.faceRail.h > h - bottom + 0.5;
  if (bad) fail(`${w} layout collision, void, or undersized hardware`);
}
const standard = computeFoundationLayout(390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
if (standard.tuner.w < small.tuner.w) fail('390 header is smaller than the small phone');
if (standard.play.h < small.play.h) fail('390 transport is smaller than the small phone');
if (standard.beats.h < small.beats.h) fail('390 beat rail is smaller than the small phone');
if (standard.D < 160) fail('390 dial collapsed');

const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG_G9.png')));
if (face.width !== 390 || face.height !== 844) fail(`Gregg face is ${face.width}x${face.height}`);
const running = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_RUNNING_FOR_GREGG_G9.png')));
if (running.width !== 390 || running.height !== 844) fail(`running face is ${running.width}x${running.height}`);

const required = [
  'HERITAGE_GEOMETRY.json',
  'CURRENT_FACE_FOR_GREGG_G9.png',
  'CURRENT_RUNNING_FOR_GREGG_G9.png',
  'HERITAGE_G8_G9.png',
  'G9_DETAIL_BOARD.png',
  'G9_INTERACTION_BOARD.png',
  'iterations/V1.png',
  'iterations/V2.png',
  'iterations/V3.png',
  'iterations/V4.png',
  'proofs/LOGICAL/320-logical.png',
  'proofs/LOGICAL/375-logical.png',
  'proofs/LOGICAL/390-logical.png',
  'proofs/LOGICAL/393-logical.png',
  'proofs/LOGICAL/430-logical.png',
  'proofs/DIAL/60.png',
  'proofs/DIAL/240.png',
  'proofs/BUTTONS/play-rest.png',
  'proofs/BUTTONS/play-down.png',
  'proofs/BUTTONS/play-running.png',
  'proofs/BUTTONS/meter-rest.png',
  'proofs/BUTTONS/options-rest.png',
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
console.log('visual gate 9 qa passed');

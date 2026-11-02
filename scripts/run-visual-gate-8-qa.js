'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-8');
const failures = [];
const fail = (message) => failures.push(message);

const swift = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktDialControl.swift'), 'utf8');
const instrument = fs.readFileSync(path.join(root, 'components/classic/PocktInstrument.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'scripts/render-visual-gate-8.js'), 'utf8');
const layoutSrc = fs.readFileSync(path.join(root, 'lib/compute-foundation-layout.ts'), 'utf8');
const button = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktMechButton.swift'), 'utf8');
const haptics = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktHaptics.swift'), 'utf8');
const lamp = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktLampView.swift'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.json'), 'utf8');

if (!swift.includes('PocktEncoder.angle') || !swift.includes('bezelPlate.setAffineTransform') || swift.includes('dial-scale-clean') || swift.includes('dial-body')) fail('native dial architecture drifted');
if (!instrument.includes('NorthStarLiveButton') || !instrument.includes('PocktLampView') || !instrument.includes('PocktReadout')) fail('production instrument lost live controls');
if (!instrument.includes('shell-utility') || !instrument.includes('shell-primary') || !instrument.includes('navLatch')) fail('production chassis family drifted');
if (!layoutSrc.includes('const bpmMinus = rect(sideX') || !layoutSrc.includes('const bpmPlus = rect(width - sideX - step')) fail('minus left / plus right drifted');
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
for (const [w, h, top, bottom] of phones) {
  const layout = computeFoundationLayout(w, h, { top, bottom, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
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
    || layout.dial.y + layout.dial.h > layout.beats.y
    || layout.faceRail.w % 6 !== 0;
  if (bad) fail(`${w} layout collision or undersized hardware`);
}
const standard = computeFoundationLayout(390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1, composition: 'heritage' });
if (standard.tuner.w < small.tuner.w) fail('390 header is smaller than the small phone');
if (standard.play.h < small.play.h) fail('390 transport is smaller than the small phone');
if (standard.bpmHit.h < small.bpmHit.h) fail('390 tempo plate is smaller than the small phone');

const face = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_FACE_FOR_GREGG_G8.png')));
if (face.width !== 390 || face.height !== 844) fail(`Gregg face is ${face.width}x${face.height}`);
const running = PNG.sync.read(fs.readFileSync(path.join(gate, 'CURRENT_RUNNING_FOR_GREGG_G8.png')));
if (running.width !== 390 || running.height !== 844) fail(`running face is ${running.width}x${running.height}`);

const required = [
  'HISTORICAL_VISUAL_BOARD.png',
  'HISTORICAL_DESIGN_EXTRACTION.md',
  'G8_DIRECTION_BOARD.png',
  'CURRENT_FACE_FOR_GREGG_G8.png',
  'CURRENT_RUNNING_FOR_GREGG_G8.png',
  'G7_TO_G8.png',
  'G8_DETAIL_BOARD.png',
  'G8_INTERACTION_BOARD.png',
  'directions/A1.png',
  'directions/A2.png',
  'directions/B1.png',
  'directions/B2.png',
  'directions/C1.png',
  'directions/C2.png',
  'directions/V1.png',
  'directions/V2.png',
  'directions/V3.png',
  'proofs/LOGICAL/320-logical.png',
  'proofs/LOGICAL/375-logical.png',
  'proofs/LOGICAL/390-logical.png',
  'proofs/LOGICAL/393-logical.png',
  'proofs/LOGICAL/430-logical.png',
  'proofs/DIAL/60.png',
  'proofs/DIAL/120.png',
  'proofs/DIAL/240.png',
  'proofs/DIAL/400.png',
  'proofs/BUTTONS/tuner-rest.png',
  'proofs/BUTTONS/tuner-down.png',
  'proofs/BUTTONS/sound-rest.png',
  'proofs/BUTTONS/sound-down.png',
  'proofs/BUTTONS/minus-rest.png',
  'proofs/BUTTONS/minus-down.png',
  'proofs/BUTTONS/plus-rest.png',
  'proofs/BUTTONS/plus-down.png',
  'proofs/BUTTONS/tap-rest.png',
  'proofs/BUTTONS/tap-down.png',
  'proofs/BUTTONS/play-rest.png',
  'proofs/BUTTONS/play-down.png',
  'proofs/BUTTONS/play-running.png',
  'proofs/BUTTONS/loop-off.png',
  'proofs/BUTTONS/loop-on.png',
  'proofs/BEATS/beat-strong-rest.png',
  'proofs/BEATS/beat-strong-peak.png',
  'proofs/NAV/nav-rest.png',
  'proofs/NAV/nav-selected.png',
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
console.log('visual gate 8 qa passed');

'use strict';

const fs = require('fs');
const path = require('path');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const proofs = path.join(root, 'artifacts', 'visual-gate-3', 'proofs');
const failures = [];
const fail = (message) => failures.push(message);

const required = [
  'FULL/390-rest.png',
  'FULL/390-running.png',
  'FULL/393-rest.png',
  'FULL/393-running.png',
  'FULL/small-rest.png',
  'FULL/pro-max-rest.png',
  'LOGICAL/390-logical.png',
  'LOGICAL/393-logical.png',
  'LOGICAL/small-logical.png',
  'DIAL/dial-detail-390.png',
  'DETAIL/header-detail.png',
  'DETAIL/tempo-detail.png',
  'BEATS/beat-rail-rest.png',
  'BEATS/beat-soft-peak.png',
  'BEATS/beat-normal-peak.png',
  'BEATS/beat-strong-peak.png',
  'BUTTONS/play-rest.png',
  'BUTTONS/play-down.png',
  'BUTTONS/play-running.png',
  'BUTTONS/tap-rest.png',
  'BUTTONS/tap-down.png',
  'BUTTONS/minus-rest.png',
  'BUTTONS/minus-down.png',
  'BUTTONS/plus-rest.png',
  'BUTTONS/plus-down.png',
  'NAV/nav-rest.png',
  'NAV/nav-selected.png',
];
for (const bpm of [20, 60, 120, 160, 240, 320, 400]) required.push(`DIAL/${bpm}.png`);
for (const file of required) {
  const full = path.join(proofs, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 800) fail(`missing ${file}`);
}
for (const file of ['FINAL_REVIEW_BOARD.png', 'FINAL_DETAIL_BOARD.png', 'history-contact-sheet.png', 'ASSET_AUDIT.md', 'directions/A.png', 'directions/B.png', 'directions/C.png']) {
  if (!fs.existsSync(path.join(root, 'artifacts', 'visual-gate-3', file))) fail(`missing ${file}`);
}

const phones = [
  [320, 568, { top: 20, bottom: 0, left: 0, right: 0 }],
  [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }],
  [393, 852, { top: 59, bottom: 34, left: 0, right: 0 }],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }],
];
for (const [w, h, insets] of phones) {
  const L = computeFoundationLayout(w, h, insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  const tempoBottom = Math.max(L.bpmMinus.y + L.bpmMinus.h, L.bpmHit.y + L.bpmHit.h);
  const above = L.dial.y - tempoBottom;
  const below = L.beats.y - (L.dial.y + L.dial.h);
  if (above > 48 || below > 48) fail(`${w} dial gap ${above}/${below}`);
  if (L.bpmMinus.x > L.bpmHit.x) fail(`${w} minus is not on the left`);
  const hit = L.bpmHit;
  const inDial = hit.x + hit.w / 2 > L.dial.x && hit.x + hit.w / 2 < L.dial.x + L.dial.w
    && hit.y + hit.h / 2 > L.dial.y && hit.y + hit.h / 2 < L.dial.y + L.dial.h;
  if (!inDial) fail(`${w} bpm center leaves the dial`);
  if (layoutOverlaps(L.dial, L.beats) || layoutOverlaps(L.beats, L.transport) || layoutOverlaps(hit, L.bpmMinus) || layoutOverlaps(hit, L.bpmPlus)) {
    fail(`${w} control overlap`);
  }
  const slot = L.faceRail.w / 6;
  if (textWidth('PENDULUM', 10.5) > slot - 4 && textWidth('PENDULUM', 7) > slot - 4) fail(`${w} PENDULUM cannot fit`);
}
const room = fs.readFileSync(path.join(root, 'components', 'classic', 'FoundationDialRoom.tsx'), 'utf8');
if (!room.includes('<PocktDialView') || room.includes('<PocktDialControl') || room.includes('dial-body-empty.png')) fail('dial room contract changed');
const instrument = fs.readFileSync(path.join(root, 'components', 'classic', 'PocktInstrument.tsx'), 'utf8');
if (!instrument.includes('pockt_wordmark_northstar.png')) fail('wordmark asset missing from the instrument');
const dial = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktDialControl.swift'), 'utf8');
if (!dial.includes('loadBundledFace') || !dial.includes('PocktEncoder.angle')) fail('native dial lost the live texture needle');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('visual gate 3 qa passed');

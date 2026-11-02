'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { dialLabels, polar } = require('../lib/dial-scale-geometry.js');

const root = path.join(__dirname, '..');
const gate = path.join(root, 'artifacts', 'visual-gate-4');
const failures = [];
const fail = (message) => failures.push(message);

function read(rel) {
  return PNG.sync.read(fs.readFileSync(path.join(root, rel)));
}

function lum(png, x, y) {
  const o = (y * png.width + x) * 4;
  return png.data[o] + png.data[o + 1] + png.data[o + 2];
}

const production = [
  'modules/pockt-controls/ios/PocktDialControl.swift',
  'components/classic/FoundationDialRoom.tsx',
  'components/classic/PocktInstrument.tsx',
];
for (const file of production) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (text.includes('dial-scale-clean') || text.includes('dial-body-empty') || text.includes('dial-body.png')) {
    fail(`${file} still mounts a broken dial source`);
  }
}
const screen = fs.readFileSync(path.join(root, 'scripts', 'render-visual-gate-4.js'), 'utf8');
const artBlock = screen.slice(screen.indexOf('const ART'), screen.indexOf('const ICONS'));
if (artBlock.includes('dial-scale-clean') || artBlock.includes('dial-body-empty')) {
  fail('proof art manifest still uses a broken dial source');
}
if (!screen.includes('dialAngleDeg') || !screen.includes('dial-scale-generated.png') || !screen.includes('dial-bezel-clean.png')) {
  fail('proof is not using the shared clean dial stack');
}
const swift = fs.readFileSync(path.join(root, 'modules/pockt-controls/ios/PocktDialControl.swift'), 'utf8');
if (!swift.includes('dial-bezel') || !swift.includes('dial-face') || !swift.includes('PocktEncoder.angle')) {
  fail('native dial is not on the clean component stack');
}

const face = read('assets/dial-clean/dial-face-neutral.png');
const bezel = read('assets/dial-clean/dial-bezel-clean.png');
const scale = read('assets/dial-clean/dial-scale-generated.png');
const cx = face.width / 2;
const cy = face.height / 2;

function meanSector(png, deg, radius) {
  let sum = 0;
  let n = 0;
  const rad = (deg * Math.PI) / 180;
  for (let dr = -6; dr <= 6; dr += 2) {
    const x = Math.round(cx + Math.sin(rad) * (radius + dr));
    const y = Math.round(cy - Math.cos(rad) * (radius + dr));
    const o = (y * png.width + x) * 4;
    if (png.data[o + 3] < 200) continue;
    sum += png.data[o] + png.data[o + 1] + png.data[o + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}
const smear = meanSector(face, -100, 120);
const opposite = meanSector(face, 80, 120);
if (Math.abs(smear - opposite) > 22) fail(`face ghost remains smear ${smear.toFixed(1)} opposite ${opposite.toFixed(1)}`);

for (const [x, y] of [[0, 0], [455, 0], [0, 455], [455, 455], [8, 8]]) {
  const o = (y * bezel.width + x) * 4;
  if (bezel.data[o + 3] > 8) fail(`bezel debris at ${x},${y}`);
}
let bezelOutside = 0;
for (let y = 0; y < bezel.height; y += 4) {
  for (let x = 0; x < bezel.width; x += 4) {
    const r = Math.hypot(x - cx, y - cy);
    const a = bezel.data[(y * bezel.width + x) * 4 + 3];
    if (r > 229 && a > 8) bezelOutside += 1;
    if (r < 170 && a > 8) bezelOutside += 1;
  }
}
if (bezelOutside) fail(`bezel has ${bezelOutside} samples outside the annulus`);

for (const label of dialLabels()) {
  const at = { x: Math.round(label.x), y: Math.round(label.y) };
  let ink = 0;
  for (let y = at.y - 10; y <= at.y + 10; y += 1) {
    for (let x = at.x - 16; x <= at.x + 16; x += 1) {
      const o = (y * scale.width + x) * 4;
      if (scale.data[o + 3] > 40 && lum(scale, x, y) > 80) ink += 1;
    }
  }
  if (ink < 12) fail(`scale label ${label.bpm} is missing (${ink} ink pixels)`);
}
const widthOf = (bpm) => {
  const label = dialLabels().find((item) => item.bpm === bpm);
  let minX = 999;
  let maxX = 0;
  const y = Math.round(label.y);
  for (let yy = y - 12; yy <= y + 12; yy += 1) {
    for (let x = Math.round(label.x) - 28; x <= Math.round(label.x) + 28; x += 1) {
      const o = (yy * scale.width + x) * 4;
      if (scale.data[o + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return maxX - minX;
};
if (widthOf(100) <= widthOf(20) || widthOf(400) <= widthOf(40)) {
  fail('three-digit labels are not wider than two-digit labels');
}

const required = [
  'proofs/FULL/390-rest.png',
  'proofs/FULL/390-running.png',
  'proofs/FULL/393-rest.png',
  'proofs/FULL/small-rest.png',
  'proofs/FULL/pro-max-rest.png',
  'proofs/LOGICAL/390-logical.png',
  'proofs/DIAL/dial-face-only.png',
  'proofs/DIAL/dial-bezel-only.png',
  'proofs/DIAL/dial-scale-only.png',
  'proofs/DIAL/dial-needle-only.png',
  'proofs/DIAL/dial-boss-only.png',
  'proofs/DIAL/dial-composite-120.png',
  'proofs/SURFACE.txt',
  'FINAL_REVIEW_BOARD_G4.png',
  'FINAL_DETAIL_BOARD_G4.png',
  'DIAL_FORENSIC_BOARD_G4.png',
  'DEPRECATED_ASSETS.md',
];
for (const bpm of [20, 40, 60, 80, 100, 120, 160, 200, 240, 260, 320, 400]) required.push(`proofs/DIAL/${bpm}.png`);
for (const file of required) {
  const full = path.join(gate, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 40) fail(`missing ${file}`);
}
const disclosure = fs.readFileSync(path.join(gate, 'proofs', 'SURFACE.txt'), 'utf8');
if (!disclosure.includes('SIMULATED NATIVE SURFACE')) fail('proof disclosure missing');

const rest = read('artifacts/visual-gate-4/proofs/BUTTONS/play-rest.png');
const down = read('artifacts/visual-gate-4/proofs/BUTTONS/play-down.png');
let delta = 0;
const n = Math.min(rest.data.length, down.data.length);
for (let i = 0; i < n; i += 16) delta += Math.abs(rest.data[i] - down.data[i]);
if (delta < 400) fail('play-down is not visibly different from play-rest');

const small = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
if (layoutOverlaps(small.dial, small.beats) || small.bpmMinus.x > small.bpmHit.x) fail('small phone layout regressed');
void polar;

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('visual gate 4 qa passed');

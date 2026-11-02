'use strict';

const fs = require('fs');
const path = require('path');
const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { fits, navFont, loopFont, textWidth } = require('./visual-fit');

const root = path.join(__dirname, '..');
const proofs = path.join(root, 'artifacts', 'visual-gate-2', 'proofs');
const failures = [];

function fail(message) {
  failures.push(message);
}

const devices = [
  ['small', 320, 568, { top: 20, bottom: 0, left: 0, right: 0 }],
  ['375', 375, 812, { top: 47, bottom: 34, left: 0, right: 0 }],
  ['standard', 390, 844, { top: 47, bottom: 34, left: 0, right: 0 }],
  ['393', 393, 852, { top: 59, bottom: 34, left: 0, right: 0 }],
  ['pro', 430, 932, { top: 59, bottom: 34, left: 0, right: 0 }],
];

const siblings = [
  ['tuner', 'sound'],
  ['tuner', 'bpmMinus'],
  ['sound', 'bpmPlus'],
  ['bpmMinus', 'bpmHit'],
  ['bpmHit', 'bpmPlus'],
  ['dial', 'bpmHit'],
  ['dial', 'bpmMinus'],
  ['dial', 'bpmPlus'],
  ['dial', 'beats'],
  ['dial', 'tuner'],
  ['beats', 'transport'],
  ['transport', 'faceRail'],
  ['play', 'tap'],
  ['play', 'meter'],
  ['meter', 'pockt'],
];

function inside(name, box, width, height, insets, device) {
  if (box.x < -0.5 || box.y < insets.top - 0.5 || box.x + box.w > width + 0.5 || box.y + box.h > height - insets.bottom + 0.5) {
    fail(`${device} ${name} leaves the safe chassis ${JSON.stringify(box)}`);
  }
}

function gap(a, b) {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  return Math.max(dx, dy);
}

for (const [device, width, height, insets] of devices) {
  const layout = computeFoundationLayout(width, height, insets, { dialChrome: true, presentation: 'beats', beatRows: 1 });
  for (const key of ['dial', 'beats', 'transport', 'faceRail', 'bpmHit', 'bpmMinus', 'bpmPlus', 'tuner', 'sound', 'play', 'tap', 'meter', 'pockt']) {
    const box = layout[key];
    if (!box || !Number.isFinite(box.x + box.y + box.w + box.h) || box.w < 8 || box.h < 8) {
      fail(`${device} ${key} is missing or degenerate`);
      continue;
    }
    inside(key, box, width, height, insets, device);
  }
  for (const [a, b] of siblings) {
    if (a === 'dial' && b === 'bpmHit') {
      const hit = layout.bpmHit;
      const cx = hit.x + hit.w / 2;
      const cy = hit.y + hit.h / 2;
      const inDial = cx > layout.dial.x && cx < layout.dial.x + layout.dial.w && cy > layout.dial.y && cy < layout.dial.y + layout.dial.h;
      if (!inDial) fail(`${device} bpm center leaves the dial`);
      if (layoutOverlaps(hit, layout.bpmMinus) || layoutOverlaps(hit, layout.bpmPlus)) fail(`${device} bpm center hits a stepper`);
      continue;
    }
    if (layoutOverlaps(layout[a], layout[b])) fail(`${device} ${a} intersects ${b}`);
    if (gap(layout[a], layout[b]) < 4) fail(`${device} ${a}/${b} spacing ${gap(layout[a], layout[b]).toFixed(1)}px`);
  }
  if (layout.play.h < 40 || layout.tap.h < 40 || layout.bpmMinus.w < 36) {
    fail(`${device} primary touch target is below the useful minimum`);
  }

  const slot = layout.faceRail.w / 6;
  const font = navFont(slot);
  if (!fits('PENDULUM', font, slot)) fail(`${device} PENDULUM overflows a nav slot at ${font}px / ${slot.toFixed(1)}`);
  for (let index = 0; index < 6; index += 1) {
    const item = { x: layout.faceRail.x + slot * index, y: layout.faceRail.y, w: slot, h: layout.faceRail.h };
    if (index > 0 && layoutOverlaps(item, { x: layout.faceRail.x + slot * (index - 1), y: layout.faceRail.y, w: slot, h: layout.faceRail.h })) {
      fail(`${device} nav slots overlap`);
    }
  }
  if (textWidth('PENDULUM', font) > slot - 8) fail(`${device} nav label wider than its slot`);

  const loopW = Math.min(64, Math.max(52, layout.beats.h * 0.7));
  const loopSize = loopFont(loopW);
  if (!fits('LOOP', loopSize, loopW - 14)) fail(`${device} LOOP overflows its key`);
  const lamp = { x: layout.beats.x + 8, y: layout.beats.y + (layout.beats.h - 28) / 2, w: 28, h: 28 };
  const loop = {
    x: layout.beats.x + layout.beats.w - loopW - 8,
    y: layout.beats.y + (layout.beats.h - 36) / 2,
    w: loopW,
    h: 36,
  };
  if (!layout.beats || layoutOverlaps(lamp, loop)) fail(`${device} status lamp intersects LOOP`);
  const innerX = layout.beats.x + 28 + 16;
  const innerW = layout.beats.w - 28 - loopW - 28;
  const col = innerW / 4;
  const disc = Math.min(col * 0.72, layout.beats.h * 0.52);
  for (let index = 0; index < 4; index += 1) {
    const fixture = {
      x: innerX + col * index + (col - disc) / 2,
      y: layout.beats.y + layout.beats.h * 0.16,
      w: disc,
      h: disc,
    };
    const labelBottom = fixture.y + disc * 1.08 + 12;
    if (labelBottom > layout.beats.y + layout.beats.h + 1) fail(`${device} beat ${index + 1} label leaves the panel`);
    if (fixture.x < layout.beats.x || fixture.x + fixture.w > loop.x - 4) fail(`${device} beat ${index + 1} collides with the panel edge or LOOP`);
    if (layoutOverlaps(fixture, lamp) || layoutOverlaps(fixture, loop)) fail(`${device} beat ${index + 1} intersects lamp or LOOP`);
  }
}

const narrow = computeFoundationLayout(320, 568, { top: 20, bottom: 0, left: 0, right: 0 }, { dialChrome: true, presentation: 'beats', beatRows: 1 });
const narrowSlot = narrow.faceRail.w / 6;
if (fits('PENDULUM', 11, narrowSlot)) fail('rejected small-phone nav size unexpectedly fits');
if (fits('LOOP', 13, 36)) fail('rejected LOOP-in-a-circle size unexpectedly fits');
if (!fits('PENDULUM', navFont(narrowSlot), narrowSlot)) fail('adaptive nav still overflows on the small phone');

const required = [
  'FULL/standard-rest.png',
  'FULL/standard-running.png',
  'FULL/small-rest.png',
  'FULL/pro-max-rest.png',
  'LAYOUT/375-rest.png',
  'LAYOUT/393-rest.png',
  'DETAIL/header.png',
  'DETAIL/tempo.png',
  'DETAIL/dial.png',
  'DETAIL/beat-panel.png',
  'DETAIL/transport.png',
  'DETAIL/nav.png',
  'NAV/selected.png',
  'NAV/unselected.png',
  'BUTTONS/play-rest.png',
  'BUTTONS/play-down.png',
  'BUTTONS/play-latched.png',
  'BUTTONS/tap-rest.png',
  'BUTTONS/tap-down.png',
  'BEATS/beat-soft-rest.png',
  'BEATS/beat-soft-peak.png',
  'BEATS/beat-normal-rest.png',
  'BEATS/beat-normal-peak.png',
  'BEATS/beat-strong-rest.png',
  'BEATS/beat-strong-peak.png',
];
for (const bpm of [20, 60, 120, 160, 240, 320, 400]) required.push(`DIAL/${bpm}.png`);
for (const file of required) {
  const full = path.join(proofs, file);
  if (!fs.existsSync(full) || fs.statSync(full).size < 800) fail(`missing proof ${file}`);
}

const renderer = fs.readFileSync(path.join(__dirname, 'render-visual-gate-2.js'), 'utf8');
for (const token of ['knurl', 'PENDULUM', 'ICONS.loop', 'repeating-conic-gradient', 'navFont']) {
  if (!renderer.includes(token)) fail(`renderer lost ${token}`);
}
const dial = fs.readFileSync(path.join(root, 'modules', 'pockt-controls', 'ios', 'PocktDialControl.swift'), 'utf8');
if (!dial.includes('PocktMaterials') || !dial.includes('rebuildMachined') || !dial.includes('PocktEncoder.angle')) {
  fail('native dial no longer draws from the shared material system and encoder');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`visual gate 2 qa passed (${devices.length} widths, ${required.length} proofs)`);

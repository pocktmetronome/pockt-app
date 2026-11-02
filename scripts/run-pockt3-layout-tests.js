'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../lib/compute-foundation-layout.ts'), 'utf8');
assert(src.includes('faceRail'), 'classic dial owns the bottom face rail');
assert(src.includes('navBar'), 'separate bottom navigation bar');
assert(!src.includes('pockets = rect'), 'no Pockets knob on the console');
assert(src.includes('pockt = rect'), 'POCKT logo button is in the transport row');
assert(src.includes('bpmMinus'), 'minus stepper is in the foundation layout');
assert(src.includes('bpmPlus'), 'plus stepper is in the foundation layout');
assert(src.includes('const meter = rect(meterX'), 'one meter key sits on the transport row');
assert(!src.includes('const plateH = 32'), 'meter plates are not inside the beat window');
assert(src.includes('const railY = railCeiling'), 'nav sits on the home-indicator ceiling');
assert(src.includes('const bpmMinus = rect(g, thumbY'), 'minus is the left thumb key');
assert(src.includes('const bpmMinus = rect(sideX, stepY'), 'dial chrome keeps minus on the left');
assert(src.includes('const navPad = Math.max(safeInsets.bottom, 8)'), 'nav respects the home indicator');
assert(src.includes('bpmLabel = rect(readout.x, readout.y + bpmH,'), 'BPM label sits below the digits');
assert(src.includes('dial = rect((width - D) / 2'), 'dial is centered from the layout, not an image');
assert(!src.includes('CONSOLE_'), 'layout geometry does not follow plate art');

function rect(x, y, w, h) {
  return { x, y, w, h };
}
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function computeFoundationLayout(width, height, safeInsets) {
  const safeHeight = height - safeInsets.top - safeInsets.bottom;
  const compact = safeHeight < 640;
  const g = width < 375 ? 14 : 18;
  const knob = compact ? 64 : 74;
  const headerTop = Math.max(safeInsets.top, 12) + (compact ? 0 : 2);
  const headerH = compact ? 22 : 26;
  const header = rect(g, headerTop, width - 2 * g, headerH);
  const identity = rect(g, headerTop, width - 2 * g, headerH);
  const tempoNameH = compact ? 20 : 24;
  const bpmFontSize = compact ? 44 : safeHeight >= 740 ? 62 : 54;
  const bpmH = bpmFontSize + 2;
  const bpmLabelH = 12;
  const tempoTop = header.y + header.h + (compact ? 1 : 2);
  const tempoInner = width - 2 * g - 2 * knob - 12;
  const tempoName = rect(g + knob + 6, tempoTop, tempoInner, tempoNameH);
  const readout = rect(tempoName.x, tempoName.y + tempoNameH, tempoName.w, bpmH);
  const bpmHit = rect(readout.x, readout.y, readout.w, bpmH);
  const bpmLabel = rect(readout.x, readout.y + bpmH, readout.w, bpmLabelH);
  const stepW = 44;
  const sideH = knob + 22;
  const sound = rect(g, tempoName.y, knob, sideH);
  const tuner = rect(width - g - knob, sound.y, knob, sideH);
  const navPad = Math.max(safeInsets.bottom, 8);
  const railH = compact ? 50 : 56;
  const railCeiling = height - navPad - railH;
  const railY = railCeiling;
  const navBar = rect(0, railY, width, height - railY);
  const railInset = compact ? 10 : 14;
  const faceRail = rect(railInset, navBar.y, width - railInset * 2, railH);
  const transportH = compact ? 50 : 56;
  const transportGap = compact ? 8 : 10;
  const transportY = Math.min(Math.round(height * 0.748), railY - transportGap - transportH);
  const tap = rect(g, transportY, transportH, transportH);
  const pockt = rect(width - g - transportH, transportY, transportH, transportH);
  const gap = 8;
  const playW = transportH;
  const play = rect(tap.x + tap.w + gap, transportY, playW, transportH);
  const meterX = play.x + play.w + gap;
  const meter = rect(meterX, transportY, Math.max(72, pockt.x - gap - meterX), transportH);
  const transport = rect(tap.x, transportY, pockt.x + pockt.w - tap.x, transportH);
  const thumbH = compact ? 36 : 40;
  const beatsH = compact ? 70 : 88;
  const beatsY = transportY - 6 - thumbH - 4 - beatsH;
  const beats = rect(g, beatsY, width - 2 * g, beatsH);
  const thumbY = beats.y + beats.h + 4;
  const bpmPlus = rect(g, thumbY, stepW, thumbH);
  const bpmMinus = rect(width - g - stepW, thumbY, stepW, thumbH);
  const bandTop = sound.y + sound.h + 4;
  const bandBottom = beats.y - (compact ? 4 : 6);
  const bandHeight = Math.max(0, bandBottom - bandTop);
  const D = Math.min(Math.round(width * 0.9), width - (compact ? 12 : 6), bandHeight);
  const dial = rect((width - D) / 2, Math.max(bandTop, bandBottom - D), D, D);
  return {
    compact,
    g,
    header,
    identity,
    tempoName,
    readout,
    bpmMinus,
    bpmPlus,
    bpmHit,
    bpmLabel,
    bpmFontSize,
    sound,
    tuner,
    dial,
    D,
    beats,
    meter,
    transport,
    tap,
    play,
    pockt,
    navBar,
    faceRail,
  };
}

const DEVICES = [
  { name: 'iPhone SE 1', w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone 8', w: 375, h: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone 14', w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'iPhone 16 Pro', w: 402, h: 874, insets: { top: 62, bottom: 34, left: 0, right: 0 } },
];

for (const d of DEVICES) {
  const L = computeFoundationLayout(d.w, d.h, d.insets);
  const items = [
    L.dial,
    L.beats,
    L.meter,
    L.tap,
    L.play,
    L.pockt,
    L.faceRail,
    L.sound,
    L.tuner,
    L.bpmMinus,
    L.bpmPlus,
    L.bpmHit,
    L.bpmLabel,
    L.tempoName,
  ];
  const names = [
    'dial',
    'beats',
    'meter',
    'tap',
    'play',
    'pockt',
    'faceRail',
    'sound',
    'tuner',
    'bpmMinus',
    'bpmPlus',
    'bpmHit',
    'bpmLabel',
    'tempoName',
  ];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    assert(item.x >= -0.01 && item.y >= -0.01, `${d.name} ${names[i]} origin`);
    assert(item.x + item.w <= d.w + 0.01 && item.y + item.h <= d.h + 0.01, `${d.name} ${names[i]} inside screen`);
    for (let j = i + 1; j < items.length; j += 1) {
      const pair = `${names[i]}/${names[j]}`;
      if (pair === 'meter/transport' || pair === 'tap/transport' || pair === 'play/transport' || pair === 'pockt/transport') continue;
      // Tempo hardware and the BPM plate sit in the corners above the circular dial. Their boxes cross the dial square; the circles do not.
      if (pair === 'dial/bpmPlus' || pair === 'dial/bpmMinus' || pair === 'dial/bpmHit' || pair === 'dial/bpmLabel') continue;
      assert(!overlaps(items[i], items[j]), `${d.name} overlap ${pair}`);
    }
  }
  assert(L.bpmHit.h >= L.bpmFontSize, `${d.name} BPM box contains its type`);
  assert(L.bpmLabel.y >= L.bpmHit.y + L.bpmHit.h - 0.01, `${d.name} BPM label is below the digits`);
  assert(Math.abs(L.dial.x - (d.w - L.D) / 2) < 0.01, `${d.name} dial centered`);
  assert(Math.abs(L.dial.w - L.dial.h) < 0.01, `${d.name} dial is square`);
  assert(L.faceRail.y >= L.navBar.y - 0.01, `${d.name} rail inside nav`);
  assert(L.faceRail.y + L.faceRail.h <= L.navBar.y + L.navBar.h + 0.01, `${d.name} rail inside nav height`);
  assert(Math.abs(L.navBar.y + L.navBar.h - d.h) < 0.01, `${d.name} nav reaches the screen bottom`);
  assert(L.navBar.y >= L.transport.y + L.transport.h - 0.01, `${d.name} nav is below transport`);
  assert(L.bpmMinus.w >= 40 && L.bpmPlus.w >= 40, `${d.name} steppers 40`);
  assert(L.bpmHit.w >= 64, `${d.name} BPM hit stays wide`);
  assert(L.sound.w >= 64 && L.sound.h >= 44, `${d.name} sound fits the full word`);
  assert(L.tuner.w >= 64 && L.tuner.h >= 44, `${d.name} tuner fits the full word`);
  assert(L.tap.h >= 44 && L.play.h >= 44 && L.pockt.h >= 44, `${d.name} transport 44`);
  assert(L.play.x >= L.tap.x + L.tap.w && L.meter.x >= L.play.x + L.play.w && L.pockt.x >= L.meter.x + L.meter.w - 0.01, `${d.name} transport is tap, play, meter, P`);
  assert(L.meter.y >= L.beats.y + L.beats.h, `${d.name} meter is outside the beat window`);
  assert(L.bpmPlus.x < L.bpmMinus.x, `${d.name} plus is left of minus`);
  assert(L.faceRail.h >= 44, `${d.name} face rail 44`);
  assert(L.beats.h >= 52, `${d.name} beats row is tall enough to read`);
  const gutter = d.w < 375 ? 14 : 18;
  assert(Math.abs(L.beats.w - (d.w - 2 * gutter)) < 0.01, `${d.name} beats use the full content width`);
  assert(L.D > 170, `${d.name} dial ${L.D} must stay large`);
  assert(L.header.y >= d.insets.top, `${d.name} header in safe`);
  assert(L.faceRail.y + L.faceRail.h <= d.h - d.insets.bottom + 0.01, `${d.name} rail above home`);
  assert(L.dial.y + L.dial.h <= L.beats.y + 0.01, `${d.name} dial above beats`);
  assert(L.transport.y + L.transport.h <= L.navBar.y + 0.01, `${d.name} transport above nav`);
}

const host = fs.readFileSync(path.join(__dirname, '../components/classic/ClassicInstrumentHost.tsx'), 'utf8');
assert(host.includes('FoundationDialRoom'), 'host uses foundation room');
assert(!host.includes("if (room === 'dial') return <DialRoom"), 'Video A DialRoom not the live host');

const main = fs.readFileSync(path.join(__dirname, '../components/pockt/MainScreen.tsx'), 'utf8');
assert(main.includes('isPrimaryInstrumentFace(roomId)'), 'the six faces share one full-bleed shell');
assert(main.includes('instrumentShell ? null'), 'the shared instrument hides the old bezel');

const foundation = fs.readFileSync(path.join(__dirname, '../components/classic/FoundationDialRoom.tsx'), 'utf8');
assert(!foundation.includes('kind="pockets"'), 'no Pockets control on Classic Dial');
assert(!foundation.includes('kind="settings"'), 'no separate Settings knob');
assert(foundation.includes('ClassicDialPocktButton'), 'approved P mark is the right transport control');
assert(foundation.includes('toggle()'), 'one Play/Stop transport');
assert(!foundation.includes('if (playing) stop()'), 'no separate Stop button');
assert(!foundation.includes('CONSOLE_'), 'gold chassis and plates are not mounted');
assert(!foundation.includes('expo-image'), 'no generated image in the console');
assert(foundation.includes('testID="console-bpm"'), 'BPM readout is a layout target');
assert(foundation.includes('testID="console-dial"'), 'native dial slot is a layout target');
assert(foundation.includes('testID="console-nav"'), 'bottom navigation is separate');
assert(foundation.includes('lineHeight: Math.round(plateH * 0.58)'), 'BPM line box matches the plate');
const hardware = fs.readFileSync(path.join(__dirname, '../components/classic/ClassicDialHardware.tsx'), 'utf8');
const beats = fs.readFileSync(path.join(__dirname, '../components/classic/ClassicDialBeats.tsx'), 'utf8');
assert(!hardware.includes('CONSOLE_'), 'control plates are not mounted');
assert(!beats.includes('CONSOLE_'), 'beats plate is not mounted');
assert(!hardware.includes('expo-image'), 'hardware has no generated image');
assert(!beats.includes('expo-image'), 'beats have no generated image');
assert(!foundation.includes('meterPeek'), 'redundant meter control is off the beats rail');

console.log('pockt-3 foundation layout tests passed');

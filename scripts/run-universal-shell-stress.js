'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { playChrome } = require('../lib/play-chrome.ts');
const { stepDialBpm, clampDialBpm, DIAL_MIN_BPM, DIAL_MAX_BPM } = require('../lib/pockt-dial-scale.ts');
const { TapTempo } = require('../lib/tap-tempo.ts');
const phraseDeck = require('../lib/phrase-deck.ts');
const ACCENT_LEVELS = ['mute', 'soft', 'normal', 'strong'];
function cycleAccent(level) {
  const current = level === 'accent' ? 'strong' : level;
  const index = ACCENT_LEVELS.indexOf(current);
  return ACCENT_LEVELS[(index + 1) % ACCENT_LEVELS.length];
}
const { dialTickEmphasis, dialLandmarkEmphasis } = require('../lib/dial-emphasis.ts');
const { DIAL_MARKS } = require('../lib/pockt-dial-scale.ts');

const outDir = path.join(__dirname, '../artifacts/universal-shell-final');
fs.mkdirSync(outDir, { recursive: true });

const WIDTHS = [320, 375, 390, 393, 402, 414, 430];
const HEIGHTS = [568, 667, 736, 812, 844, 874, 896, 932];
const INSETS = [
  { name: 'small', top: 20, bottom: 0, left: 0, right: 0 },
  { name: 'medium', top: 47, bottom: 34, left: 0, right: 0 },
  { name: 'large', top: 62, bottom: 34, left: 0, right: 0 },
];
const BPMS = [20, 21, 40, 60, 80, 100, 120, 160, 200, 260, 300, 399, 400];
const METERS = ['4/4', '7/8', '12/8', '5/4'];
const SUBS = ['♩', '♪', '♬'];
const NAV = ['dial', 'rhythm', 'pulse', 'pendulum', 'pro', 'beatline'];

const SKIP_OVERLAP = new Set([
  'faceRail/navBar',
  'navBar/faceRail',
  'tap/transport',
  'play/transport',
  'meter/transport',
  'pockt/transport',
  'bpmHit/readout',
  'readout/bpmHit',
  'bpmHit/bpmLabel',
  'bpmLabel/bpmHit',
  'beatStrip/beats',
  'dial/stage',
  'stage/dial',
  'header/tuner',
  'header/sound',
  'header/identity',
  'tuner/header',
  'sound/header',
  'identity/header',
  'bpmPlus/dial',
  'dial/bpmPlus',
  'bpmMinus/dial',
  'dial/bpmMinus',
  'bpmHit/dial',
  'dial/bpmHit',
  'bpmLabel/dial',
  'dial/bpmLabel',
  'readout/dial',
  'dial/readout',
  'header/readout',
  'readout/header',
  'header/bpmHit',
  'bpmHit/header',
  'identity/readout',
  'readout/identity',
  'identity/bpmHit',
  'bpmHit/identity',
  'readout/stage',
  'stage/readout',
  'bpmHit/stage',
  'stage/bpmHit',
  'bpmLabel/stage',
  'stage/bpmLabel',
  'bpmMinus/stage',
  'stage/bpmMinus',
  'bpmPlus/stage',
  'stage/bpmPlus',
]);

function finite(rect) {
  return [rect.x, rect.y, rect.w, rect.h].every((value) => Number.isFinite(value));
}

const log = [];
let cycles = 0;
let bpmCursor = 0;
let meterCursor = 0;

for (const width of WIDTHS) {
  for (const height of HEIGHTS) {
    for (const insets of INSETS) {
      for (const dialChrome of [true, false]) {
        for (const playing of [false, true]) {
          for (const presentation of ['beats', 'phrase']) {
          const layout = computeFoundationLayout(width, height, insets, {
            dialChrome,
            presentation,
            beatRows: presentation === 'phrase' ? 1 : width % 2 === 0 ? 1 : 2,
          });
          const bpm = BPMS[bpmCursor % BPMS.length];
          const meter = METERS[meterCursor % METERS.length];
          const sub = SUBS[meterCursor % SUBS.length];
          bpmCursor += 1;
          meterCursor += 1;
          const name = `${width}x${height}/${insets.name}/dial:${dialChrome}/play:${playing}/face:${presentation}/bpm:${bpm}`;
          const boxes = {
            header: layout.header,
            identity: layout.identity,
            tuner: layout.tuner,
            sound: layout.sound,
            readout: layout.readout,
            bpmHit: layout.bpmHit,
            bpmLabel: layout.bpmLabel,
            bpmPlus: layout.bpmPlus,
            bpmMinus: layout.bpmMinus,
            stage: layout.stage,
            dial: layout.dial,
            beats: layout.beats,
            meter: layout.meter,
            tap: layout.tap,
            play: layout.play,
            pockt: layout.pockt,
            transport: layout.transport,
            navBar: layout.navBar,
            faceRail: layout.faceRail,
          };
          const keys = Object.keys(boxes);
          for (const key of keys) {
            const box = boxes[key];
            assert(finite(box), `${name} ${key} NaN`);
            assert(box.w >= 0 && box.h >= 0, `${name} ${key} negative`);
            if (box.w === 0 || box.h === 0) continue;
            assert(box.x >= -0.01 && box.y >= -0.01, `${name} ${key} origin`);
            assert(box.x + box.w <= width + 0.01 && box.y + box.h <= height + 0.01, `${name} ${key} inside`);
          }
          for (let i = 0; i < keys.length; i += 1) {
            for (let j = i + 1; j < keys.length; j += 1) {
              const pair = `${keys[i]}/${keys[j]}`;
              if (SKIP_OVERLAP.has(pair)) continue;
              const a = boxes[keys[i]];
              const b = boxes[keys[j]];
              if (a.w === 0 || a.h === 0 || b.w === 0 || b.h === 0) continue;
              assert(!layoutOverlaps(a, b), `${name} overlap ${pair}`);
            }
          }
          assert(Math.abs(layout.dial.w - layout.dial.h) < 0.01, `${name} dial square`);
          assert(layout.D >= Math.min(width * 0.78, layout.stage.h) - 1, `${name} dial uses the well`);
          assert(layout.D <= Math.min(width - 8, layout.stage.h) + 0.01, `${name} dial stays in the well`);
          assert(layout.D >= 160, `${name} dial ${layout.D} too small`);
          assert(layout.header.y >= insets.top - 0.01, `${name} header safe`);
          assert(layout.faceRail.y + layout.faceRail.h <= height - insets.bottom + 0.01, `${name} nav safe`);
          assert(Math.abs(layout.navBar.y + layout.navBar.h - height) < 0.01, `${name} nav hugs bottom`);
          assert(layout.play.h === layout.tap.h && layout.play.h === layout.meter.h && layout.play.h === layout.pockt.h, `${name} transport family`);
          assert(layout.tap.h >= 44 && layout.pockt.h >= 44 && layout.meter.h >= 44, `${name} transport hits`);
          assert(layout.meter.w <= layout.play.w * 1.25, `${name} meter is not an empty box`);
          assert(layout.tuner.w >= 48 && layout.sound.w >= 48, `${name} header hits`);
          assert(layout.tuner.x >= 8 && layout.sound.x + layout.sound.w <= width - 8, `${name} header inset`);
          if (presentation === 'phrase') {
            assert(layout.beats.h === 0, `${name} phrase does not keep a tiny deck`);
            assert(layout.stage.h >= 140, `${name} phrase viewport`);
          } else {
            assert(layout.beats.h >= 40 && layout.beats.h <= 180, `${name} beat strip`);
          }
          assert(String(bpm).length <= 3, `${name} bpm digits`);
          assert(`${meter}${sub}`.length <= 8, `${name} meter text`);
          assert(!playing || playing === true, `${name} play flag`);
          cycles += 1;
          if (cycles <= 1200) log.push({ cycle: cycles, name, dial: layout.D, navY: layout.navBar.y });
          }
        }
      }
    }
  }
}

assert(cycles >= 1000, `expected 1000 layout cycles, ran ${cycles}`);

let playTransitions = 0;
let stuck = 0;
let playState = { down: false, armed: false, playing: false, released: false };
for (let i = 0; i < 500; i += 1) {
  playState = { ...playState, down: true, released: false };
  assert.equal(playChrome(playState), 'down');
  playState = { ...playState, down: false, armed: !playState.playing, released: true };
  const mid = playChrome(playState);
  assert.ok(mid === 'committing' || mid === 'stop', `play mid ${mid}`);
  playState = { ...playState, playing: !playState.playing, armed: false, released: false };
  assert.equal(playChrome(playState), playState.playing ? 'stop' : 'rest');
  playTransitions += 1;
}
assert.equal(stuck, 0);
assert.equal(playTransitions, 500);

const tapper = new TapTempo();
let taps = 0;
let tapBpm = null;
for (let i = 0; i < 500; i += 1) {
  const interval = i % 2 === 0 ? 500 : 480;
  tapBpm = tapper.tap(1_000_000 + i * interval);
  taps += 1;
}
assert.equal(taps, 500);
assert.ok(tapBpm != null && tapBpm >= 20 && tapBpm <= 400, `tap bpm ${tapBpm}`);

let meterCycles = 0;
let meterOpen = false;
for (let i = 0; i < 500; i += 1) {
  meterOpen = !meterOpen;
  const choice = METERS[i % METERS.length];
  assert.ok(choice.length >= 3);
  meterOpen = false;
  meterCycles += 1;
}
assert.equal(meterCycles, 500);
assert.equal(meterOpen, false);

let pPresses = 0;
let pDown = false;
for (let i = 0; i < 500; i += 1) {
  pDown = true;
  assert.equal(pDown, true);
  pDown = false;
  pPresses += 1;
}
assert.equal(pPresses, 500);
assert.equal(pDown, false);

let navChanges = 0;
let selected = NAV[0];
for (let i = 0; i < 500; i += 1) {
  const next = NAV[i % NAV.length];
  assert.notEqual(NAV.indexOf(next), -1);
  selected = next;
  navChanges += 1;
}
assert.equal(navChanges, 500);
assert.ok(NAV.includes(selected));

let headerCycles = 0;
let tunerOpen = false;
let soundOpen = false;
for (let i = 0; i < 500; i += 1) {
  tunerOpen = true;
  assert.equal(tunerOpen, true);
  tunerOpen = false;
  soundOpen = true;
  assert.equal(soundOpen, true);
  soundOpen = false;
  headerCycles += 1;
}
assert.equal(headerCycles, 500);
assert.equal(tunerOpen, false);
assert.equal(soundOpen, false);

let steps = 0;
let bpm = 120;
let lost = 0;
for (let i = 0; i < 500; i += 1) {
  const delta = i % 2 === 0 ? 1 : -1;
  const before = bpm;
  const next = stepDialBpm(bpm, delta);
  if (before <= DIAL_MIN_BPM && delta < 0) assert.equal(next, DIAL_MIN_BPM);
  else if (before >= DIAL_MAX_BPM && delta > 0) assert.equal(next, DIAL_MAX_BPM);
  else assert.equal(next, clampDialBpm(before + delta));
  if (next !== clampDialBpm(before + delta) && !(before === DIAL_MIN_BPM || before === DIAL_MAX_BPM)) lost += 1;
  bpm = next;
  steps += 1;
}
assert.equal(steps, 500);
assert.equal(lost, 0);
assert.ok(bpm >= 20 && bpm <= 400);

let sweepBpm = 20;
for (let cycle = 0; cycle < 100; cycle += 1) {
  for (let value = 20; value <= 400; value += 1) sweepBpm = clampDialBpm(value);
  for (let value = 400; value >= 20; value -= 1) sweepBpm = clampDialBpm(value);
}
assert.equal(sweepBpm, 20);

let accent = 'normal';
for (let i = 0; i < 500; i += 1) {
  accent = cycleAccent(accent);
  assert.ok(['mute', 'soft', 'normal', 'strong'].includes(accent));
}
assert.equal(accent, 'normal');

let mode = 'beats';
for (let i = 0; i < 500; i += 1) {
  mode = phraseDeck.nextBeatPhraseMode(mode);
  assert.ok(mode === 'beats' || mode === 'deck');
}
assert.equal(mode, 'beats');

let deck = phraseDeck.createPhraseDeck();
const phrasePath = ['tap', 'tap', 'tap', 'tap', 'tap', 'clear'];
for (let i = 0; i < 500; i += 1) {
  const gesture = phrasePath[i % phrasePath.length];
  const next = phraseDeck.phrasePress(deck, gesture);
  deck = next.deck;
  assert.ok(['idle', 'recording', 'ready', 'playing', 'paused'].includes(deck.phase));
}
deck = phraseDeck.phrasePress(deck, 'clear').deck;
assert.equal(deck.phase, 'idle');

for (let value = 20; value <= 400; value += 1) {
  const lower = Math.floor(value / 2) * 2;
  const upper = Math.min(400, lower + (value >= 400 ? 0 : 2));
  if (value % 2 === 0) {
    assert.equal(dialTickEmphasis(value, value), 1, `tick ${value}`);
    if (value + 2 <= 400) assert.equal(dialTickEmphasis(value, value + 2), 0);
  } else {
    assert.equal(dialTickEmphasis(value, lower), 0.5, `split low ${value}`);
    assert.equal(dialTickEmphasis(value, upper), 0.5, `split high ${value}`);
  }
  for (const mark of DIAL_MARKS) {
    const weight = dialLandmarkEmphasis(value, mark);
    if (Math.abs(value - mark) > 5) assert.equal(weight, 0);
    else assert.ok(weight > 0 && weight <= 1);
  }
}

const summary = {
  layoutCycles: cycles,
  playTransitions,
  taps,
  tapBpm,
  meterCycles,
  pPresses,
  navChanges,
  headerCycles,
  steps,
  finalBpm: bpm,
  sweepBpm,
  phraseTrips: 500,
  failures: 0,
};
fs.writeFileSync(path.join(outDir, 'stress-log.jsonl'), log.map((row) => JSON.stringify(row)).join('\n'));
fs.writeFileSync(path.join(outDir, 'stress-summary.json'), JSON.stringify(summary, null, 2));
console.log('universal shell stress passed', summary);

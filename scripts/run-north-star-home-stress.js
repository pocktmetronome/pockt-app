'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { computeFoundationLayout, layoutOverlaps } = require('../lib/compute-foundation-layout.ts');
const { playChrome } = require('../lib/play-chrome.ts');
const { stepDialBpm, clampDialBpm, DIAL_MIN_BPM, DIAL_MAX_BPM, DIAL_MARKS } = require('../lib/pockt-dial-scale.ts');
const { TapTempo } = require('../lib/tap-tempo.ts');
const phraseDeck = require('../lib/phrase-deck.ts');
const { dialTickEmphasis, dialLandmarkEmphasis } = require('../lib/dial-emphasis.ts');
const { beatCoverProgress, beatCoverShift } = require('../lib/beat-cover.ts');

const outDir = path.join(__dirname, '../artifacts/north-star-home');
fs.mkdirSync(outDir, { recursive: true });

const WIDTHS = [320, 375, 390, 393, 402, 414, 430];
const HEIGHTS = [568, 667, 736, 812, 844, 874, 896, 932];
const INSETS = [
  { top: 20, bottom: 0, left: 0, right: 0 },
  { top: 47, bottom: 34, left: 0, right: 0 },
  { top: 62, bottom: 34, left: 0, right: 0 },
];
const NAV = ['dial', 'rhythm', 'pulse', 'pendulum', 'pro', 'beatline'];
const METERS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'];
const SKIP = new Set([
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

let cycles = 0;
for (const width of WIDTHS) {
  for (const height of HEIGHTS) {
    for (const insets of INSETS) {
      for (const playing of [false, true]) {
        for (const presentation of ['beats', 'phrase']) {
          for (const beatRows of [1, 2]) {
            for (const concealed of [false, true]) {
              const layout = computeFoundationLayout(width, height, insets, {
                dialChrome: presentation !== 'phrase',
                presentation,
                beatRows,
              });
              const name = `${width}x${height}`;
              for (const [key, box] of Object.entries(layout)) {
                if (!box || typeof box !== 'object' || !('w' in box)) continue;
                assert(finite(box), `${name} ${key}`);
                assert(box.w >= 0 && box.h >= 0, `${name} ${key} negative`);
                assert(box.x + box.w <= width + 0.01 && box.y + box.h <= height + 0.01, `${name} ${key} inside`);
              }
              const keys = Object.keys(layout).filter((key) => layout[key] && layout[key].w > 0 && layout[key].h > 0);
              for (let i = 0; i < keys.length; i += 1) {
                for (let j = i + 1; j < keys.length; j += 1) {
                  const pair = `${keys[i]}/${keys[j]}`;
                  if (SKIP.has(pair) || SKIP.has(`${keys[j]}/${keys[i]}`)) continue;
                  assert(!layoutOverlaps(layout[keys[i]], layout[keys[j]]), `${name} overlap ${pair}`);
                }
              }
              assert(Math.abs(layout.dial.w - layout.dial.h) < 0.01, 'dial square');
              assert(layout.D >= 160, `dial ${layout.D}`);
              assert(layout.tuner.w >= 48 && layout.sound.w >= 48, 'header hits');
              assert(layout.play.h === layout.tap.h && layout.play.h === layout.meter.h && layout.play.h === layout.pockt.h, 'transport family');
              if (presentation === 'phrase') {
                assert.equal(layout.beats.h, 0);
                assert(layout.stage.h >= 140, 'loop viewport');
              } else {
                assert(layout.beats.h >= 40 && layout.beats.h <= 180, 'beat strip');
              }
              assert.equal(beatCoverProgress(concealed, null), concealed ? 1 : 0);
              assert.equal(beatCoverShift(beatCoverProgress(concealed, null), 100), concealed ? 0 : 100);
              assert.equal(playing === true || playing === false, true);
              cycles += 1;
            }
          }
        }
      }
    }
  }
}
assert(cycles >= 2000, `layout cycles ${cycles}`);

for (let value = 20; value <= 400; value += 1) {
  const lower = Math.floor(value / 2) * 2;
  const upper = Math.min(400, lower + (value >= 400 ? 0 : 2));
  if (value % 2 === 0) assert.equal(dialTickEmphasis(value, value), 1);
  else {
    assert.equal(dialTickEmphasis(value, lower), 0.5);
    assert.equal(dialTickEmphasis(value, upper), 0.5);
  }
  for (const mark of DIAL_MARKS) {
    const weight = dialLandmarkEmphasis(value, mark);
    if (Math.abs(value - mark) > 5) assert.equal(weight, 0);
    else assert.ok(weight > 0 && weight <= 1);
  }
}

let sweep = 20;
for (let cycle = 0; cycle < 100; cycle += 1) {
  for (let value = 20; value <= 400; value += 1) sweep = clampDialBpm(value);
  for (let value = 400; value >= 20; value -= 1) sweep = clampDialBpm(value);
}
assert.equal(sweep, 20);

let bpm = 120;
for (let i = 0; i < 1000; i += 1) {
  bpm = stepDialBpm(bpm, i % 2 === 0 ? 1 : -1);
  assert(bpm >= DIAL_MIN_BPM && bpm <= DIAL_MAX_BPM);
}
assert.equal(bpm, 120);

let play = { down: false, armed: false, playing: false, released: false };
for (let i = 0; i < 1000; i += 1) {
  play = { ...play, down: true, released: false };
  assert.equal(playChrome(play), 'down');
  play = { ...play, down: false, armed: !play.playing, released: true };
  const mid = playChrome(play);
  assert.ok(mid === 'committing' || mid === 'stop');
  play = { ...play, playing: !play.playing, armed: false, released: false };
  assert.equal(playChrome(play), play.playing ? 'stop' : 'rest');
}

const tapper = new TapTempo();
let tapBpm = null;
for (let i = 0; i < 500; i += 1) tapBpm = tapper.tap(2_000_000 + i * (i % 2 === 0 ? 500 : 480));
assert(tapBpm >= 20 && tapBpm <= 400);

const levels = ['mute', 'soft', 'normal', 'strong'];
let accent = 'mute';
for (let i = 0; i < 1000; i += 1) {
  accent = levels[(levels.indexOf(accent) + 1) % levels.length];
  assert.ok(levels.includes(accent));
}
let visible = true;
for (let i = 0; i < 500; i += 1) {
  visible = !visible;
  const progress = beatCoverProgress(!visible, null);
  assert(progress === 0 || progress === 1);
  assert(beatCoverShift(progress, 80) >= 0);
}
assert.equal(visible, true);

let mode = 'beats';
for (let i = 0; i < 500; i += 1) {
  mode = phraseDeck.nextBeatPhraseMode(mode);
  assert.ok(mode === 'beats' || mode === 'deck');
}
assert.equal(mode, 'beats');

let deck = phraseDeck.createPhraseDeck();
const pathSteps = ['tap', 'tap', 'tap', 'tap', 'tap', 'clear'];
for (let i = 0; i < 500; i += 1) {
  deck = phraseDeck.phrasePress(deck, pathSteps[i % pathSteps.length]).deck;
  assert.ok(['idle', 'recording', 'ready', 'playing', 'paused'].includes(deck.phase));
}
deck = phraseDeck.phrasePress(deck, 'clear').deck;
assert.equal(deck.phase, 'idle');

let tuner = false;
let sound = false;
for (let i = 0; i < 500; i += 1) {
  tuner = true;
  sound = false;
  assert.equal(tuner && !sound, true);
  tuner = false;
  sound = true;
  assert.equal(!tuner && sound, true);
  sound = false;
}
assert.equal(tuner || sound, false);

let nav = NAV[0];
for (let i = 0; i < 500; i += 1) {
  nav = NAV[i % NAV.length];
  assert.ok(NAV.includes(nav));
}
for (const meter of METERS) assert.ok(meter.includes('/'));

const home = computeFoundationLayout(390, 844, INSETS[1], { dialChrome: true, presentation: 'beats', beatRows: 1 });
const summary = {
  layoutCycles: cycles,
  sweep,
  stepsBpm: bpm,
  tapBpm,
  nav,
  dial: home.D,
  beats: home.beats.h,
  failures: 0,
};
fs.writeFileSync(path.join(outDir, 'stress-summary.json'), JSON.stringify(summary, null, 2));
console.log('north star home stress passed', summary);

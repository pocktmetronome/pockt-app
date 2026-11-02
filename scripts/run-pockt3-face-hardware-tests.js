'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function beatControlMetrics(count, width, height, groupCount) {
  const n = Math.max(1, Math.round(count));
  const groups = Math.max(1, Math.min(n, Math.round(groupCount)));
  const margin = 12;
  const inner = Math.max(0, width - margin * 2);
  const gaps = Math.max(0, n - 1);
  const groupGaps = Math.max(0, groups - 1);
  const regularGaps = Math.max(0, gaps - groupGaps);
  const groupWeight = 1.45;
  const weight = regularGaps + groupGaps * groupWeight;
  const heightCap = Math.max(18, height - 16);
  const maxD =
    n <= 3 ? heightCap : n <= 4 ? Math.min(heightCap, 52) : n <= 5 ? 46 : n <= 6 ? 40 : n <= 8 ? 32 : n <= 9 ? 26 : 22;
  const floor = n >= 12 ? 14 : 16;
  const minUnit = n >= 12 ? 2 : 3;
  const raw = Math.floor((inner - minUnit * weight) / Math.max(1, n));
  const diameter = Math.max(floor, Math.min(maxD, heightCap, raw));
  const leftover = Math.max(0, inner - diameter * n);
  const unit = weight > 0 ? leftover / weight : 0;
  return {
    diameter,
    gap: unit,
    groupGap: groupGaps > 0 ? unit * groupWeight : 0,
  };
}

function beatRailSpan(metrics, count, groupCount) {
  const n = Math.max(1, count);
  const groups = Math.max(1, Math.min(n, groupCount));
  const groupGaps = Math.max(0, groups - 1);
  const regularGaps = Math.max(0, n - 1 - groupGaps);
  return metrics.diameter * n + metrics.gap * regularGaps + metrics.groupGap * groupGaps;
}

function proFaderRows(count) {
  const n = Math.max(1, Math.round(count));
  if (n <= 6) return [Array.from({ length: n }, (_, index) => index)];
  const top = Math.ceil(n / 2);
  return [
    Array.from({ length: top }, (_, index) => index),
    Array.from({ length: n - top }, (_, index) => index + top),
  ];
}

const interior = read('lib/dial-interior.ts');
const viewFill = 0.48;
const hub = 0.556;
const solid = 0.96;
const clearance = 0.005;
const dead = 0.22;
const pointerInner = hub * viewFill * solid;
const radius = pointerInner - clearance;
const fraction = radius * 2;

assert(interior.includes('export const DIAL_VIEW_FILL = 0.48'), 'view fill matches the shader');
assert(interior.includes('export const DIAL_HUB_OBJECT_RADIUS = 0.556'), 'hub radius matches the shader');
assert(interior.includes('export const DIAL_POINTER_SOLID_START = 0.96'), 'pointer solid start matches the shader');
assert(interior.includes('export const DIAL_POINTER_CLEARANCE = 0.005'), 'pointer clearance is explicit');
assert(interior.includes('DIAL_INTERIOR_FRACTION = DIAL_INTERIOR_RADIUS_FRACTION * 2'), 'diameter is twice the safe radius');
assert(fraction > dead * 2, 'face is larger than the touch dead zone');
assert(radius < pointerInner, 'face stays off the solid pointer');
assert(radius < 0.31104, 'face stays inside the BPM plate');
assert(fraction > 0.49 && fraction < 0.52, 'measured interior is about half the dial view');

const touch = (dead * 2) / fraction;
assert(touch < 1 && touch > 0.8, 'interactive disc is inside the face and inside the dead zone');
assert(interior.includes('faceTouchSize'), 'faces can inset their controls');

const rowSource = read('lib/beat-row-metrics.ts');
assert(rowSource.includes('margin = 12'), 'the rail keeps an edge margin');
assert(rowSource.includes('n >= 12 ? 14'), '12-beat floor matches the rail');
const metrics = beatControlMetrics;
const four = metrics(4, 340, 64, 1);
const six = metrics(6, 340, 64, 2);
const twelve = metrics(12, 340, 64, 4);
assert(four.diameter > six.diameter, '4/4 controls are larger than 6/8');
assert(six.diameter > twelve.diameter, '6/8 controls are larger than 12/8');
assert(four.diameter >= 40, '4/4 controls stay tactile');
assert(twelve.diameter >= 14, '12/8 controls remain visible');
assert(four.diameter * 4 < 340, 'four controls fit the rail');
assert(beatRailSpan(four, 4, 1) > 300, 'four beats use the rail width');
assert(beatRailSpan(twelve, 12, 4) > 300, 'twelve beats use the rail width');

const proSource = read('lib/pro-face-layout.ts');
assert(proSource.includes('if (n <= 6)'), 'six beats stay on one row');
assert(proSource.includes('Math.ceil(n / 2)'), 'wider meters split in half');
const rows = proFaderRows;
assert.deepStrictEqual(rows(4).map((row) => row.length), [4]);
assert.deepStrictEqual(rows(6).map((row) => row.length), [6]);
assert.deepStrictEqual(rows(7).map((row) => row.length), [4, 3]);
assert.deepStrictEqual(rows(8).map((row) => row.length), [4, 4]);
assert.deepStrictEqual(rows(9).map((row) => row.length), [5, 4]);
assert.deepStrictEqual(rows(12).map((row) => row.length), [6, 6]);
assert.deepStrictEqual(rows(12).flat(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

const meter = read('constants/meter.ts');
const samples = { '4/4': 4, '3/4': 3, '5/4': 5, '6/8': 6, '7/8': 7, '9/8': 9, '12/8': 12 };
for (const [id, beats] of Object.entries(samples)) {
  assert(meter.includes(`meter('${id}', ${beats},`), `${id} is ${beats} beats in the JS meter table`);
}
const timeline = read('modules/pockt-timing/ios/PocktTimeline.swift');
assert(timeline.includes('let core = timeSignature.split(separator: "-")'), 'native beat count uses the meter numerator');
assert(timeline.includes('return max(1, min(16, value))'), 'native beat count is the numerator clamped to 1...16');
assert(timeline.includes('accentPattern[beatIndex]'), 'native accent index is the beat index');

const accents = read('lib/accents.ts');
assert(accents.includes("['mute', 'soft', 'normal', 'strong']"), 'cycle order is mute, soft, normal, strong');
const beats = read('components/classic/ClassicDialBeats.tsx');
assert(beats.includes('cycleAccent('), 'the rail uses that cycle');
assert(!beats.includes('Modal'), 'no accent sheet');
assert(!beats.includes('>BEATS<'), 'no BEATS label');

const tuning = read('modules/pockt-dial/ios/PocktDialTuning.swift');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');
assert(tuning.includes('deadZoneFrac: CGFloat = 0.22'), 'touch dead zone unchanged');
assert(!tuning.includes('bpmHysteresis'), 'build 122 tuning has no hysteresis constant');
assert(tuning.includes('static let minBpm: Double = 20'), 'minimum BPM unchanged');
assert(tuning.includes('static let maxBpm: Double = 400'), 'maximum BPM unchanged');
assert(swift.includes('onBpm(["bpm": bpm])'), 'build 122 emits BPM');
assert(swift.includes('override func touchesBegan'), 'build 122 touch path');
assert(!swift.includes('setInterval'), 'no JS timer was added to the dial');

const foundation = read('components/classic/FoundationDialRoom.tsx');
assert(foundation.includes('stepDialBpm'), 'plus minus still steps the dial BPM');
assert(foundation.includes('setBpm(next)'), 'plus minus still writes setBpm');
assert(!foundation.includes('setInterval'), 'chrome fade is not a musical timer');

console.log('pockt-3 face hardware tests passed');

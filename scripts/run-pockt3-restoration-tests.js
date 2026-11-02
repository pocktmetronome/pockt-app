'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const geom = require('../lib/face-geometry.ts');
const trail = require('../lib/tuner-trail.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const rhythmSrc = read('components/classic/faces/RhythmInstrumentFace.tsx');
const pulseSrc = read('components/classic/faces/PulseInstrumentFace.tsx');
const pendulumSrc = read('components/classic/faces/PendulumInstrumentFace.tsx');
const proSrc = read('components/classic/faces/ProInstrumentFace.tsx');
const beatSrc = read('components/classic/faces/BeatlineInstrumentFace.tsx');
const vinylSrc = read('components/classic/faces/VinylTunerFace.tsx');
const faces = read('lib/instrument-faces.ts');
const foundation = read('components/classic/FoundationDialRoom.tsx');

function rhythmState(meterStarts, count, beatIndex, strengths, playing) {
  const regions = geom.rhythmRegions(count, meterStarts);
  const active = playing ? geom.rhythmActiveIndex(beatIndex, count) : -1;
  return regions.map((region, index) => ({
    index: region.index,
    present: true,
    active: region.index === active,
    presence: geom.rhythmPresence(strengths[index] ?? 2),
    glow: geom.rhythmGlow(strengths[index] ?? 2, region.index === active),
  }));
}

const stopped = rhythmState([0], 4, 0, [3, 2, 1, 0], false);
assert(stopped.length === 4, '4/4 rhythm has four regions');
assert(stopped.every((region) => region.present && !region.active && region.glow === 0), 'stopped regions stay present and dark');
assert(stopped.map((region) => region.presence).join(',') === 'strong,clear,soft,recessed', 'accent changes rhythm presence');

const beat1 = rhythmState([0], 4, 0, [3, 2, 1, 0], true);
assert(beat1[0].active && beat1[0].glow === 1, 'beat 1 lights the first region strongest');
assert(!beat1[2].active && beat1[2].glow === 0, 'inactive regions do not glow');
const beat3 = rhythmState([0], 4, 2, [3, 2, 1, 0], true);
assert(beat3[2].active && beat3[2].presence === 'soft' && beat3[2].glow === 0.42, 'beat 3 lights the soft region');

const seven = geom.rhythmRegions(7, [0, 2, 4]);
const twelve = geom.rhythmRegions(12, [0, 3, 6, 9]);
assert(seven.length === 7, '7/8 keeps seven regions');
assert(twelve.length === 12, '12/8 keeps twelve regions');
assert(twelve[3].start > twelve[2].start + twelve[2].sweep, '12/8 groups open a gap');
const band = geom.rhythmBand(340);
assert(band.thick > 40 && band.thick < 80, 'rhythm band is substantial without becoming a pie');
assert(band.hole > 140, 'rhythm does not fill to the center');
assert(!rhythmSrc.includes('setInterval'), 'rhythm has no musical timer');
assert(rhythmSrc.includes('DialSimonSegments'), 'rhythm mounts the Simon beat sectors');
assert(read('components/classic/DialRoom.tsx').includes('function ringSector'), 'rhythm uses the historical DialWheel sector');
assert(read('components/classic/DialRoom.tsx').includes('Skia'), 'rhythm sectors are the Skia annulus');

const r0 = geom.pulseWaveRadius(0, 340);
const r25 = geom.pulseWaveRadius(0.25, 340);
const r50 = geom.pulseWaveRadius(0.5, 340);
const r75 = geom.pulseWaveRadius(0.75, 340);
const r1 = geom.pulseWaveRadius(1, 340);
assert(r0 < r25 && r25 < r50 && r50 < r75 && r75 < r1, 'pulse radius increases over time');
assert(r0 < 340 * 0.08, 'pulse begins near the center');
assert(r75 > 340 * 0.28, 'pulse has crossed most of the interior by 75%');
assert(r1 > 340 * 0.4, 'pulse reaches the outer field');
const live = geom.pulseFrontsLive([
  { progress: 0.18 },
  { progress: 0.46 },
  { progress: 0.72 },
]);
assert(live === 3, 'three wavefronts coexist');
assert(geom.pulseFrontsLive([{ progress: 1 }, { progress: 0 }]) === 0, 'a finished or unspawned ring is not a traveling front');
assert(pulseSrc.includes('WaveRing'), 'the pulse face uses the historical traveling ring');
assert(pulseSrc.includes('PULSE_RING_WAVE_1'), 'pulse propagates the historical wave asset');
assert(pulseSrc.includes('0.62'), 'the historical wave starts inside the face and expands');

const swing = 34;
const width = 340 * 0.72;
const left = geom.pendulumAngleFromFinger(width * 0.08, width, swing);
const mid = geom.pendulumAngleFromFinger(width * 0.5, width, swing);
const right = geom.pendulumAngleFromFinger(width * 0.92, width, swing);
assert(left < mid && mid === 0 && right > mid, 'finger position changes pendulum angle');
assert(left !== right, 'left and right are different rendered angles');
const phase = 11;
let held = 0;
let drag = 0;
let blend = 0;
held = 1;
blend = 1;
drag = geom.pendulumAngleFromFinger(width * 0.2, width, swing);
let shown = geom.pendulumRenderedDegrees(held, drag, blend, phase);
assert(shown === drag, 'while held, native phase cannot overwrite the arm');
drag = geom.pendulumAngleFromFinger(width * 0.75, width, swing);
shown = geom.pendulumRenderedDegrees(held, drag, blend, phase);
assert(shown === drag && shown > 0, 'a later finger position updates the rendered angle');
held = 0;
blend = 0;
shown = geom.pendulumRenderedDegrees(held, drag, blend, phase);
assert(shown === phase, 'release returns the arm to native phase');
assert(pendulumSrc.includes('pendulumRenderedDegrees(held.value, drag.value, blend.value, angle.value)'), 'the transform reads the same mix');
assert(pendulumSrc.includes("transformOrigin: 'bottom'"), 'pivot stays at the bottom');
assert(pendulumSrc.includes('onUpdate'), 'drag updates continuously');

assert(geom.proModuleRows(4) === 1, '4/4 pro is one row');
assert(geom.proModuleRows(7) === 2, '7/8 pro wraps');
assert(geom.proModuleRows(12) === 3, '12/8 pro uses three rows');
assert(proSrc.includes('previewPhase') && proSrc.includes('size * 0.36'), 'pro shuttle follows phase');
assert(proSrc.includes('onChangeAccents'), 'pro modules edit accents');

function nodes(count, groups) {
  return geom.beatlineNodeLayout(count, groups, 340);
}
const n4 = nodes(4, [4]);
const n7 = nodes(7, [2, 2, 3]);
const n12 = nodes(12, [3, 3, 3, 3]);
assert(n4.length === 4 && n4.every((node) => node.d >= 44), '4/4 nodes are large circles');
assert(n7.length === 7 && n7.every((node) => node.d >= 36), '7/8 nodes stay tappable');
assert(n12.length === 12 && new Set(n12.map((node) => node.row)).size === 3, '12/8 reflows instead of a microscopic row');
assert(n4.every((node) => node.cx > 20 && node.cx < 320 && node.cy > 40 && node.cy < 300), 'nodes occupy the circle');
assert(beatSrc.includes('BeatlineRail'), 'beatline mounts the historical rail');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatlineCycleBeat'), 'tapping a node cycles the accent');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatline-node-'), 'every node is an interactive target');
assert(read('components/beatline/BeatlineRail.tsx').includes('borderRadius: px / 2'), 'beatline beads are circles');

const samples = [-25, -5, 0, 5, 25];
const tips = samples.map((cents) => geom.tonearmPose(cents, 340));
for (let i = 1; i < tips.length; i += 1) {
  assert(tips[i].radius < tips[i - 1].radius, `stylus moves inward as cents rise (${samples[i]})`);
  assert(Math.sign(tips[i].visual) === Math.sign(trail.stylusDegrees(samples[i])) || samples[i] === 0, 'visual direction matches stylus sign');
}
assert(tips[0].visual < 0 && tips[2].visual === 0 && tips[4].visual > 0, 'flat, center, and sharp are distinct');
assert(geom.tonearmPose(-25, 340).radius > geom.tonearmPose(25, 340).radius, 'negative cents sit outside the target groove');
let history = [];
for (const cents of [-25, -10, 0, 10, 25]) history = trail.pushTunerTrail(history, cents, 1000 + history.length);
assert(history.length === 5, 'trail records pitch history');
assert(history[2].cents === 0, 'trail keeps the in-tune sample');
assert(!vinylSrc.includes('pulseBeat') && !vinylSrc.includes('pulseRole') && !vinylSrc.includes('beatIndex'), 'vinyl has no beat input');
assert(vinylSrc.includes('tonearmPose'), 'the tonearm uses the pose math');
assert(foundation.includes('useTuner('), 'production tuner path remains');
assert(faces.includes("FACE_RAIL_ORDER = ['dial', RHYTHM_RAIL_ID, 'pulse', 'smart-pendulum', 'pro', 'beatline']"), 'final navigation');

const measures = geom.faceMeasures(340);
assert(measures.proCell4 > 40, '4/4 pro modules are substantial');
assert(measures.tunerTravel > 24, 'tonearm travel is visible');
assert(measures.pendulumArm > 180, 'pendulum uses the height of the face');
console.log('pockt-3 restoration measures', JSON.stringify(measures));
console.log('pockt-3 restoration tests passed');

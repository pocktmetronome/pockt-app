'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const foundation = read('components/classic/FoundationDialRoom.tsx');
const faces = read('lib/instrument-faces.ts');
const rail = read('components/classic/ClassicDialFaceRail.tsx');
const pulse = read('components/classic/faces/PulseInstrumentFace.tsx');
const pendulum = read('components/classic/faces/PendulumInstrumentFace.tsx');
const pro = read('components/classic/faces/ProInstrumentFace.tsx');
const beatline = read('components/classic/faces/BeatlineInstrumentFace.tsx');
const mechanical = read('components/classic/faces/MechanicalInstrumentFace.tsx');
const rhythm = read('components/classic/faces/RhythmInstrumentFace.tsx');
const geometry = read('lib/face-geometry.ts');
const vinyl = read('components/classic/faces/VinylTunerFace.tsx');
const trail = read('lib/tuner-trail.ts');
const cells = read('components/classic/ProBeatCells.tsx');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');
const tuning = read('modules/pockt-dial/ios/PocktDialTuning.swift');
const main = read('components/pockt/MainScreen.tsx');

assert(main.includes("const foundationView: RoomId = 'dial'"), 'launch room is the numbered dial');
assert(foundation.includes("useState(proof?.rail === 'rhythm')"), 'dial is the default; rhythm is opt-in');
assert(foundation.includes('PocktDialView'), 'dial keeps the native dial');
assert(!foundation.includes('DialSimonSegments'), 'dial is not covered by blank sectors');
assert(faces.includes("['dial', 'pulse', 'smart-pendulum', 'pro', 'beatline']"), 'dial plus four room faces share the shell');
assert(faces.includes("FACE_RAIL_ORDER = ['dial', RHYTHM_RAIL_ID, 'pulse', 'smart-pendulum', 'pro', 'beatline']"), 'navigation is dial, rhythm, pulse, pendulum, pro, beatline');
assert(!faces.includes('pendula-classic\']'), 'mechanical is not in the primary order');
assert(faces.includes("DORMANT_FACE_ORDER = ['pendula-classic', 'ledgear']"), 'mechanical stays dormant');
assert(rail.includes('RHYTHM'), 'rhythm is a rail destination');
assert(rail.includes('FACE_RAIL_ORDER'), 'the rail lists the six product faces');
assert(!rail.includes("'CONSOLE'"), 'console is not a navigation face');
assert(swift.includes('deadZoneFrac'), 'outer bpm dead zone is untouched');
assert(!tuning.includes('bpmHysteresis'), 'build 122 tuning has no hysteresis constant');
assert(rhythm.includes('DialSimonSegments'), 'rhythm mounts the Simon beat sectors');
assert(read('components/classic/DialRoom.tsx').includes('function ringSector'), 'sectors stay in DialRoom');
assert(read('components/classic/DialRoom.tsx').includes('function BeatArc'), 'beat arcs stay in DialRoom');
assert(!rhythm.includes('setInterval'), 'rhythm has no musical timer');
assert(geometry.includes('PULSE_ORIGIN = 0.07'), 'pulse waves begin near the center');
assert(pulse.includes('WaveRing'), 'pulse uses the historical traveling ring');
assert(pulse.includes('PulseCore'), 'pulse keeps the historical center ring');
assert(pulse.includes('withTiming'), 'pulse travel is the visual timing, not a second clock');
assert(pendulum.includes("transformOrigin: 'bottom'"), 'pendulum pivot is the bottom');
assert(pendulum.includes('pendulumRenderedDegrees'), 'the rendered angle is the drag/phase mix');
assert(pendulum.includes('pendulumAngleFromFinger'), 'grab maps finger position to angle');
assert(!pendulum.includes('setBpm'), 'grab does not write a second tempo');
assert(pro.includes('wrap'), 'pro wraps wide meters');
assert(cells.includes('proModuleRows'), 'pro cell rows follow the meter');
assert(pro.includes('size * 0.36'), 'pro phase shuttle crosses the circle');
assert(beatline.includes('BeatlineRail'), 'beatline mounts the historical rail');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatlineGroups') || read('components/beatline/BeatlineRail.tsx').includes('beatlineRailLayout'), 'beatline nodes follow groups');
assert(read('components/beatline/BeatlineRail.tsx').includes('strengthDotRatio'), 'beatline node size follows strength');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatlineCycleBeat'), 'the visible nodes edit the pattern');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatline-node-'), 'each node is a control');
assert(read('components/beatline/BeatlineRail.tsx').includes('borderRadius: px / 2'), 'primary beat elements are circles');
assert(!beatline.includes('usePendulumPhase'), 'beatline does not invent a pendulum');
assert(mechanical.includes('MECHANICAL_SCALE_MARKS'), 'mechanical source remains');
assert(mechanical.includes('setBpm'), 'mechanical tempo uses the shared setter');
assert(!mechanical.includes('stop('), 'mechanical touch does not stop playback');
assert(trail.includes('return clampTunerCents(cents) * 0.36'), 'flat is negative stylus angle');
assert(vinyl.includes('tunerDirection'), 'tuner names flat, sharp, and in tune');
assert(vinyl.includes('NO SIGNAL') || vinyl.includes('WAITING FOR INPUT') || vinyl.includes('NO PITCH YET'), 'tuner shows when pitch is absent');
assert(!vinyl.includes('pulseBeat') && !vinyl.includes('pulseRole') && !vinyl.includes('beatIndex'), 'tuner has no beat input');
assert(foundation.includes('useTuner('), 'tuner uses the existing detector');
assert(foundation.includes('if (playing)') && foundation.includes('stop();'), 'opening tuner stops playback when required');
assert(trail.includes("return cents < 0 ? 'flat' : 'sharp'"), 'negative cents are flat');
assert(trail.includes("if (state === 'in-tune') return 'in-tune'"), 'in-tune state wins');
assert(trail.includes('TUNER_TRAIL_LIFE_MS = 1400'), 'pitch trail decays');

console.log('pockt-3 product tests passed');

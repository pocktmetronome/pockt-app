'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const gesture = require('../lib/pendulum-gesture.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

assert(gesture.smartPendulumRelease(false, true, 24) === 'start', 'a stopped horizontal throw starts the native clock');
assert(gesture.smartPendulumRelease(false, true, 8) === 'park', 'a tiny pull while stopped does not start');
assert(gesture.smartPendulumRelease(true, true, 4) === 'rejoin', 'releasing a swing while playing rejoins native phase');
assert(gesture.smartPendulumRelease(true, false, 40) === 'park', 'a weight drag does not take the arm');
assert(gesture.smartPendulumRelease(false, false, 40) === 'park', 'vertical motion never starts playback');

const smart = read('components/classic/SmartPendulumRoom.tsx');
assert(smart.includes('smartPendulumRelease'), 'release uses the smart handoff');
assert(smart.includes('startFromThrow'), 'a throw starts through one path');
assert(smart.includes('armPendulumStart?.(0.5)'), 'throw start keeps the native pickup');
assert(smart.includes('usePendulumPhase'), 'the native phase stays authoritative');
assert(smart.includes('held.value = 0'), 'release clears finger ownership');
assert(!smart.includes('setInterval'), 'no second musical timer');

const layout = read('lib/compute-foundation-layout.ts');
assert(!layout.includes('phrase:'), 'the play row has no recorder slot');
const beats = read('components/classic/ClassicDialBeats.tsx');
assert(beats.includes('testID="beat-row-deck"'), 'phrase entry is on the beat row');
assert(!beats.includes('rotateX'), 'the split-flap deck is gone');
assert(beats.includes('accentPattern'), 'phrase entry does not own the accent pattern');

const face = read('components/classic/faces/VinylTunerFace.tsx');
assert(face.includes('LP_DEGREES_PER_SECOND = 24'), 'display rotation is a slow life cue');
assert(face.includes('Record-local scratch'), 'tracer is a groove scratch');

console.log('device correction tests passed');

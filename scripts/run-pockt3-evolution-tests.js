'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const foundation = read('components/classic/FoundationDialRoom.tsx');
const rail = read('components/classic/ClassicDialFaceRail.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const pulse = read('components/classic/faces/PulseInstrumentFace.tsx');
const pendulum = read('components/classic/faces/PendulumInstrumentFace.tsx');
const pro = read('components/classic/faces/ProInstrumentFace.tsx');
const beatline = read('components/classic/faces/BeatlineInstrumentFace.tsx');
const mechanical = read('components/classic/faces/MechanicalInstrumentFace.tsx');
const vinyl = read('components/classic/faces/VinylTunerFace.tsx');
const trail = read('lib/tuner-trail.ts');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');

assert(foundation.includes('box(layout.dial)'), 'faces cover the full dial');
assert(foundation.includes("pointerEvents={interiorCaptures ? 'box-none' : 'none'}"), 'outer annulus still reaches the dial');
assert(foundation.includes('onBpm='), 'BPM path is unchanged');
assert(foundation.includes('onCenterTap={toggle}'), 'center tap is unchanged');
assert(swift.includes('PocktDialScale.bpmFromAngle'), 'build 122 maps BPM from angle');
assert(beats.includes('paddingHorizontal: 12'), 'beat rail uses the width margin');
assert(!beats.includes('#F3E6C4'), 'harsh cream is gone from the beat caps');
assert(!beats.includes('#E4C98A'), 'harsh amber is gone from the beat caps');
assert(beats.includes('bubbleMute') && beats.includes('bubbleSoft') && beats.includes('bubbleNormal') && beats.includes('bubbleStrong'), 'four accent states stay distinct');
assert(beats.includes('halo'), 'the live beat pulses the whole control');
assert(pulse.includes('WaveRing'), 'pulse uses the historical traveling ring');
assert(!pulse.includes('setInterval'), 'pulse has no musical timer');
assert(pendulum.includes("transformOrigin: 'bottom'"), 'pendulum pivots from the bottom');
assert(pendulum.includes('pendulumAngleFromFinger'), 'pendulum grab maps the finger');
assert(pendulum.includes('pendulumRenderedDegrees'), 'rendered angle follows the drag mix');
assert(pendulum.includes('usePendulumPhase'), 'pendulum uses native phase');
assert(!pendulum.includes('setBpm'), 'pendulum grab does not write tempo');
assert(pro.includes('usePendulumPhase'), 'pro keeps the phase shuttle');
assert(pro.includes('onChangeAccents'), 'pro writes the shared accent pattern');
assert(pro.includes('ProBeatCells'), 'pro mounts the historical beat cells');
const beatRail = read('components/beatline/BeatlineRail.tsx');
assert(beatline.includes('BeatlineRail'), 'beatline mounts the historical rail');
assert(beatRail.includes('borderRadius: px / 2'), 'beatline primaries are circles');
assert(beatRail.includes('beatlineCycleBeat'), 'beatline still edits the pattern');
assert(beatRail.includes('beatlineBeadIsCurrent'), 'beatline follows the native beat');
assert(beatRail.includes('strengthDotRatio'), 'beatline bead size follows accent strength');
assert(!beatline.includes('usePendulumPhase'), 'beatline does not invent a pendulum the rail never had');
assert(mechanical.includes("transformOrigin: 'bottom'"), 'mechanical pivots from the axle');
assert(mechanical.includes('mechanicalWeightT'), 'mechanical weight follows BPM');
assert(mechanical.includes('setBpm'), 'mechanical weight uses the shared tempo setter');
assert(mechanical.includes('mechanicalBpmFromWeightT'), 'mechanical weight maps through the existing scale');
assert(!mechanical.includes('stop('), 'mechanical touch does not stop playback');
assert(vinyl.includes('useFrameCallback'), 'vinyl motion is procedural');
assert(!vinyl.includes('.png'), 'vinyl is not a rotating photograph');
assert(trail.includes('stylusDegrees'), 'stylus maps cents');
assert(trail.includes('TUNER_TRAIL_LIMIT = 18'), 'pitch trail is bounded');
assert(foundation.includes('RhythmInstrumentFace'), 'rhythm is the segmented instrument');
assert(foundation.includes("useState(proof?.rail === 'rhythm')"), 'launch shows the numbered dial');
assert(rail.includes('RHYTHM'), 'rhythm stays reachable from the rail');
assert(rail.includes("'DIAL'") || rail.includes('INSTRUMENT_FACES'), 'dial stays on the rail');
assert(!rail.includes("'CONSOLE'"), 'console is not a face');
assert(foundation.includes('useTuner('), 'tuner uses the existing detector');
assert(!vinyl.includes('pulseBeat'), 'tuner does not read metronome beats');
assert(!vinyl.includes('pulseRole'), 'tuner does not read pulse role');
assert(!vinyl.includes('beatIndex'), 'tuner does not read beat index');
assert(!foundation.includes('setInterval'), 'the shell has no musical timer');

console.log('pockt-3 evolution tests passed');

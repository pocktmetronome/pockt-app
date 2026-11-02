'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const geom = require('../lib/face-geometry.ts');
const motion = require('../lib/pendulum-motion.ts');
const pulse = require('../lib/pulse-math.ts');
const tempo = require('../lib/horizontal-tempo.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const foundation = read('components/classic/FoundationDialRoom.tsx');
const rhythm = read('components/classic/faces/RhythmInstrumentFace.tsx');
const dial = read('components/classic/DialRoom.tsx');
const pulseRoom = read('components/classic/PulseRoom.tsx');
const pendulum = read('components/classic/SmartPendulumRoom.tsx');
const pro = read('components/classic/ProRoom.tsx');
const beatline = read('components/classic/BeatlineRoom.tsx');
const wheel = read('components/classic/HorizontalTempoWheel.tsx');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');

assert(foundation.includes('onBpm='), 'rhythm and console share the authoritative BPM setter');
assert(foundation.includes('followRadians={dialAngle}'), 'rhythm rotation follows the console angle');
assert(foundation.includes('PocktDialView'), 'console dial remains the interaction source');
assert(!rhythm.includes('setInterval'), 'rhythm does not introduce a second timer');
assert(!rhythm.includes('setBpm'), 'rhythm face does not own a second tempo setter');
assert(rhythm.includes('DialSimonSegments'), 'rhythm keeps the Simon sectors');
assert(rhythm.includes('followRadians'), 'rhythm visual is driven by the console angle');
assert(dial.includes('function ringSector'), 'sector geometry stays in DialRoom');
assert(swift.includes('onBpm(["bpm": bpm])'), 'build 122 reports BPM');
assert(swift.includes('PocktDialScale.bpmFromAngle'), 'build 122 maps BPM from angle');
assert(!foundation.includes('setInterval'), 'the shell has no musical timer');

assert(pulse.pulseWaveReachesBoundary(), 'pulse wave is configured past the rim');
assert(pulse.PULSE_WAVE_OUTER >= 1, 'pulse outer scale reaches the instrument edge');
assert(pulseRoom.includes('PULSE_WAVE_OUTER'), 'pulse uses the outer-boundary scale');
assert(pulseRoom.includes('showCenterBpm = !viewport'), 'the circular pulse hides the redundant BPM');
assert(!pulseRoom.includes('setInterval'), 'pulse has no independent timer');

assert(motion.pendulumGestureMode(false, 30, 4) === 'swing', 'arm drags swing');
assert(motion.pendulumGestureMode(true, 4, 40) === 'weight', 'vertical bob drags are the weight');
assert(motion.pendulumArmChangesBpm('swing') === false, 'swinging the arm does not change BPM');
assert(motion.pendulumArmChangesBpm('weight') === true, 'only the weight gesture changes BPM');
assert(pendulum.includes('pendulumRenderedDegrees'), 'release blends back to native phase');
assert(pendulum.includes('pendulumGestureMode'), 'pendulum separates swing from weight');
assert(pendulum.includes('usePendulumPhase'), 'pendulum stays on the native phase');
assert(!pendulum.includes('setInterval'), 'pendulum has no second timer');

assert(geom.proModuleFits(4, 300, 220), 'pro 4/4 stays in bounds');
assert(geom.proModuleFits(7, 300, 220), 'pro 7/8 stays in bounds');
assert(geom.proModuleFits(12, 300, 260), 'pro 12/8 stays in bounds');
assert(geom.beatlineModuleFits(4, 340), 'beatline 4/4 stays in bounds');
assert(geom.beatlineModuleFits(7, 340), 'beatline 7/8 stays in bounds');
assert(geom.beatlineModuleFits(12, 340), 'beatline 12/8 stays in bounds');
assert(pro.includes('HorizontalTempoWheel'), 'pro uses the shared tempo wheel');
assert(pro.includes('ProBeatCells'), 'pro keeps the beat cells');
assert(beatline.includes('HorizontalTempoWheel'), 'beatline uses the shared tempo wheel');
assert(beatline.includes('BeatCapsuleStrip'), 'beatline keeps the capsules');
assert(wheel.includes('onChange(safe)'), 'the horizontal wheel writes BPM through its setter');
assert(!wheel.includes('setInterval'), 'the tempo wheel has no musical timer');
assert(tempo.horizontalBpmFromDrag(120, tempo.HORIZONTAL_PX_PER_BPM, false) === 119, 'one detent of drag is one BPM');
assert(tempo.horizontalBpmFromDrag(20, 400, false) === 20, 'the wheel clamps at the console minimum');

for (const rel of [
  'components/classic/PulseRoom.tsx',
  'components/classic/SmartPendulumRoom.tsx',
  'components/classic/ProRoom.tsx',
  'components/classic/BeatlineRoom.tsx',
  'components/classic/HorizontalTempoWheel.tsx',
  'components/classic/faces/RhythmInstrumentFace.tsx',
]) {
  assert(!read(rel).includes('setInterval'), `${rel} does not start an independent musical timer`);
}

console.log('face polish tests passed');

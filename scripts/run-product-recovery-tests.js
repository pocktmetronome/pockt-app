'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ownership = require('../lib/audio-ownership.ts');
const scale = require('../lib/pockt-dial-scale.ts');
const tuner = require('../lib/tuner-lock.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const plate = read('components/classic/dial-skia.tsx');
const facade = read('components/classic/DialFacade.tsx');
const pulse = read('components/classic/PulseRoom.tsx');
const pendulum = read('components/classic/SmartPendulumRoom.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const metronome = read('hooks/use-metronome.ts');
const tunerHook = read('hooks/use-tuner.ts');
const phrase = read('hooks/use-phrase-recorder.ts');

assert(foundation.includes('const showDialFace = !tunerOpen && !interiorFaceId'), 'dial artwork mounts only for the dial instrument');
assert(foundation.includes("backgroundColor: '#0C0B0A'"), 'other instruments sit on graphite');
assert(foundation.includes('facade={false}'), 'beat rail uses the shared wells');
assert(!foundation.includes('FIND YOUR POCKET'), 'tagline stays off the instrument');
assert(facade.includes('<DialPlate'), 'the dial facade is the single scale picture');
assert(plate.includes('SCALE_NUMERAL_SIZE = 15'), 'dial numerals are large enough to read');
assert(plate.includes('function needlePath'), 'one pointer is drawn on the plate');
assert(beats.includes('bubbleNormal'), 'accent wells keep four states');
assert(plate.includes('dialScaleTicks'), 'scale ticks come from one geometry model');
assert(pendulum.includes("backgroundColor: '#0C0B0A'"), 'pendulum field is opaque graphite');
assert(read('components/classic/PhraseFace.tsx').includes("'RECORD'"), 'phrase record key says RECORD');
assert(metronome.includes('enqueueAudio'), 'play joins the audio lane');
assert(metronome.includes('commitAudioModeIf'), 'a stale play cannot mark itself playing');
assert(tunerHook.includes('captureReleaseIsBlocked'), 'tuner exit cannot clobber play');
assert(phrase.includes('enqueueAudio'), 'phrase capture joins the audio lane');
const fittedPulse = pulse.slice(pulse.indexOf('if (viewport) {'), pulse.indexOf('<Pressable', pulse.indexOf('if (viewport) {')));
assert(!fittedPulse.includes('TempoDot'), 'fitted pulse has no orbit');
assert(fittedPulse.includes('Pockt2Mark'), 'fitted pulse keeps the center mark');

const ticks = scale.dialScaleTicks();
assert.equal(ticks[0].bpm, 20);
assert.equal(ticks[ticks.length - 1].bpm, 400);
assert.equal(ticks.filter((tick) => tick.bpm === 40 && tick.major).length, 1, '40 is one major mark');
assert.equal(ticks.filter((tick) => tick.bpm === 30 && !tick.major).length, 1, '30 is one minor mark');
assert.equal(new Set(ticks.map((tick) => tick.bpm)).size, ticks.length, 'no duplicate scale marks');

assert.equal(tuner.tunerPitchIsTrustworthy(null), false);
assert.equal(tuner.tunerPitchIsTrustworthy(Number.NaN), false);
assert.equal(tuner.tunerPitchIsTrustworthy(Number.POSITIVE_INFINITY), false);
assert.equal(tuner.tunerPitchIsTrustworthy(-51), false);
assert.equal(tuner.tunerPitchIsTrustworthy(0), true);
assert.equal(tuner.tunerPitchIsTrustworthy(-25), true);

assert.equal(ownership.nextAudioMode('IDLE', 'play'), 'PLAYBACK');
assert.equal(ownership.nextAudioMode('PLAYBACK', 'enterTuner'), 'TUNER_CAPTURE');
assert.equal(ownership.nextAudioMode('TUNER_CAPTURE', 'exitTuner'), 'IDLE');
assert.equal(ownership.nextAudioMode('PLAYBACK', 'exitTuner'), 'PLAYBACK');
assert.equal(ownership.nextAudioMode('PLAYBACK', 'enterRecorder'), 'RECORDER_CAPTURE');
assert.equal(ownership.nextAudioMode('RECORDER_CAPTURE', 'exitRecorder'), 'IDLE');
assert.equal(ownership.nextAudioMode('TUNER_CAPTURE', 'enterRecorder'), 'RECORDER_CAPTURE');
assert.equal(ownership.nextAudioMode('PLAYBACK', 'interrupt'), 'INTERRUPTED');
assert.equal(ownership.nextAudioMode('INTERRUPTED', 'foreground'), 'IDLE');
assert.equal(ownership.nextAudioMode('PLAYBACK', 'stop'), 'IDLE');
assert.equal(ownership.captureReleaseIsBlocked('PLAYBACK'), true);
assert.equal(ownership.captureReleaseIsBlocked('TRANSITIONING'), true);
assert.equal(ownership.captureReleaseIsBlocked('TUNER_CAPTURE'), false);

async function main() {
  const order = [];
  const first = ownership.enqueueAudio(async () => {
    order.push('a');
    await new Promise((resolve) => setTimeout(resolve, 20));
    order.push('b');
  });
  const second = ownership.enqueueAudio(async () => {
    order.push('c');
  });
  await Promise.all([first, second]);
  assert.deepEqual(order, ['a', 'b', 'c'], 'audio lane is one sequence');

  const token = ownership.commitAudioMode('TRANSITIONING');
  assert.equal(ownership.commitAudioModeIf(token, 'PLAYBACK'), true);
  assert.equal(ownership.audioMode(), 'PLAYBACK');
  assert.equal(ownership.commitAudioModeIf(token, 'IDLE'), false, 'stale token cannot clear playback');
  assert.equal(ownership.audioMode(), 'PLAYBACK');
  console.log('product recovery tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

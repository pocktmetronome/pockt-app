'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const geom = require('../lib/face-geometry.ts');
const trail = require('../lib/tuner-trail.ts');
const lock = require('../lib/tuner-lock.ts');
const math = require('../lib/tuner-math.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const face = read('components/classic/faces/VinylTunerFace.tsx');
const hook = read('hooks/use-tuner.ts');
const native = read('modules/pockt-timing/ios/PocktTuner.swift');
const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');

for (const size of [280, 340, 390]) {
  const table = geom.turntableGeometry(size);
  assert(table.discR > size * 0.48, 'the record fills the circular instrument');
  assert(Math.hypot(table.pivotX - table.discCx, table.pivotY - table.discCy) > table.discR + table.housingR, 'the pivot base is outside the vinyl');
  assert(geom.tonearmBaseClearsRecord(size), `pivot housing is off the record at ${size}`);
  const length = geom.tonearmPose(0, size).length;
  let previous = Infinity;
  for (let cents = -50; cents <= 50; cents += 1) {
    const pose = geom.tonearmPose(cents, size);
    assert(geom.stylusInPlayableAnnulus(cents, size), `cents ${cents} stays in the annulus at ${size}`);
    assert(geom.stylusInsideInstrument(cents, size), `cents ${cents} stays inside the face at ${size}`);
    assert(geom.tonearmSegmentClearsLabel(cents, size), `arm clears the label at ${cents}/${size}`);
    assert(Math.abs(pose.length - length) < 0.02, 'arm length is constant');
    assert(pose.radius <= previous + 0.08, 'radius falls as cents rise');
    previous = pose.radius;
  }
  const flat = geom.tonearmPose(-40, size);
  const mid = geom.tonearmPose(0, size);
  const sharp = geom.tonearmPose(40, size);
  assert(Math.abs(mid.radius - table.grooveR) < 0.2, 'zero cents sits on the target groove');
  assert(flat.radius > mid.radius && mid.radius > sharp.radius, 'flat, target, sharp stay ordered');
  assert(flat.visual < 0 && mid.visual === 0 && sharp.visual > 0, 'visual sign follows cents');
  assert(flat.tipY < sharp.tipY, 'flat side is above the sharp side');
}

let history = [];
const started = 5000;
for (const cents of [-32, -18, -6, 0, 9, 22]) {
  history = trail.pushTunerTrail(history, cents, started + history.length * 40);
}
assert(history.length === 6, 'trail keeps recent pitch samples');
assert(history[0].cents === -32 && history[3].cents === 0, 'trail preserves order');
assert(trail.tunerTrailOpacity(0) > trail.tunerTrailOpacity(900), 'newer scratch is stronger');
assert(trail.tunerTrailOpacity(trail.TUNER_TRAIL_LIFE_MS + 1) === 0, 'old scratch is gone');
const stale = trail.pushTunerTrail(history, 4, started + trail.TUNER_TRAIL_LIFE_MS + 50);
assert(stale.every((sample) => sample.cents === 4 || started + trail.TUNER_TRAIL_LIFE_MS + 50 - sample.at < trail.TUNER_TRAIL_LIFE_MS), 'expired samples drop');
assert(trail.clampTunerCents(-80) === -50 && trail.clampTunerCents(80) === 50, 'extreme cents clamp');
assert(trail.clampTunerCents(Number.NaN) === 0, 'bad cents do not move the arm');

let latch = lock.createInTuneLatch();
const early = lock.advanceInTuneLatch(latch, true, 1000, 280);
assert(early.fire === false, 'lock does not fire immediately');
const held = lock.advanceInTuneLatch(early.latch, true, 1300, 280);
assert(held.fire === true, 'lock fires once the dwell completes');
const still = lock.advanceInTuneLatch(held.latch, true, 1600, 280);
assert(still.fire === false, 'staying in tune does not fire again');
const lost = lock.advanceInTuneLatch(still.latch, false, 1700, 280);
const back = lock.advanceInTuneLatch(lost.latch, true, 2000, 280);
const again = lock.advanceInTuneLatch(back.latch, true, 2300, 280);
assert(back.fire === false && again.fire === true, 'leaving and returning re-arms one confirmation');

assert(math.readingFromFrequency(70, 0.1) === null, 'a weak pitch is not a note');
const open = [82.4069, 110, 146.8324, 195.9977, 246.9417, 329.6276];
const names = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
open.forEach((hz, index) => {
  const reading = math.readingFromFrequency(hz, 0.9);
  assert(reading && `${reading.note}${reading.octave}` === names[index], `${names[index]} stays the open-string note`);
  assert(reading && Math.abs(reading.cents) < 8, `${names[index]} cents stay near the open string`);
});

assert(face.includes('TUNE UP') && face.includes('TUNE DOWN') && face.includes('IN TUNE'), 'guidance matches the stylus');
assert(!face.includes('FLAT — TUNE UP') && !face.includes('>FLAT<') && !face.includes('>SHARP<'), 'flat and sharp are not pasted across the vinyl');
assert(face.includes('#FF2430'), 'the pitch tracer is red');
assert(face.includes('NO SIGNAL'), 'silence does not invent a note');
assert(face.includes('tunerPitchIsTrustworthy'), 'stylus requires a finite cents window');
assert(face.includes('tonearmPose') && face.includes('useFrameCallback'), 'the arm uses the pivot pose');
assert(face.includes('LP_DEGREES_PER_SECOND = 24') && face.includes('Pockt2Mark'), 'the record turns slowly and the label uses the P mark');
assert(face.includes('Record-local scratch'), 'the tracer follows the rotating groove');
assert(face.includes('useAnimatedStyle') && face.includes('rotate: `${spin.value}deg`'), 'the printed label turns with the vinyl');
assert(face.includes('origin={origin} transform={turn}'), 'the label disc turns with the vinyl');
assert(!face.includes('>POCKT<'), 'the label does not spell the wordmark');
assert(!face.includes('pulseBeat') && !face.includes('beatIndex') && !face.includes('.png'), 'the tuner is not a metronome face or a pasted record');
assert(!hook.includes('playReferenceTone'), 'in-tune confirmation does not play into the tuner session');
assert(hook.includes('hapticMedium'), 'in-tune confirmation keeps the haptic');
assert(hook.includes('setReading((prev) => (prev == null ? prev : null))'), 'lost pitch clears the note');
assert(engine.includes('func stopTuner()') && engine.includes('restorePlaybackGraph'), 'leaving the tuner restores playback');
assert(native.includes('guitarLow: Double = 70') && native.includes('guitarHigh: Double = 720'), 'guitar octave window stays at the validated limits');
assert(native.includes('maxHz: Double = 1400'), 'upper detector limit stays in place');

console.log('vinyl tuner tests passed');

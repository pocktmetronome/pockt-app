'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const geom = require('../lib/face-geometry.ts');
const motion = require('../lib/pendulum-motion.ts');
const pulse = require('../lib/pulse-math.ts');
const tempo = require('../lib/horizontal-tempo.ts');
const rhythm = require('../lib/rhythm-follow.ts');
const lock = require('../lib/tuner-lock.ts');
const trail = require('../lib/tuner-trail.ts');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const dial = read('components/classic/DialRoom.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const pulseRoom = read('components/classic/PulseRoom.tsx');
const pendulum = read('components/classic/SmartPendulumRoom.tsx');
const pro = read('components/classic/ProRoom.tsx');
const beatline = read('components/classic/BeatlineRoom.tsx');
const wheel = read('components/classic/HorizontalTempoWheel.tsx');
const metro = read('hooks/use-metronome.ts');
const tunerHook = read('hooks/use-tuner.ts');
const tunerEngine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const layout = read('lib/compute-foundation-layout.ts');

assert(rhythm.rhythmVisualRadians(0.4) === -0.4, 'rhythm wheel mirrors the console angle so clockwise follows the finger');
assert(rhythm.rhythmVisualRadians(Number.NaN) === 0, 'a bad angle does not spin the wheel');
assert(dial.includes('rhythmVisualRadians(followRadians.value)'), 'rhythm display uses the corrected angle');
assert(!dial.includes('bpmFromAngle'), 'rhythm does not rewrite console BPM mapping');

assert(pulse.pulseTurnsAfterDrag(1.98, 0.4, false) === 2, 'pulse lane clamps at the top turn instead of wrapping');
assert(pulse.pulseTurnsAfterDrag(0.02, -0.4, false) === 0, 'pulse lane clamps at the bottom turn instead of wrapping');
assert(pulse.pulseTurnsToBpm(pulse.pulseTurnsAfterDrag(pulse.pulseBpmToTurns(173), 0.15, false)) > 173, 'clockwise drag raises BPM');
assert(pulse.PULSE_WAVE_OUTER > 1, 'pulse waves travel past the visible boundary');
assert(pulseRoom.includes('POCKT'), 'stopped pulse keeps a static mark');
assert(pulseRoom.includes('showCenterBpm = !viewport'), 'fitted pulse does not print BPM');
assert(pulseRoom.includes('TempoDot'), 'the tempo dot is on the fitted pulse');

assert(geom.pendulumRenderedDegrees(1, 22, 0, 4) === 22, 'held arm shows the finger angle');
assert(geom.pendulumRenderedDegrees(0, 22, 1, 4) === 22, 'release starts from the grabbed angle');
assert(geom.pendulumRenderedDegrees(0, 22, 0, 4) === 4, 'release rejoins native phase');
assert(pendulum.includes('held.value = 0'), 'release clears the hold');
assert(motion.pendulumBpmFromWeight(motion.pendulumWeightT(376)) === 376, '376 BPM is on the weight scale');
assert(motion.pendulumBpmFromWeight(1) === 400, 'weight reaches 400');
assert(motion.pendulumBpmFromWeight(0) === 20, 'weight reaches 20');
const high = motion.pendulumWeightT(400);
const back = motion.pendulumWeightFromDrag(high, -80, 200, false);
assert(motion.pendulumBpmFromWeight(back) < 400, '400 BPM can be dragged back down');
assert(motion.pendulumBpmFromWeight(motion.pendulumWeightFromDrag(motion.pendulumWeightT(376), -40, 200, false)) < 376, '376 BPM can be dragged downward');
assert(motion.pendulumArmChangesBpm('swing') === false, 'arm swing does not set BPM');
const lowBob = motion.pendulumBobCenter(0, 0, 200, 240, 100);
const highBob = motion.pendulumBobCenter(1, 0, 200, 240, 100);
assert(highBob.y > lowBob.y, 'high BPM moves the bob toward the pivot');

assert(tempo.horizontalBpmFromDrag(120, 28, false) === 119, 'wheel drag right lowers BPM with the finger');
assert(tempo.horizontalBpmFromDrag(120, -28, false) === 121, 'wheel drag left raises BPM');
assert(tempo.horizontalBpmFromDrag(120, 10, false) === 120, 'a short drag is a fine adjustment, not a jump');
assert(tempo.horizontalBpmFromDrag(20, 80, false) === 20, 'wheel clamps at 20');
assert(tempo.horizontalBpmFromDrag(400, -80, false) === 400, 'wheel clamps at 400');
assert(wheel.includes('WHEEL_MIN = 20') && wheel.includes('WHEEL_MAX = 400'), 'the wheel engraves the full console range');

const accentSrc = read('lib/accents.ts');
assert(accentSrc.includes("if (level === 'mute') return 0"), 'accent 0 is off');
assert(accentSrc.includes("if (level === 'soft') return 1"), 'accent 1 is soft');
assert(accentSrc.includes("if (level === 'normal') return 2"), 'accent 2 is normal');
assert(accentSrc.includes('return 3'), 'accent 3 is strong');
assert(beats.includes('bubbleMute') && beats.includes('bubbleSoft') && beats.includes('bubbleNormal') && beats.includes('bubbleStrong'), 'four button materials stay named');
assert(!beats.includes('testID="beat-row-shutter"'), 'the beat shutter is gone');
assert(!beats.includes('toggleShutter'), 'shutter interaction is deleted');

assert(pro.includes('nextProView'), 'pro restores the historical phase action');
assert(pro.includes('frame?.width') || pro.includes('frame || viewport'), 'pro can leave the circular peephole');
assert(layout.includes('stage'), 'the shell has a rectangular instrument stage');
assert(foundation.includes('wideFace'), 'pro and beatline use the rectangular stage');
assert(geom.proModuleRows(4) === 1 && geom.proModuleRows(7) === 2 && geom.proModuleRows(12) === 3, 'pro meters wrap');
assert(beatline.includes('BeatCapsuleStrip') && beatline.includes('wrap'), 'beatline wraps high meters');
assert(geom.beatlineNodeLayout(12, [3, 3, 3, 3], 340).some((node) => node.row === 2), '12/8 uses more than one row');

const armLength = geom.tonearmPose(0, 340).length;
for (let cents = -50; cents <= 50; cents += 5) {
  const pose = geom.tonearmPose(cents, 340);
  assert(geom.stylusClearsLabel(cents, 340), `stylus at ${cents} stays out of the label`);
  assert(geom.stylusInPlayableAnnulus(cents, 340), `stylus at ${cents} stays on the playable grooves`);
  assert(geom.stylusInsideInstrument(cents, 340), `stylus at ${cents} stays inside the instrument`);
  assert(geom.tonearmSegmentClearsLabel(cents, 340), `arm at ${cents} does not cross the label`);
  assert(Math.abs(pose.length - armLength) < 0.01, 'the tonearm length stays fixed');
}
assert(geom.tonearmBaseClearsRecord(340), 'tonearm base sits off the record and inside the instrument');
let previousRadius = Infinity;
for (let cents = -50; cents <= 50; cents += 5) {
  const pose = geom.tonearmPose(cents, 340);
  assert(pose.radius <= previousRadius + 0.05, 'flat sits outside the target and sharp sits inside it');
  previousRadius = pose.radius;
}
const flatPose = geom.tonearmPose(-30, 340);
const sharpPose = geom.tonearmPose(30, 340);
const zeroPose = geom.tonearmPose(0, 340);
assert(flatPose.radius > zeroPose.radius && zeroPose.radius > sharpPose.radius, 'zero cents is the target groove between flat and sharp');
assert(flatPose.tipY < sharpPose.tipY, 'flat is above sharp');

let latch = lock.createInTuneLatch();
let fires = 0;
const quiet = lock.advanceInTuneLatch(latch, true, 1000, 280);
latch = quiet.latch;
assert(quiet.fire === false, 'in-tune does not fire before the dwell');
const again = lock.advanceInTuneLatch(latch, true, 1100, 280);
latch = again.latch;
assert(again.fire === false, 'still inside the dwell');
const ready = lock.advanceInTuneLatch(latch, true, 1400, 280);
latch = ready.latch;
if (ready.fire) fires += 1;
const held = lock.advanceInTuneLatch(latch, true, 1800, 280);
latch = held.latch;
if (held.fire) fires += 1;
assert(fires === 1, 'in-tune confirmation fires once');
const left = lock.advanceInTuneLatch(latch, false, 2000, 280);
const entered = lock.advanceInTuneLatch(left.latch, true, 2100, 280);
const reentered = lock.advanceInTuneLatch(entered.latch, true, 2500, 280);
assert(entered.fire === false && reentered.fire === true, 'leaving the window re-arms one confirmation');

const aged = trail.tunerTrailOpacity(0);
const older = trail.tunerTrailOpacity(trail.TUNER_TRAIL_LIFE_MS - 1);
assert(aged > older && trail.tunerTrailOpacity(trail.TUNER_TRAIL_LIFE_MS + 5) === 0, 'pitch trail fades out');

assert(tunerHook.includes('stopTuner'), 'leaving the tuner stops the microphone');
assert(tunerEngine.includes('func stopTuner()') && tunerEngine.includes('restorePlaybackGraph'), 'tuner exit restores the playback graph');
assert(metro.includes('preparedRef.current = false'), 'stop clears a stale prepared graph');
assert(metro.includes('PocktTiming.prepare(uris)'), 'play prepares the native graph before start');
assert(metro.includes('const toggle'), 'center play uses the single toggle');
assert(foundation.includes('setTunerOpen(false)'), 'face changes close the tuner');
assert(foundation.includes('interiorFaceId ?'), 'only the selected face is mounted');
assert(!foundation.includes('setInterval'), 'the shell has no second musical clock');

console.log('build 141 correction tests passed');

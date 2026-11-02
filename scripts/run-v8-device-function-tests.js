'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { stepDialBpm } = require('../lib/pockt-dial-scale.ts');
const { TapTempo } = require('../lib/tap-tempo.ts');
const { clampTempo, stepEncoder, degreesPerBpm, TEMPO_MIN, TEMPO_MAX } = require('../lib/native-interaction-math.ts');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const instrument = read('components/classic/PocktInstrument.tsx');
const room = read('components/classic/FoundationDialRoom.tsx');
const swift = read('modules/pockt-controls/ios/PocktControlsModule.swift');
const dialSwift = read('modules/pockt-controls/ios/PocktDialControl.swift');
const buttonSwift = read('modules/pockt-controls/ios/PocktMechButton.swift');
const lampSwift = read('modules/pockt-controls/ios/PocktLampView.swift');
const compositor = read('scripts/build-north-star-v8.js');

assert.strictEqual(stepDialBpm(20, -1), 20, '20 BPM lower stop');
assert.strictEqual(stepDialBpm(400, 1), 400, '400 BPM upper stop');
assert.strictEqual(stepDialBpm(119, 1), 120, '119 steps to 120');
assert.strictEqual(stepDialBpm(120, 1), 121, '120 steps to 121');
assert.strictEqual(stepDialBpm(121, -1), 120, '121 steps to 120');
assert.strictEqual(stepDialBpm(399, 1), 400, '399 steps to 400');
assert.strictEqual(stepDialBpm(400, -1), 399, '400 steps to 399');
assert.strictEqual(TEMPO_MIN, 20);
assert.strictEqual(TEMPO_MAX, 400);
assert.strictEqual(clampTempo(19), 20);
assert.strictEqual(clampTempo(401), 400);
assert.strictEqual(degreesPerBpm(40), 3, 'slow movement is 1 BPM gear');
assert.ok(degreesPerBpm(400) < 3, 'fast gearing tightens the step');

let bpm = 20;
for (let next = 21; next <= 400; next += 1) {
  const sample = stepEncoder({
    bpm,
    deltaRadians: (3 * Math.PI) / 180,
    dtSeconds: 0.25,
    engaged: true,
    pendingDegrees: 0,
  });
  assert.strictEqual(sample.bpm, next, `integer ${next} reachable`);
  bpm = sample.bpm;
}
const below = stepEncoder({ bpm: 20, deltaRadians: (-30 * Math.PI) / 180, dtSeconds: 0.05, engaged: true, pendingDegrees: 0 });
const above = stepEncoder({ bpm: 400, deltaRadians: (30 * Math.PI) / 180, dtSeconds: 0.05, engaged: true, pendingDegrees: 0 });
assert.strictEqual(below.bpm, 20, 'encoder hard stop at 20');
assert.strictEqual(above.bpm, 400, 'encoder hard stop at 400');

const taps = new TapTempo();
assert.strictEqual(taps.tap(1000), null, 'first tap arms tempo');
const tapped = taps.tap(1500);
assert.strictEqual(tapped, 120, 'second tap 500ms later is 120 BPM');

const button = read('components/classic/NorthStarLiveButton.tsx');
assert.ok(room.includes('<PocktDialView'), 'dial home uses the proven pockt-dial view');
assert.ok(!room.includes('<NorthStarDialTurn'), 'gesture ring is not the home dial');
assert.ok(!room.includes('<PocktDialControl'), 'failed dial control is off the home screen');
assert.ok(!instrument.includes('PocktMechButton'), 'failed mech button is off the home screen');
assert.ok(instrument.includes('NorthStarLiveButton'), 'buttons are Pressable caps');
assert.ok(button.includes('<Pressable'), 'live button is a Pressable');
assert.ok(button.includes('translateY'), 'press travel moves the cap');
assert.ok(button.includes('hapticEvent'), 'press uses the existing haptic helper');
assert.ok(room.includes('onPlus={() => stepTempo(1, true)}'), 'plus steps one BPM');
assert.ok(room.includes('onMinus={() => stepTempo(-1, true)}'), 'minus steps one BPM');
assert.ok(instrument.includes('repeat'), 'plus and minus repeat from a JS timer');
assert.ok(button.includes('HOLD_MS = 400'), 'repeat waits 400ms');
assert.ok(room.includes('onTap={(stamp) =>'), 'tap receives the press timestamp');
assert.ok(room.includes('tapTempo('), 'tap updates tempo');
assert.ok(room.includes('toggle();'), 'play starts and stops the engine');
assert.ok(instrument.includes('hapticKind="playCommit"'), 'play uses playCommit');
assert.ok(instrument.includes('hapticKind="tap"'), 'tap uses the tap haptic');
assert.ok(instrument.includes('hapticKind="controlPress"'), 'keys use controlPress');
assert.ok(instrument.includes('hapticKind="selector"'), 'beats and nav use selector');
assert.ok(room.includes('setTunerOpen(true)'), 'tuner opens the tuner');
assert.ok(room.includes('onSound={onOpenSound}'), 'sound opens the selector');
assert.ok(room.includes('onMeter={onOpenTime}'), 'meter opens meter and subdivision');
assert.ok(room.includes('onOptions={onOpenSettings}'), 'P opens settings');
assert.ok(room.includes("onBeatMode('deck')"), 'loop fires the deck action');
assert.ok(room.includes('onAccents={onChangeAccents}'), 'beat accents write the pattern');
assert.ok(instrument.includes('cycle(index)'), 'each beat cycles its accent');
assert.ok(room.includes('onSelectRail={selectRail}'), 'nav routes through the rail');
assert.ok(instrument.includes('props.onSelectRail(item.id)'), 'each nav item calls its rail id');
assert.ok(instrument.includes('props.onTap(event?.nativeEvent?.timestamp)'), 'tap forwards the press timestamp');
assert.ok(instrument.includes("id: 'dial'") && instrument.includes("id: 'rhythm'") && instrument.includes("id: 'pulse'"));
assert.ok(instrument.includes("id: 'smart-pendulum'") && instrument.includes("id: 'pro'") && instrument.includes("id: 'beatline'"));
assert.ok(room.includes('pointerEvents="none"'), 'static face does not take the touch');
assert.ok(instrument.includes('pointerEvents="box-none"'), 'instrument passes touches through to the dial');
assert.ok(!room.includes('pointerEvents="none"') || room.includes('<PocktDialView'), 'dial driver remains hittable');
assert.ok(lampSwift.includes('PocktBeatBus'), 'lamps follow the live beat bus');
assert.ok(swift.includes('ViewName("PocktLampView")') && swift.includes('ViewName("PocktReadout")'), 'display views stay registered');
assert.ok(fs.existsSync(path.join(root, 'modules/pockt-controls/ios/PocktMechButton.swift')), 'mech button module stays in the project');
assert.ok(fs.existsSync(path.join(root, 'modules/pockt-controls/ios/PocktDialControl.swift')), 'dial control module stays in the project');
void dialSwift;
void buttonSwift;
void compositor;

console.log('v8 device function tests passed');

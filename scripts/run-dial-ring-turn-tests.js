'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  DIAL_BPM_MAX,
  DIAL_BPM_MIN,
  DIAL_DEG_PER_BPM,
  fingerAngle,
  integerBpm,
  rotationForBpm,
  turnDial,
  wrapPi,
} = require('../lib/dial-ring-turn.ts');

const root = path.join(__dirname, '..');
const turn = fs.readFileSync(path.join(root, 'components/classic/NorthStarDialTurn.tsx'), 'utf8');
const room = fs.readFileSync(path.join(root, 'components/classic/FoundationDialRoom.tsx'), 'utf8');

const step = (DIAL_DEG_PER_BPM * Math.PI) / 180;

assert.strictEqual(fingerAngle(2, 1, 1, 1), 0, 'gesture begin reads the finger angle');
const start = fingerAngle(1, 0, 0, 0);
const moved = fingerAngle(0, 1, 0, 0);
assert.ok(Math.abs(wrapPi(moved - start) - Math.PI / 2) < 1e-9, 'angle changes with the finger');

const wrapped = wrapPi((-Math.PI + 0.04) - (Math.PI - 0.04));
assert.ok(Math.abs(wrapped - 0.08) < 1e-9, 'angle wrap does not jump');

let rotation = rotationForBpm(120);
let originRotation = rotation;
let originBpm = 120;
const first = turnDial({ rotation, originRotation, originBpm, deltaRadians: step });
assert.ok(Math.abs(first.bpm - 121) < 1e-6, '3 degrees raises BPM by 1');
assert.ok(Math.abs(first.rotation - (rotation + step)) < 1e-9, 'rotation shared value follows the finger');
rotation = first.rotation;

const held = turnDial({ rotation, originRotation, originBpm, deltaRadians: 0 });
assert.strictEqual(held.rotation, rotation, 'release adds no inertia');

let bpm = 20;
rotation = rotationForBpm(20);
originRotation = rotation;
originBpm = 20;
for (let next = 21; next <= 400; next += 1) {
  const turned = turnDial({ rotation, originRotation, originBpm, deltaRadians: step });
  rotation = turned.rotation;
  bpm = turned.bpm;
  assert.strictEqual(integerBpm(bpm), next, `integer ${next}`);
}
assert.strictEqual(integerBpm(bpm), 400);

const pastTop = turnDial({ rotation, originRotation, originBpm, deltaRadians: step * 4 });
assert.strictEqual(pastTop.bpm, DIAL_BPM_MAX, '400 stop');
assert.ok(Math.abs(pastTop.rotation - rotationForBpm(400)) < 1e-6, 'ring does not turn past 400');

const atFloor = turnDial({
  rotation: rotationForBpm(20),
  originRotation: rotationForBpm(20),
  originBpm: 20,
  deltaRadians: -step * 5,
});
assert.strictEqual(atFloor.bpm, DIAL_BPM_MIN, '20 stop');
assert.ok(Math.abs(atFloor.rotation - rotationForBpm(20)) < 1e-6, 'ring does not turn past 20');

assert.ok(turn.includes('Gesture.Pan()'), 'pan gesture owns the dial');
assert.ok(turn.includes('rotateZ'), 'visible ring uses the rotation value');
assert.ok(turn.includes('pointerEvents="none"'), 'ring art does not take the touch');
assert.ok(turn.includes('hapticLight'), 'integer crossings use expo haptics');
assert.ok(turn.includes('<GestureDetector'), 'detector is the touch owner');
assert.ok(!turn.includes('withTiming') && !turn.includes('withDecay'), 'no delayed animation or fling');
assert.ok(!room.includes('<PocktDialControl'), 'failed dial control is not on the home');
const home = room.slice(room.indexOf('showDialArt && v4Shell'), room.indexOf('showDialFace && Platform.OS'));
assert.ok(home.includes('<PocktDialView'), 'v4 dial uses the proven pockt-dial view');
assert.ok(home.includes('haptic'), 'v4 dial uses the proven haptic prop');
assert.ok(!home.includes('<NorthStarDialTurn'), 'v4 dial does not use the gesture ring');
assert.ok(!home.includes('<PocktDialControl'), 'v4 dial does not use the failed dial control');

console.log('dial ring turn tests passed');

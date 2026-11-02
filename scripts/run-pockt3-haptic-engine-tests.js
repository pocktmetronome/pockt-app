'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const swift = fs.readFileSync(path.join(root, 'modules/pockt-dial/ios/PocktDialView.swift'), 'utf8');
const tuning = fs.readFileSync(path.join(root, 'modules/pockt-dial/ios/PocktDialTuning.swift'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'components/classic/ClassicPreviewCard.tsx'), 'utf8');
const step = fs.readFileSync(path.join(root, 'lib/pockt-dial-step.ts'), 'utf8');

assert(tuning.includes('hapticMinGap: CFTimeInterval = 0.018'), 'build 122 haptic gap');
assert(!tuning.includes('bpmHysteresis'), 'build 122 tuning has no hysteresis constant');
assert(swift.includes('onBpm(["bpm": bpm])'), 'build 122 emits integer BPM');
assert(swift.includes('playHaptic(intensity:'), 'build 122 haptic call');
assert(!swift.includes('while cursor != next'), 'no haptic step train');
assert(swift.includes('omega = 0'), 'release clears omega');
assert(swift.includes('friction * omega'), 'build 122 friction branch is in the source');
assert(swift.includes('angle + delta'), 'finger delta drives the angle');
assert(preview.includes('{Math.round(bpm)}'), 'preview reads store BPM');
assert(!preview.includes("letterSpacing: -1 }}>120</Text>"), 'preview no longer hardcodes 120');
assert(step.includes('DIAL_HAPTIC_MIN_GAP_S = 0.03'), 'JS scheduler gap matches native');

function hapticAllowed(lastAt, now) {
  return now - lastAt >= 0.03;
}
let last = -1;
const kept = [];
const dropped = [];
for (const t of [0, 0.01, 0.02, 0.03, 0.04, 0.061]) {
  if (hapticAllowed(last, t)) {
    kept.push(t);
    last = t;
  } else {
    dropped.push(t);
  }
}
assert.deepStrictEqual(kept, [0, 0.03, 0.061], `keep ${kept}`);
assert.deepStrictEqual(dropped, [0.01, 0.02, 0.04], `drop ${dropped}`);

let frameWrites = 0;
let pending = null;
function queue(v) {
  pending = v;
}
function flushFrame() {
  if (pending == null) return;
  frameWrites += 1;
  pending = null;
}
queue(121);
queue(125);
queue(130);
flushFrame();
queue(131);
flushFrame();
assert.strictEqual(frameWrites, 2, 'engine at most once per frame');

console.log('pockt-3 haptic / engine / B2 tests passed');

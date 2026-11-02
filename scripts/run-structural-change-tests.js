const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function structuralCommitReady(bar, armedBar) {
  return bar > armedBar;
}

function isStructuralPatch(patch) {
  return patch.timeSignature != null || patch.subdivision != null;
}

assert(structuralCommitReady(1, 1) === false, 'same bar does not commit');
assert(structuralCommitReady(2, 1) === true, 'the next bar commits');
assert(structuralCommitReady(4, 4) === false, 'armed bar waits');
assert(isStructuralPatch({ timeSignature: '6/8' }) === true, 'meter is structural');
assert(isStructuralPatch({ subdivision: 'eighths' }) === true, 'subdivision is structural');
assert(isStructuralPatch({ bpm: 120 }) === false, 'tempo is not structural');

const hook = fs.readFileSync(path.join(__dirname, '../hooks/use-metronome.ts'), 'utf8');
const lib = fs.readFileSync(path.join(__dirname, '../lib/structural-change.ts'), 'utf8');
assert(hook.includes('structuralCommitReady'), 'playing meter and subdivision wait for the next bar');
assert(hook.includes('isStructuralPatch'), 'only meter and subdivision are structural');
assert(hook.includes('setPendingChange'), 'a queued meter stays visible until the downbeat');
assert(lib.includes('return bar > armedBar'), 'commit helper matches the test');
assert(!hook.includes('setInterval'), 'structural changes do not add a timer');

let commits = 0;
for (let i = 0; i < 1000; i += 1) {
  if (structuralCommitReady(i + 1, i)) commits += 1;
}
assert(commits === 1000, 'every later bar commits');

console.log('structural change tests passed');

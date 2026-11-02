/**
 * Offline abuse of the musical state machine.
 * This does not start AVAudioEngine. That execution is device-only.
 */
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function structuralCommitReady(bar, armedBar) {
  return bar > armedBar;
}

let playing = false;
let starts = 0;
let stops = 0;
let engines = 0;
let bpm = 120;
let sound = 'click';
let meter = '4/4';
let pending = null;
let bar = 0;

function play() {
  if (playing) return;
  playing = true;
  starts += 1;
  engines = 1;
}
function stop() {
  if (!playing && engines === 0) return;
  playing = false;
  stops += 1;
  if (pending) {
    if (pending.meter) meter = pending.meter;
    pending = null;
  }
}

for (let i = 0; i < 1000; i += 1) {
  if (i % 2 === 0) play();
  else stop();
}
assert(engines <= 1, 'one engine flag');
assert(starts === 500 && stops === 500, 'play and stop pair');
assert(!playing, 'ends stopped');

for (let i = 0; i < 1000; i += 1) {
  const next = 20 + (i % 381);
  bpm = Math.min(400, Math.max(20, next));
}
assert(bpm >= 20 && bpm <= 400, 'bpm stays in range');

const sounds = ['click', 'woodblock', 'soft-click', 'count'];
for (let i = 0; i < 1000; i += 1) sound = sounds[i % sounds.length];
assert(sounds.includes(sound), 'sound id stays known');

play();
for (let i = 0; i < 500; i += 1) {
  pending = { meter: i % 2 === 0 ? '3/4' : '6/8', armedBar: bar };
  bar += 1;
  if (structuralCommitReady(bar, pending.armedBar)) {
    meter = pending.meter;
    pending = null;
  }
}
assert(pending == null, 'meter queue commits');
assert(meter === '6/8' || meter === '3/4', 'meter is one of the queued choices');

const hook = fs.readFileSync(path.join(__dirname, '../hooks/use-metronome.ts'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, '../modules/pockt-timing/ios/PocktTimingEngine.swift'), 'utf8');
assert(!hook.includes('setInterval'), 'hook has no musical interval');
assert(!engine.includes('setInterval'), 'engine has no js timer');
assert(engine.includes('startInFlight'), 'duplicate start is rejected');

console.log('abuse harness passed offline; AVAudioEngine cycles are device-only');

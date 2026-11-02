import { TapTempo } from '../lib/tap-tempo.ts';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function series(bpm, count, jitter = 0, extras = []) {
  const tap = new TapTempo(20, 400);
  const interval = 60000 / bpm;
  let now = 1000;
  let last = null;
  const jumps = [];
  for (let i = 0; i < count; i += 1) {
    const wobble = jitter ? ((i % 2 === 0 ? 1 : -1) * jitter) : 0;
    now += extras[i] ?? interval + wobble;
    last = tap.tap(now);
    if (last != null) jumps.push(last);
  }
  return { last, jumps };
}

const perfect = series(120, 4);
assert(perfect.jumps[0] === 120, 'two taps already say 120');
assert(perfect.last === 120, 'steady 120 stays 120');

const jitter = series(120, 6, 12);
assert(Math.abs(jitter.last - 120) <= 4, `jitter stays near 120, got ${jitter.last}`);

const doubled = new TapTempo();
doubled.tap(0);
doubled.tap(500);
const afterDouble = doubled.tap(580);
assert(afterDouble === 120, `a double tap does not jump, got ${afterDouble}`);
assert(doubled.tap(1000) === 120, 'the series continues at 120');

const missed = new TapTempo();
missed.tap(0);
missed.tap(500);
missed.tap(1000);
const afterMiss = missed.tap(2000);
assert(Math.abs(afterMiss - 120) <= 2, `a missed beat stays near 120, got ${afterMiss}`);

const change = new TapTempo();
change.tap(0);
change.tap(500);
change.tap(1000);
change.tap(1300);
change.tap(1600);
const moved = change.tap(1900);
assert(Math.abs(moved - 200) <= 6, `a new tempo settles near 200, got ${moved}`);

const slow = series(20, 3);
assert(slow.last === 20, 'slow taps reach 20');
const fast = series(400, 4);
assert(Math.abs(fast.last - 400) <= 1, `fast taps reach 400, got ${fast.last}`);

const stale = new TapTempo();
stale.tap(0);
stale.tap(500);
const reset = stale.tap(500 + 5000);
assert(reset == null, 'a stale gap starts over');

const low = new TapTempo();
low.tap(0);
assert(low.tap(4000) === 20, 'below 20 clamps to 20');

console.log('tap tempo vectors passed');

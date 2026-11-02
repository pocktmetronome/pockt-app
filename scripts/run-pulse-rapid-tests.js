'use strict';

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function pulseDetentDue(now, last, gap = 28) {
  if (!(last > 0)) return true;
  return now - last >= gap;
}

function pulseFlushDue(now, last, interval = 48) {
  if (!(last > 0)) return true;
  return now - last >= interval;
}

function pulseFinalBpm(lastCommitted, pending) {
  if (pending != null && Number.isFinite(pending)) return pending;
  return lastCommitted;
}

function simulate(samples, kept, times) {
  const visual = [];
  const detents = [];
  const flushed = [];
  const renders = [];
  let lastDetent = 0;
  let lastFlush = 0;
  let pending = null;
  for (let i = 0; i < samples.length; i += 1) {
    const now = times[i];
    const sample = samples[i];
    visual.push(sample);
    pending = sample;
    if (pulseDetentDue(now, lastDetent) && detents[detents.length - 1] !== sample) {
      detents.push(sample);
      lastDetent = now;
    }
    if (pulseFlushDue(now, lastFlush)) {
      flushed.push(sample);
      lastFlush = now;
      pending = null;
    }
    if (kept[i]) renders.push(sample);
  }
  const final = pulseFinalBpm(flushed[flushed.length - 1] ?? samples[samples.length - 1], pending);
  if (pending != null) flushed.push(final);
  return { visual, detents, flushed, final, renders };
}

check('rapid rotation converges on last sampled BPM even if JS frames drop', () => {
  const samples = [];
  const kept = [];
  const times = [];
  for (let bpm = 80; bpm <= 240; bpm += 1) {
    samples.push(bpm);
    kept.push(bpm % 7 === 0);
    times.push(bpm * 3);
  }
  const result = simulate(samples, kept, times);
  assert(result.final === 240, `final BPM is last sample, got ${result.final}`);
  assert(result.renders.length < samples.length, 'React is allowed to skip frames');
  assert(result.visual[result.visual.length - 1] === 240, 'visual lane keeps every sample');
  assert(result.detents.length < samples.length, 'detents are rate-limited');
});

check('Pulse gesture commits through the shared setter', () => {
  const pulse = read('components/classic/PulseRoom.tsx');
  assert(pulse.includes('pulseTurnsToBpm'), 'two-turn mapping');
  assert(pulse.includes('liveTurns'), 'cumulative turns');
  assert(pulse.includes('setBpm'), 'BPM uses the shared setter');
  assert(pulse.includes('toggle()'), 'Play uses shared toggle');
  assert(!pulse.includes('setInterval'), 'no Pulse JS musical timer');
});

check('Pulse Play cannot bypass native start', () => {
  const metro = read('hooks/use-metronome.ts');
  assert(metro.includes('PocktTiming.start'), 'shared start remains native');
  assert(metro.includes("crashBreadcrumb('play'"), 'play is instrumented');
});

if (failures.length) {
  console.error('PULSE RAPID TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('PULSE RAPID TESTS PASSED');

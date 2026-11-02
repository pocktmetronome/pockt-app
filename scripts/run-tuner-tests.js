'use strict';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const DEFAULT_A4 = 440;
const IN_TUNE_CENTS = 2;
const IN_TUNE_EXIT_CENTS = 3.4;
const MIN_CONFIDENCE = 0.22;
const MIN_RMS = 0.00045;

function midiFromFrequency(frequency, a4 = DEFAULT_A4) {
  return 69 + 12 * Math.log2(frequency / a4);
}

function frequencyFromMidi(midi, a4 = DEFAULT_A4) {
  return a4 * 2 ** ((midi - 69) / 12);
}

function nearestMidi(frequency, a4 = DEFAULT_A4) {
  return Math.round(midiFromFrequency(frequency, a4));
}

function centsFromFrequency(frequency, a4 = DEFAULT_A4) {
  const midi = nearestMidi(frequency, a4);
  return 1200 * Math.log2(frequency / frequencyFromMidi(midi, a4));
}

function noteFromMidi(midi) {
  const rounded = Math.round(midi);
  const index = ((rounded % 12) + 12) % 12;
  return { note: NOTE_NAMES[index], octave: Math.floor(rounded / 12) - 1 };
}

function tunerStateFromCents(cents, previous = 'listening') {
  const abs = Math.abs(cents);
  if (previous === 'in-tune') {
    if (abs <= IN_TUNE_EXIT_CENTS) return 'in-tune';
  } else if (abs <= IN_TUNE_CENTS) {
    return 'in-tune';
  }
  return cents < 0 ? 'flat' : 'sharp';
}

function readingFromFrequency(frequency, confidence, a4 = DEFAULT_A4, previous = 'listening') {
  if (!Number.isFinite(frequency) || frequency < 40 || frequency > 2000) return null;
  if (confidence < MIN_CONFIDENCE) return null;
  const midi = nearestMidi(frequency, a4);
  const named = noteFromMidi(midi);
  const cents = centsFromFrequency(frequency, a4);
  return {
    frequency,
    note: named.note,
    octave: named.octave,
    cents,
    state: tunerStateFromCents(cents, previous),
  };
}

function yin(samples, sampleRate) {
  const count = samples.length;
  let rms = 0;
  for (let i = 0; i < count; i += 1) rms += samples[i] * samples[i];
  rms = Math.sqrt(rms / Math.max(1, count));
  if (rms < MIN_RMS) return { frequency: 0, confidence: 0, rms };
  const half = Math.floor(count / 2);
  const diff = new Array(half).fill(0);
  for (let tau = 1; tau < half; tau += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Array(half).fill(1);
  let running = 0;
  for (let tau = 1; tau < half; tau += 1) {
    running += diff[tau];
    cmnd[tau] = (diff[tau] * tau) / Math.max(1e-12, running);
  }
  const minTau = Math.max(2, Math.floor(sampleRate / 2000));
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / 40));
  let tauEstimate = -1;
  for (let tau = minTau; tau < maxTau; tau += 1) {
    if (cmnd[tau] < 0.12) {
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) return { frequency: 0, confidence: 0, rms };
  const prev = tauEstimate > 0 ? cmnd[tauEstimate - 1] : cmnd[tauEstimate];
  const current = cmnd[tauEstimate];
  const next = tauEstimate + 1 < cmnd.length ? cmnd[tauEstimate + 1] : current;
  const denom = 2 * current - prev - next;
  const refined = Math.abs(denom) < 1e-12 ? tauEstimate : tauEstimate + (next - prev) / (2 * denom);
  return { frequency: sampleRate / refined, confidence: Math.max(0, Math.min(1, 1 - current)), rms };
}

function tone(hz, sampleRate, seconds, harmonics = [1]) {
  const count = Math.floor(sampleRate * seconds);
  const out = new Array(count);
  for (let i = 0; i < count; i += 1) {
    let sample = 0;
    for (let h = 0; h < harmonics.length; h += 1) {
      sample += (1 / harmonics[h]) * Math.sin((2 * Math.PI * hz * harmonics[h] * i) / sampleRate);
    }
    out[i] = sample * 0.35;
  }
  return out;
}

function noise(count, amp) {
  return Array.from({ length: count }, () => (Math.random() * 2 - 1) * amp);
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const RATE = 44100;
const cases = [
  { name: 'E2', hz: 82.4069, note: 'E', octave: 2, cents: 0 },
  { name: 'A2', hz: 110, note: 'A', octave: 2, cents: 0 },
  { name: 'D3', hz: 146.8324, note: 'D', octave: 3, cents: 0 },
  { name: 'G3', hz: 195.9977, note: 'G', octave: 3, cents: 0 },
  { name: 'B3', hz: 246.9417, note: 'B', octave: 3, cents: 0 },
  { name: 'E4', hz: 329.6276, note: 'E', octave: 4, cents: 0 },
  { name: 'G4', hz: 391.9954, note: 'G', octave: 4, cents: 0 },
  { name: 'A4 440', hz: 440, note: 'A', octave: 4, cents: 0 },
  { name: 'A4 445', hz: 445, note: 'A', octave: 4, cents: 19.56 },
];

for (const item of cases) {
  const detected = yin(tone(item.hz, RATE, 0.09, [1, 2, 3]), RATE);
  const reading = readingFromFrequency(detected.frequency, detected.confidence);
  const centsOff = Math.abs((reading?.cents ?? 999) - item.cents);
  const freqErr = Math.abs(detected.frequency - item.hz);
  console.log(
    `  ${item.name}: ${detected.frequency.toFixed(3)} Hz  ${reading?.note}${reading?.octave}  ${reading?.cents.toFixed(2)}¢  conf=${detected.confidence.toFixed(2)}`
  );
  assert(reading && reading.note === item.note && reading.octave === item.octave, `${item.name} note`);
  assert(freqErr < 0.6, `${item.name} freq err ${freqErr}`);
  assert(centsOff < 2.5, `${item.name} cents ${centsOff}`);
}

const silent = yin(new Array(2048).fill(0), RATE);
assert(silent.frequency === 0 && silent.confidence === 0, 'silence must not produce a note');

const air = yin(noise(2048, 0.0008), RATE);
assert(air.frequency === 0, 'low-amplitude noise must not produce a note');

const a4 = readingFromFrequency(440, 0.9);
assert(a4 && a4.state === 'in-tune', 'A4 in tune');
const sharp = readingFromFrequency(445, 0.9);
assert(sharp && sharp.state === 'sharp', '445 Hz is sharp of A4');
const noConf = readingFromFrequency(440, 0.08);
assert(noConf == null, 'low confidence rejected');
const quiet = readingFromFrequency(440, 0.24);
assert(quiet != null, 'quiet-string confidence 0.24 accepted');

const stay = tunerStateFromCents(2.8, 'in-tune');
assert(stay === 'in-tune', 'hysteresis holds in-tune');
const leave = tunerStateFromCents(4.0, 'in-tune');
assert(leave === 'sharp', 'hysteresis exits in-tune');

function createTracker() {
  return {
    lockedMidi: null,
    acquireMidi: null,
    acquireCount: 0,
    switchMidi: null,
    switchCount: 0,
    miss: 0,
    lastGood: null,
  };
}

function nearest(frequency) {
  return Math.round(midiFromFrequency(frequency));
}

function acquire(hz, frames = 3) {
  const tracker = createTracker();
  tracker.lockedMidi = nearest(hz);
  tracker.acquireCount = frames;
  tracker.lastGood = readingFromFrequency(hz, 0.9);
  return tracker;
}

const lockedA = acquire(440);
assert(lockedA.lockedMidi === 69, 'A4 midi lock');
assert(lockedA.lastGood && lockedA.lastGood.note === 'A', 'hold note name');
const neighbor = readingFromFrequency(466.16, 0.4);
assert(neighbor && neighbor.note === 'A#', 'adjacent note exists');
assert(lockedA.lastGood.note !== neighbor.note, 'do not average across identities');

const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'lib/tuner-math.ts'), 'utf8');
assert(src.includes('advanceTunerTracker'), 'note-lock tracker');
assert(src.includes('foldHarmonicFrequency'), 'harmonic fold');
assert(src.includes('HOLD_MS = 280'), 'shorter display hold');
assert(src.includes('SWITCH_FRAMES'), 'switch hysteresis');
assert(src.includes('ACQUIRE_FRAMES = 3'), 'stronger acquire lock');
assert(src.includes('trackingAlpha'), 'adaptive cents tracking');
assert(src.includes('MIN_RMS = 0.00045'), 'quieter string gate');
assert(src.includes('MIN_CONFIDENCE = 0.22'), 'stronger confidence gate');
assert(src.includes('bestErr * 1200 <= 50'), 'do not fold a new string toward the locked note');
assert(src.includes('confidence >= 0.68'), 'strong evidence required to break lock');

if (failures.length) {
  console.error('POCKT tuner tests FAILED');
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('POCKT tuner DSP tests: PASS');

'use strict';

const NOTES = [
  ['E2', 82.4069],
  ['A2', 110],
  ['D3', 146.8324],
  ['G3', 195.9977],
  ['B3', 246.9417],
  ['E4', 329.6276],
  ['A4', 440],
];
const CENTS = [0, -5, 5, -10, 10, -25, 25];
const RATE = 44100;
const N = 4096;

function sine(hz, amp = 0.6) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i += 1) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / RATE);
  return out;
}

function harmonic(hz) {
  const out = new Float32Array(N);
  const parts = [1, 0.55, 0.32, 0.18, 0.1];
  for (let i = 0; i < N; i += 1) {
    let s = 0;
    for (let h = 0; h < parts.length; h += 1) s += parts[h] * Math.sin((2 * Math.PI * hz * (h + 1) * i) / RATE);
    out[i] = s * 0.42;
  }
  return out;
}

function rmsOf(samples) {
  let s = 0;
  for (let i = 0; i < samples.length; i += 1) s += samples[i] * samples[i];
  return Math.sqrt(s / samples.length);
}

function parabolic(arr, tau) {
  const prev = arr[tau - 1] ?? arr[tau];
  const current = arr[tau];
  const next = arr[tau + 1] ?? current;
  const denom = 2 * current - prev - next;
  if (Math.abs(denom) < 1e-12) return tau;
  return tau + (next - prev) / (2 * denom);
}

function oldYin(samples) {
  const n = samples.length;
  const rms = rmsOf(samples);
  if (rms < 1e-6) return { frequency: 0, confidence: 0 };
  const half = Math.floor(n / 2);
  const diff = new Float32Array(half);
  for (let tau = 1; tau < half; tau += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Float32Array(half);
  let running = 0;
  cmnd[0] = 1;
  for (let tau = 1; tau < half; tau += 1) {
    running += diff[tau];
    cmnd[tau] = (diff[tau] * tau) / Math.max(1e-12, running);
  }
  const minTau = Math.max(2, Math.floor(RATE / 2000));
  const maxTau = Math.min(half - 1, Math.floor(RATE / 40));
  let tauEstimate = -1;
  for (let tau = minTau; tau < maxTau; tau += 1) {
    if (cmnd[tau] < 0.12) {
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) return { frequency: 0, confidence: 0 };
  const refined = parabolic(cmnd, tauEstimate);
  return { frequency: RATE / refined, confidence: Math.max(0, 1 - cmnd[tauEstimate]) };
}

function improvedYin(samples) {
  const n = samples.length;
  const rms = rmsOf(samples);
  if (rms < 1e-6) return { frequency: 0, confidence: 0 };
  const half = Math.floor(n / 2);
  const diff = new Float32Array(half);
  for (let tau = 1; tau < half; tau += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Float32Array(half);
  let running = 0;
  cmnd[0] = 1;
  for (let tau = 1; tau < half; tau += 1) {
    running += diff[tau];
    cmnd[tau] = (diff[tau] * tau) / Math.max(1e-12, running);
  }
  const minTau = Math.max(2, Math.floor(RATE / 1400));
  const maxTau = Math.min(half - 1, Math.floor(RATE / 40));
  const dips = [];
  let tauEstimate = -1;
  for (let tau = minTau; tau < maxTau; tau += 1) {
    if (cmnd[tau] < 0.12) {
      while (tau + 1 < maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1;
      if (tauEstimate < 0) tauEstimate = tau;
      dips.push(tau);
      tau += 1;
    }
  }
  if (tauEstimate < 0) return { frequency: 0, confidence: 0 };
  const hz = RATE / tauEstimate;
  if (hz > 720) {
    const halfTau = tauEstimate * 2;
    if (dips.some((tau) => Math.abs(tau - halfTau) / halfTau < 0.08) && hz / 2 >= 70) tauEstimate = halfTau;
  }
  const refined = parabolic(cmnd, tauEstimate);
  return { frequency: RATE / refined, confidence: Math.max(0, 1 - cmnd[tauEstimate]) };
}

function score(detector, cases) {
  let abs = 0;
  let n = 0;
  let octave = 0;
  let miss = 0;
  let maxAbs = 0;
  for (const item of cases) {
    const found = detector(item.samples).frequency;
    if (!(item.hz > 0)) {
      if (found > 0) miss += 1;
      continue;
    }
    if (!(found > 0)) {
      miss += 1;
      continue;
    }
    const cents = 1200 * Math.log2(found / item.hz);
    const oct = Math.log2(found / item.hz);
    if (Math.abs(Math.round(oct)) >= 1 && Math.abs(oct - Math.round(oct)) < 0.08) {
      octave += 1;
      continue;
    }
    abs += Math.abs(cents);
    maxAbs = Math.max(maxAbs, Math.abs(cents));
    n += 1;
  }
  return {
    meanAbsCents: n ? abs / n : 999,
    maxAbsCents: n ? maxAbs : 999,
    octaveErrors: octave,
    misses: miss,
    scored: n,
  };
}

function buildCases() {
  const cases = [];
  for (const [name, hz] of NOTES) {
    for (const cents of CENTS) {
      const shifted = hz * 2 ** (cents / 1200);
      cases.push({ name: `${name} ${cents}c`, hz: shifted, samples: sine(shifted) });
      cases.push({ name: `${name} ${cents}c harm`, hz: shifted, samples: harmonic(shifted) });
    }
    cases.push({ name: `${name} weak`, hz, samples: sine(hz, 0.04) });
  }
  for (let midi = 40; midi <= 76; midi += 1) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    cases.push({ name: `chromatic ${midi}`, hz, samples: sine(hz) });
  }
  cases.push({ name: 'silence', hz: 0, samples: new Float32Array(N) });
  return cases;
}

const cases = buildCases();
const before = score(oldYin, cases);
const after = score(improvedYin, cases);

if (after.meanAbsCents > before.meanAbsCents + 0.5) {
  console.error('TUNER BENCHMARK FAILED: after detector is not better');
  console.error(' before', before);
  console.error(' after', after);
  process.exit(1);
}
if (after.octaveErrors > before.octaveErrors) {
  console.error('TUNER BENCHMARK FAILED: more octave errors after rebuild');
  console.error(' before', before);
  console.error(' after', after);
  process.exit(1);
}

console.log('TUNER BENCHMARK BEFORE', JSON.stringify(before));
console.log('TUNER BENCHMARK AFTER', JSON.stringify(after));
console.log('TUNER BENCHMARK TESTS PASSED');

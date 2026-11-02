/**
 * Instrument-pitch detector. Proven YIN core plus conservative octave correction.
 * Tuner-only — never a musical timer.
 */

export const TUNER_MIN_HZ = 40;
export const TUNER_MAX_HZ = 1400;
export const TUNER_GUITAR_LOW_HZ = 70;
export const TUNER_GUITAR_HIGH_HZ = 720;

export type PitchDetection = {
  frequency: number;
  confidence: number;
  rms: number;
  method: 'mpm' | 'yin' | 'none';
};

function rmsOf(samples: ArrayLike<number>, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += (samples[i] ?? 0) * (samples[i] ?? 0);
  return Math.sqrt(sum / Math.max(1, n));
}

function parabolic(arr: ArrayLike<number>, tau: number): number {
  const prev = arr[tau - 1] ?? arr[tau] ?? 1;
  const current = arr[tau] ?? 1;
  const next = arr[tau + 1] ?? current;
  const denom = 2 * current - prev - next;
  if (Math.abs(denom) < 1e-12) return tau;
  return tau + (next - prev) / (2 * denom);
}

export function yinDetect(
  samples: ArrayLike<number>,
  sampleRate: number,
  threshold = 0.12
): PitchDetection {
  const n = samples.length;
  const rms = rmsOf(samples, n);
  if (n < 64 || rms < 1e-6) return { frequency: 0, confidence: 0, rms, method: 'none' };
  const half = Math.floor(n / 2);
  const diff = new Float32Array(half);
  for (let tau = 1; tau < half; tau += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const d = (samples[i] ?? 0) - (samples[i + tau] ?? 0);
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Float32Array(half);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau < half; tau += 1) {
    running += diff[tau] ?? 0;
    cmnd[tau] = ((diff[tau] ?? 0) * tau) / Math.max(1e-12, running);
  }
  const minTau = Math.max(2, Math.floor(sampleRate / TUNER_MAX_HZ));
  const maxTau = Math.min(half - 1, Math.floor(sampleRate / TUNER_MIN_HZ));
  const dips: number[] = [];
  let tauEstimate = -1;
  for (let tau = minTau; tau < maxTau; tau += 1) {
    const value = cmnd[tau] ?? 1;
    if (value < threshold) {
      while (tau + 1 < maxTau && (cmnd[tau + 1] ?? 1) < value) tau += 1;
      if (tauEstimate < 0) tauEstimate = tau;
      dips.push(tau);
      tau += 1;
    }
  }
  if (tauEstimate < 0) {
    let best = 1;
    let bestTau = -1;
    for (let tau = minTau; tau < maxTau; tau += 1) {
      const value = cmnd[tau] ?? 1;
      if (value < best) {
        best = value;
        bestTau = tau;
      }
    }
    if (best > 0.28 || bestTau < 0) return { frequency: 0, confidence: 0, rms, method: 'none' };
    tauEstimate = bestTau;
    dips.push(bestTau);
  }
  tauEstimate = chooseOctaveTau(tauEstimate, dips, sampleRate, cmnd);
  const refined = parabolic(cmnd, tauEstimate);
  if (refined <= 0) return { frequency: 0, confidence: 0, rms, method: 'none' };
  return {
    frequency: sampleRate / refined,
    confidence: Math.max(0, Math.min(1, 1 - (cmnd[tauEstimate] ?? 1))),
    rms,
    method: 'yin',
  };
}

/**
 * Fold only when the first estimate is above the practical instrument ceiling
 * and a half-frequency dip exists. Never prefer a lower octave of a valid note.
 */
function chooseOctaveTau(bestTau: number, dips: number[], sampleRate: number, _cmnd?: ArrayLike<number>): number {
  const hz = sampleRate / Math.max(1, bestTau);
  if (hz <= TUNER_GUITAR_HIGH_HZ) return bestTau;
  const halfTau = bestTau * 2;
  const hasHalf = dips.some((tau) => Math.abs(tau - halfTau) / Math.max(1, halfTau) < 0.08);
  if (hasHalf && hz / 2 >= TUNER_GUITAR_LOW_HZ) return halfTau;
  return bestTau;
}

export function mpmDetect(samples: ArrayLike<number>, sampleRate: number): PitchDetection {
  const n = samples.length;
  const rms = rmsOf(samples, n);
  if (n < 64 || rms < 1e-6) return { frequency: 0, confidence: 0, rms, method: 'none' };
  const minTau = Math.max(2, Math.floor(sampleRate / TUNER_MAX_HZ));
  const maxTau = Math.min(Math.floor(n / 2) - 2, Math.floor(sampleRate / TUNER_MIN_HZ));
  const nsdf = new Float32Array(maxTau + 2);
  for (let tau = minTau; tau <= maxTau; tau += 1) {
    let ac = 0;
    let m = 0;
    const count = n - tau;
    for (let i = 0; i < count; i += 1) {
      const a = samples[i] ?? 0;
      const b = samples[i + tau] ?? 0;
      ac += a * b;
      m += a * a + b * b;
    }
    nsdf[tau] = (2 * ac) / Math.max(1e-12, m);
  }
  let bestTau = -1;
  let best = 0;
  for (let tau = minTau + 1; tau < maxTau; tau += 1) {
    const value = nsdf[tau] ?? 0;
    if (value > best && value >= (nsdf[tau - 1] ?? 0) && value >= (nsdf[tau + 1] ?? 0)) {
      best = value;
      bestTau = tau;
    }
  }
  if (bestTau < 0 || best < 0.55) return { frequency: 0, confidence: 0, rms, method: 'none' };
  const refined = parabolic(nsdf, bestTau);
  if (refined <= 0) return { frequency: 0, confidence: 0, rms, method: 'none' };
  return {
    frequency: sampleRate / refined,
    confidence: Math.max(0, Math.min(1, best)),
    rms,
    method: 'mpm',
  };
}

export function detectPitch(samples: ArrayLike<number>, sampleRate: number): PitchDetection {
  const yin = yinDetect(samples, sampleRate);
  if (yin.frequency <= 0) return mpmDetect(samples, sampleRate);
  if (yin.frequency <= TUNER_GUITAR_HIGH_HZ) return yin;
  const mpm = mpmDetect(samples, sampleRate);
  if (mpm.frequency > 0 && mpm.frequency < yin.frequency && mpm.frequency >= TUNER_GUITAR_LOW_HZ) {
    const oct = Math.abs(Math.log2(yin.frequency / mpm.frequency));
    if (Math.abs(oct - 1) < 0.08 || Math.abs(oct - 2) < 0.12) {
      return { ...mpm, frequency: mpm.frequency };
    }
  }
  return yin;
}

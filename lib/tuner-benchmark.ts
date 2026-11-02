import { frequencyFromMidi } from '@/lib/tuner-math';
import { detectPitch, yinDetect, type PitchDetection } from '@/lib/tuner-detect';

export const TUNER_BENCH_NOTES = [
  { name: 'E2', hz: 82.4069 },
  { name: 'A2', hz: 110.0 },
  { name: 'D3', hz: 146.8324 },
  { name: 'G3', hz: 195.9977 },
  { name: 'B3', hz: 246.9417 },
  { name: 'E4', hz: 329.6276 },
  { name: 'A4', hz: 440.0 },
] as const;

export const TUNER_BENCH_CENTS = [0, -5, 5, -10, 10, -25, 25] as const;
export const TUNER_BENCH_SAMPLE_RATE = 44100;
export const TUNER_BENCH_FRAMES = 4096;

export type TunerBenchCase = {
  name: string;
  hz: number;
  cents: number;
  kind: 'pure' | 'harmonic' | 'weak' | 'noise' | 'silence';
};

export type TunerBenchRow = {
  name: string;
  expectedHz: number;
  detectedHz: number;
  pitchErrorHz: number;
  centsError: number;
  octaveError: boolean;
  falsePositive: boolean;
  confidence: number;
};

export type TunerBenchSummary = {
  cases: number;
  meanAbsCents: number;
  maxAbsCents: number;
  octaveErrors: number;
  falsePositives: number;
  misses: number;
  latencyFrames: number;
};

function sine(hz: number, n: number, rate: number, amp = 0.6): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / rate);
  return out;
}

function harmonicRich(hz: number, n: number, rate: number): Float32Array {
  const out = new Float32Array(n);
  const parts = [1, 0.55, 0.32, 0.18, 0.1, 0.06];
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    for (let h = 0; h < parts.length; h += 1) {
      s += (parts[h] ?? 0) * Math.sin((2 * Math.PI * hz * (h + 1) * i) / rate);
    }
    out[i] = s * 0.42;
  }
  return out;
}

function mixNoise(signal: Float32Array, amount: number): Float32Array {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i += 1) out[i] = (signal[i] ?? 0) + (Math.random() * 2 - 1) * amount;
  return out;
}

export function shiftedHz(hz: number, cents: number): number {
  return hz * 2 ** (cents / 1200);
}

export function buildTunerBenchCases(): TunerBenchCase[] {
  const cases: TunerBenchCase[] = [];
  for (const note of TUNER_BENCH_NOTES) {
    for (const cents of TUNER_BENCH_CENTS) {
      cases.push({ name: `${note.name} ${cents >= 0 ? '+' : ''}${cents}c`, hz: shiftedHz(note.hz, cents), cents, kind: 'pure' });
      cases.push({
        name: `${note.name} ${cents >= 0 ? '+' : ''}${cents}c harmonic`,
        hz: shiftedHz(note.hz, cents),
        cents,
        kind: 'harmonic',
      });
    }
    cases.push({ name: `${note.name} weak`, hz: note.hz, cents: 0, kind: 'weak' });
  }
  for (let midi = 40; midi <= 76; midi += 1) {
    cases.push({ name: `chromatic ${midi}`, hz: frequencyFromMidi(midi), cents: 0, kind: 'pure' });
  }
  cases.push({ name: 'noise', hz: 0, cents: 0, kind: 'noise' });
  cases.push({ name: 'silence', hz: 0, cents: 0, kind: 'silence' });
  return cases;
}

function bufferFor(testCase: TunerBenchCase): Float32Array {
  const n = TUNER_BENCH_FRAMES;
  const rate = TUNER_BENCH_SAMPLE_RATE;
  if (testCase.kind === 'silence') return new Float32Array(n);
  if (testCase.kind === 'noise') return mixNoise(new Float32Array(n), 0.18);
  if (testCase.kind === 'harmonic') return harmonicRich(testCase.hz, n, rate);
  if (testCase.kind === 'weak') return sine(testCase.hz, n, rate, 0.04);
  return sine(testCase.hz, n, rate);
}

function octaveError(expected: number, detected: number): boolean {
  if (!(expected > 0) || !(detected > 0)) return false;
  const oct = Math.log2(detected / expected);
  const nearest = Math.round(oct);
  return Math.abs(nearest) >= 1 && Math.abs(oct - nearest) < 0.08;
}

export function scoreDetection(testCase: TunerBenchCase, detected: PitchDetection): TunerBenchRow {
  const expected = testCase.hz;
  const hz = detected.frequency;
  const silent = testCase.kind === 'silence' || testCase.kind === 'noise';
  const falsePositive = silent && hz > 0 && detected.confidence >= 0.5;
  const miss = !silent && hz <= 0;
  const centsVsTarget = expected > 0 && hz > 0 ? 1200 * Math.log2(hz / expected) : 0;
  return {
    name: testCase.name,
    expectedHz: expected,
    detectedHz: hz,
    pitchErrorHz: hz - expected,
    centsError: silent || miss ? 0 : centsVsTarget,
    octaveError: !silent && octaveError(expected, hz),
    falsePositive: falsePositive || miss,
    confidence: detected.confidence,
  };
}

export function summarizeTunerBench(rows: TunerBenchRow[]): TunerBenchSummary {
  const pitched = rows.filter((row) => row.expectedHz > 0 && !row.falsePositive && row.detectedHz > 0 && !row.octaveError);
  const abs = pitched.map((row) => Math.abs(row.centsError));
  const mean = abs.length ? abs.reduce((a, b) => a + b, 0) / abs.length : 999;
  return {
    cases: rows.length,
    meanAbsCents: mean,
    maxAbsCents: abs.length ? Math.max(...abs) : 999,
    octaveErrors: rows.filter((row) => row.octaveError).length,
    falsePositives: rows.filter((row) => row.falsePositive).length,
    misses: rows.filter((row) => row.expectedHz > 0 && row.detectedHz <= 0).length,
    latencyFrames: 1,
  };
}

export function runTunerBenchmark(detector: (samples: ArrayLike<number>, sampleRate: number) => PitchDetection) {
  const rows = buildTunerBenchCases().map((testCase) =>
    scoreDetection(testCase, detector(bufferFor(testCase), TUNER_BENCH_SAMPLE_RATE))
  );
  return { rows, summary: summarizeTunerBench(rows) };
}

export function tunerBenchmarkBeforeAfter() {
  return {
    before: runTunerBenchmark(yinDetect),
    after: runTunerBenchmark(detectPitch),
  };
}

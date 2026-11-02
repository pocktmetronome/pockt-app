/** Development-only Whiskey Bar sync recorder. Never rendered in production UI. */

export type BarSyncSample = {
  sequence: number;
  beatIndex: number;
  nativeHostMs: number | null;
  expectedCue: number;
  playerTime: number;
  phaseError: number;
  requestedRate: number;
  effectiveRate: number | null;
  corrected: boolean;
  ready: boolean;
  buffering: boolean;
};

const MAX_SAMPLES = 96;
const samples: BarSyncSample[] = [];
let sequence = 0;

export function barSyncReset(nextSequence?: number): void {
  samples.length = 0;
  if (nextSequence != null) sequence = nextSequence;
  else sequence += 1;
}

export function barSyncSequence(): number {
  return sequence;
}

export function barSyncRecord(sample: Omit<BarSyncSample, 'sequence'>): BarSyncSample | null {
  if (typeof __DEV__ !== 'undefined' && __DEV__ === false) return null;
  const next: BarSyncSample = { ...sample, sequence };
  samples.push(next);
  if (samples.length > MAX_SAMPLES) samples.shift();
  return next;
}

export function barSyncSnapshot(): BarSyncSample[] {
  return samples.slice();
}

export function barSyncMaxAbsError(list = samples): number {
  return list.reduce((max, sample) => Math.max(max, Math.abs(sample.phaseError)), 0);
}

export function barSyncMeanAbsError(list = samples): number {
  if (!list.length) return 0;
  return list.reduce((sum, sample) => sum + Math.abs(sample.phaseError), 0) / list.length;
}

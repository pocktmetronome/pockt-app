/** Pulse rotary commit. Visual BPM is UI-thread live; native tempo is coalesced. */

export const PULSE_NATIVE_FLUSH_MS = 48;
export const PULSE_DETENT_MIN_GAP_MS = 28;

export function pulseShouldCommitStep(next: number, lastCommitted: number): boolean {
  'worklet';
  return Number.isFinite(next) && next !== lastCommitted;
}

export function pulseFlushDue(now: number, lastFlushAt: number, interval = PULSE_NATIVE_FLUSH_MS): boolean {
  'worklet';
  if (!(now >= 0)) return false;
  if (!(lastFlushAt > 0)) return true;
  return now - lastFlushAt >= interval;
}

export function pulseDetentDue(now: number, lastDetentAt: number, gap = PULSE_DETENT_MIN_GAP_MS): boolean {
  'worklet';
  if (!(now >= 0)) return false;
  if (!(lastDetentAt > 0)) return true;
  return now - lastDetentAt >= gap;
}

/**
 * Rapid rotary may drop intermediate JS frames. The final BPM is the last
 * integer the gesture sampled — never the last React render.
 */
export function pulseFinalBpm(lastCommitted: number, pending: number | null): number {
  if (pending != null && Number.isFinite(pending)) return pending;
  return lastCommitted;
}

export function pulseRapidGesturePreservesFinal(
  steps: number[],
  flushed: number[],
  finalCommitted: number
): boolean {
  if (steps.length === 0) return finalCommitted === flushed[flushed.length - 1];
  const intended = steps[steps.length - 1];
  return intended === finalCommitted;
}

export type PulseRotaryLane = 'sample' | 'detent' | 'native-flush' | 'react-render';

/**
 * Rapid rotation with dropped JS frames still converges on the last sampled integer.
 * Gesture samples every pointer event. Detents and native flushes are independent.
 * React renders are allowed to skip.
 */
export function simulatePulseRapidRotation(opts: {
  samples: number[];
  jsFramesKept: boolean[];
  detentGapMs?: number;
  flushMs?: number;
  sampleTimes: number[];
}): { visual: number[]; detents: number[]; flushed: number[]; final: number; reactRenders: number[] } {
  const detentGap = opts.detentGapMs ?? PULSE_DETENT_MIN_GAP_MS;
  const flushMs = opts.flushMs ?? PULSE_NATIVE_FLUSH_MS;
  const visual: number[] = [];
  const detents: number[] = [];
  const flushed: number[] = [];
  const reactRenders: number[] = [];
  let lastVisual = opts.samples[0] ?? 20;
  let lastDetentAt = 0;
  let lastFlushAt = 0;
  let pending: number | null = null;
  for (let i = 0; i < opts.samples.length; i += 1) {
    const now = opts.sampleTimes[i] ?? i;
    const sample = opts.samples[i] ?? lastVisual;
    lastVisual = sample;
    visual.push(sample);
    pending = sample;
    if (pulseDetentDue(now, lastDetentAt, detentGap) && (detents.length === 0 || detents[detents.length - 1] !== sample)) {
      detents.push(sample);
      lastDetentAt = now;
    }
    if (pulseFlushDue(now, lastFlushAt, flushMs)) {
      flushed.push(sample);
      lastFlushAt = now;
      pending = null;
    }
    if (opts.jsFramesKept[i]) reactRenders.push(sample);
  }
  const final = pulseFinalBpm(flushed[flushed.length - 1] ?? lastVisual, pending);
  if (pending != null) flushed.push(final);
  return { visual, detents, flushed, final, reactRenders };
}

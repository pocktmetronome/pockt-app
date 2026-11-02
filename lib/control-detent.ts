/** Manual tempo-control detents. Never tied to the musical scheduler. */

export type DetentDecision = {
  emit: boolean;
  lastEmitAt: number;
};

export function shouldEmitControlDetent(input: {
  dragging: boolean;
  previousBpm: number | null;
  nextBpm: number;
  now: number;
  lastEmitAt: number;
  minGapMs?: number;
}): DetentDecision {
  const minGapMs = input.minGapMs ?? 0;
  if (!input.dragging) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (input.previousBpm == null) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (input.nextBpm === input.previousBpm) return { emit: false, lastEmitAt: input.lastEmitAt };
  if (minGapMs > 0 && input.now - input.lastEmitAt < minGapMs) return { emit: false, lastEmitAt: input.lastEmitAt };
  return { emit: true, lastEmitAt: input.now };
}

export function resolveSmartPendulumCenterHaptic(saved: unknown): boolean {
  return saved === true;
}

export function resolveRigBeatLight(saved: unknown): boolean {
  return saved !== false;
}

export const FACE_TOAST_MS = 760;
export const FACE_TOAST_FADE_MS = 140;

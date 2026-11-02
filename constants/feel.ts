import type { FeelId } from '@/lib/types';

export type FeelVisual = {
  attackMs: number;
  releaseMs: number;
  overshoot: number;
  elasticity: number;
  settleMs: number;
  weight: number;
};

export type FeelPreset = {
  id: FeelId;
  label: string;
  copy: string;
  /**
   * Backbeat delay in milliseconds at 120 BPM.
   * Positive = later (lay back). Negative = earlier (push).
   * Scaled with tempo; never applied to the downbeat.
   */
  backbeatOffsetMsAt120: number;
  /** 0.5 = perfectly even subdivisions. Above 0.5 delays the off-beat. */
  swing: number;
  /** Extra bias on groove-targeted events at 120 BPM. */
  eventBiasMsAt120: number;
  visual: FeelVisual;
};

export const FEEL_DIAL_MAX_MS_AT_120 = 24;
export const MAX_FEEL_OFFSET_RATIO = 0.1;
export const MAX_FEEL_OFFSET_MS = 48;

export const FEEL_PRESETS: Record<FeelId, FeelPreset> = {
  straight: {
    id: 'straight',
    label: 'STRAIGHT',
    copy: 'Exact grid.',
    backbeatOffsetMsAt120: 0,
    swing: 0.5,
    eventBiasMsAt120: 0,
    visual: {
      attackMs: 36,
      releaseMs: 168,
      overshoot: 1.055,
      elasticity: 0.18,
      settleMs: 0,
      weight: 0.35,
    },
  },
  push: {
    id: 'push',
    label: 'PUSH',
    copy: 'Front edge.',
    backbeatOffsetMsAt120: -13,
    swing: 0.484,
    eventBiasMsAt120: -8,
    visual: {
      attackMs: 16,
      releaseMs: 118,
      overshoot: 1.095,
      elasticity: 0.07,
      settleMs: 0,
      weight: 0.26,
    },
  },
  pocket: {
    id: 'pocket',
    label: 'POCKET',
    copy: 'Musical center.',
    backbeatOffsetMsAt120: 11,
    swing: 0.538,
    eventBiasMsAt120: 3,
    visual: {
      attackMs: 56,
      releaseMs: 248,
      overshoot: 1.085,
      elasticity: 0.58,
      settleMs: 42,
      weight: 0.58,
    },
  },
  'laid-back': {
    id: 'laid-back',
    label: 'LAID BACK',
    copy: 'Behind the beat.',
    backbeatOffsetMsAt120: 22,
    swing: 0.522,
    eventBiasMsAt120: 6,
    visual: {
      attackMs: 78,
      releaseMs: 330,
      overshoot: 1.12,
      elasticity: 0.74,
      settleMs: 86,
      weight: 0.84,
    },
  },
  swampy: {
    id: 'swampy',
    label: 'SWAMPY',
    copy: 'Greasy. Heavy. Way back.',
    backbeatOffsetMsAt120: 30,
    swing: 0.642,
    eventBiasMsAt120: 12,
    visual: {
      attackMs: 118,
      releaseMs: 460,
      overshoot: 1.17,
      elasticity: 0.94,
      settleMs: 160,
      weight: 1,
    },
  },
};

export const FEEL_ORDER: FeelId[] = ['straight', 'push', 'pocket', 'laid-back', 'swampy'];

/** Combined native delay score. Positive = later / behind. Negative = earlier / ahead. */
export function feelTimingWeight(id: FeelId): number {
  const preset = FEEL_PRESETS[id];
  return preset.backbeatOffsetMsAt120 + preset.eventBiasMsAt120;
}

/**
 * Symmetric 5-stop pocket scale.
 * Existing presets are asymmetric (3 behind, 1 ahead), so the visible
 * control uses even detents and maps names onto the nearest musical seat.
 *
 * Actual native weights at 120 BPM:
 *   swampy     +42  far behind
 *   laid-back  +28  behind
 *   pocket     +14  maps to LAY BACK (nearest behind seat)
 *   straight     0  exact center
 *   ahead      ~−10 via existing feelDial (no new native feel)
 *   push       −21  far ahead
 */
export type PocketStepId = 'swampy' | 'laid-back' | 'straight' | 'ahead' | 'push';

export type PocketStep = {
  id: PocketStepId;
  label: string;
  feel: FeelId;
  feelDial: number;
};

export const POCKET_STEPS: PocketStep[] = [
  { id: 'swampy', label: 'SWAMPY', feel: 'swampy', feelDial: 0 },
  { id: 'laid-back', label: 'LAY BACK', feel: 'laid-back', feelDial: 0 },
  { id: 'straight', label: 'STRAIGHT', feel: 'straight', feelDial: 0 },
  { id: 'ahead', label: 'AHEAD', feel: 'straight', feelDial: -0.42 },
  { id: 'push', label: 'PUSH', feel: 'push', feelDial: 0 },
];

export const POCKET_STEP_ORDER: PocketStepId[] = POCKET_STEPS.map((step) => step.id);

/** Even visual seats. Straight is index 2 of 5 = exact geometric center. */
export const POCKET_TRACK_POS: number[] = POCKET_STEPS.map(
  (_, index) => index / (POCKET_STEPS.length - 1)
);

export const POCKET_TRACK_POSITIONS: Record<PocketStepId, number> = POCKET_STEPS.reduce(
  (out, step, index) => {
    out[step.id] = POCKET_TRACK_POS[index] ?? 0;
    return out;
  },
  {} as Record<PocketStepId, number>
);

export function pocketStepById(id: PocketStepId): PocketStep {
  return POCKET_STEPS.find((step) => step.id === id) ?? POCKET_STEPS[2]!;
}

export function resolvePocketStep(feel: FeelId, feelDial: number): PocketStepId {
  if (feel === 'swampy') return 'swampy';
  if (feel === 'push') return 'push';
  if (feel === 'laid-back' || feel === 'pocket') return 'laid-back';
  if (feel === 'straight' && feelDial <= -0.2) return 'ahead';
  return 'straight';
}

export function pocketStepPatch(id: PocketStepId): { feel: FeelId; feelDial: number } {
  const step = pocketStepById(id);
  return { feel: step.feel, feelDial: step.feelDial };
}

/** Magnetic snap radius around Straight. Wider than other detents. */
export const STRAIGHT_MAGNET = 0.12;
export const DETENT_MAGNET = 0.055;

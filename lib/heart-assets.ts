export const HEART_CHAMBER = require('@/assets/immersive/heart/layers/heart_chamber_base.png');
export const HEART_MODEL = require('@/assets/immersive/heart/layers/heart_model.png');
export const HEART_VEINS = require('@/assets/immersive/heart/layers/vein_overlay.png');
export const HEART_GLOW = require('@/assets/immersive/heart/layers/volumetric_red_glow.png');
export const HEART_WAVE = require('@/assets/immersive/heart/layers/pulse_wave.png');
export const HEART_PARTICLE = require('@/assets/immersive/heart/layers/particle.png');

export const HEART_PHASES = {
  rest: require('@/assets/immersive/heart/layers/heart_rest.png'),
  precontract: require('@/assets/immersive/heart/layers/heart_precontract.png'),
  contract: require('@/assets/immersive/heart/layers/heart_contract.png'),
  rebound: require('@/assets/immersive/heart/layers/heart_rebound.png'),
  secondary: require('@/assets/immersive/heart/layers/heart_secondary.png'),
  relax: require('@/assets/immersive/heart/layers/heart_relax.png'),
} as const;

export const HEART_PHASE_ORDER = [
  'rest',
  'precontract',
  'contract',
  'rebound',
  'secondary',
  'relax',
] as const;

export type HeartPhaseId = (typeof HEART_PHASE_ORDER)[number];

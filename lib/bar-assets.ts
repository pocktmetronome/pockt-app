/** Whiskey Bar production plates. Components never hardcode these paths. */

export const BAR_OBJECTS = {
  bottle: require('@/assets/skins/bar/objects/whiskey-bottle-v1.png'),
  glass: require('@/assets/skins/bar/objects/rocks-glass-v1.png'),
  jigger: require('@/assets/skins/bar/objects/jigger-v1.png'),
  shaker: require('@/assets/skins/bar/objects/shaker-v1.png'),
} as const;

/** Retired from the live stage. Kept for rollback. */
export const BAR_RETIRED_OBJECTS = {
  coaster: require('@/assets/skins/bar/objects/coaster-v1.png'),
  puck: require('@/assets/skins/bar/objects/tap-puck-v1.png'),
} as const;

export const BAR_TEMPO = require('@/assets/skins/bar/objects/tempo-block-v1.png');

export const BAR_LAYERS = {
  brassLip: require('@/assets/skins/bar/layers/brass-lip-foreground-v1.png'),
  warmLight: require('@/assets/skins/bar/layers/warm-light-overlay-v1.png'),
  brassReflection: require('@/assets/skins/bar/layers/brass-reflection-overlay-v1.png'),
} as const;

/**
 * Character sprite motion is permanently retired.
 * Assets stay on disk. Nothing here may render.
 * Future motion is a single pre-rendered living-scene video.
 */
export const BAR_CHARACTER_MOTION_ENABLED = false;

export const BAR_ACTOR_ENABLED = {
  denim: false,
  center: false,
  blonde: false,
  bartender: false,
} as const;

export const BAR_MOTION = {
  denim: {
    plate: require('@/assets/skins/bar/layers/denim-hand-clean-plate-v3.png'),
    rest: require('@/assets/skins/bar/layers/denim-hand-rest-v3.png'),
    stroke: require('@/assets/skins/bar/layers/denim-hand-tap-v3.png'),
  },
  center: {
    plate: require('@/assets/skins/bar/layers/center-hands-clean-plate-v3.png'),
    rest: require('@/assets/skins/bar/layers/center-hands-rest-v3.png'),
    stroke: require('@/assets/skins/bar/layers/center-hands-tap-v3.png'),
  },
  blonde: {
    plate: require('@/assets/skins/bar/layers/blonde-stir-clean-plate-v3.png'),
    rest: require('@/assets/skins/bar/layers/blonde-spoon-hand-rest-v3.png'),
    stroke: require('@/assets/skins/bar/layers/blonde-spoon-hand-stroke-v3.png'),
  },
  bartender: {
    plate: require('@/assets/skins/bar/layers/bartender-clean-plate-v4.png'),
    rest: require('@/assets/skins/bar/layers/bartender-shaker-rest-v3.png'),
    stroke: require('@/assets/skins/bar/layers/bartender-shaker-stroke-v4.png'),
  },
} as const;

/**
 * Current v3 quantized plate is REJECTED as the ambient living plate:
 * it has baked periodic bartender/spoon/glass/coaster motion and was
 * designed to be time-stretched to BPM. Keep the file for rollback only.
 * Ambient picture is the still plate until a beat-neutral 6–8s loop exists.
 * Beat actions are separate native-clock overlays.
 */
export const BAR_LIVING_SCENE = {
  enabled: false,
  rejected: true,
  stillMode: 'still' as const,
  deterministic: true,
  rhythmicCertified: false,
  quantized: false,
  beatNeutral: false,
  videoPath: 'assets/skins/bar/whiskey-bar-living-v3-quantized.mp4',
  videoModule: require('@/assets/skins/bar/whiskey-bar-living-v3-quantized.mp4'),
  replacementSpec: '6-8s beat-neutral loop, integer frames, 30fps min, no baked actions, no audio',
};

export type BarObjectId = keyof typeof BAR_OBJECTS;
export type BarActorId = keyof typeof BAR_MOTION;

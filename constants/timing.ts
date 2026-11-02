import { familyForSound, pocketSoundForSkin } from '@/constants/sounds';
import { categoryForSkin } from '@/constants/skins';
import { DEFAULT_CUSTOM_LAYOUT } from '@/lib/custom-layout';
import type { MetronomeConfig } from '@/lib/types';

export const MIN_BPM = 1;
export const MAX_BPM = 900;
export const DEFAULT_BPM = 120;

/** Smart Pendulum benchmark family uses a dedicated displayed/control range. */
export const SMART_MIN_BPM = 5;
export const SMART_MAX_BPM = 400;

/** Industrial tap/roller face. Full practical range without the extreme engine edges. */
export const RIG_MIN_BPM = 20;
export const RIG_MAX_BPM = 400;

/** Mechanical face keeps POCKT's practical range; the visual scale is calibrated. */
export const MECHANICAL_MIN_BPM = 20;
export const MECHANICAL_MAX_BPM = 400;

/** Never let NaN, strings, or out-of-range values reach the native clock. */
export function sanitizeBpm(
  value: unknown,
  fallback: number = DEFAULT_BPM,
  min: number = MIN_BPM,
  max: number = MAX_BPM
): number {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  const lo = Number.isFinite(min) ? min : MIN_BPM;
  const hi = Number.isFinite(max) ? max : MAX_BPM;
  if (!Number.isFinite(numeric)) {
    return Math.min(hi, Math.max(lo, Math.round(fallback)));
  }
  return Math.min(hi, Math.max(lo, Math.round(numeric)));
}

export const LOOKAHEAD_MS = 20;
export const LATE_SKIP_MS = 40;
export const TAP_STALE_MS = 3400;
export const TAP_MAX_SAMPLES = 6;

/**
 * Intentional audio dispatch trim relative to the master musical timeline.
 * Positive delays the click. Keep at 0 unless a device needs calibration.
 */
export const AUDIO_LATENCY_COMPENSATION_MS = 0;

/**
 * Base haptic dispatch trim relative to the master musical timeline.
 * Combined with the user-facing Haptic Sync setting.
 * Positive delays the haptic. Default 0 until a device is tuned.
 */
export const HAPTIC_LATENCY_COMPENSATION_MS = 0;

export const HAPTIC_SYNC_MIN_MS = -60;
export const HAPTIC_SYNC_MAX_MS = 60;

export const DEFAULT_CONFIG: MetronomeConfig = {
  bpm: DEFAULT_BPM,
  timeSignature: '4/4',
  subdivision: 'quarter',
  feel: 'straight',
  feelDial: 0,
  soundBank: 'pockt',
  sound: 'pocket',
  soundDownbeat: null,
  soundBeat: null,
  soundSub: null,
  voiceCount: false,
  accentMode: 'auto',
  customAccentSoundId: null,
  recentSounds: [],
  favoriteSounds: [],
  volume: 0.8,
  haptic: false,
  smartPendulumCenterHaptic: false,
  rigBeatLight: true,
  hapticSyncMs: 0,
  visualOffsetMs: 0,
  sensoryMode: 'all',
  clickShift: 0,
  sparseMode: 'all',
  audioRouteClass: 'speaker',
  audioOffsetSpeakerMs: 0,
  audioOffsetWiredMs: 0,
  audioOffsetBluetoothMs: 0,
  accentPattern: ['strong', 'normal', 'normal', 'normal'],
  beatlinePatterns: {},
  backbeat: false,
  lockIn: 'full',
  skin: 'titanium',
  skinCategory: 'classic',
  classicBackdrop: 'beatline',
  customPhotoUri: null,
  customLayout: {
    ...DEFAULT_CUSTOM_LAYOUT,
    background: { ...DEFAULT_CUSTOM_LAYOUT.background },
    widgets: DEFAULT_CUSTOM_LAYOUT.widgets.map((widget) => ({ ...widget })),
  },
  roomVoice: {},
  flashOnBeat: false,
  flashScreenOnBeat: false,
  launchSound: false,
  visualPulse: true,
  visualMotion: 'normal',
  countInBars: 0,
  stereoPan: 'center',
  accentVolume: 1,
  subVolume: 0.72,
  swing: 'straight',
  gapOnBars: 3,
  gapOffBars: 1,
  polyrhythm: 'off',
  polyA: 3,
  polyB: 2,
  largeControls: false,
  oneHanded: false,
  keepAwake: true,
  backgroundPlay: true,
  mixWithOthers: true,
  headphoneDisconnect: 'continue',
  photoMotion: false,
  wheelInvert: false,
  pitchPipeHz: 440,
  hasUserChosenSound: false,
  roomSounds: {},
  hasSeenClassicTutorial: false,
  hasSeenTitaniumTutorial: false,
  hasSeenStudioTutorial: false,
  hasSeenAlteredTutorial: false,
  hasSeenAfterDarkTutorial: false,
  hasSeenHeavyTutorial: false,
  hasSeenRootsTutorial: false,
  hasSeenSundownTutorial: false,
  hasSeenHeartTutorial: false,
};

/** MIX reset keeps the current pocket and restores factory musical defaults. */
export function factoryResetConfig(
  skin: MetronomeConfig['skin'],
  keep: Pick<
    MetronomeConfig,
    | 'skinCategory'
    | 'classicBackdrop'
    | 'customPhotoUri'
    | 'customLayout'
    | 'hasSeenClassicTutorial'
    | 'hasSeenTitaniumTutorial'
    | 'hasSeenStudioTutorial'
    | 'hasSeenAlteredTutorial'
    | 'hasSeenAfterDarkTutorial'
    | 'hasSeenHeavyTutorial'
    | 'hasSeenRootsTutorial'
    | 'hasSeenSundownTutorial'
    | 'hasSeenHeartTutorial'
  >
): MetronomeConfig {
  const sound = pocketSoundForSkin(skin);
  return {
    ...DEFAULT_CONFIG,
    skin,
    soundBank: familyForSound(sound),
    sound,
    hasUserChosenSound: false,
    roomSounds: { [skin]: sound },
    accentPattern: [...DEFAULT_CONFIG.accentPattern],
    ...keep,
  };
}

export function leadTimeMs(hapticSyncMs: number): number {
  return Math.max(
    0,
    -AUDIO_LATENCY_COMPENSATION_MS,
    -(hapticSyncMs + HAPTIC_LATENCY_COMPENSATION_MS)
  );
}

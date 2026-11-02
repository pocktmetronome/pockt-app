import AsyncStorage from '@react-native-async-storage/async-storage';

import { FEEL_ORDER } from '@/constants/feel';
import { SUBDIVISION_ORDER, TIME_SIGNATURE_ORDER } from '@/constants/meter';
import { SOUND_ORDER, SOUNDS_BY_FAMILY, defaultSoundForFamily, familyForSound, pocketSoundForSkin } from '@/constants/sounds';
import {
  DEFAULT_BPM,
  DEFAULT_CONFIG,
  HAPTIC_SYNC_MAX_MS,
  HAPTIC_SYNC_MIN_MS,
  sanitizeBpm,
} from '@/constants/timing';
import {
  BACKBEAT_PATTERN,
  defaultAccentPattern,
  isBackbeatPattern,
  sanitizeAccentPattern,
} from '@/lib/accents';
import type {
  AccentLevel,
  AudioRouteClass,
  ClassicBackdropId,
  CountInBars,
  HeadphoneDisconnect,
  LockInPattern,
  MetronomeConfig,
  PolyrhythmId,
  RoomId,
  SensoryMode,
  SkinId,
  SoundBankId,
  SoundId,
  SparseMode,
  StereoPan,
  SwingAmount,
  TimeSignatureId,
  VisualMotion,
} from '@/lib/types';
import { SKIN_ORDER, categoryForSkin, isSkinCategoryId } from '@/constants/skins';
import { ROOM_ORDER, migrateClassicBackdrop, roomIdFromConfig } from '@/constants/rooms';
import { migrateDisabledExperience } from '@/lib/pockt-experience';
import { migrateRoomVoice } from '@/lib/room-voice';
import { migrateCustomLayout } from '@/lib/custom-layout';
import { sanitizePhotoUri } from '@/lib/photo-uri';
import { sanitizeMasterVolume } from '@/lib/audio-session-policy';

const STORAGE_KEY = 'pockt.settings.v7';
const CUSTOM_LAYOUT_KEY = 'pockt.custom-layout.v3';
const LEGACY_KEYS = [
  'pockt.settings.v6',
  'pockt.settings.v5',
  'pockt.settings.v4',
  'pockt.settings.v3',
  'pockt.settings.v2',
];

const LOCK_IN: LockInPattern[] = [
  'full',
  'two-and-four',
  'one-on-one-off',
  'every-other',
  'two-on-one-off',
  'three-on-one-off',
  'two-on-two-off',
  'four-on-two-off',
  'four-on-four-off',
  'custom',
];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeBpmFromPersist(value: unknown, fallback: number): number {
  // the instrument's range is 20–400; an old or damaged file must not load a tempo no control can reach
  return sanitizeBpm(value, fallback, 20, 400);
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asSkin(value: unknown, category?: MetronomeConfig['skinCategory']): SkinId {
  if (value === 'monitor') return 'studio';
  if (value === 'after-dark') return 'bar';
  if (value === 'heart' || value === 'heavy' || value === 'roots' || value === 'sundown') {
    return category === 'classic' ? 'titanium' : 'studio';
  }
  if ((SKIN_ORDER as readonly string[]).includes(value as string)) {
    return value as SkinId;
  }
  return category === 'immersive' ? 'studio' : 'titanium';
}

function asClassicBackdrop(value: unknown): ClassicBackdropId {
  return migrateClassicBackdrop(value);
}

function asFeel(value: unknown, fallback: MetronomeConfig['feel']): MetronomeConfig['feel'] {
  if (value === 'deep') return 'laid-back';
  if (isOneOf(value, FEEL_ORDER)) return value;
  return fallback;
}

function asMotion(value: unknown): VisualMotion {
  if (value === 'low' || value === 'normal' || value === 'high') return value;
  return 'normal';
}

function asBeatlinePatterns(value: unknown): Partial<Record<TimeSignatureId, AccentLevel[]>> {
  const out: Partial<Record<TimeSignatureId, AccentLevel[]>> = {};
  if (!value || typeof value !== 'object') return out;
  const source = value as Record<string, unknown>;
  for (const id of TIME_SIGNATURE_ORDER) {
    if (source[id] != null) out[id] = sanitizeAccentPattern(source[id], id);
  }
  return out;
}

function asCountIn(value: unknown): CountInBars {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  return 0;
}

function asPan(value: unknown): StereoPan {
  if (value === 'left' || value === 'right') return value;
  return 'center';
}

function asSwing(value: unknown): SwingAmount {
  if (value === 'light' || value === 'medium' || value === 'heavy') return value;
  return 'straight';
}

function asPoly(value: unknown): PolyrhythmId {
  if (
    value === '2:3' ||
    value === '3:2' ||
    value === '3:4' ||
    value === '4:3' ||
    value === '4:5' ||
    value === '5:4' ||
    value === 'custom'
  ) {
    return value;
  }
  return 'off';
}

function asHeadphone(value: unknown): HeadphoneDisconnect {
  return value === 'stop' ? 'stop' : 'continue';
}

function asSensory(value: unknown): SensoryMode {
  if (
    value === 'audio' ||
    value === 'visual' ||
    value === 'haptic' ||
    value === 'audio-visual' ||
    value === 'audio-haptic' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
}

function asSparse(value: unknown): SparseMode {
  if (value === 'downbeats' || value === 'every-2' || value === 'every-4') return value;
  return 'all';
}

function asRoute(value: unknown): AudioRouteClass {
  if (value === 'wired' || value === 'bluetooth') return value;
  return 'speaker';
}

const LEGACY_SOUND: Record<string, SoundId> = {
  classic: 'pockt-default',
  click: 'click',
  wood: 'wood',
  stick: 'stick',
  clave: 'clave',
  pulse: 'pulse',
  kick: 'subkick',
  subkick: 'subkick',
  warm: 'wood',
  studio: 'pockt-studio',
  'pockt-studio': 'pockt-studio',
  altered: 'pockt-altered',
  'pockt-altered': 'pockt-altered',
  'after-dark': 'pockt-after-dark',
  'pockt-after-dark': 'pockt-after-dark',
  pocket: 'pocket',
  'pockt-default': 'pockt-default',
  'pockt-classic': 'pockt-default',
  'pockt-heavy': 'pockt-heavy',
  'pockt-heart': 'pocket',
  heart: 'pocket',
  'pockt-roots': 'wood',
  'pockt-sundown': 'pockt-after-dark',
  heavy: 'pocket',
  roots: 'pocket',
  sundown: 'pocket',
  happy: 'pocket',
  ROOTS: 'pocket',
  SUNDOWN: 'pocket',
  HAPPY: 'pocket',
  'stage-cut': 'stage-cut',
  'stage_cut': 'stage-cut',
  precision: 'precision',
  brass: 'brass',
  tight: 'tight',
  clap: 'clap',
  sharp: 'sharp',
  'digital-click': 'digital-click',
  mechanical: 'mechanical',
  woodblock: 'woodblock',
  rim: 'rim',
  cowbell: 'cowbell',
  beep: 'beep',
  'soft-click': 'soft-click',
  'hard-click': 'hard-click',
  'high-click': 'high-click',
  'low-click': 'low-click',
  'studio-click': 'studio-click',
};

function asSound(value: unknown, fallback: SoundId): SoundId {
  if (typeof value === 'string' && value in LEGACY_SOUND) return LEGACY_SOUND[value];
  if (isOneOf(value, SOUND_ORDER)) return value;
  return fallback;
}

function asRoomVoice(value: unknown): Partial<Record<RoomId, SoundId>> {
  const out: Partial<Record<RoomId, SoundId>> = {};
  if (!value || typeof value !== 'object') return out;
  const source = value as Record<string, unknown>;
  for (const id of ROOM_ORDER) {
    if (source[id] != null) out[id] = asSound(source[id], 'pockt-default');
  }
  return out;
}

function asRoomSounds(value: unknown, skin: SkinId, current: SoundId): Partial<Record<SkinId, SoundId>> {
  const out: Partial<Record<SkinId, SoundId>> = {};
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    for (const id of SKIN_ORDER) {
      if (source[id] != null) out[id] = asSound(source[id], pocketSoundForSkin(id));
    }
  }
  if (!out[skin]) out[skin] = current;
  return out;
}

function asBank(value: unknown, sound: SoundId, fallback: SoundBankId): SoundBankId {
  if (value === 'tools') return asBank('modern', sound, fallback);
  if (value === 'classic' || value === 'pockt' || value === 'modern') {
    if (SOUNDS_BY_FAMILY[value].includes(sound)) return value;
    return familyForSound(sound);
  }
  return familyForSound(sound) ?? fallback;
}

export function sanitizeConfig(raw: unknown): MetronomeConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const defaults = DEFAULT_CONFIG;
  const timeSignature = isOneOf(source.timeSignature, TIME_SIGNATURE_ORDER)
    ? source.timeSignature
    : defaults.timeSignature;

  let lockIn: LockInPattern = isOneOf(source.lockIn, LOCK_IN) ? source.lockIn : defaults.lockIn;
  let backbeat = asBool(source.backbeat, defaults.backbeat);
  if (lockIn === 'two-and-four') {
    lockIn = 'full';
    backbeat = timeSignature === '4/4';
  }

  let accentPattern = sanitizeAccentPattern(source.accentPattern, timeSignature);
  if (!Array.isArray(source.accentPattern)) {
    if (backbeat && timeSignature === '4/4') {
      accentPattern = [...BACKBEAT_PATTERN];
    } else {
      accentPattern = defaultAccentPattern(timeSignature);
    }
  }

  const rawCategory = isSkinCategoryId(source.skinCategory) ? source.skinCategory : undefined;
  const rawSkin = asSkin(source.skin, rawCategory);
  const skinCategory = isSkinCategoryId(source.skinCategory)
    ? source.skinCategory
    : rawSkin === 'classic' || rawSkin === 'titanium'
      ? 'classic'
      : categoryForSkin(rawSkin);
  const classicBackdropRaw = asClassicBackdrop(source.classicBackdrop);
  let skin: SkinId =
    skinCategory === 'classic'
      ? rawSkin === 'classic'
        ? 'classic'
        : 'titanium'
      : rawSkin === 'classic' || rawSkin === 'titanium'
        ? 'studio'
        : rawSkin;
  let persistedCategory: MetronomeConfig['skinCategory'] = skinCategory;
  let classicBackdrop: ClassicBackdropId = classicBackdropRaw;
  const disabledView = migrateDisabledExperience({
    skin,
    skinCategory: persistedCategory,
    classicBackdrop,
  });
  if (disabledView) {
    skin = disabledView.skin;
    persistedCategory = disabledView.skinCategory;
    classicBackdrop = disabledView.classicBackdrop ?? classicBackdrop;
  }
  const customPhotoUri = sanitizePhotoUri(source.customPhotoUri);
  const customLayout = migrateCustomLayout(source.customLayout, customPhotoUri);
  let sound = asSound(source.sound, defaults.sound);
  let soundBank = asBank(source.soundBank, sound, defaults.soundBank);
  let resolvedSound = SOUNDS_BY_FAMILY[soundBank].includes(sound)
    ? sound
    : defaultSoundForFamily(soundBank);

  const hasUserChosenSound =
    typeof source.hasUserChosenSound === 'boolean'
      ? source.hasUserChosenSound
      : resolvedSound !== pocketSoundForSkin(skin);

  const roomSounds = asRoomSounds(source.roomSounds, skin, resolvedSound);

  // Older builds seeded Classic with generic click. That is not an explicit choice.
  if (
    !hasUserChosenSound &&
    (roomSounds.classic === 'click' || roomSounds.titanium === 'click' || (skin === 'titanium' && resolvedSound === 'click'))
  ) {
    const classicSound = pocketSoundForSkin('titanium');
    roomSounds.classic = classicSound;
    roomSounds.titanium = classicSound;
    if (skin === 'titanium') {
      resolvedSound = classicSound;
      soundBank = familyForSound(classicSound);
    }
  }

  return {
    bpm: sanitizeBpmFromPersist(source.bpm, defaults.bpm),
    timeSignature,
    subdivision: isOneOf(source.subdivision, SUBDIVISION_ORDER)
      ? source.subdivision
      : defaults.subdivision,
    feel: asFeel(source.feel, defaults.feel),
    feelDial: clamp(asNumber(source.feelDial, defaults.feelDial), -1, 1),
    soundBank,
    sound: resolvedSound,
    soundDownbeat: source.soundDownbeat == null ? null : asSound(source.soundDownbeat, resolvedSound),
    soundBeat: source.soundBeat == null ? null : asSound(source.soundBeat, resolvedSound),
    soundSub: source.soundSub == null ? null : asSound(source.soundSub, resolvedSound),
    voiceCount: asBool(source.voiceCount, defaults.voiceCount),
    accentMode: source.accentMode === 'custom' ? 'custom' : 'auto',
    customAccentSoundId: isOneOf(source.customAccentSoundId, SOUND_ORDER)
      ? source.customAccentSoundId
      : null,
    recentSounds: Array.isArray(source.recentSounds)
      ? source.recentSounds.filter((item): item is SoundId => isOneOf(item, SOUND_ORDER)).slice(0, 8)
      : [],
    favoriteSounds: Array.isArray(source.favoriteSounds)
      ? source.favoriteSounds.filter((item): item is SoundId => isOneOf(item, SOUND_ORDER)).slice(0, 24)
      : [],
    volume: sanitizeMasterVolume(source.volume, defaults.volume),
    haptic: asBool(source.haptic, defaults.haptic),
    smartPendulumCenterHaptic: source.smartPendulumCenterHaptic === true,
    rigBeatLight: source.rigBeatLight !== false,
    hapticSyncMs: Math.round(
      clamp(asNumber(source.hapticSyncMs, defaults.hapticSyncMs), HAPTIC_SYNC_MIN_MS, HAPTIC_SYNC_MAX_MS)
    ),
    visualOffsetMs: Math.round(
      clamp(asNumber(source.visualOffsetMs, defaults.visualOffsetMs), HAPTIC_SYNC_MIN_MS, HAPTIC_SYNC_MAX_MS)
    ),
    sensoryMode: asSensory(source.sensoryMode),
    clickShift: Math.min(3, Math.max(0, Math.round(asNumber(source.clickShift, 0)))),
    sparseMode: asSparse(source.sparseMode),
    audioRouteClass: asRoute(source.audioRouteClass),
    audioOffsetSpeakerMs: Math.round(
      clamp(asNumber(source.audioOffsetSpeakerMs, 0), HAPTIC_SYNC_MIN_MS, HAPTIC_SYNC_MAX_MS)
    ),
    audioOffsetWiredMs: Math.round(
      clamp(asNumber(source.audioOffsetWiredMs, 0), HAPTIC_SYNC_MIN_MS, HAPTIC_SYNC_MAX_MS)
    ),
    audioOffsetBluetoothMs: Math.round(
      clamp(asNumber(source.audioOffsetBluetoothMs, 0), HAPTIC_SYNC_MIN_MS, HAPTIC_SYNC_MAX_MS)
    ),
    accentPattern,
    beatlinePatterns: asBeatlinePatterns(source.beatlinePatterns),
    backbeat: isBackbeatPattern(accentPattern, timeSignature),
    lockIn,
    skin,
    skinCategory: persistedCategory,
    classicBackdrop,
    customPhotoUri: customLayout.background.type === 'photo' ? customLayout.background.uri : customPhotoUri,
    customLayout,
    roomVoice: migrateRoomVoice(asRoomVoice(source.roomVoice), {
      hasUserChosenSound,
      currentSound: resolvedSound,
      currentRoomId: roomIdFromConfig({ skin, skinCategory: persistedCategory, classicBackdrop }),
    }),
    flashOnBeat: asBool(source.flashOnBeat, defaults.flashOnBeat),
    flashScreenOnBeat: asBool(source.flashScreenOnBeat, defaults.flashScreenOnBeat),
    launchSound: asBool(source.launchSound, defaults.launchSound),
    visualPulse: asBool(source.visualPulse, defaults.visualPulse),
    visualMotion: asMotion(source.visualMotion),
    countInBars: asCountIn(source.countInBars),
    stereoPan: asPan(source.stereoPan),
    accentVolume: clamp(asNumber(source.accentVolume, defaults.accentVolume), 0, 1),
    subVolume: clamp(asNumber(source.subVolume, defaults.subVolume), 0, 1),
    swing: asSwing(source.swing),
    gapOnBars: Math.min(16, Math.max(1, Math.round(asNumber(source.gapOnBars, defaults.gapOnBars)))),
    gapOffBars: Math.min(16, Math.max(0, Math.round(asNumber(source.gapOffBars, defaults.gapOffBars)))),
    polyrhythm: asPoly(source.polyrhythm),
    polyA: Math.min(12, Math.max(2, Math.round(asNumber(source.polyA, defaults.polyA)))),
    polyB: Math.min(12, Math.max(2, Math.round(asNumber(source.polyB, defaults.polyB)))),
    largeControls: asBool(source.largeControls, defaults.largeControls),
    oneHanded: asBool(source.oneHanded, defaults.oneHanded),
    keepAwake: asBool(source.keepAwake, defaults.keepAwake),
    backgroundPlay: asBool(source.backgroundPlay, defaults.backgroundPlay),
    mixWithOthers: asBool(source.mixWithOthers, defaults.mixWithOthers),
    headphoneDisconnect: asHeadphone(source.headphoneDisconnect),
    photoMotion: asBool(source.photoMotion, defaults.photoMotion),
    wheelInvert: asBool(source.wheelInvert, defaults.wheelInvert),
    pitchPipeHz: Math.min(466, Math.max(414, Math.round(asNumber(source.pitchPipeHz, defaults.pitchPipeHz)))),
    hasUserChosenSound,
    roomSounds,
    hasSeenClassicTutorial: asBool(source.hasSeenClassicTutorial, false),
    hasSeenTitaniumTutorial: asBool(source.hasSeenTitaniumTutorial, false),
    hasSeenStudioTutorial: asBool(source.hasSeenStudioTutorial, false),
    hasSeenAlteredTutorial: asBool(source.hasSeenAlteredTutorial, false),
    hasSeenAfterDarkTutorial: asBool(source.hasSeenAfterDarkTutorial, false),
    hasSeenHeavyTutorial: asBool(source.hasSeenHeavyTutorial, false),
    hasSeenRootsTutorial: asBool(source.hasSeenRootsTutorial, false),
    hasSeenSundownTutorial: asBool(source.hasSeenSundownTutorial, false),
    hasSeenHeartTutorial: asBool(source.hasSeenHeartTutorial, false),
  };
}

function migrateLegacyToV7(raw: unknown): MetronomeConfig {
  return {
    ...sanitizeConfig(raw),
    bpm: DEFAULT_BPM,
  };
}

export async function loadSettings(): Promise<MetronomeConfig | null> {
  try {
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = sanitizeConfig(JSON.parse(current) as unknown);
      const sidecar = await AsyncStorage.getItem(CUSTOM_LAYOUT_KEY);
      if (sidecar) {
        try {
          const layout = migrateCustomLayout(JSON.parse(sidecar) as unknown, parsed.customPhotoUri);
          if (layout.widgets.length >= parsed.customLayout.widgets.length) {
            parsed.customLayout = layout;
          }
        } catch {
          /* keep sanitized config layout */
        }
      }
      return parsed;
    }

    for (const key of LEGACY_KEYS) {
      const json = await AsyncStorage.getItem(key);
      if (!json) continue;
      const migrated = migrateLegacyToV7(JSON.parse(json) as unknown);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export async function saveSettings(config: MetronomeConfig): Promise<void> {
  try {
    const safe = {
      ...config,
      volume: Number.isFinite(config.volume) ? Math.min(1, Math.max(0, config.volume)) : DEFAULT_CONFIG.volume,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    await AsyncStorage.setItem(CUSTOM_LAYOUT_KEY, JSON.stringify(safe.customLayout));
  } catch {
    /* ignore */
  }
}

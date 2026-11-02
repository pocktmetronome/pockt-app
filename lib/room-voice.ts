import { WHISKEY_BAR_MIX, type SoundMixPreset } from '@/constants/sound-library';
import { pocketSoundForSkin, resolvePlayableSound, SOUNDS, soundStudioName } from '@/constants/sounds';
import type { MetronomeConfig, RoomId, SoundId } from '@/lib/types';
import { roomIdFromConfig, ROOMS } from '@/constants/rooms';

export const ROOM_DEFAULT_SOUND: Partial<Record<RoomId, SoundId>> = {
  'pendula-classic': 'mechanical',
  'smart-pendulum': 'wood',
  beatline: 'pocket',
  pro: 'digital-click',
  beats: 'beep',
  ledgear: 'beep',
  rig: 'digital-click',
  pulse: 'soft-click',
  dial: 'click',
  customized: 'pocket',
  studio: 'pockt-studio',
  altered: 'pockt-altered',
  'after-dark': 'pockt-after-dark',
  bar: 'bar-thud',
};

export function isImmersiveRoom(id: RoomId): boolean {
  return id === 'studio' || id === 'altered' || id === 'bar';
}

export function resolveRoomVoice(config: MetronomeConfig, roomId?: RoomId): SoundId {
  const id = roomId ?? roomIdFromConfig(config);
  return (
    config.roomVoice?.[id] ??
    ROOM_DEFAULT_SOUND[id] ??
    config.roomSounds?.[ROOMS[id]?.themeSkin ?? config.skin] ??
    pocketSoundForSkin(ROOMS[id]?.themeSkin ?? config.skin)
  );
}

/** Each room uses its own stored voice, or its curated default if it has never been initialized. */
export function resolveRoomEntrySound(config: MetronomeConfig, id: RoomId): SoundId {
  return resolvePlayableSound(config.roomVoice?.[id] ?? ROOM_DEFAULT_SOUND[id] ?? 'pocket', 'pocket');
}

const BAR_SEEDED_DEFAULTS = new Set<SoundId>(['bar-tap', 'bar-metal-tap']);

/** Curated role mix for first entry / default Whiskey Bar voice. */
export function resolveRoomEntryMix(
  config: MetronomeConfig,
  id: RoomId
): Partial<Pick<MetronomeConfig, 'sound' | 'soundDownbeat' | 'soundBeat' | 'soundSub' | 'accentMode' | 'customAccentSoundId'>> | null {
  if (id !== 'bar') return null;
  const stored = config.roomVoice?.[id];
  if (stored != null && !BAR_SEEDED_DEFAULTS.has(stored)) return null;
  return {
    sound: WHISKEY_BAR_MIX.sound,
    soundDownbeat: WHISKEY_BAR_MIX.soundDownbeat ?? WHISKEY_BAR_MIX.sound,
    soundBeat: WHISKEY_BAR_MIX.soundBeat ?? WHISKEY_BAR_MIX.sound,
    soundSub: WHISKEY_BAR_MIX.soundSub ?? null,
    accentMode: 'auto',
    customAccentSoundId: null,
  };
}

/**
 * Preserve existing per-room voices. Seed only the room the user is currently in if they already
 * chose a sound under the legacy global flag. Never copy that choice into unopened rooms.
 */
export function migrateRoomVoice(
  existing: Partial<Record<RoomId, SoundId>>,
  options: { hasUserChosenSound: boolean; currentSound: SoundId; currentRoomId?: RoomId }
): Partial<Record<RoomId, SoundId>> {
  const next: Partial<Record<RoomId, SoundId>> = { ...existing };
  const room = options.currentRoomId;
  if (room && options.hasUserChosenSound && next[room] == null) {
    next[room] = resolvePlayableSound(options.currentSound, 'pocket');
  }
  return next;
}

export function resolveDisplayedSoundPair(
  config: Pick<MetronomeConfig, 'sound' | 'soundDownbeat' | 'soundBeat'>
): { primary: SoundId; secondary: SoundId | null } {
  const primary = resolvePlayableSound(config.sound);
  const beat = config.soundBeat ? resolvePlayableSound(config.soundBeat) : null;
  const down = config.soundDownbeat ? resolvePlayableSound(config.soundDownbeat) : null;
  const secondary = beat && beat !== primary ? beat : down && down !== primary ? down : null;
  return { primary, secondary };
}

export function roomSoundCaption(
  config: Pick<MetronomeConfig, 'sound' | 'soundDownbeat' | 'soundBeat'>
): string {
  const { primary, secondary } = resolveDisplayedSoundPair(config);
  const lead = SOUNDS[primary]?.label ?? primary;
  if (!secondary) return lead;
  return `${lead} + ${SOUNDS[secondary]?.label ?? secondary}`;
}

/** POCKT Mix card subtitle. Must show both active sounds when the pair differs. */
export function mixPresetPairCaption(
  preset: Pick<SoundMixPreset, 'sound' | 'soundDownbeat' | 'soundBeat'>
): string {
  const { primary, secondary } = resolveDisplayedSoundPair({
    sound: preset.sound,
    soundDownbeat: preset.soundDownbeat ?? null,
    soundBeat: preset.soundBeat ?? null,
  });
  const lead = soundStudioName(primary);
  if (!secondary) {
    return preset.sound === 'count' ? `${lead}  ·  sequential 1–12` : lead;
  }
  return `${lead} + ${soundStudioName(secondary)}`;
}

export function studioPairCaption(
  config: Pick<MetronomeConfig, 'sound' | 'soundDownbeat' | 'soundBeat'>
): string {
  const { primary, secondary } = resolveDisplayedSoundPair(config);
  const lead = soundStudioName(primary);
  if (!secondary) return lead;
  return `${lead} + ${soundStudioName(secondary)}`;
}

export function curatedRoomDefaultsAreRegistered(): boolean {
  return Object.values(ROOM_DEFAULT_SOUND).every((id) => Boolean(id && SOUNDS[id]));
}

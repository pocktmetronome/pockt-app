import { rolesForSelectedSound } from '@/constants/sound-library';
import type { SoundId } from '@/lib/types';

export type AccentMode = 'auto' | 'custom';

export function isCountSample(sound: SoundId): boolean {
  return sound === 'count' || /^count-\d+$/.test(sound);
}

export function isCountMode(sound: SoundId): boolean {
  return isCountSample(sound);
}

export function countSampleId(beatIndex: number): SoundId {
  const n = ((Math.max(0, Math.floor(beatIndex)) % 12) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  return `count-${n}` as SoundId;
}

export function resolveAccentPatch(
  sound: SoundId,
  accentMode: AccentMode,
  customAccentSoundId: SoundId | null
): {
  soundBeat: SoundId;
  soundDownbeat: SoundId | null;
  voiceCount: boolean;
  accentMode: AccentMode;
  customAccentSoundId: SoundId | null;
} {
  const custom = accentMode === 'custom' && customAccentSoundId && customAccentSoundId !== sound;
  if (isCountMode(sound)) {
    return {
      soundBeat: 'count',
      soundDownbeat: custom ? customAccentSoundId : null,
      voiceCount: true,
      accentMode,
      customAccentSoundId: accentMode === 'custom' ? customAccentSoundId : null,
    };
  }
  if (custom) {
    return {
      soundBeat: sound,
      soundDownbeat: customAccentSoundId,
      voiceCount: false,
      accentMode: 'custom',
      customAccentSoundId,
    };
  }
  const roles = rolesForSelectedSound(sound);
  return {
    soundBeat: roles.soundBeat,
    soundDownbeat: roles.soundDownbeat,
    voiceCount: false,
    accentMode: 'auto',
    customAccentSoundId: null,
  };
}

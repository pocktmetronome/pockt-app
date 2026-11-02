import { SOUNDS } from '@/constants/sounds';
import type { SoundId, TimeSignatureId } from '@/lib/types';

/** Compact meter for instrument chrome. Grouping suffixes stay off the dock. */
export function instrumentMeterCaption(id: TimeSignatureId): string {
  return id.split('-')[0] ?? id;
}

/** Short sound name for instrument chrome. Reads the live sound catalog. */
export function instrumentSoundCaption(sound: SoundId): string {
  return SOUNDS[sound]?.label ?? String(sound);
}

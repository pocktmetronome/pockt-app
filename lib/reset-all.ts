import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_LIBRARY } from '@/lib/library';
import { DEFAULT_PRACTICE } from '@/lib/practice';
import { DEFAULT_TUNER_PREFS } from '@/storage/tuner-prefs';
import { saveDisplayPrefs } from '@/storage/display-prefs';
import { saveLibrary } from '@/storage/library';
import { savePracticeConfig } from '@/storage/practice';
import { saveTunerPrefs } from '@/storage/tuner-prefs';

export const RESET_ALL_COPY =
  'Reset global, room, sound, haptic, tuner, practice, and display settings. Recordings, setlists, and custom tunings are kept.';

export async function resetPersistedSettings(): Promise<void> {
  await Promise.all([
    saveDisplayPrefs(DEFAULT_DISPLAY_PREFS),
    saveLibrary(DEFAULT_LIBRARY),
    savePracticeConfig(DEFAULT_PRACTICE),
    saveTunerPrefs(DEFAULT_TUNER_PREFS),
  ]);
}

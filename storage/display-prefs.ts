import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_DISPLAY_PREFS,
  migrateAccentSwatch,
  migrateBpmFont,
  migrateBpmSize,
  migrateProView,
  migratePulseSwatch,
  type DisplayPrefs,
} from '@/constants/display';
import { sanitizeHexColor, sanitizeVisualIntensity } from '@/lib/beatline-2';

const STORAGE_KEY = 'pockt.display.v2';
const LEGACY_KEY = 'pockt.display.v1';

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeDisplayPrefs(raw: unknown): DisplayPrefs {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    bpmFont: migrateBpmFont(source.bpmFont),
    bpmSize: migrateBpmSize(source.bpmSize),
    bpmVisible: asBool(source.bpmVisible, DEFAULT_DISPLAY_PREFS.bpmVisible),
    curtainHintSeen: asBool(source.curtainHintSeen, DEFAULT_DISPLAY_PREFS.curtainHintSeen),
    privacyHintSeen: asBool(
      source.privacyHintSeen,
      asBool(source.hasSeenPrivacyHint, DEFAULT_DISPLAY_PREFS.privacyHintSeen)
    ),
    torchHintSeen: asBool(source.torchHintSeen, DEFAULT_DISPLAY_PREFS.torchHintSeen),
    pulseDownbeatColor: migratePulseSwatch(
      source.pulseDownbeatColor === '#F4F6FA' && source.pulseUpbeatColor === '#8A90A8'
        ? DEFAULT_DISPLAY_PREFS.pulseDownbeatColor
        : source.pulseDownbeatColor,
      DEFAULT_DISPLAY_PREFS.pulseDownbeatColor
    ),
    pulseUpbeatColor: migratePulseSwatch(
      source.pulseDownbeatColor === '#F4F6FA' && source.pulseUpbeatColor === '#8A90A8'
        ? DEFAULT_DISPLAY_PREFS.pulseUpbeatColor
        : source.pulseUpbeatColor,
      DEFAULT_DISPLAY_PREFS.pulseUpbeatColor
    ),
    accentColor: migrateAccentSwatch(source.accentColor, DEFAULT_DISPLAY_PREFS.accentColor),
    accentSecondaryColor: migrateAccentSwatch(
      source.accentSecondaryColor === '#E8C56A' && source.accentStrongColor === '#E84838'
        ? DEFAULT_DISPLAY_PREFS.accentSecondaryColor
        : source.accentSecondaryColor,
      DEFAULT_DISPLAY_PREFS.accentSecondaryColor
    ),
    accentStrongColor: migrateAccentSwatch(
      source.accentSecondaryColor === '#E8C56A' && source.accentStrongColor === '#E84838'
        ? DEFAULT_DISPLAY_PREFS.accentStrongColor
        : source.accentStrongColor,
      DEFAULT_DISPLAY_PREFS.accentStrongColor
    ),
    proView: migrateProView(source.proView),
    beatlineDownbeatColor: sanitizeHexColor(source.beatlineDownbeatColor, DEFAULT_DISPLAY_PREFS.beatlineDownbeatColor),
    beatlineAccentColor: sanitizeHexColor(source.beatlineAccentColor, DEFAULT_DISPLAY_PREFS.beatlineAccentColor),
    beatlineVisualIntensity: sanitizeVisualIntensity(
      source.beatlineVisualIntensity,
      DEFAULT_DISPLAY_PREFS.beatlineVisualIntensity
    ),
  };
}

export async function loadDisplayPrefs(): Promise<DisplayPrefs> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) return sanitizeDisplayPrefs(JSON.parse(json) as unknown);
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (!legacy) return DEFAULT_DISPLAY_PREFS;
    const migrated = sanitizeDisplayPrefs(JSON.parse(legacy) as unknown);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return DEFAULT_DISPLAY_PREFS;
  }
}

export async function saveDisplayPrefs(prefs: DisplayPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

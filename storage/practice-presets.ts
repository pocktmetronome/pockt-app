import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizePracticePreset, type PracticePreset } from '@/lib/practice-presets';

const STORAGE_KEY = 'pockt.practice-presets.v1';

export async function loadPracticePresets(): Promise<PracticePreset[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizePracticePreset).filter((item): item is PracticePreset => item != null);
  } catch {
    return [];
  }
}

export async function savePracticePresets(presets: PracticePreset[]): Promise<void> {
  try {
    const clean = presets.map(sanitizePracticePreset).filter((item): item is PracticePreset => item != null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
}

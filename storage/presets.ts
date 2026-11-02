import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizePreset, type ClassicPreset } from '@/lib/presets';

const STORAGE_KEY = 'pockt.presets.v1';

export async function loadPresets(): Promise<ClassicPreset[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizePreset).filter((item): item is ClassicPreset => item != null);
  } catch {
    return [];
  }
}

export async function savePresets(presets: ClassicPreset[]): Promise<void> {
  try {
    const clean = presets.map(sanitizePreset).filter((item): item is ClassicPreset => item != null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_PRACTICE, sanitizePractice, type PracticeConfig } from '@/lib/practice';

const STORAGE_KEY = 'pockt.practice.v1';

export async function loadPracticeConfig(): Promise<PracticeConfig> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_PRACTICE;
    return sanitizePractice(JSON.parse(json) as unknown);
  } catch {
    return DEFAULT_PRACTICE;
  }
}

export async function savePracticeConfig(config: PracticeConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePractice(config)));
  } catch {
    /* ignore */
  }
}

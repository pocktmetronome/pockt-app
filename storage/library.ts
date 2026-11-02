import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LIBRARY, sanitizeLibrary, type LibraryState } from '@/lib/library';

const STORAGE_KEY = 'pockt.library.v1';

export async function loadLibrary(): Promise<LibraryState> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_LIBRARY;
    return sanitizeLibrary(JSON.parse(json) as unknown);
  } catch {
    return DEFAULT_LIBRARY;
  }
}

export async function saveLibrary(state: LibraryState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeLibrary(state)));
  } catch {
    /* ignore */
  }
}

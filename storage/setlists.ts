import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeSetlist, sanitizeSong, type ClassicSetlist, type ClassicSong } from '@/lib/setlists';

const SONG_KEY = 'pockt.songs.v1';
const SETLIST_KEY = 'pockt.setlists.v1';

export async function loadSongs(): Promise<ClassicSong[]> {
  try {
    const json = await AsyncStorage.getItem(SONG_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeSong).filter((item): item is ClassicSong => item != null);
  } catch {
    return [];
  }
}

export async function saveSongs(songs: ClassicSong[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SONG_KEY, JSON.stringify(songs.map(sanitizeSong).filter(Boolean)));
  } catch {
    /* ignore */
  }
}

export async function loadSetlists(): Promise<ClassicSetlist[]> {
  try {
    const json = await AsyncStorage.getItem(SETLIST_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeSetlist).filter((item): item is ClassicSetlist => item != null);
  } catch {
    return [];
  }
}

export async function saveSetlists(setlists: ClassicSetlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SETLIST_KEY, JSON.stringify(setlists.map(sanitizeSetlist).filter(Boolean)));
  } catch {
    /* ignore */
  }
}

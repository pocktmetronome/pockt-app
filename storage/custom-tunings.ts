import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TunerInstrumentId } from '@/lib/tuning-profiles';

const KEY = 'pockt.custom-tunings.v1';

export type CustomTuning = {
  id: string;
  name: string;
  instrument: TunerInstrumentId;
  notes: string[];
};

function sanitizeOne(raw: unknown): CustomTuning | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string' || typeof source.name !== 'string') return null;
  const notes = Array.isArray(source.notes) ? source.notes.filter((n): n is string => typeof n === 'string') : [];
  if (notes.length < 1) return null;
  const instrument =
    source.instrument === 'bass' || source.instrument === 'ukulele' ? source.instrument : 'guitar';
  return { id: source.id, name: source.name, instrument, notes };
}

export function sanitizeCustomTunings(raw: unknown): CustomTuning[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeOne).filter((item): item is CustomTuning => item != null).slice(0, 48);
}

export async function loadCustomTunings(): Promise<CustomTuning[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return [];
    return sanitizeCustomTunings(JSON.parse(json) as unknown);
  } catch {
    return [];
  }
}

export async function saveCustomTunings(tunings: CustomTuning[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(sanitizeCustomTunings(tunings)));
  } catch {
    /* ignore */
  }
}

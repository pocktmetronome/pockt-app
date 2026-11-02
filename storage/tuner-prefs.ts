import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AccidentalPref, HeadstockStyle, TunerInstrumentId, TunerResponse } from '@/lib/tuning-profiles';

const KEY = 'pockt.tuner.v1';

export type TunerPrefs = {
  mode: 'chromatic' | 'strings';
  instrument: TunerInstrumentId;
  profileId: string;
  headstock: HeadstockStyle;
  showFrequency: boolean;
  accidental: AccidentalPref;
  response: TunerResponse;
  a4: number;
};

export const DEFAULT_TUNER_PREFS: TunerPrefs = {
  mode: 'chromatic',
  instrument: 'guitar',
  profileId: 'standard',
  headstock: '3x3',
  showFrequency: false,
  accidental: 'sharps',
  response: 'fast',
  a4: 440,
};

function clampA4(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 440;
  return Math.min(460, Math.max(420, n));
}

export function sanitizeTunerPrefs(raw: unknown): TunerPrefs {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    mode: source.mode === 'strings' ? 'strings' : 'chromatic',
    instrument:
      source.instrument === 'bass' || source.instrument === 'ukulele' ? source.instrument : 'guitar',
    profileId: typeof source.profileId === 'string' ? source.profileId : 'standard',
    headstock: source.headstock === '6inline' ? '6inline' : '3x3',
    showFrequency: source.showFrequency === true,
    accidental: source.accidental === 'flats' ? 'flats' : 'sharps',
    response: source.response === 'fast' ? 'fast' : 'stable',
    a4: clampA4(source.a4),
  };
}

export async function loadTunerPrefs(): Promise<TunerPrefs> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return DEFAULT_TUNER_PREFS;
    return sanitizeTunerPrefs(JSON.parse(json) as unknown);
  } catch {
    return DEFAULT_TUNER_PREFS;
  }
}

export async function saveTunerPrefs(prefs: TunerPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(sanitizeTunerPrefs(prefs)));
  } catch {
    /* ignore */
  }
}

export async function resetTunerPrefs(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULT_TUNER_PREFS));
  } catch {
    /* ignore */
  }
}

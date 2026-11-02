/**
 * Saved practice setups: six slots, each a whole configuration (tempo, meter, subdivision, accents,
 * sound, swing, practice settings). Kept on the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { MetronomeConfig } from '@/lib/types';

export const PRESET_KEYS = [
  'bpm',
  'timeSignature',
  'subdivision',
  'feel',
  'accentPattern',
  'backbeat',
  'soundBank',
  'sound',
  'soundDownbeat',
  'soundBeat',
  'soundSub',
  'accentMode',
  'customAccentSoundId',
  'voiceCount',
  'swing',
  'lockIn',
  'polyrhythm',
  'countInBars',
  'volume',
  'accentVolume',
  'subVolume',
] as const satisfies readonly (keyof MetronomeConfig)[];

export type PresetConfig = Partial<Pick<MetronomeConfig, (typeof PRESET_KEYS)[number]>>;
export type PresetTrainer = { on: boolean; step: number; every: number; target: number };
export type Preset = { config: PresetConfig; trainer?: PresetTrainer; savedAt: number };
export const PRESET_SLOTS = 6;

const KEY = 'pockt.presets.v1';

export function capturePreset(config: MetronomeConfig, trainer?: PresetTrainer): Preset {
  const out: Record<string, unknown> = {};
  for (const k of PRESET_KEYS) {
    const v = config[k];
    if (v !== undefined) out[k] = Array.isArray(v) ? [...v] : v;
  }
  return { config: out as PresetConfig, trainer: trainer ? { ...trainer } : undefined, savedAt: Date.now() };
}

export function usePresets() {
  const [slots, setSlots] = useState<(Preset | null)[]>(() => Array(PRESET_SLOTS).fill(null));
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!live || !raw) return;
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSlots(Array.from({ length: PRESET_SLOTS }, (_, i) => (arr[i] && typeof arr[i] === 'object' && arr[i].config ? (arr[i] as Preset) : null)));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const write = useCallback((next: (Preset | null)[]) => {
    setSlots(next);
    void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);
  const save = useCallback((i: number, p: Preset) => write(slots.map((s, k) => (k === i ? p : s))), [slots, write]);
  const clear = useCallback((i: number) => write(slots.map((s, k) => (k === i ? null : s))), [slots, write]);
  const move = useCallback(
    (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= PRESET_SLOTS) return;
      const next = slots.slice();
      [next[i], next[j]] = [next[j], next[i]];
      write(next);
    },
    [slots, write]
  );
  return { slots, save, clear, move };
}

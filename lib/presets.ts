import { migrateAccentSwatch, type AccentSwatch, type DisplayPrefs } from '@/constants/display';
import { SUBDIVISION_ORDER, TIME_SIGNATURE_ORDER } from '@/constants/meter';
import { isSoundId } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { sanitizeAccentPattern } from '@/lib/accents';
import type { AccentLevel, CountInBars, MetronomeConfig, SoundId, SubdivisionId, TimeSignatureId } from '@/lib/types';

export type ClassicPreset = {
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  sound: SoundId;
  volume: number;
  haptic: boolean;
  flashOnBeat: boolean;
  flashScreenOnBeat: boolean;
  accentColor: AccentSwatch;
  countInBars: CountInBars;
  createdAt: number;
};

export function snapshotPreset(name: string, config: MetronomeConfig, accentColor: AccentSwatch): ClassicPreset {
  const trimmed = name.trim().slice(0, 32) || defaultPresetName(config);
  return {
    id: `preset-${Date.now()}-${Math.round(Math.random() * 9999)}`,
    name: trimmed,
    bpm: sanitizeBpm(config.bpm),
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    accentPattern: sanitizeAccentPattern(config.accentPattern, config.timeSignature),
    sound: config.sound,
    volume: Math.min(1, Math.max(0, config.volume)),
    haptic: config.haptic,
    flashOnBeat: config.flashOnBeat,
    flashScreenOnBeat: config.flashScreenOnBeat,
    accentColor: migrateAccentSwatch(accentColor),
    countInBars: config.countInBars,
    createdAt: Date.now(),
  };
}

export function presetToPatch(preset: ClassicPreset): Partial<MetronomeConfig> {
  return {
    bpm: sanitizeBpm(preset.bpm),
    timeSignature: preset.timeSignature,
    subdivision: preset.subdivision,
    accentPattern: sanitizeAccentPattern(preset.accentPattern, preset.timeSignature),
    sound: preset.sound,
    volume: Math.min(1, Math.max(0, preset.volume)),
    haptic: preset.haptic,
    flashOnBeat: preset.flashOnBeat,
    flashScreenOnBeat: preset.flashScreenOnBeat,
    countInBars: preset.countInBars,
  };
}

export function presetPrefsPatch(preset: ClassicPreset): Partial<DisplayPrefs> {
  return { accentColor: migrateAccentSwatch(preset.accentColor) };
}

export function sanitizePreset(raw: unknown): ClassicPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id) return null;
  const timeSignature = TIME_SIGNATURE_ORDER.includes(source.timeSignature as TimeSignatureId)
    ? (source.timeSignature as TimeSignatureId)
    : '4/4';
  const subdivision = SUBDIVISION_ORDER.includes(source.subdivision as SubdivisionId)
    ? (source.subdivision as SubdivisionId)
    : 'quarter';
  if (!isSoundId(source.sound)) return null;
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 32) : 'Preset';
  return {
    id: source.id,
    name,
    bpm: sanitizeBpm(source.bpm),
    timeSignature,
    subdivision,
    accentPattern: sanitizeAccentPattern(source.accentPattern, timeSignature),
    sound: source.sound,
    volume: Math.min(1, Math.max(0, typeof source.volume === 'number' ? source.volume : 0.8)),
    haptic: source.haptic !== false,
    flashOnBeat: source.flashOnBeat === true,
    flashScreenOnBeat: source.flashScreenOnBeat === true,
    accentColor: migrateAccentSwatch(source.accentColor),
    countInBars: source.countInBars === 1 || source.countInBars === 2 || source.countInBars === 3 || source.countInBars === 4 ? source.countInBars : 0,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
  };
}

export function defaultPresetName(config: MetronomeConfig): string {
  return `${Math.round(config.bpm)} ${config.timeSignature}`;
}

import { SOUND_CATEGORIES } from '@/constants/sound-library';
import { P2 } from '@/constants/pockt-2';
import { familyForSound, isEnabledDisplaySound, SOUND_ORDER, SOUNDS } from '@/constants/sounds';
import { resolveAccentPatch } from '@/lib/accent-sound';
import { roomIdFromConfig } from '@/constants/rooms';
import type { AccentLevel, MetronomeConfig, SoundId, TimeSignatureId } from '@/lib/types';

export const BEATLINE_DOWNBEAT_DEFAULT = P2.signal;
export const BEATLINE_ACCENT_DEFAULT = '#8B95D4';
export const BEATLINE_VISUAL_INTENSITY_DEFAULT = 1;

export const BEATLINE_SWATCHES = [
  P2.signal,
  '#8B95D4',
  '#E8EAED',
  '#E0C07A',
  '#E24B4B',
  '#9B7ED9',
  '#7EC8FF',
  '#5AD4A0',
] as const;

export const BEATLINE_METER_PRESETS = ['2/4', '3/4', '4/4', '6/8', '12/8'] as const;

export const BEATLINE_SUBDIVISIONS = ['quarter', 'eighths', 'triplet', 'sixteenths', 'dotted'] as const;

export type BeatlineBrowserCategory = 'classic' | 'digital' | 'drums' | 'wood' | 'voice' | 'synth' | 'percussion';

export const BEATLINE_BROWSER_CATEGORIES: { id: BeatlineBrowserCategory; label: string; source: string }[] = [
  { id: 'classic', label: 'CLASSIC', source: 'classic' },
  { id: 'digital', label: 'DIGITAL', source: 'digital' },
  { id: 'drums', label: 'DRUM', source: 'drums' },
  { id: 'wood', label: 'WOOD', source: 'wood' },
  { id: 'voice', label: 'VOICE', source: 'voice' },
  { id: 'synth', label: 'SYNTH', source: 'synth' },
  { id: 'percussion', label: 'PERCUSSION', source: 'percussion' },
];

export type BeatlineSoundFilter = 'all' | 'favorites' | 'recent';
export type BeatlineSoundPick = 'metronome' | 'downbeat' | 'accent';
export type BeatlineColorTarget = 'downbeat' | 'accent';

export type BeatlineScreen =
  | { name: 'main' }
  | { name: 'rhythm' }
  | { name: 'other-meters' }
  | { name: 'sound' }
  | { name: 'sound-browser'; filter: BeatlineSoundFilter; pick: BeatlineSoundPick }
  | { name: 'settings' }
  | { name: 'beat-accent' }
  | { name: 'beat-assignment' }
  | { name: 'color-picker'; target: BeatlineColorTarget }
  | { name: 'custom-color'; target: BeatlineColorTarget };

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}

export function sanitizeHexColor(value: unknown, fallback: string): string {
  if (!isHexColor(value)) return fallback;
  return `#${value.replace('#', '').slice(0, 6).toUpperCase()}`;
}

export function sanitizeVisualIntensity(value: unknown, fallback = BEATLINE_VISUAL_INTENSITY_DEFAULT): number {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return { r: 61, g: 255, b: 122 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, s));
  const val = Math.min(1, Math.max(0, v));
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d > 0.0001) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max <= 0 ? 0 : d / max, v: max };
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
}

/** Latest coalesced integer wins. Null pending means the last committed value is already flushed. */
export function beatlineFlushPending(pending: number | null, lastCommitted: number): number {
  if (pending != null && Number.isFinite(pending)) return pending;
  return lastCommitted;
}

const SLIDER_THUMB = 22;

/** Relative slider mapping. Vertical invert matches a bottom-origin fill. */
export function beatlineSliderValue(
  origin: number,
  translation: number,
  track: number,
  vertical: boolean,
  thumb = SLIDER_THUMB
): number {
  'worklet';
  const span = Math.max(1, track - thumb);
  const delta = vertical ? -translation / span : translation / span;
  const next = origin + delta;
  if (!Number.isFinite(next)) return Math.min(1, Math.max(0, origin));
  return Math.min(1, Math.max(0, next));
}

export function beatlineSoundCatalog(): SoundId[] {
  return SOUND_ORDER.filter(isEnabledDisplaySound);
}

export function soundsForBeatlineCategory(id: BeatlineBrowserCategory): SoundId[] {
  const source = BEATLINE_BROWSER_CATEGORIES.find((item) => item.id === id)?.source;
  const group = SOUND_CATEGORIES.find((item) => item.id === source);
  const ids = group?.sounds ?? [];
  return ids.filter(isEnabledDisplaySound);
}

export function nearbySounds(current: SoundId, catalog: SoundId[]): SoundId[] {
  const index = Math.max(0, catalog.indexOf(current));
  const prev = catalog[(index - 1 + catalog.length) % catalog.length];
  const next = catalog[(index + 1) % catalog.length];
  return [prev ?? current, current, next ?? current];
}

export function stepSound(current: SoundId, delta: number, catalog: SoundId[]): SoundId {
  if (catalog.length === 0) return current;
  const index = catalog.indexOf(current);
  const start = index >= 0 ? index : 0;
  const next = (start + delta + catalog.length * 8) % catalog.length;
  return catalog[next] ?? current;
}

export function soundTitle(id: SoundId): string {
  return SOUNDS[id]?.label ?? id;
}

export function applyMetronomeSound(config: MetronomeConfig, sound: SoundId): Partial<MetronomeConfig> {
  const roles = resolveAccentPatch(sound, config.accentMode, config.customAccentSoundId);
  const room = roomIdFromConfig(config);
  return {
    sound,
    soundBank: familyForSound(sound),
    hasUserChosenSound: true,
    ...roles,
    soundSub: null,
    recentSounds: [sound, ...config.recentSounds.filter((id) => id !== sound)].slice(0, 8),
    roomVoice: { ...config.roomVoice, [room]: sound },
  };
}

export function toggleFavoriteSound(favorites: SoundId[], id: SoundId): SoundId[] {
  return favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites].slice(0, 24);
}

export function downbeatAccentOn(pattern: AccentLevel[]): boolean {
  return (pattern[0] ?? 'normal') === 'strong' || pattern[0] === 'accent';
}

export function patternWithDownbeatAccent(pattern: AccentLevel[], on: boolean): AccentLevel[] {
  if (pattern.length === 0) return pattern;
  const next = [...pattern];
  next[0] = on ? 'strong' : next[0] === 'mute' ? 'mute' : 'normal';
  return next;
}

export function beatColor(index: number, strength: number, downbeat: string, accent: string): string {
  'worklet';
  if (strength < 0.5) return 'transparent';
  if (index === 0) return downbeat;
  if (strength >= 2.5) return accent;
  return downbeat;
}

export function strengthFill(strength: number, intensity: number): number {
  'worklet';
  const t = Math.min(3, Math.max(0, strength));
  let base = 0;
  if (t <= 0) base = 0;
  else if (t < 1) base = 0.38 * t;
  else if (t < 2) base = 0.38 + 0.34 * (t - 1);
  else if (t < 3) base = 0.72 + 0.28 * (t - 2);
  else base = 1;
  return base * Math.min(1, Math.max(0, intensity));
}

export function beatlineMeterCaption(id: TimeSignatureId): string {
  const raw = (id.split('-')[0] ?? id).split('/');
  return `${raw[0] ?? '4'} / ${raw[1] ?? '4'}`;
}

export function beatlineSoundCaption(label: string): string {
  const word = (label.split(/[\s/-]+/)[0] ?? label).trim();
  return (word || label).toUpperCase();
}

export function strengthDotRatio(strength: number): number {
  'worklet';
  const t = Math.min(3, Math.max(0, strength));
  if (t <= 0) return 0;
  if (t < 1) return 0.28 * t;
  if (t < 2) return 0.28 + 0.24 * (t - 1);
  if (t < 3) return 0.52 + 0.26 * (t - 2);
  return 0.78;
}

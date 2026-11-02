import { isRoomId } from '@/constants/rooms';
import { SUBDIVISION_ORDER, TIME_SIGNATURE_ORDER } from '@/constants/meter';
import { isSoundId } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { sanitizeAccentPattern } from '@/lib/accents';
import { roomToConfigPatch } from '@/constants/rooms';
import type { AccentLevel, CountInBars, MetronomeConfig, RoomId, SoundId, SubdivisionId, TimeSignatureId } from '@/lib/types';

export type ClassicSong = {
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  sound: SoundId;
  volume: number;
  notes: string;
  room: RoomId | null;
  countInBars: CountInBars;
  createdAt: number;
  updatedAt: number;
};

export type ClassicSetlist = {
  id: string;
  name: string;
  songIds: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export function snapshotSong(name: string, config: MetronomeConfig, notes = ''): ClassicSong {
  const now = Date.now();
  return {
    id: `song-${now}-${Math.round(Math.random() * 9999)}`,
    name: name.trim().slice(0, 48) || `${Math.round(config.bpm)} ${config.timeSignature}`,
    bpm: sanitizeBpm(config.bpm),
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    accentPattern: sanitizeAccentPattern(config.accentPattern, config.timeSignature),
    sound: config.sound,
    volume: Math.min(1, Math.max(0, config.volume)),
    notes: notes.trim().slice(0, 160),
    room: null,
    countInBars: config.countInBars,
    createdAt: now,
    updatedAt: now,
  };
}

export function songToPatch(song: ClassicSong): Partial<MetronomeConfig> {
  return {
    bpm: sanitizeBpm(song.bpm),
    timeSignature: song.timeSignature,
    subdivision: song.subdivision,
    accentPattern: sanitizeAccentPattern(song.accentPattern, song.timeSignature),
    sound: song.sound,
    volume: Math.min(1, Math.max(0, song.volume)),
    countInBars: song.countInBars,
    ...(song.room ? roomToConfigPatch(song.room) : {}),
  };
}

export function sanitizeSong(raw: unknown): ClassicSong | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id) return null;
  if (!isSoundId(source.sound)) return null;
  const timeSignature = TIME_SIGNATURE_ORDER.includes(source.timeSignature as TimeSignatureId)
    ? (source.timeSignature as TimeSignatureId)
    : '4/4';
  const subdivision = SUBDIVISION_ORDER.includes(source.subdivision as SubdivisionId)
    ? (source.subdivision as SubdivisionId)
    : 'quarter';
  return {
    id: source.id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 48) : 'Song',
    bpm: sanitizeBpm(source.bpm),
    timeSignature,
    subdivision,
    accentPattern: sanitizeAccentPattern(source.accentPattern, timeSignature),
    sound: source.sound,
    volume: Math.min(1, Math.max(0, typeof source.volume === 'number' ? source.volume : 0.8)),
    notes: typeof source.notes === 'string' ? source.notes.slice(0, 160) : '',
    room: typeof source.room === 'string' && isRoomId(source.room) ? source.room : null,
    countInBars: source.countInBars === 1 || source.countInBars === 2 || source.countInBars === 3 || source.countInBars === 4 ? source.countInBars : 0,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now(),
  };
}

export function sanitizeSetlist(raw: unknown): ClassicSetlist | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (typeof source.id !== 'string' || !source.id) return null;
  return {
    id: source.id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim().slice(0, 48) : 'Setlist',
    songIds: Array.isArray(source.songIds) ? source.songIds.filter((id): id is string => typeof id === 'string') : [],
    notes: typeof source.notes === 'string' ? source.notes.slice(0, 160) : '',
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now(),
  };
}

export function duplicateSong(song: ClassicSong): ClassicSong {
  const now = Date.now();
  return { ...song, id: `song-${now}-${Math.round(Math.random() * 9999)}`, name: `${song.name} copy`.slice(0, 48), createdAt: now, updatedAt: now };
}

export function duplicateSetlist(setlist: ClassicSetlist): ClassicSetlist {
  const now = Date.now();
  return { ...setlist, id: `set-${now}-${Math.round(Math.random() * 9999)}`, name: `${setlist.name} copy`.slice(0, 48), createdAt: now, updatedAt: now };
}

export function moveSong(ids: string[], from: number, to: number): string[] {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function matchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

export function sortByName<T extends { name: string }>(items: T[], alpha: boolean): T[] {
  if (!alpha) return items;
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function exportSetlistText(setlist: ClassicSetlist, songs: ClassicSong[]): string {
  const rows = setlist.songIds
    .map((id, index) => {
      const song = songs.find((item) => item.id === id);
      if (!song) return null;
      return `${index + 1}. ${song.name} — ${song.bpm} ${song.timeSignature} ${song.subdivision}`;
    })
    .filter(Boolean);
  return [`POCKT setlist: ${setlist.name}`, ...rows].join('\n');
}

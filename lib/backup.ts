import { sanitizeLibrary, type LibraryState } from '@/lib/library';
import { sanitizePractice, type PracticeConfig } from '@/lib/practice';
import { sanitizePracticePreset, type PracticePreset } from '@/lib/practice-presets';
import { sanitizePreset, type ClassicPreset } from '@/lib/presets';
import { sanitizeSetlist, sanitizeSong, type ClassicSetlist, type ClassicSong } from '@/lib/setlists';
import { sanitizeConfig } from '@/storage/persist';
import type { MetronomeConfig } from '@/lib/types';

export const BACKUP_VERSION = 1 as const;

export type PocktBackup = {
  format: 'pockt.library.v1';
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  settings?: MetronomeConfig;
  library?: LibraryState;
  practice?: PracticeConfig;
  practicePresets?: PracticePreset[];
  presets?: ClassicPreset[];
  songs?: ClassicSong[];
  setlists?: ClassicSetlist[];
};

export function makeBackup(input: {
  settings: MetronomeConfig;
  library: LibraryState;
  practice: PracticeConfig;
  practicePresets: PracticePreset[];
  presets: ClassicPreset[];
  songs: ClassicSong[];
  setlists: ClassicSetlist[];
}): PocktBackup {
  return {
    format: 'pockt.library.v1',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    settings: sanitizeConfig(input.settings),
    library: sanitizeLibrary(input.library),
    practice: sanitizePractice(input.practice),
    practicePresets: input.practicePresets.map(sanitizePracticePreset).filter((item): item is PracticePreset => item != null),
    presets: input.presets.map(sanitizePreset).filter((item): item is ClassicPreset => item != null),
    songs: input.songs.map(sanitizeSong).filter((item): item is ClassicSong => item != null),
    setlists: input.setlists.map(sanitizeSetlist).filter((item): item is ClassicSetlist => item != null),
  };
}

export type BackupImport = {
  ok: boolean;
  error?: string;
  data?: PocktBackup;
};

export function parseBackup(raw: unknown): BackupImport {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Not a POCKT backup file.' };
  const source = raw as Record<string, unknown>;
  if (source.format !== 'pockt.library.v1') return { ok: false, error: 'Unrecognized backup format.' };
  if (typeof source.version !== 'number') return { ok: false, error: 'Missing backup version.' };
  try {
    return {
      ok: true,
      data: {
        format: 'pockt.library.v1',
        version: BACKUP_VERSION,
        exportedAt: typeof source.exportedAt === 'number' ? source.exportedAt : Date.now(),
        settings: source.settings ? sanitizeConfig(source.settings) : undefined,
        library: source.library ? sanitizeLibrary(source.library) : undefined,
        practice: source.practice ? sanitizePractice(source.practice) : undefined,
        practicePresets: Array.isArray(source.practicePresets)
          ? source.practicePresets.map(sanitizePracticePreset).filter((item): item is PracticePreset => item != null)
          : undefined,
        presets: Array.isArray(source.presets)
          ? source.presets.map(sanitizePreset).filter((item): item is ClassicPreset => item != null)
          : undefined,
        songs: Array.isArray(source.songs)
          ? source.songs.map(sanitizeSong).filter((item): item is ClassicSong => item != null)
          : undefined,
        setlists: Array.isArray(source.setlists)
          ? source.setlists.map(sanitizeSetlist).filter((item): item is ClassicSetlist => item != null)
          : undefined,
      },
    };
  } catch {
    return { ok: false, error: 'Backup could not be read.' };
  }
}

export function mergeLists<T extends { id: string }>(current: T[], incoming: T[], replace: boolean): T[] {
  if (replace) return incoming;
  const seen = new Set(current.map((item) => item.id));
  const next = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) {
      const index = next.findIndex((row) => row.id === item.id);
      if (index >= 0) next[index] = item;
    } else {
      next.push(item);
    }
  }
  return next;
}

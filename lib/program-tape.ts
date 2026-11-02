import { sanitizeAccentPattern } from '@/lib/accents';
import { sanitizeBpm } from '@/constants/timing';
import type { AccentLevel, MetronomeConfig, SubdivisionId, TimeSignatureId } from '@/lib/types';

export type TapeEvent = {
  t: number;
  kind: 'bpm' | 'timeSignature' | 'subdivision' | 'accents' | 'play' | 'stop';
  bpm?: number;
  timeSignature?: TimeSignatureId;
  subdivision?: SubdivisionId;
  accentPattern?: AccentLevel[];
};

export type TapeSnapshot = {
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  playing: boolean;
};

export type ProgramTape = {
  initial: TapeSnapshot;
  events: TapeEvent[];
  durationMs: number;
};

export function snapshotTape(config: Pick<MetronomeConfig, 'bpm' | 'timeSignature' | 'subdivision' | 'accentPattern'>, playing: boolean): TapeSnapshot {
  return {
    bpm: sanitizeBpm(config.bpm),
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    accentPattern: sanitizeAccentPattern(config.accentPattern, config.timeSignature),
    playing,
  };
}

export function snapshotToPatch(snapshot: TapeSnapshot): Partial<MetronomeConfig> {
  return {
    bpm: snapshot.bpm,
    timeSignature: snapshot.timeSignature,
    subdivision: snapshot.subdivision,
    accentPattern: snapshot.accentPattern,
  };
}

export function eventToPatch(event: TapeEvent): Partial<MetronomeConfig> | null {
  if (event.kind === 'bpm' && event.bpm != null) return { bpm: sanitizeBpm(event.bpm) };
  if (event.kind === 'timeSignature' && event.timeSignature) return { timeSignature: event.timeSignature };
  if (event.kind === 'subdivision' && event.subdivision) return { subdivision: event.subdivision };
  if (event.kind === 'accents' && event.accentPattern) {
    return { accentPattern: event.accentPattern };
  }
  return null;
}

export function sameSnapshot(a: TapeSnapshot, b: TapeSnapshot): boolean {
  return (
    a.bpm === b.bpm &&
    a.timeSignature === b.timeSignature &&
    a.subdivision === b.subdivision &&
    a.playing === b.playing &&
    a.accentPattern.length === b.accentPattern.length &&
    a.accentPattern.every((level, index) => level === b.accentPattern[index])
  );
}

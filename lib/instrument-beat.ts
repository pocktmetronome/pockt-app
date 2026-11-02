import { TIME_SIGNATURES } from '@/constants/meter';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

export type BeatGroup = {
  start: number;
  length: number;
};

export function beatGroupsFor(timeSignature: TimeSignatureId): BeatGroup[] {
  const meter = TIME_SIGNATURES[timeSignature];
  const count = meter?.beatsPerMeasure ?? 4;
  const grouping = meter?.grouping;
  if (grouping) {
    const parts = grouping.split('+').map((n) => Math.max(1, Number(n) || 1));
    const groups: BeatGroup[] = [];
    let start = 0;
    for (const length of parts) {
      if (start >= count) break;
      const clipped = Math.min(length, count - start);
      groups.push({ start, length: clipped });
      start += clipped;
    }
    if (start < count) groups.push({ start, length: count - start });
    return groups;
  }
  if (timeSignature === '6/8') return [{ start: 0, length: 3 }, { start: 3, length: 3 }];
  if (timeSignature === '12/8') {
    return [
      { start: 0, length: 3 },
      { start: 3, length: 3 },
      { start: 6, length: 3 },
      { start: 9, length: 3 },
    ];
  }
  if (count === 6) return [{ start: 0, length: 3 }, { start: 3, length: 3 }];
  if (count === 12) {
    return [
      { start: 0, length: 3 },
      { start: 3, length: 3 },
      { start: 6, length: 3 },
      { start: 9, length: 3 },
    ];
  }
  return [{ start: 0, length: count }];
}

export const BEAT_ACCENT_STATES: { level: AccentLevel; label: string; caption: string }[] = [
  { level: 'mute', label: 'MUTE', caption: 'NO BEAT' },
  { level: 'soft', label: 'SOFT', caption: 'MEDIUM' },
  { level: 'normal', label: 'BEAT', caption: 'NORMAL' },
  { level: 'strong', label: 'STRONG', caption: 'ACCENT' },
];

export function beatRoleLabel(level: AccentLevel, isDownbeat: boolean): string {
  if (level === 'mute') return 'MUTE';
  if (level === 'strong') return isDownbeat ? 'DOWN' : 'STRONG';
  if (level === 'soft') return 'SOFT';
  if (isDownbeat) return 'DOWN';
  return 'BEAT';
}

/** Rest-state bubble diameter. Size encodes accent so color is not the only cue. */
export function beatBubbleSize(level: AccentLevel, isDownbeat: boolean, compact = false): number {
  const base =
    level === 'mute' ? 8 : level === 'soft' ? 11 : level === 'strong' || level === 'accent' ? 18 : 14;
  const grown = isDownbeat ? base + 3 : base;
  return compact ? Math.max(8, grown - 1) : grown;
}

export function cycleAccentLevel(level: AccentLevel): AccentLevel {
  if (level === 'strong') return 'normal';
  if (level === 'normal') return 'mute';
  return 'strong';
}

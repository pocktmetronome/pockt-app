import { TIME_SIGNATURES } from '@/constants/meter';
import { cycleBeatBlock, defaultAccentPattern, sanitizeAccentPattern } from '@/lib/accents';
import type { AccentLevel, CountInBars, TimeSignatureId } from '@/lib/types';

export type BeatlinePatternMemory = Partial<Record<TimeSignatureId, AccentLevel[]>>;

export type BeatlineRailLayout = {
  count: number;
  indexes: number[];
  groups: number[][];
  groupStarts: number[];
  grouped: boolean;
  bead: number;
  startBead: number;
  innerGap: number;
  groupGap: number;
  slot: number;
  halo: number;
};

export function beatlineVisibleIndexes(meter: TimeSignatureId): number[] {
  const beats = TIME_SIGNATURES[meter]?.beatsPerMeasure ?? 4;
  return Array.from({ length: beats }, (_, index) => index);
}

/** Locked visual group starts only. Does not collapse displayed beats. */
export function beatlineGroupStarts(meter: TimeSignatureId): number[] {
  if (meter === '6/8') return [0, 3];
  if (meter === '12/8') return [0, 3, 6, 9];
  return [0];
}

export function beatlineGroups(meter: TimeSignatureId): number[][] {
  const indexes = beatlineVisibleIndexes(meter);
  const starts = beatlineGroupStarts(meter);
  if (starts.length <= 1) return [indexes];
  return starts.map((start, i) => indexes.slice(start, starts[i + 1] ?? indexes.length));
}

/**
 * Four hardware socket centers as fractions of the master rail overlay.
 * The rail slot is locked so these land on the clean-master sockets.
 */
export const BEATLINE_RAIL_SOCKETS = [0.125, 0.375, 0.625, 0.875] as const;

export type BeatlineRailSeat = {
  index: number;
  x: number;
  kind: 'full' | 'cluster';
};

/** Designed seats for the four physical sockets. Not space-evenly. */
export function beatlineRailSeats(meter: TimeSignatureId): BeatlineRailSeat[] {
  const [a, b, c, d] = BEATLINE_RAIL_SOCKETS;
  if (meter === '2/4') {
    return [
      { index: 0, x: a, kind: 'full' },
      { index: 1, x: d, kind: 'full' },
    ];
  }
  if (meter === '3/4') {
    return [
      { index: 0, x: a, kind: 'full' },
      { index: 1, x: (b + c) / 2, kind: 'full' },
      { index: 2, x: d, kind: 'full' },
    ];
  }
  if (meter === '4/4') {
    return BEATLINE_RAIL_SOCKETS.map((x, index) => ({ index, x, kind: 'full' as const }));
  }
  if (meter === '6/8') {
    const left = (a + b) / 2;
    const right = (c + d) / 2;
    const spread = (b - a) * 0.32;
    return [0, 1, 2]
      .map((inner) => ({ index: inner, x: left + (inner - 1) * spread, kind: 'cluster' as const }))
      .concat(
        [0, 1, 2].map((inner) => ({
          index: inner + 3,
          x: right + (inner - 1) * spread,
          kind: 'cluster' as const,
        }))
      );
  }
  if (meter === '12/8') {
    const spread = (b - a) * 0.22;
    return BEATLINE_RAIL_SOCKETS.flatMap((socket, group) =>
      [0, 1, 2].map((inner) => ({
        index: group * 3 + inner,
        x: socket + (inner - 1) * spread,
        kind: 'cluster' as const,
      }))
    );
  }
  const count = Math.max(1, beatlineVisibleIndexes(meter).length);
  if (count === 1) return [{ index: 0, x: (a + d) / 2, kind: 'full' }];
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: a + ((d - a) * index) / (count - 1),
    kind: 'full' as const,
  }));
}

export function beatlineRailLayout(meter: TimeSignatureId): BeatlineRailLayout {
  const indexes = beatlineVisibleIndexes(meter);
  const groups = beatlineGroups(meter);
  const groupStarts = beatlineGroupStarts(meter);
  const count = indexes.length;
  const grouped = groups.length > 1;
  let bead = 34;
  if (count >= 12) bead = grouped ? 20 : 22;
  else if (count >= 8) bead = 26;
  else if (count >= 6) bead = grouped ? 28 : 30;
  const startBead = grouped ? bead + 2 : bead;
  const innerGap = grouped ? (count >= 12 ? 2 : 4) : 0;
  const groupGap = grouped ? (count >= 12 ? 12 : 18) : 0;
  const slot = startBead + (grouped ? innerGap : 6);
  const halo = grouped && count >= 12 ? startBead + 8 : startBead + 12;
  return { count, indexes, groups, groupStarts, grouped, bead, startBead, innerGap, groupGap, slot, halo };
}

/** Master-skin beads must stay readable inside the locked groove. */
export function beatlineMasterBeadScale(count: number): number {
  if (count >= 12) return 0.74;
  if (count >= 6) return 0.58;
  return 0.52;
}

export function beatlineDisplayedBeat(nativeBeat: number, meter: TimeSignatureId): number {
  const count = Math.max(1, beatlineVisibleIndexes(meter).length);
  return ((Math.round(nativeBeat) % count) + count) % count;
}

/** Worklet-safe one-to-one: every native beat lights its own visible node. */
export function beatlineBeadIsCurrent(nativeBeat: number, displayIndex: number, beatCount: number): boolean {
  'worklet';
  const beats = Math.max(1, beatCount);
  return ((Math.round(nativeBeat) % beats) + beats) % beats === displayIndex;
}

export function beatlineCycleBeat(
  pattern: AccentLevel[],
  meter: TimeSignatureId,
  index: number
): AccentLevel[] {
  const nativeLength = TIME_SIGNATURES[meter]?.beatsPerMeasure ?? pattern.length;
  const next = Array.from({ length: nativeLength }, (_, slot) => pattern[slot] ?? 'normal');
  if (index < 0 || index >= next.length) return next;
  next[index] = cycleBeatBlock(next[index] ?? 'normal');
  return next;
}

export function rememberBeatlinePattern(
  memory: BeatlinePatternMemory,
  meter: TimeSignatureId,
  pattern: AccentLevel[]
): BeatlinePatternMemory {
  return { ...memory, [meter]: pattern.slice() };
}

export function loadBeatlinePattern(memory: BeatlinePatternMemory, meter: TimeSignatureId): AccentLevel[] {
  const saved = memory[meter];
  const expected = TIME_SIGNATURES[meter]?.beatsPerMeasure ?? 0;
  if (Array.isArray(saved) && saved.length === expected) {
    return sanitizeAccentPattern(saved, meter);
  }
  return defaultAccentPattern(meter);
}

export function switchBeatlineMeter(
  prevMeter: TimeSignatureId,
  nextMeter: TimeSignatureId,
  livePattern: AccentLevel[],
  memory: BeatlinePatternMemory
): {
  timeSignature: TimeSignatureId;
  accentPattern: AccentLevel[];
  beatlinePatterns: BeatlinePatternMemory;
} {
  if (prevMeter === nextMeter) {
    return {
      timeSignature: nextMeter,
      accentPattern: livePattern.slice(),
      beatlinePatterns: memory,
    };
  }
  const saved = rememberBeatlinePattern(memory, prevMeter, livePattern);
  return {
    timeSignature: nextMeter,
    accentPattern: loadBeatlinePattern(saved, nextMeter),
    beatlinePatterns: saved,
  };
}

export function resetBeatlineMeterPattern(
  meter: TimeSignatureId,
  memory: BeatlinePatternMemory
): { accentPattern: AccentLevel[]; beatlinePatterns: BeatlinePatternMemory } {
  const accentPattern = defaultAccentPattern(meter);
  return {
    accentPattern,
    beatlinePatterns: rememberBeatlinePattern(memory, meter, accentPattern),
  };
}

/** Beatline only offers 0/1/2. Do not display 3 or 4 as if they were 2. */
export function beatlineCountInChoice(countInBars: CountInBars | number): '0' | '1' | '2' | 'legacy' {
  if (countInBars === 0) return '0';
  if (countInBars === 1) return '1';
  if (countInBars === 2) return '2';
  return 'legacy';
}

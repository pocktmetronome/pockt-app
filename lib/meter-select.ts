import { TIME_SIGNATURES } from '@/constants/meter';
import type { TimeSignatureId } from '@/lib/types';

export const METER_PRESETS: TimeSignatureId[] = [
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '6/8',
  '7/8',
  '9/8',
  '12/8',
];

export const METER_NUMERATORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
export const METER_DENOMINATORS = [2, 4, 8, 16] as const;

export type MeterDenominator = (typeof METER_DENOMINATORS)[number];
export type MeterGroupingId = 'none' | '5-23' | '5-32' | '5q-23' | '5q-32' | '7-223' | '7-232' | '7-322' | '9-333' | '9-2223' | '9-3222';

export type MeterParts = {
  beats: number;
  denominator: MeterDenominator;
  grouping: MeterGroupingId;
};

const GROUPED: Record<string, TimeSignatureId> = {
  '5/4-23': '5/4-23',
  '5/4-32': '5/4-32',
  '5/8-23': '5/8-23',
  '5/8-32': '5/8-32',
  '7/8-223': '7/8-223',
  '7/8-232': '7/8-232',
  '7/8-322': '7/8-322',
  '9/8-333': '9/8-333',
  '9/8-2223': '9/8-2223',
  '9/8-3222': '9/8-3222',
};

export function parseMeterParts(id: TimeSignatureId): MeterParts {
  if (id === '5/4-23') return { beats: 5, denominator: 4, grouping: '5q-23' };
  if (id === '5/4-32' || id === '5/4') return { beats: 5, denominator: 4, grouping: '5q-32' };
  if (id === '5/8-23') return { beats: 5, denominator: 8, grouping: '5-23' };
  if (id === '5/8-32' || id === '5/8') return { beats: 5, denominator: 8, grouping: '5-32' };
  if (id === '7/8-223' || id === '7/8') return { beats: 7, denominator: 8, grouping: '7-223' };
  if (id === '7/8-232') return { beats: 7, denominator: 8, grouping: '7-232' };
  if (id === '7/8-322') return { beats: 7, denominator: 8, grouping: '7-322' };
  if (id === '9/8-2223') return { beats: 9, denominator: 8, grouping: '9-2223' };
  if (id === '9/8-3222') return { beats: 9, denominator: 8, grouping: '9-3222' };
  if (id === '9/8-333' || id === '9/8') return { beats: 9, denominator: 8, grouping: '9-333' };
  const core = (id.split('-')[0] ?? id).split('/');
  const beats = Math.max(1, Math.min(16, Number(core[0]) || 4));
  const rawDen = Number(core[1]) || 4;
  const denominator = (METER_DENOMINATORS.includes(rawDen as MeterDenominator) ? rawDen : 4) as MeterDenominator;
  return { beats, denominator, grouping: 'none' };
}

export function groupingsFor(beats: number, denominator: MeterDenominator): { id: MeterGroupingId; label: string }[] {
  if (beats === 5 && denominator === 4) {
    return [
      { id: '5q-23', label: '2+3' },
      { id: '5q-32', label: '3+2' },
    ];
  }
  if (beats === 5 && denominator === 8) {
    return [
      { id: '5-23', label: '2+3' },
      { id: '5-32', label: '3+2' },
    ];
  }
  if (beats === 7 && denominator === 8) {
    return [
      { id: '7-223', label: '2+2+3' },
      { id: '7-232', label: '2+3+2' },
      { id: '7-322', label: '3+2+2' },
    ];
  }
  if (beats === 9 && denominator === 8) {
    return [
      { id: '9-333', label: '3+3+3' },
      { id: '9-2223', label: '2+2+2+3' },
      { id: '9-3222', label: '3+2+2+2' },
    ];
  }
  return [];
}

export function resolveMeterId(parts: MeterParts): TimeSignatureId | null {
  const beats = Math.max(1, Math.min(16, Math.round(parts.beats)));
  const den = parts.denominator;
  if (beats === 5 && den === 4) {
    if (parts.grouping === '5q-23') return '5/4-23';
    return '5/4-32';
  }
  if (beats === 5 && den === 8) {
    if (parts.grouping === '5-23') return '5/8-23';
    return '5/8-32';
  }
  if (beats === 7 && den === 8) {
    if (parts.grouping === '7-232') return '7/8-232';
    if (parts.grouping === '7-322') return '7/8-322';
    return '7/8-223';
  }
  if (beats === 9 && den === 8) {
    if (parts.grouping === '9-2223') return '9/8-2223';
    if (parts.grouping === '9-3222') return '9/8-3222';
    return '9/8';
  }
  const id = `${beats}/${den}` as TimeSignatureId;
  return TIME_SIGNATURES[id] ? id : null;
}

export function isSupportedMeterCombo(beats: number, denominator: MeterDenominator): boolean {
  return resolveMeterId({ beats, denominator, grouping: 'none' }) != null || groupingsFor(beats, denominator).length > 0;
}

export function meterDisplayLabel(id: TimeSignatureId): string {
  return TIME_SIGNATURES[id]?.label ?? id.split('-')[0] ?? id;
}

export function groupedIds(): TimeSignatureId[] {
  return Object.values(GROUPED);
}

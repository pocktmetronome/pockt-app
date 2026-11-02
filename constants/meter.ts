import type { LockInPattern, SubdivisionId, TimeSignatureId } from '@/lib/types';

export type TimeSignatureDef = {
  id: TimeSignatureId;
  label: string;
  beatsPerMeasure: number;
  accentBeats: number[];
  backbeatBeats: number[];
  supportsBackbeat: boolean;
  grouping?: string;
};

function meter(
  id: TimeSignatureId,
  beats: number,
  accentBeats: number[],
  backbeatBeats: number[] = [],
  grouping?: string
): TimeSignatureDef {
  return {
    id,
    label: grouping ? `${id.split('-')[0]} ${grouping}` : id.split('-')[0] ?? id,
    beatsPerMeasure: beats,
    accentBeats,
    backbeatBeats,
    supportsBackbeat: beats === 4 && id.endsWith('/4'),
    grouping,
  };
}

export const TIME_SIGNATURES: Record<TimeSignatureId, TimeSignatureDef> = {
  '1/4': meter('1/4', 1, [0]),
  '2/4': meter('2/4', 2, [0], [1]),
  '3/4': meter('3/4', 3, [0], [1]),
  '4/4': meter('4/4', 4, [0], [1, 3]),
  '5/4': meter('5/4', 5, [0, 3], [3], '3+2'),
  '5/4-32': meter('5/4-32', 5, [0, 3], [3], '3+2'),
  '5/4-23': meter('5/4-23', 5, [0, 2], [2], '2+3'),
  '6/4': meter('6/4', 6, [0, 3], [3]),
  '7/4': meter('7/4', 7, [0, 4], [3]),
  '8/4': meter('8/4', 8, [0, 4], [3, 7]),
  '9/4': meter('9/4', 9, [0, 3, 6], [3, 6]),
  '10/4': meter('10/4', 10, [0, 4, 8], [3, 7]),
  '11/4': meter('11/4', 11, [0, 4, 8], [3, 7]),
  '12/4': meter('12/4', 12, [0, 4, 8], [3, 7, 11]),
  '13/4': meter('13/4', 13, [0, 4, 8], [3, 7, 11]),
  '14/4': meter('14/4', 14, [0, 4, 8], [3, 7, 11]),
  '15/4': meter('15/4', 15, [0, 5, 10], [4, 9]),
  '16/4': meter('16/4', 16, [0, 4, 8, 12], [3, 7, 11, 15]),
  '1/2': meter('1/2', 1, [0]),
  '2/2': meter('2/2', 2, [0], [1]),
  '3/2': meter('3/2', 3, [0], [1]),
  '4/2': meter('4/2', 4, [0], [1, 3]),
  '5/2': meter('5/2', 5, [0], [1, 3]),
  '6/2': meter('6/2', 6, [0, 3], [3]),
  '8/2': meter('8/2', 8, [0, 4], [3, 7]),
  '1/8': meter('1/8', 1, [0]),
  '2/8': meter('2/8', 2, [0], [1]),
  '3/8': meter('3/8', 3, [0]),
  '4/8': meter('4/8', 4, [0], [2]),
  '5/8': meter('5/8', 5, [0, 3], [3], '3+2'),
  '5/8-23': meter('5/8-23', 5, [0, 2], [2], '2+3'),
  '5/8-32': meter('5/8-32', 5, [0, 3], [3], '3+2'),
  '6/8': meter('6/8', 6, [0, 3], [3]),
  '7/8': meter('7/8', 7, [0, 2, 4], [4], '2+2+3'),
  '7/8-223': meter('7/8-223', 7, [0, 2, 4], [4], '2+2+3'),
  '7/8-232': meter('7/8-232', 7, [0, 2, 5], [5], '2+3+2'),
  '7/8-322': meter('7/8-322', 7, [0, 3, 5], [3], '3+2+2'),
  '8/8': meter('8/8', 8, [0, 3, 6], [3, 6]),
  '9/8': meter('9/8', 9, [0, 3, 6], [3, 6], '3+3+3'),
  '9/8-333': meter('9/8-333', 9, [0, 3, 6], [3, 6], '3+3+3'),
  '9/8-2223': meter('9/8-2223', 9, [0, 2, 4, 6], [2, 6], '2+2+2+3'),
  '9/8-3222': meter('9/8-3222', 9, [0, 3, 5, 7], [3, 7], '3+2+2+2'),
  '10/8': meter('10/8', 10, [0, 3, 6], [3, 7]),
  '11/8': meter('11/8', 11, [0, 3, 6, 8], [3, 8]),
  '12/8': meter('12/8', 12, [0, 3, 6, 9], [3, 9]),
  '13/8': meter('13/8', 13, [0, 3, 6, 9], [3, 8]),
  '14/8': meter('14/8', 14, [0, 3, 6, 9], [3, 9]),
  '15/8': meter('15/8', 15, [0, 3, 6, 9, 12], [3, 9]),
  '16/8': meter('16/8', 16, [0, 4, 8, 12], [3, 7, 11]),
  '1/16': meter('1/16', 1, [0]),
  '2/16': meter('2/16', 2, [0], [1]),
  '3/16': meter('3/16', 3, [0]),
  '4/16': meter('4/16', 4, [0], [2]),
  '5/16': meter('5/16', 5, [0, 3], [3]),
  '6/16': meter('6/16', 6, [0, 3], [3]),
  '7/16': meter('7/16', 7, [0, 2, 4], [4]),
  '8/16': meter('8/16', 8, [0, 4], [3, 7]),
  '9/16': meter('9/16', 9, [0, 3, 6], [3, 6]),
  '10/16': meter('10/16', 10, [0, 3, 6], [3, 7]),
  '11/16': meter('11/16', 11, [0, 3, 6, 8], [3, 8]),
  '12/16': meter('12/16', 12, [0, 3, 6, 9], [3, 9]),
  '13/16': meter('13/16', 13, [0, 3, 6, 9], [3, 8]),
  '14/16': meter('14/16', 14, [0, 3, 6, 9], [3, 9]),
  '15/16': meter('15/16', 15, [0, 3, 6, 9, 12], [3, 9]),
  '16/16': meter('16/16', 16, [0, 4, 8, 12], [3, 7, 11]),
};

export const TIME_SIGNATURE_ORDER: TimeSignatureId[] = [
  '1/4',
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '5/4-32',
  '5/4-23',
  '6/4',
  '7/4',
  '8/4',
  '9/4',
  '10/4',
  '11/4',
  '12/4',
  '13/4',
  '14/4',
  '15/4',
  '16/4',
  '1/2',
  '2/2',
  '3/2',
  '4/2',
  '5/2',
  '6/2',
  '8/2',
  '1/8',
  '2/8',
  '3/8',
  '4/8',
  '5/8',
  '5/8-23',
  '5/8-32',
  '6/8',
  '7/8',
  '7/8-223',
  '7/8-232',
  '7/8-322',
  '8/8',
  '9/8',
  '9/8-333',
  '9/8-2223',
  '9/8-3222',
  '10/8',
  '11/8',
  '12/8',
  '13/8',
  '14/8',
  '15/8',
  '16/8',
  '1/16',
  '2/16',
  '3/16',
  '4/16',
  '5/16',
  '6/16',
  '7/16',
  '8/16',
  '9/16',
  '10/16',
  '11/16',
  '12/16',
  '13/16',
  '14/16',
  '15/16',
  '16/16',
];

export const COMMON_TIME_SIGNATURES: TimeSignatureId[] = [
  '4/4',
  '3/4',
  '2/4',
  '6/8',
  '12/8',
  '5/4',
  '7/8',
  '5/8',
  '9/8',
  '2/2',
];

export const SUBDIVISIONS: Record<
  SubdivisionId,
  { id: SubdivisionId; label: string; short: string; symbol: string; ticksPerBeat: number }
> = {
  quarter: { id: 'quarter', label: 'Quarter', short: 'Quarter', symbol: '♩', ticksPerBeat: 1 },
  eighths: { id: 'eighths', label: '8ths', short: '8ths', symbol: '♪', ticksPerBeat: 2 },
  triplet: { id: 'triplet', label: 'Triplet', short: 'Triplet', symbol: '3', ticksPerBeat: 3 },
  sixteenths: { id: 'sixteenths', label: '16ths', short: '16ths', symbol: '♬', ticksPerBeat: 4 },
  dotted: { id: 'dotted', label: 'Dotted 8th', short: 'Dotted', symbol: '♪.', ticksPerBeat: 2 },
};

export const SUBDIVISION_ORDER: SubdivisionId[] = [
  'quarter',
  'eighths',
  'triplet',
  'sixteenths',
  'dotted',
];

export const LOCK_IN_PATTERNS: {
  id: LockInPattern;
  label: string;
  detail: string;
}[] = [
  { id: 'full', label: 'OFF', detail: 'The click stays with you.' },
  { id: 'one-on-one-off', label: '1 ON / 1 OFF', detail: 'One bar click. One bar silent.' },
  { id: 'two-on-one-off', label: '2 ON / 1 OFF', detail: 'Two bars click. One bar yours.' },
  { id: 'three-on-one-off', label: '3 ON / 1 OFF', detail: 'Three bars click. One bar yours.' },
  { id: 'four-on-two-off', label: '4 ON / 2 OFF', detail: 'Four bars click. Two bars yours.' },
  { id: 'every-other', label: 'EVERY OTHER BAR', detail: 'One bar on. One bar yours.' },
  { id: 'two-on-two-off', label: '2 ON / 2 OFF', detail: 'Two bars on. Two bars yours.' },
  { id: 'four-on-four-off', label: '4 ON / 4 OFF', detail: 'Four bars on. Four bars yours.' },
  { id: 'custom', label: 'CUSTOM', detail: 'Choose the click and silent bars.' },
];

export function beatLampCount(id: TimeSignatureId): number {
  return TIME_SIGNATURES[id].beatsPerMeasure;
}

export function beatLampIndex(_id: TimeSignatureId, beatIndex: number): number {
  return beatIndex;
}

export function beatLampIsDownbeat(id: TimeSignatureId, lampIndex: number): boolean {
  return lampIndex === 0;
}

export function beatLampIsAccent(id: TimeSignatureId, lampIndex: number): boolean {
  if (id === '12/8') return lampIndex === 0;
  return TIME_SIGNATURES[id].accentBeats.includes(lampIndex);
}

export function beatLampIsBackbeat(id: TimeSignatureId, lampIndex: number): boolean {
  if (id === '12/8') return lampIndex === 1 || lampIndex === 3;
  return TIME_SIGNATURES[id].backbeatBeats.includes(lampIndex);
}

export function subdivisionCaption(id: SubdivisionId): string {
  const def = SUBDIVISIONS[id];
  return `${def.symbol}  ${def.label}`;
}

/** Face plate. Musician-readable, short enough for a 320-wide instrument. */
export function classicSubdivisionLabel(id: SubdivisionId): string {
  if (id === 'quarter') return 'QUARTER';
  if (id === 'triplet') return 'TRIPLET';
  if (id === 'dotted') return 'DOTTED';
  return SUBDIVISIONS[id].short.toUpperCase();
}

export function meterLabel(id: TimeSignatureId): string {
  return TIME_SIGNATURES[id]?.label ?? id;
}

export function meterPillLabel(id: TimeSignatureId, subdivision: SubdivisionId): string {
  const raw = (id.split('-')[0] ?? id).split('/');
  const beats = raw[0] ?? '4';
  const note = raw[1] ?? '4';
  return `${beats} / ${note}  ·  ${SUBDIVISIONS[subdivision].symbol}`;
}

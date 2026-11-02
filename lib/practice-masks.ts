import type { LockInPattern, SparseMode, SubdivisionId } from '@/lib/types';

export const SPACE_PATTERNS: { id: LockInPattern; label: string; hint: string }[] = [
  { id: 'one-on-one-off', label: '1 ON / 1 OFF', hint: 'One bar click. One bar silent.' },
  { id: 'two-on-one-off', label: '2 ON / 1 OFF', hint: 'Two bars click. One bar yours.' },
  { id: 'three-on-one-off', label: '3 ON / 1 OFF', hint: 'Three bars click. One bar yours.' },
  { id: 'two-on-two-off', label: '2 ON / 2 OFF', hint: 'Two on. Two silent.' },
  { id: 'four-on-two-off', label: '4 ON / 2 OFF', hint: 'Four on. Two silent.' },
  { id: 'four-on-four-off', label: '4 ON / 4 OFF', hint: 'Four on. Four silent.' },
  { id: 'custom', label: 'CUSTOM', hint: 'Choose the click and silent bars.' },
];

export const SPARSE_OPTIONS: { id: SparseMode; label: string; hint: string }[] = [
  { id: 'all', label: 'ALL BEATS', hint: 'Every scheduled beat stays audible.' },
  { id: 'downbeats', label: 'DOWNBEATS', hint: 'Only beat 1 clicks. The measure stays intact.' },
  { id: 'every-2', label: 'EVERY 2 BARS', hint: 'Click on every other bar.' },
  { id: 'every-4', label: 'EVERY 4 BARS', hint: 'Click on every fourth bar.' },
];

export function maxClickShift(subdivision: SubdivisionId): number {
  if (subdivision === 'eighths' || subdivision === 'dotted') return 1;
  if (subdivision === 'triplet') return 2;
  if (subdivision === 'sixteenths') return 3;
  return 0;
}

export function clampClickShift(value: unknown, subdivision: SubdivisionId): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(maxClickShift(subdivision), Math.max(0, numeric));
}

export function shiftLabel(shift: number, subdivision: SubdivisionId): string {
  if (shift <= 0) return 'ON THE BEAT';
  if (subdivision === 'triplet') return shift === 1 ? '2ND TRIPLET' : '3RD TRIPLET';
  if (subdivision === 'sixteenths') {
    if (shift === 1) return 'THE E';
    if (shift === 2) return 'THE AND';
    return 'THE A';
  }
  return 'THE AND';
}

export function isMeasureAudible(
  measureIndex: number,
  lockIn: LockInPattern,
  countInBars = 0,
  customOn = 3,
  customOff = 1
): boolean {
  if (measureIndex < Math.max(0, countInBars)) return true;
  const cycleIndex = measureIndex - Math.max(0, countInBars);
  if (lockIn === 'full' || lockIn === 'two-and-four') return true;
  if (lockIn === 'every-other' || lockIn === 'one-on-one-off') return cycleIndex % 2 === 0;
  if (lockIn === 'two-on-one-off') return cycleIndex % 3 < 2;
  if (lockIn === 'three-on-one-off') return cycleIndex % 4 < 3;
  if (lockIn === 'four-on-two-off') return cycleIndex % 6 < 4;
  if (lockIn === 'two-on-two-off') return Math.floor(cycleIndex / 2) % 2 === 0;
  if (lockIn === 'four-on-four-off') return Math.floor(cycleIndex / 4) % 2 === 0;
  if (lockIn === 'custom') {
    const cycle = Math.max(1, customOn + customOff);
    return cycleIndex % cycle < customOn;
  }
  return true;
}

export function isTickAudible(args: {
  measureIndex: number;
  beatIndex: number;
  subdivisionIndex: number;
  lockIn: LockInPattern;
  sparseMode: SparseMode;
  clickShift: number;
  countInBars?: number;
  customOn?: number;
  customOff?: number;
}): boolean {
  const countIn = args.countInBars ?? 0;
  if (!isMeasureAudible(args.measureIndex, args.lockIn, countIn, args.customOn, args.customOff)) {
    return false;
  }
  if (args.clickShift > 0 && args.subdivisionIndex !== args.clickShift) return false;
  if (args.sparseMode === 'downbeats') return args.beatIndex === 0 && args.subdivisionIndex === args.clickShift;
  const cycleIndex = args.measureIndex - Math.max(0, countIn);
  if (args.sparseMode === 'every-2') return cycleIndex % 2 === 0;
  if (args.sparseMode === 'every-4') return cycleIndex % 4 === 0;
  return true;
}

export function nativeSparseMode(mode: SparseMode): string {
  return mode;
}

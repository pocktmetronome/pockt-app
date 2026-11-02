import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { clampClickShift } from '@/lib/practice-masks';
import type { CountInBars, LockInPattern, SparseMode, SubdivisionId } from '@/lib/types';

export type PracticeMode = 'bars' | 'seconds';
export type SessionLimit = 'none' | 'time' | 'bars' | 'single';
export type RampEndBehavior = 'hold' | 'stop' | 'loop';

export type PracticeConfig = {
  startBpm: number;
  targetBpm: number;
  step: number;
  interval: number;
  mode: PracticeMode;
  /** How the session ends. Tempo ramping stays available in every mode. */
  sessionLimit: SessionLimit;
  sessionMinutes: number;
  sessionSeconds: number;
  sessionBars: number;
  rampEnabled: boolean;
  rampEnd: RampEndBehavior;
  countInBars: CountInBars;
  spaceEnabled: boolean;
  spacePattern: LockInPattern;
  spaceOnBars: number;
  spaceOffBars: number;
  spaceRandom: boolean;
  spaceRandomOnMin: number;
  spaceRandomOnMax: number;
  spaceRandomOffMin: number;
  spaceRandomOffMax: number;
  shiftEnabled: boolean;
  clickShift: number;
  sparseMode: SparseMode;
};

export const DEFAULT_PRACTICE: PracticeConfig = {
  startBpm: 80,
  targetBpm: 120,
  step: 5,
  interval: 8,
  mode: 'bars',
  sessionLimit: 'none',
  sessionMinutes: 5,
  sessionSeconds: 0,
  sessionBars: 16,
  rampEnabled: false,
  rampEnd: 'hold',
  countInBars: 0,
  spaceEnabled: false,
  spacePattern: 'one-on-one-off',
  spaceOnBars: 4,
  spaceOffBars: 2,
  spaceRandom: false,
  spaceRandomOnMin: 2,
  spaceRandomOnMax: 4,
  spaceRandomOffMin: 1,
  spaceRandomOffMax: 2,
  shiftEnabled: false,
  clickShift: 1,
  sparseMode: 'all',
};

export const QUICK_SESSION_MINUTES = [1, 3, 5, 10, 15] as const;

export function sessionDurationSec(config: PracticeConfig): number {
  return Math.max(1, config.sessionMinutes * 60 + config.sessionSeconds);
}

export function sanitizePractice(raw: unknown): PracticeConfig {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const mode: PracticeMode = source.mode === 'seconds' ? 'seconds' : 'bars';
  const intervalMax = mode === 'seconds' ? 300 : 64;
  const intervalMin = mode === 'seconds' ? 5 : 1;
  const sessionLimit: SessionLimit =
    source.sessionLimit === 'time' ||
    source.sessionLimit === 'bars' ||
    source.sessionLimit === 'single'
      ? source.sessionLimit
      : 'none';
  const rampEnd: RampEndBehavior =
    source.rampEnd === 'stop' || source.rampEnd === 'loop' ? source.rampEnd : 'hold';
  const spacePattern: LockInPattern =
    source.spacePattern === 'two-on-one-off' ||
    source.spacePattern === 'three-on-one-off' ||
    source.spacePattern === 'two-on-two-off' ||
    source.spacePattern === 'four-on-two-off' ||
    source.spacePattern === 'four-on-four-off' ||
    source.spacePattern === 'custom' ||
    source.spacePattern === 'every-other'
      ? source.spacePattern
      : 'one-on-one-off';
  const sparseMode: SparseMode =
    source.sparseMode === 'downbeats' || source.sparseMode === 'every-2' || source.sparseMode === 'every-4'
      ? source.sparseMode
      : 'all';
  const countInBars: CountInBars =
    source.countInBars === 1 || source.countInBars === 2 || source.countInBars === 3 || source.countInBars === 4 ? source.countInBars : 0;
  return {
    startBpm: sanitizeBpm(source.startBpm, DEFAULT_PRACTICE.startBpm),
    targetBpm: sanitizeBpm(source.targetBpm, DEFAULT_PRACTICE.targetBpm),
    step: Math.min(20, Math.max(1, Math.round(asNumber(source.step, DEFAULT_PRACTICE.step)))),
    interval: Math.min(
      intervalMax,
      Math.max(intervalMin, Math.round(asNumber(source.interval, mode === 'seconds' ? 30 : 4)))
    ),
    mode,
    sessionLimit,
    sessionMinutes: Math.min(60, Math.max(0, Math.round(asNumber(source.sessionMinutes, 5)))),
    sessionSeconds: Math.min(59, Math.max(0, Math.round(asNumber(source.sessionSeconds, 0)))),
    sessionBars: Math.min(256, Math.max(1, Math.round(asNumber(source.sessionBars, 16)))),
    rampEnabled: source.rampEnabled === true,
    rampEnd,
    countInBars,
    spaceEnabled: source.spaceEnabled === true,
    spacePattern,
    spaceOnBars: Math.min(16, Math.max(1, Math.round(asNumber(source.spaceOnBars, 4)))),
    spaceOffBars: Math.min(16, Math.max(0, Math.round(asNumber(source.spaceOffBars, 2)))),
    spaceRandom: source.spaceRandom === true,
    spaceRandomOnMin: Math.min(16, Math.max(1, Math.round(asNumber(source.spaceRandomOnMin, 2)))),
    spaceRandomOnMax: Math.min(16, Math.max(1, Math.round(asNumber(source.spaceRandomOnMax, 4)))),
    spaceRandomOffMin: Math.min(16, Math.max(0, Math.round(asNumber(source.spaceRandomOffMin, 1)))),
    spaceRandomOffMax: Math.min(16, Math.max(0, Math.round(asNumber(source.spaceRandomOffMax, 2)))),
    shiftEnabled: source.shiftEnabled === true,
    clickShift: clampClickShift(source.clickShift, 'eighths'),
    sparseMode,
  };
}

export function practiceEnginePatch(
  config: PracticeConfig,
  subdivision: SubdivisionId
): {
  countInBars: CountInBars;
  lockIn: LockInPattern;
  gapOnBars: number;
  gapOffBars: number;
  clickShift: number;
  sparseMode: SparseMode;
} {
  return {
    countInBars: config.countInBars,
    lockIn: config.spaceEnabled ? (config.spaceRandom ? 'custom' : config.spacePattern) : 'full',
    gapOnBars: config.spaceOnBars,
    gapOffBars: config.spaceOffBars,
    clickShift: config.shiftEnabled ? clampClickShift(config.clickShift, subdivision) : 0,
    sparseMode: config.sparseMode,
  };
}

export function practiceDirection(config: PracticeConfig): 1 | -1 {
  return config.targetBpm >= config.startBpm ? 1 : -1;
}

export function nextPracticeBpm(current: number, config: PracticeConfig): number {
  const direction = practiceDirection(config);
  const stepped = sanitizeBpm(current + direction * config.step, current);
  if (direction > 0) return Math.min(config.targetBpm, stepped);
  return Math.max(config.targetBpm, stepped);
}

export function practiceReachedTarget(current: number, config: PracticeConfig): boolean {
  const direction = practiceDirection(config);
  return direction > 0 ? current >= config.targetBpm : current <= config.targetBpm;
}

export function randomGapBars(config: PracticeConfig): { on: number; off: number } {
  const onMin = Math.min(config.spaceRandomOnMin, config.spaceRandomOnMax);
  const onMax = Math.max(config.spaceRandomOnMin, config.spaceRandomOnMax);
  const offMin = Math.min(config.spaceRandomOffMin, config.spaceRandomOffMax);
  const offMax = Math.max(config.spaceRandomOffMin, config.spaceRandomOffMax);
  const on = onMin + Math.floor(Math.random() * (onMax - onMin + 1));
  const off = offMin + Math.floor(Math.random() * (offMax - offMin + 1));
  return { on: Math.max(1, on), off: Math.max(0, off) };
}

export function practiceProgress(current: number, config: PracticeConfig): number {
  const span = Math.abs(config.targetBpm - config.startBpm);
  if (span <= 0) return 1;
  const traveled = Math.abs(current - config.startBpm);
  return Math.min(1, Math.max(0, traveled / span));
}

export function clampPracticeBpm(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

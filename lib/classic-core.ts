import { TIME_SIGNATURES } from '@/constants/meter';
import { sanitizeBpm } from '@/constants/timing';
import type {
  CountInBars,
  GapPattern,
  MetronomeConfig,
  PolyrhythmId,
  StereoPan,
  SwingAmount,
} from '@/lib/types';

export const COUNT_IN_OPTIONS: { id: CountInBars; label: string }[] = [
  { id: 0, label: 'OFF' },
  { id: 1, label: '1 BAR' },
  { id: 2, label: '2 BARS' },
  { id: 3, label: '3 BARS' },
  { id: 4, label: '4 BARS' },
];

export const GAP_OPTIONS: { id: GapPattern; label: string; detail: string; on: number; off: number }[] = [
  { id: 'full', label: 'OFF', detail: 'The click stays with you.', on: 1, off: 0 },
  { id: 'one-on-one-off', label: '1 ON / 1 OFF', detail: 'One bar click. One bar silent.', on: 1, off: 1 },
  { id: 'every-other', label: '1 ON / 1 OFF', detail: 'One bar click. One bar silent.', on: 1, off: 1 },
  { id: 'two-on-one-off', label: '2 ON / 1 OFF', detail: 'Two bars click. One bar yours.', on: 2, off: 1 },
  { id: 'three-on-one-off', label: '3 ON / 1 OFF', detail: 'Three bars click. One bar yours.', on: 3, off: 1 },
  { id: 'two-on-two-off', label: '2 ON / 2 OFF', detail: 'Two bars on. Two bars yours.', on: 2, off: 2 },
  { id: 'four-on-two-off', label: '4 ON / 2 OFF', detail: 'Four bars click. Two bars yours.', on: 4, off: 2 },
  { id: 'four-on-four-off', label: '4 ON / 4 OFF', detail: 'Four bars on. Four bars yours.', on: 4, off: 4 },
  { id: 'custom', label: 'CUSTOM', detail: 'Choose the click and silent bars.', on: 3, off: 1 },
];

export const SWING_OPTIONS: { id: SwingAmount; label: string; ratio: number }[] = [
  { id: 'straight', label: 'STRAIGHT', ratio: 0.5 },
  { id: 'light', label: 'LIGHT', ratio: 0.58 },
  { id: 'medium', label: 'MEDIUM', ratio: 0.66 },
  { id: 'heavy', label: 'HEAVY', ratio: 0.75 },
];

export const POLYRHYTHM_OPTIONS: { id: PolyrhythmId; label: string; a: number; b: number }[] = [
  { id: 'off', label: 'OFF', a: 0, b: 0 },
  { id: '2:3', label: '2 : 3', a: 2, b: 3 },
  { id: '3:2', label: '3 : 2', a: 3, b: 2 },
  { id: '3:4', label: '3 : 4', a: 3, b: 4 },
  { id: '4:3', label: '4 : 3', a: 4, b: 3 },
  { id: '4:5', label: '4 : 5', a: 4, b: 5 },
  { id: '5:4', label: '5 : 4', a: 5, b: 4 },
  { id: 'custom', label: 'CUSTOM', a: 3, b: 2 },
];

export const PAN_OPTIONS: { id: StereoPan; label: string; value: number }[] = [
  { id: 'left', label: 'LEFT', value: -1 },
  { id: 'center', label: 'CENTER', value: 0 },
  { id: 'right', label: 'RIGHT', value: 1 },
];

export const PITCH_PIPE_MIN_HZ = 414;
export const PITCH_PIPE_MAX_HZ = 466;
export const PITCH_PIPE_DEFAULT_HZ = 440;

export function swingRatio(amount: SwingAmount): number {
  return SWING_OPTIONS.find((item) => item.id === amount)?.ratio ?? 0.5;
}

export function panValue(pan: StereoPan): number {
  return PAN_OPTIONS.find((item) => item.id === pan)?.value ?? 0;
}

export function gapCycle(pattern: GapPattern, customOn = 3, customOff = 1): { on: number; off: number } {
  if (pattern === 'custom') {
    return {
      on: Math.min(16, Math.max(1, Math.round(customOn))),
      off: Math.min(16, Math.max(0, Math.round(customOff))),
    };
  }
  const found = GAP_OPTIONS.find((item) => item.id === pattern);
  return { on: found?.on ?? 1, off: found?.off ?? 0 };
}

export function nativeLockIn(config: Pick<MetronomeConfig, 'lockIn' | 'gapOnBars' | 'gapOffBars'>): string {
  if (config.lockIn === 'custom') return `custom-${gapCycle('custom', config.gapOnBars, config.gapOffBars).on}-${gapCycle('custom', config.gapOnBars, config.gapOffBars).off}`;
  if (config.lockIn === 'one-on-one-off') return 'every-other';
  return config.lockIn;
}

export function polyLayers(id: PolyrhythmId, customA = 3, customB = 2): { a: number; b: number } {
  if (id === 'off') return { a: 0, b: 0 };
  if (id === 'custom') {
    return {
      a: Math.min(12, Math.max(2, Math.round(customA))),
      b: Math.min(12, Math.max(2, Math.round(customB))),
    };
  }
  const found = POLYRHYTHM_OPTIONS.find((item) => item.id === id);
  return { a: found?.a ?? 0, b: found?.b ?? 0 };
}

export function formatBpm(bpm: number): string {
  const safe = sanitizeBpm(bpm);
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

export function beatCount(timeSignature: MetronomeConfig['timeSignature']): number {
  return TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? 4;
}

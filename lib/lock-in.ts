import { TIME_SIGNATURES } from '@/constants/meter';
import { isBackbeatPattern } from '@/lib/accents';
import type { LockInPattern, MetronomeConfig } from '@/lib/types';

export function isMeasureAudible(measureIndex: number, pattern: LockInPattern): boolean {
  switch (pattern) {
    case 'full':
    case 'two-and-four':
      return true;
    case 'every-other':
      return measureIndex % 2 === 0;
    case 'two-on-two-off':
      return Math.floor(measureIndex / 2) % 2 === 0;
    case 'four-on-four-off':
      return Math.floor(measureIndex / 4) % 2 === 0;
    default:
      return true;
  }
}

export function isBackbeatActive(config: MetronomeConfig): boolean {
  return (
    TIME_SIGNATURES[config.timeSignature].supportsBackbeat &&
    (config.backbeat || isBackbeatPattern(config.accentPattern, config.timeSignature))
  );
}

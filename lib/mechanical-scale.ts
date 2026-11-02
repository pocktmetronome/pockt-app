import { MECHANICAL_MAX_BPM, MECHANICAL_MIN_BPM, sanitizeBpm } from '@/constants/timing';

/** Slow tempos sit high on the rod. Fast tempos sit low. */
export const MECHANICAL_SCALE_MARKS = [
  { bpm: 20, name: 'Largo' },
  { bpm: 40, name: 'Largo' },
  { bpm: 60, name: 'Larghetto' },
  { bpm: 80, name: 'Adagio' },
  { bpm: 100, name: 'Andante' },
  { bpm: 120, name: 'Moderato' },
  { bpm: 144, name: 'Allegro' },
  { bpm: 168, name: 'Vivace' },
  { bpm: 200, name: 'Presto' },
  { bpm: 260, name: 'Prestissimo' },
  { bpm: 400, name: 'Prestissimo' },
] as const;

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Calibrated visual travel: 20–208 uses most of the rod (physical-metronome feel).
 * 208–400 compresses into the remaining lower band so the extended range stays honest.
 */
export function mechanicalWeightT(bpm: number): number {
  const safe = sanitizeBpm(bpm, bpm, MECHANICAL_MIN_BPM, MECHANICAL_MAX_BPM);
  if (safe <= 208) {
    const t = (safe - MECHANICAL_MIN_BPM) / (208 - MECHANICAL_MIN_BPM);
    return clampUnit(0.08 + t * 0.7);
  }
  const t = (safe - 208) / (MECHANICAL_MAX_BPM - 208);
  return clampUnit(0.78 + t * 0.14);
}

export function mechanicalBpmFromWeightT(t: number): number {
  const unit = clampUnit(t);
  if (unit <= 0.78) {
    const local = (unit - 0.08) / 0.7;
    return Math.round(MECHANICAL_MIN_BPM + clampUnit(local) * (208 - MECHANICAL_MIN_BPM));
  }
  const local = (unit - 0.78) / 0.14;
  return Math.round(208 + clampUnit(local) * (MECHANICAL_MAX_BPM - 208));
}

export function mechanicalMarkPosition(bpm: number): number {
  return mechanicalWeightT(bpm);
}

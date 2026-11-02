/** Shared Beatline flash colors. Strength 0–3 from the master accent event. */

export const BEATLINE_LOW = '#F4F6FA';
export const BEATLINE_MEDIUM = '#E87828';
export const BEATLINE_STRONG = '#FFFFFF';

export function beatlineFlashColor(strength: number): string {
  'worklet';
  if (strength < 0.5) return 'rgba(244,246,250,0.35)';
  if (strength < 2.5) return BEATLINE_LOW;
  return BEATLINE_MEDIUM;
}

export function beatlineFlashOpacity(pulse: number, strength: number): number {
  'worklet';
  if (strength < 0.5) return 0;
  const peak = strength >= 2.5 ? 1 : strength >= 1.5 ? 0.92 : 0.78;
  if (pulse <= 0) return 0;
  return pulse * peak;
}

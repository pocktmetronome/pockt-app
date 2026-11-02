/**
 * Rhythm's tick ring is a display of the console dial angle.
 * The console gesture is unchanged. Skia's rotation sign is the
 * opposite of the dial's clockwise finger angle, so the wheel is mirrored.
 */
export function rhythmVisualRadians(consoleAngle: number): number {
  'worklet';
  if (!Number.isFinite(consoleAngle)) return 0;
  return -consoleAngle;
}

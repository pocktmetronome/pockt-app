import { DIAL_MARKS, DIAL_MAX_BPM, DIAL_MIN_BPM, angleFromDialBpm } from '@/lib/pockt-dial-scale';
import { dialLandmarkEmphasis, dialTickEmphasis } from '@/lib/dial-emphasis';

export { dialLandmarkEmphasis, dialTickEmphasis };

/**
 * Fractions of the 770px photographic plate.
 * Measured on the extract of 01_Dial.png:
 * tick outer radius 292, major length 26, minor length 10, numeral center 237.
 * Tick positions stay on angleFromDialBpm. Step is visual density only.
 */
export const DIAL_PHOTO_TICK_OUTER = 0.384;
export const DIAL_PHOTO_MAJOR_LENGTH = 0.04;
export const DIAL_PHOTO_MID_LENGTH = 0.024;
export const DIAL_PHOTO_MINOR_LENGTH = 0.015;
export const DIAL_PHOTO_MAJOR_WIDTH = 0.0052;
export const DIAL_PHOTO_MID_WIDTH = 0.0032;
export const DIAL_PHOTO_MINOR_WIDTH = 0.0022;
export const DIAL_PHOTO_NUMERAL_RADIUS = 0.312;
export const DIAL_PHOTO_NUMERAL_SIZE = 0.046;
export const DIAL_PHOTO_PRIMARY_SIZE = 0.058;

export function dialPhotoPointerTheta(mark: number, pointerAngle: number): number {
  return angleFromDialBpm(mark) - pointerAngle;
}

export function dialPhotoMarkTheta(mark: number, bpm: number): number {
  return dialPhotoPointerTheta(mark, angleFromDialBpm(bpm));
}

export type DialPhotoTickLevel = 'major' | 'mid' | 'minor';

/** Visual tick BPMs. Angles still come from angleFromDialBpm. */
export function dialPhotoTickMarks(): number[] {
  const marks = new Set<number>(DIAL_MARKS);
  for (let mark = DIAL_MIN_BPM; mark <= DIAL_MAX_BPM; mark += 2) marks.add(mark);
  return [...marks].sort((left, right) => left - right);
}

export function dialPhotoTicksAt(pointerAngle: number): { mark: number; theta: number; level: DialPhotoTickLevel }[] {
  const majors = new Set<number>(DIAL_MARKS);
  return dialPhotoTickMarks().map((mark) => {
    const level: DialPhotoTickLevel = majors.has(mark) ? 'major' : mark % 10 === 0 ? 'mid' : 'minor';
    return { mark, theta: dialPhotoPointerTheta(mark, pointerAngle), level };
  });
}

export function dialPhotoTicks(bpm: number): { mark: number; theta: number; level: DialPhotoTickLevel }[] {
  return dialPhotoTicksAt(angleFromDialBpm(bpm));
}

export function dialPhotoNumeralIsPrimary(theta: number): boolean {
  return Math.abs(theta) < 0.14;
}


export type DialPhotoMark = (typeof DIAL_MARKS)[number];

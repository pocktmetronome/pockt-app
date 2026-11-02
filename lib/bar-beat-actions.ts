import { BAR_OBJECTS, BAR_RETIRED_OBJECTS } from '@/lib/bar-assets';
import { BAR_BEATS, barObjectFrame } from '@/lib/bar-layout';

/** Native-clock beat actions. Ambient video never carries these impulses. */
export const BAR_BEAT_ACTIONS = [
  { id: 'coaster' as const, asset: BAR_RETIRED_OBJECTS.coaster, beat: 0, spec: BAR_BEATS[0] },
  { id: 'glass' as const, asset: BAR_OBJECTS.glass, beat: 1, spec: BAR_BEATS[1] },
  { id: 'jigger' as const, asset: BAR_OBJECTS.jigger, beat: 2, spec: BAR_BEATS[2] },
  { id: 'shaker' as const, asset: BAR_OBJECTS.shaker, beat: 3, spec: BAR_BEATS[3] },
] as const;

export const BAR_ACTION_MS = 160;
export const BAR_ACTION_SCALE = 1.08;
export const BAR_ACTION_ACCENT_SCALE = 1.12;

export function barActionIndex(beatIndex: number): number {
  return ((Math.round(beatIndex) % 4) + 4) % 4;
}

export function barActionScale(accent: number, reduceMotion: boolean): number {
  if (reduceMotion) return accent >= 2.5 ? 1.05 : 1.03;
  return accent >= 2.5 ? BAR_ACTION_ACCENT_SCALE : BAR_ACTION_SCALE;
}

export function barActionFrame(viewW: number, viewH: number, beat: number) {
  const spec = BAR_BEATS[barActionIndex(beat)];
  if (!spec) return null;
  return barObjectFrame(viewW, viewH, spec);
}

import type { VisualMotion } from '@/lib/types';

export const VISUAL_MOTION_ORDER: VisualMotion[] = ['low', 'normal', 'high'];

/** Visual excursion gain. HIGH must show the concept without becoming unusable. */
export const VISUAL_MOTION_GAIN: Record<VisualMotion, number> = {
  low: 0.5,
  normal: 1,
  high: 1.5,
};

export function motionGain(enabled: boolean, motion: VisualMotion): number {
  if (!enabled) return 0;
  return VISUAL_MOTION_GAIN[motion];
}

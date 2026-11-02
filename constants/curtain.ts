import { PRIVACY_CURTAIN_DARK } from '@/lib/classic-assets';

/** One universal privacy material. Never themed per room. */
export const PRIVACY_CURTAIN = {
  source: PRIVACY_CURTAIN_DARK,
  /** ~90% sheet, leaving a faint trace of the room. */
  closedOpacity: 0.9,
  grain: 0.018,
} as const;

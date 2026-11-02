/** Direct-manipulation privacy shade. Progress 0 = open, 1 = fully dimmed. */

export const PRIVACY_CLOSE_THRESHOLD = 0.36;
export const PRIVACY_RESTORE_ACTIVE_OFFSET_Y = 10;
/** Idle "Pull down for privacy" hint on room entry. */
export const PRIVACY_IDLE_HINT_MS = 800;
/** Fade the idle handle after room entry while the hit target remains. */
export const PRIVACY_IDLE_HARDWARE_MS = 720;
/** Closed zipper/cord fade. Do not speed this up. */
export const PRIVACY_CLOSED_HARDWARE_MS = 1000;

export function privacyProgressFromPan(origin: number, translationY: number, travel: number): number {
  'worklet';
  const span = Math.max(1, travel);
  const next = origin + translationY / span;
  if (!Number.isFinite(next)) return origin;
  return Math.min(1, Math.max(0, next));
}

export function privacyShouldClose(progress: number, velocityY: number): boolean {
  'worklet';
  const projected = progress + velocityY / 2600;
  return projected > PRIVACY_CLOSE_THRESHOLD || velocityY > 980;
}

export function isPrivacyRestorePan(translationY: number, translationX: number, threshold = PRIVACY_RESTORE_ACTIVE_OFFSET_Y): boolean {
  return translationY <= -threshold && Math.abs(translationY) > Math.abs(translationX);
}

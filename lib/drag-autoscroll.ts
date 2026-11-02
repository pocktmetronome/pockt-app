/** Edge-triggered drag autoscroll. Scroll math only — no gestures. */

export const AUTOSCROLL_ZONE_PX = 96;
export const AUTOSCROLL_MAX_PX_PER_SEC = 1600;

export function autoscrollVelocityPxPerSec(
  fingerY: number,
  viewportTop: number,
  viewportBottom: number,
  contentOffsetY: number,
  contentMaxOffsetY: number,
  zone = AUTOSCROLL_ZONE_PX,
  maxSpeed = AUTOSCROLL_MAX_PX_PER_SEC
): number {
  if (!(zone > 0) || !(maxSpeed > 0)) return 0;
  const height = viewportBottom - viewportTop;
  if (height <= zone * 2) return 0;

  const topDist = fingerY - viewportTop;
  if (topDist >= 0 && topDist < zone && contentOffsetY > 0) {
    const t = 1 - topDist / zone;
    return -maxSpeed * t * t;
  }

  const bottomDist = viewportBottom - fingerY;
  if (bottomDist >= 0 && bottomDist < zone && contentOffsetY < contentMaxOffsetY - 0.5) {
    const t = 1 - bottomDist / zone;
    return maxSpeed * t * t;
  }

  return 0;
}

export function nextScrollOffset(
  current: number,
  velocityPxPerSec: number,
  dtMs: number,
  maxOffset: number
): number {
  if (velocityPxPerSec === 0 || !(dtMs > 0)) return Math.min(maxOffset, Math.max(0, current));
  return Math.min(maxOffset, Math.max(0, current + (velocityPxPerSec * dtMs) / 1000));
}

/** Keep a dragged card under the finger after the list scrolls. */
export function dragScrollCompensation(scrollAtStart: number, scrollNow: number): number {
  return scrollNow - scrollAtStart;
}

export function localPointAfterScroll(
  absX: number,
  absY: number,
  originX: number,
  originYAtStart: number,
  scrollAtStart: number,
  scrollNow: number
): { x: number; y: number } {
  return {
    x: absX - originX,
    y: absY - (originYAtStart - (scrollNow - scrollAtStart)),
  };
}

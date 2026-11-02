/**
 * Safe interior of the one mounted dial.
 *
 * PocktDialShader.metal measures q in units of the view's short side.
 * The raised hub ends at HUB_R * VIEW_FILL. The fixed pointer's solid
 * body begins at 0.96 of that hub radius (smoothstep end). The rotating
 * knurl and the BPM plate sit further out.
 *
 * The face fills the hub and stops short of that pointer. It is larger
 * than the touch dead zone (0.22 radius). Interactive controls must stay
 * inside the dead zone so the outer annulus remains BPM.
 */
export const DIAL_VIEW_FILL = 0.48;
export const DIAL_HUB_OBJECT_RADIUS = 0.556;
export const DIAL_POINTER_SOLID_START = 0.96;
/** Fraction of the view side kept clear of the pointer's solid body. */
export const DIAL_POINTER_CLEARANCE = 0.005;

/** Radius, as a fraction of the dial view side, where a touch is a hub tap. */
export const DIAL_HUB_DEADZONE_FRACTION = 0.22;

export const DIAL_HUB_RADIUS_FRACTION = DIAL_HUB_OBJECT_RADIUS * DIAL_VIEW_FILL;
export const DIAL_POINTER_INNER_FRACTION = DIAL_HUB_RADIUS_FRACTION * DIAL_POINTER_SOLID_START;
export const DIAL_INTERIOR_RADIUS_FRACTION = DIAL_POINTER_INNER_FRACTION - DIAL_POINTER_CLEARANCE;

/** Diameter of the face viewport as a fraction of the dial view side. */
export const DIAL_INTERIOR_FRACTION = DIAL_INTERIOR_RADIUS_FRACTION * 2;

/**
 * Diameter of the touch-safe disc inside the old hub viewport.
 * Kept so the hub measurement stays explicit. Full-face controls use
 * `faceTouchSize`, which is the native dead zone on the full dial.
 */
export const DIAL_FACE_TOUCH_FRACTION = (DIAL_HUB_DEADZONE_FRACTION * 2) / DIAL_INTERIOR_FRACTION;

/** Diameter of the BPM-safe disc as a fraction of the full dial view. */
export const DIAL_GESTURE_INNER_FRACTION = DIAL_HUB_DEADZONE_FRACTION * 2;

export function faceTouchSize(faceSize: number): number {
  const size = Number.isFinite(faceSize) ? faceSize : 0;
  return Math.max(0, size * DIAL_GESTURE_INNER_FRACTION);
}

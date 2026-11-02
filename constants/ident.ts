/** Full opening length. Timeline starts when ident audio actually begins. */
export const IDENT_DURATION_MS = 420;
export const IDENT_HARD_MIN_MS = 0;
export const IDENT_FADE_START_MS = 40;
export const IDENT_FADE_MS = 280;
export const IDENT_SKIP_AFTER_MS = 0;

export const IDENT_ART_AT_MS = 0;
export const IDENT_ART_SETTLE_MS = 220;

/**
 * POCKT original ident: synthesized D-major musical rise → short crescendo → warm resolution.
 * No vocal. No percussion collage. Visual fade may start while the native preview finishes the tail.
 * The only haptic is the resolution chord.
 */
export const IDENT_BASS_HIT_MS = 80;
export const IDENT_SECOND_HIT_MS = 80;
export const IDENT_FINAL_HIT_MS = 80;

export const IDENT_HAPTIC_BASS_FOLLOW_MS = 0;
export const IDENT_HAPTIC_BASS_MS = IDENT_FINAL_HIT_MS;
export const IDENT_HAPTIC_BASS_LAYER_MS = IDENT_FINAL_HIT_MS;
export const IDENT_HAPTIC_SECOND_MS = IDENT_FINAL_HIT_MS;
export const IDENT_HAPTIC_FINAL_MS = IDENT_FINAL_HIT_MS;

export const IDENT_BASS_SCALE = 1.028;
export const IDENT_DRIFT_SCALE = 1.0;
export const IDENT_ART_SCALE = 1.012;

export const IDENT_LIGHT_BASS = 0.55;
export const IDENT_LIGHT_SECOND = 0.38;
export const IDENT_LIGHT_FINAL = 0.72;

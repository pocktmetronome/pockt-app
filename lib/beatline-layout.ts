/**
 * Locked Beatline 2.0 face coordinates.
 * Fractions are of the cropped CLEAN MASTER app screen, not the iPhone frame.
 */

export const BEATLINE_DESIGN = {
  width: 552,
  height: 868,
} as const;

export type BeatlineSlot = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Normalized slots on the locked master composition. */
export const BEATLINE_SLOTS = {
  rhythm: { x: 0.07, y: 0.152, w: 0.145, h: 0.072 },
  sound: { x: 0.785, y: 0.152, w: 0.145, h: 0.072 },
  meter: { x: 0.118, y: 0.178, w: 0.155, h: 0.028 },
  subdivision: { x: 0.055, y: 0.214, w: 0.24, h: 0.028 },
  soundLabel: { x: 0.73, y: 0.214, w: 0.20, h: 0.028 },
  dial: { x: 0.155, y: 0.248, w: 0.69, h: 0.43 },
  bpm: { x: 0.335, y: 0.438, w: 0.33, h: 0.078 },
  tempo: { x: 0.22, y: 0.568, w: 0.56, h: 0.042 },
  rail: { x: 0.208, y: 0.778, w: 0.572, h: 0.044 },
  tap: { x: 0.035, y: 0.808, w: 0.195, h: 0.112 },
  volume: { x: 0.29, y: 0.868, w: 0.42, h: 0.028 },
  play: { x: 0.77, y: 0.808, w: 0.195, h: 0.112 },
  settings: { x: 0.44, y: 0.932, w: 0.12, h: 0.04 },
  home: { x: 0.015, y: 0.938, w: 0.12, h: 0.05 },
  tuner: { x: 0.865, y: 0.938, w: 0.12, h: 0.05 },
} as const satisfies Record<string, BeatlineSlot>;

export type BeatlinePlateFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

export function beatlinePlateFrame(width: number, height: number): BeatlinePlateFrame {
  const aspect = BEATLINE_DESIGN.width / BEATLINE_DESIGN.height;
  let nextWidth = Math.max(1, width);
  let nextHeight = nextWidth / aspect;
  if (nextHeight > height) {
    nextHeight = Math.max(1, height);
    nextWidth = nextHeight * aspect;
  }
  return {
    left: (width - nextWidth) / 2,
    top: (height - nextHeight) / 2,
    width: nextWidth,
    height: nextHeight,
    scale: nextWidth / BEATLINE_DESIGN.width,
  };
}

export function beatlineFrameBox(frame: BeatlinePlateFrame) {
  return {
    left: frame.left,
    top: frame.top,
    width: frame.width,
    height: frame.height,
  };
}

export function beatlineRect(frame: BeatlinePlateFrame, slot: BeatlineSlot) {
  return {
    left: frame.left + slot.x * frame.width,
    top: frame.top + slot.y * frame.height,
    width: slot.w * frame.width,
    height: slot.h * frame.height,
  };
}

/** Largest square that fits in a slot, centered. Circular hits must use this. */
export function beatlineCircle(frame: BeatlinePlateFrame, slot: BeatlineSlot) {
  const rect = beatlineRect(frame, slot);
  const size = Math.min(rect.width, rect.height);
  return {
    left: rect.left + (rect.width - size) / 2,
    top: rect.top + (rect.height - size) / 2,
    size,
  };
}

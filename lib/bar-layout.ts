import type { BarActorId, BarObjectId } from '@/lib/bar-assets';

/** Master plate size. Interactive objects are placed in this image space. */
export const BAR_MASTER_WIDTH = 940;
export const BAR_MASTER_HEIGHT = 1672;

/**
 * Measured from background-v1.png.
 * Outer brass is the frame only. Objects plant on the INNER dark recess floor.
 */
export const BAR_OUTER_TRAY = { x: 0.055, y: 0.762, w: 0.89, h: 0.09 } as const;
export const BAR_INNER_TRAY = { x: 0.092, y: 0.778, w: 0.816, h: 0.05 } as const;

/** Shared planted contact: mid-floor of the inner recess, above the brass lip. */
export const BAR_CONTACT_Y = 0.808;

/**
 * Compact Tempo plaque below the beat strip, above TAP / PLAY.
 * visW/visH are the on-screen brass face. The source PNG is cropped to its face.
 */
export const BAR_TEMPO_BLOCK = {
  x: 0.5,
  y: 0.904,
  visW: 0.36,
  visH: 0.066,
  srcFaceLeft: 0.22,
  srcFaceTop: 0.4,
  srcFaceRight: 0.78,
  srcFaceBottom: 0.66,
} as const;

/**
 * Locked people-as-beats. Left-to-right reads 1–4.
 * Controls live on the dedicated strip, not on character x or the tray.
 */
export const BAR_PEOPLE_BEATS = [
  { id: 'denim' as const, name: 'DENIM', beat: 1, x: 0.194 },
  { id: 'bartender' as const, name: 'BARTENDER', beat: 2, x: 0.398 },
  { id: 'red-dress' as const, name: 'RED DRESS', beat: 3, x: 0.518 },
  { id: 'blonde' as const, name: 'BLONDE', beat: 4, x: 0.812 },
] as const;

export type BarPersonBeat = (typeof BAR_PEOPLE_BEATS)[number];

/**
 * Dedicated smoked beat-state strip below hands and above BPM.
 * Not the recessed tray. Even 1–4 controls, independent of scene lighting.
 */
export const BAR_BEAT_STRIP = {
  x: 0.5,
  y: 0.82,
  visW: 0.9,
  visH: 0.08,
} as const;

export const BAR_BEAT_CONTROL = {
  visMin: 28,
  visMax: 34,
  visFrac: 0.082,
  hitMin: 48,
} as const;

/** Retired tray-dot geometry. Do not render. */
export const BAR_BEAT_INDICATOR = {
  y: 0.803,
  vis: 0.03,
  hitTop: 0.778,
  hitBottom: 0.836,
} as const;

const LANE_W = BAR_INNER_TRAY.w / 4;

/**
 * Four fixed beat lanes over the inner tray. Hit boxes never move with 0/1/2/3.
 * Object contact X is the lane center. Scale only — no translate.
 */
export const BAR_BEATS = [
  {
    id: 'bottle' as const,
    x: BAR_INNER_TRAY.x + LANE_W * 0.5,
    contactY: BAR_CONTACT_Y,
    masterW: 287,
    masterH: 270,
    contactFrac: 0.9592,
    visCenterX: 0.4977,
    hitLeft: BAR_INNER_TRAY.x,
    hitRight: BAR_INNER_TRAY.x + LANE_W,
  },
  {
    id: 'glass' as const,
    x: BAR_INNER_TRAY.x + LANE_W * 1.5,
    contactY: BAR_CONTACT_Y,
    masterW: 122,
    masterH: 152,
    contactFrac: 0.8549,
    visCenterX: 0.4987,
    hitLeft: BAR_INNER_TRAY.x + LANE_W,
    hitRight: BAR_INNER_TRAY.x + LANE_W * 2,
  },
  {
    id: 'jigger' as const,
    x: BAR_INNER_TRAY.x + LANE_W * 2.5,
    contactY: BAR_CONTACT_Y,
    masterW: 103,
    masterH: 129,
    contactFrac: 0.9283,
    visCenterX: 0.4996,
    hitLeft: BAR_INNER_TRAY.x + LANE_W * 2,
    hitRight: BAR_INNER_TRAY.x + LANE_W * 3,
  },
  {
    id: 'shaker' as const,
    x: BAR_INNER_TRAY.x + LANE_W * 3.5,
    contactY: BAR_CONTACT_Y,
    masterW: 166,
    masterH: 208,
    contactFrac: 0.9248,
    visCenterX: 0.5129,
    hitLeft: BAR_INNER_TRAY.x + LANE_W * 3,
    hitRight: BAR_INNER_TRAY.x + LANE_W * 4,
  },
] as const;

export type BarBeatSpec = (typeof BAR_BEATS)[number];

/** 0 absent, 1 small, 2 medium, 3 full. Scale from the planted contact only. */
export const BAR_STATE_SCALE = [0, 0.4, 0.68, 1] as const;
export const BAR_STATE_OPACITY = [0, 1, 1, 1] as const;

/** Compact recessed OFF marker. Must fit inside one tray quarter with gaps. */
export const BAR_EMPTY_MARKER = { masterW: 96, masterH: 80 } as const;
export const BAR_EMPTY_X_RATIO = 0.6;
export const BAR_EMPTY_MARKER_Y = BAR_INNER_TRAY.y + BAR_INNER_TRAY.h / 2;

export const BAR_TEMPO_HIT_TOP = 0.872;
export const BAR_TEMPO_HIT_BOTTOM = 0.958;
export const BAR_BEAT_HIT_TOP = BAR_BEAT_STRIP.y - BAR_BEAT_STRIP.visH / 2;
export const BAR_BEAT_HIT_BOTTOM = BAR_BEAT_STRIP.y + BAR_BEAT_STRIP.visH / 2;

export const BAR_TRAY_Y = BAR_CONTACT_Y;
export const BAR_BEAT_1 = { x: BAR_BEATS[0].x, y: BAR_CONTACT_Y } as const;

/**
 * Locked motion crops. Assets remain on disk. Character sprites stay disabled.
 * Beat lock: 1 denim, 2 bartender, 3 red dress (center), 4 blonde.
 */
export const BAR_ACTORS = [
  { id: 'denim' as const satisfies BarActorId, beat: 0, masterX: 88, masterY: 1084, masterW: 252, masterH: 168 },
  { id: 'bartender' as const satisfies BarActorId, beat: 1, masterX: 246, masterY: 372, masterW: 214, masterH: 292 },
  { id: 'center' as const satisfies BarActorId, beat: 2, masterX: 318, masterY: 998, masterW: 312, masterH: 214 },
  { id: 'blonde' as const satisfies BarActorId, beat: 3, masterX: 618, masterY: 972, masterW: 292, masterH: 352 },
] as const;

export type BarActorSpec = (typeof BAR_ACTORS)[number];

export type BarRect = { left: number; top: number; width: number; height: number };

export function coverImageRect(
  viewW: number,
  viewH: number,
  imageW: number,
  imageH: number
): { x: number; y: number; w: number; h: number } {
  const scale = Math.max(viewW / imageW, viewH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return {
    x: (viewW - w) / 2,
    y: (viewH - h) / 2,
    w,
    h,
  };
}

/** Width-fit on iPhone. Shows the full approved master, including the blonde woman. */
export function containImageRect(
  viewW: number,
  viewH: number,
  imageW: number,
  imageH: number
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(viewW / imageW, viewH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return {
    x: (viewW - w) / 2,
    y: (viewH - h) / 2,
    w,
    h,
  };
}

export function barWorldRect(
  viewW: number,
  viewH: number
): { x: number; y: number; w: number; h: number } {
  return containImageRect(viewW, viewH, BAR_MASTER_WIDTH, BAR_MASTER_HEIGHT);
}

function masterSize(
  viewW: number,
  viewH: number,
  masterW: number,
  masterH: number
): { width: number; height: number; world: { x: number; y: number; w: number; h: number } } {
  const world = barWorldRect(viewW, viewH);
  return {
    world,
    width: masterW * (world.w / BAR_MASTER_WIDTH),
    height: masterH * (world.h / BAR_MASTER_HEIGHT),
  };
}

export function barInnerTrayRect(viewW: number, viewH: number): BarRect {
  const world = barWorldRect(viewW, viewH);
  return {
    left: world.x + BAR_INNER_TRAY.x * world.w,
    top: world.y + BAR_INNER_TRAY.y * world.h,
    width: BAR_INNER_TRAY.w * world.w,
    height: BAR_INNER_TRAY.h * world.h,
  };
}

/**
 * Plant the PNG so its measured visible contact sits on contactY.
 * Scale origin must use the same contactFrac / visCenterX. No translate on state change.
 */
export function barObjectFrame(
  viewW: number,
  viewH: number,
  spec: Pick<BarBeatSpec, 'x' | 'contactY' | 'masterW' | 'masterH' | 'contactFrac' | 'visCenterX'>
): BarRect {
  const { world, width, height } = masterSize(viewW, viewH, spec.masterW, spec.masterH);
  const contactX = world.x + spec.x * world.w;
  const contactY = world.y + spec.contactY * world.h;
  return {
    left: contactX - spec.visCenterX * width,
    top: contactY - spec.contactFrac * height,
    width,
    height,
  };
}

export function barCenteredFrame(
  viewW: number,
  viewH: number,
  spec: { x: number; y: number; masterW: number; masterH: number }
): BarRect {
  const { world, width, height } = masterSize(viewW, viewH, spec.masterW, spec.masterH);
  return {
    left: world.x + spec.x * world.w - width / 2,
    top: world.y + spec.y * world.h - height / 2,
    width,
    height,
  };
}

/** Compact on-screen brass plaque. */
export function barTempoFrame(viewW: number, viewH: number): BarRect {
  const spec = BAR_TEMPO_BLOCK;
  const world = barWorldRect(viewW, viewH);
  const width = spec.visW * world.w;
  const height = spec.visH * world.h;
  return {
    left: world.x + spec.x * world.w - width / 2,
    top: world.y + spec.y * world.h - height / 2,
    width,
    height,
  };
}

export function barTempoVisibleFrame(viewW: number, viewH: number): BarRect {
  return barTempoFrame(viewW, viewH);
}

export function barTempoFaceFrame(viewW: number, viewH: number): BarRect {
  return barTempoFrame(viewW, viewH);
}

/** How to crop BAR_TEMPO so only the brass face fills the compact plaque. */
export function barTempoImageLayout(frame: BarRect): BarRect {
  const spec = BAR_TEMPO_BLOCK;
  const faceW = spec.srcFaceRight - spec.srcFaceLeft;
  const faceH = spec.srcFaceBottom - spec.srcFaceTop;
  const width = frame.width / faceW;
  const height = frame.height / faceH;
  return {
    left: -spec.srcFaceLeft * width,
    top: -spec.srcFaceTop * height,
    width,
    height,
  };
}

/** Dedicated Tempo hit. Padded visible plaque, clipped into the lower wood. */
export const BAR_CHROME = {
  chipW: 76,
  chipH: 48,
  playW: 132,
  playH: 52,
  gap: 8,
  minTouch: 44,
} as const;

export type BarChromeLayout = {
  tray: BarRect;
  tempo: BarRect;
  tap: BarRect;
  controls: BarRect;
  play: BarRect;
};

function clampRect(rect: BarRect, viewW: number, viewH: number): BarRect {
  const width = Math.min(rect.width, viewW);
  const height = Math.min(rect.height, viewH);
  return {
    left: Math.min(Math.max(0, rect.left), Math.max(0, viewW - width)),
    top: Math.min(Math.max(0, rect.top), Math.max(0, viewH - height)),
    width,
    height,
  };
}

/**
 * Lower Whiskey Bar chrome. TAP / CONTROLS / PLAY never overlap the BPM plaque
 * or the four-beat tray. Flank the plaque when there is width; otherwise stack.
 */
export function barChromeLayout(viewW: number, viewH: number, safeBottom = 8): BarChromeLayout {
  const tray = barBeatStripFrame(viewW, viewH);
  const tempo = barTempoFrame(viewW, viewH);
  const world = barWorldRect(viewW, viewH);
  const chipW = Math.max(BAR_CHROME.minTouch, Math.min(BAR_CHROME.chipW, Math.round(viewW * 0.22)));
  const chipH = Math.max(BAR_CHROME.minTouch, BAR_CHROME.chipH);
  const playW = Math.max(BAR_CHROME.minTouch, Math.min(BAR_CHROME.playW, Math.round(viewW * 0.42)));
  const playH = Math.max(BAR_CHROME.minTouch, BAR_CHROME.playH);
  const floor = Math.min(viewH - safeBottom - playH, world.y + world.h - safeBottom - playH);
  const sideRoom = tempo.left - world.x - BAR_CHROME.gap;
  const flankTop = tempo.top + (tempo.height - chipH) / 2;
  const canFlank =
    sideRoom >= chipW &&
    tempo.left + tempo.width + BAR_CHROME.gap + chipW <= world.x + world.w &&
    flankTop >= tray.top + tray.height + BAR_CHROME.gap;

  let tap: BarRect;
  let controls: BarRect;
  let play: BarRect;

  if (canFlank) {
    tap = {
      left: tempo.left - BAR_CHROME.gap - chipW,
      top: tempo.top + (tempo.height - chipH) / 2,
      width: chipW,
      height: chipH,
    };
    controls = {
      left: tempo.left + tempo.width + BAR_CHROME.gap,
      top: tap.top,
      width: chipW,
      height: chipH,
    };
    play = {
      left: world.x + (world.w - playW) / 2,
      top: Math.max(tempo.top + tempo.height + BAR_CHROME.gap, Math.min(floor, tempo.top + tempo.height + BAR_CHROME.gap)),
      width: playW,
      height: playH,
    };
  } else {
    const rowTop = Math.max(tempo.top + tempo.height + BAR_CHROME.gap, tray.top + tray.height + BAR_CHROME.gap);
    tap = {
      left: world.x + BAR_CHROME.gap,
      top: rowTop,
      width: chipW,
      height: chipH,
    };
    controls = {
      left: world.x + world.w - BAR_CHROME.gap - chipW,
      top: rowTop,
      width: chipW,
      height: chipH,
    };
    play = {
      left: world.x + (world.w - playW) / 2,
      top: rowTop + chipH + BAR_CHROME.gap,
      width: playW,
      height: playH,
    };
  }

  return {
    tray,
    tempo,
    tap: clampRect(tap, viewW, viewH),
    controls: clampRect(controls, viewW, viewH),
    play: clampRect(play, viewW, viewH),
  };
}

export function barChromeRectsOverlap(layout: BarChromeLayout): boolean {
  const boxes = [layout.tray, layout.tempo, layout.tap, layout.controls, layout.play];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (rectsOverlap(boxes[i], boxes[j], 1)) return true;
    }
  }
  return false;
}

export function barTempoHitFrame(viewW: number, viewH: number): BarRect {
  const world = barWorldRect(viewW, viewH);
  const visible = barTempoVisibleFrame(viewW, viewH);
  const pad = 10;
  const minTop = world.y + BAR_TEMPO_HIT_TOP * world.h;
  const maxBottom = world.y + BAR_TEMPO_HIT_BOTTOM * world.h;
  const left = visible.left - pad;
  const right = visible.left + visible.width + pad;
  let top = Math.max(visible.top - pad, minTop);
  let bottom = Math.min(visible.top + visible.height + pad, maxBottom);
  if (bottom - top < 48) {
    top = Math.max(minTop, bottom - 48);
  }
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function barBeatStripFrame(viewW: number, viewH: number): BarRect {
  const spec = BAR_BEAT_STRIP;
  const world = barWorldRect(viewW, viewH);
  const width = spec.visW * world.w;
  const height = spec.visH * world.h;
  return {
    left: world.x + spec.x * world.w - width / 2,
    top: world.y + spec.y * world.h - height / 2,
    width,
    height,
  };
}

export function barBeatControlSize(viewW: number, viewH: number): number {
  const world = barWorldRect(viewW, viewH);
  return Math.round(
    Math.min(BAR_BEAT_CONTROL.visMax, Math.max(BAR_BEAT_CONTROL.visMin, BAR_BEAT_CONTROL.visFrac * world.w))
  );
}

export function barBeatControlFrame(viewW: number, viewH: number, index: number): BarRect {
  const strip = barBeatStripFrame(viewW, viewH);
  const size = barBeatControlSize(viewW, viewH);
  const lane = strip.width / BAR_PEOPLE_BEATS.length;
  return {
    left: strip.left + lane * index + (lane - size) / 2,
    top: strip.top + (strip.height - size) / 2,
    width: size,
    height: size,
  };
}

export function barBeatHitFrame(viewW: number, viewH: number, index: number): BarRect {
  const strip = barBeatStripFrame(viewW, viewH);
  const lane = strip.width / BAR_PEOPLE_BEATS.length;
  const width = Math.max(BAR_BEAT_CONTROL.hitMin, lane - 1);
  const height = Math.max(BAR_BEAT_CONTROL.hitMin, strip.height);
  return {
    left: strip.left + lane * index + (lane - width) / 2,
    top: strip.top + (strip.height - height) / 2,
    width,
    height,
  };
}

export function barPeopleHitFrame(viewW: number, viewH: number, index: number): BarRect {
  return barBeatHitFrame(viewW, viewH, index);
}

export function barEmptyMarkerFrame(
  viewW: number,
  viewH: number,
  spec: { x: number }
): BarRect {
  return barCenteredFrame(viewW, viewH, {
    x: spec.x,
    y: BAR_EMPTY_MARKER_Y,
    ...BAR_EMPTY_MARKER,
  });
}

export function barObjectContact(
  viewW: number,
  viewH: number,
  spec: Pick<BarBeatSpec, 'x' | 'contactY' | 'masterW' | 'masterH' | 'contactFrac' | 'visCenterX'>
): { x: number; y: number } {
  const frame = barObjectFrame(viewW, viewH, spec);
  return {
    x: frame.left + spec.visCenterX * frame.width,
    y: frame.top + spec.contactFrac * frame.height,
  };
}

export function barTempoType(
  faceW: number,
  faceH: number,
  bpm: number
): {
  text: string;
  bpmSize: number;
  unitSize: number;
  faceW: number;
  faceH: number;
  fits: boolean;
} {
  const text = String(Math.round(bpm));
  const digits = Math.max(1, text.length);
  const innerW = faceW * 0.92;
  const innerH = faceH * 0.88;
  const unitSize = Math.max(7, Math.min(10, Math.round(innerH * 0.2)));
  const bpmSize = Math.min(innerH * 0.58, innerW / (digits * 0.74));
  const fits = bpmSize >= 11 && bpmSize * digits * 0.64 <= innerW && bpmSize + unitSize + 2 <= innerH;
  return { text, bpmSize, unitSize, faceW, faceH, fits };
}

export function barHitFrame(
  viewW: number,
  viewH: number,
  spec: Pick<BarBeatSpec, 'hitLeft' | 'hitRight'>
): BarRect {
  const world = barWorldRect(viewW, viewH);
  const left = world.x + spec.hitLeft * world.w;
  const right = world.x + spec.hitRight * world.w;
  const top = world.y + BAR_BEAT_HIT_TOP * world.h;
  const bottom = world.y + BAR_BEAT_HIT_BOTTOM * world.h;
  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function rectsOverlap(a: BarRect, b: BarRect, gap = 0): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

export function barObjectIdForBeat(beatIndex: number): BarObjectId | null {
  return BAR_BEATS[beatIndex]?.id ?? null;
}

export function barStateScale(level: 0 | 1 | 2 | 3): number {
  return BAR_STATE_SCALE[level];
}

export function barStateOpacity(level: 0 | 1 | 2 | 3): number {
  return BAR_STATE_OPACITY[level];
}

export function barActorFrame(
  viewW: number,
  viewH: number,
  spec: Pick<BarActorSpec, 'masterX' | 'masterY' | 'masterW' | 'masterH'>
): BarRect {
  const world = barWorldRect(viewW, viewH);
  return {
    left: world.x + (spec.masterX / BAR_MASTER_WIDTH) * world.w,
    top: world.y + (spec.masterY / BAR_MASTER_HEIGHT) * world.h,
    width: (spec.masterW / BAR_MASTER_WIDTH) * world.w,
    height: (spec.masterH / BAR_MASTER_HEIGHT) * world.h,
  };
}

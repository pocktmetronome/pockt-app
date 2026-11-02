export type SafeInsets = { top: number; bottom: number; left: number; right: number };

export type Rect = { x: number; y: number; w: number; h: number };

export type FoundationLayout = {
  compact: boolean;
  g: number;
  knob: number;
  header: Rect;
  identity: Rect;
  tempoName: Rect;
  readout: Rect;
  bpmMinus: Rect;
  bpmPlus: Rect;
  bpmHit: Rect;
  bpmLabel: Rect;
  bpmFontSize: number;
  sound: Rect;
  tuner: Rect;
  dial: Rect;
  stage: Rect;
  D: number;
  beats: Rect;
  beatStrip: Rect;
  meter: Rect;
  transport: Rect;
  tap: Rect;
  play: Rect;
  pockt: Rect;
  navBar: Rect;
  faceRail: Rect;
  /** Uniform North Star scale (source pixels → screen). Width/484, or height-fit when the stack would not fit. */
  ns: number;
};

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

/** Shared deck geometry. The proof renderer and PocktInstrument both mount these rects. */
export function instrumentFurniture(layout: FoundationLayout) {
  const deckTop = layout.tuner.y - 8;
  const stepsBesideDial = layout.bpmMinus.y >= layout.dial.y - 2;
  const readoutInDial = layout.bpmHit.y >= layout.dial.y - 1
    && layout.bpmHit.y + layout.bpmHit.h <= layout.dial.y + layout.dial.h + 1;
  const deckBottom = readoutInDial
    ? layout.tuner.y + layout.tuner.h + 6
    : stepsBesideDial
      ? layout.bpmLabel.y + layout.bpmLabel.h
      : Math.max(layout.bpmMinus.y + layout.bpmMinus.h, layout.bpmHit.y + layout.bpmHit.h) + 10;
  const upperDeck = rect(12, deckTop, Math.max(40, layout.header.w - 24), Math.max(24, deckBottom - deckTop));
  const machineTop = layout.beats.y - 6;
  const machineBottom = layout.transport.y + layout.transport.h + 8;
  const machine = rect(12, machineTop, Math.max(40, layout.header.w - 24), Math.max(8, machineBottom - machineTop));
  const tray = rect(10, layout.faceRail.y - 4, Math.max(40, layout.header.w - 20), layout.faceRail.h + 8);
  return { upperDeck, machine, tray };
}

function expandRect(source: Rect, pad: number): Rect {
  return rect(source.x - pad, source.y - pad, source.w + pad * 2, source.h + pad * 2);
}

/** Wells are derived from the control frames. The plate and the controls share this. */
export function faceplateApertures(layout: FoundationLayout, count = 4) {
  const lip = 3;
  const loopW = Math.min(96, Math.max(44, Math.round(layout.beats.w * 0.168)));
  const loopH = Math.min(72, Math.max(36, Math.round(layout.beats.h * 0.57)));
  const timebase = 16;
  const innerX = layout.beats.x + timebase + 22;
  const innerRight = layout.beats.x + layout.beats.w - loopW - 18;
  const innerW = Math.max(48, innerRight - innerX);
  const col = innerW / Math.max(1, count);
  const disc = Math.min(34, Math.max(18, Math.round(layout.beats.h * 0.34)));
  const lampX = [0.083, 0.274, 0.467, 0.657];
  const sockets = lampX.slice(0, count).map((fraction) => rect(
    layout.beats.x + fraction * layout.beats.w - disc / 2,
    layout.beats.y + 0.636 * layout.beats.h - disc / 2,
    disc,
    disc,
  ));
  void col;
  void innerX;
  void innerW;
  return {
    tempoPocket: rect(layout.dial.x - lip, layout.bpmHit.y - 6, layout.dial.w + lip * 2, layout.dial.y + layout.dial.h - (layout.bpmHit.y - 6) + lip),
    dialSeat: expandRect(layout.dial, lip),
    tuner: expandRect(layout.tuner, lip),
    sound: expandRect(layout.sound, lip),
    minus: expandRect(layout.bpmMinus, lip),
    plus: expandRect(layout.bpmPlus, lip),
    beatChannel: layout.beats,
    sockets,
    timebase: rect(layout.beats.x + 14, layout.beats.y + (layout.beats.h - timebase) / 2, timebase, timebase),
    loop: rect(layout.beats.x + layout.beats.w * 0.814, layout.beats.y + layout.beats.h * 0.36, loopW, loopH),
    tap: expandRect(layout.tap, lip),
    play: expandRect(layout.play, lip),
    meter: expandRect(layout.meter, lip),
    options: expandRect(layout.pockt, lip),
    navChannel: expandRect(layout.faceRail, 1),
  };
}

export const NORTH_STAR_ART = {
  tuner: { x: 92, y: 67, w: 147, h: 109 },
  sound: { x: 707, y: 70, w: 164, h: 104 },
  minus: { x: 48, y: 696, w: 105, h: 105 },
  plus: { x: 788, y: 696, w: 105, h: 105 },
  loop: { x: 731, y: 904, w: 139, h: 113 },
  beat1: { x: 88, y: 924, w: 72, h: 72 },
  beat2: { x: 247, y: 924, w: 72, h: 72 },
  beat3: { x: 407, y: 924, w: 72, h: 72 },
  beat4: { x: 565, y: 924, w: 72, h: 72 },
  tap: { x: 101, y: 1135, w: 327, h: 131 },
  play: { x: 490, y: 1128, w: 352, h: 138 },
  meter: { x: 101, y: 1295, w: 327, h: 120 },
  pockt: { x: 490, y: 1295, w: 352, h: 120 },
  nav: { x: 28, y: 1468, w: 886, h: 204 },
} as const;

export function northStarArtBox(width: number, height: number, insets: SafeInsets, key: keyof typeof NORTH_STAR_ART): Rect {
  const frame = rigidFrame(width, height, insets);
  const art = NORTH_STAR_ART[key];
  return rect(Math.round(frame.mapX(art.x)), Math.round(frame.mapY(art.y)), Math.max(1, Math.round(art.w * frame.s)), Math.max(1, Math.round(art.h * frame.s)));
}

export const FACEPLATE_FRAMES = {
  '320x568': { w: 320, h: 568, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
  '375x667': { w: 375, h: 667, insets: { top: 20, bottom: 0, left: 0, right: 0 } },
  '390x844': { w: 390, h: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  '393x852': { w: 393, h: 852, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  '430x932': { w: 430, h: 932, insets: { top: 59, bottom: 34, left: 0, right: 0 } },
  '375x812': { w: 375, h: 812, insets: { top: 50, bottom: 34, left: 0, right: 0 } },
  '402x874': { w: 402, h: 874, insets: { top: 62, bottom: 34, left: 0, right: 0 } },
  '414x896': { w: 414, h: 896, insets: { top: 48, bottom: 34, left: 0, right: 0 } },
  '428x926': { w: 428, h: 926, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
  '440x956': { w: 440, h: 956, insets: { top: 62, bottom: 34, left: 0, right: 0 } },
} as const;

/** Lit lamp and indicator-dot sprites cut from the master (top-left in master pixels). The faceplate carries them dark. */
export const NORTH_STAR_LAMPS = [
  { lamp: { x: 51, y: 888 }, dot: { x: 107, y: 1024 } },
  { lamp: { x: 210, y: 886 }, dot: { x: 269, y: 1024 } },
  { lamp: { x: 369, y: 886 }, dot: { x: 429, y: 1024 } },
  { lamp: { x: 527, y: 887 }, dot: { x: 586, y: 1024 } },
] as const;
export const NORTH_STAR_LAMP_SIZE = 140;
export const NORTH_STAR_DOT_SIZE = 24;

/** Place a master-pixel sprite on screen with the same rigid frame as the faceplate. */
export function northStarSpriteRect(width: number, height: number, insets: SafeInsets, x: number, y: number, size: number): Rect {
  const frame = rigidFrame(width, height, insets);
  return { x: frame.mapX(x), y: frame.mapY(y), w: size * frame.s, h: size * frame.s };
}

/** The fluted ring of the North Star dial in screen points: master r 198–300 drawn around (469, 501). */
export function northStarRingRect(width: number, height: number, insets: SafeInsets): Rect {
  const frame = rigidFrame(width, height, insets);
  const r = NORTH_STAR_DIAL.fluteOuter;
  return {
    x: frame.mapX(NORTH_STAR_DIAL.cx - r),
    y: frame.mapY(NORTH_STAR_DIAL.cy - r),
    w: r * 2 * frame.s,
    h: r * 2 * frame.s,
  };
}

export function canonicalFaceplateLayout(frame: { w: number; h: number; insets: SafeInsets }) {
  const layout = computeFoundationLayout(frame.w, frame.h, frame.insets, {
    dialChrome: true,
    presentation: 'beats',
    beatRows: 1,
  });
  return { layout, apertures: faceplateApertures(layout, 4) };
}

/** Locked master. Every hardware object uses this one scale on both axes. */
export const NORTH_STAR_MASTER = { w: 941, h: 1672 };

export const NORTH_STAR_DIAL = {
  cx: 469,
  cy: 501,
  glass: 148,
  champagneInner: 160,
  champagneOuter: 182,
  fluteInner: 198,
  fluteOuter: 300,
  bezel: 318,
};

export type RigidFrame = {
  s: number;
  padX: number;
  mapX: (sourceX: number) => number;
  mapY: (sourceY: number) => number;
  unmapY: (screenY: number) => number;
};

/**
 * Canonical 390 screen uses a 425-wide virtual master. Objects stay rigid.
 * Extra phone height sits above the header. The assemblies keep the
 * master's own spacing, and the nav lands on the bottom edge.
 */
export function rigidFrame(width: number, height: number, insets: SafeInsets): RigidFrame {
  void insets;
  const overscan = 425 / 390;
  let s = (width * overscan) / NORTH_STAR_MASTER.w;
  if (NORTH_STAR_MASTER.h * s > height) s = height / NORTH_STAR_MASTER.h;
  const slack = Math.max(0, height - NORTH_STAR_MASTER.h * s);
  const shiftFor = (_sourceY: number) => slack;
  const padX = (width - NORTH_STAR_MASTER.w * s) / 2;
  const mapX = (sourceX: number) => padX + sourceX * s;
  const mapY = (sourceY: number) => {
    const clamped = Math.max(0, Math.min(NORTH_STAR_MASTER.h, sourceY));
    return clamped * s + shiftFor(clamped);
  };
  const unmapY = (screenY: number) => {
    const y = (screenY - slack) / Math.max(0.001, s);
    return Math.max(0, Math.min(NORTH_STAR_MASTER.h, y));
  };
  return { s, padX, mapX, mapY, unmapY };
}

export const INSTRUMENT_FINISH = {
  deck: '#141210',
  edge: 'rgba(176, 140, 82, 0.32)',
  highlight: 'rgba(255, 226, 186, 0.16)',
  radius: 18,
};

/**
 * North Star crop is 484×920. Zones are registered to the tuner/sound top
 * and scaled by one factor. Extra device height stays in the top safe area
 * and below the visible nav, not between the hardware.
 * Source Y is on the 484-wide crop. Visible dial metal is 458; the plate
 * asset fills 97.5% of its box, so the layout box is 470.
 */
function placeNorthStarStack(width: number, height: number, safeInsets: SafeInsets, compact: boolean, dialShare = 0.74, composition: 'heritage' | 'precision' | 'evolved' = 'heritage'): FoundationLayout {
  const headerTop = Math.max(safeInsets.top, 8);
  const navPad = safeInsets.bottom;
  const floor = height - navPad;
  const frame = rigidFrame(width, height, safeInsets);
  const s = frame.s;
  const ps = (value: number) => Math.max(1, Math.round(value * s));
  const mapY = (source: number) => Math.round(frame.mapY(source));
  let sideX = Math.max(8, Math.round(frame.mapX(48)));
  let step = Math.max(40, ps(105));
  let beatsH = Math.max(40, ps(200));
  const rowH = Math.max(52, ps(131));
  const rowGap = Math.max(4, ps(29));
  const railH = Math.max(52, ps(140));
  const tunerH = Math.max(40, ps(109));
  let dialSize = Math.max(160, Math.min(285, ps(NORTH_STAR_DIAL.fluteOuter * 2), width - 8));
  const tunerY = Math.max(headerTop, mapY(67));
  let dialY = mapY(NORTH_STAR_DIAL.cy - NORTH_STAR_DIAL.fluteOuter);
  const stackBottom = (origin: number, size: number, rail: number) => origin + size + 8 + rail + 6 + rowH + rowGap + rowH + 4 + railH;
  if (dialY < tunerY + tunerH + 8) dialY = tunerY + tunerH + 8;
  while (stackBottom(dialY, dialSize, beatsH) > floor && beatsH > 40) beatsH -= 1;
  while (stackBottom(dialY, dialSize, beatsH) > floor && dialSize > 160) dialSize -= 1;
  dialSize = Math.round(dialSize);
  const dial = rect(Math.round((width - dialSize) / 2), dialY, dialSize, dialSize);
  const stepY = Math.max(dial.y + 4, Math.min(dial.y + dial.h - step - 4, mapY(696)));
  while (sideX > 4 && (sideX + step > dial.x - 4 || width - sideX - step < dial.x + dial.w + 4)) sideX -= 1;
  const bpmMinus = rect(sideX, stepY, step, step);
  const bpmPlus = rect(width - sideX - step, stepY, step, step);
  const g = sideX;
  const readW = Math.max(64, Math.round(dialSize * 0.46));
  const readH = Math.max(44, Math.round(ps(NORTH_STAR_DIAL.glass) * 1.15));
  const glassX = frame.mapX(NORTH_STAR_DIAL.cx);
  const glassY = frame.mapY(NORTH_STAR_DIAL.cy);
  const readX = Math.round(glassX - readW / 2);
  const readY = Math.round(glassY - readH / 2);
  const labelH = Math.max(12, Math.round(readH * 0.28));
  const digitH = Math.max(1, readH - labelH);
  const readout = rect(readX, readY, readW, digitH);
  const bpmLabel = rect(readX, readY + digitH, readW, labelH);
  const bpmHit = rect(readX, readY, readW, digitH + labelH);
  const bpmFontSize = Math.max(28, Math.min(92, Math.round(digitH * 0.82)));
  const utility = Math.max(48, ps(147));
  const tuner = rect(Math.max(8, Math.round(frame.mapX(92))), tunerY, utility, tunerH);
  const soundW = Math.max(48, ps(164));
  const sound = rect(Math.min(width - soundW - 8, Math.round(frame.mapX(707))), tuner.y, soundW, Math.max(40, ps(104)));
  const header = rect(0, tuner.y, width, tunerH);
  const identity = rect(tuner.x + tuner.w, tuner.y, Math.max(40, sound.x - (tuner.x + tuner.w)), tunerH);
  const stage = dial;
  let beatsY = Math.max(dial.y + dial.h + 8, Math.min(mapY(900), dial.y + dial.h + 48));
  let rowY = Math.max(beatsY + beatsH + 6, mapY(1135));
  let tapW = Math.max(52, ps(327));
  let playW = Math.max(tapW + 6, ps(352));
  const tapX = Math.max(8, Math.round(frame.mapX(101)));
  let playX = Math.max(tapX + tapW + 8, Math.round(frame.mapX(490)));
  if (playX + playW > width - 8) {
    playW = Math.max(tapW + 6, width - 8 - playX);
  }
  let railY = Math.max(rowY + rowH + rowGap + rowH + 4, Math.min(floor - railH, mapY(1476)));
  if (railY + railH > floor || railY < rowY + rowH + rowGap + rowH + 4) {
    beatsY = dial.y + dial.h + 8;
    rowY = beatsY + beatsH + 6;
    railY = Math.min(floor - railH, rowY + rowH + rowGap + rowH + 16);
    if (railY < rowY + rowH + rowGap + rowH + 4) railY = rowY + rowH + rowGap + rowH + 4;
  }
  const beats = rect(Math.max(8, Math.round(frame.mapX(55))), beatsY, Math.min(width - 16, ps(830)), beatsH);
  const tap = rect(tapX, rowY, tapW, rowH);
  const play = rect(playX, rowY, playW, rowH);
  const meter = rect(tap.x, rowY + rowH + rowGap, tap.w, rowH);
  const pockt = rect(play.x, rowY + rowH + rowGap, play.w, rowH);
  const transport = rect(g, rowY, width - g * 2, meter.y + meter.h - rowY);
  const navBar = rect(0, transport.y + transport.h, width, height - (transport.y + transport.h));
  const railSpan = width - g * 2;
  const railW = Math.floor(railSpan / 6) * 6;
  const faceRail = rect(g + Math.floor((railSpan - railW) / 2), railY, railW, railH);
  const navY = railY;
  const transportY = rowY;
  void navY;
  void dialShare;
  void composition;
  void compact;

  return {
    compact,
    g,
    knob: utility,
    header,
    identity,
    tempoName: rect(0, 0, 0, 0),
    readout,
    bpmMinus,
    bpmPlus,
    bpmHit,
    bpmLabel,
    bpmFontSize,
    sound,
    tuner,
    dial,
    stage,
    D: dial.w,
    beats,
    beatStrip: beats,
    meter,
    transport,
    tap,
    play,
    pockt,
    navBar,
    faceRail,
    ns: Math.min(width, 390) / 484,
  };
}

/**
 * Shared instrument shell.
 * Minus is the left thumb. Plus is the right thumb.
 * Phrase presentation gives the main face to the phrase viewport.
 * Hardware is packed to the North Star: modules touch, the dial is not floated.
 */
export function computeFoundationLayout(
  width: number,
  height: number,
  safeInsets: SafeInsets,
  options?: { dialChrome?: boolean; presentation?: 'beats' | 'phrase'; beatRows?: number; dialShare?: number; composition?: 'heritage' | 'precision' | 'evolved' }
): FoundationLayout {
  const phraseView = options?.presentation === 'phrase';
  const dialChrome = options?.dialChrome !== false && !phraseView;
  const safeHeight = height - safeInsets.top - safeInsets.bottom;
  const compact = safeHeight < 620;
  if (dialChrome) return placeNorthStarStack(width, height, safeInsets, compact, options?.dialShare, options?.composition);
  const g = Math.max(8, Math.round(width * 0.016));
  const grow = Math.max(1, width / 390);
  const narrow = width < 360 ? 0.9 : 1;
  const headerTop = Math.max(safeInsets.top, 8);
  const navPad = Math.max(safeInsets.bottom, 8);
  const budget = Math.max(1, height - headerTop);
  const beatRows = phraseView ? 0 : Math.max(1, options?.beatRows ?? 1);
  const dialCap = Math.max(160, Math.min(width - 12, Math.round(width * 0.93)));

  // Preferred module sizes are the 390 North Star ratios, scaled by width.
  let headerH = Math.round(60 * grow * narrow);
  let stepW = dialChrome ? Math.round(80 * grow * narrow) : 0;
  let beatsH = beatRows === 0 ? 0 : Math.round((beatRows > 1 ? 148 : 98) * grow * narrow);
  let rowH = Math.round(74 * grow * narrow);
  let railH = Math.round(70 * grow * narrow);
  let gap = compact ? 2 : 4;

  const gapCount = () => {
    let n = 1;
    if (stepW > 0) n += 1;
    n += 1;
    if (beatsH > 0) n += 1;
    n += 1;
    return n;
  };
  const chrome = () => headerH + stepW + beatsH + rowH + railH + navPad + gap * gapCount();
  let dialFit = dialCap;
  let guard = 0;
  const floorHeader = compact ? 48 : Math.round(58 * Math.min(grow, 1.08));
  const floorStep = compact ? 50 : Math.round(76 * Math.min(grow, 1.08));
  const floorBeats = compact ? 60 : Math.round(94 * Math.min(grow, 1.08));
  const floorRow = compact ? 44 : Math.round(70 * Math.min(grow, 1.08));
  const floorRail = compact ? 48 : Math.round(66 * Math.min(grow, 1.08));
  const dialFloor = Math.max(160, Math.round(width * (compact ? 0.906 : 0.92)));
  const gapFloor = compact ? 0 : 2;
  while (chrome() + (phraseView ? 140 : dialFit) > budget && guard < 120) {
    const surplus: [string, number][] = [
      ['beats', beatsH - floorBeats],
      ['row', rowH - floorRow],
      ['rail', railH - floorRail],
      ['step', stepW - floorStep],
      ['header', headerH - floorHeader],
    ];
    surplus.sort((a, b) => b[1] - a[1]);
    if (gap > gapFloor) gap -= 1;
    else if (surplus[0][1] > 0) {
      const key = surplus[0][0];
      const cut = Math.min(2, surplus[0][1]);
      if (key === 'beats') beatsH -= cut;
      else if (key === 'row') rowH -= cut;
      else if (key === 'rail') railH -= cut;
      else if (key === 'step' && stepW > 0) stepW -= cut;
      else if (key === 'header') headerH -= cut;
      else if (!phraseView && dialFit > dialFloor) dialFit -= 2;
      else break;
    } else if (!phraseView && dialFit > dialFloor) dialFit -= 2;
    else if (beatsH > (compact ? 56 : 80)) beatsH -= 2;
    else if (rowH > 46) rowH -= 2;
    else if (!phraseView && dialFit > 160) dialFit -= 2;
    else break;
    guard += 1;
  }

  if (!phraseView) {
    let slack = budget - (chrome() + dialFit);
    const give = (room: number) => {
      const n = Math.max(0, Math.min(room, slack));
      slack -= n;
      return n;
    };
    if (slack > 0) {
      const beatCap = Math.min(176, Math.round((beatRows > 1 ? 168 : 112) * grow));
      beatsH += give(Math.max(0, beatCap - beatsH));
      rowH += give(Math.max(0, Math.round(86 * grow) - rowH));
      if (stepW > 0) stepW += give(Math.max(0, Math.round(92 * grow) - stepW));
      railH += give(Math.max(0, Math.round(80 * grow) - railH));
      headerH += give(Math.max(0, Math.round(72 * grow) - headerH));
      if (slack > 0) beatsH += give(Math.max(0, 176 - beatsH));
      if (slack > 0) rowH += slack;
    }
  }

  // 390 master proportions measured from target-aligned-390.png. Dial diameter stays on the existing cap.
  if (width === 390 && !compact && !phraseView && dialChrome) {
    headerH = 56;
    stepW = 86;
    beatsH = 92;
    rowH = 84;
    railH = 72;
    gap = 2;
  }

  const knob = headerH;
  const railCeiling = height - navPad - railH;
  const railY = railCeiling;
  const navBar = rect(0, railY, width, height - railY);
  const faceRail = rect(g, navBar.y, width - g * 2, railH);

  const transportGap = Math.max(8, Math.round(width * 0.028));
  const inner = Math.max(1, width - g * 2 - transportGap * 3);
  const unit = inner / 4.35;
  const tapW = Math.round(unit * 0.92);
  const playW = Math.round(unit * 1.05);
  const meterW = Math.round(unit * 1.12);
  const pW = Math.max(44, width - g - (g + tapW + playW + meterW + transportGap * 3));
  const transportY = railY - gap - rowH;
  const tap = rect(g, transportY, tapW, rowH);
  const play = rect(tap.x + tap.w + transportGap, transportY, playW, rowH);
  const meterX = play.x + play.w + transportGap;
  const meter = rect(meterX, transportY, meterW, rowH);
  const pockt = rect(meter.x + meter.w + transportGap, transportY, pW, rowH);
  const transport = rect(tap.x, transportY, pockt.x + pockt.w - tap.x, rowH);

  const beatsY = transportY - (beatsH > 0 ? gap : 0) - beatsH;
  const beats = rect(g, beatsY, width - 2 * g, beatsH);

  const header = rect(0, headerTop, width, headerH);
  const master = width === 390 && !compact && dialChrome && !phraseView;
  const headerKnob = master ? 52 : knob;
  const headerInset = master ? 22 : g;
  const tuner = rect(headerInset, master ? headerTop + 1 : headerTop, headerKnob, headerKnob);
  if (master) {
    const slot = 8;
    tap.w = 78;
    play.x = tap.x + tap.w + slot;
    play.w = 92;
    meter.x = play.x + play.w + slot;
    meter.w = 86;
    pockt.x = meter.x + meter.w + slot;
    pockt.w = 86;
    transport.x = tap.x;
    transport.w = pockt.x + pockt.w - tap.x;
  }
  const sound = rect(width - headerInset - headerKnob, tuner.y, headerKnob, headerKnob);
  const identity = rect(tuner.x + tuner.w, headerTop, Math.max(40, sound.x - (tuner.x + tuner.w)), headerH);

  const bpmLabelH = dialChrome ? Math.max(14, Math.round(stepW * 0.18)) : 0;
  const bpmH = dialChrome ? Math.max(1, stepW - bpmLabelH) : 0;
  const bpmFontSize = dialChrome ? Math.max(32, Math.min(master ? 58 : 54, Math.round(bpmH * 0.82))) : 16;
  const thumbY = header.y + header.h + gap;
  const tempoKnob = master ? Math.max(48, Math.round(stepW * 0.84)) : stepW;
  const bpmMinus = rect(g, thumbY, dialChrome ? stepW : 0, dialChrome ? stepW : 0);
  if (master) {
    bpmMinus.w = tempoKnob;
    bpmMinus.h = tempoKnob;
    bpmMinus.x = 29;
    bpmMinus.y = thumbY + 3;
  }
  const bpmPlus = rect(width - g - (dialChrome ? stepW : 0), thumbY, dialChrome ? stepW : 0, dialChrome ? stepW : 0);
  if (master) {
    bpmPlus.w = tempoKnob;
    bpmPlus.h = tempoKnob;
    bpmPlus.x = 286;
    bpmPlus.y = bpmMinus.y;
  }
  const tempoGap = 6;
  const wellW = master ? Math.round(width * 0.379) : 0;
  const tempoX = master ? Math.round((width - wellW) / 2) : bpmMinus.x + bpmMinus.w + tempoGap;
  const tempoInner = master ? wellW : Math.max(64, bpmPlus.x - tempoGap - tempoX);
  const readout = rect(dialChrome ? tempoX : 0, thumbY, dialChrome ? tempoInner : 0, bpmH);
  const bpmHit = rect(readout.x, readout.y, readout.w, readout.h);
  const bpmLabel = rect(readout.x, readout.y + bpmH, dialChrome ? readout.w : 0, bpmLabelH);
  const tempoName = rect(0, 0, 0, 0);

  const dialY = dialChrome ? thumbY + stepW + gap : header.y + header.h + gap;
  if (phraseView) {
    const stageH = Math.max(140, beatsY - gap - dialY);
    const stage = rect(0, dialY, width, stageH);
    const D = Math.min(dialCap, stageH);
    const dial = rect((width - D) / 2, dialY + Math.max(0, (stageH - D) / 2), D, D);
    return {
      compact,
      g,
      knob,
      header,
      identity,
      tempoName,
      readout,
      bpmMinus,
      bpmPlus,
      bpmHit,
      bpmLabel,
      bpmFontSize,
      sound,
      tuner,
      dial,
      stage,
      D,
      beats,
      beatStrip: beats,
      meter,
      transport,
      tap,
      play,
      pockt,
      navBar,
      faceRail,
      ns: width / 484,
    };
  }

  const slot = Math.max(160, beatsY - gap - dialY);
  const D = Math.min(dialCap, slot);
  const dial = rect((width - D) / 2, dialY, D, D);
  const stage = rect(0, dialY, width, D);

  return {
    compact,
    g,
    knob,
    header,
    identity,
    tempoName,
    readout,
    bpmMinus,
    bpmPlus,
    bpmHit,
    bpmLabel,
    bpmFontSize,
    sound,
    tuner,
    dial,
    stage,
    D,
    beats,
    beatStrip: beats,
    meter,
    transport,
    tap,
    play,
    pockt,
    navBar,
    faceRail,
    ns: width / 484,
  };
}

export function layoutOverlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rectsInside(parent: Rect, child: Rect): boolean {
  return (
    child.x >= parent.x &&
    child.y >= parent.y &&
    child.x + child.w <= parent.x + parent.w + 0.01 &&
    child.y + child.h <= parent.y + parent.h + 0.01
  );
}

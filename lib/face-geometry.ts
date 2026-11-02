/**
 * Shared geometry for the production faces and the visual-proof harness.
 * No React, no timers, no second musical clock.
 */

export const RHYTHM_OUTER = 0.46;
export const RHYTHM_INNER = 0.28;
export const PULSE_ORIGIN = 0.07;
export const PULSE_EDGE = 0.93;
export const TONEARM_VISUAL_GAIN = 1.15;

export type RhythmRegion = {
  index: number;
  start: number;
  sweep: number;
  mid: number;
};

export function rhythmRegions(count: number, groupStarts: number[]): RhythmRegion[] {
  const n = Math.max(1, Math.round(count));
  const extras = groupStarts.filter((start) => start > 0 && start < n).length;
  const groupGap = extras > 0 ? 10 : 0;
  const kerf = Math.min(3.4, 20 / n);
  const sweep = (360 - groupGap * extras) / n - kerf;
  let cursor = -90 - sweep / 2 - kerf / 2;
  return Array.from({ length: n }, (_, index) => {
    if (groupStarts.includes(index) && index > 0) cursor += groupGap;
    const start = cursor + kerf / 2;
    cursor += sweep + kerf;
    return { index, start, sweep, mid: start + sweep / 2 };
  });
}

export function rhythmActiveIndex(beatIndex: number, count: number): number {
  const n = Math.max(1, Math.round(count));
  const raw = Math.trunc(beatIndex) % n;
  return raw < 0 ? raw + n : raw;
}

export type RhythmPresence = 'recessed' | 'soft' | 'clear' | 'strong';

export function rhythmPresence(strength: number): RhythmPresence {
  if (strength <= 0) return 'recessed';
  if (strength === 1) return 'soft';
  if (strength >= 3) return 'strong';
  return 'clear';
}

/** Glow amount for a region. Stopped faces stay at 0 so the metal still reads. */
export function rhythmGlow(strength: number, active: boolean): number {
  if (!active) return 0;
  const presence = rhythmPresence(strength);
  if (presence === 'recessed') return 0.2;
  if (presence === 'soft') return 0.42;
  if (presence === 'strong') return 1;
  return 0.72;
}

export function rhythmBand(size: number): { outer: number; inner: number; thick: number; hole: number } {
  const outer = size * RHYTHM_OUTER;
  const inner = size * RHYTHM_INNER;
  return { outer, inner, thick: outer - inner, hole: inner * 2 };
}

export function pulseWaveRadius(progress: number, size: number): number {
  'worklet';
  const p = Math.min(1, Math.max(0, progress));
  return (size * (PULSE_ORIGIN + (PULSE_EDGE - PULSE_ORIGIN) * p)) / 2;
}

export function pulseFrontsLive(fronts: { progress: number }[]): number {
  return fronts.filter((front) => front.progress > 0.02 && front.progress < 0.98).length;
}

export function pendulumAngleFromFinger(fingerX: number, width: number, maxDeg: number): number {
  'worklet';
  const span = Math.max(64, width * 0.72);
  const dx = fingerX - width / 2;
  const next = (dx / span) * maxDeg;
  return Math.min(maxDeg, Math.max(-maxDeg, next));
}

/** What the arm transform must display. Held owns the angle. Release blends back to phase. */
export function pendulumRenderedDegrees(held: number, dragAngle: number, blend: number, phaseAngle: number): number {
  'worklet';
  const mix = held > 0.5 ? 1 : Math.min(1, Math.max(0, blend));
  return mix * dragAngle + (1 - mix) * phaseAngle;
}

export function proModuleFits(count: number, width: number, height: number): boolean {
  const rows = proModuleRows(count);
  const per = Math.ceil(Math.max(1, count) / rows);
  const gap = count >= 12 ? 4 : 8;
  const cell = Math.floor((Math.max(0, width) - gap * Math.max(0, per - 1)) / Math.max(1, per));
  const block = rows * cell + (rows - 1) * gap;
  return cell >= 28 && block <= height;
}

export function beatlineModuleFits(count: number, size: number): boolean {
  const nodes = beatlineNodeLayout(count, [], size);
  return nodes.every((node) => node.cx - node.d / 2 >= -1 && node.cx + node.d / 2 <= size + 1 && node.cy + node.d / 2 <= size + 1 && node.d >= 20);
}

export function proModuleRows(count: number): number {
  const n = Math.max(1, Math.round(count));
  if (n >= 9) return 3;
  if (n >= 5) return 2;
  return 1;
}

export type BeatlineNode = {
  index: number;
  row: number;
  cx: number;
  cy: number;
  d: number;
  group: number;
};

export function beatlineNodeLayout(count: number, groupLengths: number[], size: number): BeatlineNode[] {
  const n = Math.max(1, Math.round(count));
  const lengths = groupLengths.length ? groupLengths : [n];
  const rows = n <= 5 ? 1 : n <= 8 ? 2 : 3;
  const fieldW = size * 0.84;
  const per = Math.ceil(n / rows);
  const gap = per >= 5 ? 8 : 12;
  const raw = (fieldW - gap * Math.max(0, per - 1)) / per;
  const d = Math.min(58, Math.max(36, raw));
  const rowGap = 18;
  const blockH = rows * d + (rows - 1) * rowGap;
  const top = (size - blockH) / 2;
  const nodes: BeatlineNode[] = [];
  const groupOf: number[] = [];
  lengths.forEach((length, group) => {
    for (let i = 0; i < length && groupOf.length < n; i += 1) groupOf.push(group);
  });
  while (groupOf.length < n) groupOf.push(0);
  for (let index = 0; index < n; index += 1) {
    const row = Math.floor(index / per);
    const col = index % per;
    const inRow = Math.min(per, n - row * per);
    const rowW = inRow * d + (inRow - 1) * gap;
    const left = (size - rowW) / 2;
    nodes.push({
      index,
      row,
      cx: left + col * (d + gap) + d / 2,
      cy: top + row * (d + rowGap) + d / 2,
      d,
      group: groupOf[index] ?? 0,
    });
  }
  return nodes;
}

/**
 * Vinyl tuner geometry.
 * The arm has one length and rotates about a pivot that sits off the record.
 * Negative cents (flat) sit outside the target groove. Positive cents (sharp) sit inside it.
 * Both ends stay in the playable annulus, outside the label and inside the rim.
 */
const VINYL_DISC_CX = 0.5;
const VINYL_DISC_CY = 0.5;
const VINYL_DISC_R = 0.498;
const VINYL_LABEL_FRAC = 0.26;
const VINYL_RUNOUT_FRAC = 0.05;
const VINYL_OUTER_FRAC = 0.9;
const VINYL_HOUSING_FRAC = 0.038;
const VINYL_GAP_FRAC = 0.016;
const VINYL_RAY = (48 * Math.PI) / 180;
const VINYL_ARM_FRAC = 0.36;
const VINYL_ARC_INNER_DEG = 6;
const VINYL_ARC_SWEEP = 30;

type VinylLayout = {
  discCx: number;
  discCy: number;
  discR: number;
  labelR: number;
  innerR: number;
  outerR: number;
  housingR: number;
  pivotX: number;
  pivotY: number;
  armLength: number;
  bearing: number;
};

function vinylLayout(size: number): VinylLayout {
  'worklet';
  const discCx = size * VINYL_DISC_CX;
  const discCy = size * VINYL_DISC_CY;
  const discR = size * VINYL_DISC_R;
  const labelR = discR * VINYL_LABEL_FRAC;
  const housingR = size * VINYL_HOUSING_FRAC;
  const pivotDist = discR + size * VINYL_GAP_FRAC + housingR;
  const pivotX = discCx + Math.cos(VINYL_RAY) * pivotDist;
  const pivotY = discCy + Math.sin(VINYL_RAY) * pivotDist;
  return {
    discCx,
    discCy,
    discR,
    labelR,
    innerR: labelR + discR * VINYL_RUNOUT_FRAC,
    outerR: discR * VINYL_OUTER_FRAC,
    housingR,
    pivotX,
    pivotY,
    armLength: size * VINYL_ARM_FRAC,
    bearing: Math.atan2(discCy - pivotY, discCx - pivotX),
  };
}

function poseOnArc(layout: VinylLayout, cents: number): { tipX: number; tipY: number; deg: number; radius: number } {
  'worklet';
  const clamped = Math.max(-50, Math.min(50, Number.isFinite(cents) ? cents : 0));
  const u = (clamped + 50) / 100;
  const deg = VINYL_ARC_INNER_DEG + VINYL_ARC_SWEEP - u * VINYL_ARC_SWEEP;
  const angle = layout.bearing + (deg * Math.PI) / 180;
  const tipX = layout.pivotX + Math.cos(angle) * layout.armLength;
  const tipY = layout.pivotY + Math.sin(angle) * layout.armLength;
  return {
    tipX,
    tipY,
    deg: (Math.atan2(tipY - layout.pivotY, tipX - layout.pivotX) * 180) / Math.PI,
    radius: Math.hypot(tipX - layout.discCx, tipY - layout.discCy),
  };
}

/** Record fills the instrument. The tonearm housing is off that record, bottom-right. */
export function turntableGeometry(size: number): {
  discCx: number;
  discCy: number;
  discR: number;
  labelR: number;
  grooveR: number;
  innerR: number;
  outerR: number;
  housingR: number;
  armLength: number;
  pivotX: number;
  pivotY: number;
} {
  'worklet';
  const layout = vinylLayout(size);
  const zero = poseOnArc(layout, 0);
  return {
    discCx: layout.discCx,
    discCy: layout.discCy,
    discR: layout.discR,
    labelR: layout.labelR,
    grooveR: zero.radius,
    innerR: layout.innerR,
    outerR: layout.outerR,
    housingR: layout.housingR,
    armLength: layout.armLength,
    pivotX: layout.pivotX,
    pivotY: layout.pivotY,
  };
}

export function tonearmPose(cents: number, size: number): {
  pivotX: number;
  pivotY: number;
  length: number;
  deg: number;
  tipX: number;
  tipY: number;
  radius: number;
  visual: number;
  discCx: number;
  discCy: number;
  discR: number;
  labelR: number;
} {
  'worklet';
  const layout = vinylLayout(size);
  const clamped = Math.max(-50, Math.min(50, Number.isFinite(cents) ? cents : 0));
  const pose = poseOnArc(layout, clamped);
  return {
    pivotX: layout.pivotX,
    pivotY: layout.pivotY,
    length: layout.armLength,
    deg: pose.deg,
    tipX: pose.tipX,
    tipY: pose.tipY,
    radius: pose.radius,
    visual: clamped * TONEARM_VISUAL_GAIN,
    discCx: layout.discCx,
    discCy: layout.discCy,
    discR: layout.discR,
    labelR: layout.labelR,
  };
}

export function stylusClearsLabel(cents: number, size = 340): boolean {
  const pose = tonearmPose(cents, size);
  return pose.radius >= pose.labelR + 1;
}

/** Stylus stays outside the label runout and inside the outer groove for every clamped cent. */
export function stylusInPlayableAnnulus(cents: number, size = 340): boolean {
  const pose = tonearmPose(cents, size);
  const table = turntableGeometry(size);
  return pose.radius >= table.innerR - 0.05 && pose.radius <= table.outerR + 0.05;
}

export function stylusInsideInstrument(cents: number, size = 340): boolean {
  const pose = tonearmPose(cents, size);
  return Math.hypot(pose.tipX - size / 2, pose.tipY - size / 2) <= size / 2 - 1;
}

/** The straight arm from the off-record pivot to the tip does not cut the label. */
export function tonearmSegmentClearsLabel(cents: number, size = 340): boolean {
  const pose = tonearmPose(cents, size);
  const abx = pose.tipX - pose.pivotX;
  const aby = pose.tipY - pose.pivotY;
  const apx = pose.discCx - pose.pivotX;
  const apy = pose.discCy - pose.pivotY;
  const ab2 = abx * abx + aby * aby;
  const raw = ab2 > 0 ? (apx * abx + apy * aby) / ab2 : 0;
  const t = Math.max(0, Math.min(1, raw));
  const dist = Math.hypot(pose.discCx - (pose.pivotX + abx * t), pose.discCy - (pose.pivotY + aby * t));
  return dist >= pose.labelR + 2;
}

/** Pivot housing sits off the vinyl, in the lower-right of the square viewport. */
export function tonearmBaseClearsRecord(size = 340): boolean {
  const table = turntableGeometry(size);
  const fromDisc = Math.hypot(table.pivotX - table.discCx, table.pivotY - table.discCy);
  const margin = 1;
  const insideSquare =
    table.pivotX - table.housingR >= margin &&
    table.pivotY - table.housingR >= margin &&
    table.pivotX + table.housingR <= size - margin &&
    table.pivotY + table.housingR <= size - margin;
  return fromDisc >= table.discR + table.housingR + size * 0.01 && insideSquare;
}

export function faceMeasures(size = 340) {
  const band = rhythmBand(size);
  const four = rhythmRegions(4, [0]);
  const twelve = rhythmRegions(12, [0, 3, 6, 9]);
  const nodes4 = beatlineNodeLayout(4, [4], size);
  const nodes7 = beatlineNodeLayout(7, [2, 2, 3], size);
  const nodes12 = beatlineNodeLayout(12, [3, 3, 3, 3], size);
  const arm = size * 0.62;
  const swing = (Math.asin(Math.min(0.999, (size / 2 - 1) / arm)) * 180) / Math.PI;
  const hit = size * 0.72;
  const left = pendulumAngleFromFinger(hit * 0.08, hit, swing);
  const right = pendulumAngleFromFinger(hit * 0.92, hit, swing);
  const flat = tonearmPose(-25, size);
  const sharp = tonearmPose(25, size);
  return {
    rhythmThick: Math.round(band.thick * 10) / 10,
    rhythmHole: Math.round(band.hole * 10) / 10,
    rhythm4Sweep: Math.round(four[0].sweep * 10) / 10,
    rhythm12Sweep: Math.round(twelve[0].sweep * 10) / 10,
    pulse0: Math.round(pulseWaveRadius(0, size) * 10) / 10,
    pulse25: Math.round(pulseWaveRadius(0.25, size) * 10) / 10,
    pulse50: Math.round(pulseWaveRadius(0.5, size) * 10) / 10,
    pulse75: Math.round(pulseWaveRadius(0.75, size) * 10) / 10,
    pulseEdge: Math.round(pulseWaveRadius(1, size) * 10) / 10,
    pendulumArm: Math.round(arm * 10) / 10,
    pendulumSwing: Math.round(swing * 10) / 10,
    pendulumLeft: Math.round(left * 10) / 10,
    pendulumRight: Math.round(right * 10) / 10,
    proRows4: proModuleRows(4),
    proRows7: proModuleRows(7),
    proRows12: proModuleRows(12),
    proCell4: Math.round(((size * 0.78 - 12 - 8 * 3) / 4) * 10) / 10,
    beatline4: Math.round(nodes4[0].d * 10) / 10,
    beatline7: Math.round(nodes7[0].d * 10) / 10,
    beatline12: Math.round(nodes12[0].d * 10) / 10,
    beatlineRows12: new Set(nodes12.map((node) => node.row)).size,
    tunerFlatX: Math.round(flat.tipX * 10) / 10,
    tunerSharpX: Math.round(sharp.tipX * 10) / 10,
    tunerTravel: Math.round(Math.hypot(sharp.tipX - flat.tipX, sharp.tipY - flat.tipY) * 10) / 10,
  };
}

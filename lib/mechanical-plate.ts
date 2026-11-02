/** Shared cover-mapping for the Mechanical studio plate, rod, weight, and hit region. */

export const MECHANICAL_PLATE_SOURCE = {
  width: 576,
  height: 1024,
} as const;

/** Normalized source-image coordinates. Pivot is the lower silver axle. */
export const MECHANICAL_PLATE_PIVOT = {
  x: 0.5,
  y: 0.693,
  slotTopY: 0.228,
} as const;

export type CoverLayout = {
  viewW: number;
  viewH: number;
  scale: number;
  drawW: number;
  drawH: number;
  originX: number;
  originY: number;
};

export function coverLayout(
  viewW: number,
  viewH: number,
  srcW = MECHANICAL_PLATE_SOURCE.width,
  srcH = MECHANICAL_PLATE_SOURCE.height
): CoverLayout {
  const width = Math.max(1, viewW);
  const height = Math.max(1, viewH);
  const scale = Math.max(width / srcW, height / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  return {
    viewW: width,
    viewH: height,
    scale,
    drawW,
    drawH,
    originX: (width - drawW) / 2,
    originY: (height - drawH) / 2,
  };
}

export function mapPlatePoint(nx: number, ny: number, layout: CoverLayout): { x: number; y: number } {
  return {
    x: layout.originX + nx * layout.drawW,
    y: layout.originY + ny * layout.drawH,
  };
}

export type MechanicalRodLayout = {
  cover: CoverLayout;
  pivotX: number;
  pivotY: number;
  rodHeight: number;
  rodWidth: number;
  weightWidth: number;
  weightHeight: number;
  hitLeft: number;
  hitTop: number;
  hitWidth: number;
  hitHeight: number;
  layer: 'pendulum';
};

export function mechanicalRodLayout(viewW: number, viewH: number): MechanicalRodLayout {
  const cover = coverLayout(viewW, viewH);
  const pivot = mapPlatePoint(MECHANICAL_PLATE_PIVOT.x, MECHANICAL_PLATE_PIVOT.y, cover);
  const top = mapPlatePoint(MECHANICAL_PLATE_PIVOT.x, MECHANICAL_PLATE_PIVOT.slotTopY, cover);
  const rodHeight = Math.max(96, pivot.y - top.y);
  const rodWidth = Math.max(7, Math.round(cover.scale * 8));
  const hitWidth = Math.max(88, Math.round(cover.scale * 120));
  const hitHeight = rodHeight + 36;
  return {
    cover,
    pivotX: pivot.x,
    pivotY: pivot.y,
    rodHeight,
    rodWidth,
    weightWidth: Math.max(28, Math.round(cover.scale * 36)),
    weightHeight: Math.max(34, Math.round(cover.scale * 44)),
    hitLeft: pivot.x - hitWidth / 2,
    hitTop: pivot.y - rodHeight - 12,
    hitWidth,
    hitHeight,
    layer: 'pendulum',
  };
}

export function swingTipOffset(rodHeight: number, deg: number): number {
  return Math.abs(Math.sin((deg * Math.PI) / 180) * rodHeight);
}

export function swingFitsView(viewW: number, pivotX: number, rodHeight: number, maxDeg: number, inset = 6): boolean {
  const tip = swingTipOffset(rodHeight, maxDeg);
  return pivotX - tip >= inset && pivotX + tip <= viewW - inset;
}

export function weightTopFromT(t: number, rodHeight: number, weightHeight: number): number {
  'worklet';
  const travel = Math.max(16, rodHeight - weightHeight - 12);
  return 8 + Math.min(1, Math.max(0, t)) * travel;
}

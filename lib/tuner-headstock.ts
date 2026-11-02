export const HEADSTOCK_VIEW = { w: 1024, h: 1536 } as const;

export type HeadstockAnchor = { x: number; y: number };

/** Nut left→right is low string → high string for face-on 3+3 and 6-inline. */
export const NUT_3X3 = { x: 390, y: 1390, w: 244 };
export const NUT_6INLINE = { x: 387, y: 1390, w: 250 };

export const PEGS_3X3: HeadstockAnchor[] = [
  { x: 330, y: 350 },
  { x: 312, y: 575 },
  { x: 305, y: 800 },
  { x: 719, y: 800 },
  { x: 712, y: 575 },
  { x: 694, y: 350 },
];

export const PEGS_6INLINE: HeadstockAnchor[] = [
  { x: 592, y: 1175 },
  { x: 600, y: 1000 },
  { x: 607, y: 825 },
  { x: 615, y: 650 },
  { x: 625, y: 475 },
  { x: 640, y: 300 },
];

export function nutPoint(count: number, index: number, nut: { x: number; y: number; w: number }): HeadstockAnchor {
  const n = Math.max(1, count);
  const t = (index + 0.5) / n;
  return { x: nut.x + nut.w * t, y: nut.y };
}

export function pegsFor(style: '3x3' | '6inline', count: number): HeadstockAnchor[] {
  const source = style === '6inline' ? PEGS_6INLINE : PEGS_3X3;
  if (count >= source.length) return source;
  if (style === '6inline') return source.slice(source.length - count);
  if (count === 4) return [source[0], source[2], source[3], source[5]];
  if (count === 5) return [source[0], source[1], source[2], source[3], source[5]];
  return source.slice(0, count);
}

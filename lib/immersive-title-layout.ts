export type ImmersiveTitleId = 'bar' | 'studio' | 'altered';

export type ImmersiveTitleLayout = {
  id: ImmersiveTitleId;
  lines: string[];
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  padX: number;
  bandLeft: number;
  bandRight: number;
  bandTop: number;
  bandHeight: number;
  textWidth: number;
  maxLineWidth: number;
  centered: boolean;
  clips: boolean;
};

const LINES: Record<ImmersiveTitleId, string[]> = {
  bar: ['WHISKEY', 'BAR'],
  studio: ['STUDIO'],
  altered: ['ALTERED'],
};

/** Conservative glyph width including tracking. Never ellipsize. */
export function immersiveTitleTextWidth(text: string, fontSize: number, letterSpacing: number): number {
  const tracking = Math.max(0, text.length - 1) * letterSpacing;
  return text.length * fontSize * 0.72 + tracking;
}

export function immersiveTitleLayout(id: ImmersiveTitleId, tileWidth: number): ImmersiveTitleLayout {
  const lines = LINES[id];
  const padX = 12;
  const bandLeft = padX;
  const bandRight = padX;
  const inner = Math.max(0, tileWidth - bandLeft - bandRight);
  let fontSize = 15;
  let letterSpacing = 0.8;
  if (tileWidth < 340) {
    fontSize = 14;
    letterSpacing = 0.45;
  } else if (tileWidth >= 400) {
    fontSize = 16;
    letterSpacing = 0.9;
  }
  const lineHeight = Math.round(fontSize * 1.18);
  let maxLineWidth = Math.max(...lines.map((line) => immersiveTitleTextWidth(line, fontSize, letterSpacing)));
  while (maxLineWidth > inner - 2 && letterSpacing > 0.15) {
    letterSpacing -= 0.1;
    maxLineWidth = Math.max(...lines.map((line) => immersiveTitleTextWidth(line, fontSize, letterSpacing)));
  }
  const bandHeight = lines.length * lineHeight + 10;
  return {
    id,
    lines,
    fontSize,
    letterSpacing,
    lineHeight,
    padX,
    bandLeft,
    bandRight,
    bandTop: 8,
    bandHeight,
    textWidth: maxLineWidth,
    maxLineWidth,
    centered: true,
    clips: maxLineWidth > inner,
  };
}

export function immersiveTitleVisible(id: ImmersiveTitleId, tileWidth: number): string {
  return immersiveTitleLayout(id, tileWidth).lines.join('\n');
}

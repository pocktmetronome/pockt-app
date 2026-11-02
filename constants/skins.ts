import type { SkinCategoryId, SkinId } from '@/lib/types';

export type SkinTheme = {
  id: SkinId;
  label: string;
  descriptor: string;
  line: string;
  bg: string;
  bgRaised: string;
  bgPanel: string;
  ivory: string;
  ivoryDim: string;
  ivoryMute: string;
  accent: string;
  accentSoft: string;
  mustard: string;
  playIdleBg: string;
  playIdleBorder: string;
  playActiveBg: string;
  playActiveBorder: string;
  playRadius: number;
  playGlow: string;
  bpmShadow: string;
  bpmShade: string;
  lampOff: string;
  lampOn: string;
  lampDown: string;
  lampBack: string;
  sliderMin: string;
  sliderMax: string;
  thumb: string;
  grain: number;
};

export const SKINS: Record<SkinId, SkinTheme> = {
  classic: {
    id: 'classic',
    label: 'CLASSIC',
    descriptor: 'The original. Accurate. Professional.',
    bg: '#0C0D10',
    bgRaised: '#16181D',
    bgPanel: '#1C1F26',
    ivory: '#F4F6FA',
    ivoryDim: '#A8B0BE',
    ivoryMute: '#6E7686',
    accent: '#7EA2C8',
    accentSoft: '#5C7A9A',
    mustard: '#C8D0DC',
    line: '#2A303A',
    playIdleBg: 'rgba(28, 34, 44, 0.55)',
    playIdleBorder: 'rgba(196, 210, 228, 0.38)',
    playActiveBg: 'rgba(70, 96, 124, 0.32)',
    playActiveBorder: 'rgba(168, 198, 226, 0.7)',
    playRadius: 8,
    playGlow: 'rgba(126, 162, 200, 0.28)',
    bpmShadow: 'rgba(0, 0, 0, 0.55)',
    bpmShade: 'rgba(8, 10, 14, 0)',
    lampOff: '#1A1E26',
    lampOn: '#9BB4CC',
    lampDown: '#E8EEF6',
    lampBack: '#3A4656',
    sliderMin: '#7EA2C8',
    sliderMax: '#2A303A',
    thumb: '#F4F6FA',
    grain: 0.012,
  },
  titanium: {
    id: 'titanium',
    label: 'TITANIUM',
    descriptor: 'Machined receiver. Exact tempo.',
    bg: '#121314',
    bgRaised: '#1A1C1E',
    bgPanel: '#202326',
    ivory: '#F3F1EC',
    ivoryDim: '#A8A49C',
    ivoryMute: '#6E6A64',
    accent: '#D4542A',
    accentSoft: '#A83C20',
    mustard: '#C8B49A',
    line: '#2C2E32',
    playIdleBg: 'rgba(22, 24, 26, 0.55)',
    playIdleBorder: 'rgba(210, 196, 176, 0.36)',
    playActiveBg: 'rgba(80, 36, 22, 0.36)',
    playActiveBorder: 'rgba(212, 84, 42, 0.7)',
    playRadius: 10,
    playGlow: 'rgba(212, 84, 42, 0.28)',
    bpmShadow: 'rgba(0, 0, 0, 0.62)',
    bpmShade: 'rgba(10, 10, 12, 0)',
    lampOff: '#1A1C1E',
    lampOn: '#E07048',
    lampDown: '#F0A878',
    lampBack: '#4A2C22',
    sliderMin: '#D4542A',
    sliderMax: '#2C2E32',
    thumb: '#F3F1EC',
    grain: 0.01,
  },
  studio: {
    id: 'studio',
    label: 'STUDIO',
    descriptor: 'Record. Lock. Groove.',
    bg: '#12100E',
    bgRaised: '#1A1714',
    bgPanel: '#1F1B17',
    ivory: '#EDE6D8',
    ivoryDim: '#B4AA9A',
    ivoryMute: '#7A7266',
    accent: '#D4893A',
    accentSoft: '#B87532',
    mustard: '#C4A056',
    line: '#3A342C',
    playIdleBg: 'rgba(42, 28, 16, 0.18)',
    playIdleBorder: 'rgba(214, 176, 122, 0.34)',
    playActiveBg: 'rgba(86, 48, 24, 0.28)',
    playActiveBorder: 'rgba(212, 156, 88, 0.58)',
    playRadius: 13,
    playGlow: 'rgba(196, 148, 72, 0.3)',
    bpmShadow: 'rgba(24, 14, 8, 0.55)',
    bpmShade: 'rgba(22, 16, 10, 0)',
    lampOff: '#2A241E',
    lampOn: '#E0B060',
    lampDown: '#F0D090',
    lampBack: '#6A5030',
    sliderMin: '#D4893A',
    sliderMax: '#3A342C',
    thumb: '#EDE6D8',
    grain: 0.02,
  },
  altered: {
    id: 'altered',
    label: 'ALTERED',
    descriptor: 'Lose the grid. Find the groove.',
    bg: '#120C16',
    bgRaised: '#1C1424',
    bgPanel: '#24182C',
    ivory: '#F0E4D4',
    ivoryDim: '#C4A898',
    ivoryMute: '#8A7068',
    accent: '#E07040',
    accentSoft: '#C45A78',
    mustard: '#E0C050',
    line: '#4A3060',
    playIdleBg: 'rgba(28, 14, 40, 0.42)',
    playIdleBorder: 'rgba(232, 210, 246, 0.62)',
    playActiveBg: 'rgba(92, 42, 118, 0.24)',
    playActiveBorder: 'rgba(206, 168, 228, 0.56)',
    playRadius: 24,
    playGlow: 'rgba(168, 96, 196, 0.32)',
    bpmShadow: 'rgba(72, 28, 96, 0.42)',
    bpmShade: 'rgba(40, 18, 52, 0)',
    lampOff: '#2E2238',
    lampOn: '#E89050',
    lampDown: '#F0D070',
    lampBack: '#6A4070',
    sliderMin: '#C45A88',
    sliderMax: '#3A2848',
    thumb: '#F0E4D4',
    grain: 0.025,
  },
  'after-dark': {
    id: 'after-dark',
    label: 'AFTER DARK',
    descriptor: 'Late. Loose. Locked in.',
    bg: '#080305',
    bgRaised: '#14080A',
    bgPanel: '#1A0A0E',
    ivory: '#F0E4DC',
    ivoryDim: '#C4A098',
    ivoryMute: '#8A5A58',
    accent: '#A84A3C',
    accentSoft: '#7A3028',
    mustard: '#D4B06A',
    line: '#4A2028',
    playIdleBg: 'rgba(22, 8, 12, 0.2)',
    playIdleBorder: 'rgba(196, 140, 88, 0.38)',
    playActiveBg: 'rgba(72, 22, 32, 0.28)',
    playActiveBorder: 'rgba(212, 168, 96, 0.6)',
    playRadius: 18,
    playGlow: 'rgba(186, 112, 56, 0.3)',
    bpmShadow: 'rgba(28, 8, 10, 0.55)',
    bpmShade: 'rgba(28, 8, 10, 0)',
    lampOff: '#2A1410',
    lampOn: '#C48A58',
    lampDown: '#E0C090',
    lampBack: '#6A4030',
    sliderMin: '#C47848',
    sliderMax: '#3A181C',
    thumb: '#F0E4DC',
    grain: 0.018,
  },
  bar: {
    id: 'bar',
    label: 'WHISKEY BAR',
    descriptor: 'Warm room. Brass stage. Locked in.',
    bg: '#0A0705',
    bgRaised: '#16100C',
    bgPanel: '#1C1410',
    ivory: '#F0E4D4',
    ivoryDim: '#C4A888',
    ivoryMute: '#8A6A50',
    accent: '#C47848',
    accentSoft: '#8A4E2C',
    mustard: '#D4B06A',
    line: '#4A3020',
    playIdleBg: 'rgba(22, 14, 8, 0.22)',
    playIdleBorder: 'rgba(196, 140, 88, 0.4)',
    playActiveBg: 'rgba(92, 48, 24, 0.3)',
    playActiveBorder: 'rgba(212, 168, 96, 0.62)',
    playRadius: 18,
    playGlow: 'rgba(186, 112, 56, 0.3)',
    bpmShadow: 'rgba(20, 10, 6, 0.55)',
    bpmShade: 'rgba(20, 10, 6, 0)',
    lampOff: '#2A1810',
    lampOn: '#C48A58',
    lampDown: '#E0C090',
    lampBack: '#6A4030',
    sliderMin: '#C47848',
    sliderMax: '#3A2014',
    thumb: '#F0E4D4',
    grain: 0.018,
  },
  heavy: {
    id: 'heavy',
    label: 'HEAVY',
    descriptor: 'Precision machinery. Concert energy.',
    bg: '#070708',
    bgRaised: '#121214',
    bgPanel: '#18181C',
    ivory: '#E4E0DA',
    ivoryDim: '#9A9690',
    ivoryMute: '#686460',
    accent: '#C4342C',
    accentSoft: '#8A2A26',
    mustard: '#A8A49C',
    line: '#2E2C2E',
    playIdleBg: 'rgba(18, 10, 10, 0.42)',
    playIdleBorder: 'rgba(196, 72, 64, 0.5)',
    playActiveBg: 'rgba(92, 18, 18, 0.48)',
    playActiveBorder: 'rgba(220, 72, 56, 0.78)',
    playRadius: 2,
    playGlow: 'rgba(196, 52, 40, 0.38)',
    bpmShadow: 'rgba(0, 0, 0, 0.78)',
    bpmShade: 'rgba(6, 6, 8, 0)',
    lampOff: '#161414',
    lampOn: '#D05044',
    lampDown: '#F0A090',
    lampBack: '#4A2424',
    sliderMin: '#C4342C',
    sliderMax: '#242224',
    thumb: '#E4E0DA',
    grain: 0.01,
  },
  sundown: {
    id: 'sundown',
    label: 'SUNDOWN',
    descriptor: 'LOW. WARM. LOCKED IN.',
    bg: '#16100C',
    bgRaised: '#221810',
    bgPanel: '#2A1E14',
    ivory: '#F2E4D0',
    ivoryDim: '#C8A888',
    ivoryMute: '#8A6E54',
    accent: '#E08A42',
    accentSoft: '#B86A32',
    mustard: '#D4A05A',
    line: '#3A2A1E',
    playIdleBg: 'rgba(48, 28, 16, 0.32)',
    playIdleBorder: 'rgba(224, 148, 80, 0.4)',
    playActiveBg: 'rgba(96, 48, 22, 0.38)',
    playActiveBorder: 'rgba(232, 168, 96, 0.66)',
    playRadius: 14,
    playGlow: 'rgba(224, 138, 66, 0.34)',
    bpmShadow: 'rgba(20, 10, 4, 0.62)',
    bpmShade: 'rgba(18, 10, 6, 0)',
    lampOff: '#2A1C14',
    lampOn: '#E09A58',
    lampDown: '#F0C888',
    lampBack: '#6A4024',
    sliderMin: '#E08A42',
    sliderMax: '#3A2A1E',
    thumb: '#F2E4D0',
    grain: 0.014,
  },
  roots: {
    id: 'roots',
    label: 'ROOTS',
    descriptor: 'Hand-built resonance.',
    bg: '#120E0A',
    bgRaised: '#1C1610',
    bgPanel: '#241C14',
    ivory: '#F4E8D2',
    ivoryDim: '#C8B090',
    ivoryMute: '#8C7A60',
    accent: '#C49A58',
    accentSoft: '#A07A40',
    mustard: '#E0C488',
    line: '#3A2E22',
    playIdleBg: 'rgba(52, 36, 18, 0.3)',
    playIdleBorder: 'rgba(212, 168, 104, 0.42)',
    playActiveBg: 'rgba(96, 64, 28, 0.36)',
    playActiveBorder: 'rgba(224, 180, 112, 0.66)',
    playRadius: 16,
    playGlow: 'rgba(196, 150, 80, 0.32)',
    bpmShadow: 'rgba(18, 10, 4, 0.58)',
    bpmShade: 'rgba(16, 10, 6, 0)',
    lampOff: '#2A2218',
    lampOn: '#D4B070',
    lampDown: '#F2DCB0',
    lampBack: '#6A5030',
    sliderMin: '#C49A58',
    sliderMax: '#3A2E22',
    thumb: '#F4E8D2',
    grain: 0.016,
  },
  heart: {
    id: 'heart',
    label: 'HEART',
    descriptor: 'Living pulse. Organic chamber.',
    bg: '#0A0406',
    bgRaised: '#16080A',
    bgPanel: '#1C0A0C',
    ivory: '#F4E4DC',
    ivoryDim: '#C48880',
    ivoryMute: '#8A504C',
    accent: '#C42838',
    accentSoft: '#8A1824',
    mustard: '#D47868',
    line: '#4A181C',
    playIdleBg: 'rgba(42, 10, 14, 0.28)',
    playIdleBorder: 'rgba(196, 64, 72, 0.42)',
    playActiveBg: 'rgba(92, 18, 28, 0.4)',
    playActiveBorder: 'rgba(224, 80, 88, 0.7)',
    playRadius: 20,
    playGlow: 'rgba(196, 40, 56, 0.36)',
    bpmShadow: 'rgba(20, 4, 6, 0.62)',
    bpmShade: 'rgba(12, 4, 6, 0)',
    lampOff: '#2A1014',
    lampOn: '#E04850',
    lampDown: '#F09088',
    lampBack: '#6A2028',
    sliderMin: '#C42838',
    sliderMax: '#3A1418',
    thumb: '#F4E4DC',
    grain: 0.02,
  },
};

export const SKIN_ORDER: SkinId[] = [
  'classic',
  'titanium',
  'studio',
  'altered',
  'after-dark',
  'bar',
  'heavy',
  'roots',
  'sundown',
  'heart',
];

export type SkinCategory = {
  id: SkinCategoryId;
  label: string;
  line: string;
  skins: SkinId[];
};

export const SKIN_CATEGORIES: Record<SkinCategoryId, SkinCategory> = {
  classic: {
    id: 'classic',
    label: 'CLASSIC',
    line: 'Tactile precision hardware.',
    skins: ['classic', 'titanium'],
  },
  immersive: {
    id: 'immersive',
    label: 'IMMERSIVE',
    line: 'Cinematic living worlds.',
    skins: ['studio', 'altered', 'bar'],
  },
};

export const SKIN_CATEGORY_ORDER: SkinCategoryId[] = ['classic', 'immersive'];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_ORDER as readonly string[]).includes(value);
}

export function isSkinCategoryId(value: unknown): value is SkinCategoryId {
  return value === 'classic' || value === 'immersive';
}

export function categoryForSkin(skin: SkinId): SkinCategoryId {
  return SKIN_CATEGORIES.classic.skins.includes(skin) ? 'classic' : 'immersive';
}

export function skinsInCategory(category: SkinCategoryId): SkinId[] {
  return SKIN_CATEGORIES[category].skins;
}

export function isHardwareSkin(skin: SkinId): boolean {
  return skin === 'classic' || skin === 'titanium';
}

/**
 * The North Star instrument finish for every sheet and panel the Dial opens: warm graphite,
 * champagne hairlines, optical amber. No greens, no blues, no generic system grey.
 */
export const NORTH_STAR_THEME: SkinTheme = {
  ...SKINS.titanium,
  label: 'NORTH STAR',
  descriptor: 'One instrument.',
  bg: '#0F0D0B',
  bgRaised: '#1A1612',
  bgPanel: '#221D18',
  ivory: '#EFE6D6',
  ivoryDim: '#B7AA95',
  ivoryMute: '#7C7263',
  accent: '#F0A23C',
  accentSoft: '#B87A2E',
  mustard: '#D3B07A',
  line: '#3A3026',
  playIdleBg: 'rgba(26, 22, 18, 0.7)',
  playIdleBorder: 'rgba(211, 176, 122, 0.36)',
  playActiveBg: 'rgba(96, 58, 18, 0.4)',
  playActiveBorder: 'rgba(240, 162, 60, 0.72)',
  playGlow: 'rgba(240, 162, 60, 0.3)',
  lampOff: '#1C1712',
  lampOn: '#F5A93E',
  lampDown: '#FFD08A',
  lampBack: '#4A3420',
  sliderMin: '#F0A23C',
  sliderMax: '#3A3026',
  thumb: '#EFE6D6',
  grain: 0,
};

/** Shared North Star surface tokens for hand-built panels. */
export const NS = {
  bg: '#0F0D0B',
  panel: '#1A1612',
  panelHi: '#241E18',
  key: '#1E1914',
  keyHi: '#2A231C',
  keyEdge: 'rgba(211, 176, 122, 0.28)',
  keyEdgeHi: 'rgba(240, 190, 120, 0.55)',
  hairline: 'rgba(211, 176, 122, 0.18)',
  ivory: '#EFE6D6',
  ivoryDim: '#B7AA95',
  ivoryMute: '#7C7263',
  amber: '#F0A23C',
  amberHi: '#FFC36B',
  amberDeep: '#5A3812',
  amberGlow: 'rgba(240, 162, 60, 0.28)',
} as const;

import { Platform } from 'react-native';

/**
 * Semantic BPM fonts only. Never persist raw typeface names.
 * Every family below is a verified iOS/Android system face — not a PostScript
 * weight name. Combining "AvenirNext-Heavy" + fontWeight crashed iOS Fabric.
 */
export const BPM_FONT_ORDER = ['default', 'rounded', 'condensed', 'mono', 'classic'] as const;
export type BpmFontId = (typeof BPM_FONT_ORDER)[number];

export const BPM_SIZE_ORDER = ['small', 'medium', 'large', 'xl'] as const;
export type BpmSizeId = (typeof BPM_SIZE_ORDER)[number];

export const PULSE_SWATCHES = [
  '#F4F6FA',
  '#C6F24A',
  '#E8C56A',
  '#7EC8FF',
  '#E84838',
  '#E070A0',
  '#5AD4A0',
  '#C8A070',
  '#8A90A8',
] as const;

export type PulseSwatch = (typeof PULSE_SWATCHES)[number];

export const ACCENT_SWATCHES = [
  '#F4F6FA',
  '#C6F24A',
  '#E8C56A',
  '#7EC8FF',
  '#E84838',
] as const;

export type AccentSwatch = (typeof ACCENT_SWATCHES)[number];

/** Resting Beatline / Classic Beats fill. Accent color is active-hit only. */
export const BEATLINE_REST_FILL = '#6E5A38';

/** Resting Classic Pro cell tone. Accent color is active-hit only. */
export const PRO_REST_FILL = '#A68448';

export const PRO_VIEW_ORDER = ['all', 'subaccents', 'accent', 'pendulum'] as const;
export type ProViewId = (typeof PRO_VIEW_ORDER)[number];

export type DisplayPrefs = {
  bpmFont: BpmFontId;
  bpmSize: BpmSizeId;
  bpmVisible: boolean;
  curtainHintSeen: boolean;
  privacyHintSeen: boolean;
  torchHintSeen: boolean;
  pulseDownbeatColor: PulseSwatch;
  pulseUpbeatColor: PulseSwatch;
  accentColor: AccentSwatch;
  accentSecondaryColor: AccentSwatch;
  accentStrongColor: AccentSwatch;
  proView: ProViewId;
  beatlineDownbeatColor: string;
  beatlineAccentColor: string;
  beatlineVisualIntensity: number;
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  bpmFont: 'default',
  bpmSize: 'large',
  bpmVisible: true,
  curtainHintSeen: false,
  privacyHintSeen: false,
  torchHintSeen: false,
  pulseDownbeatColor: '#7EC8FF',
  pulseUpbeatColor: '#7EC8FF',
  accentColor: '#F4F6FA',
  accentSecondaryColor: '#F4F6FA',
  accentStrongColor: '#F4F6FA',
  proView: 'all',
  beatlineDownbeatColor: '#3DFF7A',
  beatlineAccentColor: '#8B95D4',
  beatlineVisualIntensity: 1,
};

export type BpmFontResolved = {
  id: BpmFontId;
  label: string;
  fontFamily?: string;
  fontWeight: '600' | '700' | '800';
  letterSpacing: number;
};

const IOS_FONTS: Record<BpmFontId, string | undefined> = {
  default: undefined,
  rounded: 'ui-rounded',
  condensed: 'Avenir Next Condensed',
  mono: 'Menlo',
  classic: 'Georgia',
};

const ANDROID_FONTS: Record<BpmFontId, string | undefined> = {
  default: undefined,
  rounded: 'sans-serif',
  condensed: 'sans-serif-condensed',
  mono: 'monospace',
  classic: 'serif',
};

export const BPM_FONT_META: Record<BpmFontId, { label: string; fontWeight: BpmFontResolved['fontWeight']; letterSpacing: number }> =
  {
    default: { label: 'DEFAULT', fontWeight: '700', letterSpacing: -1.8 },
    rounded: { label: 'ROUNDED', fontWeight: '700', letterSpacing: -0.8 },
    condensed: { label: 'CONDENSED', fontWeight: '700', letterSpacing: -0.4 },
    mono: { label: 'MONO', fontWeight: '700', letterSpacing: -1.2 },
    classic: { label: 'CLASSIC', fontWeight: '700', letterSpacing: -0.4 },
  };

export function resolveBpmFont(id: BpmFontId): BpmFontResolved {
  const safe = isBpmFont(id) ? id : DEFAULT_DISPLAY_PREFS.bpmFont;
  const meta = BPM_FONT_META[safe];
  const family = Platform.select({
    ios: IOS_FONTS[safe],
    android: ANDROID_FONTS[safe],
    default: undefined,
  });
  return {
    id: safe,
    label: meta.label,
    fontFamily: family || undefined,
    fontWeight: meta.fontWeight,
    letterSpacing: meta.letterSpacing,
  };
}

/** Shared numeric sizes. Same geometry in every room. */
export const BPM_SIZE_PX: Record<BpmSizeId, { min: number; max: number; factor: number }> = {
  small: { min: 64, max: 86, factor: 0.2 },
  medium: { min: 78, max: 102, factor: 0.25 },
  large: { min: 92, max: 118, factor: 0.29 },
  xl: { min: 104, max: 132, factor: 0.33 },
};

export const BPM_SIZE_LABEL: Record<BpmSizeId, string> = {
  small: 'SMALL',
  medium: 'MEDIUM',
  large: 'LARGE',
  xl: 'XL',
};

export function resolveBpmFontSize(size: BpmSizeId, width: number, height?: number): number {
  const spec = isBpmSize(size) ? BPM_SIZE_PX[size] : BPM_SIZE_PX[DEFAULT_DISPLAY_PREFS.bpmSize];
  const raw = Math.max(1, width) * spec.factor;
  let next = Math.round(Math.min(spec.max, Math.max(spec.min, raw)));
  if (height && height < 700) {
    next = Math.min(next, size === 'xl' ? 104 : spec.max);
  }
  return Number.isFinite(next) && next > 0 ? next : 104;
}

export function isBpmFont(value: unknown): value is BpmFontId {
  return typeof value === 'string' && (BPM_FONT_ORDER as readonly string[]).includes(value);
}

export function isBpmSize(value: unknown): value is BpmSizeId {
  return typeof value === 'string' && (BPM_SIZE_ORDER as readonly string[]).includes(value);
}

export function migrateBpmFont(value: unknown): BpmFontId {
  if (value === 'display' || value === 'bold') return 'default';
  return isBpmFont(value) ? value : DEFAULT_DISPLAY_PREFS.bpmFont;
}

export function migrateBpmSize(value: unknown): BpmSizeId {
  return isBpmSize(value) ? value : DEFAULT_DISPLAY_PREFS.bpmSize;
}

export function isPulseSwatch(value: unknown): value is PulseSwatch {
  return typeof value === 'string' && (PULSE_SWATCHES as readonly string[]).includes(value);
}

export function migratePulseSwatch(value: unknown, fallback: PulseSwatch): PulseSwatch {
  return isPulseSwatch(value) ? value : fallback;
}

export function isAccentSwatch(value: unknown): value is AccentSwatch {
  return typeof value === 'string' && (ACCENT_SWATCHES as readonly string[]).includes(value);
}

export function migrateAccentSwatch(value: unknown, fallback: AccentSwatch = DEFAULT_DISPLAY_PREFS.accentColor): AccentSwatch {
  if (isAccentSwatch(value)) return value;
  if (value === '#5AD4A0') return '#C6F24A';
  return fallback;
}

export function isProView(value: unknown): value is ProViewId {
  return typeof value === 'string' && (PRO_VIEW_ORDER as readonly string[]).includes(value);
}

export function migrateProView(value: unknown): ProViewId {
  return isProView(value) ? value : DEFAULT_DISPLAY_PREFS.proView;
}

export function nextProView(value: unknown): ProViewId {
  const current = migrateProView(value);
  const index = PRO_VIEW_ORDER.indexOf(current);
  return PRO_VIEW_ORDER[(index + 1) % PRO_VIEW_ORDER.length] ?? 'all';
}

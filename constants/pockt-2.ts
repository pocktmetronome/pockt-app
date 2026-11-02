/**
 * POCKT 2.0 design tokens.
 * Visual language: dark instrument field, machined metal, phosphor signal.
 * Phosphor is SIGNAL only — active / beat / selected / in-tune — never decoration spray.
 */
export const P2 = {
  field: '#050608',
  fieldRaised: '#101214',
  fieldPanel: '#16181C',
  fieldInset: '#0B0D10',
  metal: '#A8AEB6',
  metalHi: '#D5DAE0',
  metalLo: '#5C6168',
  ink: '#E8EAED',
  inkMute: '#8B919A',
  inkDim: '#5E646C',
  hairline: 'rgba(232,234,237,0.12)',
  hairlineStrong: 'rgba(232,234,237,0.22)',
  shadow: '#000000',
  signal: '#3DFF7A',
  signalDim: 'rgba(61,255,122,0.22)',
  signalDeep: '#0C2416',
  signalSoft: 'rgba(61,255,122,0.55)',
  danger: '#E24B4B',
  overlay: 'rgba(5,6,8,0.72)',
} as const;

export const P2Space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const P2Radius = {
  control: 14,
  panel: 22,
  sheet: 28,
  pill: 999,
} as const;

export const P2Touch = {
  min: 48,
  comfortable: 56,
  transport: 76,
} as const;

export const P2Type = {
  bpm: {
    fontSize: 72,
    lineHeight: 76,
    fontWeight: '300' as const,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'] as const,
  },
  bpmUnit: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 1.6,
  },
  tempo: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  meta: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.1,
  },
} as const;

export const P2Motion = {
  pressMs: 90,
  sheetMs: 280,
  fadeMs: 180,
  bezelMs: 220,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)' as const,
} as const;

export const P2MetalFill = ['#2A2E34', '#14171B', '#0C0E11'] as const;
export const P2MetalSheen = ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'] as const;

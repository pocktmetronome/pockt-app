import { DEFAULT_DISPLAY_PREFS, isPulseSwatch, type PulseSwatch } from '@/constants/display';

const FALLBACK: PulseSwatch = DEFAULT_DISPLAY_PREFS.pulseUpbeatColor;

/** Pulse rings must stay visible against the dark Pulse field. */
export function resolvePulseRingColor(value: unknown, fallback: PulseSwatch = FALLBACK): string {
  if (typeof value !== 'string' || !value) return fallback;
  const hex = value.trim();
  if (isPulseSwatch(hex)) return hex;
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    if (relativeLuminance(hex) < 0.08) return fallback;
    return hex;
  }
  return fallback;
}

export function pulseRingContrastOk(color: string, background = '#0A0908'): boolean {
  const contrast = (relativeLuminance(color) + 0.05) / (relativeLuminance(background) + 0.05);
  return contrast >= 1.35;
}

function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '');
  if (n.length !== 6) return 0.5;
  const r = srgb(parseInt(n.slice(0, 2), 16) / 255);
  const g = srgb(parseInt(n.slice(2, 4), 16) / 255);
  const b = srgb(parseInt(n.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function srgb(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function pulseRingStrength(role: number, accent: number): number {
  'worklet';
  if (accent <= 0 && role < 0.5) return 0.42;
  if (role >= 1.5) return 1;
  if (role >= 0.5) return 0.78;
  return 0.55;
}

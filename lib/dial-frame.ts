import type { FoundationLayout, Rect } from '@/lib/compute-foundation-layout';

/**
 * Dial sits on the opening under the BPM readout.
 * Leftover stage height stays below the plate so the dial does not float.
 */
export function dialInstrumentFrame(width: number, layout: FoundationLayout): Rect {
  const availableWidth = Math.max(1, width - 4);
  const D = Math.min(availableWidth, layout.stage.h, layout.dial.w);
  return {
    x: (width - D) / 2,
    y: layout.stage.y,
    w: D,
    h: D,
  };
}

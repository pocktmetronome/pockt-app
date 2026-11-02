/**
 * The North Star front page in master pixels (941 × 1672). Every live part is drawn at exactly the
 * place the faceplate artwork carries it, through the same rigid frame the faceplate was rendered with.
 */
import { rigidFrame, type Rect, type SafeInsets } from '@/lib/compute-foundation-layout';

export type MasterRect = { x: number; y: number; w: number; h: number };

/** Dial: flutes r 199–270 turn; the glass (r < 148) is the readout. */
export const DIAL_CENTER = { x: 469, y: 501 };
export const RING_BOX: MasterRect = { x: 169, y: 201, w: 600, h: 600 };
export const GLASS_RADIUS = 148;

/** Key caps: outer crop of the cap sprite, the cap body inside it, and the body's corner radius. */
export type CapSpec = { crop: MasterRect; body: MasterRect; radius: number; glow?: MasterRect & { dot?: boolean } };
export const CAPS: Record<'tuner' | 'sound' | 'loop' | 'tap' | 'play' | 'meter' | 'pockt' | 'minus' | 'plus', CapSpec> = {
  tuner: { crop: { x: 66, y: 65, w: 176, h: 119 }, body: { x: 68, y: 67, w: 172, h: 115 }, radius: 14 },
  sound: { crop: { x: 701, y: 65, w: 181, h: 119 }, body: { x: 703, y: 67, w: 177, h: 115 }, radius: 14, glow: { x: 141, y: 84, w: 15, h: 13, dot: true } },
  loop: { crop: { x: 731, y: 895, w: 148, h: 129 }, body: { x: 733, y: 897, w: 144, h: 125 }, radius: 13, glow: { x: 59, y: 21, w: 32, h: 9 } },
  tap: { crop: { x: 91, y: 1127, w: 348, h: 147 }, body: { x: 93, y: 1129, w: 344, h: 143 }, radius: 16, glow: { x: 139, y: 5, w: 65, h: 13 } },
  play: { crop: { x: 478, y: 1127, w: 374, h: 147 }, body: { x: 480, y: 1129, w: 370, h: 143 }, radius: 16, glow: { x: 159, y: 5, w: 65, h: 13 } },
  meter: { crop: { x: 165, y: 1298, w: 277, h: 104 }, body: { x: 167, y: 1300, w: 273, h: 100 }, radius: 14, glow: { x: 117, y: 6, w: 48, h: 12 } },
  pockt: { crop: { x: 498, y: 1298, w: 279, h: 104 }, body: { x: 500, y: 1300, w: 275, h: 100 }, radius: 14, glow: { x: 111, y: 6, w: 47, h: 12 } },
  minus: { crop: { x: 47, y: 689, w: 101, h: 100 }, body: { x: 49.5, y: 691, w: 96, h: 96 }, radius: 48 },
  plus: { crop: { x: 787, y: 687, w: 100, h: 100 }, body: { x: 789, y: 689, w: 96, h: 96 }, radius: 48 },
};

/** Beat lamps (140 px lit sprite) and the indicator dots below them (24 px). */
export const LAMPS: { lamp: { x: number; y: number }; dot: { x: number; y: number } }[] = [
  { lamp: { x: 51, y: 888 }, dot: { x: 107, y: 1024 } },
  { lamp: { x: 210, y: 886 }, dot: { x: 269, y: 1024 } },
  { lamp: { x: 369, y: 886 }, dot: { x: 429, y: 1024 } },
  { lamp: { x: 527, y: 887 }, dot: { x: 586, y: 1024 } },
];
export const LAMP_SIZE = 140;
export const DOT_SIZE = 24;
export const SPILL_SIZE = 250;

/**
 * The tempo gauge: 60 LED cells baked evenly into the bezel band (scripts/build-gauge-ring.py),
 * clockwise from the lower left (20 BPM) to the lower right (400 BPM), skipping the index pointer.
 */
export const GAUGE_CENTER = { x: 469.2, y: 525 };
export const GAUGE_RADIUS = 328.5;
export const GAUGE_ANGLES: number[] = Array.from({ length: 61 }, (_, i) => -120 + i * 4).filter((a) => a !== 0);
/** Lit LED sprite, drawn upright with the cell centred: 48 x 72 master px. */
export const LED_SPRITE = { w: 48, h: 72 };

/** Mode selector slots (DIAL first). */
export const NAV = { x: 28, y: 1468, w: 886, h: 204, slots: 6 };

export type FrontFrame = {
  s: number;
  rect: (r: MasterRect) => Rect;
  point: (x: number, y: number) => { x: number; y: number };
};

export function frontFrame(width: number, height: number, insets: SafeInsets): FrontFrame {
  const f = rigidFrame(width, height, insets);
  return {
    s: f.s,
    rect: (r) => ({ x: f.mapX(r.x), y: f.mapY(r.y), w: r.w * f.s, h: r.h * f.s }),
    point: (x, y) => ({ x: f.mapX(x), y: f.mapY(y) }),
  };
}

export const GAUGE_COUNT = 60;

/**
 * Tempo → gauge angle in degrees, −120 (20 BPM) … 0 (120 BPM, under the index) … +120 (400 BPM).
 * Each side is logarithmic, so the most-played tempos get the most travel and 120 sits at the top mark.
 */
export function gaugeAngle(bpm: number): number {
  'worklet';
  const b = Math.max(20, Math.min(400, bpm));
  if (b <= 120) return -120 + (120 * Math.log(b / 20)) / Math.log(6);
  return (120 * Math.log(b / 120)) / Math.log(400 / 120);
}

/** Tempo → number of lit LEDs, counted clockwise from the lower left. */
export function gaugeLit(bpm: number): number {
  'worklet';
  const target = gaugeAngle(bpm) + 0.001;
  let n = 0;
  for (let i = 0; i < 61; i++) {
    const a = -120 + i * 4;
    if (a === 0) continue;
    if (a <= target) n++;
  }
  return Math.max(1, n);
}

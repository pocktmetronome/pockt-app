/**
 * The v9 faceplate: a separate composition for each iPhone size (built by ns/recompose.py). Every live
 * part is drawn through the transform of the part it belongs to, so lights, keys and the dial land on
 * the faceplate to the pixel.
 */
import { useMemo } from 'react';

import type { FrontFrame } from '@/lib/front-geometry';
import { NS9 } from '@/lib/ns9-layout';

export type PartName = 'dial' | 'tuner' | 'sound' | 'word' | 'minus' | 'plus' | 'bay' | 'led' | 'trans' | 'nav';
type Part = { sx: number; sy: number; dx: number; dy: number; s: number };
type DeviceTag = keyof typeof NS9.devices;

const FACES: Record<string, number> = {
  '320x568': require('../assets/north-star-face/v9/face-320x568.jpg'),
  '375x667': require('../assets/north-star-face/v9/face-375x667.jpg'),
  '375x812': require('../assets/north-star-face/v9/face-375x812.jpg'),
  '390x844': require('../assets/north-star-face/v9/face-390x844.jpg'),
  '393x852': require('../assets/north-star-face/v9/face-393x852.jpg'),
  '402x874': require('../assets/north-star-face/v9/face-402x874.jpg'),
  '414x896': require('../assets/north-star-face/v9/face-414x896.jpg'),
  '428x926': require('../assets/north-star-face/v9/face-428x926.jpg'),
  '430x932': require('../assets/north-star-face/v9/face-430x932.jpg'),
  '440x956': require('../assets/north-star-face/v9/face-440x956.jpg'),
};
const SPECS: Record<string, number> = {
  '320x568': require('../assets/north-star-face/v9/spec-320x568.png'),
  '375x667': require('../assets/north-star-face/v9/spec-375x667.png'),
  '375x812': require('../assets/north-star-face/v9/spec-375x812.png'),
  '390x844': require('../assets/north-star-face/v9/spec-390x844.png'),
  '393x852': require('../assets/north-star-face/v9/spec-393x852.png'),
  '402x874': require('../assets/north-star-face/v9/spec-402x874.png'),
  '414x896': require('../assets/north-star-face/v9/spec-414x896.png'),
  '428x926': require('../assets/north-star-face/v9/spec-428x926.png'),
  '430x932': require('../assets/north-star-face/v9/spec-430x932.png'),
  '440x956': require('../assets/north-star-face/v9/spec-440x956.png'),
};
export const SPRITES: Record<string, number> = {
  'led-tuner': require('../assets/north-star-face/v9/led-tuner.png'),
  'led-tuner-green': require('../assets/north-star-face/v9/led-tuner-green.png'),
  'led-sound': require('../assets/north-star-face/v9/led-sound.png'),
  'led-loop': require('../assets/north-star-face/v9/led-loop.png'),
  'led-loop-red': require('../assets/north-star-face/v9/led-loop-red.png'),
  'led-loop-orange': require('../assets/north-star-face/v9/led-loop-orange.png'),
  'led-tap': require('../assets/north-star-face/v9/led-tap.png'),
  'led-play': require('../assets/north-star-face/v9/led-play.png'),
  'led-meter': require('../assets/north-star-face/v9/led-meter.png'),
  'led-set': require('../assets/north-star-face/v9/led-set.png'),
  'lamp-0': require('../assets/north-star-face/v9/lamp-0.png'),
  'lamp-1': require('../assets/north-star-face/v9/lamp-1.png'),
  'lamp-2': require('../assets/north-star-face/v9/lamp-2.png'),
  'lamp-3': require('../assets/north-star-face/v9/lamp-3.png'),
};
/** Skia wants a module id natively; Expo web hands back {uri} objects, which Skia cannot read. */
export function skSrc(src: unknown): number | string {
  if (src && typeof src === 'object' && 'uri' in (src as Record<string, unknown>)) return String((src as { uri: string }).uri);
  return src as number | string;
}
export const KNURL_LIGHT = require('../assets/north-star-face/v9/knurl-light.png');
export const KNURL = NS9.knurl;

/** Master-art geometry of the live parts. */
export const DIAL_C = { x: 469, y: 501 };
export const KNURL_C = { x: NS9.knurl.cx, y: NS9.knurl.cy };
export const GAUGE = { x: NS9.knurl.cx, y: NS9.knurl.cy, r: 328.5 };
export const CAPS9: Record<'tuner' | 'sound' | 'loop' | 'tap' | 'play' | 'meter' | 'set' | 'minus' | 'plus', { crop: [number, number, number, number]; part: PartName; round?: boolean; r: number }> = {
  tuner: { crop: [66, 65, 176, 119], part: 'tuner', r: 16 },
  sound: { crop: [701, 65, 181, 119], part: 'sound', r: 16 },
  loop: { crop: [731, 895, 148, 129], part: 'bay', r: 15 },
  tap: { crop: [91, 1127, 348, 147], part: 'trans', r: 18 },
  play: { crop: [478, 1127, 374, 147], part: 'trans', r: 18 },
  meter: { crop: [165, 1298, 277, 104], part: 'trans', r: 16 },
  set: { crop: [498, 1298, 279, 104], part: 'trans', r: 16 },
  minus: { crop: [47, 689, 101, 100], part: 'minus', round: true, r: 50 },
  plus: { crop: [787, 687, 100, 100], part: 'plus', round: true, r: 50 },
};
export const LAMPS9: [number, number, number, number][] = [[51, 888, 107, 1024], [210, 886, 269, 1024], [369, 886, 429, 1024], [527, 887, 586, 1024]];
export const NAV9 = { x: 28, y: 1468, w: 886, h: 204 };
export const SPRITE_PART = (n: string): PartName => (n.startsWith('lamp') || n.startsWith('led-loop') ? 'bay' : n.startsWith('led-tuner') ? 'tuner' : n === 'led-sound' ? 'sound' : 'trans');
export const GA = Array.from({ length: 61 }, (_, i) => -120 + i * 4).filter((a) => a !== 0);

export type Ns9 = {
  tag: string;
  face: number;
  spec: number;
  /** Device points per master pixel. */
  k: number;
  /** Device points the composition is drawn in (it fills the screen width). */
  w: number;
  h: number;
  ox: number;
  oy: number;
  parts: Record<PartName, Part>;
  /** Master pixels of a part → screen points. */
  T: (part: PartName, x: number, y: number) => { x: number; y: number };
  /** Screen points per master pixel for a part. */
  sc: (part: PartName) => number;
  capRect: (id: keyof typeof CAPS9) => { x: number; y: number; w: number; h: number; r: number };
  /** A FrontFrame for the faces: master coordinates around the dial, scaled into the dial window. */
  dialFrame: (inset?: number) => FrontFrame;
};

export function useNs9(width: number, height: number): Ns9 {
  return useMemo(() => {
    const key = `${Math.round(width)}x${Math.round(height)}`;
    let tag = (key in NS9.devices ? key : null) as DeviceTag | null;
    if (!tag) {
      const aspect = width / Math.max(1, height);
      tag = (Object.keys(NS9.devices) as DeviceTag[]).sort((a, b) => {
        const A = NS9.devices[a], B = NS9.devices[b];
        return Math.abs(A.w / A.h - aspect) - Math.abs(B.w / B.h - aspect) || Math.abs(A.w - width) - Math.abs(B.w - width);
      })[0];
    }
    const d = NS9.devices[tag];
    const fit = width / d.w;
    const w = d.w * fit, h = d.h * fit;
    const ox = 0, oy = Math.min(0, (height - h) / 2);
    const k = d.k * fit;
    const parts = d.parts as unknown as Record<PartName, Part>;
    const T = (part: PartName, x: number, y: number) => {
      const p = parts[part];
      return { x: ox + (p.dx + (x - p.sx) * p.s) * k, y: oy + (p.dy + (y - p.sy) * p.s) * k };
    };
    const sc = (part: PartName) => parts[part].s * k;
    const capRect = (id: keyof typeof CAPS9) => {
      const c = CAPS9[id];
      const o = T(c.part, c.crop[0], c.crop[1]);
      const s = sc(c.part);
      return { x: o.x, y: o.y, w: c.crop[2] * s, h: c.crop[3] * s, r: c.r * s };
    };
    const dialFrame = (inset = 1): FrontFrame => {
      const s = sc('dial') * inset;
      const c = T('dial', DIAL_C.x, DIAL_C.y);
      const map = (x: number, y: number) => ({ x: c.x + (x - DIAL_C.x) * s, y: c.y + (y - DIAL_C.y) * s });
      return {
        s,
        point: map,
        rect: (r) => { const o = map(r.x, r.y); return { x: o.x, y: o.y, w: r.w * s, h: r.h * s }; },
      };
    };
    return { tag, face: FACES[tag], spec: SPECS[tag], k, w, h, ox, oy, parts, T, sc, capRect, dialFrame };
  }, [width, height]);
}

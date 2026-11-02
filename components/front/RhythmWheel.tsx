/**
 * The Rhythm face: the dial's centre becomes a machined beat wheel. One backlit segment per beat,
 * centred on the instant it sounds (beat 1 under the index), an inner subdivision track, and a sweep
 * on the outer track that crosses each segment's centre on its click. The native dial view sits on
 * top in "wheel" mode, so turning the knurled rim still sets the tempo with the same detents.
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Skia,
  Text as SkText,
  useFont,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { GlassUnder, Seat } from '@/components/front/faces/Optics';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';
import type { BeatClock } from '@/lib/front-clock';
import type { AccentLevel, SubdivisionId } from '@/lib/types';

const FONT_SEMI = require('../../assets/fonts/Barlow_600SemiBold.ttf');
const FONT_BOLD = require('../../assets/fonts/Barlow_700Bold.ttf');

/** Master-pixel radii on the 600 px ring box (centre 300, 300). */
const R = { pin: 148, pout: 296, sin: 158, sout: 180, bin: 188, bout: 276, track: 281 };
const C = 300;
const DEG = Math.PI / 180;
export const MAX_BEATS = 16;

export const SUB_AT: Record<SubdivisionId, number[]> = {
  quarter: [0],
  eighths: [0, 0.5],
  triplet: [0, 1 / 3, 2 / 3],
  sixteenths: [0, 0.25, 0.5, 0.75],
  dotted: [0, 0.75],
};

const WORD: Record<AccentLevel, string> = { strong: 'ACCENT', accent: 'ACCENT', normal: 'NORMAL', soft: 'SOFT', mute: 'OFF' };
const REST_STOPPED: Record<AccentLevel, number> = { strong: 1, accent: 1, normal: 0.7, soft: 0.42, mute: 0 };
const REST_PLAYING: Record<AccentLevel, number> = { strong: 0.4, accent: 0.4, normal: 0.3, soft: 0.2, mute: 0 };
const PEAK: Record<AccentLevel, number> = { strong: 1, accent: 1, normal: 1, soft: 0.85, mute: 0 };
const LIGHT_OF: Record<AccentLevel, { core: string; mid: string; edge: string; halo: string }> = {
  strong: { core: 'rgba(255,248,232,1)', mid: 'rgba(255,196,110,0.95)', edge: 'rgba(255,120,30,0.55)', halo: 'rgba(255,180,90,0.95)' },
  accent: { core: 'rgba(255,248,232,1)', mid: 'rgba(255,196,110,0.95)', edge: 'rgba(255,120,30,0.55)', halo: 'rgba(255,180,90,0.95)' },
  normal: { core: 'rgba(255,200,120,1)', mid: 'rgba(255,128,28,0.9)', edge: 'rgba(150,50,6,0.55)', halo: 'rgba(255,120,30,0.85)' },
  soft: { core: 'rgba(230,110,30,0.95)', mid: 'rgba(140,48,8,0.85)', edge: 'rgba(60,20,4,0.5)', halo: 'rgba(200,70,10,0.6)' },
  mute: { core: 'rgba(0,0,0,0)', mid: 'rgba(0,0,0,0)', edge: 'rgba(0,0,0,0)', halo: 'rgba(0,0,0,0)' },
};

/** Beat t (may be fractional) → angle in radians, 0 = 12 o'clock, clockwise. */
function beatAngle(t: number, n: number): number {
  'worklet';
  return -Math.PI / 2 + (t / n) * 2 * Math.PI;
}

function sector(r0: number, r1: number, a0: number, a1: number): SkPath {
  'worklet';
  const p = Skia.Path.Make();
  const sweep = (a1 - a0) / DEG;
  p.arcToOval(Skia.XYWHRect(C - r1, C - r1, r1 * 2, r1 * 2), a0 / DEG, sweep, true);
  p.arcToOval(Skia.XYWHRect(C - r0, C - r0, r0 * 2, r0 * 2), a1 / DEG, -sweep, false);
  p.close();
  return p;
}

const gapFor = (n: number) => Math.max(1.4, Math.min(3, 22 / n)) * DEG;

function spans(n: number, groupStarts: Set<number>): [number, number][] {
  const g = gapFor(n);
  const x = groupStarts.size ? 3.2 * DEG : 0;
  return Array.from({ length: n }, (_, i) => {
    const c = beatAngle(i, n);
    const h = Math.PI / n;
    return [c - h + g / 2 + (groupStarts.has(i) ? x : 0), c + h - g / 2 - (groupStarts.has((i + 1) % n) ? x : 0)];
  });
}

/** Subdivision cells for beat i, each centred on the instant it sounds. */
function subCells(i: number, n: number, at: number[]): [number, number][] {
  return at.map((f, j) => {
    const nf = j + 1 < at.length ? at[j + 1] : 1 + at[0];
    const pf = j > 0 ? at[j - 1] : at[at.length - 1] - 1;
    const w = Math.min(nf - f, f - pf) * ((2 * Math.PI) / n);
    const g = Math.min(1.6 * DEG, w * 0.18);
    const c = beatAngle(i + f, n);
    return [c - w / 2 + g / 2, c + w / 2 - g / 2];
  });
}

/** Text advance width. Glyph widths work on every platform (measureText is native-only). */
function textWidth(font: SkFont, text: string): number {
  try {
    return font.getGlyphWidths(font.getGlyphIDs(text)).reduce((a, w) => a + w, 0);
  } catch {
    return text.length * font.getSize() * 0.56;
  }
}

type Fonts = { num: (SkFont | null)[]; word: (SkFont | null)[] };

function Segment({
  i,
  n,
  span,
  level,
  playing,
  serial,
  preview,
  fonts,
}: {
  i: number;
  n: number;
  span: [number, number];
  level: AccentLevel;
  playing: boolean;
  serial: number;
  preview: number;
  fonts: Fonts;
}) {
  const g = useSharedValue(0);
  const rest = (playing ? REST_PLAYING : REST_STOPPED)[level] ?? 0;
  useEffect(() => {
    g.value = withTiming(rest, { duration: 220 });
  }, [g, rest]);
  useEffect(() => {
    if (serial <= 0) return;
    const peak = PEAK[level] ?? 0;
    if (peak <= 0) return;
    g.value = withSequence(withTiming(peak, { duration: 12 }), withTiming(rest, { duration: 260, easing: Easing.out(Easing.exp) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial]);
  useEffect(() => {
    if (preview <= 0) return;
    const show = Math.max(0.35, REST_STOPPED[level] ?? 0);
    g.value = withSequence(withTiming(show, { duration: 60 }), withDelay(900, withTiming(rest, { duration: 320 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const [a0, a1] = span;
  const body = useMemo(() => sector(R.bin + 3, R.bout - 3, a0 + 0.6 * DEG, a1 - 0.6 * DEG), [a0, a1]);
  const gloss = useMemo(() => sector(R.bout - 17, R.bout - 6, a0 + 2.2 * DEG, a1 - 2.2 * DEG), [a0, a1]);
  const glowOpacity = useDerivedValue(() => g.value);
  const haloOpacity = useDerivedValue(() => g.value * 0.6);
  // the level is the light: accent burns white-gold, normal amber, soft a low ember, off is dark glass
  const pal = LIGHT_OF[level] ?? LIGHT_OF.normal;
  const mid = (a0 + a1) / 2;
  const half = (a1 - a0) / 2 - 3.2 * DEG;
  const filament = useMemo(() => {
    const p = Skia.Path.Make();
    const rm = (R.bin + R.bout) / 2;
    p.addArc(Skia.XYWHRect(C - rm, C - rm, rm * 2, rm * 2), (mid - half) / DEG, (2 * half) / DEG);
    return p;
  }, [mid, half]);

  return (
    <Group>
      {/* unlit: a smoked lens, a little of the room in it */}
      <Path path={body}>
        <RadialGradient c={vec(C, C)} r={R.bout} colors={['rgba(30,20,12,0.0)', 'rgba(26,18,12,0.85)', 'rgba(12,8,6,0.95)']} positions={[R.bin / R.bout, (R.bin + 0.5 * (R.bout - R.bin)) / R.bout, 1]} />
      </Path>
      <Path path={body} opacity={haloOpacity} color={pal.halo} blendMode="plus">
        <BlurMask blur={12} style="outer" />
      </Path>
      <Path path={body} opacity={glowOpacity} blendMode="plus">
        <RadialGradient
          c={vec(C, C)}
          r={R.bout}
          colors={[pal.edge, pal.edge, pal.mid, pal.core, pal.mid, pal.edge]}
          positions={[0, R.bin / R.bout, (R.bin + 0.25 * (R.bout - R.bin)) / R.bout, (R.bin + 0.52 * (R.bout - R.bin)) / R.bout, (R.bin + 0.82 * (R.bout - R.bin)) / R.bout, 1]}
        />
      </Path>
      {level === 'mute' ? null : (
        <Path path={filament} style="stroke" strokeWidth={level === 'soft' ? 2 : 3.4} strokeCap="round" color={pal.core} opacity={glowOpacity} blendMode="plus">
          <BlurMask blur={2.5} style="solid" />
        </Path>
      )}
      {/* the slab is glass: its edges catch the light from the upper left, a gloss runs along its outer face */}
      <Path path={body} style="stroke" strokeWidth={1.3}>
        <LinearGradient start={vec(C - 240, C - 240)} end={vec(C + 240, C + 240)} colors={['rgba(255,232,196,0.34)', 'rgba(255,232,196,0.06)', 'rgba(0,0,0,0.45)']} positions={[0, 0.5, 1]} />
      </Path>
      <Path path={gloss} blendMode="screen">
        <LinearGradient start={vec(C - 200, C - 200)} end={vec(C + 200, C + 200)} colors={['rgba(255,244,226,0.13)', 'rgba(255,244,226,0.04)', 'rgba(255,244,226,0.01)']} />
      </Path>
    </Group>
  );
}

/** Uppercase label with a little tracking. */
function SpacedText({ font, text, x, y, color, opacity }: { font: SkFont; text: string; x: number; y: number; color: string; opacity: number | SharedValue<number> }) {
  let cx = x;
  return (
    <Group opacity={opacity}>
      {text.split('').map((ch, k) => {
        const at = cx;
        cx += textWidth(font, ch) + 1.2;
        return <SkText key={k} font={font} text={ch} x={at} y={y} color={color} />;
      })}
    </Group>
  );
}

export function RhythmWheel({
  frame,
  bpm,
  beats,
  accents,
  groups,
  subdivision,
  playing,
  beatSerial,
  beatIndex,
  previews,
  clock,
}: {
  frame: FrontFrame;
  bpm: number;
  beats: number;
  accents: AccentLevel[];
  /** Grouping such as [2, 2, 3] for 7/8, or null for simple meters. */
  groups: number[] | null;
  subdivision: SubdivisionId;
  playing: boolean;
  /** Bumped on every sounding beat; beatIndex is that beat. */
  beatSerial: number;
  beatIndex: number;
  /** Bumped per beat when the player taps it to change its accent. */
  previews: number[];
  /** The audio-locked beat clock; when given, the sweep is computed from it every frame. */
  clock?: BeatClock;
}) {
  const box = frame.rect(RING_BOX);
  const k = box.w / 600;
  const n = Math.max(1, Math.min(MAX_BEATS, beats));
  const at = SUB_AT[subdivision] ?? [0];
  const fonts: Fonts = {
    num: [useFont(FONT_SEMI, 56), useFont(FONT_SEMI, 48), useFont(FONT_SEMI, 40), useFont(FONT_SEMI, 32)],
    word: [useFont(FONT_BOLD, 27), useFont(FONT_BOLD, 23)],
  };

  const groupStarts = useMemo(() => {
    const s = new Set<number>();
    if (groups && groups.length > 1) {
      let acc = 0;
      for (const g of groups) {
        s.add(acc);
        acc += g;
      }
    }
    return s;
  }, [groups]);
  const segs = useMemo(() => spans(n, groupStarts), [n, groupStarts]);

  // Static machining
  const innerBezel = useMemo(() => sector(R.pin, R.pin + 7, 0, 2 * Math.PI - 0.0001), []);
  const sockets = useMemo(() => {
    const p = Skia.Path.Make();
    segs.forEach(([a0, a1]) => p.addPath(sector(R.bin, R.bout, a0, a1)));
    return p;
  }, [segs]);
  const cells = useMemo(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < n; i++) subCells(i, n, at).forEach(([b0, b1]) => p.addPath(sector(R.sin, R.sout, b0, b1)));
    return p;
  }, [n, at]);

  // ---- Sweep: rides the outer track and crosses each segment centre on its click ----------------
  const legacy = useSharedValue(-1);
  const pos = useDerivedValue(() => {
    if (!clock) return legacy.value;
    const b = clock.barPos.value;
    if (b < 0) return -1;
    return ((b % n) + n) % n;
  });
  useEffect(() => {
    if (clock) return;
    const pos = legacy;
    if (!playing) {
      pos.value = -1;
      return;
    }
    if (beatSerial <= 0) return;
    const lenMs = 60000 / Math.max(20, bpm);
    pos.value = beatIndex;
    pos.value = withTiming(beatIndex + 0.999, { duration: lenMs, easing: Easing.linear });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatSerial, playing]);
  const atShared = useDerivedValue(() => at);
  const accentsShared = useDerivedValue(() => accents.slice(0, n));
  const liveCell = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (pos.value < 0) return p;
    const b = Math.floor(pos.value);
    const f = pos.value - b;
    const list = atShared.value;
    if (accentsShared.value[b] === 'mute') return p;
    let j = 0;
    for (let q = 0; q < list.length; q++) if (f >= list[q] - 0.0001) j = q;
    const fj = list[j];
    const nf = j + 1 < list.length ? list[j + 1] : 1 + list[0];
    const pf = j > 0 ? list[j - 1] : list[list.length - 1] - 1;
    const w = Math.min(nf - fj, fj - pf) * ((2 * Math.PI) / n);
    const g = Math.min(1.6 * DEG, w * 0.18);
    const c = beatAngle(b + fj, n);
    const a0 = c - w / 2 + g / 2 + 0.4 * DEG;
    const a1 = c + w / 2 - g / 2 - 0.4 * DEG;
    const sweep = (a1 - a0) / DEG;
    const r0 = R.sin + 2;
    const r1 = R.sout - 2;
    p.arcToOval(Skia.XYWHRect(C - r1, C - r1, r1 * 2, r1 * 2), a0 / DEG, sweep, true);
    p.arcToOval(Skia.XYWHRect(C - r0, C - r0, r0 * 2, r0 * 2), a1 / DEG, -sweep, false);
    p.close();
    return p;
  });

  const levels = Array.from({ length: n }, (_, i) => (accents[i] ?? (i === 0 ? 'strong' : 'normal')) as AccentLevel);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
      <Canvas style={{ width: box.w, height: box.h }}>
        <Group transform={[{ scale: k }]}>
          {/* plate */}
          <GlassUnder />
          <Path path={innerBezel}>
            <LinearGradient start={vec(C - R.pin, C - R.pin)} end={vec(C + R.pin, C + R.pin)} colors={['#f2c58a', '#8a5a2c', '#3a2614']} positions={[0, 0.45, 1]} />
          </Path>
          {/* sockets */}
          <Path path={sockets}>
            <RadialGradient c={vec(C, C)} r={R.bout} colors={['#040302', '#040302', '#0b0806']} positions={[0, R.bin / R.bout, 1]} />
          </Path>
          <Path path={sockets} style="stroke" strokeWidth={1.4} color="rgba(220,170,110,0.22)" />
          <Path path={cells} color="#060504" />
          <Path path={cells} style="stroke" strokeWidth={1} color="rgba(220,170,110,0.16)" />
          <Seat />

          {/* beats */}
          {segs.map((span, i) => (
            <Segment
              key={`${n}-${i}`}
              i={i}
              n={n}
              span={span}
              level={levels[i]}
              playing={playing}
              serial={beatIndex === i ? beatSerial : 0}
              preview={previews[i] ?? 0}
              fonts={fonts}
            />
          ))}

          {/* live subdivision and sweep */}
          <Path path={liveCell} color="rgba(255,200,130,0.95)" blendMode="plus">
            <BlurMask blur={3} style="solid" />
          </Path>
        </Group>
      </Canvas>
    </View>
  );
}

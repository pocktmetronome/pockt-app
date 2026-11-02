/**
 * Beatline: a string of light across the glass. The bar's beats ride in from the right as jewels and
 * cross the NOW gate exactly as their click is heard; each one plucks the string and the wave runs
 * out both ways. The string, the jewels and the flare are all computed per frame on the UI thread
 * from the audio-locked clock. Tap a jewel to change its accent.
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  Skia,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { SUB_AT } from '@/components/front/RhythmWheel';
import { C, GlassOver, GlassUnder, Seat, W, sector } from '@/components/front/faces/Optics';
import type { BeatClock } from '@/lib/front-clock';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';
import { rgbOf, type BeatLight } from '@/lib/front-light';
import type { SubdivisionId } from '@/lib/types';

const FONT = require('../../../assets/fonts/Barlow_600SemiBold.ttf');
const FONT_BOLD = require('../../../assets/fonts/Barlow_700Bold.ttf');
const BL = { gate: -150, y: 0, left: -262, right: 262 };
const NPTS = 97;
const X0 = BL.left - 20;
const X1 = BL.right + 20;
const POOL = 14;
const SUBPOOL = 40;
const NPL = 6;
const SIZE = [12, 18, 27, 38]; // by level: off, soft, normal, accent

export function BeatlineFace({
  frame,
  bpm,
  beats,
  subdivision,
  meterText,
  bar,
  clock,
  light,
  accents,
  beatCount,
  beatIndex,
  beatHost,
  beatLatency,
  onCycle,
}: {
  frame: FrontFrame;
  bpm: number;
  beats: number;
  subdivision: SubdivisionId;
  meterText: string;
  bar: number;
  clock: BeatClock;
  light: BeatLight;
  accents: SharedValue<number[]>;
  beatCount: SharedValue<number>;
  beatIndex: SharedValue<number>;
  beatHost: SharedValue<number>;
  beatLatency: SharedValue<number>;
  onCycle: (beat: number) => void;
}) {
  const box = frame.rect(RING_BOX);
  const k = box.w / 600;
  const n = Math.max(1, beats);
  const ppb = (BL.right - BL.gate) / Math.max(4, n);
  const sub = SUB_AT[subdivision] ?? [0];
  const font = useFont(FONT, 22);
  const fontNum = useFont(FONT, 26);
  const fontNow = useFont(FONT_BOLD, 15);
  const downC = rgbOf(light.down);
  const upC = rgbOf(light.up === 'rainbow' ? '#ff9a2e' : light.up);

  // ---- plucks: one per heard beat ------------------------------------------------------------
  const plucks = useSharedValue<number[]>(Array(NPL * 3).fill(0)); // t, amp, isDown
  const slot = useSharedValue(0);
  useAnimatedReaction(
    () => beatCount.value,
    (c, prev) => {
      if (prev == null || c === prev) return;
      const b = beatIndex.value;
      const lv = accents.value[b] ?? 2;
      if (lv <= 0) return;
      const a = lv >= 3 ? 1 : lv === 2 ? 0.75 : 0.42;
      const arr = plucks.value.slice();
      const s = slot.value % NPL;
      arr[s * 3] = beatHost.value + beatLatency.value;
      arr[s * 3 + 1] = a;
      arr[s * 3 + 2] = b === 0 ? 1 : 0;
      plucks.value = arr;
      slot.value = s + 1;
    }
  );

  // the string's shape, recomputed each frame
  const shape = useDerivedValue(() => {
    const ys: number[] = new Array(NPTS).fill(0);
    let hot = 0;
    let hotDown = 0;
    const now = clock.now.value;
    const pl = plucks.value;
    for (let j = 0; j < NPL; j++) {
      const t = pl[j * 3];
      const a = pl[j * 3 + 1];
      if (a <= 0) continue;
      const age = now - t;
      if (age < 0 || age > 1.6) continue;
      const amp = 34 * a * Math.exp(-age / 0.42);
      const front = age * 520;
      const w = 26 + age * 30;
      for (let i = 0; i < NPTS; i++) {
        const x = X0 + (X1 - X0) * (i / (NPTS - 1));
        const ad = Math.abs(x - BL.gate);
        if (ad < 4) continue;
        const d = ad - front;
        ys[i] += amp * Math.exp(-(d * d) / (w * w)) * Math.cos(d / 9);
      }
      const e = Math.exp(-age / 0.12) * a;
      if (e > hot) {
        hot = e;
        hotDown = pl[j * 3 + 2];
      }
    }
    return { ys, hot, hotDown };
  });
  const stringPath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const ys = shape.value.ys;
    for (let i = 0; i < NPTS; i++) {
      const x = C + X0 + (X1 - X0) * (i / (NPTS - 1));
      if (i === 0) p.moveTo(x, C + BL.y + ys[i]);
      else p.lineTo(x, C + BL.y + ys[i]);
    }
    return p;
  });
  const hotColor = useDerivedValue(() => {
    const c = shape.value.hotDown > 0.5 ? downC : upC;
    return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  });
  const glowWide = useDerivedValue(() => 0.05 + 0.08 * shape.value.hot);
  const glowMid = useDerivedValue(() => 0.12 + 0.2 * shape.value.hot);
  const core = useDerivedValue(() => 0.55 + 0.4 * shape.value.hot);
  const flareR = useDerivedValue(() => 90 * shape.value.hot + 20);
  const flareOp = useDerivedValue(() => (shape.value.hot > 0.01 ? Math.min(1, shape.value.hot * 1.2) : 0));
  const upCss = `rgb(${Math.round(upC[0] * 255)},${Math.round(upC[1] * 255)},${Math.round(upC[2] * 255)})`;

  const yAt = (ys: number[], x: number) => {
    'worklet';
    return ys[Math.max(0, Math.min(NPTS - 1, Math.round(((x - X0) / (X1 - X0)) * (NPTS - 1))))];
  };
  const posNow = () => {
    'worklet';
    return clock.pos.value < 0 ? 0 : clock.barPos.value;
  };

  // the bar a jewel belongs to, counted from the start of this run (the label rides in with the downbeat)
  const barSv = useSharedValue(bar);
  useEffect(() => {
    barSv.value = bar;
  }, [bar, barSv]);
  // ---- jewels: a fixed pool; slot j shows beat kb = first + j -----------------------------------
  const jewels = Array.from({ length: POOL }, (_, j) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const pos = posNow();
      const first = Math.floor(pos + (BL.left - BL.gate) / ppb) - 1;
      const kb = first + j;
      const b = ((kb % n) + n) % n;
      const x = BL.gate + (kb - pos) * ppb;
      const past = x < BL.gate - 1;
      const fade = x > BL.right + 10 || x < BL.left - 40 ? 0 : past ? Math.max(0, 1 - (BL.gate - x) / 110) : Math.min(1, (BL.right + 10 - x) / 60);
      const lv = accents.value[b] ?? 2;
      const live = clock.pos.value >= 0;
      const age = (pos - kb) * clock.spb.value;
      const flash = live && age >= 0 && age < 0.5 ? Math.exp(-age / 0.14) * (lv >= 3 ? 1 : lv === 2 ? 0.75 : 0.42) : 0;
      const y = BL.y + yAt(shape.value.ys, x);
      const size = SIZE[lv] * (1 + 0.6 * flash);
      const c = b === 0 ? downC : upC;
      return { x: C + x, y: C + y, fade, past, lv, size, col: `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`, down: b === 0, bar: barSv.value + Math.floor(kb / n) };
    })
  );
  const subs = Array.from({ length: SUBPOOL }, (_, j) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      if (sub.length < 2) return { x: -99, y: -99, op: 0 };
      const per = sub.length - 1;
      const pos = posNow();
      const first = Math.floor(pos + (BL.left - BL.gate) / ppb) - 1;
      const kb = first + Math.floor(j / per);
      const at = sub[(j % per) + 1];
      const x = BL.gate + (kb + at - pos) * ppb;
      if (x < BL.left || x > BL.right) return { x: -99, y: -99, op: 0 };
      const op = 0.45 * (x < BL.gate ? Math.max(0, 1 - (BL.gate - x) / 110) : 1);
      return { x: C + x, y: C + BL.y + yAt(shape.value.ys, x), op };
    })
  );

  const clip = useMemo(() => sector(0, W.kin - 4, 0, 2 * Math.PI - 0.0001), []);
  const nowW = fontNow ? fontNow.getGlyphWidths(fontNow.getGlyphIDs('N O W')).reduce((a, b) => a + b, 0) : 0;
  const footer = `${meterText}   ·   BAR ${bar}`;

  const footW = font ? font.getGlyphWidths(font.getGlyphIDs(footer)).reduce((a, b) => a + b, 0) : 0;

  // tap a jewel
  const tap = Gesture.Tap()
    .maxDuration(400)
    .onEnd((e) => {
      const mx = e.x / k - C;
      const my = e.y / k - C;
      if (Math.abs(my - BL.y) > 70 || Math.hypot(mx, my) > 278) return;
      const t = posNow() + (mx - BL.gate) / ppb;
      const kb = Math.round(t);
      if (Math.abs(t - kb) > 0.42) return;
      runOnJS(onCycle)(((kb % n) + n) % n);
    });

  return (
    <GestureDetector gesture={tap}>
      <View style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
        <Canvas style={{ width: box.w, height: box.h }}>
          <Group transform={[{ scale: k }]}>
            <GlassUnder />
            <Rect x={C + BL.gate - 2} y={C - 120} width={4} height={240} color="rgba(255,220,170,0.06)" />
            {[-1, 1].map((sd) => (
              <RoundedRect key={sd} x={C + BL.gate - 9} y={C + sd * 128 - 6} width={18} height={12} r={4} color="#6b4422" />
            ))}
            {fontNow ? <SkText font={fontNow} text="N O W" x={C + BL.gate - nowW / 2} y={C + 152} color="rgba(200,160,110,0.6)" /> : null}
            <Group clip={clip}>
              <Group blendMode="plus">
                <Path path={stringPath} style="stroke" strokeWidth={14} strokeCap="round" strokeJoin="round" color={hotColor} opacity={glowWide} />
                <Path path={stringPath} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" color={hotColor} opacity={glowMid} />
                <Path path={stringPath} style="stroke" strokeWidth={2.4} strokeCap="round" strokeJoin="round" color={upCss} opacity={core} />
                <Path path={stringPath} style="stroke" strokeWidth={1} strokeCap="round" strokeJoin="round" color="rgba(255,240,220,0.9)" />
                {subs.map((sv, j) => (
                  <SubDot key={`s${j}`} sv={sv} />
                ))}
              </Group>
              {jewels.map((jv, j) => (
                <Jewel key={`j${j}`} jv={jv} font={fontNum} />
              ))}
              <Group blendMode="plus" opacity={flareOp}>
                <Circle cx={C + BL.gate} cy={C + BL.y} r={flareR} color={hotColor} opacity={0.7}>
                  <BlurMask blur={26} style="normal" />
                </Circle>
                <Rect x={C + BL.gate - 1.5} y={C - 120} width={3} height={240} color={hotColor} opacity={0.6} />
              </Group>
            </Group>
            {font ? <SkText font={font} text={footer} x={C - footW / 2} y={C + 196} color="rgba(220,180,130,0.7)" /> : null}
            <Seat />
            <GlassOver />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

function SubDot({ sv }: { sv: SharedValue<{ x: number; y: number; op: number }> }) {
  const cx = useDerivedValue(() => sv.value.x);
  const cy = useDerivedValue(() => sv.value.y);
  const op = useDerivedValue(() => sv.value.op);
  return <Circle cx={cx} cy={cy} r={2.6} color="rgb(255,190,120)" opacity={op} />;
}

type JewelState = { x: number; y: number; fade: number; past: boolean; lv: number; size: number; col: string; down: boolean; bar: number };

function Jewel({ jv, font }: { jv: SharedValue<JewelState>; font: ReturnType<typeof useFont> }) {
  const halo = useDerivedValue(() => jv.value.size * 1.6);
  const haloOp = useDerivedValue(() => (jv.value.lv > 0 ? jv.value.fade * (jv.value.past ? 0.4 : 0.7) : 0));
  const gemOp = useDerivedValue(() => (jv.value.lv > 0 ? jv.value.fade * 0.95 : 0));
  const ringOp = useDerivedValue(() => (jv.value.lv === 0 ? jv.value.fade * 0.5 : 0));
  const cx = useDerivedValue(() => jv.value.x);
  const cy = useDerivedValue(() => jv.value.y);
  const col = useDerivedValue(() => jv.value.col);
  const gem = useDerivedValue(() => {
    const h = jv.value.lv > 0 ? jv.value.size * 0.42 : 0;
    return [{ translateX: jv.value.x }, { translateY: jv.value.y }, { rotate: Math.PI / 4 }, { scale: Math.max(0.001, h) }];
  });
  const cols = useDerivedValue(() => ['#ffffff', jv.value.col, jv.value.col]);
  const barOp = useDerivedValue(() => (jv.value.down && jv.value.x > C + BL.gate - 40 ? jv.value.fade * 0.85 : 0));
  const barText = useDerivedValue(() => String(jv.value.bar));
  const barX = useDerivedValue(() => jv.value.x - (jv.value.bar >= 10 ? 13 : 7));
  const tickX = useDerivedValue(() => jv.value.x - 0.5);
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={halo} color={col} opacity={haloOp} blendMode="plus">
        <BlurMask blur={18} style="normal" />
      </Circle>
      <Group transform={gem} opacity={gemOp}>
        <Rect x={-1} y={-1} width={2} height={2}>
          <LinearGradient start={vec(-1, -1)} end={vec(1, 1)} colors={cols} positions={[0, 0.5, 1]} />
        </Rect>
      </Group>
      <Circle cx={cx} cy={cy} r={9} style="stroke" strokeWidth={2} color="rgb(200,150,100)" opacity={ringOp} />
      <Group opacity={barOp}>
        {font ? <SkText font={font} text={barText} x={barX} y={C + BL.y - 56} color="rgb(236,200,150)" /> : null}
        <Rect x={tickX} y={C + BL.y - 48} width={1} height={20} color="rgb(236,200,150)" />
      </Group>
    </Group>
  );
}

const styles = StyleSheet.create({ box: { position: 'absolute' } });

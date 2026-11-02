/**
 * Pendulum: a clockmaker's metronome behind the glass. A polished steel rod on a brass pivot, a brass
 * weight that slides on it (higher is slower, as on every Maelzel metronome since 1815), an engraved
 * tempo scale with the Italian markings on the back plate, two end stops that light as the rod
 * arrives, and the rod's shadow travelling across the spun-metal floor. The swing is simple harmonic
 * motion phase-locked to the audio clock (it reaches each end exactly as the click is heard), drawn
 * with a shutter blur of six sub-frame poses. Slide the weight to set the tempo; catch the rod to stop
 * it, pull it aside and let go to start it.
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
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
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { C, DEG, GlassOver, GlassUnder, Seat, W } from '@/components/front/faces/Optics';
import type { BeatClock } from '@/lib/front-clock';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';
import { rgbOf, type BeatLight } from '@/lib/front-light';

const FONT = require('../../../assets/fonts/Barlow_600SemiBold.ttf');
const PIV = 160; // pivot below the window centre, master units
const LEN = 344;
const AMP = 26 * DEG;
const BLUR = 6;
const W_HI = 290; // weight centre at 20 BPM, along the rod from the pivot
const W_SPAN = 236; // down to 400 BPM
const WH = 92; // weight height
const wPos = (b: number) => {
  'worklet';
  return W_HI - W_SPAN * (Math.log(Math.max(20, Math.min(400, b)) / 20) / Math.log(20));
};
const bpmAt = (y: number) => {
  'worklet';
  return 20 * Math.pow(20, (W_HI - y) / W_SPAN);
};
/** The weight: a brass frustum, narrower at the top, its top edge is the index. */
function weightPath(w: number) {
  'worklet';
  const p = Skia.Path.Make();
  const top = C + PIV - w - WH / 2;
  const bot = top + WH;
  const tw = 31, bw = 44, r = 6;
  p.moveTo(C - tw + r, top);
  p.lineTo(C + tw - r, top);
  p.quadTo(C + tw, top, C + tw + 0.6, top + r);
  p.lineTo(C + bw, bot - r);
  p.quadTo(C + bw + 0.4, bot, C + bw - r, bot);
  p.lineTo(C - bw + r, bot);
  p.quadTo(C - bw - 0.4, bot, C - bw, bot - r);
  p.lineTo(C - tw - 0.6, top + r);
  p.quadTo(C - tw, top, C - tw + r, top);
  p.close();
  return p;
}
const SHOW_MARKS = false;
const MARKS: [number, string][] = [[50, 'LARGO'], [70, 'ADAGIO'], [92, 'ANDANTE'], [140, 'ALLEGRO'], [184, 'PRESTO']];
/** Scale line for a tempo: where the weight's top edge sits at rest. */
const scaleY = (b: number) => C + PIV - wPos(b) - WH / 2;

export function PendulumFace({
  frame,
  bpm,
  playing,
  clock,
  light,
  beatIndex,
  accents,
  onBpm,
  onCatch,
  onLaunch,
  onDetent,
}: {
  frame: FrontFrame;
  bpm: number;
  playing: boolean;
  clock: BeatClock;
  light: BeatLight;
  beatIndex: SharedValue<number>;
  accents: SharedValue<number[]>;
  onBpm: (bpm: number) => void;
  onCatch: () => void;
  onLaunch: () => void;
  onDetent: () => void;
}) {
  const box = frame.rect(RING_BOX);
  const k = box.w / 600;
  const font = useFont(FONT, 36);
  const fontSm = useFont(FONT, 17);

  // ---- the swing ------------------------------------------------------------------------------
  const theta = useSharedValue(0);
  const thetas = useSharedValue<number[]>(Array(BLUR).fill(0));
  const trail = useSharedValue<number[]>(Array(5).fill(0));
  const held = useSharedValue(0); // 1 while the finger holds the rod
  const heldTarget = useSharedValue(0);
  const freeFrom = useSharedValue(0); // release angle for a hand launch
  const freeAt = useSharedValue(-1);
  const stopAt = useSharedValue(-1);
  const stopTheta = useSharedValue(0);
  const playAt = useSharedValue(-1);
  const playingSv = useSharedValue(playing ? 1 : 0);
  const wSv = useSharedValue(wPos(bpm));
  const bpmSv = useSharedValue(bpm);
  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
  }, [playing, playingSv]);
  useEffect(() => {
    bpmSv.value = bpm;
  }, [bpm, bpmSv]);

  useFrameCallback(() => {
    'worklet';
    const t = clock.now.value;
    const spb = clock.spb.value;
    const pos = clock.pos.value;
    wSv.value += (wPos(bpmSv.value) - wSv.value) * 0.25;
    let th = 0;
    // the click is heard as the rod passes the centre (as on a real metronome), so the swing is a sine of the beat
    const at = (p: number) => AMP * Math.sin(Math.PI * p);
    const list = thetas.value.slice();
    const tr = trail.value.slice();
    if (held.value > 0.5) {
      th = theta.value + (heldTarget.value - theta.value) * 0.35;
      for (let i = 0; i < BLUR; i++) list[i] = th;
      for (let i = 0; i < 5; i++) tr[i] = th;
    } else if (playingSv.value > 0.5 && pos >= 0) {
      if (playAt.value < 0) playAt.value = t;
      // a hand launch is already swinging; a PLAY start eases into the arc over a third of a second
      let eng = freeAt.value > 0 ? 1 : Math.min(1, (t - playAt.value) / 0.33);
      eng = eng * eng * (3 - 2 * eng);
      const clockTh = at(pos) * eng;
      let free = clockTh;
      let blend = 1;
      if (freeAt.value > 0) {
        const el = t - freeAt.value;
        free = freeFrom.value * Math.cos((Math.PI * el) / Math.max(0.15, spb));
        blend = Math.min(1, el / Math.max(0.2, spb));
        if (blend >= 1) freeAt.value = -1;
      }
      th = free + (clockTh - free) * blend;
      // shutter: six poses across 1/60 s, computed from the clock, never from the last frame
      for (let i = 0; i < BLUR; i++) list[i] = at(pos - ((i / (BLUR - 1)) * (1 / 60)) / spb) * eng;
      for (let i = 0; i < 5; i++) tr[i] = at(pos - ((i + 1) * 0.02) / spb) * eng;
      stopAt.value = -1;
    } else {
      if (playAt.value >= 0) {
        playAt.value = -1;
        stopAt.value = t;
        stopTheta.value = theta.value;
      }
      if (freeAt.value > 0 && playingSv.value < 0.5) {
        // released but the engine has not started yet: swing freely
        const el = t - freeAt.value;
        th = freeFrom.value * Math.cos((Math.PI * el) / Math.max(0.15, 60 / bpmSv.value));
      } else if (stopAt.value >= 0) {
        // stopped: it swings down naturally
        const el = t - stopAt.value;
        th = stopTheta.value * Math.exp(-el / 0.7) * Math.cos((Math.PI * el) / Math.max(0.15, spb));
        if (el > 4) stopAt.value = -1;
      }
      for (let i = 0; i < BLUR; i++) list[i] = th;
      for (let i = 0; i < 5; i++) tr[i] = th;
    }
    theta.value = th;
    thetas.value = list;
    trail.value = tr;
  });

  // ---- static parts ---------------------------------------------------------------------------
  const scale = useMemo(() => {
    const major = Skia.Path.Make();
    const minor = Skia.Path.Make();
    const fine = Skia.Path.Make();
    for (let b = 20; b <= 400; b += b < 60 ? 2 : b < 120 ? 4 : b < 200 ? 8 : 20) {
      const y = scaleY(b);
      const m = [20, 30, 40, 60, 80, 120, 160, 200, 300, 400].includes(b);
      const mid = !m && b % 10 === 0;
      const path = m ? major : mid ? minor : fine;
      const len = m ? 24 : mid ? 15 : 9;
      path.moveTo(C - 28 - len, y);
      path.lineTo(C - 28, y);
      path.moveTo(C + 28, y);
      path.lineTo(C + 28 + len, y);
    }
    // the scale's spine: two engraved rails either side of the rod's slot
    major.moveTo(C - 28, scaleY(20) - 6);
    major.lineTo(C - 28, scaleY(400) + 6);
    major.moveTo(C + 28, scaleY(20) - 6);
    major.lineTo(C + 28, scaleY(400) + 6);
    return { major, minor, fine };
  }, []);
  const slot = useMemo(() => Skia.RRectXY(Skia.XYWHRect(C - 12, scaleY(20) - 10, 24, scaleY(400) - scaleY(20) + 20), 12, 12), []);
  const arc = useMemo(() => {
    const p = Skia.Path.Make();
    const r = LEN + 8;
    p.addArc(Skia.XYWHRect(C - r, C + PIV - r, r * 2, r * 2), -90 - 26 - 4, 52 + 8);
    const t = Skia.Path.Make();
    for (let d = -24; d <= 24; d += 4) {
      const a = (-90 + d) * DEG;
      const r0 = LEN + (d % 12 === 0 ? 1 : 4);
      t.moveTo(C + Math.cos(a) * r0, C + PIV + Math.sin(a) * r0);
      t.lineTo(C + Math.cos(a) * (LEN + 8), C + PIV + Math.sin(a) * (LEN + 8));
    }
    return { arc: p, ticks: t };
  }, []);
  const ends = [-1, 1].map((sd) => {
    const a = -Math.PI / 2 + sd * (AMP + 4 * DEG);
    return { x: C + Math.cos(a) * (LEN + 8), y: C + PIV + Math.sin(a) * (LEN + 8) };
  });

  // ---- moving parts ---------------------------------------------------------------------------
  const poses = Array.from({ length: BLUR }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => [{ rotate: thetas.value[i] ?? 0 }])
  );
  // the shadow falls down and to the right, further from the floor the higher up the rod
  const shadowPose = useDerivedValue(() => [{ translateX: 10 }, { translateY: 15 }, { rotate: theta.value }]);
  const hubSlot = useDerivedValue(() => [{ rotate: theta.value * 0.5 + 0.6 }]);
  const weight = useDerivedValue(() => weightPath(wSv.value));
  const wTop = useDerivedValue(() => C + PIV - wSv.value - WH / 2);
  const wGrad0 = useDerivedValue(() => vec(0, wTop.value));
  const wGrad1 = useDerivedValue(() => vec(0, wTop.value + WH));
  const wIndex = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(C - 30, wTop.value + 1.6);
    p.lineTo(C + 30, wTop.value + 1.6);
    return p;
  });
  const wGrooves = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let g = 1; g <= 3; g++) {
      const y = wTop.value + WH * (0.3 + g * 0.17);
      const half = 31 + (44 - 31) * ((y - wTop.value) / WH) - 1.5;
      p.moveTo(C - half, y);
      p.lineTo(C + half, y);
    }
    return p;
  });
  const trailPts = Array.from({ length: 5 }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const th = trail.value[i] ?? 0;
      return { x: C + Math.sin(th) * wSv.value, y: C + PIV - Math.cos(th) * wSv.value };
    })
  );
  const trailOp = useDerivedValue(() => (clock.pos.value >= 0 ? 0.55 : 0));
  const tc = rgbOf(light.up === 'rainbow' ? '#ff9a2e' : light.up);
  const trailColor = `rgba(${Math.round(tc[0] * 255)},${Math.round(tc[1] * 255)},${Math.round(tc[2] * 255)},0.35)`;

  // end stops: the stop the rod has just reached lights, in the beat's colour
  // the beat light sits at the top of the arc, where the rod passes as the click is heard
  const beatOp = useDerivedValue(() => {
    if (clock.pos.value < 0) return 0;
    const dt = clock.now.value - clock.lastBeatAt.value;
    const lvl = accents.value[beatIndex.value] ?? 2;
    const pk = lvl >= 3 ? 1 : lvl === 2 ? 0.75 : lvl === 1 ? 0.42 : 0;
    return dt >= 0 ? Math.exp(-dt / 0.16) * pk : 0;
  });
  const downCol = rgbOf(light.down);
  const upCol = rgbOf(light.up);
  const jewelColor = useDerivedValue(() => {
    const c = beatIndex.value === 0 ? downCol : upCol;
    return `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  });
  // the scale line the weight is on glows softly
  const markY = useDerivedValue(() => C + PIV - wSv.value - WH / 2);

  // ---- gestures: weight sets tempo; rod catches and launches ----------------------------------
  const grab = useSharedValue(0); // 1 weight, 2 rod
  const y0 = useSharedValue(0);
  const b0 = useSharedValue(0);
  const lastB = useSharedValue(0);
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const mx = e.x / k - C;
      const my = e.y / k - C - PIV;
      const th = theta.value;
      const along = mx * Math.sin(th) - my * Math.cos(th);
      const across = mx * Math.cos(th) + my * Math.sin(th);
      if (Math.abs(across) < 52 && Math.abs(along - wSv.value) < 56) {
        grab.value = 1;
        y0.value = along;
        b0.value = bpmSv.value;
        lastB.value = bpmSv.value;
        runOnJS(onDetent)();
      } else if (along > 30 && along < LEN + 20 && Math.abs(across) < 36) {
        grab.value = 2;
        if (playingSv.value > 0.5) runOnJS(onCatch)();
        stopAt.value = -1;
        freeAt.value = -1;
        held.value = 1;
        heldTarget.value = theta.value;
      } else grab.value = 0;
    })
    .onUpdate((e) => {
      const mx = e.x / k - C;
      const my = e.y / k - C - PIV;
      if (grab.value === 1) {
        const th = theta.value;
        const along = mx * Math.sin(th) - my * Math.cos(th);
        const nb = Math.max(20, Math.min(400, Math.round(bpmAt(wPos(b0.value) + (along - y0.value)))));
        if (nb !== lastB.value) {
          lastB.value = nb;
          runOnJS(onBpm)(nb);
          runOnJS(onDetent)();
        }
      } else if (grab.value === 2) {
        const th = Math.atan2(mx, -my);
        const lim = AMP * 1.12;
        heldTarget.value = Math.max(-lim, Math.min(lim, th));
      }
    })
    .onFinalize(() => {
      if (grab.value === 2) {
        held.value = 0;
        const th = theta.value;
        if (Math.abs(th) >= 6 * DEG) {
          freeFrom.value = th;
          freeAt.value = clock.now.value;
          runOnJS(onLaunch)();
        } else {
          stopAt.value = clock.now.value;
          stopTheta.value = th;
        }
      }
      grab.value = 0;
    });

  const ROD_TOP = C + PIV - LEN;
  const engraved = 'rgba(226,182,120,0.78)';
  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
        <Canvas style={{ width: box.w, height: box.h }}>
          <Group transform={[{ scale: k }]}>
            <GlassUnder />

            {/* the engraved tempo scale: cut into the floor, so each line has a dark side and a lit side */}
            <RoundedRect rect={slot} color="rgba(0,0,0,0.55)" />
            <RoundedRect rect={slot} style="stroke" strokeWidth={1} color="rgba(255,214,160,0.10)" />
            <Group transform={[{ translateY: 0.8 }]}>
              <Path path={scale.major} style="stroke" strokeWidth={2.2} color="rgba(0,0,0,0.7)" />
              <Path path={scale.minor} style="stroke" strokeWidth={1.5} color="rgba(0,0,0,0.6)" />
            </Group>
            <Path path={scale.fine} style="stroke" strokeWidth={0.9} color="rgba(226,182,120,0.32)" />
            <Path path={scale.minor} style="stroke" strokeWidth={1.3} color="rgba(226,182,120,0.55)" />
            <Path path={scale.major} style="stroke" strokeWidth={2.4} color={engraved} />
            {font
              ? [20, 30, 40, 60, 80, 120, 200, 400].map((b, i) => (
                  <SkText
                    key={b}
                    font={font}
                    text={String(b)}
                    x={i % 2 === 0 ? C + 64 : C - 64 - font.getTextWidth(String(b))}
                    y={scaleY(b) + 12.5}
                    color={b === 120 ? 'rgba(255,222,165,1)' : 'rgba(236,196,140,0.92)'}
                  />
                ))
              : null}
            {fontSm && SHOW_MARKS
              ? MARKS.map(([b, word]) => (
                  <SkText key={word} font={fontSm} text={word} x={C - 62 - fontSm.getTextWidth(word)} y={scaleY(b) + 6} color="rgba(214,170,112,0.62)" />
                ))
              : null}
            <Path path={arc.arc} style="stroke" strokeWidth={1.2} color="rgba(226,182,120,0.32)" />
            <Path path={arc.ticks} style="stroke" strokeWidth={1.1} color="rgba(226,182,120,0.4)" />
            {/* the line the weight sits on glows, so the tempo reads at a glance */}
            <Group blendMode="plus">
              <Rect x={C + 26} y={markY} width={30} height={2} color="rgba(255,190,110,0.9)">
                <BlurMask blur={2} style="solid" />
              </Rect>
              <Rect x={C - 56} y={markY} width={30} height={2} color="rgba(255,190,110,0.9)">
                <BlurMask blur={2} style="solid" />
              </Rect>
            </Group>

            {/* end stops: domed lenses set into brass cups */}
            {ends.map((p, i) => (
              <Group key={i}>
                <Circle cx={p.x} cy={p.y} r={10}>
                  <LinearGradient start={vec(p.x - 10, p.y - 10)} end={vec(p.x + 10, p.y + 10)} colors={['#f1c88c', '#8a5a2c', '#2a1a0c']} />
                </Circle>
                <Circle cx={p.x} cy={p.y} r={5} color="#1a100a" />
              </Group>
            ))}
            {/* the beat lens at the top of the arc */}
            <Circle cx={C} cy={C + PIV - LEN - 8} r={15}>
              <LinearGradient start={vec(C - 15, C + PIV - LEN - 23)} end={vec(C + 15, C + PIV - LEN + 7)} colors={['#f6d29a', '#8a5a2c', '#24160a']} />
            </Circle>
            <Circle cx={C} cy={C + PIV - LEN - 8} r={10.5} color="#0a0705" />
            <Circle cx={C} cy={C + PIV - LEN - 8} r={44} color={jewelColor} opacity={beatOp} blendMode="plus">
              <BlurMask blur={18} style="normal" />
            </Circle>
            <Circle cx={C} cy={C + PIV - LEN - 8} r={9.5} color={jewelColor} opacity={beatOp} blendMode="plus" />
            <Circle cx={C - 3.4} cy={C + PIV - LEN - 11.5} r={2.6} color="rgba(255,255,255,0.6)" />

            {/* shadow on the back plate */}
            <Group origin={vec(C, C + PIV)} transform={shadowPose} opacity={0.5}>
              <RoundedRect x={C - 7} y={ROD_TOP + 6} width={14} height={LEN - 6} r={7} color="black" />
              <Path path={weight} color="black" />
              <BlurMask blur={8} style="normal" />
            </Group>

            {/* light trail */}
            {trailPts.map((pt, i) => (
              <Circle key={`t${i}`} c={pt} r={20} color={trailColor} opacity={trailOp} blendMode="plus">
                <BlurMask blur={16} style="normal" />
              </Circle>
            ))}

            {/* the pendulum, six shutter poses */}
            {poses.map((pose, i) => (
              <Group key={`p${i}`} origin={vec(C, C + PIV)} transform={pose} opacity={i === 0 ? 0.55 : 0.09}>
                {/* polished steel rod: a cylinder, one hard highlight from the softbox */}
                <RoundedRect x={C - 7} y={ROD_TOP + 6} width={14} height={LEN - 6} r={7}>
                  <LinearGradient start={vec(C - 7, 0)} end={vec(C + 7, 0)} colors={['#3c3a37', '#d9d6cf', '#ffffff', '#8c8981', '#2e2c29']} positions={[0, 0.28, 0.38, 0.7, 1]} />
                </RoundedRect>
                {/* the finial */}
                <Circle cx={C} cy={ROD_TOP + 6} r={12}>
                  <RadialGradient c={vec(C - 3, ROD_TOP + 2.5)} r={12} colors={['#fff6e4', '#e6b46e', '#6a4218', '#2a1708']} positions={[0, 0.35, 0.8, 1]} />
                </Circle>
                {/* brass weight: lit from the upper left, darker toward its lower edge */}
                <Path path={weight}>
                  <LinearGradient start={vec(C - 44, 0)} end={vec(C + 44, 0)} colors={['#4a2a10', '#c88a40', '#ffe6b0', '#e0a458', '#8a5422', '#2e1a0a']} positions={[0, 0.2, 0.34, 0.5, 0.78, 1]} />
                </Path>
                <Path path={weight}>
                  <LinearGradient start={wGrad0} end={wGrad1} colors={['rgba(255,240,210,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']} positions={[0, 0.3, 1]} />
                </Path>
                <Path path={wGrooves} style="stroke" strokeWidth={1.2} color="rgba(40,20,6,0.55)" />
                <Path path={wIndex} style="stroke" strokeWidth={1.4} color="rgba(255,236,200,0.85)" />
              </Group>
            ))}

            {/* pivot: a brass boss with a slotted screw */}
            <Circle cx={C + 5} cy={C + PIV + 6} r={38} color="rgba(0,0,0,0.55)">
              <BlurMask blur={6} style="normal" />
            </Circle>
            <Circle cx={C} cy={C + PIV} r={34}>
              <LinearGradient start={vec(C - 34, C + PIV - 34)} end={vec(C + 34, C + PIV + 34)} colors={['#ffe9c4', '#c88f4c', '#5a3814', '#2a1708']} positions={[0, 0.38, 0.8, 1]} />
            </Circle>
            <Circle cx={C} cy={C + PIV} r={21}>
              <RadialGradient c={vec(C - 6, C + PIV - 7)} r={26} colors={['#fff0d2', '#d9a35c', '#6a4418']} />
            </Circle>
            <Group origin={vec(C, C + PIV)} transform={hubSlot}>
              <RoundedRect x={C - 2.8} y={C + PIV - 17} width={5.6} height={34} r={2.8} color="rgba(40,22,8,0.8)" />
            </Group>

            <Seat />
            <GlassOver />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ box: { position: 'absolute' } });

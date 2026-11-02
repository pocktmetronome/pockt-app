/**
 * Pro: the working musician's face. One column of three backlit cells per beat shows its accent
 * (three lit = ACCENT, none = OFF); drag a column up or down to set it, tap to step it. Subdivision
 * pips run beneath, a pendulum light sweeps end to end arriving on every click, and bar, beat and
 * elapsed time read out large. Every light is computed per frame from the audio-locked clock.
 */
import {
  BlurMask,
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  Text as SkText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { SUB_AT } from '@/components/front/RhythmWheel';
import { C, GlassOver, GlassUnder, Seat } from '@/components/front/faces/Optics';
import type { BeatClock } from '@/lib/front-clock';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';
import { PRO_BAR_ORDER, proBarOf, type ProBar, rgbOf, type BeatLight } from '@/lib/front-light';
import type { SubdivisionId } from '@/lib/types';

const FONT = require('../../../assets/fonts/Barlow_600SemiBold.ttf');
const FONT_LIGHT = require('../../../assets/fonts/Barlow_300Light.ttf');
const FONT_BOLD = require('../../../assets/fonts/Barlow_700Bold.ttf');
const PRO = { top: -116, cell: 48, gap: 8, subY: 66, pendY: 100, rowY: 172 };
const MAXN = 16;
const geom = (n: number) => {
  'worklet';
  const span = Math.min(500, 82 * n + 40);
  const cw = span / n;
  return { cw, x0: -span / 2, w: cw * 0.78 };
};
const css = (c: [number, number, number], lift = 0) => {
  'worklet';
  return `rgb(${Math.min(255, Math.round(c[0] * 255) + lift)},${Math.min(255, Math.round(c[1] * 255) + lift)},${Math.min(255, Math.round(c[2] * 255) + lift)})`;
};

function Column({
  i,
  n,
  level,
  light,
  clock,
  accents,
  editAt,
  sub,
  font,
}: {
  i: number;
  n: number;
  level: number;
  light: BeatLight;
  clock: BeatClock;
  accents: SharedValue<number[]>;
  editAt: SharedValue<number[]>;
  sub: number[];
  font: ReturnType<typeof useFont>;
}) {
  const G = geom(n);
  const x = C + G.x0 + i * G.cw + (G.cw - G.w) / 2;
  const col = rgbOf(i === 0 ? light.down : light.up === 'rainbow' ? '#ff9a2e' : light.up);
  const flash = light.proFlash;
  const hit = useDerivedValue(() => {
    let h = 0;
    const bp = clock.barPos.value;
    if (bp >= 0) {
      const fl = Math.floor(bp);
      const cur = ((fl % n) + n) % n;
      if (cur === i) {
        const lv = accents.value[i] ?? 2;
        const pk = lv >= 3 ? 1 : lv === 2 ? 0.85 : lv === 1 ? 0.55 : 0;
        const dt = (bp - fl) * clock.spb.value;
        h = Math.exp(-dt / Math.min(0.2, clock.spb.value * 0.45)) * pk;
        if ((flash === 'accents' && lv < 3) || (flash === 'downbeat' && i !== 0)) h = 0;
      }
    }
    const e = clock.now.value - (editAt.value[i] ?? -9);
    if (e >= 0 && e < 2) h = Math.max(h, Math.exp(-e / 0.35));
    return h;
  });
  const playingOp = useDerivedValue(() => {
    const base = clock.pos.value >= 0 ? 0.32 : 0.72;
    return Math.min(1, base + hit.value * (1 - base));
  });
  const glowOp = useDerivedValue(() => 0.25 + 0.75 * hit.value);
  const numOp = useDerivedValue(() => {
    const bp = clock.barPos.value;
    if (bp < 0) return 0;
    const cur = ((Math.floor(bp) % n) + n) % n;
    return cur === i ? 0.6 + 0.4 * hit.value : 0;
  });
  const pw = G.w / sub.length;
  const pipOps = sub.map((at) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const bp = clock.barPos.value;
      if (bp < 0) return 0.14;
      const fl = Math.floor(bp);
      if (((fl % n) + n) % n !== i) return 0.14;
      const d = (bp - fl - at) * clock.spb.value;
      return d >= 0 ? 0.14 + 0.86 * Math.exp(-d / 0.09) : 0.14;
    })
  );
  const lit = [0, 1, 2].filter((j) => 2 - j < level);
  return (
    <Group>
      {[0, 1, 2].map((j) => {
        const y = C + PRO.top + j * (PRO.cell + PRO.gap);
        return (
          <Group key={`s${j}`}>
            {/* the socket: cut into the floor, its upper wall in shadow, its lower lip catching the light */}
            <RoundedRect x={x} y={y} width={G.w} height={PRO.cell} r={7} color="#060403" />
            <RoundedRect x={x} y={y} width={G.w} height={PRO.cell} r={7}>
              <LinearGradient start={vec(0, y)} end={vec(0, y + PRO.cell)} colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)', 'rgba(255,214,160,0.05)']} positions={[0, 0.35, 1]} />
            </RoundedRect>
            <RoundedRect x={x + 0.5} y={y + 0.5} width={G.w - 1} height={PRO.cell - 1} r={6.5} style="stroke" strokeWidth={1}>
              <LinearGradient start={vec(0, y)} end={vec(0, y + PRO.cell)} colors={['rgba(0,0,0,0.6)', 'rgba(255,206,150,0.07)', 'rgba(255,214,160,0.28)']} />
            </RoundedRect>
            {/* the unlit lens: frosted glass, a little of the room in it */}
            <RoundedRect x={x + 3} y={y + 3} width={G.w - 6} height={PRO.cell - 6} r={4.5}>
              <LinearGradient start={vec(0, y + 3)} end={vec(0, y + PRO.cell - 3)} colors={['rgba(255,226,190,0.07)', 'rgba(255,226,190,0.015)', 'rgba(0,0,0,0.12)']} />
            </RoundedRect>
          </Group>
        );
      })}
      <Group blendMode="plus" opacity={glowOp}>
        {lit.map((j) => (
          <RoundedRect key={`g${j}`} x={x - 2} y={C + PRO.top + j * (PRO.cell + PRO.gap) - 2} width={G.w + 4} height={PRO.cell + 4} r={8} color={css(col)} opacity={0.5}>
            <BlurMask blur={14} style="normal" />
          </RoundedRect>
        ))}
      </Group>
      <Group blendMode="plus" opacity={playingOp}>
        {lit.map((j) => {
          const y = C + PRO.top + j * (PRO.cell + PRO.gap);
          return (
            <Group key={`c${j}`}>
              {/* the lit lens: hottest in the middle where the emitter sits, a gloss on its upper face */}
              <RoundedRect x={x + 3} y={y + 3} width={G.w - 6} height={PRO.cell - 6} r={4.5}>
                <LinearGradient start={vec(0, y + 3)} end={vec(0, y + PRO.cell - 3)} colors={[css(col, 40), css(col, 70), css(col, 10)]} positions={[0, 0.45, 1]} />
              </RoundedRect>
              <RoundedRect x={x + 6} y={y + 5} width={G.w - 12} height={PRO.cell * 0.26} r={3} color="rgba(255,255,255,0.26)" />
            </Group>
          );
        })}
      </Group>
      {level === 0 && font ? (
        <SkText font={font} text="OFF" x={x + G.w / 2 - font.getGlyphWidths(font.getGlyphIDs('OFF')).reduce((a, b) => a + b, 0) / 2} y={C + PRO.top + 1.5 * (PRO.cell + PRO.gap) + 7} color="rgba(200,150,100,0.5)" />
      ) : null}
      {sub.map((_, s2) => (
        <RoundedRect key={`p${s2}`} x={x + s2 * pw + pw * 0.15} y={C + PRO.subY} width={pw * 0.7} height={8} r={3} color={css(col)} opacity={pipOps[s2]} />
      ))}
      <Group opacity={numOp}>{font ? <SkText font={font} text={String(i + 1)} x={x + G.w / 2 - (i + 1 >= 10 ? 16 : 8)} y={C + PRO.top - 14} color="#ffecc8" /> : null}</Group>
    </Group>
  );
}

export function ProFace({
  frame,
  bpm,
  beats,
  levels,
  subdivision,
  playing,
  bar,
  startedAt,
  beat,
  clock,
  light,
  accents,
  onCycle,
  onSetLevel,
  onDetent,
  onBarMode,
}: {
  frame: FrontFrame;
  bpm: number;
  beats: number;
  /** Accent level per beat: 3 accent, 2 normal, 1 soft, 0 off. */
  levels: number[];
  subdivision: SubdivisionId;
  playing: boolean;
  /** Bar number since Play (1-based), from the shared transport. */
  bar: number;
  /** Date.now() when Play began, 0 when stopped. */
  startedAt: number;
  beat: number;
  clock: BeatClock;
  light: BeatLight;
  accents: SharedValue<number[]>;
  onCycle: (beat: number) => void;
  onSetLevel: (beat: number, level: number) => void;
  onDetent: () => void;
  onBarMode?: (next: ProBar) => void;
}) {
  const box = frame.rect(RING_BOX);
  const k = box.w / 600;
  const n = Math.max(1, Math.min(MAXN, beats));
  const sub = SUB_AT[subdivision] ?? [0];
  const font = useFont(FONT, 30);
  const fontBig = useFont(FONT_LIGHT, 56);
  const fontLbl = useFont(FONT_BOLD, 17);
  const editAt = useSharedValue<number[]>(Array(MAXN).fill(-9));

  // bar and elapsed time both count from PLAY and are owned by the screen, not this face, so switching
  // faces never restarts them
  const since = () => (playing && startedAt > 0 ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);
  const [elapsed, setElapsed] = useState(since);
  useEffect(() => {
    setElapsed(since());
    if (!playing || !startedAt) return;
    const id = setInterval(() => setElapsed(since()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, startedAt]);
  const barNo = bar;
  const readouts = [playing ? String(barNo) : '—', playing ? `${beat + 1}/${n}` : '—', `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`];

  // pendulum light
  const half = Math.min(230, (n * geom(n).cw) / 2 + 10);
  const pendX = useDerivedValue(() => {
    const p = clock.pos.value;
    return p < 0 ? C : C - half * Math.cos(Math.PI * p);
  });
  const vel = useDerivedValue(() => (clock.pos.value < 0 ? 0 : Math.abs(Math.sin(Math.PI * clock.pos.value))));
  const trail = [1, 2, 3, 4, 5, 6].map((t) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const p = clock.pos.value;
      const xt = p < 0 ? C : C - half * Math.cos(Math.PI * (p - t * 0.035));
      return [{ translateX: xt - 16 }];
    })
  );
  const trailOps = [1, 2, 3, 4, 5, 6].map((t) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => 0.12 * (1 - t / 7) * vel.value * 2.2)
  );
  const pendT = useDerivedValue(() => [{ translateX: pendX.value - 18 }]);
  const downC = rgbOf(light.down);
  const upC = rgbOf(light.up === 'rainbow' ? '#ff9a2e' : light.up);
  const pendColor = useDerivedValue(() => {
    const bp = clock.barPos.value;
    const next = bp < 0 ? 0 : (Math.floor(bp) + (bp - Math.floor(bp) < 0.5 ? 0 : 1)) % n;
    return css(next === 0 ? downC : upC, 70);
  });
  const barMode = proBarOf(light);
  const pendOn = barMode === 'pendulum';
  // 'beat' and 'accents': the whole bar flashes on the beat (accents only: on accented beats)
  const flashOp = useDerivedValue(() => {
    if (barMode !== 'beat' && barMode !== 'accents') return 0;
    if (clock.pos.value < 0) return 0;
    const bp = clock.barPos.value;
    const b = Math.max(0, Math.floor(bp + 0.02)) % n;
    const lv = accents.value[b] ?? 2;
    if (lv <= 0) return 0;
    if (barMode === 'accents' && lv < 3) return 0;
    const age = Math.max(0, clock.now.value - clock.lastBeatAt.value);
    return Math.exp(-age / 0.16) * (lv >= 3 ? 1 : 0.7);
  });
  const flashColor = useDerivedValue(() => {
    const bp = clock.barPos.value;
    const b = bp < 0 ? 0 : Math.max(0, Math.floor(bp + 0.02)) % n;
    return css(b === 0 ? downC : upC, 70);
  });

  // gestures: drag a column to set its level, tap to step it
  const g = geom(n);
  const colOf = (mx: number, my: number) => {
    'worklet';
    if (my < PRO.top - 30 || my > PRO.subY + 30) return -1;
    const i = Math.floor((mx - g.x0) / g.cw);
    return i >= 0 && i < n ? i : -1;
  };
  const active = useSharedValue(-1);
  const y0 = useSharedValue(0);
  const moved = useSharedValue(0);
  const lastLv = useSharedValue(-1);
  const pan = Gesture.Pan()
    .minDistance(6)
    .onBegin((e) => {
      const mx = e.x / k - C;
      const my = e.y / k - C;
      if (Math.hypot(mx, my) > 278) {
        active.value = -1;
        return;
      }
      active.value = colOf(mx, my);
      y0.value = e.y;
      moved.value = 0;
      lastLv.value = accents.value[active.value] ?? -1;
      if (active.value >= 0) runOnJS(onDetent)();
    })
    .onUpdate((e) => {
      if (active.value < 0) return;
      if (!moved.value && Math.abs(e.y - y0.value) < 6) return;
      moved.value = 1;
      const my = e.y / k - C;
      const bottom = PRO.top + 3 * (PRO.cell + PRO.gap);
      const lv = Math.max(0, Math.min(3, Math.round((bottom - my) / (PRO.cell + PRO.gap))));
      if (lv !== lastLv.value) {
        lastLv.value = lv;
        const ed = editAt.value.slice();
        ed[active.value] = clock.now.value;
        editAt.value = ed;
        runOnJS(onSetLevel)(active.value, lv);
      }
    })
    .onFinalize(() => {
      active.value = -1;
    });
  // a tap steps the column through its levels, like the old hardware; a drag sets it directly
  const tap = Gesture.Tap()
    .maxDuration(450)
    .maxDistance(12)
    .onEnd((e, success) => {
      if (!success) return;
      const mx = e.x / k - C;
      const my = e.y / k - C;
      if (Math.hypot(mx, my) > 278) return;
      if (Math.abs(my - PRO.pendY) < 26 && Math.abs(mx) < half + 30) {
        const i = PRO_BAR_ORDER.indexOf(barMode);
        if (onBarMode) runOnJS(onBarMode)(PRO_BAR_ORDER[(i + 1) % PRO_BAR_ORDER.length]);
        return;
      }
      const col = colOf(mx, my);
      if (col < 0) return;
      const ed = editAt.value.slice();
      ed[col] = clock.now.value;
      editAt.value = ed;
      runOnJS(onCycle)(col);
    });
  const gesture = Gesture.Race(pan, tap);

  const labelW = (t: string, f: typeof fontBig) => (f ? f.getGlyphWidths(f.getGlyphIDs(t)).reduce((a, b) => a + b, 0) : 0);
  const columns = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
        <Canvas style={{ width: box.w, height: box.h }}>
          <Group transform={[{ scale: k }]}>
            <GlassUnder />
            {columns.map((i) => (
              <Column key={`${i}:${n}:${sub.length}`} i={i} n={n} level={levels[i] ?? 2} light={light} clock={clock} accents={accents} editAt={editAt} sub={sub} font={font} />
            ))}
            <RoundedRect x={C - half - 8} y={C + PRO.pendY - 3} width={half * 2 + 16} height={6} r={3} color={barMode === 'off' ? 'rgba(220,170,110,0.08)' : 'rgba(220,170,110,0.16)'} />
            {barMode === 'beat' || barMode === 'accents' ? (
              <Group blendMode="plus" opacity={flashOp}>
                <RoundedRect x={C - half - 14} y={C + PRO.pendY - 14} width={half * 2 + 28} height={28} r={14} color={flashColor} opacity={0.7}>
                  <BlurMask blur={12} style="normal" />
                </RoundedRect>
                <RoundedRect x={C - half - 8} y={C + PRO.pendY - 6} width={half * 2 + 16} height={12} r={6} color={flashColor} />
              </Group>
            ) : null}
            {pendOn ? (
              <Group>
                <Group blendMode="plus">
                  {trail.map((tr, t) => (
                    <Group key={t} transform={tr} opacity={trailOps[t]}>
                      <RoundedRect x={0} y={C + PRO.pendY - 6} width={32} height={12} r={6} color={pendColor} />
                    </Group>
                  ))}
                  <Group transform={pendT}>
                    <RoundedRect x={-6} y={C + PRO.pendY - 12} width={48} height={24} r={12} color={pendColor} opacity={0.8}>
                      <BlurMask blur={10} style="normal" />
                    </RoundedRect>
                    <RoundedRect x={0} y={C + PRO.pendY - 6} width={36} height={12} r={6} color={pendColor} />
                  </Group>
                </Group>
              </Group>
            ) : null}
            {fontLbl
              ? ['BAR', 'BEAT', 'TIME'].map((t, i) => (
                  <SkText key={t} font={fontLbl} text={t} x={C + (i - 1) * 150 - labelW(t, fontLbl) / 2} y={C + PRO.rowY - 34} color="rgba(200,160,110,0.55)" />
                ))
              : null}
            {fontBig
              ? readouts.map((t, i) => (
                  <SkText key={`r${i}`} font={fontBig} text={t} x={C + (i - 1) * 150 - labelW(t, fontBig) / 2} y={C + PRO.rowY + 28} color="#f7c98a" />
                ))
              : null}
            <Seat />
            <GlassOver />
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ box: { position: 'absolute' } });

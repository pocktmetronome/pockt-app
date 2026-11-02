/**
 * The tuner, in the window: a strobe ring just inside the rim that turns toward the error and stands dead
 * still when the string is true (the way a Peterson strobe reads), the note in letters you can read from a
 * music stand, the error in cents in one line, and a thick pitch trace that scrolls like an EKG: hold the
 * line on the centre and you are in tune. Nothing else. Reference pitch and the rest live on the LED window.
 */
import { BlurMask, Canvas, Circle, Group, LinearGradient, Path, Rect, Skia, Text as SkText, useFont, vec } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { InstrumentState } from '@/components/front/v9/Instrument';
import { C, GlassOver, GlassUnder, Seat, W } from '@/components/front/faces/Optics';
import type { BeatClock } from '@/lib/front-clock';
import { RING_BOX, type FrontFrame } from '@/lib/front-geometry';

const LIGHT = require('../../../assets/fonts/Barlow_300Light.ttf');
const MED = require('../../../assets/fonts/Barlow_500Medium.ttf');
const SEMI = require('../../../assets/fonts/Barlow_600SemiBold.ttf');

const SEGS = 30;
const R_IN = 258, R_OUT = 276;
const TRACE = { x0: C - 212, x1: C + 212, y: C + 92, span: 86, cents: 50, seconds: 3.0 };
const GREEN = [120, 255, 170] as const;
const AMBER = [255, 150, 55] as const;
const mixCol = (t: number, a = 1) => {
  'worklet';
  const r = Math.round(AMBER[0] + (GREEN[0] - AMBER[0]) * t);
  const g = Math.round(AMBER[1] + (GREEN[1] - AMBER[1]) * t);
  const b = Math.round(AMBER[2] + (GREEN[2] - AMBER[2]) * t);
  return `rgba(${r},${g},${b},${a})`;
};

export type TunerFaceReading = { heard: boolean; locked: boolean; note: string; octave: string; cents: number; hint: string };

export function TunerFace({ frame, st, clock, reading: readingIn }: { frame: FrontFrame; st: InstrumentState; clock: BeatClock; reading: TunerFaceReading }) {
  const reading = readingIn;
  const box = frame.rect(RING_BOX);
  const k = box.w / 600;
  const noteF = useFont(LIGHT, 210);
  const accF = useFont(MED, 78);
  const octF = useFont(MED, 54);
  const lineF = useFont(SEMI, 40);
  const idleF = useFont(SEMI, 34);

  // ---- the strobe ring: turns at a rate set by the error, freezes in tune ------------------------------
  const spin = useSharedValue(0);
  const vel = useSharedValue(0);
  useFrameCallback((f) => {
    'worklet';
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    const live = st.heard.value > 0.5;
    const lock = st.lockGlow.value > 0.3;
    const target = live && !lock ? Math.max(-50, Math.min(50, st.needle.value)) * 0.09 : 0;
    vel.value += (target - vel.value) * Math.min(1, dt * 7);
    spin.value += vel.value * dt;
  });
  // each segment is a short stroked arc on the ring's centre line
  const segPath = useMemo(() => {
    const p = Skia.Path.Make();
    const r = (R_IN + R_OUT) / 2;
    const step = 360 / SEGS;
    const oval = Skia.XYWHRect(C - r, C - r, 2 * r, 2 * r);
    for (let i = 0; i < SEGS; i++) p.addArc(oval, i * step + step * 0.3, step * 0.4);
    return p;
  }, []);
  const ringT = useDerivedValue(() => [{ translateX: C }, { translateY: C }, { rotate: spin.value }, { translateX: -C }, { translateY: -C }]);
  const ringCol = useDerivedValue(() => {
    const lock = st.lockGlow.value > 0.3;
    const t = lock ? 1 : Math.max(0, 1 - Math.abs(st.needle.value) / 3);
    return mixCol(t, st.heard.value > 0.5 || lock ? 0.95 : 0.16);
  });
  const ringGlowOp = useDerivedValue(() => (st.lockGlow.value > 0.3 ? 0.5 : 0));

  // ---- the pitch trace, sampled on the UI thread ------------------------------------------------------
  const trace = useSharedValue<number[]>([]); // flat: t, cents (NaN = silence)
  const lastSample = useSharedValue(0);
  const ys = TRACE.span / TRACE.cents;
  useFrameCallback(() => {
    'worklet';
    if (st.tuner.value < 0.5) {
      if (trace.value.length) trace.value = [];
      return;
    }
    const now = clock.now.value;
    if (now - lastSample.value < 0.025) return;
    lastSample.value = now;
    const heard = st.heard.value > 0.5 || st.lockGlow.value > 0.3;
    const next = trace.value.slice();
    next.push(now, heard ? st.needle.value : NaN);
    let cut = 0;
    while (cut < next.length && now - next[cut] > TRACE.seconds + 0.2) cut += 2;
    trace.value = cut ? next.slice(cut) : next;
  });
  const tracePath = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const T = trace.value;
    const now = clock.now.value;
    const Wd = TRACE.x1 - TRACE.x0;
    let started = false;
    for (let i = 0; i < T.length; i += 2) {
      const cv = T[i + 1];
      if (cv !== cv) {
        started = false;
        continue;
      }
      const x = TRACE.x0 + Wd * (1 - (now - T[i]) / TRACE.seconds);
      if (x < TRACE.x0) continue;
      const y = TRACE.y - Math.max(-TRACE.cents, Math.min(TRACE.cents, cv)) * ys;
      if (started) p.lineTo(x, y);
      else p.moveTo(x, y);
      started = true;
    }
    return p;
  });
  const traceCol = useDerivedValue(() => {
    const lock = st.lockGlow.value > 0.3;
    const t = lock ? 1 : Math.max(0, 1 - Math.abs(st.needle.value) / 8);
    return mixCol(t, 1);
  });
  const headY = useDerivedValue(() => TRACE.y - Math.max(-TRACE.cents, Math.min(TRACE.cents, st.needle.value)) * ys);
  const headOp = useDerivedValue(() => (st.heard.value > 0.5 || st.lockGlow.value > 0.3 ? 1 : 0));
  const clipDisc = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(C, C, W.kin - 2);
    return p;
  }, []);

  // ---- the words ---------------------------------------------------------------------------------------
  const live = reading.heard || reading.locked;
  const acc = reading.note.length > 1 ? reading.note.slice(1) : '';
  const letter = reading.note.slice(0, 1);
  const letterW = noteF ? noteF.getTextWidth(letter) : 0;
  const accW = accF && acc ? accF.getTextWidth(acc) : 0;
  const octW = octF ? octF.getTextWidth(reading.octave) : 0;
  const total = letterW + (acc ? accW + 6 : 0) + octW + 10;
  const nx = C - total / 2;
  const noteY = C - 48;
  const absC = Math.abs(reading.cents);
  const line = reading.locked ? 'IN TUNE' : absC < 0.5 ? 'IN TUNE' : `${absC.toFixed(0)} ¢ ${reading.cents < 0 ? 'FLAT' : 'SHARP'}`;
  const lineW = lineF ? lineF.getTextWidth(line) + 4 * Math.max(0, line.length - 1) : 0;
  const ink = reading.locked ? '#c9ffd9' : absC <= 5 ? '#ffeec8' : '#ffd394';
  const idleW = idleF ? idleF.getTextWidth(reading.hint) + 5 * Math.max(0, reading.hint.length - 1) : 0;

  const tracked = (font: ReturnType<typeof useFont>, text: string, x: number, y: number, track: number, color: string) => {
    if (!font) return null;
    let cx = x;
    const out: { ch: string; x: number }[] = [];
    for (const ch of text) {
      out.push({ ch, x: cx });
      cx += font.getTextWidth(ch) + track;
    }
    return out.map((g, i) => <SkText key={i} x={g.x} y={y} text={g.ch} font={font} color={color} />);
  };

  return (
    <View pointerEvents="none" style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
      <GlassCanvas k={k} box={box}>
        <GlassUnder />
        <Group clip={clipDisc}>
          {/* the strobe ring */}
          <Group transform={ringT}>
            <Group blendMode="plus" opacity={ringGlowOp}>
              <Path path={segPath} style="stroke" strokeWidth={R_OUT - R_IN} strokeCap="butt" color={ringCol}>
                <BlurMask blur={14} style="normal" />
              </Path>
            </Group>
            <Path path={segPath} style="stroke" strokeWidth={R_OUT - R_IN} strokeCap="butt" color={ringCol} />
          </Group>
          {/* the in-tune band and the centre line */}
          <Rect x={TRACE.x0} y={TRACE.y - 5 * ys} width={TRACE.x1 - TRACE.x0} height={10 * ys} color="rgba(120,255,170,0.13)" />
          <Rect x={TRACE.x0} y={TRACE.y - 1} width={TRACE.x1 - TRACE.x0} height={2} color="rgba(255,225,180,0.35)" />
          <Rect x={TRACE.x0} y={TRACE.y - TRACE.span - 1} width={TRACE.x1 - TRACE.x0} height={1} color="rgba(255,225,180,0.1)" />
          <Rect x={TRACE.x0} y={TRACE.y + TRACE.span} width={TRACE.x1 - TRACE.x0} height={1} color="rgba(255,225,180,0.1)" />
          {/* the trace */}
          <Group blendMode="plus">
            <Path path={tracePath} style="stroke" strokeWidth={16} strokeJoin="round" strokeCap="round" color={traceCol} opacity={0.35}>
              <BlurMask blur={10} style="normal" />
            </Path>
          </Group>
          <Path path={tracePath} style="stroke" strokeWidth={6} strokeJoin="round" strokeCap="round">
            <LinearGradient start={vec(TRACE.x0, 0)} end={vec(TRACE.x1, 0)} colors={['rgba(255,220,170,0)', 'rgba(255,230,190,0.6)', 'rgba(255,245,230,1)']} positions={[0, 0.45, 1]} />
          </Path>
          <Group opacity={headOp}>
            <Circle cx={TRACE.x1} cy={headY} r={14} color={traceCol} opacity={0.5}>
              <BlurMask blur={10} style="normal" />
            </Circle>
            <Circle cx={TRACE.x1} cy={headY} r={6} color="#fffaf0" />
          </Group>
          {/* the note */}
          {live ? (
            <>
              <Group blendMode="plus">
                {noteF ? (
                  <SkText x={nx} y={noteY} text={letter} font={noteF} color={reading.locked ? 'rgba(80,255,140,0.45)' : 'rgba(255,150,50,0.35)'}>
                    <BlurMask blur={22} style="normal" />
                  </SkText>
                ) : null}
              </Group>
              {noteF ? <SkText x={nx} y={noteY} text={letter} font={noteF} color={ink} /> : null}
              {accF && acc ? <SkText x={nx + letterW + 6} y={noteY - 98} text={acc} font={accF} color={ink} /> : null}
              {octF ? <SkText x={nx + letterW + (acc ? accW + 6 : 0) + 10} y={noteY} text={reading.octave} font={octF} color={ink} /> : null}
              {tracked(lineF, line, C - lineW / 2, C + 218, 4, reading.locked ? '#9dffbe' : absC <= 5 ? '#ffe0a0' : '#ffb26a')}
            </>
          ) : (
            <>
              {noteF ? <SkText x={C - noteF.getTextWidth('—') / 2} y={noteY} text="—" font={noteF} color="rgba(255,211,148,0.3)" /> : null}
              {tracked(idleF, reading.hint, C - idleW / 2, C + 218, 5, 'rgba(236,190,120,0.9)')}
            </>
          )}
        </Group>
        <GlassOver />
        <Seat />
      </GlassCanvas>
    </View>
  );
}

function GlassCanvas({ k, box, children }: { k: number; box: { w: number; h: number }; children: ReactNode }) {
  return (
    <Canvas style={{ width: box.w, height: box.h }}>
      <Group transform={[{ scale: k }]}>{children}</Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({ box: { position: 'absolute' } });

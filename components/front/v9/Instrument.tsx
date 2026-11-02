/**
 * The front instrument, drawn in one Skia canvas: the v9 faceplate, the live dial hardware (knurl,
 * gauge, glass, sheen), the beat lamps and key lights cross-faded from the art's own lit state, and the
 * pressed-key travel. Everything per-frame runs on the UI thread from the audio-locked beat clock.
 */
import { BlurMask, Canvas, Circle, Fill, Group, Image as SkImage, ImageShader, LinearGradient, Path, RadialGradient, Rect, Shader, Skia, rect, rrect, useImage, vec } from '@shopify/react-native-skia';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SensorType, useAnimatedSensor, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { DIAL_SKSL } from '@/components/front/v9/dialShader';
import type { BeatClock } from '@/lib/front-clock';
import { gaugeAngle } from '@/lib/front-geometry';
import { CAPS9, DIAL_C, GA, KNURL, KNURL_C, KNURL_LIGHT, LAMPS9, SPRITES, SPRITE_PART, skSrc, type Ns9 } from '@/lib/ns9';
import { NS9 } from '@/lib/ns9-layout';

const effect = Skia.RuntimeEffect.Make(DIAL_SKSL);
const PAUSE_CAP = require('../../../assets/north-star-face/v9/cap-pause.png');

export type KeyId = keyof typeof CAPS9;
export type InstrumentState = {
  /** Knurl angle, radians (follows the finger, springs onto detents). */
  turn: SharedValue<number>;
  bpm: SharedValue<number>;
  playing: SharedValue<number>;
  /** Accent level of each lamp's lead beat (3 accent … 0 off), -1 for an unused lamp. */
  lampLv: SharedValue<number[]>;
  /** Lamp index the most recent beat belongs to, -1 for none. */
  lampHit: SharedValue<number>;
  /** Per-lamp preview flashes (timestamp, seconds). */
  lampPreviewAt: SharedValue<number[]>;
  pressed: SharedValue<string>;
  /** 0 up … 1 fully down: the travel of the pressed key, animated in and out. */
  pressDepth: SharedValue<number>;
  /** Key lights: tapAt (clock s), meter / set lit (0/1), loop: 0 none 1 count-in 2 rec 3 play 4 stopped 5 pending, silent bar (0/1). */
  keys: SharedValue<{ tapAt: number; meter: number; set: number; loop: number; silent: number; loopP0?: number; loopStep?: number; beats?: number }>;
  /** Tuner: 0 off / 1 on; needle in cents; in-tune glow 0..1; flash time of the last lock (s). */
  tuner: SharedValue<number>;
  needle: SharedValue<number>;
  heard: SharedValue<number>;
  lockGlow: SharedValue<number>;
  lockAt: SharedValue<number>;
  /** Accent pips under each lamp (0..3), -1 to hide. */
  pips: SharedValue<number[]>;
};

export function useInstrumentState(): InstrumentState {
  return {
    turn: useSharedValue(0),
    bpm: useSharedValue(120),
    playing: useSharedValue(0),
    lampLv: useSharedValue([3, 2, 2, 2]),
    lampHit: useSharedValue(-1),
    lampPreviewAt: useSharedValue([-9, -9, -9, -9]),
    pressed: useSharedValue(''),
    pressDepth: useSharedValue(0),
    keys: useSharedValue({ tapAt: -9, meter: 0, set: 0, loop: 0, silent: 0 }),
    tuner: useSharedValue(0),
    needle: useSharedValue(0),
    heard: useSharedValue(0),
    lockGlow: useSharedValue(0),
    lockAt: useSharedValue(-9),
    pips: useSharedValue([3, 2, 2, 2]),
  };
}

function lensGlint(x: number, y: number, r: number) {
  const p = Skia.Path.Make();
  p.addArc(Skia.XYWHRect(x - r, y - r, r * 2, r * 2), 196, 58);
  return p;
}

const tAngle = (c: number) => {
  'worklet';
  return Math.sign(c) * 120 * Math.pow(Math.min(50, Math.abs(c)) / 50, 0.62);
};

export function Instrument({
  ns,
  width,
  height,
  clock,
  st,
  knurl = true,
  under,
  over,
}: {
  ns: Ns9;
  width: number;
  height: number;
  clock: BeatClock;
  st: InstrumentState;
  /** False when a window face covers the dial: the knurl and the readout glass are not drawn. */
  knurl?: boolean;
  /** Drawn right over the faceplate (Pulse bends the plate itself). */
  under?: ReactNode;
  /** Drawn over the lights (the glass readout). */
  over?: ReactNode;
}) {
  const face = useImage(skSrc(ns.face));
  const spec = useImage(skSrc(ns.spec));
  const light = useImage(skSrc(KNURL_LIGHT));
  const pauseCap = useImage(skSrc(PAUSE_CAP));
  const sprites = {
    'led-tuner': useImage(skSrc(SPRITES['led-tuner'])), 'led-tuner-green': useImage(skSrc(SPRITES['led-tuner-green'])), 'led-sound': useImage(skSrc(SPRITES['led-sound'])),
    'led-loop': useImage(skSrc(SPRITES['led-loop'])), 'led-loop-red': useImage(skSrc(SPRITES['led-loop-red'])), 'led-loop-orange': useImage(skSrc(SPRITES['led-loop-orange'])),
    'led-tap': useImage(skSrc(SPRITES['led-tap'])), 'led-play': useImage(skSrc(SPRITES['led-play'])), 'led-meter': useImage(skSrc(SPRITES['led-meter'])), 'led-set': useImage(skSrc(SPRITES['led-set'])),
    'lamp-0': useImage(skSrc(SPRITES['lamp-0'])), 'lamp-1': useImage(skSrc(SPRITES['lamp-1'])), 'lamp-2': useImage(skSrc(SPRITES['lamp-2'])), 'lamp-3': useImage(skSrc(SPRITES['lamp-3'])),
  } as Record<string, ReturnType<typeof useImage>>;

  // ---- per-frame: gauge cells, tilt ----------------------------------------------------------------
  const cells = useSharedValue<number[]>(Array(60).fill(0));
  const hues = useSharedValue<number[]>(Array(60).fill(0));
  const tilt = useSharedValue([-0.25, -0.32]);
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 16 });
  const lastT = useSharedValue(0);
  useFrameCallback((f) => {
    'worklet';
    const now = f.timestamp / 1000;
    const dt = lastT.value > 0 ? Math.min(0.05, now - lastT.value) : 0.016;
    lastT.value = now;
    // tilt: the phone's own gravity vector moves the studio light across the metal
    const g = gravity.sensor.value;
    const gl = Math.hypot(g.x, g.y, g.z) || 1;
    const tx = Math.max(-1, Math.min(1, (g.x / gl) * 1.6)) * 0.5 - 0.1;
    const ty = Math.max(-1, Math.min(1, (-g.y / gl - 0.6) * 1.4)) * 0.5 - 0.2;
    const fk = 1 - Math.exp(-dt / 0.2);
    const tl = tilt.value;
    tilt.value = [tl[0] + (tx - tl[0]) * fk, tl[1] + (ty - tl[1]) * fk];
    // gauge
    const c = cells.value.slice();
    const h = hues.value.slice();
    if (st.tuner.value > 0.5) {
      const an = tAngle(st.needle.value), fl = now - st.lockAt.value, lock = st.lockGlow.value > 0.3;
      for (let i = 0; i < 60; i++) {
        const a = GA[i];
        let lv = 0;
        let hue = lock ? 1 : Math.max(0, 1 - Math.abs(st.needle.value) / 6);
        if (st.heard.value > 0.5 || lock) {
          const dd = a - an; lv = 2.1 * Math.exp(-(dd * dd) / (2 * 4.2 * 4.2));
          if (Math.sign(a) === Math.sign(an) && Math.abs(a) <= Math.abs(an)) lv = Math.max(lv, 0.22);
        }
        if (Math.abs(a) === 4) lv = Math.max(lv, lock ? 0.9 : 0.16);
        if (lock) { const wave = fl - Math.abs(a) * 0.004; if (wave > 0) lv = Math.max(lv, Math.exp(-wave / 0.38) * 0.95 + 0.12); hue = 1; }
        const tc = lv > c[i] ? 0.02 : 0.08;
        c[i] += (lv - c[i]) * (1 - Math.exp(-dt / tc));
        h[i] += (hue - h[i]) * Math.min(1, dt * 10);
      }
    } else {
      const ga = gaugeAngle(st.bpm.value);
      const env = clock.pos.value >= 0 ? Math.exp(-Math.max(0, now - clock.lastBeatAt.value) / 0.1) : 0;
      for (let i = 0; i < 60; i++) {
        const a = GA[i];
        let tgt = 0;
        if (a <= ga + 0.01) {
          const head = ga - a < 4.01;
          tgt = (head ? 1.0 : 0.62 + (0.3 * (a + 120)) / Math.max(1, ga + 120)) * (st.playing.value > 0.5 ? 0.82 + 0.18 * env : 1);
        }
        const tc = tgt > c[i] ? 0.022 : 0.09;
        c[i] += (tgt - c[i]) * (1 - Math.exp(-dt / tc));
        h[i] += (0 - h[i]) * Math.min(1, dt * 8);
      }
    }
    cells.value = c;
    hues.value = h;
  });

  const P = ns.parts.dial;
  const fit = width / NS9.devices[ns.tag as keyof typeof NS9.devices].w;
  const uniforms = useDerivedValue(() => ({
    turn: st.turn.value,
    r0: KNURL.r0, r1: KNURL.r1, k: ns.k, ps: P.s,
    pdst: [P.dx + ns.ox / ns.k, P.dy + ns.oy / ns.k], psrc: [P.sx, P.sy],
    kc: [KNURL_C.x, KNURL_C.y], dialc: [DIAL_C.x, DIAL_C.y], view: [width, height], specScale: 1.5 / fit,
    tiltx: tilt.value[0], tilty: tilt.value[1], lockGlow: st.lockGlow.value,
    lockFlash: st.lockGlow.value > 0.3 ? Math.exp(-Math.max(0, clock.now.value - st.lockAt.value) / 0.5) : 0, knurlOn: knurl ? 1 : 0,
    cells: cells.value, hues: hues.value,
  }));

  // ---- lamps and key lights ------------------------------------------------------------------------
  const spriteRect = (name: string) => {
    const [x, y, w, h] = NS9.sprites[name as keyof typeof NS9.sprites] as unknown as number[];
    const part = SPRITE_PART(name), o = ns.T(part, x, y), s = ns.sc(part);
    return { x: o.x, y: o.y, width: w * s, height: h * s };
  };
  const lampOp = [0, 1, 2, 3].map((i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const lv = st.lampLv.value[i] ?? -1;
      if (lv < 0 || st.tuner.value > 0.5) return 0;
      const playing = st.playing.value > 0.5;
      let e = 0;
      if (playing && !st.keys.value.silent && st.lampHit.value === i && clock.pos.value >= 0) e = Math.exp(-Math.max(0, clock.now.value - clock.lastBeatAt.value) / 0.12) * [0, 0.42, 0.78, 1][lv];
      const pv = Math.max(0, 1 - (clock.now.value - (st.lampPreviewAt.value[i] ?? -9)) / 1.3) * [0.25, 0.5, 0.8, 1][lv];
      const rest = playing ? [0, 0.04, 0.08, 0.14][lv] : [0, 0.1, 0.22, 0.42][lv];
      return Math.min(1, Math.max(rest + e * (1 - rest), pv));
    })
  );
  const ledNames = ['led-play', 'led-sound', 'led-tap', 'led-meter', 'led-set', 'led-tuner', 'led-tuner-green', 'led-loop', 'led-loop-red', 'led-loop-orange'];
  const ledLevels = useDerivedValue(() => {
    const now = clock.now.value, K = st.keys.value, tun = st.tuner.value > 0.5, lock = st.lockGlow.value > 0.3;
    const live = st.playing.value > 0.5 && clock.pos.value >= 0;
    const env = live ? Math.exp(-Math.max(0, now - clock.lastBeatAt.value) / 0.1) : 0;
    const down = live && Math.floor(clock.barPos.value + 0.02) === 0 ? 1 : 0;
    const blink = Math.floor(now * 3.3) % 2 === 0 ? 1 : 0.15;
    // ON AIR: a steady one-second blink, on for most of it
    const onAir = now % 1 < 0.62 ? 1 : 0.08;
    const out: Record<string, number> = {
      'led-play': tun ? 0 : st.playing.value > 0.5 ? 0.6 + 0.4 * env * down : 0,
      'led-sound': 0,
      'led-tap': Math.exp(-Math.max(0, now - K.tapAt) / 0.14),
      'led-meter': K.meter ? 0.9 : 0,
      'led-set': K.set ? 0.9 : 0,
      'led-tuner': tun && !lock ? 1 : 0,
      'led-tuner-green': tun && lock ? 1 : 0,
      'led-loop': K.loop === 3 || K.loop === 6 ? 1 : K.loop === 4 ? 0.45 : 0,
      'led-loop-red': K.loop === 1 || K.loop === 2 || K.loop === 5 ? onAir : 0,
      'led-loop-orange': 0,
    };
    return out;
  });
  const ledOp = Object.fromEntries(
    ledNames.map((n) => [
      n,
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useDerivedValue(() => Math.max(0, Math.min(1, ledLevels.value[n] ?? 0))),
    ])
  );

  // accent pips: three tiny lights under each lamp
  const pipDots = useMemo(() => LAMPS9.map(([, , dx, dy]) => [-1, 0, 1].map((kk) => ns.T('bay', dx + 12 + kk * 21, dy + 12))), [ns]);
  const pipOps = pipDots.map((row, i) =>
    row.map((_, kk) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useDerivedValue(() => (st.tuner.value < 0.5 && (st.pips.value[i] ?? -1) > kk ? 1 : 0))
    )
  );

  // ---- pressed keys: the cap drops into its pocket ------------------------------------------------------
  const keyRects = useMemo(() => Object.fromEntries((Object.keys(CAPS9) as KeyId[]).map((id) => [id, ns.capRect(id)])), [ns]);
  const pClip = useDerivedValue(() => {
    const r = keyRects[st.pressed.value as KeyId];
    if (!r) return rrect(rect(-10, -10, 1, 1), 0, 0);
    const rad = CAPS9[st.pressed.value as KeyId].round ? r.w / 2 : r.r;
    return rrect(rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2), rad, rad);
  });
  const pOn = useDerivedValue(() => (keyRects[st.pressed.value as KeyId] ? 1 : 0));
  // the cap drops 3.6 pt and shrinks a hair as it sinks into its pocket, away from the light
  const pTravel = useDerivedValue(() => {
    const r = keyRects[st.pressed.value as KeyId];
    const d = st.pressDepth.value;
    if (!r) return [{ translateY: 0 }];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, k = 1 - 0.018 * d;
    return [{ translateX: cx }, { translateY: cy + 3.6 * d }, { scale: k }, { translateX: -cx }, { translateY: -cy }];
  });
  const pDark = useDerivedValue(() => 0.34 * st.pressDepth.value);
  const pTop = useDerivedValue(() => (keyRects[st.pressed.value as KeyId]?.y ?? -20));
  const pShadeRect = useDerivedValue(() => { const r = keyRects[st.pressed.value as KeyId]; return r ? rect(r.x, r.y, r.w, 15) : rect(-10, -10, 1, 1); });
  const pGrad0 = useDerivedValue(() => vec(0, pTop.value));
  const pGrad1 = useDerivedValue(() => vec(0, pTop.value + 15));

  // the play key shows pause while the click runs (the cap art with its glyph swapped)
  const playR = keyRects.play;
  // recording: the whole LOOP key glows red (blinking through the count-in)
  const loopR = keyRects.loop;
  // the LOOP key wears its state: amber blinking through the count-in, red while recording, green while
  // the take plays (with a bar of light filling across the cap through each cycle), dim amber when a take
  // is ready
  // the LOOP key's light: red, blinking like an ON AIR sign while recording; steady white while the loop
  // plays; dark otherwise
  const loopGlow = useDerivedValue(() => {
    const L = st.keys.value.loop;
    const t = clock.now.value;
    if (L === 1 || L === 2 || L === 5) return t % 1 < 0.62 ? 1 : 0.06;
    if (L === 3 || L === 6) return 0.8;
    if (L === 4) return 0.42;   // a loop is stored, stopped: a low amber
    return 0;
  });
  const loopCol = useDerivedValue(() => {
    const L = st.keys.value.loop;
    return L === 3 || L === 6 ? 'rgba(255,246,228,0.5)' : L === 4 ? 'rgba(255,160,40,0.5)' : 'rgba(255,36,18,0.62)';
  });
  const pauseOp = useDerivedValue(() => (st.playing.value > 0.5 ? 1 : 0));

  if (!face || !effect) return null;
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      <SkImage image={face} x={ns.ox} y={ns.oy} width={ns.w} height={ns.h} fit="fill" />
      {under}
      {pauseCap ? <SkImage image={pauseCap} x={playR.x} y={playR.y} width={playR.w} height={playR.h} fit="fill" opacity={pauseOp} /> : null}
      <Group clip={pClip} opacity={pOn}>
        <Fill color="#070605" />
        <Group transform={pTravel}>
          <SkImage image={face} x={ns.ox} y={ns.oy} width={ns.w} height={ns.h} fit="fill" />
          {pauseCap ? <SkImage image={pauseCap} x={playR.x} y={playR.y} width={playR.w} height={playR.h} fit="fill" opacity={pauseOp} /> : null}
        </Group>
        <Fill color="black" opacity={pDark} />
        <Rect rect={pShadeRect}>
          <LinearGradient start={pGrad0} end={pGrad1} colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0)']} />
        </Rect>
      </Group>
      {light && spec ? (
        <Fill>
          <Shader source={effect} uniforms={uniforms}>
            <ImageShader image={light} tx="repeat" ty="clamp" />
            <ImageShader image={spec} tx="clamp" ty="clamp" />
          </Shader>
        </Fill>
      ) : null}
      {[0, 1, 2, 3].map((i) => {
        const img = sprites[`lamp-${i}`];
        const [lx, ly] = LAMPS9[i];
        const c = ns.T('bay', lx + 70, ly + 70);
        const bs = ns.sc('bay');
        return (
          <Group key={`l${i}`}>
            {img ? <SkImage image={img} {...spriteRect(`lamp-${i}`)} fit="fill" opacity={lampOp[i]} /> : null}
            {/* the lens fills with light, the bulb burns white at its heart, and it spills onto the bezel */}
            <Group opacity={lampOp[i]} blendMode="plus">
              <Circle cx={c.x} cy={c.y} r={80 * bs} color="rgba(255,120,30,0.22)">
                <BlurMask blur={24 * bs} style="normal" />
              </Circle>
              <Circle cx={c.x} cy={c.y} r={46 * bs}>
                <RadialGradient c={vec(c.x, c.y)} r={46 * bs} colors={['rgba(255,240,205,0.95)', 'rgba(255,170,70,0.55)', 'rgba(255,110,20,0.2)', 'rgba(255,90,10,0)']} positions={[0, 0.3, 0.72, 1]} />
              </Circle>
            </Group>
            {/* the dome catches the studio light, lit or not */}
            <Path path={lensGlint(c.x, c.y, 38 * bs)} style="stroke" strokeWidth={2.6 * bs} strokeCap="round" color="rgba(255,248,236,0.2)" />
            <Circle cx={c.x - 17 * bs} cy={c.y - 19 * bs} r={3.6 * bs} color="rgba(255,255,255,0.55)">
              <BlurMask blur={1.6 * bs} style="normal" />
            </Circle>
          </Group>
        );
      })}
      {ledNames.map((n) => {
        const img = sprites[n];
        const base = n === 'led-tuner-green' ? 'led-tuner' : n.startsWith('led-loop') ? 'led-loop' : n;
        return img ? <SkImage key={n} image={img} {...spriteRect(base)} fit="fill" opacity={ledOp[n]} /> : null;
      })}
      {pipDots.map((row, i) =>
        row.map((p, kk) => (
          <Group key={`p${i}${kk}`} opacity={pipOps[i][kk]} blendMode="plus">
            <Circle cx={p.x} cy={p.y} r={ns.k * 9} color="rgba(255,120,30,0.55)">
              <BlurMask blur={ns.k * 6} style="normal" />
            </Circle>
            <Circle cx={p.x} cy={p.y} r={ns.k * 3.4} color="#ffd38a" />
          </Group>
        ))
      )}
      <Group opacity={loopGlow} blendMode="plus">
        <Rect x={loopR.x + 4} y={loopR.y + 4} width={loopR.w - 8} height={loopR.h - 8} color={loopCol}>
          <BlurMask blur={10} style="normal" />
        </Rect>
        <Rect x={loopR.x + 10} y={loopR.y + 10} width={loopR.w - 20} height={loopR.h - 20} color={loopCol} opacity={0.45} />
      </Group>
      {over}
    </Canvas>
  );
}

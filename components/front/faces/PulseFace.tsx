/**
 * Pulse: live current in a black window. A small knot of plasma crackles at the centre; every beat it
 * discharges — flares white-hot, throws bolts — and a ring of current tears outward across the glass,
 * jagged like an arc, never a perfect circle, fading as it goes. The accent of the beat sets how hard
 * it strikes and the downbeat burns in its own colour. Drawn per pixel on the GPU from the audio-locked
 * clock, so the strike lands exactly as the click is heard.
 */
import { Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useAnimatedReaction, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { BeatClock } from '@/lib/front-clock';
import { DIAL_CENTER, type FrontFrame } from '@/lib/front-geometry';
import { rgbOf, type BeatLight } from '@/lib/front-light';

const NW = 6;
const SKSL = `
uniform float2 uC;
uniform float uS;
uniform float uT;
uniform float uAge;
uniform float uPk;
uniform float uLive;
uniform float uSeed;
uniform float3 uCol;
uniform float3 uRest;
uniform float waves[${NW * 2}];
uniform float wcol[${NW * 3}];

const float TAU = 6.2831853;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float noise(float2 p) {
  float2 i = floor(p); float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + float2(1.0, 0.0)), c = hash(i + float2(0.0, 1.0)), d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}
float fbm(float2 p) {
  float v = 0.0; float a = 0.55;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + float2(13.1, 7.7); a *= 0.5; }
  return v;
}

half4 main(float2 px) {
  float2 d = (px - uC) / uS;
  float r = length(d);
  float W = 287.0;
  if (r > W + 2.0) { return half4(0.0); }
  float th = atan(d.y, d.x);
  float2 dir = float2(cos(th), sin(th));
  float strike = exp(-uAge / 0.14) * uPk;
  float hum = 0.5 + 0.5 * exp(-uAge / 0.8) * uLive;
  float3 col = float3(0.0);

  // ---- the core: a small knot of live current at the centre --------------------------------------
  float R0 = 104.0 + 12.0 * strike;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float2 q = dir * (1.6 + fk * 0.6) + float2(uT * (1.3 + fk * 0.4), -uT * (0.9 + fk * 0.3) + fk * 5.0);
    float amp = 9.0 + 16.0 * strike + fk * 3.0;
    float rr = R0 + fbm(q) * amp;
    float dist = abs(r - rr);
    float w = 1.0 + 0.8 * strike;
    float core = exp(-dist * dist / (w * w));
    float glow = exp(-dist / (7.0 + 10.0 * strike));
    float flick = 0.7 + 0.3 * noise(float2(th * 9.0 + fk * 3.0, uT * 16.0));
    float lv = (k == 0 ? 1.0 : 0.55) * flick * hum;
    col += mix(uCol, float3(1.0), 0.5 + 0.4 * strike) * core * lv * (1.0 + 1.6 * strike);
    col += uCol * glow * lv * (0.35 + 0.7 * strike);
  }
  // the hot centre breathes with the beat
  col += uCol * exp(-r / (40.0 + 20.0 * strike)) * (0.04 + 0.25 * strike);

  // ---- waves of current thrown outward, one per beat --------------------------------------------
  for (int i = 0; i < ${NW}; i++) {
    float age = waves[i * 2];
    float pk = waves[i * 2 + 1];
    if (pk > 0.0 && age >= 0.0 && age < 1.6) {
      float3 wc = float3(wcol[i * 3], wcol[i * 3 + 1], wcol[i * 3 + 2]);
      float u = age / 1.6;
      float rw = R0 + 4.0 + age * (150.0 + 50.0 * pk) - age * age * 20.0;
      // never a perfect circle: the front jitters like an arc discharge
      float2 q = dir * 3.0 + float2(age * 7.0 + float(i) * 11.0, uT * 2.0);
      float jag = fbm(q) * (5.0 + 10.0 * u) + noise(float2(th * 40.0, age * 30.0 + float(i))) * 1.8;
      float dist = abs(r - (rw + jag));
      float fade = pow(1.0 - u, 1.6) * pk;
      float w = 1.2 + 3.0 * u;
      float front = exp(-dist * dist / (w * w));
      float halo = exp(-dist / (10.0 + 18.0 * u));
      // filaments: brighter segments crawling along the front
      float fil = smoothstep(0.15, 0.7, noise(float2(th * 7.0 + float(i) * 3.1, uT * 5.0 + age * 4.0)));
      col += mix(wc, float3(1.0), 0.55) * front * fade * (0.55 + 1.1 * fil);
      col += wc * halo * fade * 0.32;
      // the trailing wake: a faint glow behind the front
      col += wc * smoothstep(rw, rw - 70.0, r) * smoothstep(R0, R0 + 30.0, r) * fade * 0.05;
    }
  }

  // ---- a few bolts jump from the core on the strike ----------------------------------------------
  if (strike > 0.02) {
    for (int b = 0; b < 5; b++) {
      float fb = float(b);
      float a = hash(float2(uSeed, fb)) * TAU;
      float len = (30.0 + 50.0 * hash(float2(fb, uSeed + 3.0))) * (0.6 + 0.6 * uPk);
      if (r > R0 - 4.0 && r < R0 + len) {
        float off = noise(float2(r * 0.07, uSeed * 7.0 + fb)) * 0.16 + noise(float2(r * 0.23, fb + uSeed)) * 0.05;
        float da = th - a - off;
        da = da - TAU * floor((da + 3.14159265) / TAU);
        float dd = abs(da) * r;
        float fade = 1.0 - (r - R0) / len;
        col += mix(uCol, float3(1.0), 0.8) * exp(-dd * dd / 1.2) * fade * strike * 1.5;
      }
    }
  }
  col += uRest * 0.012 * (1.0 - smoothstep(0.0, W, r));
  float edge = smoothstep(W - 22.0, W, r);
  col *= 1.0 - 0.85 * edge;
  float3 c3 = float3(0.006, 0.005, 0.005) + col;
  c3 = c3 / (1.0 + max(c3 - 0.9, 0.0) * 0.8);
  float a = 1.0 - smoothstep(W, W + 2.0, r);
  return half4(half3(c3 * a), half(a));
}`;
const effect = Skia.RuntimeEffect.Make(SKSL);

export function PulseFace({
  frame,
  clock,
  light,
  accents,
  beatIndex,
  beatCount,
  demo,
}: {
  frame: FrontFrame;
  plateRect?: { x: number; y: number; width: number; height: number };
  plateSource?: number;
  clock: BeatClock;
  bpm?: number;
  light: BeatLight;
  accents: SharedValue<number[]>;
  beatIndex: SharedValue<number>;
  beatCount: SharedValue<number>;
  beatHost?: SharedValue<number>;
  beatLatency?: SharedValue<number>;
  /** Bumped to fire one sample strike (choosing a colour while stopped). */
  demo: number;
}) {
  const c = frame.point(DIAL_CENTER.x, DIAL_CENTER.y);
  const lightSv = useSharedValue(light);
  useEffect(() => {
    lightSv.value = light;
  }, [light, lightSv]);
  const demoAt = useSharedValue(-9);
  useEffect(() => {
    if (demo > 0) demoAt.value = clock.now.value;
  }, [demo, demoAt, clock]);

  // the waves in flight: the heard time, strength and colour of the last few beats
  const wavesSv = useSharedValue<number[]>([]); // flat: t, pk, r, g, b
  useAnimatedReaction(
    () => beatCount.value,
    (n, prev) => {
      if (prev == null || n === prev || clock.pos.value < 0) return;
      const b = beatIndex.value;
      const lv = accents.value[b] ?? 2;
      if (lv <= 0) return;
      const l = lightSv.value;
      const c3 = rgbOf(b === 0 ? l.down : l.up, n);
      const next = wavesSv.value.slice(-(NW - 1) * 5);
      next.push(clock.lastBeatAt.value, lv >= 3 ? 1 : lv === 2 ? 0.72 : 0.42, c3[0], c3[1], c3[2]);
      wavesSv.value = next;
    }
  );
  useEffect(() => {
    if (demo <= 0) return;
    const l = light;
    const c3 = rgbOf(l.down, demo);
    const next = wavesSv.value.slice(-(NW - 1) * 5);
    next.push(clock.now.value, 1, c3[0], c3[1], c3[2]);
    wavesSv.value = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);
  const uniforms = useDerivedValue(() => {
    const t = clock.now.value;
    const live = clock.pos.value >= 0;
    const l = lightSv.value;
    let age = 9;
    let pk = 0;
    let down = false;
    if (live) {
      age = Math.max(0, t - clock.lastBeatAt.value);
      const b = beatIndex.value;
      const lv = accents.value[b] ?? 2;
      pk = lv >= 3 ? 1 : lv === 2 ? 0.72 : lv === 1 ? 0.4 : 0;
      down = b === 0;
    }
    const dA = t - demoAt.value;
    if (dA >= 0 && dA < age) {
      age = dA;
      pk = 1;
      down = true;
    }
    const col = rgbOf(down ? l.down : l.up, beatCount.value);
    const W = wavesSv.value;
    const n = Math.floor(W.length / 5);
    const wv: number[] = [];
    const wc: number[] = [];
    for (let i = 0; i < NW; i++) {
      const k = n - 1 - i;
      if (k >= 0) {
        wv.push(t - W[k * 5], W[k * 5 + 1]);
        wc.push(W[k * 5 + 2], W[k * 5 + 3], W[k * 5 + 4]);
      } else {
        wv.push(-1, 0);
        wc.push(0, 0, 0);
      }
    }
    return {
      uC: [c.x, c.y],
      uS: frame.s,
      uT: t % 1000,
      uAge: age,
      uPk: pk,
      uLive: live ? 1 : 0,
      uSeed: (beatCount.value % 97) + 1,
      uCol: col,
      uRest: rgbOf(l.up, 0),
      waves: wv,
      wcol: wc,
    };
  });

  if (!effect) return null;
  return (
    <Fill>
      <Shader source={effect} uniforms={uniforms} />
    </Fill>
  );
}

import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  RoundedRect,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import Animated, { runOnJS, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import type { TunerPhase } from '@/hooks/use-tuner';
import { tonearmPose, turntableGeometry } from '@/lib/face-geometry';
import { tunerPitchIsTrustworthy } from '@/lib/tuner-lock';
import type { TunerReading } from '@/lib/tuner-math';
import {
  clampTunerCents,
  pushTunerTrail,
  tunerDirection,
  TUNER_TRAIL_LIFE_MS,
  type TunerTrailSample,
} from '@/lib/tuner-trail';
import { tunerCue } from '@/lib/tuner-lock';

type Props = {
  size: number;
  reading: TunerReading | null;
  phase: TunerPhase;
  error?: string | null;
  buffers?: number;
  trailCents?: number[];
  /** Proof only. Holds scratch opacity so a still frame can show the trail. */
  holdTrail?: boolean;
  /** Proof only. Freezes the record at a rotation so motion can be compared. */
  spinDegrees?: number;
  /** Proof only. Absolute record angle of each trail sample, so a scratch can be shown riding the vinyl. */
  trailSpin?: number[];
};

const BRASS = '#C6A36A';
const BRASS_HOT = '#E7C98A';
const BONE = '#F4EFE4';
const TRACER = '#FF2430';

const VINYL_SKSL = `
uniform float2 center;
uniform float radius;
uniform float locked;
uniform float angle;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.56;
  v += a * noise(p);
  p = p * 2.05 + float2(1.7, 9.2);
  a *= 0.48;
  v += a * noise(p);
  p = p * 1.97 + float2(8.3, 2.8);
  a *= 0.48;
  v += a * noise(p);
  return v;
}

half4 main(float2 coord) {
  float2 raw = (coord - center) / radius;
  float r = length(raw);
  float rad = angle * 0.01745329251;
  float ca = cos(rad);
  float sa = sin(rad);
  float2 p = float2(ca * raw.x - sa * raw.y, sa * raw.x + ca * raw.y);
  float2 dir = p / max(r, 0.001);
  float2 petal = dir * (0.55 + r * 2.6);
  float2 bend = float2(fbm(petal + float2(2.2, 0.4)), fbm(petal + float2(7.1, 3.4)));
  float2 flow = petal + (bend - 0.5) * float2(1.55, 1.15);
  float pools = fbm(flow);
  float veins = fbm(flow * float2(1.35, 0.62) + float2(5.0, 1.7));
  float speck = noise(p * 28.0 + pools);
  float body = smoothstep(0.36, 0.58, pools);
  float streak = smoothstep(0.42, 0.7, veins * 0.72 + pools * 0.28);
  float core = smoothstep(0.66, 0.86, veins) * streak;
  float3 ink = float3(0.012, 0.028, 0.07);
  float3 cobalt = float3(0.02, 0.16, 0.58);
  float3 cyan = float3(0.05, 0.58, 0.96);
  float3 ice = float3(0.78, 0.94, 1.0);
  float3 col = mix(ink, cobalt, body * 0.92);
  col = mix(col, cyan, streak * 0.9);
  col = mix(col, ice, core * 0.5);
  col *= 0.94 + (speck - 0.5) * 0.06;
  float groove = sin((r * radius) * 1.55 + pools * 2.0);
  col *= 0.9 + groove * 0.1;
  col += float3(0.02, 0.14, 0.36) * exp(-r * 1.2) * 0.2;
  float rim = smoothstep(0.9, 0.985, r) * (1.0 - smoothstep(0.985, 1.012, r));
  col = mix(col, float3(0.45, 0.86, 1.0), rim * 0.7);
  col *= mix(1.06, 0.55, smoothstep(0.9, 1.02, r));
  float2 lamp = raw - float2(-0.22, -0.34);
  col += exp(-dot(lamp, lamp) * 11.0) * float3(0.55, 0.72, 0.9) * 0.42;
  float2 lamp2 = raw - float2(0.34, 0.28);
  col += exp(-dot(lamp2, lamp2) * 22.0) * 0.12;
  col += float3(0.18, 0.09, 0.02) * locked * (1.0 - smoothstep(0.18, 0.36, r)) * 0.22;
  float alpha = smoothstep(1.02, 0.992, r);
  return half4(half3(col), alpha);
}
`;

function vinylEffect() {
  if (!Skia.RuntimeEffect) return null;
  const effect = Skia.RuntimeEffect.Make(VINYL_SKSL);
  return effect;
}

type Groove = { r: number; light: number; dark: number };

function grooveField(discR: number, inner: number, outer: number): Groove[] {
  const count = 84;
  const grooves: Groove[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const wobble = Math.sin(i * 12.9898) * discR * 0.0011;
    const r = outer - (outer - inner) * t + wobble;
    const band = 0.5 + 0.5 * Math.sin(i * 1.71 + 0.35);
    grooves.push({
      r,
      light: 0.05 + band * 0.07,
      dark: 0.16 + (1 - band) * 0.16,
    });
  }
  return grooves;
}

function rimArc(cx: number, cy: number, r: number, start: number, sweep: number) {
  const path = Skia.Path.Make();
  path.addArc(Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), start, sweep);
  return path;
}

const LP_DEGREES_PER_SECOND = 24;
const TRACE_SLICES = 18;

type VinylMark = TunerTrailSample & { spin: number };

export function VinylTunerFace({ size, reading, phase, error, trailCents, holdTrail = false, spinDegrees, trailSpin }: Props) {
  const [trail, setTrail] = useState<VinylMark[]>(() =>
    (trailCents ?? []).map((cents, index, all) => {
      const age = (all.length - 1 - index) * 90;
      const spin = trailSpin?.[index] ?? (spinDegrees ?? 0) - (age / 1000) * LP_DEGREES_PER_SECOND;
      return { cents, at: Date.now() - age, spin };
    })
  );
  const live = Boolean(reading) && reading?.state !== 'listening' && phase !== 'denied' && phase !== 'error';
  const now = useSharedValue(Date.now());
  const spin = useSharedValue(spinDegrees ?? 0);
  const freezeSpin = useSharedValue(spinDegrees == null ? 0 : 1);
  const shown = useSharedValue(live && reading ? clampTunerCents(reading.cents) : -50);
  const liveCents = useSharedValue(reading ? reading.cents : 0);
  const tracking = useSharedValue(live ? 1 : 0);
  const [paintSpin, setPaintSpin] = useState(spinDegrees ?? 0);
  const lastPaint = useSharedValue(0);

  useEffect(() => {
    tracking.value = live ? 1 : 0;
    if (live && reading) liveCents.value = reading.cents;
  }, [live, liveCents, reading, tracking]);

  useEffect(() => {
    freezeSpin.value = spinDegrees == null ? 0 : 1;
    if (spinDegrees != null) {
      spin.value = spinDegrees;
      setPaintSpin(spinDegrees);
    }
  }, [freezeSpin, spin, spinDegrees]);

  useFrameCallback((frame) => {
    'worklet';
    now.value = Date.now();
    if (freezeSpin.value < 0.5) {
      const dt = Math.min(frame.timeSincePreviousFrame ?? 16.7, 48);
      spin.value = (spin.value + (dt / 1000) * LP_DEGREES_PER_SECOND) % 360;
      if (frame.timestamp - lastPaint.value > 32) {
        lastPaint.value = frame.timestamp;
        runOnJS(setPaintSpin)(spin.value);
      }
    }
    const target = tracking.value > 0 ? clampTunerCents(liveCents.value) : -50;
    const delta = target - shown.value;
    if (Math.abs(delta) < 0.04) {
      shown.value = target;
      return;
    }
    shown.value += delta * (Math.abs(delta) > 14 ? 0.34 : 0.2);
  });

  useEffect(() => {
    if (holdTrail) return;
    if (phase === 'denied' || phase === 'error') {
      setTrail([]);
      return;
    }
    if (!live || !reading) {
      const at = Date.now();
      setTrail((prev) => prev.filter((sample) => at - sample.at < TUNER_TRAIL_LIFE_MS));
      return;
    }
    const at = Date.now();
    const spinNow = spin.value;
    setTrail((prev) => {
      const next = pushTunerTrail(prev, reading.cents, at);
      return next.map((sample) => {
        const prior = prev.find((item) => item.at === sample.at);
        return { ...sample, spin: prior?.spin ?? spinNow };
      });
    });
  }, [holdTrail, live, phase, reading, spin]);

  const table = turntableGeometry(size);
  const locked = live && reading?.state === 'in-tune';
  const cue = tunerCue(live && reading ? reading.cents : 0, live && reading ? reading.state : 'listening');
  const direction = reading && live ? tunerDirection(reading.cents, reading.state) : 'open';
  const trustworthy = Boolean(live && reading && tunerPitchIsTrustworthy(reading.cents));
  const guidance =
    phase === 'denied' || phase === 'error'
      ? error || 'Microphone access is needed to tune.'
      : !live
        ? 'NO SIGNAL'
        : direction === 'in-tune'
          ? 'IN TUNE'
          : direction === 'flat'
            ? 'TUNE UP'
            : direction === 'sharp'
              ? 'TUNE DOWN'
              : 'NO SIGNAL';
  const targetTip = tonearmPose(0, size);
  const note = live && reading ? `${reading.note}${reading.octave}` : '';
  const noteSize = Math.min(28, Math.round(table.labelR * 0.5));
  const labelTurn = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const scratch = useMemo(() => grooveScratchSegments(trail, paintSpin, size), [paintSpin, size, trail]);

  return (
    <View style={[styles.stage, { width: size, height: size }]} testID="console-face-tuner" pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <RecordDeck size={size} locked={locked} spin={spin} target={cue.target} showCue={trustworthy} />
        {trustworthy
          ? scratch.map((segment) => (
          <Group key={segment.key} opacity={segment.opacity}>
            <Line
              p1={vec(segment.x0, segment.y0)}
              p2={vec(segment.x1, segment.y1)}
              style="stroke"
              strokeWidth={0.8}
              strokeCap="round"
              color="rgba(232,214,180,0.28)"
            />
          </Group>
        ))
          : null}
        {trustworthy ? <Tonearm size={size} shown={shown} locked={locked} /> : null}
      </Canvas>
      <Animated.View
        style={[
          styles.labelCopy,
          labelTurn,
          {
            left: table.discCx - table.labelR,
            top: table.discCy - table.labelR,
            width: table.labelR * 2,
            height: table.labelR * 2,
          },
        ]}>
        <Pockt2Mark size={Math.max(22, Math.round(table.labelR * 1.28))} accessible={false} />
      </Animated.View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: table.discCx - 6,
          top: table.discCy - 6,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#070605',
          borderWidth: 1,
          borderColor: locked ? BRASS_HOT : BRASS,
        }}
      />
      {note ? (
        <Text
          style={[
            styles.note,
            locked && styles.noteLock,
            {
              left: table.discCx - table.discR * 0.4,
              top: table.discCy + table.labelR + 4,
              width: table.discR * 0.8,
              fontSize: noteSize,
              lineHeight: noteSize,
            },
          ]}
          allowFontScaling={false}>
          {note}
        </Text>
      ) : null}
      <Text
        style={[
          styles.guidance,
          locked && styles.guidanceLock,
          live && { color: cue.word },
          {
            left: table.discCx - 78,
            top: table.discCy + table.labelR + 30,
            width: 156,
          },
        ]}
        allowFontScaling={false}>
        {guidance}
      </Text>
    </View>
  );
}

const RecordDeck = memo(function RecordDeck({
  size,
  locked,
  spin,
  target,
  showCue,
}: {
  size: number;
  locked: boolean;
  spin: SharedValue<number>;
  target: string;
  showCue: boolean;
}) {
  const table = turntableGeometry(size);
  const { discCx: cx, discCy: cy, discR } = table;
  const grooves = useMemo(
    () => grooveField(discR, table.innerR * 0.98, table.outerR),
    [discR, table.innerR, table.outerR]
  );
  const highlight = useMemo(() => rimArc(cx, cy, discR - 1.4, 200, 150), [cx, cy, discR]);
  const shade = useMemo(() => rimArc(cx, cy, discR - 1.2, 18, 150), [cx, cy, discR]);
  const sheen = useMemo(() => rimArc(cx, cy, discR * 0.72, 214, 78), [cx, cy, discR]);
  const shader = useMemo(() => vinylEffect(), []);
  const zero = tonearmPose(0, size);
  const ang = Math.atan2(zero.tipY - cy, zero.tipX - cx);
  const nick = {
    x1: cx + Math.cos(ang) * (table.grooveR - 7),
    y1: cy + Math.sin(ang) * (table.grooveR - 7),
    x2: cx + Math.cos(ang) * (table.grooveR + 7),
    y2: cy + Math.sin(ang) * (table.grooveR + 7),
  };
  const origin = vec(cx, cy);
  const turn = useDerivedValue(() => [{ rotate: (spin.value * Math.PI) / 180 }]);
  const uniforms = useDerivedValue(() => ({
    center: [cx, cy],
    radius: discR,
    locked: locked ? 1 : 0,
    angle: spin.value,
  }));

  return (
    <Group>
      <Group>
      <Oval x={cx - discR * 0.92} y={cy - discR * 0.78} width={discR * 1.84} height={discR * 1.72} color="rgba(0,0,0,0.55)">
        <BlurMask blur={10} style="normal" />
      </Oval>
      <Circle cx={cx + 1.4} cy={cy + Math.max(5, discR * 0.034)} r={discR * 0.99} color="#021018" />
      <Circle cx={cx} cy={cy} r={discR}>
        {shader ? (
          <Shader source={shader} uniforms={uniforms} />
        ) : (
          <RadialGradient c={vec(cx, cy)} r={discR} colors={['#0A3A72', '#062040', '#041018']} />
        )}
      </Circle>
      {grooves.map((groove) => (
        <Group key={groove.r}>
          <Circle
            cx={cx}
            cy={cy + 0.4}
            r={groove.r}
            style="stroke"
            strokeWidth={0.65}
            color={`rgba(0,8,18,${Math.min(0.55, groove.dark)})`}
          />
          <Circle
            cx={cx}
            cy={cy - 0.3}
            r={groove.r}
            style="stroke"
            strokeWidth={0.35}
            color={`rgba(186,230,255,${groove.light * 0.85})`}
          />
        </Group>
      ))}
      <Circle cx={cx - discR * 0.18} cy={cy - discR * 0.24} r={discR * 0.7}>
        <RadialGradient
          c={vec(cx - discR * 0.36, cy - discR * 0.42)}
          r={discR * 0.7}
          colors={['rgba(255,250,242,0.28)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']}
          positions={[0, 0.28, 1]}
        />
      </Circle>
      <Circle cx={cx + discR * 0.16} cy={cy + discR * 0.22} r={discR * 0.78}>
        <RadialGradient
          c={vec(cx + discR * 0.28, cy + discR * 0.34)}
          r={discR * 0.78}
          colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']}
        />
      </Circle>
      <Group origin={origin} transform={turn}>
        <Circle cx={cx - discR * 0.46} cy={cy - discR * 0.18} r={discR * 0.07} color="rgba(210,244,255,0.16)" />
        <Circle cx={cx + discR * 0.22} cy={cy - discR * 0.4} r={discR * 0.045} color="rgba(8,24,48,0.28)" />
        <Circle cx={cx - discR * 0.12} cy={cy + discR * 0.42} r={discR * 0.09} color="rgba(120,210,255,0.12)" />
      </Group>
      <Path path={sheen} style="stroke" strokeWidth={discR * 0.08} color="rgba(255,255,255,0.045)" />
      <Path path={highlight} style="stroke" strokeWidth={1.6} color="rgba(232,236,242,0.42)" />
      <Path path={shade} style="stroke" strokeWidth={2.1} color="rgba(0,0,0,0.72)" />
      <Circle cx={cx} cy={cy} r={discR - 0.6} style="stroke" strokeWidth={1.1} color="rgba(8,9,12,0.9)" />
      </Group>
      {showCue ? (
        <Group>
      <Circle cx={zero.tipX} cy={zero.tipY} r={locked ? 2.6 : 1.8} color={target} />
      <Circle cx={zero.tipX} cy={zero.tipY} r={locked ? 2.4 : 1.7} style="stroke" strokeWidth={1.15} color={locked ? BRASS_HOT : 'rgba(244, 220, 170, 0.95)'} />
        </Group>
      ) : null}
      <Group origin={origin} transform={turn}>
      <Circle cx={cx} cy={cy} r={table.labelR}>
        <RadialGradient
          c={vec(cx - table.labelR * 0.25, cy - table.labelR * 0.32)}
          r={table.labelR * 1.15}
          colors={locked ? ['#F3E6C4', '#C6A36A', '#8C7040'] : ['#E7D7B0', '#C4A36A', '#7A6240']}
        />
      </Circle>
      <Circle cx={cx} cy={cy} r={table.labelR * 0.86}>
        <RadialGradient
          c={vec(cx - table.labelR * 0.12, cy - table.labelR * 0.16)}
          r={table.labelR}
          colors={locked ? ['#2A241C', '#100E0C', '#070605'] : ['#1A1814', '#0C0B09', '#070605']}
        />
      </Circle>
      <Circle cx={cx} cy={cy} r={table.labelR - 0.7} style="stroke" strokeWidth={locked ? 1.5 : 1.05} color={locked ? BRASS_HOT : BRASS} />
      <Circle cx={cx} cy={cy} r={Math.max(3.2, size * 0.012)} color="#070605" />
      <Circle
        cx={cx}
        cy={cy}
        r={Math.max(4.4, size * 0.016)}
        style="stroke"
        strokeWidth={1}
        color={locked ? '#9EE8DE' : BRASS}
      />
      </Group>
    </Group>
  );
});

type ScratchSegment = {
  key: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  opacity: number;
};

/** Record-local scratch. Old contact stays on the vinyl and sweeps around its groove. */
function grooveScratchSegments(marks: { cents: number; spin: number }[], live: number, size: number): ScratchSegment[] {
  if (marks.length < 1) return [];
  const spins = marks.map((mark) => mark.spin);
  const minSpin = Math.min(...spins, live);
  const maxSpin = Math.max(...spins, live);
  const span = Math.max(0.8, maxSpin - minSpin);
  const points = Array.from({ length: TRACE_SLICES + 1 }, (_, index) => {
    const at = minSpin + (index / TRACE_SLICES) * span;
    return groovePoint(centsAlong(marks, at), at, live, size);
  });
  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const newest = (index + 1) / TRACE_SLICES;
    return {
      key: `${index}`,
      x0: from.x,
      y0: from.y,
      x1: to.x,
      y1: to.y,
      opacity: 0.72 + newest * 0.28,
    };
  });
}

function groovePoint(cents: number, atSpin: number, live: number, size: number) {
  const pose = tonearmPose(cents, size);
  const base = Math.atan2(pose.tipY - pose.discCy, pose.tipX - pose.discCx);
  const angle = base + ((live - atSpin) * Math.PI) / 180;
  return {
    x: pose.discCx + Math.cos(angle) * pose.radius,
    y: pose.discCy + Math.sin(angle) * pose.radius,
  };
}

function centsAlong(marks: { cents: number; spin: number }[], spinValue: number) {
  if (marks.length < 1) return 0;
  let prev = 0;
  let next = 0;
  for (let i = 0; i < marks.length; i += 1) {
    if (marks[i].spin <= spinValue) prev = i;
    if (marks[i].spin >= spinValue) {
      next = i;
      break;
    }
    next = i;
  }
  const spin0 = marks[prev].spin;
  const spin1 = marks[next].spin;
  const span = spin1 - spin0;
  const mix = Math.abs(span) < 0.001 ? 0 : Math.min(1, Math.max(0, (spinValue - spin0) / span));
  return marks[prev].cents + (marks[next].cents - marks[prev].cents) * mix;
}

const Tonearm = memo(function Tonearm({
  size,
  shown,
  locked,
}: {
  size: number;
  shown: SharedValue<number>;
  locked: boolean;
}) {
  const table = turntableGeometry(size);
  const length = table.armLength;
  const transform = useDerivedValue(() => {
    const pose = tonearmPose(shown.value, size);
    return [{ rotate: (pose.deg * Math.PI) / 180 }];
  });
  const shadow = useDerivedValue(() => {
    const pose = tonearmPose(shown.value, size);
    return [{ translateX: 2.2 }, { translateY: 3.2 }, { rotate: (pose.deg * Math.PI) / 180 }];
  });
  const origin = vec(table.pivotX, table.pivotY);
  const tipX = useDerivedValue(() => tonearmPose(shown.value, size).tipX);
  const tipY = useDerivedValue(() => tonearmPose(shown.value, size).tipY);
  const x0 = table.pivotX;
  const y0 = table.pivotY;
  const housing = table.housingR;

  return (
    <Group>
      <Group origin={origin} transform={shadow} opacity={0.45}>
        <RoundedRect x={x0 - housing} y={y0 - 3} width={length * 0.72} height={7} r={3} color="#000" />
        <RoundedRect x={x0 + length - 36} y={y0 - 6} width={28} height={12} r={2} color="#000" />
      </Group>
      <Group origin={origin} transform={transform}>
        <RoundedRect x={x0 - housing * 1.55} y={y0 - 6.5} width={housing * 1.05} height={13} r={3}>
          <LinearGradient start={vec(x0, y0 - 6)} end={vec(x0, y0 + 6)} colors={['#E8EEF2', '#8A939A', '#2A3238']} />
        </RoundedRect>
        <RoundedRect x={x0 + housing * 0.35} y={y0 - 5.2} width={length - housing * 1.15} height={10.4} r={4}>
          <LinearGradient
            start={vec(x0, y0 - 5)}
            end={vec(x0, y0 + 5)}
            colors={['#F4F7F8', '#C5CED6', '#5A656E', '#1C2228']}
            positions={[0, 0.18, 0.62, 1]}
          />
        </RoundedRect>
        <RoundedRect x={x0 + length - 46} y={y0 - 8} width={34} height={16} r={2.2} color="#12161A" />
        <RoundedRect x={x0 + length - 44} y={y0 - 6.4} width={30} height={12.8} r={1.8}>
          <LinearGradient start={vec(x0, y0 - 6)} end={vec(x0, y0 + 6)} colors={['#D5DEE4', '#5C656C', '#14181C']} />
        </RoundedRect>
        <RoundedRect x={x0 + length - 16} y={y0 - 1.4} width={10} height={2.8} r={0.6} color="#C9A36A" />
      </Group>
      <RoundedRect x={x0 - housing * 0.95} y={y0 - housing * 0.15} width={housing * 1.9} height={housing * 1.2} r={5}>
        <LinearGradient
          start={vec(x0, y0 - housing)}
          end={vec(x0, y0 + housing)}
          colors={['#3A342C', '#16181A', '#070808']}
        />
      </RoundedRect>
      <Circle cx={x0} cy={y0} r={housing * 0.62}>
        <RadialGradient
          c={vec(x0 - housing * 0.16, y0 - housing * 0.2)}
          r={housing * 0.7}
          colors={['#4A525A', '#1C2126', '#0A0C0E']}
        />
      </Circle>
      <Circle cx={x0} cy={y0} r={housing * 0.62} style="stroke" strokeWidth={1.4} color={BRASS} />
      <Circle cx={x0} cy={y0} r={housing * 0.2} color="#14110E" />
      <Circle cx={tipX} cy={tipY} r={locked ? 2.2 : 1.1} color={locked ? 'rgba(126, 210, 170, 0.85)' : '#1A140E'} />
    </Group>
  );
});

const styles = StyleSheet.create({
  stage: {
    backgroundColor: 'transparent',
  },
  labelCopy: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    marginTop: 8,
    color: BRASS_HOT,
    fontSize: 10,
    letterSpacing: 3.2,
    fontWeight: '700',
  },
  brandLock: {
    color: '#F3E2B0',
  },
  note: {
    position: 'absolute',
    textAlign: 'center',
    color: BONE,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  noteLock: {
    color: '#FFF8EA',
  },
  guidance: {
    position: 'absolute',
    textAlign: 'center',
    color: 'rgba(243, 237, 226, 0.78)',
    fontSize: 16,
    letterSpacing: 1.3,
    fontWeight: '700',
  },
  guidanceLock: {
    color: BRASS_HOT,
  },
});

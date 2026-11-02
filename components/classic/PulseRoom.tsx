import { Image } from 'expo-image';
import { Canvas, Circle, Shader, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { proofFlags } from '@/lib/proof-flags';
import { PulseMenu } from '@/components/classic/PulseMenu';
import { sanitizeBpm } from '@/constants/timing';
import { PULSE_RING_MAIN, PULSE_RING_WAVE_1, PULSE_RING_WAVE_2 } from '@/lib/classic-assets';
import { hapticLight, hapticPulseTick, hapticSelection } from '@/lib/haptics';
import {
  isPulseDotHit,
  isPulseTrackHit,
  PULSE_TRACK_MAX_BPM,
  PULSE_TRACK_MIN_BPM,
  PULSE_WAVE_ORIGIN,
  PULSE_WAVE_OUTER,
  pulseBeatShouldLaunch,
  pulseBpmToTurns,
  pulseTrackRadii,
  pulseTurnsAfterDrag,
  pulseTurnsToAngle,
  pulseTurnsToBpm,
  wrapDelta,
} from '@/lib/pulse-math';

const RING_COUNT = 5;

function ringDuration(bpm: number): number {
  if (proofFlags.reduceMotion) return 140;
  if (bpm >= 240) return 260;
  if (bpm >= 160) return 380;
  return Math.min(2400, Math.max(640, (60000 / Math.max(1, bpm)) * 1.9));
}

function ringScale(bpm: number): number {
  if (proofFlags.reduceMotion) return 1.15;
  if (bpm < 50) return 3.35;
  if (bpm < 80) return 3.05;
  if (bpm < 140) return 2.82;
  if (bpm < 220) return 2.42;
  return 2.12;
}

export function PulseRoom({
  config,
  prefs,
  compact,
  playing,
  transport,
  pulse,
  pulseRole,
  pulseBeat,
  pulseBeatHost,
  toggle,
  tapTempo,
  setBpm,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenPractice,
  onOpenPresets,
  onOpenSettings,
  onChangeAccents,
  onUpdate,
  onDisplayPrefsChange,
  onGoHome,
  viewport,
  proofWaves = false,
}: ClassicInstrumentProps & { viewport?: number; proofWaves?: boolean | 'first' | 'young' | 'mid' | 'aged' }) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const width = viewport ?? window.width;
  const height = viewport ?? window.height;
  const [menuOpen, setMenuOpen] = useState(false);
  const visualPlay = useSharedValue(playing ? 1 : 0);
  const safeBpm = sanitizeBpm(config.bpm);

  useEffect(() => {
    visualPlay.value = playing ? 1 : 0;
  }, [playing, visualPlay]);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (value) proofFlags.reduceMotion = true;
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      proofFlags.reduceMotion = value;
    });
    return () => sub?.remove();
  }, []);
  const size = viewport
    ? Math.round(viewport * 0.56)
    : Math.min(compact ? 276 : 300, Math.round(width * 0.7), Math.round(height * 0.38));
  const field = viewport ?? Math.min(width, height * 0.72);
  const downColor = prefs.pulseDownbeatColor;
  const upColor = prefs.pulseUpbeatColor;
  const showCenterBpm = !viewport;

  if (viewport) {
    return (
      <View
        pointerEvents="box-none"
        accessibilityLabel={`POCKT Pulse. Tempo ${safeBpm}. ${playing ? 'Playing' : 'Stopped'}`}
        style={{
          width: viewport,
          height: viewport,
          borderRadius: viewport / 2,
          overflow: 'visible',
          backgroundColor: '#07080A',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <PulseWaves
          pulse={pulse}
          pulseRole={pulseRole}
          pulseBeat={pulseBeat}
          pulseBeatHost={pulseBeatHost}
          playing={playing && config.visualPulse}
          visualPlay={visualPlay}
          bpm={safeBpm}
          size={viewport}
          downColor={downColor}
          upColor={upColor}
          origin={PULSE_WAVE_ORIGIN}
          outer={PULSE_WAVE_OUTER}
        />
        {pulseProofFronts(proofWaves).map((front, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (viewport - viewport * front.scale) / 2,
              top: (viewport - viewport * front.scale) / 2,
              width: viewport * front.scale,
              height: viewport * front.scale,
              borderRadius: viewport,
              borderWidth: Math.max(10, front.thick),
              borderColor: front.color,
            }}
          />
        ))}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: Math.round(viewport * 0.28),
            height: Math.round(viewport * 0.28),
            backgroundColor: '#0E3C44',
            borderWidth: 4,
            borderColor: '#7EE8DE',
            borderRadius: viewport,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Pockt2Mark size={Math.max(22, Math.round(viewport * 0.1))} accessible={false} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, viewport ? { width: viewport, height: viewport } : null]}>
      <Pressable
        onPress={() => {
          void hapticSelection();
          onGoHome?.();
        }}
        accessibilityRole="button"
        accessibilityLabel="HOME"
        hitSlop={12}
        style={styles.homeGhost}>
        <Text style={styles.homeGhostText}>‹ HOME</Text>
      </Pressable>

      <View style={styles.stage}>
        <View style={[styles.field, { width: field, height: field }]} pointerEvents="box-none">
          <PulseWaves
            pulse={pulse}
            pulseRole={pulseRole}
            pulseBeat={pulseBeat}
            pulseBeatHost={pulseBeatHost}
            playing={playing && config.visualPulse}
            visualPlay={visualPlay}
            bpm={safeBpm}
            size={size}
            downColor={downColor}
            upColor={upColor}
          />
          <TempoDot
            bpm={safeBpm}
            size={size}
            color={upColor}
            playing={playing}
            invert={config.wheelInvert}
            onBpm={setBpm}
            onToggle={() => {
              visualPlay.value = playing ? 0 : 1;
              void hapticLight();
              toggle();
            }}
          />
          <View pointerEvents="none" style={[styles.circle, { width: size, height: size }]}>
            <PulseCore
              pulse={pulse}
              playing={playing && config.visualPulse}
              visualPlay={visualPlay}
              size={size}
              color={playing && transport.beatIndex === 0 ? downColor : upColor}
            />
            {showCenterBpm ? (
              <Text style={[styles.bpm, compact && { fontSize: 64 }]} allowFontScaling={false}>
                {safeBpm}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => {
          void hapticSelection();
          setMenuOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Pulse settings"
        style={({ pressed }) => [styles.dotsHit, { bottom: viewport ? 6 : Math.max(insets.bottom, 8) }, pressed && styles.pressed]}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Pressable>

      <PulseMenu
        visible={menuOpen}
        config={config}
        prefs={prefs}
        playing={playing}
        beatIndex={transport.beatIndex}
        silent={transport.silentMeasure}
        onClose={() => setMenuOpen(false)}
        setBpm={setBpm}
        tapTempo={tapTempo}
        onOpenPad={() => {
          setMenuOpen(false);
          onOpenPad();
        }}
        onOpenTime={() => {
          setMenuOpen(false);
          onOpenTime();
        }}
        onOpenDivision={() => {
          setMenuOpen(false);
          onOpenDivision();
        }}
        onOpenSound={() => {
          setMenuOpen(false);
          onOpenSound();
        }}
        onOpenAccents={() => {
          setMenuOpen(false);
          onOpenAccents();
        }}
        onOpenPresets={() => {
          setMenuOpen(false);
          onOpenPresets();
        }}
        onOpenPractice={() => {
          setMenuOpen(false);
          onOpenPractice();
        }}
        onOpenSettings={() => {
          setMenuOpen(false);
          onOpenSettings();
        }}
        onGoHome={() => {
          setMenuOpen(false);
          onGoHome?.();
        }}
        onChangeAccents={onChangeAccents}
        onUpdate={onUpdate}
        onDisplayPrefsChange={onDisplayPrefsChange}
      />
    </View>
  );
}

function TempoDot({
  bpm,
  size,
  color,
  playing,
  onBpm,
  onToggle,
  invert,
}: {
  bpm: number;
  size: number;
  color: string;
  playing: boolean;
  onBpm: (next: number) => void;
  onToggle: () => void;
  invert: boolean;
}) {
  const safeBpm = sanitizeBpm(bpm);
  const liveBpm = useSharedValue(safeBpm);
  const liveTurns = useSharedValue(pulseBpmToTurns(safeBpm));
  const lastFinger = useSharedValue(0);
  const lastCommitted = useSharedValue(safeBpm);
  const dragging = useSharedValue(0);
  const radii = pulseTrackRadii(size);
  const ring = size * 1.36;
  const cx = ring / 2;
  const cy = ring / 2;
  const inner = radii.inner;
  const outer = Math.min(radii.outer, ring / 2 - 2);
  const visual = radii.visual;

  useEffect(() => {
    if (dragging.value < 0.5) {
      liveBpm.value = safeBpm;
      liveTurns.value = pulseBpmToTurns(safeBpm);
      lastCommitted.value = safeBpm;
    }
  }, [dragging, lastCommitted, liveBpm, liveTurns, safeBpm]);

  const commit = useMemo(
    () => (next: number) => {
      hapticPulseTick();
      onBpm(sanitizeBpm(next, safeBpm));
    },
    [onBpm, safeBpm]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .manualActivation(true)
        .onTouchesDown((event, state) => {
          const touch = event.allTouches[0];
          if (!touch) {
            state.fail();
            return;
          }
          const onLane = isPulseTrackHit(touch.x, touch.y, cx, cy, inner, outer);
          const onDot = isPulseDotHit(touch.x, touch.y, cx, cy, liveBpm.value, visual);
          if (onLane || onDot) {
            state.activate();
            return;
          }
          state.fail();
        })
        .onBegin((event) => {
          dragging.value = 1;
          const finger = Math.atan2(event.y - cy, event.x - cx);
          lastFinger.value = finger;
          liveTurns.value = pulseBpmToTurns(liveBpm.value);
          const onDot = isPulseDotHit(event.x, event.y, cx, cy, liveBpm.value, visual);
          if (onDot) return;
          const frac = ((finger * 180) / Math.PI + 90 + 360) % 360 / 360;
          const base = liveBpm.value <= 200 ? 0 : 1;
          const nextTurns = Math.min(2, Math.max(0, base + frac));
          liveTurns.value = nextTurns;
          const next = pulseTurnsToBpm(nextTurns, PULSE_TRACK_MIN_BPM, 200, PULSE_TRACK_MAX_BPM);
          liveBpm.value = next;
          const rounded = Math.round(next);
          lastCommitted.value = rounded;
          runOnJS(commit)(rounded);
        })
        .onUpdate((event) => {
          const finger = Math.atan2(event.y - cy, event.x - cx);
          const delta = wrapDelta(finger - lastFinger.value);
          lastFinger.value = finger;
          const nextTurns = pulseTurnsAfterDrag(liveTurns.value, delta, invert);
          liveTurns.value = nextTurns;
          const clamped = pulseTurnsToBpm(nextTurns, PULSE_TRACK_MIN_BPM, 200, PULSE_TRACK_MAX_BPM);
          liveBpm.value = clamped;
          const next = Math.round(clamped);
          if (next === lastCommitted.value) return;
          lastCommitted.value = next;
          runOnJS(commit)(next);
        })
        .onFinalize(() => {
          dragging.value = 0;
          liveBpm.value = lastCommitted.value;
        }),
    [commit, cx, cy, dragging, inner, invert, lastCommitted, lastFinger, liveBpm, liveTurns, outer, visual]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event) => {
        const d = Math.hypot(event.x - cx, event.y - cy);
        if (d < inner) runOnJS(onToggle)();
      }),
    [cx, cy, inner, onToggle]
  );

  const composed = useMemo(() => Gesture.Exclusive(gesture, tap), [gesture, tap]);

  const dotStyle = useAnimatedStyle(() => {
    const a = pulseTurnsToAngle(liveTurns.value);
    return {
      transform: [{ translateX: Math.cos(a) * visual }, { translateY: Math.sin(a) * visual }],
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Pulse. Tempo ${safeBpm}. ${playing ? 'Playing' : 'Stopped'}`}
        accessibilityHint="Drag around the ring to set tempo. Double tap the center to start or stop."
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            hapticPulseTick();
            onBpm(sanitizeBpm(safeBpm + 1, safeBpm));
          }
          if (event.nativeEvent.actionName === 'decrement') {
            hapticPulseTick();
            onBpm(sanitizeBpm(safeBpm - 1, safeBpm));
          }
          if (event.nativeEvent.actionName === 'activate') onToggle();
        }}
        style={[styles.tempoRing, { width: ring, height: ring }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.tempoDot,
            {
              backgroundColor: color,
              left: cx - 9,
              top: cy - 9,
            },
            dotStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

function PulseCore({
  pulse,
  visualPlay,
  size,
  color,
}: {
  pulse: SharedValue<number>;
  playing: boolean;
  visualPlay: SharedValue<number>;
  size: number;
  color: string;
}) {
  const ring = useAnimatedStyle(() => ({
    opacity: visualPlay.value > 0.5 ? interpolate(pulse.value, [0, 1], [0.62, 1]) : 0.92,
    transform: [{ scale: visualPlay.value > 0.5 ? interpolate(pulse.value, [0, 1], [1, 1.16]) : 1 }],
  }));
  const bloom = useAnimatedStyle(() => ({
    opacity: visualPlay.value > 0.5 ? interpolate(pulse.value, [0, 1], [0.18, 0.48]) : 0,
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.coreWrap, { width: size, height: size }, ring]}>
      <Animated.View
        style={[
          styles.coreBloom,
          bloom,
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: size * 0.46,
            shadowColor: color,
          },
        ]}
      />
      <Image
        source={PULSE_RING_MAIN}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="pulse-ring-main"
      />
      <View style={[styles.ringTint, { borderColor: color, borderRadius: size / 2 }]} />
    </Animated.View>
  );
}

function PulseWaves({
  pulse,
  pulseRole,
  pulseBeat,
  pulseBeatHost,
  playing,
  visualPlay,
  bpm,
  size,
  downColor,
  upColor,
  origin,
  outer,
}: {
  pulse: ClassicInstrumentProps['pulse'];
  pulseRole: ClassicInstrumentProps['pulseRole'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
  pulseBeatHost?: ClassicInstrumentProps['pulseBeatHost'];
  playing: boolean;
  visualPlay: SharedValue<number>;
  bpm: number;
  size: number;
  downColor: string;
  upColor: string;
  origin?: number;
  outer?: number;
}) {
  const playingSv = visualPlay;
  const durationSv = useSharedValue(ringDuration(bpm));
  const scaleSv = useSharedValue(ringScale(bpm));
  const cursor = useSharedValue(0);
  const slots = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];
  const roles = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  if (playingSv.value !== (playing ? 1 : 0)) playingSv.value = playing ? 1 : 0;

  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
    durationSv.value = ringDuration(bpm);
    scaleSv.value = ringScale(bpm);
    if (!playing) {
      for (const slot of slots) slot.value = 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot shared values are created once
  }, [bpm, durationSv, playing, playingSv, scaleSv]);

  useAnimatedReaction(
    () => (pulseBeatHost ? pulseBeatHost.value : pulseBeat ? pulseBeat.value : pulse.value >= 0.42 ? 1 : 0),
    (value, previous) => {
      if (!pulseBeatShouldLaunch(previous, value, playingSv.value > 0.5)) return;
      const slot = cursor.value;
      cursor.value = (slot + 1) % RING_COUNT;
      const role = pulseRole.value >= 1.5 ? 1 : 0;
      const duration = durationSv.value;
      const progress = slots[slot];
      const tone = roles[slot];
      if (!progress || !tone) return;
      progress.value = 0;
      tone.value = role;
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    }
  );

  if (!playing) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {slots.map((progress, index) => (
        <WaveRing
          key={index}
          index={index}
          progress={progress}
          role={roles[index] ?? roles[0]}
          size={size}
          scaleSv={scaleSv}
          origin={origin}
          outer={outer}
          downColor={downColor}
          upColor={upColor}
        />
      ))}
    </View>
  );
}

function WaveRing({
  index,
  progress,
  role,
  size,
  scaleSv,
  origin,
  outer,
  downColor,
  upColor,
}: {
  index: number;
  progress: SharedValue<number>;
  role: SharedValue<number>;
  size: number;
  scaleSv: SharedValue<number>;
  origin?: number;
  outer?: number;
  downColor: string;
  upColor: string;
}) {
  const style = useAnimatedStyle(() => {
    const done = progress.value >= 0.995;
    const fade = done ? 0 : interpolate(progress.value, [0, 0.08, 0.4, 0.72, 0.9, 1], [1, 0.96, 0.78, 0.48, 0.22, 0]);
    if (origin) {
      const travel = size * (0.16 + Math.max(0, scaleSv.value - 2.05) * 0.16);
      return {
        opacity: fade,
        transform: [{ translateY: interpolate(progress.value, [0, 1], [6, -travel]) }],
      };
    }
    const from = origin ?? 0.62;
    const to = outer ?? scaleSv.value;
    return {
      opacity: fade,
      transform: [{ scale: interpolate(progress.value, [0, 1], [from, to]) }],
    };
  });
  const tint = useAnimatedStyle(() => ({
    borderColor: role.value >= 0.5 ? downColor : upColor,
    borderTopWidth: interpolate(progress.value, [0, 0.12, 0.4, 0.78, 1], [7.8, 5.8, 3.6, 1.8, 0.8]),
    borderLeftWidth: interpolate(progress.value, [0, 1], [2.2, 0.4]),
    borderRightWidth: interpolate(progress.value, [0, 1], [1.1, 0.2]),
    borderBottomWidth: 0,
    opacity: interpolate(progress.value, [0, 0.12, 0.55, 0.88, 1], [1, 0.94, 0.62, 0.22, 0]),
  }));
  const wash = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.28, 0.62, 1], [0.38, 0.2, 0.1, 0.04, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.halo,
        origin
          ? { width: size * 0.56, height: size * 0.22, marginLeft: -size * 0.28, marginTop: -size * 0.04 }
          : { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}>
      {origin ? (
        <Animated.View style={[styles.membraneEdge, tint]} />
      ) : (
      <Image
        source={index % 2 === 0 ? PULSE_RING_WAVE_1 : PULSE_RING_WAVE_2}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.42 }]}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={`pulse-wave-${index % 2}`}
      />
      )}
      <Animated.View style={[origin ? styles.membraneBody : styles.haloWash, wash]} />
      {origin ? null : <Animated.View style={[styles.haloTint, tint]} />}
    </Animated.View>
  );
}

const DIAPHRAGM_RIDGE = `
uniform float2 center;
uniform float radius;
uniform float reach;
uniform float amp;
uniform float spread;
uniform float span;
uniform float f0;
uniform float f1;
uniform float f2;
uniform float nfront;

float frontY(float front) {
  return mix(0.58, -0.72, clamp(front, 0.0, 1.0) * reach);
}

float mound(float2 p, float front) {
  float dy = (p.y - frontY(front)) / max(spread, 0.04);
  float dx = p.x / max(span, 0.08);
  return exp(-(dx * dx + dy * dy));
}

float heightAt(float2 p) {
  float h = 0.045 * (0.35 - dot(p, p));
  h += sin(p.x * 130.0 + p.y * 9.0) * 0.0025;
  h += mound(p, f0) * amp;
  if (nfront > 1.5) h += mound(p, f1) * amp * 0.4;
  if (nfront > 2.5) h += mound(p, f2) * amp * 0.16;
  float2 boss = p - float2(0.0, 0.64);
  h += exp(-dot(boss, boss) * 26.0) * 0.2;
  return h;
}

half4 main(float2 coord) {
  float2 p = (coord - center) / max(radius, 1.0);
  float r = length(p);
  float mask = smoothstep(1.02, 0.985, r);
  float eps = 0.014;
  float h = heightAt(p);
  float hx = heightAt(p + float2(eps, 0.0)) - heightAt(p - float2(eps, 0.0));
  float hy = heightAt(p + float2(0.0, eps)) - heightAt(p - float2(0.0, eps));
  float3 n = normalize(float3(-hx * 8.0, -hy * 8.0, 1.0));
  float3 light = normalize(float3(-0.2, -0.84, 0.5));
  float shade = clamp(dot(n, light) * 0.5 + 0.5, 0.05, 1.0);
  float3 halfv = normalize(light + float3(0.0, 0.0, 1.0));
  float spec = pow(clamp(dot(n, halfv), 0.0, 1.0), 80.0);
  float3 metal = float3(0.17, 0.18, 0.19);
  float3 col = metal * (0.2 + shade * 1.25);
  float b0 = mound(p, f0) * amp;
  float dy0 = (p.y - frontY(f0)) / max(spread, 0.04);
  col += float3(0.16, 0.17, 0.18) * b0 * clamp(0.75 - dy0, 0.0, 1.0);
  col *= 1.0 - b0 * clamp(0.1 + dy0, 0.0, 0.8) * 0.85;
  if (nfront > 1.5) {
    float b1 = mound(p, f1) * amp * 0.45;
    float dy1 = (p.y - frontY(f1)) / max(spread, 0.04);
    col += float3(0.12, 0.13, 0.14) * b1 * clamp(0.7 - dy1, 0.0, 1.0);
    col *= 1.0 - b1 * clamp(0.1 + dy1, 0.0, 0.7);
  }
  if (nfront > 2.5) {
    float b2 = mound(p, f2) * amp * 0.2;
    float dy2 = (p.y - frontY(f2)) / max(spread, 0.04);
    col += float3(0.08, 0.09, 0.1) * b2 * clamp(0.65 - dy2, 0.0, 1.0);
    col *= 1.0 - b2 * 0.45;
  }
  col += float3(0.35, 0.36, 0.34) * spec * 0.03;
  float2 boss = p - float2(0.0, 0.64);
  float bossMask = exp(-dot(boss, boss) * 26.0);
  col = mix(col, col * float3(1.22, 1.04, 0.74), bossMask * 0.8);
  return half4(half3(col), mask);
}
`;

function PulseEnergy({
  size,
  bpm,
  fronts,
}: {
  size: number;
  bpm: number;
  fronts: { scale: number; thick: number; color: string }[];
}) {
  const reachScale = bpm >= 240 ? 0.62 : bpm < 80 ? 1.18 : 1;
  const budget = proofFlags.reduceMotion ? 1 : bpm >= 240 ? 1 : bpm < 80 ? fronts.length : Math.min(2, fronts.length);
  const shown = fronts.slice(0, budget);
  const effect = useMemo(() => Skia.RuntimeEffect.Make(DIAPHRAGM_RIDGE), []);
  const uniforms = {
    center: [size / 2, size / 2],
    radius: size / 2,
    reach: reachScale,
    amp: shown.length ? (bpm >= 240 ? 0.32 : bpm < 80 ? 1.15 : 0.62) : 0.02,
    spread: bpm >= 240 ? 0.07 : bpm < 80 ? 0.34 : 0.16,
    span: bpm >= 240 ? 0.15 : bpm < 80 ? 0.68 : 0.34,
    f0: Math.min(1, shown[0]?.scale ?? 0),
    f1: Math.min(1, shown[1]?.scale ?? 0),
    f2: Math.min(1, shown[2]?.scale ?? 0),
    nfront: shown.length,
  };
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={size / 2} cy={size / 2} r={size / 2} color="#12161A">
        {effect ? <Shader source={effect} uniforms={uniforms} /> : null}
      </Circle>
    </Canvas>
  );
}

function pulseProofFronts(mode: boolean | 'first' | 'young' | 'mid' | 'aged' | undefined) {
  if (mode === 'young' || mode === 'first') {
    return [{ scale: 0.48, thick: 18, color: 'rgba(220, 255, 250, 0.98)', side: 'rgba(150, 236, 228, 0.7)', fade: 'rgba(100, 190, 190, 0.28)' }];
  }
  if (mode === 'mid') {
    return [{ scale: 0.78, thick: 10, color: 'rgba(160, 228, 220, 0.72)', side: 'rgba(100, 180, 180, 0.32)', fade: 'rgba(70, 140, 146, 0.08)' }];
  }
  if (mode === 'aged' || mode === true) {
    return [
      { scale: 0.46, thick: 16, color: 'rgba(220, 255, 250, 0.95)', side: 'rgba(140, 226, 220, 0.55)', fade: 'rgba(90, 170, 174, 0.16)' },
      { scale: 0.74, thick: 7, color: 'rgba(130, 206, 202, 0.5)', side: 'rgba(80, 150, 154, 0.2)', fade: 'transparent' },
      { scale: 1.9, thick: 8, color: 'rgba(126, 232, 222, 0.55)', side: 'rgba(70, 120, 128, 0.1)', fade: 'transparent' },
    ];
  }
  return [];
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  homeGhost: {
    position: 'absolute',
    left: 4,
    top: 0,
    zIndex: 8,
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
  },
  homeGhostText: {
    color: 'rgba(244,246,250,0.34)',
    fontSize: 14,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tempoRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempoDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(244,246,250,0.9)',
    shadowColor: '#7EC8FF',
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 6,
    opacity: 0.95,
  },
  coreBloom: {
    position: 'absolute',
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'rgba(126,200,255,0.1)',
    borderWidth: 3,
    borderColor: 'rgba(180,230,255,0.7)',
  },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    overflow: 'hidden',
    borderRadius: 18,
  },
  membraneBody: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(150, 230, 224, 0.28)',
    borderRadius: 18,
  },
  membraneEdge: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: 0,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(230, 255, 250, 0.92)',
  },
  haloTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 6,
  },
  haloWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(126,200,255,0.12)',
  },
  bpm: {
    position: 'absolute',
    color: '#F4F6FA',
    fontSize: 76,
    fontWeight: '300',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  dotsHit: {
    position: 'absolute',
    right: 6,
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(220,228,236,0.5)',
  },
  pressed: {
    opacity: 0.7,
  },
});

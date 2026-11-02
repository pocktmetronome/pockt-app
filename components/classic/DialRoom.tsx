import { Canvas, Circle, Group, Image, Path, RoundedRect, Shadow, Skia, vec, type SkImage } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PocktDialView } from 'pockt-dial';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { SUBDIVISIONS, TIME_SIGNATURES } from '@/constants/meter';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { rotaryDetent } from '@/lib/rotary-feedback';
import { DEG_PER_BPM, pointerAngle, wrapDelta } from '@/lib/pro-dial';
import { rhythmVisualRadians } from '@/lib/rhythm-follow';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import { tempoName } from '@/lib/tempo-name';
import { proofFlags } from '@/lib/proof-flags';

/** Horizontal timing drum on a machined bed. */
const DRUM = require('@/assets/pass5-hardware/drum-cylinder.png');
const POCKET_RECESS = require('@/assets/pass5-hardware/pocket-recess.png');
const POCKET_CAM = require('@/assets/pass5-hardware/pocket-cam.png');

function useHardwareImage(source: number): SkImage | null {
  const [image, setImage] = useState<SkImage | null>(null);
  useEffect(() => {
    let alive = true;
    const asset = Asset.fromModule(source);
    const ready = asset.localUri || asset.uri ? Promise.resolve(asset) : asset.downloadAsync();
    ready
      .then((loaded) => Skia.Data.fromURI(loaded.localUri ?? loaded.uri))
      .then((data) => {
        const next = Skia.Image.MakeImageFromEncoded(data);
        if (alive && next) setImage(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [source]);
  return image;
}

const CYAN = '#3EE6D8';
const RED = '#E23B3B';

export function DialRoom({
  config,
  compact,
  playing,
  transport,
  pulse,
  pulseBeat,
  setBpm,
  toggle,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
}: ClassicInstrumentProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const safeBpm = sanitizeBpm(config.bpm);
  const lastDialBpmRef = useRef(safeBpm);
  useEffect(() => {
    lastDialBpmRef.current = safeBpm;
  }, [safeBpm]);
  const size = Math.min(compact ? 372 : 424, Math.round(width * 0.92), Math.round(height * 0.62));
  const beats = Math.max(1, TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? config.accentPattern.length);
  const current = SOUNDS[resolvePlayableSound(config.sound)];
  const tap = useClassicTapReaction(tapTempo);

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom - 8, 4) }]}>
      <SparkField field={tap.sparks} />
      <View style={styles.dash}>
        <View style={styles.dashLeft}>
          <Pressable onPress={onOpenTime} accessibilityRole="button" accessibilityLabel={`Time ${config.timeSignature}`} style={styles.dashCell}>
            <Text style={styles.chipKicker}>T.S.</Text>
            <Text style={styles.chipValue}>{config.timeSignature.replace('/', ' / ')}</Text>
          </Pressable>
          <Pressable onPress={onOpenDivision} accessibilityRole="button" accessibilityLabel="Subdivision" style={styles.dashCell}>
            <Text style={styles.chipKicker}>SUB DIV.</Text>
            <Text style={styles.chipValue}>{SUBDIVISIONS[config.subdivision]?.symbol ?? '♩'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={onOpenPad} accessibilityRole="button" accessibilityLabel={`Tempo ${safeBpm}. Opens keypad.`} style={styles.bpmHit}>
          <Text style={styles.chipKicker}>BPM</Text>
          <Text style={[styles.bpm, compact && styles.bpmCompact]} allowFontScaling={false}>
            {safeBpm}
          </Text>
          <Text style={styles.marking}>{tempoName(safeBpm)}</Text>
        </Pressable>
        <Pressable
          onPress={(event) => {
            tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY);
          }}
          accessibilityRole="button"
          accessibilityLabel="Tap tempo"
          style={styles.tapCell}>
          <Text style={styles.tapText}>TAP</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {Platform.OS === 'ios' ? (
          <PocktDialView
            bpm={safeBpm}
            playing={playing}
            invert={config.wheelInvert}
            haptic={effectiveHaptic(config)}
            style={{ width: size, height: size }}
            accessibilityLabel={`Dial. Tempo ${safeBpm}. ${playing ? 'Playing' : 'Stopped'}`}
            onBpm={(event) => {
              const next = sanitizeBpm(event.nativeEvent.bpm, lastDialBpmRef.current);
              if (next === lastDialBpmRef.current) return;
              lastDialBpmRef.current = next;
              // Sound only. Native Core Haptics owns detent feel; do not fire JS haptics in parallel.
              rotaryDetent('dial', sensoryFlags(config.sensoryMode).audio, false);
              setBpm(next);
            }}
            onCenterTap={toggle}
          />
        ) : (
          <DialWheel
            bpm={safeBpm}
            playing={playing}
            size={size}
            beats={beats}
            beatIndex={transport.beatIndex}
            pulse={pulse}
            pulseBeat={pulseBeat}
            invert={config.wheelInvert}
            onBpm={setBpm}
            onToggle={toggle}
            uiClick={sensoryFlags(config.sensoryMode).audio}
          />
        )}
        <Pressable onPress={onOpenSound} accessibilityRole="button" accessibilityLabel={`Sound ${current.label}`} style={styles.soundBadge}>
          <Text style={styles.soundIcon}>♪</Text>
          <Text
            style={styles.soundCount}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            allowFontScaling={false}>
            {current.label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DialWheel({
  bpm,
  playing,
  size,
  beats,
  beatIndex,
  pulse,
  pulseBeat,
  invert,
  onBpm,
  onToggle,
  uiClick,
  followRadians,
}: {
  bpm: number;
  playing: boolean;
  size: number;
  beats: number;
  beatIndex: number;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
  invert: boolean;
  onBpm: (next: number) => void;
  onToggle: () => void;
  uiClick: boolean;
  followRadians?: SharedValue<number>;
}) {
  const liveBpm = useSharedValue(bpm);
  const rotation = useSharedValue(bpm * DEG_PER_BPM);
  const lastFinger = useSharedValue(0);
  const lastCommitted = useSharedValue(bpm);
  const dragging = useSharedValue(0);
  const cx = size / 2;
  const cy = size / 2;
  const inner = size * 0.2;
  const rOuter = size * 0.498;
  const rInner = size * 0.348;
  const drum = useHardwareImage(DRUM);
  const pocket = useHardwareImage(proofFlags.concept === 'b' ? POCKET_CAM : POCKET_RECESS);
  const gap = Math.max(5.5, Math.min(9, 36 / Math.max(1, beats)));
  const sweep = 360 / Math.max(1, beats) - gap;
  const arcs = useMemo(
    () =>
      Array.from({ length: beats }, (_, index) => {
        const start = -90 + index * (360 / Math.max(1, beats)) + gap / 2;
        return ringSector(cx, cy, rOuter, rInner, start, sweep);
      }),
    [beats, cx, cy, rInner, rOuter, sweep, gap]
  );
  const clipCircle = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(cx, cy, rOuter + 0.5);
    return path;
  }, [cx, cy, rOuter]);
  const tickPath = useMemo(() => {
    const path = Skia.Path.Make();
    for (let index = 0; index < 24; index += 1) {
      const theta = (index / 24) * Math.PI * 2 - Math.PI / 2;
      const major = index % 6 === 0;
      const innerR = size * (major ? 0.222 : 0.236);
      const outerR = size * (major ? 0.33 : 0.3);
      path.moveTo(cx + Math.cos(theta) * innerR, cy + Math.sin(theta) * innerR);
      path.lineTo(cx + Math.cos(theta) * outerR, cy + Math.sin(theta) * outerR);
    }
    return path;
  }, [cx, cy, size]);
  const tickTurn = useDerivedValue(() => {
    const rad = followRadians ? rhythmVisualRadians(followRadians.value) : (rotation.value * Math.PI) / 180;
    return [{ rotate: rad }];
  });

  const commit = useMemo(
    () => (next: number) => {
      const safe = sanitizeBpm(next, bpm);
      rotaryDetent('dial', uiClick);
      onBpm(safe);
    },
    [bpm, onBpm, uiClick]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin((event) => {
          const d = Math.hypot(event.x - cx, event.y - cy);
          if (d < inner) return;
          dragging.value = 1;
          lastFinger.value = pointerAngle(event.x, event.y, cx, cy);
        })
        .onUpdate((event) => {
          if (dragging.value < 0.5) return;
          const finger = pointerAngle(event.x, event.y, cx, cy);
          const delta = wrapDelta(finger - lastFinger.value);
          lastFinger.value = finger;
          const deg = ((delta * 180) / Math.PI) * (invert ? -1 : 1);
          const raw = liveBpm.value + deg / DEG_PER_BPM;
          const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, raw));
          const applied = (clamped - liveBpm.value) * DEG_PER_BPM;
          liveBpm.value = clamped;
          rotation.value = rotation.value + applied;
          const rounded = Math.round(clamped);
          if (rounded === lastCommitted.value) return;
          lastCommitted.value = rounded;
          runOnJS(commit)(rounded);
        })
        .onFinalize(() => {
          if (dragging.value < 0.5) return;
          dragging.value = 0;
          const snapped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(liveBpm.value)));
          liveBpm.value = snapped;
          lastCommitted.value = snapped;
          runOnJS(commit)(snapped);
        }),
    [commit, cx, cy, dragging, inner, invert, lastCommitted, lastFinger, liveBpm, rotation]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event) => {
        const d = Math.hypot(event.x - cx, event.y - cy);
        if (d < inner) runOnJS(onToggle)();
      }),
    [cx, cy, inner, onToggle]
  );

  useEffect(() => {
    liveBpm.value = bpm;
    lastCommitted.value = bpm;
    if (dragging.value < 0.5) {
      const visual = rotation.value / DEG_PER_BPM;
      if (Math.abs(visual - bpm) > 0.51) {
        rotation.value = bpm * DEG_PER_BPM;
      }
    }
  }, [bpm, dragging, lastCommitted, liveBpm, rotation]);

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Dial. Tempo ${bpm}. ${playing ? 'Playing' : 'Stopped'}`}>
      <View style={[styles.dialPlate, { width: size, height: size, borderRadius: 0 }]} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size,
          height: size,
          overflow: 'hidden',
        }}>
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          {drum ? <Image image={drum} x={0} y={size * 0.08} width={size} height={size * 0.84} fit="fill" /> : null}
          {Array.from({ length: beats }, (_, index) => {
            const t = (index + 0.5) / Math.max(1, beats);
            const markW = size * (beats > 8 ? 0.045 : 0.07);
            const markH = size * 0.045;
            const x = size * 0.22 + t * size * 0.56 - markW / 2;
            const y = size * 0.5 - markH / 2;
            const active = playing && index === beatIndex % beats;
            return (
              <Group key={index}>
                <RoundedRect x={x} y={y} width={markW} height={markH} r={1} color={active ? '#3A3428' : '#07080A'} />
                <RoundedRect x={x} y={y} width={markW} height={1.5} r={0} color="rgba(0,0,0,0.85)" />
                <RoundedRect x={x} y={y + markH - 1.5} width={markW} height={1.5} r={0} color={active ? 'rgba(231,211,164,0.55)' : 'rgba(90,98,106,0.35)'} />
              </Group>
            );
          })}
          <RoundedRect x={size * 0.485} y={size * 0.3} width={size * 0.03} height={size * 0.22} r={0.5} color="#8E98A0" />
          <RoundedRect x={size * 0.478} y={size * 0.48} width={size * 0.044} height={size * 0.018} r={0.5} color="#D5DDE2" />
        </Canvas>
      </View>
      <GestureDetector gesture={followRadians ? Gesture.Tap() : Gesture.Exclusive(gesture, tap)}>
        <View style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Play'}
        onPress={onToggle}
        hitSlop={4}
        style={{
          position: 'absolute',
          width: size * 0.2,
          height: size * 0.16,
          left: size * 0.4,
          top: size * 0.42,
          zIndex: 8,
          opacity: 0,
        }}
      />
    </View>
  );
}

function ringSector(cx: number, cy: number, rOut: number, rIn: number, startDeg: number, sweepDeg: number) {
  const path = Skia.Path.Make();
  path.addArc(Skia.XYWHRect(cx - rOut, cy - rOut, rOut * 2, rOut * 2), startDeg, sweepDeg);
  path.arcToOval(Skia.XYWHRect(cx - rIn, cy - rIn, rIn * 2, rIn * 2), startDeg + sweepDeg, -sweepDeg, false);
  path.close();
  return path;
}

function BeatArc({
  path,
  index,
  beats,
  downbeat,
  playing,
  pulse,
  pulseBeat,
  fallbackCurrent,
}: {
  path: ReturnType<typeof Skia.Path.Make>;
  index: number;
  beats: number;
  downbeat: boolean;
  playing: boolean;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
  fallbackCurrent: boolean;
}) {
  const rest = '#2A3036';
  const lit = downbeat ? '#C4A36A' : '#3ECFC4';
  const opacity = useDerivedValue(() => {
    const current = pulseBeat ? Math.round(pulseBeat.value) % Math.max(1, beats) === index : fallbackCurrent;
    if (!playing || !current) return 0;
    return interpolate(pulse.value, [0, 0.12, 1], [0.28, 1, 1]);
  });
  return (
    <Group>
      <Path path={path} color="#0A0C0E">
        <Shadow dx={1.2} dy={2.4} blur={2} color="#000" />
      </Path>
      <Path path={path} color={rest} />
      <Group opacity={opacity}>
        <Path path={path} color={lit}>
          <Shadow dx={0} dy={0} blur={10} color={lit} inner />
        </Path>
      </Group>
    </Group>
  );
}

/** Illuminated beat annulus from DialWheel, without that wheel's second BPM gesture. */
export function DialSimonSegments({
  size,
  beats,
  beatIndex,
  playing,
  pulse,
  pulseBeat,
}: {
  size: number;
  beats: number;
  beatIndex: number;
  playing: boolean;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
}) {
  const count = Math.max(1, beats);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.49;
  const rInner = size * 0.28;
  const gap = Math.min(2.2, 10 / count);
  const sweep = 360 / count - gap;
  const arcs = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const start = -90 + index * (360 / count) + gap / 2;
        return ringSector(cx, cy, rOuter, rInner, start, sweep);
      }),
    [count, cx, cy, gap, rInner, rOuter, sweep]
  );
  const clipCircle = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(cx, cy, rOuter + 0.5);
    return path;
  }, [cx, cy, rOuter]);
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} testID="console-dial-simon">
      <View style={[styles.dialPlate, { width: size, height: size, borderRadius: size / 2 }]} />
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Group clip={clipCircle}>
          {arcs.map((path, index) => (
            <BeatArc
              key={index}
              path={path}
              index={index}
              beats={count}
              downbeat={index === 0}
              playing={playing}
              pulse={pulse}
              pulseBeat={pulseBeat}
              fallbackCurrent={index === beatIndex % count}
            />
          ))}
        </Group>
        <Circle cx={cx} cy={cy} r={rInner - 6} color="#101418" />
        <Circle cx={cx} cy={cy} r={rInner - 8} style="stroke" strokeWidth={2} color="#3A4248" />
        <Circle cx={cx} cy={cy} r={size * 0.09} color="#1A1C1E" />
        <Circle cx={cx} cy={cy} r={size * 0.055} color="#3A3E42" />
        <Circle cx={cx} cy={cy} r={size * 0.028} color="#C4A36A" />
        <Circle cx={cx} cy={cy - rOuter * 0.72} r={rOuter * 0.22} color="rgba(232,224,208,0.16)" />
      </Canvas>
      {Array.from({ length: count }, (_, index) => {
        const mid = (-90 + index * (360 / count) + gap / 2 + sweep / 2) * (Math.PI / 180);
        const radius = (rOuter + rInner) / 2;
        const left = cx + Math.cos(mid) * radius - 10;
        const top = cy + Math.sin(mid) * radius - 10;
        const current = index === beatIndex % count;
        return (
          <Text
            key={index}
            allowFontScaling={false}
            style={{
              position: 'absolute',
              left,
              top,
              width: 20,
              height: 20,
              textAlign: 'center',
              lineHeight: 20,
              color: index === 0 ? '#F4E4C4' : current && playing ? '#06201E' : '#D5DDE2',
              fontSize: count > 8 ? 11 : 14,
              fontWeight: '700',
            }}>
            {index + 1}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#050607',
  },
  dash: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    minHeight: 96,
  },
  dashLeft: {
    width: 92,
    gap: 6,
  },
  dashCell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tapCell: {
    width: 78,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapText: {
    color: '#F4F6FA',
    fontSize: 18,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  chip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(62,230,216,0.16)',
    backgroundColor: 'rgba(8,10,12,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipKicker: {
    color: 'rgba(220,228,236,0.46)',
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  chipValue: {
    color: '#F4F6FA',
    fontSize: 13,
    fontWeight: '700',
  },
  bpmHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    borderRadius: 8,
    backgroundColor: 'rgba(6,10,12,0.55)',
  },
  bpm: {
    color: CYAN,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  bpmCompact: {
    fontSize: 52,
  },
  marking: {
    marginTop: -6,
    color: 'rgba(62,230,216,0.72)',
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  meters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  meterPill: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.12)',
    justifyContent: 'center',
  },
  meterPillOn: {
    borderColor: CYAN,
    backgroundColor: 'rgba(62,230,216,0.12)',
  },
  meterText: {
    color: 'rgba(244,246,250,0.55)',
    fontSize: 12,
    fontWeight: '700',
  },
  meterTextOn: {
    color: CYAN,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  soundBadge: {
    position: 'absolute',
    right: 8,
    top: 12,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: 'rgba(62,230,216,0.35)',
    backgroundColor: 'rgba(8,12,14,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  soundIcon: {
    color: CYAN,
    fontSize: 14,
  },
  soundCount: {
    color: CYAN,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    maxWidth: 42,
    textAlign: 'center',
  },
  dialPlate: {
    position: 'absolute',
    backgroundColor: '#12161C',
    borderWidth: 1.25,
    borderColor: 'rgba(186,196,208,0.18)',
    borderTopColor: 'rgba(255,255,255,0.32)',
    borderLeftColor: 'rgba(255,255,255,0.16)',
    borderBottomColor: 'rgba(0,0,0,0.62)',
    shadowColor: '#000',
    shadowOpacity: 0.72,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  plateSheen: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18,22,28,0.35)',
  },
  bezel: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderBottomColor: 'rgba(0,0,0,0.42)',
    backgroundColor: 'transparent',
  },
  ringOuter: {
    position: 'absolute',
    borderWidth: 16,
    borderColor: 'rgba(22,26,32,0.96)',
  },
  ringInner: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8,10,12,0.5)',
  },
  engage: {
    position: 'absolute',
    borderWidth: 0,
    backgroundColor: 'rgba(62,230,216,0.18)',
  },
  ringWash: {
    position: 'absolute',
    borderWidth: 18,
    borderColor: 'rgba(62,230,216,0.42)',
    backgroundColor: 'transparent',
  },
  groove: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220,228,236,0.16)',
    backgroundColor: 'transparent',
  },
  tick: {
    position: 'absolute',
    backgroundColor: '#9AA6B0',
    borderRadius: 1,
  },
  knob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1A2026',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderBottomColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 5,
    zIndex: 6,
  },
  needle: {
    position: 'absolute',
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: RED,
    shadowColor: RED,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 4,
  },
  petal: {
    position: 'absolute',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    transformOrigin: 'bottom',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 3,
  },
  hub: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.58,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  hubOn: {
    borderColor: CYAN,
    backgroundColor: '#12181C',
  },
  hubText: {
    color: '#E7D3A4',
    fontSize: 16,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  hubTextOn: {
    color: CYAN,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  preset: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.12)',
    justifyContent: 'center',
  },
  presetOn: {
    borderColor: CYAN,
  },
  presetText: {
    color: 'rgba(244,246,250,0.55)',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  presetTextOn: {
    color: CYAN,
  },
});

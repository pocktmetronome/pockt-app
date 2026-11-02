import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { BAR_LAYERS, BAR_TEMPO } from '@/lib/bar-assets';
import { BAR_ACTION_MS, BAR_BEAT_ACTIONS, barActionIndex, barActionScale } from '@/lib/bar-beat-actions';
import {
  BAR_PEOPLE_BEATS,
  barBeatControlFrame,
  barBeatHitFrame,
  barBeatStripFrame,
  barChromeLayout,
  barObjectFrame,
  barTempoFaceFrame,
  barTempoFrame,
  barTempoHitFrame,
  barTempoImageLayout,
  barTempoType,
  barWorldRect,
} from '@/lib/bar-layout';
import { accentStrength, cycleBeatBlock } from '@/lib/accents';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import { sanitizeBpm } from '@/constants/timing';
import type { AccentLevel } from '@/lib/types';

type Props = {
  pulseBeat: SharedValue<number>;
  pulseAccent: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
  background: number;
  bpm: number;
  accentPattern: AccentLevel[];
  onBpmPress: () => void;
  onAccentChange: (pattern: AccentLevel[]) => void;
  onTapTempo?: () => void;
  onOpenControls?: () => void;
  onTogglePlay?: () => void;
  onVideoReady?: (ready: boolean) => void;
  safeBottom?: number;
};

function accentLevel(value: number): 0 | 1 | 2 | 3 {
  'worklet';
  if (value >= 2.5) return 3;
  if (value >= 1.5) return 2;
  if (value >= 0.5) return 1;
  return 0;
}

function BarScenePlate({
  source,
  frame,
  onReady,
}: {
  source: number;
  frame: { left: number; top: number; width: number; height: number };
  playing: boolean;
  bpm: number;
  pulseBeat: SharedValue<number>;
  pulseRole: SharedValue<number>;
  onReady?: (ready: boolean) => void;
}) {
  useEffect(() => {
    onReady?.(true);
  }, [onReady]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
      }}>
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="fill"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey="bar-background"
      />
    </View>
  );
}

function BarBeatActions({
  viewW,
  viewH,
  playing,
  pulseBeat,
  pulseAccent,
  pulseRole,
  reduceMotion,
}: {
  viewW: number;
  viewH: number;
  playing: boolean;
  pulseBeat: SharedValue<number>;
  pulseAccent: SharedValue<number>;
  pulseRole: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const playingSv = useSharedValue(playing ? 1 : 0);
  playingSv.value = playing ? 1 : 0;
  const scales = [useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1)];
  const reduceSv = useSharedValue(reduceMotion ? 1 : 0);
  reduceSv.value = reduceMotion ? 1 : 0;

  useAnimatedReaction(
    () => ({
      beat: Math.round(pulseBeat.value),
      role: pulseRole.value,
      accent: pulseAccent.value,
    }),
    (current, previous) => {
      if (playingSv.value < 0.5) return;
      if (current.role < 1) return;
      if (previous != null && previous.beat === current.beat && previous.role >= 1) return;
      const slot = barActionIndex(current.beat);
      const scale = scales[slot];
      if (!scale) return;
      const peak = barActionScale(current.accent, reduceSv.value > 0.5);
      scale.value = withSequence(
        withTiming(peak, { duration: 50, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: BAR_ACTION_MS, easing: Easing.inOut(Easing.cubic) })
      );
    }
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BAR_BEAT_ACTIONS.map((action, index) => {
        const frame = barObjectFrame(viewW, viewH, action.spec);
        return (
          <BarActionSprite key={action.id} source={action.asset} frame={frame} scale={scales[index] ?? scales[0]} />
        );
      })}
    </View>
  );
}

function BarActionSprite({
  source,
  frame,
  scale,
}: {
  source: number;
  frame: { left: number; top: number; width: number; height: number };
  scale: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
        },
        style,
      ]}>
      <Image source={source} style={StyleSheet.absoluteFillObject} contentFit="contain" cachePolicy="memory-disk" transition={0} />
    </Animated.View>
  );
}

function BarBeatDebug({ pulseBeat, playing }: { pulseBeat: SharedValue<number>; playing: boolean }) {
  const [beat, setBeat] = useState(0);
  useAnimatedReaction(
    () => Math.round(pulseBeat.value),
    (value, previous) => {
      if (value !== previous) runOnJS(setBeat)(value);
    }
  );
  if (!__DEV__ || !playing) return null;
  return (
    <View pointerEvents="none" testID="bar-beat-debug" style={styles.debugBeat}>
      <Text style={styles.debugBeatText}>{`BEAT ${((beat % 4) + 4) % 4 + 1}`}</Text>
    </View>
  );
}

function BeatStrip({
  frame,
}: {
  frame: { left: number; top: number; width: number; height: number };
}) {
  return <View pointerEvents="none" style={[styles.beatStrip, frame]} />;
}

function BeatControl({
  frame,
  beat,
  level,
}: {
  frame: { left: number; top: number; width: number; height: number };
  beat: number;
  level: 0 | 1 | 2 | 3;
}) {
  const fill = [0, 0.32, 0.58, 1][level];
  const numeral = level <= 0 ? 'rgba(196, 156, 96, 0.55)' : 'rgba(246, 226, 186, 0.96)';
  return (
    <View pointerEvents="none" style={[styles.beatControl, frame]}>
      {level >= 3 ? (
        <View style={[styles.beatFill, StyleSheet.absoluteFillObject]} />
      ) : fill > 0 ? (
        <View style={[styles.beatFill, { height: `${Math.round(fill * 100)}%` }]} />
      ) : null}
      <Text style={[styles.beatNumeral, { color: numeral, fontSize: Math.round(frame.width * 0.42) }]} allowFontScaling={false}>
        {beat}
      </Text>
    </View>
  );
}

function TempoBlock({
  frame,
  face,
  bpm,
  pulseBeat,
  pulseAccent,
  pulseRole,
  playingSv,
  gainSv,
  playing,
}: {
  frame: { left: number; top: number; width: number; height: number };
  face: { left: number; top: number; width: number; height: number };
  bpm: number;
  pulseBeat: SharedValue<number>;
  pulseAccent: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playingSv: SharedValue<number>;
  gainSv: SharedValue<number>;
  playing: boolean;
}) {
  const glow = useSharedValue(0);
  const safeBpm = sanitizeBpm(bpm);
  const type = barTempoType(face.width, face.height, safeBpm);

  useEffect(() => {
    if (playing) return;
    glow.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [glow, playing]);

  useAnimatedReaction(
    () => ({
      beat: Math.round(pulseBeat.value),
      role: pulseRole.value,
      accent: pulseAccent.value,
    }),
    (current, previous) => {
      if (playingSv.value <= 0 || gainSv.value <= 0) return;
      if (current.role < 1) return;
      const level = accentLevel(current.accent);
      if (level <= 0) return;
      const fresh = previous == null || previous.beat !== current.beat || previous.role < 1;
      if (!fresh) return;
      if (level >= 2) {
        glow.value = withSequence(
          withTiming([0, 0, 0.18, 0.28][level], { duration: 70, easing: Easing.out(Easing.cubic) }),
          withTiming(0.04, { duration: 240, easing: Easing.inOut(Easing.cubic) })
        );
      }
    }
  );

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value,
  }));
  const image = barTempoImageLayout(frame);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
        overflow: 'hidden',
        borderRadius: 6,
      }}>
      <Image
        source={BAR_TEMPO}
        style={{
          position: 'absolute',
          left: image.left,
          top: image.top,
          width: image.width,
          height: image.height,
        }}
        contentFit="fill"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="bar-tempo-block"
      />
      <Animated.View
        style={[
          {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(168, 112, 48, 0.12)',
          },
          glowStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
        }}>
        <Text
          style={[styles.tempoValue, { fontSize: type.bpmSize, lineHeight: type.bpmSize + 1 }]}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}>
          {type.text}
        </Text>
        <Text style={[styles.tempoUnit, { fontSize: type.unitSize }]} allowFontScaling={false}>
          BPM
        </Text>
      </View>
    </View>
  );
}

export function BarSkin({
  pulseBeat,
  pulseAccent,
  pulseRole,
  playing,
  visualPulse,
  motionGain,
  background,
  bpm,
  accentPattern,
  onBpmPress,
  onAccentChange,
  onTapTempo,
  onOpenControls,
  onTogglePlay,
  onVideoReady,
  safeBottom = 8,
}: Props) {
  const tap = useClassicTapReaction(onTapTempo ?? (() => undefined));
  const [view, setView] = useState({ width: 0, height: 0 });
  const playingSv = useSharedValue(playing ? 1 : 0);
  const gainSv = useSharedValue(visualPulse ? motionGain : 0);
  const light = useSharedValue(0.2);
  const reflection = useSharedValue(0.18);

  playingSv.value = playing ? 1 : 0;
  gainSv.value = visualPulse ? motionGain : 0;

  useEffect(() => {
    if (playing) return;
    light.value = withTiming(0.2, { duration: 180, easing: Easing.out(Easing.cubic) });
    reflection.value = withTiming(0.16, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [light, playing, reflection]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    if (width === view.width && height === view.height) return;
    setView({ width, height });
  };

  useAnimatedReaction(
    () => ({
      beat: Math.round(pulseBeat.value),
      role: pulseRole.value,
      accent: pulseAccent.value,
    }),
    (current, previous) => {
      if (playingSv.value <= 0 || gainSv.value <= 0) return;
      if (current.role < 1) return;
      const level = accentLevel(current.accent);
      if (level <= 0) return;
      const fresh = previous == null || previous.beat !== current.beat || previous.role < 1;
      if (!fresh) return;
      const lightPeak = current.role >= 1.5 ? (level >= 3 ? 0.28 : 0.24) : 0.21;
      const reflPeak = current.role >= 1.5 ? (level >= 3 ? 0.3 : 0.22) : 0.17;
      light.value = withSequence(
        withTiming(lightPeak, { duration: 70, easing: Easing.out(Easing.cubic) }),
        withTiming(0.2, { duration: 240, easing: Easing.inOut(Easing.cubic) })
      );
      reflection.value = withSequence(
        withTiming(reflPeak, { duration: 80, easing: Easing.out(Easing.cubic) }),
        withTiming(0.16, { duration: 260, easing: Easing.inOut(Easing.cubic) })
      );
    }
  );

  const lightStyle = useAnimatedStyle(() => ({ opacity: light.value }));
  const reflectionStyle = useAnimatedStyle(() => ({ opacity: reflection.value }));
  const world = view.width > 0 ? barWorldRect(view.width, view.height) : null;
  const chrome = view.width > 0 ? barChromeLayout(view.width, view.height, safeBottom) : null;

  const cycleBeat = (index: number) => {
    const current = accentPattern[index] ?? 'normal';
    const nextLevel = cycleBeatBlock(current);
    const next = [...accentPattern];
    next[index] = nextLevel;
    const strength = accentStrength(nextLevel);
    if (strength === 0) void hapticLight();
    else if (strength === 1) void hapticSelection();
    else if (strength === 2) void hapticMedium();
    else void hapticHeavy();
    onAccentChange(next);
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.fill]} pointerEvents="box-none" onLayout={onLayout}>
      {world ? (
        <>
          <BarScenePlate
            source={background}
            frame={{ left: world.x, top: world.y, width: world.w, height: world.h }}
            playing={playing}
            bpm={bpm}
            pulseBeat={pulseBeat}
            pulseRole={pulseRole}
            onReady={onVideoReady}
          />
          {view.width > 0 ? (
            <BarBeatActions
              viewW={view.width}
              viewH={view.height}
              playing={playing}
              pulseBeat={pulseBeat}
              pulseAccent={pulseAccent}
              pulseRole={pulseRole}
              reduceMotion={motionGain < 0.55}
            />
          ) : null}
          <BarBeatDebug pulseBeat={pulseBeat} playing={playing} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: world.x,
              top: world.y,
              width: world.w,
              height: world.h,
            }}>
            <Animated.View style={[StyleSheet.absoluteFillObject, lightStyle]}>
              <Image
                source={BAR_LAYERS.warmLight}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
                cachePolicy="memory-disk"
                transition={0}
                recyclingKey="bar-warm-light"
              />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFillObject, reflectionStyle]}>
              <Image
                source={BAR_LAYERS.brassReflection}
                style={StyleSheet.absoluteFillObject}
                contentFit="fill"
                cachePolicy="memory-disk"
                transition={0}
                recyclingKey="bar-brass-reflection"
              />
            </Animated.View>
            <Image
              source={BAR_LAYERS.brassLip}
              style={StyleSheet.absoluteFillObject}
              contentFit="fill"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey="bar-brass-lip"
            />
          </View>
        </>
      ) : null}

      {view.width > 0 ? <BeatStrip frame={barBeatStripFrame(view.width, view.height)} /> : null}

      {view.width > 0
        ? BAR_PEOPLE_BEATS.map((spec, index) => {
            const level = accentStrength(accentPattern[index] ?? 'normal');
            return (
              <BeatControl
                key={spec.id}
                frame={barBeatControlFrame(view.width, view.height, index)}
                beat={spec.beat}
                level={level}
              />
            );
          })
        : null}

      {view.width > 0 ? (
        <TempoBlock
          frame={barTempoFrame(view.width, view.height)}
          face={barTempoFaceFrame(view.width, view.height)}
          bpm={bpm}
          pulseBeat={pulseBeat}
          pulseAccent={pulseAccent}
          pulseRole={pulseRole}
          playingSv={playingSv}
          gainSv={gainSv}
          playing={playing}
        />
      ) : null}

      {view.width > 0
        ? BAR_PEOPLE_BEATS.map((spec, index) => {
            const level = accentStrength(accentPattern[index] ?? 'normal');
            const hit = barBeatHitFrame(view.width, view.height, index);
            return (
              <Pressable
                key={`${spec.id}-hit`}
                onPress={() => cycleBeat(index)}
                accessibilityRole="button"
                accessibilityLabel={`Beat ${spec.beat} ${spec.name}, level ${level}`}
                style={{
                  position: 'absolute',
                  left: hit.left,
                  top: hit.top,
                  width: hit.width,
                  height: hit.height,
                }}
              />
            );
          })
        : null}

      {view.width > 0
        ? (() => {
            const hit = barTempoHitFrame(view.width, view.height);
            return (
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  onBpmPress();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Tempo ${sanitizeBpm(bpm)} beats per minute. Tap to edit.`}
                style={{
                  position: 'absolute',
                  left: hit.left,
                  top: hit.top,
                  width: hit.width,
                  height: hit.height,
                }}
              />
            );
          })()
        : null}

      {chrome && onTapTempo && onOpenControls && onTogglePlay ? (
        <>
          <Pressable
            onPress={(event) => tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
            accessibilityRole="button"
            accessibilityLabel="Tap tempo"
            testID="bar-tap"
            style={({ pressed }) => [styles.chromeBtn, chrome.tap, pressed && { opacity: 0.82 }]}>
            <SparkField field={tap.sparks} />
            <Text style={styles.chromeLabel}>TAP</Text>
          </Pressable>
          <Pressable
            onPress={onOpenControls}
            accessibilityRole="button"
            accessibilityLabel="Controls"
            testID="bar-controls"
            style={({ pressed }) => [styles.chromeBtn, chrome.controls, pressed && { opacity: 0.82 }]}>
            <Text style={styles.chromeLabel}>CONTROLS</Text>
          </Pressable>
          <Pressable
            onPress={onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Stop' : 'Play'}
            testID="bar-play"
            style={({ pressed }) => [styles.chromePlay, chrome.play, playing && styles.chromePlayOn, pressed && { opacity: 0.82 }]}>
            <Text style={styles.chromePlayLabel}>{playing ? 'STOP' : 'PLAY'}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: '#0A0705',
  },
  beatStrip: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'rgba(8, 5, 3, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(176, 122, 58, 0.55)',
  },
  beatControl: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 99,
    borderWidth: 2,
    borderColor: 'rgba(214, 168, 96, 0.92)',
    backgroundColor: 'rgba(12, 8, 5, 0.92)',
  },
  beatFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(214, 160, 78, 0.94)',
  },
  beatNumeral: {
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(10, 6, 3, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tempoValue: {
    color: '#E6C48A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(22, 10, 4, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  chromeBtn: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214, 168, 96, 0.72)',
    backgroundColor: 'rgba(16, 10, 6, 0.72)',
  },
  chromeLabel: {
    color: '#F0E0C4',
    fontSize: 12,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  debugBeat: {
    position: 'absolute',
    right: 12,
    top: 12,
    minWidth: 64,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(12, 8, 6, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230, 196, 138, 0.45)',
  },
  debugBeatText: {
    color: '#E6C48A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  chromePlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 140, 0.7)',
    backgroundColor: 'rgba(24, 14, 8, 0.78)',
  },
  chromePlayOn: {
    borderColor: 'rgba(232, 200, 140, 0.92)',
  },
  chromePlayLabel: {
    color: '#F6E8C8',
    fontSize: 15,
    letterSpacing: 2.6,
    fontWeight: '800',
  },
  tempoUnit: {
    marginTop: 0,
    color: '#B07A3C',
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '800',
  },
});

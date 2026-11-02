import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { HardwareKey, HardwarePlay } from '@/components/classic/ClassicHardware';
import { controlStepDetent, rotaryDetent } from '@/lib/rotary-feedback';
import { ClassicParam, ClassicParamRow, ClassicRule } from '@/components/classic/ClassicChrome';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import { resolveBpmFont, resolveBpmFontSize } from '@/constants/display';
import { TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { accentStrength, cycleAccent } from '@/lib/accents';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';

const TICKS = 60;

/**
 * RETIRED View. Not hosted. Do not re-wire into ClassicInstrumentHost or the selector.
 */
export function PulseCircleRoom({
  config,
  prefs,
  compact,
  playing,
  transport,
  pulse,
  pulseRole,
  setBpm,
  toggle,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenPresets,
  onHapticToggle,
  onChangeAccents,
}: ClassicInstrumentProps) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(compact ? 276 : 312, Math.round(width * 0.78), Math.round(height * 0.4));
  const safeBpm = sanitizeBpm(config.bpm);
  const font = resolveBpmFont(prefs.bpmFont);
  const fontSize = Math.min(resolveBpmFontSize(prefs.bpmSize, size, height), Math.round(size * 0.3));
  const beats = TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4;
  const liveBpm = useSharedValue(safeBpm);
  const originBpm = useSharedValue(safeBpm);
  liveBpm.value = safeBpm;

  const commit = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm);
      if (safe === safeBpm) return;
      rotaryDetent('dial', true, true);
      setBpm(safe);
    },
    [safeBpm, setBpm]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onBegin(() => {
          originBpm.value = liveBpm.value;
        })
        .onUpdate((event) => {
          const raw = originBpm.value - (config.wheelInvert ? -event.translationY : event.translationY) / 10;
          const next = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(raw)));
          if (next === liveBpm.value) return;
          liveBpm.value = next;
          runOnJS(commit)(next);
        }),
    [commit, config.wheelInvert, liveBpm, originBpm]
  );

  const ringStyle = useAnimatedStyle(() => {
    const down = pulseRole.value >= 1.5;
    const energy = interpolate(pulse.value, [0, 1], [0.18, down ? 0.96 : 0.58]);
    const scale = interpolate(pulse.value, [0, 1], [1, down ? 1.028 : 1.014]);
    return {
      opacity: playing ? 0.22 + energy * 0.78 : 0.2,
      transform: [{ scale }],
    };
  });

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0, pulseRole.value >= 1.5 ? 0.2 : 0.08]),
  }));

  const tap = useClassicTapReaction(tapTempo);
  return (
    <View style={styles.root}>
      <SparkField field={tap.sparks} />
      <Pressable onPress={onOpenTime} style={styles.meterHit}>
        <Text style={styles.meter}>{config.timeSignature}</Text>
      </Pressable>

      <GestureDetector gesture={gesture}>
        <View style={[styles.circle, { width: size, height: size }]}>
          <LinearGradient
            colors={['#2A2E34', '#121418', '#0A0C0E']}
            style={[StyleSheet.absoluteFillObject, styles.chassis]}
          />
          <View style={styles.outerBevel} />
          <View style={styles.innerWell} />
          {Array.from({ length: TICKS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.tick,
                i % 5 === 0 ? styles.tickMajor : styles.tickMinor,
                {
                  transform: [{ rotate: `${(i / TICKS) * 360}deg` }, { translateY: -(size * 0.455) }],
                },
              ]}
            />
          ))}
          {Array.from({ length: beats }, (_, i) => {
            const level = config.accentPattern[i] ?? 'normal';
            const strength = accentStrength(level);
            const active = playing && transport.beatIndex === i && !transport.silentMeasure;
            const angle = (i / beats) * 360 - 90;
            const fill =
              strength === 0
                ? 'transparent'
                : active
                  ? '#8FD0FF'
                  : strength === 3
                    ? 'rgba(143,208,255,0.95)'
                    : strength === 2
                      ? 'rgba(74,160,232,0.82)'
                      : 'rgba(90,140,180,0.4)';
            return (
              <Pressable
                key={`beat-${i}`}
                onPress={() => {
                  const next = [...config.accentPattern];
                  const nextLevel = cycleAccent(level);
                  next[i] = nextLevel;
                  const nextStrength = accentStrength(nextLevel);
                  if (nextStrength === 0) void hapticLight();
                  else if (nextStrength === 1) void hapticSelection();
                  else void hapticMedium();
                  onChangeAccents(next);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Beat ${i + 1}`}
                style={[
                  styles.pipSlot,
                  { transform: [{ rotate: `${angle}deg` }, { translateX: size * 0.36 }] },
                ]}>
                <View
                  style={[
                    styles.pip,
                    {
                      backgroundColor: fill,
                      borderWidth: strength === 0 ? 1.5 : 0,
                      borderColor: 'rgba(90,140,180,0.55)',
                      opacity: strength === 0 ? 0.7 : 1,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
          <Animated.View pointerEvents="none" style={[styles.pulseRing, ringStyle]} />
          <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} />
          <Pressable
            onPress={onOpenPad}
            accessibilityRole="button"
            accessibilityLabel={`Tempo ${safeBpm} beats per minute. Tap to enter BPM.`}
            style={styles.bpmHit}>
            <Text
              style={[
                styles.bpm,
                {
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.02),
                  fontWeight: font.fontWeight,
                  letterSpacing: font.letterSpacing,
                  ...(font.fontFamily ? { fontFamily: font.fontFamily } : { fontVariant: ['tabular-nums'] as const }),
                },
              ]}
              numberOfLines={1}
              allowFontScaling={false}>
              {safeBpm}
            </Text>
            <Text style={styles.unit}>BPM</Text>
          </Pressable>
        </View>
      </GestureDetector>

      <View style={styles.transport}>
        <HardwareKey
          label="−"
          accessibilityLabel="Decrease tempo"
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, -1));
          }}
        />
        <HardwareKey
          label="TAP"
          accessibilityLabel="Tap tempo"
          onPress={(event) => tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        />
        <HardwarePlay playing={playing} onPress={toggle} size={compact ? 68 : 76} />
        <HardwareKey
          label="+"
          accessibilityLabel="Increase tempo"
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, 1));
          }}
        />
      </View>

      <ClassicParamRow>
        <ClassicParam label="TIME" value={config.timeSignature} onPress={onOpenTime} />
        <ClassicRule />
        <ClassicParam label="DIVISION" value={subdivisionCaption(config.subdivision)} onPress={onOpenDivision} />
        <ClassicRule />
        <ClassicParam label="SOUND" value={SOUNDS[resolvePlayableSound(config.sound)].label} onPress={onOpenSound} />
      </ClassicParamRow>
      <View style={styles.utils}>
        <Pressable onPress={onHapticToggle} style={({ pressed }) => [styles.util, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.utilText, config.haptic && styles.utilOn]}>{config.haptic ? 'HAPTIC' : 'HAPTIC OFF'}</Text>
        </Pressable>
        <Pressable onPress={onOpenPresets} style={({ pressed }) => [styles.util, pressed && { opacity: 0.8 }]}>
          <Text style={styles.utilText}>PRESETS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  meterHit: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  meter: {
    color: 'rgba(232,220,200,0.62)',
    fontSize: 15,
    letterSpacing: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  circle: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chassis: {
    borderRadius: 999,
  },
  outerBevel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(180,190,200,0.16)',
  },
  innerWell: {
    position: 'absolute',
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
    borderRadius: 999,
    backgroundColor: '#0A0C0E',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.55)',
  },
  tick: {
    position: 'absolute',
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(160,180,200,0.22)',
  },
  tickMajor: {
    height: 9,
    backgroundColor: 'rgba(190,210,230,0.42)',
  },
  tickMinor: {
    height: 4,
  },
  pipSlot: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(90,140,180,0.28)',
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(80, 168, 255, 0.82)',
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(70, 150, 230, 0.16)',
  },
  bpmHit: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 146,
    minHeight: 120,
    zIndex: 2,
  },
  bpm: {
    color: '#F6F3EC',
    textAlign: 'center',
    includeFontPadding: false,
  },
  unit: {
    marginTop: 2,
    color: 'rgba(200,210,220,0.45)',
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '700',
  },
  tapCue: {
    marginTop: 6,
    color: 'rgba(126,200,255,0.72)',
    fontSize: 12,
    letterSpacing: 3.6,
    fontWeight: '800',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginVertical: 8,
  },
  utils: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  util: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilText: {
    color: 'rgba(200,210,220,0.48)',
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  utilOn: {
    color: '#F6F3EC',
  },
});

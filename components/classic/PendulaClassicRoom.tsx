import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MechanicalOptionsSheet } from '@/components/classic/MechanicalOptionsSheet';
import { InstrumentBeatStrip } from '@/components/instrument/InstrumentBeatStrip';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { SUBDIVISIONS } from '@/constants/meter';
import { MECHANICAL_MAX_BPM, MECHANICAL_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { MECHANICAL_WALNUT_STUDIO } from '@/lib/classic-assets';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { shouldEmitControlDetent } from '@/lib/control-detent';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import { mechanicalBpmFromWeightT, mechanicalWeightT } from '@/lib/mechanical-scale';
import { mechanicalRodLayout, weightTopFromT } from '@/lib/mechanical-plate';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
  import {
  buttonStartSeed,
  classifyPendulumPointer,
  mechanicalInvariantBroken,
  PENDULUM_MODE,
  repairMechanicalMode,
  travelSignFromDelta,
} from '@/lib/pendulum-handoff';
import { seedPhaseFromAngle } from '@/lib/pendulum-motion';
import {
  horizontalAngleFromDrag,
  lockPendulumAxis,
  PENDULUM_AXIS_THRESHOLD,
  PENDULUM_MAX_DEG,
  PENDULUM_RELEASE_START_PX,
  releaseShouldStart,
  type PendulumAxis,
} from '@/lib/pendulum-gesture';
import { controlStepDetent, rotaryDetent } from '@/lib/rotary-feedback';
import { tempoName } from '@/lib/tempo-name';
import PocktTiming from '@/modules/pockt-timing';

const LAYERS = {
  background: 1,
  body: 2,
  pendulum: 8,
  hit: 9,
  controls: 12,
} as const;

const SWING_DEG = PENDULUM_MAX_DEG;

export function PendulaClassicRoom({
  config,
  compact,
  playing,
  transport,
  pulse,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  setBpm,
  toggle,
  stop,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenSettings,
  onHapticToggle,
  onChangeAccents,
}: ClassicInstrumentProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [plateSize, setPlateSize] = useState({ w: width, h: height });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const safeBpm = sanitizeBpm(config.bpm, config.bpm, MECHANICAL_MIN_BPM, MECHANICAL_MAX_BPM);
  const bpmSize = Math.round(Math.min(72, Math.max(56, width * 0.155)));
  const stepInset = Math.max(16, insets.left, insets.right);
  const geo = useMemo(() => mechanicalRodLayout(plateSize.w, plateSize.h), [plateSize.h, plateSize.w]);
  const held = useSharedValue(0);
  const wasPlaying = useSharedValue(0);
  const reduceSv = useSharedValue(0);
  const mode = useSharedValue<number>(PENDULUM_MODE.stopped);
  const seedElapsed = useSharedValue<number>(0);
  const phaseOffset = useSharedValue<number>(0);
  const angle = usePendulumPhase(
    playing,
    safeBpm,
    pulse,
    SWING_DEG,
    true,
    pulseBeat,
    held,
    mode,
    seedElapsed,
    phaseOffset,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const weightT = useSharedValue(mechanicalWeightT(safeBpm));
  const originWeight = useSharedValue(mechanicalWeightT(safeBpm));
  const originAngle = useSharedValue(0);
  const axis = useSharedValue<PendulumAxis>('none');
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const playingSv = useSharedValue(playing ? 1 : 0);
  const tapReaction = useClassicTapReaction(tapTempo);
  const startArmed = useRef(false);
  const lastTravel = useSharedValue(-1);
  const lastDetentAt = useRef(0);
  const previousBpm = useRef<number | null>(safeBpm);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    reduceSv.value = reduceMotion ? 1 : 0;
  }, [reduceMotion, reduceSv]);

  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
  }, [playing, playingSv]);

  useEffect(() => {
    if (safeBpm !== config.bpm) setBpm(safeBpm);
  }, [config.bpm, safeBpm, setBpm]);

  useEffect(() => {
    weightT.value = mechanicalWeightT(safeBpm);
    previousBpm.current = safeBpm;
  }, [safeBpm, weightT]);

  const rodStyle = useAnimatedStyle(() => ({
    transformOrigin: 'bottom',
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  const bobStyle = useAnimatedStyle(() => ({
    top: weightTopFromT(weightT.value, geo.rodHeight, geo.weightHeight),
  }));

  const commitBpm = useCallback(
    (next: number, manual: boolean) => {
      const safe = sanitizeBpm(next, safeBpm, MECHANICAL_MIN_BPM, MECHANICAL_MAX_BPM);
      if (safe === safeBpm) return;
      if (manual) {
        const decision = shouldEmitControlDetent({
          dragging: true,
          previousBpm: previousBpm.current,
          nextBpm: safe,
          now: Date.now(),
          lastEmitAt: lastDetentAt.current,
        });
        lastDetentAt.current = decision.lastEmitAt;
        if (decision.emit) {
          rotaryDetent('roller', sensoryFlags(config.sensoryMode).audio, effectiveHaptic(config));
        }
      }
      previousBpm.current = safe;
      setBpm(safe);
    },
    [config, safeBpm, setBpm]
  );

  const commitFromWeight = useCallback(
    (t: number) => {
      commitBpm(mechanicalBpmFromWeightT(t), true);
    },
    [commitBpm]
  );

  const haltPlayback = useCallback(() => {
    if (playingRef.current) {
      mode.value = PENDULUM_MODE.manualDragging;
      stop();
    }
  }, [mode, stop]);

  const startClock = useCallback(
    (fromAngle: number, travelSign = -1, asTap = false) => {
      if (startArmed.current) return;
      startArmed.current = true;
      held.value = 0;
      if (asTap) {
        angle.value = 0;
        const seed = buttonStartSeed();
        seedElapsed.value = seed.elapsed;
        phaseOffset.value = seed.phaseOffset;
        PocktTiming?.armPendulumStartSilent?.(0);
      } else {
        const seed = seedPhaseFromAngle(fromAngle, SWING_DEG, travelSign);
        seedElapsed.value = seed.beatIndex + seed.beatPhase;
        phaseOffset.value = seed.beatIndex;
        PocktTiming?.armPendulumStartSilent?.(0);
      }
      mode.value = PENDULUM_MODE.starting;
      if (!playingRef.current) toggle();
      requestAnimationFrame(() => {
        startArmed.current = false;
      });
    },
    [angle, held, mode, phaseOffset, seedElapsed, toggle]
  );

  const startFromRelease = useCallback(
    (fromAngle: number, travelSign: number) => {
      startClock(fromAngle, travelSign, false);
    },
    [startClock]
  );

  const startFromButton = useCallback(() => {
    startClock(0, -1, true);
  }, [startClock]);

  const stopAndSettle = useCallback(() => {
    mode.value = PENDULUM_MODE.settling;
    if (playingRef.current) stop();
  }, [mode, stop]);

  useEffect(() => {
    if (held.value > 0.5) return;
    if (playing && mode.value === PENDULUM_MODE.stopped) {
      mode.value = PENDULUM_MODE.clockDriven;
    }
    if (mechanicalInvariantBroken(playing, mode.value, false)) {
      mode.value = repairMechanicalMode(playing, mode.value, false);
    }
  }, [held, mode, playing]);

  const handlePendulumTap = useCallback(() => {
    held.value = 0;
    if (playingRef.current) {
      stopAndSettle();
      return;
    }
    startFromButton();
  }, [held, startFromButton, stopAndSettle]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(PENDULUM_AXIS_THRESHOLD)
        .maxPointers(1)
        .onBegin(() => {
          axis.value = 'none';
          originWeight.value = weightT.value;
          originAngle.value = angle.value;
          wasPlaying.value = playingSv.value;
        })
        .onUpdate((event) => {
          if (classifyPendulumPointer(event.translationX, event.translationY, PENDULUM_RELEASE_START_PX) === 'tap') return;
          const nextAxis = axis.value === 'none' ? lockPendulumAxis(event.translationX, event.translationY) : axis.value;
          if (nextAxis === 'none') return;
          if (axis.value === 'none' && nextAxis === 'horizontal') {
            held.value = 1;
            mode.value = PENDULUM_MODE.manualDragging;
            runOnJS(haltPlayback)();
          }
          axis.value = nextAxis;
          if (nextAxis === 'vertical') {
            const nextT = Math.min(
              0.92,
              Math.max(0.08, originWeight.value + (config.wheelInvert ? -event.translationY : event.translationY) / geo.rodHeight)
            );
            weightT.value = nextT;
            runOnJS(commitFromWeight)(nextT);
            return;
          }
          lastTravel.value = travelSignFromDelta(event.translationX, lastTravel.value);
          angle.value = horizontalAngleFromDrag(event.translationX, plateSize.w, SWING_DEG, originAngle.value);
        })
        .onFinalize((event) => {
          const intent = classifyPendulumPointer(event.translationX, event.translationY, PENDULUM_RELEASE_START_PX);
          held.value = 0;
          if (intent === 'tap') {
            axis.value = 'none';
            runOnJS(handlePendulumTap)();
            return;
          }
          const locked = axis.value === 'none' ? lockPendulumAxis(event.translationX, event.translationY) : axis.value;
          if (locked === 'vertical') {
            axis.value = 'none';
            if (playingSv.value >= 0.5) mode.value = PENDULUM_MODE.clockDriven;
            return;
          }
          const shouldStart = releaseShouldStart(locked, event.translationX);
          const visible = angle.value;
          const travel = travelSignFromDelta(event.translationX, lastTravel.value);
          axis.value = 'none';
          if (shouldStart) {
            lastTravel.value = travel;
            mode.value = PENDULUM_MODE.starting;
            runOnJS(startFromRelease)(visible, travel);
            return;
          }
          if (reduceSv.value > 0.5) {
            angle.value = 0;
          }
          if (locked !== 'none' && playingSv.value < 0.5) {
            mode.value = PENDULUM_MODE.settling;
          }
        }),
    [
      angle,
      axis,
      commitFromWeight,
      config.wheelInvert,
      geo.rodHeight,
      haltPlayback,
      handlePendulumTap,
      held,
      mode,
      originAngle,
      originWeight,
      plateSize.w,
      playingSv,
      reduceSv,
      lastTravel,
      startFromRelease,
      wasPlaying,
      weightT,
    ]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(280)
        .maxDistance(PENDULUM_RELEASE_START_PX)
        .onEnd(() => {
          runOnJS(handlePendulumTap)();
        }),
    [handlePendulumTap]
  );

  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const step = (delta: number) => {
    controlStepDetent(sensoryFlags(config.sensoryMode).audio, effectiveHaptic(config));
    commitBpm(nudgeBpm(safeBpm, delta), true);
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(8, insets.bottom * 0.15) }]} testID="mechanical-stage">
      <View
        pointerEvents="box-none"
        style={styles.plateHost}
        testID="mechanical-layers"
        onLayout={(event) => {
          const next = { w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height };
          if (next.w === plateSize.w && next.h === plateSize.h) return;
          setPlateSize(next);
        }}>
        <View pointerEvents="none" style={[styles.bleed, { zIndex: LAYERS.background, backgroundColor: '#140E08' }]} />
        <Image
          pointerEvents="none"
          source={MECHANICAL_WALNUT_STUDIO}
          style={[styles.bleed, { zIndex: LAYERS.body }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey="mechanical-walnut-studio"
          testID="mechanical-studio-plate"
        />

        <Animated.View
          pointerEvents="none"
          testID="mechanical-pendulum"
          style={[
            styles.rodWrap,
            {
              zIndex: LAYERS.pendulum,
              elevation: LAYERS.pendulum,
              left: geo.pivotX - 28,
              top: geo.pivotY - geo.rodHeight,
              height: geo.rodHeight,
              width: 56,
            },
            rodStyle,
          ]}>
          <LinearGradient
            colors={['#F4F7FB', '#C5CCD4', '#8E959E', '#E8EEF4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.rod, { width: geo.rodWidth }]}
          />
          <Animated.View
            testID="mechanical-weight"
            style={[
              styles.weight,
              {
                width: geo.weightWidth,
                height: geo.weightHeight,
                left: 28 - geo.weightWidth / 2,
              },
              bobStyle,
            ]}>
            <LinearGradient colors={['#F7F4EE', '#C8C2B6', '#8F897E', '#EDE8DF']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.weightSlot} />
          </Animated.View>
        </Animated.View>

        <GestureDetector gesture={gesture}>
          <View
            testID="mechanical-pendulum-hit"
            accessibilityLabel="Pendulum. Double tap to start or stop."
            style={[
              styles.pendulumHit,
              {
                zIndex: LAYERS.hit,
                left: geo.hitLeft,
                top: geo.hitTop,
                width: geo.hitWidth,
                height: geo.hitHeight,
              },
            ]}
          />
        </GestureDetector>
      </View>

      <View style={[styles.topBlock, { paddingHorizontal: stepInset }]} pointerEvents="box-none">
        <View style={styles.tempoRow}>
          <Pressable
            onPress={() => step(-1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease tempo"
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
            <Text style={styles.stepGlyph}>−</Text>
          </Pressable>
          <Pressable
            onPress={onOpenPad}
            accessibilityRole="button"
            accessibilityLabel={`Tempo ${safeBpm} ${tempoName(safeBpm)}. Tap to enter BPM.`}
            style={styles.tempoHit}>
            <Text style={[styles.marking, compact && { fontSize: 15 }]} allowFontScaling={false}>
              {tempoName(safeBpm).toUpperCase()}
            </Text>
            <Text style={[styles.bpm, { fontSize: compact ? 56 : bpmSize }]} allowFontScaling={false} testID="mechanical-bpm">
              {safeBpm}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => step(1)}
            accessibilityRole="button"
            accessibilityLabel="Increase tempo"
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
            <Text style={styles.stepGlyph}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingHorizontal: stepInset }]} pointerEvents="box-none">
        <InstrumentBeatStrip
          timeSignature={config.timeSignature}
          beatIndex={transport.beatIndex}
          playing={playing}
          silent={transport.silentMeasure}
          accentPattern={config.accentPattern}
          onChange={onChangeAccents}
          onOpenEditor={onOpenAccents}
          compact
        />
        <Pressable
          onPress={() => {
            if (playing) {
              stopAndSettle();
              return;
            }
            startFromButton();
          }}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Stop' : 'Start'}
          style={({ pressed }) => [styles.start, playing && styles.startOn, pressed && styles.pressed]}>
          <Text style={styles.startText}>{playing ? 'STOP' : 'START'}</Text>
        </Pressable>
        <View style={styles.optionRow}>
          <Pressable
            onPress={() => setOptionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Options"
            testID="mechanical-options"
            style={({ pressed }) => [styles.options, pressed && styles.pressed]}>
            <View style={styles.gearRing} />
            <View style={styles.gearHub} />
            <Text style={styles.optionsLabel}>OPTIONS</Text>
          </Pressable>
          <Pressable
            onPress={(event) => tapReaction.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
            accessibilityRole="button"
            accessibilityLabel="Tap tempo"
            testID="mechanical-tap"
            style={({ pressed }) => [styles.tapBtn, pressed && styles.pressed]}>
            <SparkField field={tapReaction.sparks} />
            <Text style={styles.tapLabel}>TAP</Text>
          </Pressable>
        </View>
      </View>

      <MechanicalOptionsSheet
        visible={optionsOpen}
        haptic={config.haptic}
        timeLabel={config.timeSignature}
        subLabel={SUBDIVISIONS[config.subdivision].short}
        soundLabel={SOUNDS[resolvePlayableSound(config.sound)].label}
        onHaptic={onHapticToggle}
        onOpenTime={onOpenTime}
        onOpenDivision={onOpenDivision}
        onOpenSound={onOpenSound}
        onOpenMix={() => {
          setOptionsOpen(false);
          onOpenSettings();
        }}
        onClose={() => setOptionsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#140E08',
  },
  plateHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  bleed: {
    ...StyleSheet.absoluteFillObject,
  },
  rodWrap: {
    position: 'absolute',
    alignItems: 'center',
    transformOrigin: 'bottom',
    overflow: 'visible',
  },
  rod: {
    flex: 1,
    borderRadius: 2,
  },
  weight: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  weightSlot: {
    position: 'absolute',
    top: '22%',
    bottom: '22%',
    left: '42%',
    width: 5,
    borderRadius: 2,
    backgroundColor: 'rgba(20,16,12,0.55)',
  },
  pendulumHit: {
    position: 'absolute',
    overflow: 'visible',
  },
  topBlock: {
    zIndex: LAYERS.controls,
    elevation: LAYERS.controls,
    paddingTop: 2,
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tempoHit: {
    minWidth: 148,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(12,8,4,0.38)',
  },
  marking: {
    color: 'rgba(244,230,200,0.72)',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2.4,
    textAlign: 'center',
  },
  bpm: {
    color: '#F6E8C8',
    fontWeight: '600',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  step: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.34)',
    backgroundColor: 'rgba(20,12,8,0.42)',
  },
  stepGlyph: {
    color: '#F6E8C8',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
    gap: 10,
    zIndex: LAYERS.controls,
    elevation: LAYERS.controls,
  },
  start: {
    minWidth: 176,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,14,8,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.4)',
  },
  startOn: {
    borderColor: 'rgba(232,200,140,0.72)',
  },
  startText: {
    color: '#F6E8C8',
    fontSize: 16,
    letterSpacing: 3,
    fontWeight: '800',
  },
  optionRow: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  options: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.34)',
    backgroundColor: 'rgba(20,12,8,0.5)',
  },
  optionsLabel: {
    color: '#F0E0C4',
    fontSize: 12,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  tapBtn: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    overflow: 'hidden',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,200,140,0.34)',
    backgroundColor: 'rgba(20,12,8,0.5)',
  },
  tapLabel: {
    color: '#F0E0C4',
    fontSize: 12,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  gearRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(232,200,140,0.78)',
  },
  gearHub: {
    position: 'absolute',
    left: 20,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(232,200,140,0.78)',
  },
  pressed: {
    opacity: 0.82,
  },
});

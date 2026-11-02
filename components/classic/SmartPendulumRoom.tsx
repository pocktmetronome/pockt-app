import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilityInfo, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { proofFlags } from '@/lib/proof-flags';

const ARM_PHOTO = require('@/assets/pendulum-hardware/arm.png');
const MASS_PHOTO = require('@/assets/pendulum-hardware/mass.png');
const HOUSING_PHOTO = require('@/assets/pendulum-hardware/housing.png');
const ARM_BLADE = require('@/assets/pass5-hardware/arm-blade.png');
const ARM_CAM = require('@/assets/pass5-hardware/arm-cam.png');
const MASS_LENS = require('@/assets/pass5-hardware/mass-lens.png');
const MASS_COLLET = require('@/assets/pass5-hardware/mass-collet.png');
const YOKE = require('@/assets/pass5-hardware/yoke-bearing.png');
import { SmartPendulumRecorderEngine } from '@/components/classic/SmartPendulumRecorder';
import { TIME_SIGNATURES } from '@/constants/meter';
import { SMART_MAX_BPM, SMART_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import type { TimeSignatureId } from '@/lib/types';
import type { useSessionRecorder } from '@/hooks/use-session-recorder';
import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { hapticDialTick, hapticSelection } from '@/lib/haptics';
import { pendulumAngleFromFinger, pendulumRenderedDegrees } from '@/lib/face-geometry';
import { smartPendulumRelease } from '@/lib/pendulum-gesture';
import {
  pendulumBobHit,
  pendulumBpmFromWeight,
  pendulumGestureMode,
  pendulumWeightFromDrag,
  pendulumWeightT,
  tipSwingDegrees,
} from '@/lib/pendulum-motion';
import { tempoName } from '@/lib/tempo-name';
import PocktTiming from '@/modules/pockt-timing';

type RecorderApi = ReturnType<typeof useSessionRecorder>;

/** Top = slowest. Bottom = fastest. */
function weightFromBpm(bpm: number): number {
  return pendulumWeightT(bpm);
}

function clampSmart(bpm: number, fallback: number): number {
  return sanitizeBpm(bpm, fallback, SMART_MIN_BPM, SMART_MAX_BPM);
}

export function SmartPendulumRoom({
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
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenSound,
  onOpenAccents,
  onOpenPresets,
  onOpenPractice,
  onOpenSetlists,
  onOpenLab,
  onHapticToggle,
  viewport,
  proofDegrees = null,
}: ClassicInstrumentProps & { viewport?: number; proofDegrees?: number | null }) {
  const window = useWindowDimensions();
  const width = viewport ?? window.width;
  const height = viewport ?? window.height;
  const safeBpm = clampSmart(config.bpm, SMART_MIN_BPM);
  const rodH = viewport ? Math.round(viewport * 0.7) : Math.min(compact ? 248 : 300, Math.round(height * 0.34));
  const [rodPx, setRodPx] = useState(rodH);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove();
  }, []);
  const fullSwing = tipSwingDegrees(rodPx, width, 1);
  const quietMotion = reduceMotion || proofFlags.reduceMotion;
  const swingDeg = (viewport ? tipSwingDegrees(rodPx, viewport * 0.92, 36) : fullSwing) * (quietMotion ? 0.22 : 1);
  const held = useSharedValue(0);
  const dragAngle = useSharedValue(0);
  const blend = useSharedValue(0);
  const gestureMode = useSharedValue(0);
  const bobStart = useSharedValue(0);
  const playingSv = useSharedValue(playing ? 1 : 0);
  const awaiting = useSharedValue(0);
  const awaitLeft = useSharedValue(0);
  const fallbackHost = useSharedValue(0);
  const angle = usePendulumPhase(
    playing,
    safeBpm,
    pulse,
    swingDeg,
    true,
    pulseBeat,
    held,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const shown = useDerivedValue(() =>
    proofDegrees != null ? proofDegrees * (quietMotion ? 0.22 : 1) : pendulumRenderedDegrees(held.value, dragAngle.value, blend.value, angle.value)
  );
  const weightT = useSharedValue(weightFromBpm(safeBpm));
  const originWeight = useSharedValue(weightT.value);
  const [recorderArmed, setRecorderArmed] = useState(false);
  const recorderRef = useRef<RecorderApi | null>(null);
  const [recMeta, setRecMeta] = useState({
    recording: false,
    playing: false,
    hasTake: false,
    durationLabel: '0:00',
    error: null as string | null,
    levels: [] as number[],
    guideOn: true,
  });

  const bindRecorder = useCallback((api: RecorderApi) => {
    recorderRef.current = api;
    setRecMeta((prev) => {
      const next = {
        recording: api.recording,
        playing: api.playing,
        hasTake: api.hasTake,
        durationLabel: api.durationLabel,
        error: api.error,
        levels: api.levels,
        guideOn: api.guideOn,
      };
      if (
        prev.recording === next.recording &&
        prev.playing === next.playing &&
        prev.hasTake === next.hasTake &&
        prev.durationLabel === next.durationLabel &&
        prev.error === next.error &&
        prev.guideOn === next.guideOn &&
        prev.levels === next.levels
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (safeBpm !== config.bpm) setBpm(safeBpm);
  }, [config.bpm, safeBpm, setBpm]);

  useEffect(() => {
    weightT.value = weightFromBpm(safeBpm);
  }, [safeBpm, weightT]);

  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
  }, [playing, playingSv]);

  const startFromThrow = useCallback(() => {
    if (playing) return;
    PocktTiming?.armPendulumStart?.(0.5);
    toggle();
  }, [playing, toggle]);

  useFrameCallback(() => {
    if (awaiting.value < 0.5) return;
    const host = (pulseBeatHost ?? fallbackHost).value;
    if (playingSv.value > 0.5 && host > 0) {
      awaiting.value = 0;
      held.value = 0;
      blend.value = withTiming(0, { duration: 460 });
      return;
    }
    awaitLeft.value -= 1;
    if (awaitLeft.value <= 0) {
      awaiting.value = 0;
      held.value = 0;
      blend.value = withTiming(0, { duration: 280 });
    }
  });

  const rodStyle = useAnimatedStyle(() => ({
    transformOrigin: 'bottom',
    transform: [{ rotate: `${shown.value}deg` }],
  }));
  const bobStyle = useAnimatedStyle(() => ({
    top: interpolate(weightT.value, [0, 1], [Math.round(rodH * 0.16), rodH - 58]),
  }));

  const commit = useCallback(
    (next: number) => {
      const safe = clampSmart(next, safeBpm);
      if (safe === safeBpm) return;
      hapticDialTick();
      setBpm(safe);
    },
    [safeBpm, setBpm]
  );

  const fitted = viewport != null;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          originWeight.value = weightT.value;
          const towerH = fitted ? (viewport ?? 0) * 0.92 : rodH + 28;
          const onWeight = pendulumBobHit(event.x, event.y, weightT.value, angle.value, rodH, towerH, width / 2, 78);
          bobStart.value = onWeight ? 1 : 0;
          if (onWeight) {
            gestureMode.value = 2;
            return;
          }
          gestureMode.value = 0;
        })
        .onUpdate((event) => {
          if (gestureMode.value < 0.5) {
            const travel = Math.hypot(event.translationX, event.translationY);
            if (travel >= 12) {
              const mode = pendulumGestureMode(bobStart.value > 0.5, event.translationX, event.translationY);
              gestureMode.value = mode === 'weight' ? 2 : 1;
              if (mode === 'swing') {
                held.value = 1;
                blend.value = 1;
                awaiting.value = 0;
                dragAngle.value = angle.value;
              }
            }
          }
          if (gestureMode.value > 1.5) {
            const nextT = pendulumWeightFromDrag(originWeight.value, event.translationY, rodH, config.wheelInvert);
            weightT.value = nextT;
            runOnJS(commit)(pendulumBpmFromWeight(nextT));
            return;
          }
          if (gestureMode.value > 0.5) {
            dragAngle.value = pendulumAngleFromFinger(event.x, width, swingDeg);
          }
        })
        .onFinalize((event) => {
          const swinging = gestureMode.value > 0.5 && gestureMode.value < 1.5;
          const decision = smartPendulumRelease(playingSv.value > 0.5, swinging, event.translationX);
          gestureMode.value = 0;
          if (decision === 'start') {
            awaiting.value = 1;
            awaitLeft.value = 100;
            runOnJS(startFromThrow)();
            return;
          }
          if (held.value > 0.5) {
            held.value = 0;
            blend.value = withTiming(0, { duration: decision === 'rejoin' ? 460 : 280 });
          }
        }),
    [angle, awaiting, awaitLeft, blend, bobStart, commit, config.wheelInvert, dragAngle, fitted, gestureMode, held, originWeight, playingSv, rodH, startFromThrow, swingDeg, viewport, weightT, width]
  );

  const onRecord = () => {
    void hapticSelection();
    if (!recorderArmed) {
      setRecorderArmed(true);
      return;
    }
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.recording) {
      void rec.stopRecord();
      return;
    }
    rec.stopPlayback();
    void rec.startRecord();
  };

  const onPlayback = () => {
    void hapticSelection();
    const rec = recorderRef.current;
    if (!rec?.hasTake) return;
    if (rec.playing) {
      rec.stopPlayback();
      return;
    }
    rec.playTake();
  };

  return (
    <View style={[styles.root, viewport ? { width: viewport, height: viewport, overflow: 'hidden', backgroundColor: '#0C0B0A' } : null]}>
      {viewport ? <View pointerEvents="none" style={styles.fieldWash} /> : null}
      {recorderArmed && !viewport ? <SmartPendulumRecorderEngine autoStart onApi={bindRecorder} /> : null}
      {viewport ? null : <View style={styles.icons}>
        <Glyph
          name="music-note"
          label="Time signature"
          onPress={onOpenTime}
          hot={false}
        />
        <Glyph
          name="volume-up"
          label="Sound"
          onPress={onOpenSound}
        />
        <Glyph
          name="fiber-manual-record"
          label={recMeta.recording ? 'Stop recording' : 'Record external audio'}
          onPress={onRecord}
          hot={recMeta.recording}
        />
        <Glyph
          name="play-arrow"
          label={recMeta.playing ? 'Stop playback' : recMeta.hasTake ? 'Play last take' : 'No take recorded'}
          onPress={onPlayback}
          hot={recMeta.playing}
        />
        <Glyph
          name="vibration"
          label={config.haptic ? 'Haptics on' : 'Haptics off'}
          onPress={onHapticToggle}
          hot={config.haptic}
        />
        <Glyph name="more-horiz" label="More tools" onPress={onOpenLab} />
      </View>}

      {recorderArmed && !viewport ? (
        <>
          <View style={styles.takeRow}>
            <Text style={styles.takeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {recMeta.recording
                ? `RECORDING ${recMeta.durationLabel}`
                : recMeta.playing
                  ? `PLAYBACK ${recMeta.durationLabel}`
                  : recMeta.hasTake
                    ? `READY ${recMeta.durationLabel}`
                    : 'READY'}
            </Text>
            <Pressable
              onPress={() => recorderRef.current?.setGuideOn(!recMeta.guideOn)}
              accessibilityRole="button"
              accessibilityLabel={recMeta.guideOn ? 'Hide metronome guide' : 'Show metronome guide'}
              style={styles.takeChip}>
              <Text style={styles.takeChipText}>{recMeta.guideOn ? 'GUIDE ON' : 'GUIDE OFF'}</Text>
            </Pressable>
            {recMeta.hasTake ? (
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  void recorderRef.current?.discard();
                }}
                accessibilityRole="button"
                accessibilityLabel="Discard take"
                style={styles.takeChip}>
                <Text style={styles.takeChipText}>DELETE</Text>
              </Pressable>
            ) : null}
          </View>
          {recMeta.error ? <Text style={styles.takeError}>{recMeta.error}</Text> : null}
          <View style={styles.wave}>
            {(recMeta.levels.length ? recMeta.levels : [0.08, 0.08, 0.08, 0.08]).map((level, index) => (
              <View key={`lvl-${index}`} style={[styles.waveBar, { height: 6 + level * 22 }]} />
            ))}
          </View>
        </>
      ) : null}

      <GestureDetector gesture={gesture}>
      <View style={[styles.tower, { height: viewport ? viewport * 0.92 : rodH + 28, width: '100%' }]}>
        <Animated.View
          style={[styles.rod, { height: rodH, width: viewport ? 140 : 56 }, rodStyle]}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            if (next > 1 && Math.abs(next - rodPx) > 0.5) setRodPx(next);
          }}>
          {viewport ? (
            <Image source={ARM_PHOTO} resizeMode="stretch" style={styles.photoArm} testID="machined-pendulum" />
          ) : (
          <View style={styles.armBody}>
            <LinearGradient
              colors={viewport ? ['#D5DEE6', '#8A949C', '#3A4248', '#1C2226'] : ['#F7FAFC', '#D5DEE4', '#6E787F', '#2A3238']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stick}
            />
            {viewport ? <View style={styles.flange} /> : null}
            {viewport ? <View style={[styles.flange, styles.flangeFar]} /> : null}
          </View>
          )}
          <Animated.View
            style={[styles.weight, viewport ? styles.weightMachine : null, bobStyle]}
            accessibilityLabel="Pendulum. Drag the arm to swing. Drag the weight vertically to change tempo.">
            {viewport ? (
              <Image source={MASS_PHOTO} resizeMode="contain" style={styles.photoMass} />
            ) : (
              <>
                <View style={styles.weightSlot} />
                <View style={styles.weightScrew} />
                <View style={[styles.weightScrew, styles.weightScrewRight]} />
              </>
            )}
          </Animated.View>
        </Animated.View>
        {viewport ? (
          <Image source={HOUSING_PHOTO} resizeMode="contain" style={styles.photoHousing} />
        ) : (
          <View style={styles.pivot}>
            <View style={styles.pivotJewel} />
          </View>
        )}
      </View>
      </GestureDetector>

      {viewport ? null : <View>
        <Pressable
          onPress={onOpenPad}
          accessibilityRole="button"
          accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM.`}>
          <Text style={styles.mark}>{tempoName(safeBpm)}</Text>
        </Pressable>
        <View style={styles.tempoRow}>
          <Pressable
            onPress={() => setBpm(clampSmart(config.bpm - 1, safeBpm))}
            accessibilityRole="button"
            accessibilityLabel="Decrease tempo"
            hitSlop={8}
            style={styles.step}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Pressable
            onPress={onOpenPad}
            accessibilityRole="button"
            accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM.`}>
            <Text style={[styles.bpm, compact && { fontSize: 64 }]} allowFontScaling={false}>
              {safeBpm}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBpm(clampSmart(config.bpm + 1, safeBpm))}
            accessibilityRole="button"
            accessibilityLabel="Increase tempo"
            hitSlop={8}
            style={styles.step}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>}

      {viewport ? null : <View style={styles.beatDots} pointerEvents="none">
        {Array.from({ length: TIME_SIGNATURES[config.timeSignature as TimeSignatureId]?.beatsPerMeasure ?? 4 }, (_, index) => (
          <View
            key={`beat-${index}`}
            style={[
              styles.beatDot,
              playing && transport.beatIndex % Math.max(1, TIME_SIGNATURES[config.timeSignature as TimeSignatureId]?.beatsPerMeasure ?? 4) === index && styles.beatDotOn,
            ]}
          />
        ))}
      </View>}

      {viewport ? null : <View style={styles.tools}>
        <Glyph name="view-column" label="Accents" onPress={onOpenAccents} />
        <Glyph name="queue-music" label="Setlists" onPress={onOpenSetlists} />
        <Glyph name="trending-up" label="Practice trainer" onPress={onOpenPractice} />
        <Glyph name="bookmark-border" label="Presets" onPress={onOpenPresets} />
        <Glyph
          name="touch-app"
          label="Tap tempo"
          onPress={() => {
            void hapticSelection();
            tapTempo();
          }}
        />
      </View>}

      {viewport ? null : <Pressable
        onPress={() => {
          void hapticSelection();
          if (!playing) {
            PocktTiming?.armPendulumStart?.(0.5);
          }
          toggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Stop' : 'Start'}
        style={[styles.start, playing && styles.startOn]}>
        <Text style={[styles.startText, playing && styles.startTextOn]}>{playing ? 'STOP' : 'START'}</Text>
      </Pressable>}
    </View>
  );
}

function Glyph({
  name,
  label,
  onPress,
  hot,
}: {
  name: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress: () => void;
  hot?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}>
      <MaterialIcons name={name} size={22} color={hot ? '#C42828' : '#1A1C20'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fieldWash: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '6%',
    bottom: '10%',
    borderRadius: 999,
    backgroundColor: 'rgba(232, 214, 180, 0.045)',
  },
  armGroove: {
    position: 'absolute',
    left: '42%',
    top: 8,
    bottom: 18,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  beam: {
    width: 18,
    borderRadius: 2,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderLeftColor: '#E4EAF0',
    borderRightColor: '#1A1E22',
  },
  flange: {
    position: 'absolute',
    left: -5,
    top: 10,
    bottom: 28,
    width: 4,
    borderRadius: 1,
    backgroundColor: '#8A949C',
  },
  flangeFar: {
    left: undefined,
    right: -5,
    backgroundColor: '#2A3138',
  },
  fork: {
    width: 36,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forkRod: {
    width: 7,
    borderRadius: 3,
    backgroundColor: '#8A949C',
    borderLeftWidth: 1,
    borderLeftColor: '#E4EAF0',
  },
  channel: {
    width: 34,
    flex: 1,
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
  },
  channelFace: {
    width: 10,
    backgroundColor: '#E7EEF3',
  },
  channelGroove: {
    flex: 1,
    backgroundColor: '#2A3136',
    borderLeftWidth: 1,
    borderLeftColor: '#0C0E10',
  },
  channelShade: {
    width: 10,
    backgroundColor: '#12161A',
  },
  photoArm: {
    width: 28,
    flex: 1,
  },
  photoMass: {
    width: 120,
    height: 112,
  },
  photoHousing: {
    width: 148,
    height: 106,
    marginTop: -14,
    zIndex: 3,
  },
  machinedBlade: {
    width: 16,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#8E98A0',
    borderLeftWidth: 2,
    borderLeftColor: '#E7EEF2',
    borderRightWidth: 3,
    borderRightColor: '#1C2428',
    borderTopWidth: 2,
    borderTopColor: '#D5DEE4',
  },
  bladeHighlight: {
    position: 'absolute',
    left: 3,
    top: 4,
    bottom: 8,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bladeEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 10,
    backgroundColor: '#3A4248',
  },
  machinedMass: {
    width: 112,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#C8D0D6',
    borderTopWidth: 1,
    borderTopColor: '#F4F7F8',
    borderBottomWidth: 3,
    borderBottomColor: '#1A2024',
    alignItems: 'center',
    justifyContent: 'center',
  },
  massClamp: {
    position: 'absolute',
    width: 22,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#2A3238',
  },
  massScrew: {
    position: 'absolute',
    left: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A140C',
    borderWidth: 1,
    borderColor: '#E7C98A',
  },
  massScrewFar: {
    left: undefined,
    right: 10,
  },
  machinedYoke: {
    width: 168,
    height: 54,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: '#2C3238',
    borderTopWidth: 1,
    borderTopColor: '#9AA4AC',
    borderBottomWidth: 3,
    borderBottomColor: '#050607',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  yokeBearing: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#12161A',
    borderWidth: 3,
    borderColor: '#C4A36A',
  },
  yokeJewel: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E7D3A4',
  },
  armPlate: {
    width: 56,
    flex: 1,
  },
  massPlate: {
    width: 96,
    height: 40,
  },
  yokePlate: {
    width: 132,
    height: 62,
    marginTop: -16,
    zIndex: 3,
  },
  weightMachine: {
    width: 120,
    height: 112,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 5 },
  },
  weightCollar: {
    position: 'absolute',
    top: 4,
    width: 22,
    height: 5,
    borderRadius: 1,
    backgroundColor: '#8A949C',
    borderTopWidth: 1,
    borderTopColor: '#E4EAF0',
  },
  weightCollarLow: {
    top: undefined,
    bottom: 5,
  },
  pivotMount: {
    width: 88,
    height: 30,
    marginTop: -10,
    borderRadius: 4,
    backgroundColor: '#161A1E',
    borderWidth: 1,
    borderColor: '#3A4248',
    borderTopColor: '#A8B2BA',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 2 },
  },
  bearing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0E1216',
    borderWidth: 2,
    borderColor: '#5C666E',
    borderTopColor: '#D5DEE6',
  },
  pivotScrew: {
    position: 'absolute',
    left: 8,
    top: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8A949C',
  },
  pivotScrewRight: {
    left: undefined,
    right: 8,
  },
  icons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 2,
  },
  takeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 36,
  },
  takeText: {
    flexShrink: 1,
    color: '#1A1C20',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  takeChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(40,36,32,0.2)',
  },
  takeChipText: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
    color: '#1A1C20',
  },
  takeError: {
    color: '#C42828',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  wave: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  waveBar: {
    width: 3,
    backgroundColor: 'rgba(26,28,32,0.35)',
    borderRadius: 1,
  },
  guideTick: {
    width: 2,
    height: 18,
    marginHorizontal: 3,
    backgroundColor: 'rgba(196,40,40,0.22)',
  },
  guideTickOn: {
    backgroundColor: '#C42828',
  },
  icon: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(40,36,32,0.14)',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  tower: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  rod: {
    width: 56,
    alignItems: 'center',
    transformOrigin: 'bottom',
    overflow: 'visible',
  },
  armBody: {
    width: 8,
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#3A4248',
    borderLeftWidth: 1,
    borderLeftColor: '#F2F6F8',
    borderRightWidth: 1,
    borderRightColor: '#1A1E22',
  },
  stick: {
    width: '100%',
    flex: 1,
  },
  counterweight: {
    position: 'absolute',
    bottom: 6,
    width: 44,
    height: 16,
    borderRadius: 1,
    backgroundColor: '#8A949C',
    borderTopWidth: 1,
    borderTopColor: '#E7EEF3',
    borderBottomWidth: 2,
    borderBottomColor: '#12161A',
  },
  weight: {
    position: 'absolute',
    width: 46,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#1A1814',
    borderWidth: 1,
    borderColor: '#C4A36A',
    borderTopColor: '#E7D3A4',
    borderBottomColor: '#3A2C18',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 4 },
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightSlot: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: 10,
    borderRadius: 2,
    backgroundColor: '#C5CED6',
    borderLeftWidth: 1,
    borderLeftColor: '#F4F7F8',
    borderRightWidth: 1,
    borderRightColor: '#3A4248',
  },
  weightScrew: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C4A36A',
  },
  weightScrewRight: {
    left: undefined,
    right: 5,
  },
  weightShine: {
    width: 18,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginTop: -10,
    marginLeft: -8,
  },
  pivot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C4A36A',
    borderWidth: 2,
    borderColor: '#6E5430',
    marginTop: -8,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pivotJewel: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A140C',
  },
  mark: {
    color: 'rgba(40,36,32,0.55)',
    textAlign: 'center',
    letterSpacing: 3.2,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  bpm: {
    color: '#1A1C20',
    fontSize: 78,
    fontWeight: '500',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  step: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,32,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 36,
    color: '#1A1C20',
    fontWeight: '300',
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  beatDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  beatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,32,0.45)',
    backgroundColor: 'transparent',
  },
  beatDotOn: {
    backgroundColor: '#1A1C20',
    borderColor: '#1A1C20',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(40,44,52,0.28)',
  },
  dotOn: {
    backgroundColor: '#1A1C20',
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  start: {
    minHeight: 56,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#1A1C20',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  startOn: {
    backgroundColor: '#1A1C20',
  },
  startText: {
    letterSpacing: 5,
    fontWeight: '800',
    fontSize: 18,
    color: '#1A1C20',
  },
  startTextOn: {
    color: '#E8E6E0',
  },
  pressed: {
    opacity: 0.72,
  },
});

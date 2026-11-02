import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { PULSE_RING_MAIN, PULSE_RING_WAVE_1, PULSE_RING_WAVE_2 } from '@/lib/classic-assets';
import { pulseRingStrength } from '@/lib/pulse-visual';
import { PULSE_WAVE_ORIGIN, PULSE_WAVE_OUTER, pulseBeatShouldLaunch } from '@/lib/pulse-math';

type Front = { progress: number; strength: number };

type Props = {
  size: number;
  bpm: number;
  playing: boolean;
  pulse?: SharedValue<number>;
  pulseRole?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  fronts?: Front[];
};

const RING_COUNT = 5;

/**
 * PulseRoom WaveRing from ebaec60.
 * A beat launches one ring at the center scale and it propagates outward.
 * Musical time stays on the native pulseBeat. The timing here is only the visual travel.
 */
export function PulseInstrumentFace({ size, bpm, playing, pulse, pulseRole, pulseBeat, pulseBeatHost, fronts }: Props) {
  return (
    <View style={[styles.stage, { width: size, height: size }]} testID="console-face-pulse" pointerEvents="none">
      <View style={styles.field}>
        {fronts ? (
          fronts.map((front, index) => (
            <HeldWave key={`${index}-${front.progress}`} size={size} progress={front.progress} strength={front.strength} />
          ))
        ) : (
          <LiveWaves size={size} bpm={bpm} playing={playing} pulse={pulse} pulseRole={pulseRole} pulseBeat={pulseBeat} pulseBeatHost={pulseBeatHost} />
        )}
        <PulseCore size={size} pulse={pulse} playing={playing} />
      </View>
    </View>
  );
}

function ringDuration(bpm: number): number {
  return Math.min(2200, Math.max(420, (60000 / Math.max(1, bpm)) * 1.65));
}

function ringScale(bpm: number): number {
  if (bpm < 50) return 3.35;
  if (bpm < 80) return 3.05;
  if (bpm < 140) return 2.82;
  if (bpm < 220) return 2.42;
  return 2.12;
}

function LiveWaves({
  size,
  bpm,
  playing,
  pulse,
  pulseRole,
  pulseBeat,
  pulseBeatHost,
}: {
  size: number;
  bpm: number;
  playing: boolean;
  pulse?: SharedValue<number>;
  pulseRole?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
}) {
  const playingSv = useSharedValue(playing ? 1 : 0);
  const durationSv = useSharedValue(ringDuration(bpm));
  const scaleSv = useSharedValue(ringScale(bpm));
  const cursor = useSharedValue(0);
  const slots = [useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1)];
  const roles = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  if (playingSv.value !== (playing ? 1 : 0)) playingSv.value = playing ? 1 : 0;

  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
    durationSv.value = ringDuration(bpm);
    scaleSv.value = ringScale(bpm);
    if (!playing) {
      for (const slot of slots) slot.value = 1;
    }
  }, [bpm, durationSv, playing, playingSv, scaleSv]);

  useAnimatedReaction(
    () => (pulseBeatHost ? pulseBeatHost.value : pulseBeat ? pulseBeat.value : pulse && pulse.value >= 0.42 ? 1 : 0),
    (value, previous) => {
      if (!pulseBeatShouldLaunch(previous, value, playingSv.value > 0.5)) return;
      const slot = cursor.value;
      cursor.value = (slot + 1) % RING_COUNT;
      const role = pulseRole ? pulseRole.value : 0;
      const progress = slots[slot];
      const tone = roles[slot];
      if (!progress || !tone) return;
      progress.value = 0;
      tone.value = pulseRingStrength(role, role);
      progress.value = withTiming(1, { duration: durationSv.value, easing: Easing.out(Easing.cubic) });
    }
  );

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
          active={playing}
        />
      ))}
    </View>
  );
}

function HeldWave({ size, progress, strength }: { size: number; progress: number; strength: number }) {
  const slot = useSharedValue(progress);
  const role = useSharedValue(strength);
  const scaleSv = useSharedValue(ringScale(120));
  useEffect(() => {
    slot.value = progress;
    role.value = strength;
  }, [progress, role, slot, strength]);
  return <WaveRing index={0} progress={slot} role={role} size={size} scaleSv={scaleSv} active={progress < 0.995} />;
}

function WaveRing({
  index,
  progress,
  role,
  size,
  scaleSv,
  active,
}: {
  index: number;
  progress: SharedValue<number>;
  role: SharedValue<number>;
  size: number;
  scaleSv: SharedValue<number>;
  active: boolean;
}) {
  const down = DEFAULT_DISPLAY_PREFS.pulseDownbeatColor;
  const up = DEFAULT_DISPLAY_PREFS.pulseUpbeatColor;
  const style = useAnimatedStyle(() => {
    const done = progress.value >= 0.995;
    const idle = active ? 0 : 0.34;
    return {
      opacity: done ? idle : interpolate(progress.value, [0, 0.05, 0.28, 0.58, 0.84, 1], [1, 0.98, 0.82, 0.52, 0.2, idle]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [PULSE_WAVE_ORIGIN, PULSE_WAVE_OUTER]) }],
    };
  });
  const tint = useAnimatedStyle(() => {
    const accent = role.value >= 0.85;
    return {
      borderColor: accent ? down : up,
      borderWidth: interpolate(progress.value, [0, 0.12, 0.4, 0.78, 1], [14, 10, 6, 3, 1.2]),
      opacity: interpolate(progress.value, [0, 0.12, 0.55, 0.88, 1], [1, 0.94, 0.62, 0.22, active ? 0 : 0.18]),
    };
  });
  const wash = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.28, 0.62, 1], [0.38, 0.2, 0.1, 0.04, 0]),
  }));

  return (
    <Animated.View
      style={[
        styles.halo,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}>
      <Image
        source={index % 2 === 0 ? PULSE_RING_WAVE_1 : PULSE_RING_WAVE_2}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.58 }]}
        contentFit="contain"
      />
      <Animated.View style={[styles.haloWash, wash]} />
      <Animated.View style={[styles.haloTint, tint]} />
    </Animated.View>
  );
}

function PulseCore({ size, pulse, playing }: { size: number; pulse?: SharedValue<number>; playing: boolean }) {
  const ring = useAnimatedStyle(() => ({
    opacity: playing ? interpolate(pulse ? pulse.value : 0, [0, 1], [0.62, 1]) : 0.92,
    transform: [{ scale: playing ? interpolate(pulse ? pulse.value : 0, [0, 1], [1, 1.16]) : 1 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.coreWrap, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17, backgroundColor: '#0E3C44', borderWidth: 4, borderColor: '#7EE8DE' }, ring]}>
      <View style={[styles.emitter, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 }]} />
      <Pockt2Mark size={size * 0.22} accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: '#07080B',
    overflow: 'hidden',
  },
  field: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    borderRadius: 999,
    backgroundColor: '#050607',
    borderWidth: 3,
    borderColor: '#121416',
    borderTopColor: '#6A7076',
    overflow: 'hidden',
  },
  coreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3ECFC4',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: -6 },
  },
  emitter: {
    position: 'absolute',
    backgroundColor: '#1A8C96',
  },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  haloTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 10,
  },
  haloWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 16,
    borderColor: 'rgba(126,200,255,0.28)',
    backgroundColor: 'transparent',
  },
});

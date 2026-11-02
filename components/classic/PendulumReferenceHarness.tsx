import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { PENDULUM_ABSOLUTE_AMPLITUDE } from '@/lib/pendulum-absolute';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  playing: boolean;
  bpm: number;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  pulseSpb?: SharedValue<number>;
  pulseHostOffset?: SharedValue<number>;
  onToggle: () => void;
  onBpm: (bpm: number) => void;
};

const TEMPOS = [20, 40, 60, 80, 120, 180, 200, 300, 400];

/**
 * Internal motion proof only. No Pocket chrome.
 * Same absolute renderer Mechanical and Smart consume.
 */
export function PendulumReferenceHarness({
  playing,
  bpm,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  onToggle,
  onBpm,
}: Props) {
  const angle = usePendulumPhase(
    playing,
    bpm,
    undefined,
    PENDULUM_ABSOLUTE_AMPLITUDE,
    true,
    pulseBeat,
    undefined,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const armStyle = useAnimatedStyle(() => ({
    transformOrigin: 'bottom',
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  return (
    <View testID="pendulum-reference-harness" style={styles.root}>
      <Text style={styles.title}>PENDULUM REFERENCE</Text>
      <View style={styles.stage}>
        <View style={styles.centerLine} />
        <View style={styles.pivot} />
        <Animated.View style={[styles.arm, armStyle]}>
          <View style={styles.rod} />
          <View style={styles.bob} />
        </Animated.View>
      </View>
      <Text style={styles.meta} testID="pendulum-reference-bpm">
        {playing ? 'PLAY' : 'STOP'}  ·  {bpm} BPM
      </Text>
      <Pressable testID="pendulum-reference-toggle" onPress={onToggle} style={styles.play}>
        <Text style={styles.playLabel}>{playing ? 'STOP' : 'PLAY'}</Text>
      </Pressable>
      <View style={styles.tempos}>
        {TEMPOS.map((tempo) => (
          <Pressable key={tempo} onPress={() => onBpm(tempo)} style={[styles.tempo, bpm === tempo && styles.tempoOn]}>
            <Text style={styles.tempoLabel}>{tempo}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  title: {
    color: 'rgba(244,246,250,0.72)',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
    marginBottom: 8,
  },
  stage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  centerLine: {
    position: 'absolute',
    top: 8,
    bottom: 18,
    width: 1,
    backgroundColor: 'rgba(244,246,250,0.28)',
  },
  pivot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F4F6FA',
    zIndex: 2,
    marginBottom: 14,
  },
  arm: {
    position: 'absolute',
    bottom: 18,
    width: 16,
    height: 170,
    alignItems: 'center',
  },
  rod: {
    flex: 1,
    width: 3,
    backgroundColor: '#D7DEE8',
    borderRadius: 2,
  },
  bob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7EC8FF',
    marginTop: -2,
  },
  meta: {
    color: 'rgba(244,246,250,0.8)',
    marginTop: 10,
    fontVariant: ['tabular-nums'],
  },
  play: {
    marginTop: 10,
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.28)',
  },
  playLabel: {
    color: '#F4F6FA',
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  tempos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    maxWidth: 320,
  },
  tempo: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.18)',
  },
  tempoOn: {
    borderColor: '#7EC8FF',
  },
  tempoLabel: {
    color: '#F4F6FA',
    fontVariant: ['tabular-nums'],
  },
});

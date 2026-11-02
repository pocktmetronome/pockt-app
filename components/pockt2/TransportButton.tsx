import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { P2, P2MetalFill, P2MetalSheen, P2Touch } from '@/constants/pockt-2';

type Props = {
  playing: boolean;
  onPress: () => void;
  pulse: SharedValue<number>;
};

export function TransportButton({ playing, onPress, pulse }: Props) {
  const ringStyle = useAnimatedStyle(() => {
    const energy = pulse.value;
    return {
      opacity: playing ? interpolate(energy, [0, 1], [0.35, 1]) : 0.18,
      transform: [{ scale: playing ? interpolate(energy, [0, 1], [1, 1.06]) : 1 }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop' : 'Play'}
      accessibilityState={{ selected: playing }}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.4, 1]} style={styles.sheen} />
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <View style={styles.icon}>
        {playing ? <View style={styles.stop} /> : <View style={styles.play} />}
      </View>
      <Text style={[styles.caption, playing && styles.captionLive]}>{playing ? 'Stop' : 'Play'}</Text>
    </Pressable>
  );
}

const SIZE = P2Touch.transport;

const styles = StyleSheet.create({
  hit: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: P2.signal,
  },
  icon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: P2.ink,
  },
  stop: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: P2.signal,
  },
  caption: {
    position: 'absolute',
    bottom: 8,
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '600',
  },
  captionLive: {
    color: P2.signal,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.9,
  },
});

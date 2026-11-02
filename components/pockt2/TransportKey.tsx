import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { P2, P2MetalFill, P2MetalSheen, P2Radius, P2Touch } from '@/constants/pockt-2';
import { hapticSoft } from '@/lib/haptics';

type Props = {
  playing: boolean;
  onPress: () => void;
  pulse?: SharedValue<number>;
};

export function TransportKey({ playing, onPress, pulse }: Props) {
  const ringStyle = useAnimatedStyle(() => {
    if (!pulse) {
      return { opacity: playing ? 0.85 : 0 };
    }
    return {
      opacity: playing ? interpolate(pulse.value, [0, 1], [0.42, 0.95]) : 0,
    };
  });

  return (
    <Pressable
      onPress={() => {
        void hapticSoft();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop' : 'Play'}
      accessibilityState={{ selected: playing }}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <LinearGradient colors={[...P2MetalFill]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={[...P2MetalSheen]} locations={[0, 0.4, 1]} style={styles.sheen} />
      <View style={styles.edge} />
      <View style={styles.topLight} />
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      <View style={styles.icon}>
        {playing ? (
          <View style={styles.pausePair}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.play} />
        )}
      </View>
      <Text style={[styles.caption, playing && styles.captionLive]}>{playing ? 'Stop' : 'Play'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 88,
    minWidth: 88,
    height: P2Touch.transport,
    borderRadius: P2Radius.control,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: P2Radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairlineStrong,
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: P2Radius.control,
    borderWidth: 1.5,
    borderColor: P2.signal,
  },
  icon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderLeftWidth: 14,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: P2.ink,
  },
  pausePair: {
    flexDirection: 'row',
    gap: 5,
  },
  pauseBar: {
    width: 4,
    height: 16,
    borderRadius: 1,
    backgroundColor: P2.ink,
  },
  caption: {
    position: 'absolute',
    bottom: 8,
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  captionLive: {
    color: P2.signal,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.92,
  },
});

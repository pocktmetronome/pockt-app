import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { beatlineFlashColor } from '@/lib/beatline-color';
import { hapticSoft } from '@/lib/haptics';

type Props = {
  playing: boolean;
  onPress: () => void;
  pulse?: SharedValue<number>;
  size?: number;
  accentColor?: string;
  pulseAccent?: SharedValue<number>;
};

export function GlassPlayOrb({ playing, onPress, pulse, size = 108, accentColor = '#F4F6FA', pulseAccent }: Props) {
  const spin = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      spin.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
      return;
    }
    cancelAnimation(spin);
    spin.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [playing, spin]);

  const glow = useAnimatedStyle(() => {
    const color = pulseAccent ? beatlineFlashColor(pulseAccent.value) : accentColor;
    if (!pulse) return { opacity: playing ? 0.22 : 0.08, backgroundColor: color };
    const strength = pulseAccent?.value ?? 2;
    if (playing && strength < 0.5) return { opacity: 0.06, backgroundColor: color };
    return {
      opacity: playing ? interpolate(pulse.value, [0, 1], [0.12, 0.62]) : 0.08,
      backgroundColor: color,
    };
  });

  const disc = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: interpolate(press.value, [0, 1], [1, 0.96]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 110 });
      }}
      hitSlop={12}
      onPress={() => {
        void hapticSoft();
        onPress();
      }}
      style={[styles.hit, { width: Math.max(64, size + 18), height: Math.max(64, size + 18) }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size + 22,
            height: size + 22,
            borderRadius: (size + 22) / 2,
            backgroundColor: accentColor,
          },
          glow,
        ]}
      />
      <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }, disc]}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#121416', borderRadius: size / 2 }]} />
        {[0.22, 0.36, 0.5, 0.64, 0.78].map((scale, index) => (
          <View
            key={scale}
            pointerEvents="none"
            style={[
              styles.groove,
              {
                width: size * scale,
                height: size * scale,
                borderRadius: (size * scale) / 2,
                marginLeft: -(size * scale) / 2,
                marginTop: -(size * scale) / 2,
                borderColor: index === 1 ? 'rgba(236,242,248,0.22)' : index % 2 ? 'rgba(220,228,236,0.09)' : 'rgba(160,170,180,0.14)',
              },
            ]}
          />
        ))}
        <View pointerEvents="none" style={[styles.sheen, { width: size * 0.42, height: size * 0.18 }]} />
        <View
          pointerEvents="none"
          style={[
            styles.marker,
            {
              width: size * 0.16,
              height: size * 0.16,
              borderRadius: size * 0.08,
              top: size * 0.1,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.arc,
            {
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: size * 0.31,
              marginLeft: -(size * 0.31),
              marginTop: -(size * 0.31),
            },
          ]}
        />
        <View style={styles.label} />
      </Animated.View>
      <View pointerEvents="none" style={[styles.iconLayer, { width: size, height: size }]}>
        {playing ? (
          <View style={styles.pausePair}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.triangle} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    minHeight: 64,
  },
  halo: {
    position: 'absolute',
    opacity: 0.18,
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230,238,246,0.18)',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheen: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    borderRadius: 20,
    backgroundColor: 'rgba(236,242,248,0.07)',
    transform: [{ rotate: '-28deg' }],
  },
  marker: {
    position: 'absolute',
    backgroundColor: 'rgba(248,252,255,0.96)',
    shadowColor: '#F8FBFF',
    shadowOpacity: 1,
    shadowRadius: 11,
  },
  arc: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: 'rgba(244,248,255,0.42)',
    transform: [{ rotate: '-18deg' }],
  },
  groove: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(220,228,236,0.08)',
  },
  label: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1A0E10',
    borderWidth: 1,
    borderColor: 'rgba(180,80,90,0.28)',
  },
  triangle: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderLeftWidth: 20,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: '#F4F6FA',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    zIndex: 2,
  },
  pausePair: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
  },
  pauseBar: {
    width: 6,
    height: 20,
    borderRadius: 1,
    backgroundColor: '#F4F6FA',
  },
});

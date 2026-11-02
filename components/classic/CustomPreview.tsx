import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CustomBackgroundFill } from '@/components/classic/CustomSurface';
import {
  CUSTOM_WIDGET_META,
  DEFAULT_CUSTOM_LAYOUT,
  isLightCustomSurface,
  type CustomLayout,
} from '@/lib/custom-layout';

type Props = {
  layout: CustomLayout | null;
  active: boolean;
  reduceMotion: boolean;
};

export function CustomPreview({ layout, active, reduceMotion }: Props) {
  const next = layout ?? DEFAULT_CUSTOM_LAYOUT;
  const light = isLightCustomSurface(next.background);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.value = withTiming(0.28, { duration: 160 });
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      pulse.value = 0;
    };
  }, [active, pulse, reduceMotion]);

  const glow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.06, 0.2]),
  }));

  return (
    <View style={styles.root}>
      <CustomBackgroundFill background={next.background} photoFit={next.photoFit} />
      <Animated.View pointerEvents="none" style={[styles.glow, glow]} />
      {next.widgets.map((widget) => {
        const meta = CUSTOM_WIDGET_META[widget.id];
        const w = Math.max(18, meta.width * 0.22);
        const h = Math.max(14, meta.height * 0.22);
        return (
          <View
            key={widget.uid ?? widget.id}
            pointerEvents="none"
            style={[
              styles.ghost,
              {
                left: `${widget.x * 100}%`,
                top: `${widget.y * 100}%`,
                width: w,
                height: h,
                marginLeft: -w / 2,
                marginTop: -h / 2,
                backgroundColor: light ? 'rgba(20,16,12,0.28)' : 'rgba(246,240,228,0.22)',
              },
            ]}>
            {widget.id === 'bpm' ? (
              <Text style={[styles.bpm, { color: light ? '#16120E' : '#F6F0E4' }]}>120</Text>
            ) : widget.id === 'play' ? (
              <View style={styles.play} />
            ) : widget.id === 'beat' ? (
              <View style={[styles.dot, { backgroundColor: light ? '#8A5A22' : '#E8C878' }]} />
            ) : (
              <View style={styles.bar} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,236,210,0.2)',
  },
  ghost: {
    position: 'absolute',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpm: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 6,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftColor: '#F6F0E4',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bar: {
    width: 10,
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(246,240,228,0.7)',
  },
});

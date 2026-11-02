import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { hapticSoft, hapticTap } from '@/lib/haptics';
import {
  BEATLINE_PRESS_DOWN_MS,
  BEATLINE_PRESS_UP_MS,
  beatlinePressDepth,
} from '@/lib/beatline-feel';

type Kind = 'tap' | 'play' | 'nav' | 'rail';

type Props = {
  label: string;
  onPress: () => void;
  pressIn?: boolean;
  kind?: Kind;
  forced?: boolean;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const EASE = Easing.out(Easing.cubic);

export function BeatlineHardwarePress({
  label,
  onPress,
  pressIn = false,
  kind = 'nav',
  forced = false,
  hitSlop = 8,
  style,
  children,
}: Props) {
  const down = useSharedValue(forced ? 1 : 0);
  const depth = beatlinePressDepth(kind);
  useEffect(() => {
    down.value = forced ? 1 : 0;
  }, [down, forced]);

  const travel = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * depth.travel }],
  }));
  const ridge = useAnimatedStyle(() => ({
    opacity: interpolate(down.value, [0, 1], [0, 0.08]),
  }));
  const occlude = useAnimatedStyle(() => ({
    opacity: interpolate(down.value, [0, 1], [0, 0.22]),
  }));

  const sink = () => {
    down.value = withTiming(1, { duration: BEATLINE_PRESS_DOWN_MS, easing: EASE });
    if (kind === 'tap') void hapticTap();
    else void hapticSoft();
    if (pressIn) onPress();
  };

  const rise = () => {
    if (forced) return;
    down.value = withTiming(0, { duration: BEATLINE_PRESS_UP_MS, easing: EASE });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={pressIn ? undefined : onPress}
      onPressIn={sink}
      onPressOut={rise}
      hitSlop={hitSlop}
      style={style}>
      <Animated.View pointerEvents="none" style={[styles.fill, travel]}>
        {children}
        {kind === 'nav' ? (
          <>
            <Animated.View style={[styles.metalRidge, ridge]} />
            <Animated.View style={[styles.metalOcclude, occlude]} />
          </>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  metalRidge: {
    position: 'absolute',
    top: '16%',
    left: '24%',
    right: '24%',
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(214, 204, 186, 0.7)',
  },
  metalOcclude: {
    position: 'absolute',
    top: '14%',
    left: '18%',
    right: '18%',
    height: '72%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(8, 6, 4, 0.28)',
    backgroundColor: 'transparent',
  },
});

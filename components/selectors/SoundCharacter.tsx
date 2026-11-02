import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useSkin } from '@/components/skins/SkinContext';
import { BASS_SOUNDS } from '@/constants/sounds';
import type { SoundId } from '@/lib/types';

type Props = {
  sound: SoundId;
};

export function SoundCharacter({ sound }: Props) {
  const theme = useSkin();
  const pulse = useSharedValue(0);
  const bass = BASS_SOUNDS.has(sound);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: bass ? 520 : sound === 'pocket' ? 420 : 280 })
      ),
      -1,
      false
    );
  }, [bass, pulse, sound]);

  const motion = useAnimatedStyle(() => {
    if (bass) {
      return {
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.82, 1.12]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.45, 0.95]),
      };
    }
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, 1.06]) }],
      opacity: interpolate(pulse.value, [0, 1], [0.5, 1]),
    };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.body,
          {
            backgroundColor: bass ? theme.accent : theme.ivory,
            borderColor: theme.ivoryDim,
            borderWidth: bass ? 0 : 2,
            width: bass ? 42 : 18,
            height: bass ? 42 : 18,
            borderRadius: 999,
          },
          motion,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

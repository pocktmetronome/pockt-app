import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { DialPlate, scaleLabelRadius } from '@/components/classic/dial-skia';
import { DIAL_MARKS, angleFromDialBpm, dialScaleRotation } from '@/lib/pockt-dial-scale';

type Props = {
  size: number;
  angle: SharedValue<number>;
};

/**
 * Tick positions and numeral centers share dialScaleRotation.
 * Each glyph is counter-rotated by the same amount so the label
 * stays upright while its calibrated position travels with the scale.
 */
export function DialFacade({ size, angle }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = scaleLabelRadius(size);
  const twoDigit = Math.max(12, Math.round(size * 0.064));
  const threeDigit = Math.max(10, Math.round(size * 0.05));
  const box = Math.max(36, Math.round(size * 0.16));
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialScaleRotation(angle.value)}rad` }],
  }));
  const upright = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-dialScaleRotation(angle.value)}rad` }],
  }));
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <DialPlate size={size} angle={angle} />
      <Animated.View style={[StyleSheet.absoluteFill, spin]} pointerEvents="none">
        {DIAL_MARKS.map((mark) => {
          const theta = angleFromDialBpm(mark) + (TANGENT[mark] ?? 0);
          const digits = String(mark).length;
          const placed = radius * (RADIAL[mark] ?? 1);
          const fontSize = digits >= 3 ? threeDigit : twoDigit;
          const x = cx + Math.sin(theta) * placed;
          const y = cy - Math.cos(theta) * placed;
          return (
            <View
              key={mark}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: x - box / 2,
                top: y - box / 2,
                width: box,
                height: box,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Animated.Text
                allowFontScaling={false}
                style={[
                  styles.mark,
                  {
                    fontSize,
                    lineHeight: fontSize + 2,
                    letterSpacing: digits >= 3 ? -0.4 : 0.6,
                  },
                  upright,
                ]}>
                {mark}
              </Animated.Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const RADIAL: Record<number, number> = {
  20: 1.01,
  40: 1,
  60: 0.985,
  80: 1,
  100: 1.02,
  120: 1.01,
  160: 1.03,
  200: 1.02,
  260: 1,
  320: 1.03,
  400: 1.02,
};
const TANGENT: Record<number, number> = {
  20: 0.02,
  80: -0.01,
  260: -0.014,
  320: 0.018,
  400: 0.03,
};

const styles = StyleSheet.create({
  mark: {
    color: '#A89880',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0.6, height: 0.8 },
    textShadowRadius: 0,
  },
});

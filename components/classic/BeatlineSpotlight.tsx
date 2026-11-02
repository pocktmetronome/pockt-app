import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { interpolate, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type Props = {
  playing: boolean;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  pulseAccent?: SharedValue<number>;
  level1Color?: string;
  level2Color?: string;
  level3Color?: string;
};

function hexWash(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return `rgba(244,246,250,${alpha})`;
  const n = Number.parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function sconcePath(width: number, height: number) {
  const path = Skia.Path.Make();
  const cx = width / 2;
  const top = Math.max(10, width * 0.11);
  const mid = width * 0.42;
  const bot = width * 0.78;
  path.moveTo(cx - top, 0);
  path.lineTo(cx + top, 0);
  path.quadTo(cx + mid, height * 0.38, cx + bot, height);
  path.lineTo(cx - bot, height);
  path.quadTo(cx - mid, height * 0.38, cx - top, 0);
  path.close();
  return path;
}

/**
 * Architectural sconce wash. Origin is implied by the taper — no lamp object.
 */
export function BeatlineSpotlight({
  playing,
  pulse,
  pulseRole,
  pulseAccent,
  level1Color = '#F4F6FA',
  level2Color = '#F4F6FA',
  level3Color = '#F4F6FA',
}: Props) {
  const [box, setBox] = useState({ width: 0, height: 340 });
  const cone = useMemo(() => sconcePath(Math.max(1, box.width), 332), [box.width]);

  const strengthOf = () => {
    'worklet';
    return pulseAccent?.value ?? (pulseRole.value >= 1.5 ? 3 : pulseRole.value >= 1 ? 2 : 1);
  };

  const op1 = useDerivedValue(() => {
    if (!playing) return 0;
    const strength = strengthOf();
    if (strength < 0.5 || strength >= 1.5) return 0;
    return interpolate(pulse.value, [0, 1], [0.04, 0.62]);
  });
  const op2 = useDerivedValue(() => {
    if (!playing) return 0;
    const strength = strengthOf();
    if (strength < 1.5 || strength >= 2.5) return 0;
    return interpolate(pulse.value, [0, 1], [0.05, 0.74]);
  });
  const op3 = useDerivedValue(() => {
    if (!playing) return 0;
    const strength = strengthOf();
    if (strength < 2.5) return 0;
    return interpolate(pulse.value, [0, 1], [0.06, 0.88]);
  });

  return (
    <View
      pointerEvents="none"
      style={styles.root}
      accessibilityElementsHidden
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 1 && (Math.abs(width - box.width) > 0.5 || Math.abs(height - box.height) > 0.5)) {
          setBox({ width, height });
        }
      }}>
      {box.width > 1 ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Wash path={cone} width={box.width} color={level1Color} opacity={op1} />
          <Wash path={cone} width={box.width} color={level2Color} opacity={op2} />
          <Wash path={cone} width={box.width} color={level3Color} opacity={op3} />
        </Canvas>
      ) : null}
    </View>
  );
}

function Wash({
  path,
  width,
  color,
  opacity,
}: {
  path: ReturnType<typeof Skia.Path.Make>;
  width: number;
  color: string;
  opacity: SharedValue<number>;
}) {
  return (
    <Group opacity={opacity}>
      <Path path={path}>
        <LinearGradient
          start={vec(width / 2, 0)}
          end={vec(width / 2, 332)}
          colors={[hexWash(color, 0.55), hexWash(color, 0.22), hexWash(color, 0.07), hexWash(color, 0)]}
        />
      </Path>
    </Group>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 340,
    alignItems: 'center',
    overflow: 'visible',
    zIndex: 6,
  },
});

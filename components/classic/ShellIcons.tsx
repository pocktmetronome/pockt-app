import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';

import { NorthStarImage, northStar } from '@/components/classic/north-star-assets';
import { proofFlags } from '@/lib/proof-flags';

export type ShellIconName =
  | 'fork'
  | 'speaker'
  | 'play'
  | 'dial'
  | 'rhythm'
  | 'pulse'
  | 'pendulum'
  | 'pro'
  | 'beatline';

const PATHS: Record<ShellIconName, string> = {
  fork: 'M8 3 V9 A4 4 0 0 0 16 9 V3 M12 13 V21 M9.5 21 H14.5',
  speaker: 'M4 10 H8 L13 6 V18 L8 14 H4 Z M16 9 C17.4 10.1 17.4 13.9 16 15 M18.7 6.7 C21.7 9.5 21.7 14.5 18.7 17.3',
  play: 'M5 3.5 L19.5 12 L5 20.5 Z',
  dial: 'M12 5 A7 7 0 1 0 12 19 A7 7 0 1 0 12 5 M12 5 V12 L16 13',
  rhythm: 'M5 6 L11 12 L5 18 M12 6 L18 12 L12 18',
  pulse: 'M3 13 H7 L9 7 L13 17 L15 12 H21',
  pendulum: 'M12 6.1 V15.4',
  pro: 'M6 5 V19 M12 8 V19 M18 3 V19',
  beatline: 'M3 16 L7 9 L11 14 L15 6 L21 16',
};

export function ShellGlyph({
  name,
  size = 22,
  color = '#E7D3A8',
  strokeWidth = 1.8,
  fillScale = 1,
}: {
  name: ShellIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fillScale?: number;
}) {
  if (name === 'pendulum') {
    const bob = fillScale > 1 ? 0.11 : 0.24;
    const rodTop = fillScale > 1 ? 0.18 : 0.22;
    const rodBottom = fillScale > 1 ? 0.72 : 0.56;
    const pivotY = fillScale > 1 ? 0.12 : 0.16;
    const rod = Skia.Path.MakeFromSVGString(`M${size * 0.5} ${size * rodTop} V${size * rodBottom}`);
    return (
      <Canvas style={{ width: size, height: size }}>
        <Circle cx={size * 0.5} cy={size * pivotY} r={Math.max(1.2, size * 0.045)} color={color} />
        {rod ? <Path path={rod} color={color} style="stroke" strokeWidth={Math.max(1.4, size * 0.07)} strokeCap="round" /> : null}
        <Circle cx={size * 0.5} cy={size * (rodBottom + bob * 0.15)} r={Math.max(fillScale > 1 ? 3.4 : 2.4, size * bob)} color={color} />
      </Canvas>
    );
  }
  const path = Skia.Path.MakeFromSVGString(PATHS[name]);
  if (!path) return <View style={{ width: size, height: size }} />;
  const fit = Skia.Matrix();
  // SkMatrix::scale/translate pre-concat, so the last call hits the point first.
  fit.translate(size / 2, size / 2);
  fit.scale(fillScale, fillScale);
  fit.translate(-size / 2, -size / 2);
  fit.scale(size / 24, size / 24);
  path.transform(fit);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style={name === 'play' ? 'fill' : 'stroke'}
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}

/** Loop arrows from assets/north-star-v3/svg/icon_loop.svg. */
export function LoopArrows({ size = 28, color = '#E7D3A8' }: { size?: number; color?: string }) {
  const paths = [
    'M26 35c7-9 16-13 27-13 14 0 25 7 31 18',
    'M79 25l5 15-15 2',
    'M74 65c-7 9-16 13-27 13-14 0-25-7-31-18',
    'M21 75l-5-15 15-2',
  ]
    .map((d) => Skia.Path.MakeFromSVGString(d))
    .filter((path): path is NonNullable<typeof path> => path != null);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: size / 100 }]}>
        {paths.map((path, index) => (
          <Path
            key={index}
            path={path}
            color={color}
            style="stroke"
            strokeWidth={7}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}
      </Group>
    </Canvas>
  );
}

export function ShellHeaderButton({
  label,
  glyph,
  selected = false,
  proofDown = false,
  visualSize,
  onPress,
}: {
  label: string;
  glyph: ShellIconName;
  selected?: boolean;
  proofDown?: boolean;
  visualSize?: number;
  onPress: () => void;
}) {
  const [down, setDown] = useState(false);
  const forced = down || proofDown || (glyph === 'fork' ? proofFlags.tunerDown : glyph === 'speaker' ? proofFlags.soundDown : false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={
        visualSize
          ? { top: Math.max(8, (visualSize - 48) / 2), bottom: 10, left: 8, right: 8 }
          : { top: 6, bottom: 10, left: 8, right: 8 }
      }
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      testID={glyph === 'fork' ? 'header-tuner' : 'header-sound'}
      style={[styles.hit, visualSize ? styles.hitOpen : null, forced && styles.down]}>
      <View
        pointerEvents="none"
        style={
          visualSize
            ? { position: 'absolute', width: visualSize, height: visualSize, left: '50%', top: '50%', marginLeft: -visualSize / 2, marginTop: -visualSize / 2 }
            : StyleSheet.absoluteFill
        }>
        <NorthStarImage source={forced ? northStar.headerPressed : northStar.headerRest} mode="stretch" />
      </View>
      <ShellGlyph name={glyph} size={visualSize ? 30 : 36} color={selected || forced ? '#F6E7C8' : '#E7D3A8'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flex: 1,
    position: 'relative',
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hitOpen: {
    overflow: 'visible',
  },
  down: {
    transform: [{ translateY: 1.5 }],
  },
  selected: {
    backgroundColor: 'rgba(212, 168, 92, 0.16)',
  },
});

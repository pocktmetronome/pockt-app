import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, Text as NativeText, View } from 'react-native';
import { Canvas, Line, Text, matchFont } from '@shopify/react-native-skia';
import { runOnJS, useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { angleFromDialBpm, DIAL_MARKS } from '@/lib/pockt-dial-scale';
import {
  DIAL_PHOTO_MAJOR_LENGTH,
  DIAL_PHOTO_MAJOR_WIDTH,
  DIAL_PHOTO_MID_LENGTH,
  DIAL_PHOTO_MID_WIDTH,
  DIAL_PHOTO_MINOR_LENGTH,
  DIAL_PHOTO_MINOR_WIDTH,
  DIAL_PHOTO_NUMERAL_RADIUS,
  DIAL_PHOTO_NUMERAL_SIZE,
  DIAL_PHOTO_TICK_OUTER,
  dialLandmarkEmphasis,
  dialPhotoPointerTheta,
  dialPhotoTicksAt,
  dialTickEmphasis,
  type DialPhotoTickLevel,
} from '@/lib/dial-photo-v3';

const plate = require('@/assets/dial-photo-v3/dial-base-blank.png');

const LENGTH: Record<DialPhotoTickLevel, number> = {
  major: DIAL_PHOTO_MAJOR_LENGTH,
  mid: DIAL_PHOTO_MID_LENGTH,
  minor: DIAL_PHOTO_MINOR_LENGTH,
};

const WIDTH: Record<DialPhotoTickLevel, number> = {
  major: DIAL_PHOTO_MAJOR_WIDTH,
  mid: DIAL_PHOTO_MID_WIDTH,
  minor: DIAL_PHOTO_MINOR_WIDTH,
};

const TICK_COLOR: Record<DialPhotoTickLevel, string> = {
  major: 'rgba(248,224,190,0.96)',
  mid: 'rgba(236,212,176,0.9)',
  minor: 'rgba(224,200,166,0.82)',
};

type Props = {
  bpm: number;
  size: number;
  /** Live pointer angle from the gesture engine. Presentation only. */
  angle?: SharedValue<number>;
};

function webLabelWidth(label: string, fontSize: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return fontSize * 0.55 * label.length;
  context.font = `600 ${fontSize}px "Arial Narrow", "DIN Alternate", sans-serif`;
  return context.measureText(label).width;
}

function placeNumeral(mark: number, pointerAngle: number, bpm: number, size: number, cx: number, cy: number, numeralRadius: number) {
  const theta = dialPhotoPointerTheta(mark, pointerAngle);
  const label = String(mark);
  const emphasis = dialLandmarkEmphasis(bpm, mark);
  const fontSize = size * DIAL_PHOTO_NUMERAL_SIZE * (1 + emphasis * 0.06);
  const font = Platform.OS === 'web' ? null : matchFont({ fontFamily: 'DIN Alternate', fontSize, fontWeight: emphasis > 0.85 ? '700' : '600' });
  const width = font ? font.getTextWidth(label) : webLabelWidth(label, fontSize);
  const centerX = cx + Math.sin(theta) * numeralRadius;
  const centerY = cy - Math.cos(theta) * numeralRadius;
  const alpha = (0.72 + emphasis * 0.26).toFixed(3);
  return {
    label,
    font,
    fontSize,
    ink: `rgba(252,232,198,${alpha})`,
    width,
    centerX,
    centerY,
    x: centerX - width / 2,
    y: centerY + fontSize * 0.34,
  };
}

/**
 * Photographic hardware stays still. Only ticks and numerals move,
 * and numerals stay upright to the screen.
 * Numerals use DIN Alternate, the condensed instrument face shipped with iOS.
 */
export function PhotoDialV3({ bpm, size, angle }: Props) {
  const parked = useSharedValue(angleFromDialBpm(bpm));
  const [pointerAngle, setPointerAngle] = useState(() => angleFromDialBpm(bpm));
  useEffect(() => {
    const next = angleFromDialBpm(bpm);
    parked.value = next;
    if (!angle) setPointerAngle(next);
  }, [angle, bpm, parked]);
  useAnimatedReaction(
    () => (angle ? angle.value : parked.value),
    (value, previous) => {
      if (previous == null || value !== previous) runOnJS(setPointerAngle)(value);
    }
  );
  const ticks = dialPhotoTicksAt(pointerAngle);
  const cx = size / 2;
  const cy = size / 2;
  const tickOuter = size * DIAL_PHOTO_TICK_OUTER;
  const numeralRadius = size * DIAL_PHOTO_NUMERAL_RADIUS;
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Image source={plate} style={{ width: size, height: size }} resizeMode="contain" />
      <Canvas style={StyleSheet.absoluteFill}>
        {ticks.map((tick) => {
          const emphasis = dialTickEmphasis(bpm, tick.mark);
          const length = size * LENGTH[tick.level] * (1 + emphasis * 0.18);
          const width = Math.max(0.6, size * WIDTH[tick.level] * (1 + emphasis * 0.35));
          const inner = tickOuter - length;
          const x0 = cx + Math.sin(tick.theta) * inner;
          const y0 = cy - Math.cos(tick.theta) * inner;
          const x1 = cx + Math.sin(tick.theta) * tickOuter;
          const y1 = cy - Math.cos(tick.theta) * tickOuter;
          const color =
            emphasis > 0
              ? `rgba(255,236,208,${(0.55 + emphasis * 0.45).toFixed(3)})`
              : TICK_COLOR[tick.level];
          return (
            <Line
              key={tick.mark}
              p1={{ x: x0, y: y0 }}
              p2={{ x: x1, y: y1 }}
              color={color}
              strokeWidth={width}
            />
          );
        })}
        {Platform.OS === 'web'
          ? null
          : DIAL_MARKS.map((mark) => {
              const placed = placeNumeral(mark, pointerAngle, bpm, size, cx, cy, numeralRadius);
              if (!placed.font) return null;
              return (
                <Text
                  key={`${mark}-shadow`}
                  x={placed.x + size * 0.0011}
                  y={placed.y + size * 0.0015}
                  text={placed.label}
                  font={placed.font}
                  color="rgba(8,6,4,0.7)"
                />
              );
            })}
        {Platform.OS === 'web'
          ? null
          : DIAL_MARKS.map((mark) => {
              const placed = placeNumeral(mark, pointerAngle, bpm, size, cx, cy, numeralRadius);
              if (!placed.font) return null;
              return (
                <Text key={mark} x={placed.x} y={placed.y} text={placed.label} font={placed.font} color={placed.ink} />
              );
            })}
      </Canvas>
      {Platform.OS === 'web'
        ? DIAL_MARKS.map((mark) => {
            const placed = placeNumeral(mark, pointerAngle, bpm, size, cx, cy, numeralRadius);
            const numeralStyle = {
              width: placed.width,
              fontSize: placed.fontSize,
              lineHeight: placed.fontSize,
              fontWeight: '600' as const,
              fontFamily: 'Arial Narrow',
              textAlign: 'center' as const,
            };
            return (
              <View
                key={mark}
                pointerEvents="none"
                style={{ position: 'absolute', left: placed.x, top: placed.centerY - placed.fontSize * 0.5, width: placed.width }}>
                <NativeText style={[numeralStyle, { position: 'absolute', left: size * 0.0011, top: size * 0.0015, color: 'rgba(8,6,4,0.7)' }]}>
                  {placed.label}
                </NativeText>
                <NativeText style={[numeralStyle, { color: placed.ink }]}>{placed.label}</NativeText>
              </View>
            );
          })
        : null}
    </View>
  );
}

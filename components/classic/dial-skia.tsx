import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Image,
  LinearGradient,
  ImageShader,
  Line,
  Oval,
  Path,
  RoundedRect,
  Skia,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { angleFromDialBpm, dialScaleRotation, dialScaleTicks } from '@/lib/pockt-dial-scale';

function useHardwareImage(source: number): SkImage | null {
  const [image, setImage] = useState<SkImage | null>(null);
  useEffect(() => {
    let alive = true;
    const asset = Asset.fromModule(source);
    const ready = asset.localUri || asset.uri ? Promise.resolve(asset) : asset.downloadAsync();
    ready
      .then((loaded) => Skia.Data.fromURI(loaded.localUri ?? loaded.uri))
      .then((data) => {
        const next = Skia.Image.MakeImageFromEncoded(data);
        if (alive && next) setImage(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [source]);
  return image;
}

const PLATE = require('@/assets/dial-hardware/dial-plate.png');
const HUB = require('@/assets/dial-hardware/hub.png');
const PHOTO_SHADOW = require('@/assets/shell-v2/dial-shadow.png');
const PHOTO_BEZEL = require('@/assets/shell-v2/dial-bezel.png');
const PHOTO_FACE = require('@/assets/shell-v2/dial-face-blank.png');
const PHOTO_SCALE = require('@/assets/shell-v2/dial-scale-ring-blank.png');
const PHOTO_BEARING = require('@/assets/shell-v2/dial-bearing.png');
const PHOTO_POINTER = require('@/assets/shell-v2/dial-pointer.png');
const PLAY_REST = require('@/assets/dial-hardware/play-rest.png');
const PLAY_DOWN = require('@/assets/dial-hardware/play-down.png');
const PLAY_STOP = require('@/assets/dial-hardware/play-stop.png');
void PLAY_REST;
void PLAY_DOWN;
void PLAY_STOP;
const CHASSIS = require('@/assets/shell-v2/chassis.png');
const KNOB_STEEL = require('@/assets/dial-hardware/knob-steel.png');
const KNOB_BRONZE = require('@/assets/dial-hardware/knob-bronze.png');
const P_RIM = require('@/assets/dial-hardware/p-rim.png');
const BEAT = require('@/assets/dial-hardware/beat-cap.png');
const BEAT_LAMP = require('@/assets/dial-hardware/beat-lamp.png');
const RAIL = require('@/assets/dial-hardware/rail.png');
const NAV = require('@/assets/shell-v2/nav-rail.png');
/** Fractions of the dial square. Ticks and numerals share this annulus. */
export const SCALE_NUMERAL_RADIUS = 0.346;
export const SCALE_NUMERAL_SIZE = 15;
export const SCALE_TICK_OUTER = 0.445;
export const SCALE_TICK_INNER = 0.408;
export const SCALE_TICK_MAJOR_INNER = 0.392;
export const POINTER_TIP_RADIUS = 0.348;
/** Reference numerals tilt with the dial and stay readable. */
export const SCALE_TILT = 1;

function needlePath(size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const tip = cy - size * POINTER_TIP_RADIUS;
  const head = Math.max(4.2, size * 0.016);
  const shaft = Math.max(1.6, size * 0.006);
  const neck = tip + head * 1.35;
  const end = cy - size * 0.048;
  const path = Skia.Path.Make();
  path.moveTo(cx, tip);
  path.lineTo(cx + head * 0.42, tip + head * 0.95);
  path.lineTo(cx + shaft, neck);
  path.lineTo(cx + shaft, end);
  path.lineTo(cx - shaft, end);
  path.lineTo(cx - shaft, neck);
  path.lineTo(cx - head * 0.42, tip + head * 0.95);
  path.close();
  return path;
}

export function ChassisFill({ width, height }: { width: number; height: number }) {
  const image = useHardwareImage(CHASSIS);
  if (width < 2 || height < 2 || !image) return null;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image image={image} x={0} y={0} width={width} height={height} fit="fill" />
    </Canvas>
  );
}

export function DialPlate({ size, angle }: { size: number; angle: SharedValue<number> }) {
  const plate = useHardwareImage(PLATE);
  const hub = useHardwareImage(HUB);
  const photoShadow = useHardwareImage(PHOTO_SHADOW);
  const photoBezel = useHardwareImage(PHOTO_BEZEL);
  const photoFace = useHardwareImage(PHOTO_FACE);
  const photoScale = useHardwareImage(PHOTO_SCALE);
  const photoBearing = useHardwareImage(PHOTO_BEARING);
  const photoPointer = useHardwareImage(PHOTO_POINTER);
  const turn = useDerivedValue(() => [{ rotate: dialScaleRotation(angle.value) }]);
  const needle = useMemo(() => needlePath(size), [size]);
  const faceClip = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(size / 2, size / 2, size * 0.4);
    return path;
  }, [size]);
  const cx = size / 2;
  const cy = size / 2;
  const origin = vec(cx, cy);
  const hubSize = size * 0.126;
  const tip = cy - size * POINTER_TIP_RADIUS;
  const shaftEnd = cy - size * 0.05;
  const tailTop = cy + size * 0.05;
  const tailH = size * 0.052;
  const tailW = Math.max(2.6, size * 0.01);
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      {photoShadow ? <Image image={photoShadow} x={0} y={0} width={size} height={size} fit="fill" /> : null}
      {photoBezel ? <Image image={photoBezel} x={0} y={0} width={size} height={size} fit="fill" /> : null}
      {photoFace ? <Image image={photoFace} x={0} y={0} width={size} height={size} fit="fill" /> : null}
      {plate ? null : null}
      {faceClip ? null : null}
      <Group origin={origin} transform={turn}>
        {photoScale ? <Image image={photoScale} x={0} y={0} width={size} height={size} fit="fill" /> : null}
      </Group>
      {photoBearing ? <Image image={photoBearing} x={0} y={0} width={size} height={size} fit="fill" /> : null}
      <Group origin={origin}>
        {photoPointer ? <Image image={photoPointer} x={0} y={0} width={size} height={size} fit="fill" /> : null}
        {hub ? null : null}
      </Group>
    </Canvas>
  );
}

export function DeckToggleFace({ width, height, lit }: { width: number; height: number; lit: boolean }) {
  if (width < 2 || height < 2) return null;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <RoundedRect x={0.5} y={0.5} width={width - 1} height={height - 1} r={4} color="#6E5430" />
      <RoundedRect x={2} y={2} width={width - 4} height={height - 4} r={3} color="#12100E" />
      <Circle cx={width * 0.5} cy={height * 0.22} r={1.6} color="#E4C48A" />
      <Circle cx={width * 0.5} cy={height * 0.78} r={1.6} color="#7EE8DE" />
      <Group origin={vec(width * 0.5, height * 0.5)} transform={[{ rotate: lit ? 0.42 : -0.42 }]}>
        <RoundedRect x={width * 0.32} y={height * 0.18} width={width * 0.36} height={height * 0.64} r={width * 0.12} color={lit ? '#9AA6AE' : '#C4A36A'} />
        <RoundedRect x={width * 0.4} y={height * 0.24} width={width * 0.12} height={height * 0.42} r={1} color="rgba(244,246,248,0.55)" />
      </Group>
      <Circle cx={width * 0.5} cy={height * 0.5} r={2.2} color="#1A140C" />
      <Circle cx={width * 0.5} cy={height * 0.5} r={1.1} color="#E8D6B0" />
    </Canvas>
  );
}

export function PlayChrome({
  width,
  height,
  playing = false,
  depressed = false,
}: {
  width: number;
  height: number;
  playing?: boolean;
  depressed?: boolean;
}) {
  if (width < 2 || height < 2) return null;
  const travel = depressed ? Math.min(9, height * 0.12) : 0;
  const r = Math.min(width, height) * 0.22;
  const face = playing ? '#2C261C' : '#C6A56A';
  const glyph = playing ? '#E7D3A4' : '#1A140C';
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <RoundedRect x={width * 0.08} y={height * 0.16} width={width * 0.84} height={height * 0.78} r={r} color="rgba(0,0,0,0.55)">
        <BlurMask blur={7} style="normal" />
      </RoundedRect>
      <RoundedRect x={1} y={1} width={width - 2} height={height - 4} r={r} color="#121416">
        <LinearGradient start={vec(0, 0)} end={vec(width, height)} colors={['#3A3E42', '#16181A', '#0A0B0C']} />
      </RoundedRect>
      <RoundedRect x={3} y={3} width={width - 6} height={height * 0.16} r={r * 0.6} color="rgba(232,224,208,0.18)" />
      <RoundedRect
        x={width * 0.16}
        y={height * 0.18 + travel}
        width={width * 0.68}
        height={height * 0.5}
        r={r * 0.85}
        color={face}>
        <LinearGradient start={vec(width * 0.15, height * 0.1)} end={vec(width * 0.8, height * 0.9)} colors={playing ? ['#4A4030', '#241C14'] : ['#E8D4A8', '#A68448', '#6E5430']} />
      </RoundedRect>
      {playing ? (
        <RoundedRect x={width * 0.38} y={height * 0.32 + travel} width={width * 0.24} height={height * 0.28} r={2} color={glyph} />
      ) : (
        <Path
          path={playMark(width * 0.42, height * 0.3 + travel, width * 0.22, height * 0.32)}
          color={glyph}
        />
      )}
    </Canvas>
  );
}

function playMark(x: number, y: number, w: number, h: number) {
  const path = Skia.Path.Make();
  path.moveTo(x, y);
  path.lineTo(x, y + h);
  path.lineTo(x + w, y + h / 2);
  path.close();
  return path;
}

export function PlayGlyph({ size }: { size: number }) {
  const h = Math.max(16, Math.round(size * 0.42));
  const w = Math.max(14, Math.round(size * 0.34));
  return (
    <View pointerEvents="none" style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: h / 2,
          borderBottomWidth: h / 2,
          borderLeftWidth: w,
          borderTopColor: '#5E686F',
          borderBottomColor: '#5E686F',
          borderLeftColor: '#E7C98A',
        }}
      />
    </View>
  );
}

export function KnobFace({ size, bronze = false, rim = false }: { size: number; bronze?: boolean; rim?: boolean }) {
  const steel = useHardwareImage(KNOB_STEEL);
  const brass = useHardwareImage(KNOB_BRONZE);
  const ring = useHardwareImage(P_RIM);
  const image = rim ? ring : bronze ? brass : steel;
  return (
    <Canvas style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }} pointerEvents="none">
      <Circle cx={size / 2 + 0.6} cy={size / 2 + 1.6} r={size * 0.48} color="rgba(0,0,0,0.45)">
        <BlurMask blur={3} style="normal" />
      </Circle>
      {image ? <Image image={image} x={0} y={0} width={size} height={size} fit="contain" /> : null}
    </Canvas>
  );
}

export function BeatMetal({ size, lamp }: { size: number; lamp: number }) {
  const image = useHardwareImage(BEAT);
  const glow = useHardwareImage(BEAT_LAMP);
  if (size < 2) return null;
  const glowSize = size * 0.62;
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle cx={size / 2 + 0.4} cy={size / 2 + 1} r={size * 0.48} color="rgba(0,0,0,0.4)">
        <BlurMask blur={2} style="normal" />
      </Circle>
      {image ? <Image image={image} x={0} y={0} width={size} height={size} fit="contain" /> : null}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size * 0.34}
        color={lamp < 0.04 ? 'rgba(0,0,0,0.72)' : `rgba(255, 196, 120, ${Math.min(0.92, 0.16 + lamp * 0.76)})`}
      />
      {lamp > 0.05 && glow ? (
        <Image
          image={glow}
          x={(size - glowSize) / 2}
          y={(size - glowSize) / 2}
          width={glowSize}
          height={glowSize}
          fit="contain"
          opacity={Math.min(1, lamp)}
        />
      ) : null}
    </Canvas>
  );
}

export function MetalBar({ width, height, tone }: { width: number; height: number; tone: 'graphite' | 'bronze' | 'nav' }) {
  const rail = useHardwareImage(RAIL);
  const nav = useHardwareImage(NAV);
  const image = tone === 'nav' ? nav : rail;
  const radius = useMemo(() => (tone === 'nav' ? 18 : Math.max(8, height * 0.42)), [height, tone]);
  if (width < 2 || height < 2) return null;
  if (tone === 'bronze') {
    return (
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <RoundedRect x={1} y={3} width={width - 2} height={height - 2} r={radius} color="rgba(0,0,0,0.45)" />
        <RoundedRect x={0} y={0} width={width} height={height} r={radius} color="#6E5430" />
        <RoundedRect x={1.5} y={1.5} width={width - 3} height={height * 0.46} r={radius} color="#E8D4A8" />
        <RoundedRect x={1.5} y={height * 0.4} width={width - 3} height={height * 0.56} r={radius} color="#A68448" />
        <RoundedRect x={width * 0.08} y={2} width={width * 0.28} height={height * 0.18} r={4} color="rgba(255,244,220,0.28)" />
      </Canvas>
    );
  }
  if (!image) return null;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <RoundedRect x={1} y={3} width={width - 2} height={height - 1} r={radius} color="rgba(0,0,0,0.5)">
        <BlurMask blur={5} style="normal" />
      </RoundedRect>
      <RoundedRect x={0} y={0} width={width} height={height} r={radius}>
        <ImageShader image={image} tx="clamp" ty="clamp" fit="fill" rect={{ x: 0, y: 0, width, height }} />
      </RoundedRect>
    </Canvas>
  );
}

export function scaleLabelRadius(size: number) {
  return size * SCALE_NUMERAL_RADIUS;
}

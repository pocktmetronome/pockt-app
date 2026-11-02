import { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { fingerAngle, integerBpm, rotationForBpm, turnDial, wrapPi } from '@/lib/dial-ring-turn';
import { hapticLight } from '@/lib/haptics';

const FLUTE_RING = require('../../assets/north-star-v6/flute-ring.png');

type Props = {
  bpm: number;
  invert?: boolean;
  haptic?: boolean;
  onBpm: (bpm: number) => void;
};

export function NorthStarDialTurn({ bpm, invert = false, haptic = true, onBpm }: Props) {
  const rotation = useSharedValue(rotationForBpm(bpm));
  const originRotation = useSharedValue(rotationForBpm(bpm));
  const originBpm = useSharedValue(bpm);
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const halfW = useSharedValue(1);
  const halfH = useSharedValue(1);
  const invertTurn = useSharedValue(invert ? 1 : 0);
  const lastInteger = useSharedValue(bpm);
  const liveBpm = useSharedValue(bpm);
  const fromFinger = useRef(false);
  const lastCommitted = useRef(bpm);
  const onBpmRef = useRef(onBpm);
  const hapticRef = useRef(haptic);
  onBpmRef.current = onBpm;
  hapticRef.current = haptic;

  const commit = useCallback((next: number) => {
    fromFinger.current = true;
    if (next === lastCommitted.current) return;
    lastCommitted.current = next;
    if (hapticRef.current) void hapticLight();
    onBpmRef.current(next);
  }, []);

  useEffect(() => {
    invertTurn.value = invert ? 1 : 0;
  }, [invert, invertTurn]);

  useEffect(() => {
    if (fromFinger.current) {
      fromFinger.current = false;
      return;
    }
    lastCommitted.current = bpm;
    lastInteger.value = bpm;
    liveBpm.value = bpm;
    originBpm.value = bpm;
    rotation.value = rotationForBpm(bpm);
  }, [bpm, lastInteger, liveBpm, originBpm, rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}rad` }],
  }));

  const gesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((event) => {
      'worklet';
      lastX.value = event.x;
      lastY.value = event.y;
      originRotation.value = rotation.value;
      originBpm.value = liveBpm.value;
    })
    .onUpdate((event) => {
      'worklet';
      const previous = fingerAngle(lastX.value, lastY.value, halfW.value, halfH.value);
      const next = fingerAngle(event.x, event.y, halfW.value, halfH.value);
      lastX.value = event.x;
      lastY.value = event.y;
      let delta = wrapPi(next - previous);
      if (invertTurn.value !== 0) delta = -delta;
      const turned = turnDial({
        rotation: rotation.value,
        originRotation: originRotation.value,
        originBpm: originBpm.value,
        deltaRadians: delta,
      });
      rotation.value = turned.rotation;
      liveBpm.value = turned.bpm;
      const reported = integerBpm(turned.bpm);
      if (reported !== lastInteger.value) {
        lastInteger.value = reported;
        runOnJS(commit)(reported);
      }
    })
    .onFinalize(() => {
      'worklet';
    });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(event) => {
        halfW.value = event.nativeEvent.layout.width / 2;
        halfH.value = event.nativeEvent.layout.height / 2;
      }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ringStyle]}>
        <Image source={FLUTE_RING} resizeMode="stretch" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <GestureDetector gesture={gesture}>
        <Animated.View collapsable={false} style={StyleSheet.absoluteFill} />
      </GestureDetector>
    </View>
  );
}

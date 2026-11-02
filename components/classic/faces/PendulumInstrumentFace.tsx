import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { MECHANICAL_WALNUT_STUDIO } from '@/lib/classic-assets';
import { pendulumAngleFromFinger, pendulumRenderedDegrees } from '@/lib/face-geometry';
import { mechanicalWeightT } from '@/lib/mechanical-scale';
import { weightTopFromT } from '@/lib/mechanical-plate';
import { tipSwingDegrees } from '@/lib/pendulum-motion';

type Props = {
  size: number;
  playing: boolean;
  bpm: number;
  pulse: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  pulseSpb?: SharedValue<number>;
  pulseHostOffset?: SharedValue<number>;
  previewAngle?: number | null;
  previewHeld?: boolean;
};

/**
 * PendulaClassicRoom mechanism from ca6b267, swung from the bottom pivot.
 * Finger X owns the angle while held. Release returns to native phase.
 * The weight shows tempo. Dragging does not write BPM.
 */
export function PendulumInstrumentFace({
  size,
  playing,
  bpm,
  pulse,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  previewAngle = null,
  previewHeld = false,
}: Props) {
  const rodH = size * 0.5;
  const weightW = Math.max(28, Math.round(size * 0.11));
  const swingDeg = tipSwingDegrees(rodH, size, weightW / 2 + 8);
  const hitW = size * 0.72;
  const held = useSharedValue(previewAngle == null ? 0 : 1);
  const drag = useSharedValue(previewAngle ?? 0);
  const blend = useSharedValue(previewAngle == null ? 0 : 1);
  const angle = usePendulumPhase(
    playing,
    bpm,
    pulse,
    swingDeg,
    true,
    pulseBeat,
    held,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  useEffect(() => {
    if (previewAngle == null) return;
    drag.value = previewAngle;
    held.value = 1;
    blend.value = 1;
  }, [blend, drag, held, previewAngle]);
  const grab = Gesture.Pan()
    .onBegin(() => {
      held.value = 1;
      blend.value = 1;
    })
    .onUpdate((event) => {
      drag.value = pendulumAngleFromFinger(event.x, hitW, swingDeg);
    })
    .onFinalize(() => {
      held.value = 0;
      blend.value = withTiming(0, { duration: 180 });
    });
  const arm = useAnimatedStyle(() => ({
    transformOrigin: 'bottom',
    transform: [{ rotate: `${pendulumRenderedDegrees(held.value, drag.value, blend.value, angle.value)}deg` }],
  }));
  const armW = Math.max(7, Math.round(size * 0.02));
  const weightH = Math.max(34, Math.round(size * 0.13));
  const weightTop = weightTopFromT(mechanicalWeightT(bpm), rodH, weightH);

  return (
    <View style={[styles.stage, { width: size, height: size }]} testID="console-face-pendulum" pointerEvents="box-none">
      <Image
        pointerEvents="none"
        source={MECHANICAL_WALNUT_STUDIO}
        style={[styles.plate, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
      />
      <GestureDetector gesture={grab}>
        <Animated.View
          accessibilityLabel="Pendulum. Drag sideways to move it."
          style={[styles.hit, { left: (size - hitW) / 2, width: hitW, top: size * 0.04, height: size * 0.9 }]}>
          <Animated.View style={[styles.rodWrap, { height: rodH, width: 56, left: (hitW - 56) / 2, bottom: size * 0.12 }, arm]}>
            <LinearGradient
              colors={['#F4F7FB', '#C5CCD4', '#8E959E', '#E8EEF4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.rod, { width: armW }]}
            />
            <View
              style={[
                styles.weight,
                { width: weightW, height: weightH, left: 28 - weightW / 2, top: weightTop, borderColor: previewHeld ? '#7EE8DE' : 'rgba(255,255,255,0.28)' },
              ]}>
              <LinearGradient colors={['#F7F4EE', '#C8C2B6', '#8F897E', '#EDE8DF']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.weightSlot} />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#07080B',
    overflow: 'hidden',
  },
  plate: {
    position: 'absolute',
  },
  rodWrap: {
    position: 'absolute',
    alignItems: 'center',
    overflow: 'visible',
  },
  weightSlot: {
    position: 'absolute',
    top: '22%',
    bottom: '22%',
    left: '42%',
    width: 5,
    borderRadius: 2,
    backgroundColor: 'rgba(20,16,12,0.55)',
  },
  markPivot: {
    position: 'absolute',
    left: '50%',
    top: '18%',
    bottom: '10%',
    width: 2,
    marginLeft: -1,
    alignItems: 'center',
    transformOrigin: 'bottom',
  },
  mark: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(214, 196, 160, 0.45)',
  },
  markCenter: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(126, 232, 222, 0.7)',
  },
  hit: {
    position: 'absolute',
  },
  rod: {
    flex: 1,
    borderRadius: 2,
  },
  arm: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: '#1B2127',
    borderWidth: 1,
    borderColor: '#6A5530',
    overflow: 'hidden',
  },
  armShade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#07090B',
  },
  armShine: {
    position: 'absolute',
    left: 1,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(232, 238, 242, 0.72)',
  },
  armBronze: {
    position: 'absolute',
    left: '46%',
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: 'rgba(196, 163, 106, 0.7)',
  },
  armTip: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3C454E',
    borderWidth: 1,
    borderColor: '#C4A36A',
  },
  weight: {
    position: 'absolute',
    left: '50%',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#C4A36A',
    borderTopColor: '#E7D7B8',
    overflow: 'hidden',
    zIndex: 2,
  },
  cheek: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#161C22',
    borderRightWidth: 1,
    borderRightColor: '#2C343C',
  },
  cheekRight: {
    right: 0,
    left: undefined,
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#0A0C0E',
    backgroundColor: '#12171C',
  },
  clamp: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 6,
    backgroundColor: '#2A2418',
    borderBottomWidth: 1,
    borderBottomColor: '#8C7040',
    zIndex: 3,
  },
  clampBottom: {
    top: undefined,
    bottom: 0,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#5C4A2E',
    backgroundColor: '#1A160F',
  },
  weightHighlight: {
    position: 'absolute',
    top: 8,
    left: 4,
    width: 8,
    height: 3,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    zIndex: 4,
  },
  lock: {
    position: 'absolute',
    top: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0C0E11',
    borderWidth: 1,
    borderColor: '#E7D7B8',
    zIndex: 4,
  },
  plinth: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#12161A',
    borderWidth: 1,
    borderColor: '#3A3124',
    borderTopColor: '#A68448',
  },
  plinthLip: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: -3,
    height: 4,
    borderRadius: 1,
    backgroundColor: '#1C2228',
    borderWidth: 1,
    borderColor: '#6A5530',
  },
  bolt: {
    position: 'absolute',
    top: '32%',
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0C0E11',
    borderWidth: 1,
    borderColor: '#C4A36A',
  },
  boltRight: {
    left: undefined,
    right: 12,
  },
  saddle: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#1A2026',
    borderWidth: 1,
    borderColor: '#8C7040',
    borderTopColor: '#E7D7B8',
  },
  saddleScrew: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0C0E11',
    borderWidth: 1,
    borderColor: '#C4A36A',
  },
  saddleScrewRight: {
    left: undefined,
    right: 8,
  },
  bearing: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#101418',
    borderWidth: 3,
    borderColor: '#8C7040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bearingHeld: {
    borderColor: '#7EE8DE',
  },
  race: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#C4A36A',
    backgroundColor: '#1A2128',
  },
  raceInner: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#5C4A2E',
    backgroundColor: '#0C1014',
  },
  axle: {
    position: 'absolute',
    backgroundColor: '#E7D7B8',
  },
});

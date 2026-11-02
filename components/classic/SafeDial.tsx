import {
  Canvas,
  Circle,
  Group,
  Line,
  LinearGradient,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { rotaryDetent } from '@/lib/rotary-feedback';
import { DEG_PER_BPM, pointerAngle, wrapDelta } from '@/lib/pro-dial';

const KNURLS = 144;
const TICKS = 72;

function marks(count: number, cx: number, cy: number, inner: number, outer: number, majorEvery: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const major = index % majorEvery === 0;
    const start = major ? inner - 1.5 : inner;
    const end = major ? outer + 0.6 : outer;
    return {
      key: index,
      major,
      p1: vec(cx + Math.cos(angle) * start, cy + Math.sin(angle) * start),
      p2: vec(cx + Math.cos(angle) * end, cy + Math.sin(angle) * end),
    };
  });
}

type Props = {
  bpm: number;
  playing: boolean;
  size: number;
  onBpm: (next: number) => void;
  onToggle: () => void;
  uiClick?: boolean;
  invert?: boolean;
};

export function SafeDial({ bpm, playing, size, onBpm, onToggle, uiClick = true, invert = false }: Props) {
  const safeBpm = sanitizeBpm(bpm);
  const liveBpm = useSharedValue(safeBpm);
  const rotation = useSharedValue(safeBpm * DEG_PER_BPM);
  const lastAngle = useSharedValue(0);
  const lastCommitted = useSharedValue(safeBpm);
  const dragging = useSharedValue(0);
  const centerX = useSharedValue(size / 2);
  const centerY = useSharedValue(size / 2);
  const box = useRef<View>(null);
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    liveBpm.value = safeBpm;
    lastCommitted.value = safeBpm;
    if (dragging.value < 0.5) {
      const visual = rotation.value / DEG_PER_BPM;
      if (Math.abs(visual - safeBpm) > 0.51) {
        rotation.value = safeBpm * DEG_PER_BPM;
      }
    }
  }, [dragging, lastCommitted, liveBpm, rotation, safeBpm]);

  const knurls = useMemo(() => marks(KNURLS, cx, cy, size * 0.462, size * 0.496, 12), [cx, cy, size]);
  const ticks = useMemo(() => marks(TICKS, cx, cy, size * 0.368, size * 0.412, 6), [cx, cy, size]);

  const commit = useCallback(
    (next: number) => {
      const safe = sanitizeBpm(next, safeBpm);
      rotaryDetent('pro', uiClick);
      onBpm(safe);
    },
    [onBpm, safeBpm, uiClick]
  );

  const measureCenter = useCallback(() => {
    box.current?.measureInWindow((x, y, w, h) => {
      centerX.value = x + w / 2;
      centerY.value = y + h / 2;
    });
  }, [centerX, centerY]);

  useEffect(() => {
    measureCenter();
  }, [measureCenter, size]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .hitSlop(18)
        .onBegin((event) => {
          dragging.value = 1;
          lastAngle.value = pointerAngle(event.x, event.y, size / 2, size / 2);
        })
        .onUpdate((event) => {
          const nextAngle = pointerAngle(event.x, event.y, size / 2, size / 2);
          const delta = wrapDelta(nextAngle - lastAngle.value);
          lastAngle.value = nextAngle;
          const deg = ((delta * 180) / Math.PI) * (invert ? -1 : 1);
          const raw = liveBpm.value + deg / DEG_PER_BPM;
          const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, raw));
          const applied = (clamped - liveBpm.value) * DEG_PER_BPM;
          liveBpm.value = clamped;
          rotation.value = rotation.value + applied;
          const next = Math.round(clamped);
          if (next === lastCommitted.value) return;
          lastCommitted.value = next;
          runOnJS(commit)(next);
        })
        .onFinalize(() => {
          dragging.value = 0;
          const snapped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(liveBpm.value)));
          liveBpm.value = snapped;
          lastCommitted.value = snapped;
          runOnJS(commit)(snapped);
        }),
    [commit, dragging, invert, lastAngle, lastCommitted, liveBpm, rotation, size]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(10)
        .onEnd(() => {
          runOnJS(onToggle)();
        }),
    [onToggle]
  );

  const composed = useMemo(() => Gesture.Exclusive(gesture, tap), [gesture, tap]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: interpolate(dragging.value, [0, 1], [1, 0.992]) }],
  }));

  const engageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragging.value, [0, 1], [0, 0.1]),
  }));

  return (
    <View style={[styles.plate, { width: size + 36, height: size + 36 }]}>
      <View style={[styles.well, { width: size + 22, height: size + 22, borderRadius: (size + 22) / 2 }]} />
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Tempo dial, ${safeBpm} BPM. ${playing ? 'Playing' : 'Stopped'}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onBpm(sanitizeBpm(safeBpm + 1, safeBpm));
          if (event.nativeEvent.actionName === 'decrement') onBpm(sanitizeBpm(safeBpm - 1, safeBpm));
          if (event.nativeEvent.actionName === 'activate') onToggle();
        }}
        style={[styles.dial, { width: size, height: size, borderRadius: size / 2 }]}
        onLayout={measureCenter}
        ref={box}>
        <View pointerEvents="none" style={[styles.bezel, { borderRadius: size / 2 }]} />
        <Animated.View pointerEvents="none" style={[styles.wheel, { borderRadius: size / 2 }, wheelStyle]}>
            <Canvas style={{ width: size, height: size }}>
              <Circle cx={cx} cy={cy} r={size * 0.5}>
                <RadialGradient
                  c={vec(cx, cy)}
                  r={size * 0.5}
                  colors={['#2A261F', '#14110D', '#0A0806']}
                />
              </Circle>
              {knurls.map((mark) => (
                <Line
                  key={`k-${mark.key}`}
                  p1={mark.p1}
                  p2={mark.p2}
                  color={mark.major ? '#B8A888' : '#6A6054'}
                  strokeWidth={mark.major ? 1.15 : 0.7}
                />
              ))}
              <Circle cx={cx} cy={cy} r={size * 0.442}>
                <LinearGradient
                  start={vec(cx - size * 0.28, cy - size * 0.32)}
                  end={vec(cx + size * 0.3, cy + size * 0.3)}
                  colors={['#5A5448', '#2C2822', '#3E382F', '#1A1713']}
                />
              </Circle>
              <Circle cx={cx} cy={cy} r={size * 0.442} style="stroke" strokeWidth={1} color="rgba(232,220,196,0.16)" />
              <Circle cx={cx} cy={cy} r={size * 0.348}>
                <LinearGradient
                  start={vec(cx - size * 0.22, cy - size * 0.24)}
                  end={vec(cx + size * 0.24, cy + size * 0.22)}
                  colors={['#8A8276', '#5A544A', '#3A342C']}
                />
              </Circle>
              <Circle cx={cx} cy={cy} r={size * 0.348} style="stroke" strokeWidth={1.2} color="rgba(232,220,196,0.22)" />
              <Circle cx={cx} cy={cy} r={size * 0.348} style="stroke" strokeWidth={6} color="rgba(8,7,6,0.28)" />
              <Group>
                {ticks.map((mark) => (
                  <Line
                    key={`t-${mark.key}`}
                    p1={mark.p1}
                    p2={mark.p2}
                    color={mark.major ? '#E4D4B4' : '#7A7060'}
                    strokeWidth={mark.major ? 1.45 : 0.85}
                  />
                ))}
              </Group>
              <Circle cx={cx} cy={cy} r={size * 0.262}>
                <RadialGradient
                  c={vec(cx - size * 0.04, cy - size * 0.06)}
                  r={size * 0.28}
                  colors={['#26221C', '#14110E', '#0C0A08']}
                />
              </Circle>
              <Circle cx={cx} cy={cy} r={size * 0.262} style="stroke" strokeWidth={1.1} color="rgba(232,220,196,0.16)" />
            </Canvas>
            <View style={styles.facePip} />
          </Animated.View>
        <GestureDetector gesture={composed}>
          <View style={styles.hitLayer} collapsable={false} />
        </GestureDetector>
        <View pointerEvents="none" style={styles.light} />
        <Animated.View pointerEvents="none" style={[styles.engage, engageStyle]} />
        <View pointerEvents="none" style={styles.index} />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.hub, playing && styles.hubOn]}>
          <View style={styles.hubMedallion} />
          <Text style={[styles.hubText, playing && styles.hubTextOn]}>{playing ? 'STOP' : 'START'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  well: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.42)',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dial: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bezel: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: '#1C1914',
  },
  wheel: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  hitLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  facePip: {
    position: 'absolute',
    top: 13,
    left: '50%',
    marginLeft: -1.5,
    width: 3,
    height: 9,
    borderRadius: 1,
    backgroundColor: '#E8C878',
  },
  light: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(255,246,220,0.045)',
  },
  engage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: '#D8C8A0',
  },
  index: {
    position: 'absolute',
    top: 2,
    width: 4,
    height: 13,
    borderRadius: 1,
    backgroundColor: '#F4E8C8',
    zIndex: 5,
    shadowColor: '#F4E8C8',
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  hub: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C0A08',
    borderWidth: 2,
    borderColor: 'rgba(38,32,26,0.95)',
    zIndex: 6,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  hubMedallion: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(200,176,128,0.22)',
    backgroundColor: '#16130F',
  },
  hubOn: {
    backgroundColor: '#1C1812',
    borderColor: '#D4B56A',
  },
  hubText: {
    color: '#F4EDE0',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  hubTextOn: {
    color: '#E8C878',
  },
});

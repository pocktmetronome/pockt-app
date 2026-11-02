import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { PRIVACY_CURTAIN } from '@/constants/curtain';
import { ROOM_CURTAIN_HANDLE } from '@/constants/room-geometry';
import { hapticMedium, hapticSelection, hapticSoft } from '@/lib/haptics';
import {
  privacyProgressFromPan,
  privacyShouldClose,
  PRIVACY_CLOSE_THRESHOLD,
  PRIVACY_CLOSED_HARDWARE_MS,
  PRIVACY_IDLE_HARDWARE_MS,
  PRIVACY_IDLE_HINT_MS,
} from '@/lib/privacy-gesture';

const SPRING = { damping: 18, stiffness: 188, mass: 0.86 };
const CURTAIN_TAG = 'pockt-curtain';

type Props = {
  compact?: boolean;
  closed: boolean;
  settleKey?: string;
  onClosedChange: (closed: boolean) => void;
  onCoveringChange?: (covering: boolean) => void;
  hintSeen: boolean;
  onHintSeen: () => void;
};

export function PrivacyCurtain({
  compact: _compact,
  closed,
  settleKey,
  onClosedChange,
  onCoveringChange,
  hintSeen,
  onHintSeen,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(closed ? 1 : 0);
  const origin = useSharedValue(closed ? 1 : 0);
  const crossed = useSharedValue(false);
  const hint = useSharedValue(0);
  const teach = useSharedValue(0);
  const hardware = useSharedValue(1);
  const markScale = useSharedValue(1);
  const [covering, setCovering] = useState(closed);

  const openHandleTop = insets.top + 2;
  const closedHandleTop = height - Math.max(insets.bottom, 12) - ROOM_CURTAIN_HANDLE - 8;
  const travel = Math.max(1, closedHandleTop - openHandleTop);

  useEffect(() => {
    onCoveringChange?.(covering);
  }, [covering, onCoveringChange]);

  useEffect(() => {
    let active = false;
    if (!closed) {
      void Promise.resolve(deactivateKeepAwake(CURTAIN_TAG)).catch(() => {});
      return;
    }
    void activateKeepAwakeAsync(CURTAIN_TAG)
      .then(() => {
        active = true;
      })
      .catch(() => {
        active = false;
      });
    return () => {
      if (!active) return;
      void Promise.resolve(deactivateKeepAwake(CURTAIN_TAG)).catch(() => {});
    };
  }, [closed]);

  useEffect(() => {
    if (closed) {
      progress.value = 1;
      origin.value = 1;
      const timer = setTimeout(() => {
        hardware.value = withTiming(0, { duration: 420 });
        markScale.value = withTiming(1.28, { duration: 420 });
      }, PRIVACY_CLOSED_HARDWARE_MS);
      return () => clearTimeout(timer);
    }
    progress.value = 0;
    origin.value = 0;
    hardware.value = 1;
    markScale.value = withTiming(1, { duration: 160 });
    setCovering(false);
    const timer = setTimeout(() => {
      hardware.value = withTiming(0.18, { duration: 220 });
    }, PRIVACY_IDLE_HARDWARE_MS);
    return () => clearTimeout(timer);
  }, [closed, hardware, markScale, origin, progress, settleKey]);

  useEffect(() => {
    if (hintSeen || closed) return;
    hint.value = 0;
    hint.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) }),
      withDelay(520, withTiming(0, { duration: 180, easing: Easing.in(Easing.cubic) }))
    );
    teach.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 180 }));
    const timer = setTimeout(onHintSeen, PRIVACY_IDLE_HINT_MS);
    return () => clearTimeout(timer);
  }, [closed, hint, hintSeen, onHintSeen, settleKey, teach]);

  const settle = useCallback(
    (nextClosed: boolean) => {
      setCovering(nextClosed);
      onClosedChange(nextClosed);
      if (nextClosed) void hapticMedium();
      else void hapticSoft();
    },
    [onClosedChange]
  );

  const toggle = useCallback(() => {
    const nextClosed = !closed;
    progress.value = withSpring(nextClosed ? 1 : 0, SPRING);
    settle(nextClosed);
  }, [closed, progress, settle]);

  const grab = useCallback(() => {
    void hapticSoft();
    setCovering(true);
  }, []);

  const settleRef = useRef(settle);
  const grabRef = useRef(grab);
  settleRef.current = settle;
  grabRef.current = grab;

  const onGrab = useCallback(() => {
    grabRef.current();
  }, []);

  const onSettle = useCallback((nextClosed: boolean) => {
    settleRef.current(nextClosed);
  }, []);

  const onThreshold = useCallback(() => {
    void hapticSelection();
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .blocksExternalGesture()
        .activeOffsetY([-8, 8])
        .failOffsetX([-48, 48])
        .onBegin(() => {
          origin.value = progress.value;
          crossed.value = false;
          hardware.value = 1;
          runOnJS(onGrab)();
        })
        .onChange((event) => {
          const next = privacyProgressFromPan(origin.value, event.translationY, travel);
          progress.value = next;
          if (!crossed.value && next >= PRIVACY_CLOSE_THRESHOLD) {
            crossed.value = true;
            runOnJS(onThreshold)();
          }
        })
        .onFinalize((event) => {
          const shouldClose = privacyShouldClose(progress.value, event.velocityY);
          progress.value = withSpring(shouldClose ? 1 : 0, SPRING);
          runOnJS(onSettle)(shouldClose);
        }),
    [crossed, hardware, onGrab, onSettle, onThreshold, origin, progress, travel]
  );

  const revealHardware = useCallback(() => {
    hardware.value = withTiming(1, { duration: 180 });
    markScale.value = withTiming(1, { duration: 180 });
  }, [hardware, markScale]);

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        if (progress.value > 0.92 && hardware.value < 0.4) {
          runOnJS(revealHardware)();
          return;
        }
        runOnJS(toggle)();
      }),
    [hardware, progress, revealHardware, toggle]
  );

  const restoreGesture = useMemo(
    () =>
      Gesture.Pan()
        .blocksExternalGesture()
        .activeOffsetY([-8, 24])
        .failOffsetX([-64, 64])
        .onBegin(() => {
          origin.value = progress.value;
          crossed.value = false;
          hardware.value = 1;
          runOnJS(onGrab)();
        })
        .onChange((event) => {
          const next = privacyProgressFromPan(origin.value, event.translationY, travel);
          progress.value = next;
          if (!crossed.value && next >= PRIVACY_CLOSE_THRESHOLD) {
            crossed.value = true;
            runOnJS(onThreshold)();
          }
        })
        .onFinalize((event) => {
          const shouldClose = privacyShouldClose(progress.value, event.velocityY);
          progress.value = withSpring(shouldClose ? 1 : 0, SPRING);
          runOnJS(onSettle)(shouldClose);
        }),
    [crossed, hardware, onGrab, onSettle, onThreshold, origin, progress, travel]
  );

  const restoreTap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(revealHardware)();
      }),
    [revealHardware]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, PRIVACY_CURTAIN.closedOpacity]),
  }));

  const handleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 1], [Math.max(0.35, hardware.value), 1, 1]),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [openHandleTop, closedHandleTop]),
      },
      { scale: interpolate(teach.value, [0, 1], [1, 1.06]) * markScale.value },
    ],
    shadowOpacity: interpolate(teach.value, [0, 1], [0, 0.55]),
  }));

  const cordStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [openHandleTop + 22, closedHandleTop + 22]),
    opacity: hardware.value,
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hint.value * interpolate(progress.value, [0, 0.12], [1, 0]),
  }));

  const liftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.86, 1], [0, 1]),
    transform: [{ translateY: interpolate(markScale.value, [1, 1.28], [6, -10]) }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.sheet, sheetStyle]} />
      <Animated.View pointerEvents="none" style={[styles.cord, cordStyle]}>
        <View style={styles.braidA} />
        <View style={styles.braidB} />
        <View style={styles.braidC} />
        <View style={styles.braidShine} />
      </Animated.View>
      <GestureDetector gesture={Gesture.Exclusive(gesture, tap)}>
        <Animated.View
          accessibilityRole="button"
          accessibilityLabel={closed ? 'Open privacy shade' : 'Pull down for privacy'}
          accessibilityHint={closed ? 'Swipe up to open' : 'Swipe down from the top center for privacy'}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') toggle();
          }}
          style={[styles.handleSlot, handleStyle]}>
          <Animated.View style={[styles.liftCue, liftStyle]} pointerEvents="none">
            <View style={styles.chevron} />
          </Animated.View>
          {closed ? <Wordmark size="handle" accessible={false} /> : <View style={styles.idleGrab} />}
        </Animated.View>
      </GestureDetector>
      {closed ? (
        <GestureDetector gesture={Gesture.Exclusive(restoreGesture, restoreTap)}>
          <Animated.View
            collapsable={false}
            style={styles.restoreZone}
            accessibilityRole="button"
            accessibilityLabel="Swipe up anywhere to restore brightness"
            accessibilityHint="Swipe up from anywhere on the dimmed screen"
          />
        </GestureDetector>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.hintWrap, { top: openHandleTop + ROOM_CURTAIN_HANDLE - 4 }, hintStyle]}>
        <Text style={styles.hintArrow}>↓</Text>
        <View style={styles.hintCard}>
          <Animated.Text style={styles.hintText}>Pull down for privacy</Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

/** @deprecated Use PrivacyCurtain. Kept so existing imports keep working. */
export const CurtainOverlay = PrivacyCurtain;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 45,
    overflow: 'visible',
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050506',
  },
  cord: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -5,
    width: 10,
    overflow: 'hidden',
    borderRadius: 5,
  },
  braidA: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    width: 5,
    backgroundColor: '#B89A72',
  },
  braidB: {
    ...StyleSheet.absoluteFillObject,
    left: 3,
    width: 5,
    backgroundColor: '#8A6E4A',
  },
  braidC: {
    ...StyleSheet.absoluteFillObject,
    left: 6,
    width: 4,
    backgroundColor: '#D4B48C',
    opacity: 0.72,
  },
  braidShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 2,
    width: 2,
    backgroundColor: 'rgba(246,230,200,0.55)',
  },
  handleSlot: {
    position: 'absolute',
    left: '50%',
    marginLeft: -44,
    top: 0,
    width: 88,
    height: ROOM_CURTAIN_HANDLE + 28,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    zIndex: 46,
    shadowColor: '#F6E6C8',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  idleGrab: {
    width: 44,
    height: 20,
  },
  liftCue: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    borderColor: 'rgba(232,200,120,0.82)',
    transform: [{ rotate: '45deg' }],
  },
  restoreZone: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 21,
    backgroundColor: 'transparent',
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintArrow: {
    color: 'rgba(246,240,228,0.72)',
    fontSize: 18,
    marginBottom: 4,
  },
  hintCard: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(10,8,8,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(214,196,168,0.22)',
  },
  hintText: {
    fontSize: 16,
    letterSpacing: 0.4,
    fontWeight: '600',
    color: 'rgba(246,240,228,0.92)',
  },
});

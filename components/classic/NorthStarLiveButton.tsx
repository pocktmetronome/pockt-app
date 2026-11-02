import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Image, Pressable, StyleSheet, View, type GestureResponderEvent, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { hapticEvent, type HapticSemantic } from '@/lib/haptics';

type Props = {
  accessibilityLabel: string;
  source?: ImageSourcePropType;
  hapticKind: HapticSemantic;
  hapticEnabled?: boolean;
  disabled?: boolean;
  repeat?: boolean;
  onPress: (event?: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
};

const HOLD_MS = 400;
const REPEAT_MS = 125;
const FAST_MS = 50;
const FAST_AFTER_MS = 1500;
const RELEASE_MS = 75;

export function NorthStarLiveButton({
  accessibilityLabel,
  source,
  hapticKind,
  hapticEnabled = true,
  disabled = false,
  repeat = false,
  onPress,
  style,
  testID,
  children,
}: Props) {
  const travel = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => clear, []);

  const fire = (event?: GestureResponderEvent) => {
    if (disabledRef.current) {
      clear();
      return;
    }
    if (hapticEnabled) void hapticEvent(hapticKind);
    onPress(event);
  };

  const pump = () => {
    if (disabledRef.current) {
      clear();
      return;
    }
    fire();
    const delay = Date.now() - started.current >= FAST_AFTER_MS ? FAST_MS : REPEAT_MS;
    timer.current = setTimeout(pump, delay);
  };

  const pressIn = (event: GestureResponderEvent) => {
    travel.setValue(1);
    started.current = Date.now();
    fire(event);
    if (!repeat) return;
    clear();
    timer.current = setTimeout(pump, HOLD_MS);
  };

  const release = () => {
    clear();
    Animated.timing(travel, { toValue: 0, duration: RELEASE_MS, useNativeDriver: true }).start();
  };

  // About 1.5 pt of travel and a slight loss of light on the cap: the switch moved, nothing animated.
  const motion = {
    transform: [
      { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] }) },
      { scaleY: travel.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
    ],
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPressIn={pressIn}
      onPressOut={release}
      style={style}>
      <Animated.View pointerEvents="none" style={[styles.cap, motion]}>
        {source ? <Image source={source} resizeMode="stretch" style={styles.fill} /> : null}
        {source ? (
          <Animated.Image
            source={source}
            resizeMode="stretch"
            style={[styles.fill, { tintColor: '#000000', opacity: travel.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]}
          />
        ) : null}
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cap: { width: '100%', height: '100%' },
  // Explicit size: an Image otherwise takes its asset's own pixel size, which beats left/right.
  fill: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
});

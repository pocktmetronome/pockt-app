import { useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FACE_TOAST_FADE_MS, FACE_TOAST_MS } from '@/lib/control-detent';

export function faceToastOffset(safeTop: number, headerHeight = 0, gap = 8): number {
  return Math.max(0, safeTop) + Math.max(0, headerHeight) + gap;
}

export function useFaceToast(holdMs = FACE_TOAST_MS) {
  const [text, setText] = useState<string | null>(null);
  const token = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = (next: string) => {
    token.current += 1;
    const id = token.current;
    opacity.stopAnimation();
    opacity.setValue(1);
    setText(next);
    AccessibilityInfo.announceForAccessibility(next);
    setTimeout(() => {
      if (token.current !== id) return;
      Animated.timing(opacity, {
        toValue: 0,
        duration: FACE_TOAST_FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && token.current === id) setText(null);
      });
    }, holdMs);
  };

  return { text, show, opacity };
}

export function FaceToast({
  text,
  opacity,
  tone = 'light',
  offsetTop,
  headerHeight = 0,
}: {
  text: string | null;
  opacity: Animated.Value;
  tone?: 'light' | 'dark';
  offsetTop?: number;
  headerHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  if (!text) return null;
  const top = offsetTop ?? faceToastOffset(insets.top, headerHeight);
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top, opacity }]} testID="face-toast">
      <Text style={[styles.capsule, tone === 'dark' ? styles.dark : styles.light]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 80,
    elevation: 80,
  },
  capsule: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: 'hidden',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    textAlign: 'center',
  },
  light: {
    color: '#1A1C20',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dark: {
    color: '#E8FBFF',
    backgroundColor: 'rgba(8,14,18,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(61,232,240,0.35)',
  },
});

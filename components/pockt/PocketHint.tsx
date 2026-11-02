import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';
import type { SkinId } from '@/lib/types';

const COPY: Record<SkinId, { line: string; sub: string }> = {
  classic: {
    line: 'Tap a beat column to set mute, normal, accent, or strong.',
    sub: 'Meter and subdivision stay on this screen.',
  },
  titanium: {
    line: 'Turn the receiver dial to set tempo. Tap the number for exact BPM.',
    sub: 'Fine movement stays predictable. No jumps.',
  },
  studio: {
    line: '',
    sub: '',
  },
  altered: {
    line: '',
    sub: '',
  },
  'after-dark': {
    line: '',
    sub: '',
  },
  bar: {
    line: '',
    sub: '',
  },
  heavy: {
    line: 'This pocket opens on its Heavy click.',
    sub: 'Precision machine. Change the sound anytime.',
  },
  roots: {
    line: 'This pocket opens on its Roots click.',
    sub: 'Hand-built resonance. Change the sound anytime.',
  },
  sundown: {
    line: 'This pocket opens on its Sundown click.',
    sub: 'Low. Warm. Locked in. Change the sound anytime.',
  },
  heart: {
    line: 'The chamber keeps time. The heart follows the click.',
    sub: 'Home and Mix stay at the edges. Change the sound anytime.',
  },
};

type Props = {
  skin: SkinId;
  visible: boolean;
  onDismiss: () => void;
};

export function PocketHint({ skin, visible, onDismiss }: Props) {
  const theme = useSkin();
  const copy = COPY[skin] ?? COPY.classic;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 1600);
    return () => clearTimeout(timer);
  }, [onDismiss, visible, skin]);

  if (!visible) return null;
  if (!copy.line) return null;

  return (
    <Animated.View
      key={skin}
      entering={FadeIn.duration(420)}
      exiting={FadeOut.duration(280)}
      style={styles.wrap}
      pointerEvents="box-none">
      <Pressable onPress={onDismiss} style={styles.hit} accessibilityRole="button" accessibilityLabel="Dismiss">
        <View
          style={[
            styles.card,
            {
              borderColor: 'rgba(246,240,228,0.12)',
              backgroundColor: 'rgba(8,6,5,0.28)',
            },
          ]}>
          <Text style={[styles.line, { color: theme.ivory }]}>{copy.line}</Text>
          {copy.sub ? (
            <Text style={[styles.sub, { color: theme.ivoryDim }]}>{copy.sub}</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  hit: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    maxWidth: 340,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  line: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.15,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});


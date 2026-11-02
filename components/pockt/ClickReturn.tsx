import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useSkin } from '@/components/skins/SkinContext';

type Props = {
  visible: boolean;
};

export function ClickReturn({ visible }: Props) {
  const theme = useSkin();
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(90)} exiting={FadeOut.duration(480)} style={styles.wrap}>
      <View style={[styles.rule, { backgroundColor: theme.ivory }]} />
      <Text style={[styles.text, { color: theme.ivory }]}>STILL IN THE POCKET?</Text>
      <View style={[styles.rule, { backgroundColor: theme.ivory }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 11,
    letterSpacing: 2.8,
    fontWeight: '600',
  },
  rule: {
    width: 42,
    height: StyleSheet.hairlineWidth,
  },
});

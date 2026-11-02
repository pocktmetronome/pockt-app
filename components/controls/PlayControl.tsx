import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';

type Props = {
  playing: boolean;
  onPress: () => void;
  size?: 'normal' | 'large' | 'compact';
};

export function PlayControl({ playing, onPress, size = 'normal' }: Props) {
  const theme = useSkin();
  const { width } = useWindowDimensions();
  const large = size === 'large';
  const compact = size === 'compact';
  const altered = theme.id === 'altered';
  const btnWidth = compact
    ? Math.round(Math.min(width * 0.56, 220))
    : Math.round(Math.min(width * (large ? 0.82 : 0.7), Math.max(width * 0.6, 240)));
  const height = compact ? 48 : large || altered ? 64 : 58;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'STOP' : 'PLAY'}
      style={({ pressed }) => [
        styles.plate,
        {
          width: btnWidth,
          height,
          borderWidth: altered ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: altered ? 'rgba(18,10,24,0.55)' : 'transparent',
          borderColor: playing ? theme.playActiveBorder : theme.playIdleBorder,
          borderRadius: theme.playRadius,
          shadowColor: theme.playGlow,
        },
        pressed && styles.pressed,
      ]}>
      <View pointerEvents="none" style={[styles.fill, { borderRadius: theme.playRadius }]}>
        <LinearGradient
          colors={
            playing
              ? [theme.playActiveBg, 'rgba(8,6,5,0.05)']
              : [theme.playIdleBg, 'rgba(8,6,5,0.02)']
          }
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 1]}
          style={styles.sheen}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.edge,
          {
            borderColor: playing ? theme.playActiveBorder : theme.playIdleBorder,
            borderRadius: theme.playRadius,
          },
        ]}
      />
      <View style={styles.iconSlot}>
        {playing ? (
          <View style={[styles.stop, { backgroundColor: theme.ivory }]} />
        ) : (
          <View
            style={[
              styles.play,
              {
                borderLeftColor: theme.ivory,
              },
            ]}
          />
        )}
      </View>
      <Text
        style={[styles.label, compact && styles.labelCompact, { color: theme.ivory, textShadowColor: theme.playGlow }]}
        numberOfLines={1}>
        {playing ? 'STOP' : 'PLAY'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 28,
    backgroundColor: 'transparent',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    opacity: 0.85,
  },
  pressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.92,
  },
  iconSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  play: {
    width: 0,
    height: 0,
    marginLeft: 3,
    borderLeftWidth: 14,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  stop: {
    width: 13,
    height: 13,
  },
  label: {
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '700',
    flexShrink: 0,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  labelCompact: {
    fontSize: 17,
    letterSpacing: 3.2,
  },
});

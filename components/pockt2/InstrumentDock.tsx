import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetalKey } from '@/components/pockt2/MetalKey';
import { TransportKey } from '@/components/pockt2/TransportKey';
import { P2, P2Radius, P2Space } from '@/constants/pockt-2';

type Props = {
  playing: boolean;
  pulse: SharedValue<number>;
  meter: string;
  sound: string;
  onToggle: () => void;
  onOpenMeter: () => void;
  onOpenSound: () => void;
  onOpenMore: () => void;
};

export function InstrumentDock({
  playing,
  pulse,
  meter,
  sound,
  onToggle,
  onOpenMeter,
  onOpenSound,
  onOpenMore,
}: Props) {
  const insets = useSafeAreaInsets();
  const quiet = useSharedValue(playing ? 1 : 0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    quiet.value = withTiming(playing ? 1 : 0, {
      duration: reduceMotion ? 1 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [playing, quiet, reduceMotion]);

  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: 1 - quiet.value * 0.46,
  }));

  const plateStyle = useAnimatedStyle(() => ({
    paddingTop: 10 - quiet.value * 4,
    paddingBottom: 10 - quiet.value * 2,
  }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Animated.View style={[styles.plate, plateStyle]}>
        <View style={styles.lip} />
        <TransportKey playing={playing} onPress={onToggle} pulse={pulse} />
        <View style={styles.cluster}>
          <MetalKey label="Meter" value={meter} onPress={onOpenMeter} accessibilityLabel={`Meter ${meter}`} />
          <Animated.View style={[styles.secondary, secondaryStyle]}>
            <MetalKey label="Sound" value={sound} onPress={onOpenSound} accessibilityLabel={`Sound ${sound}`} />
            <MetalKey
              label="More"
              compact
              onPress={onOpenMore}
              accessibilityLabel="More. Settings, accents, practice, and volume."
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: P2Space.md,
  },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: P2Radius.panel,
    backgroundColor: P2.fieldRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P2.hairline,
  },
  lip: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  cluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondary: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { CustomSurface } from '@/components/classic/CustomSurface';
import { migrateCustomLayout, type CustomLayout } from '@/lib/custom-layout';
import type { ClassicBackdropId } from '@/lib/types';

type Props = {
  backdrop: ClassicBackdropId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
  photoMotion?: boolean;
};

const PLATES: Record<Exclude<ClassicBackdropId, 'custom'>, readonly [string, string, string]> = {
  pulse: ['#14161A', '#0C0D10', '#101214'],
  ring: ['#050506', '#020203', '#08080A'],
  pendula: ['#2A1C10', '#120E0A', '#1C140C'],
  smart: ['#F8F5EE', '#F3EFE4', '#FAF7F0'],
  ledgear: ['#101210', '#080A08', '#0E100E'],
  pro: ['#121418', '#08090C', '#0E1014'],
  tempo: ['#1C160C', '#0C0A06', '#16120A'],
  beats: ['#0C1418', '#06080A', '#10181C'],
  beatline: ['#101418', '#08090C', '#0C1014'],
  dial: ['#0A0C0E', '#050607', '#08090B'],
  rig: ['#101214', '#07080A', '#0C0E10'],
};

/** Classic instrument plate. Customized is the only photograph surface. */
export function ClassicExperienceBackdrop({
  backdrop,
  customPhotoUri,
  customLayout,
  pulse,
  pulseRole,
  playing,
  visualPulse,
  motionGain,
  photoMotion: _photoMotion = false,
}: Props) {
  const layout = migrateCustomLayout(customLayout, customPhotoUri);

  const beatStyle = useAnimatedStyle(() => {
    if (
      !playing ||
      !visualPulse ||
      motionGain <= 0 ||
      backdrop === 'ring' ||
      backdrop === 'custom' ||
      backdrop === 'beatline' ||
      backdrop === 'ledgear' ||
      backdrop === 'pendula' ||
      backdrop === 'pro' ||
      backdrop === 'rig'
    ) {
      return { opacity: 0 };
    }
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0, down ? 0.16 : 0.06]),
    };
  });

  if (backdrop === 'custom') {
    return (
      <CustomSurface
        background={layout.background}
        pulse={pulse}
        pulseRole={pulseRole}
        playing={playing}
        visualPulse={visualPulse}
        photoFit={layout.photoFit}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={[...(PLATES[backdrop] ?? PLATES.pulse)]}
        style={StyleSheet.absoluteFillObject}
      />
      {backdrop === 'smart' ? null : (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(6,6,8,0.18)', 'rgba(8,8,10,0.08)', 'rgba(4,4,6,0.28)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, beatStyle]}>
        <View style={styles.indexWash} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  indexWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 214, 186, 0.12)',
  },
});

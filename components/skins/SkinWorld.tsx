import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AfterDarkAtmosphereFx, AfterDarkSculptureFx } from '@/components/skins/AfterDarkSkin';
import { BarSkin } from '@/components/skins/BarSkin';
import { HeartWorld } from '@/components/skins/HeartWorld';
import { AlteredArtwork } from '@/components/skins/AlteredSkin';
import { ClassicExperienceBackdrop } from '@/components/skins/ClassicPhotoBackdrop';
import { FullBleedImage } from '@/components/skins/FullBleedImage';
import { HeavyBackdrop } from '@/components/skins/HeavySkin';
import { RootsBackdrop } from '@/components/skins/RootsSkin';
import { SundownBackdrop } from '@/components/skins/SundownSkin';
import { SkinHighlight } from '@/components/skins/SkinHighlight';
import { StudioConsoleFx, StudioRoomFx } from '@/components/skins/StudioSkin';
import type { SkinWorldProps } from '@/components/skins/skin-types';
import { SKIN_ASSETS } from '@/lib/skin-assets';
import { customBackgroundKey, migrateCustomLayout, type CustomLayout } from '@/lib/custom-layout';
import type { AccentLevel, ClassicBackdropId, FeelId, SkinCategoryId, SkinId } from '@/lib/types';

export function SkinBackdrop({
  skin,
  glow,
  pulse,
  pulseRole,
  pulseAccent,
  pulseBeat,
  playing,
  visualPulse,
  motionGain,
  feel,
  skinCategory,
  classicBackdrop,
  customPhotoUri,
  customLayout,
  photoMotion,
  bpm,
  accentPattern,
  onBarBpmPress,
  onBarAccentChange,
  onBarTapTempo,
  onBarOpenControls,
  onBarTogglePlay,
  onBarVideoReady,
  barSafeBottom,
}: Pick<SkinWorldProps, 'skin' | 'glow' | 'playing' | 'visualPulse' | 'motionGain'> & {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  pulseAccent: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  feel: FeelId;
  skinCategory?: SkinCategoryId;
  classicBackdrop?: ClassicBackdropId;
  customPhotoUri?: string | null;
  customLayout?: CustomLayout | null;
  photoMotion?: boolean;
  bpm?: number;
  accentPattern?: AccentLevel[];
  onBarBpmPress?: () => void;
  onBarAccentChange?: (pattern: AccentLevel[]) => void;
  onBarTapTempo?: () => void;
  onBarOpenControls?: () => void;
  onBarTogglePlay?: () => void;
  onBarVideoReady?: (ready: boolean) => void;
  barSafeBottom?: number;
}) {
  const pack = SKIN_ASSETS[skin];
  if (!pack) return null;
  const highlightGain = visualPulse ? motionGain : 0;
  const custom = migrateCustomLayout(customLayout, customPhotoUri);

  if (skinCategory === 'classic') {
    return (
      <Animated.View
        key={`classic-${classicBackdrop ?? 'pulse'}-${customBackgroundKey(custom.background)}`}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none">
        <ClassicExperienceBackdrop
          backdrop={classicBackdrop ?? 'pulse'}
          customPhotoUri={customPhotoUri ?? null}
          customLayout={custom}
          pulse={pulse}
          pulseRole={pulseRole}
          playing={playing}
          visualPulse={visualPulse}
          motionGain={highlightGain}
          photoMotion={photoMotion}
        />
      </Animated.View>
    );
  }

  if (skin === 'heavy') {
    return (
      <Animated.View key={skin} style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <HeavyBackdrop
          pulse={pulse}
          pulseRole={pulseRole}
          pulseAccent={pulseAccent}
          glow={glow}
          playing={playing}
          visualPulse={visualPulse}
          motionGain={highlightGain}
          background={pack.background}
          fx={pack.fx}
          ribbon={pack.ribbon}
        />
      </Animated.View>
    );
  }

  if (skin === 'roots') {
    return (
      <Animated.View key={skin} style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <RootsBackdrop
          pulse={pulse}
          pulseRole={pulseRole}
          pulseAccent={pulseAccent}
          glow={glow}
          playing={playing}
          visualPulse={visualPulse}
          motionGain={highlightGain}
          background={pack.background}
          fx={pack.fx}
          ribbon={pack.ribbon}
        />
      </Animated.View>
    );
  }

  if (skin === 'heart') {
    return (
      <Animated.View key={skin} style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <HeartWorld
          pulse={pulse}
          pulseRole={pulseRole}
          playing={playing}
          visualPulse={visualPulse}
          motionGain={highlightGain}
        />
      </Animated.View>
    );
  }

  if (skin === 'bar') {
    return (
      <Animated.View key={skin} style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {pack.background && pulseBeat ? (
          <BarSkin
            pulseBeat={pulseBeat}
            pulseAccent={pulseAccent}
            pulseRole={pulseRole}
            playing={playing}
            visualPulse={visualPulse}
            motionGain={highlightGain}
            background={pack.background}
            bpm={bpm ?? 120}
            accentPattern={accentPattern ?? ['strong', 'normal', 'normal', 'normal']}
            onBpmPress={onBarBpmPress ?? (() => undefined)}
            onAccentChange={onBarAccentChange ?? (() => undefined)}
            onTapTempo={onBarTapTempo}
            onOpenControls={onBarOpenControls}
            onTogglePlay={onBarTogglePlay}
            onVideoReady={onBarVideoReady}
            safeBottom={barSafeBottom}
          />
        ) : pack.background ? (
          <FullBleedImage source={pack.background} recyclingKey="bar-background" />
        ) : null}
      </Animated.View>
    );
  }

  if (skin === 'sundown') {
    return (
      <Animated.View key={skin} style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <SundownBackdrop
          pulse={pulse}
          pulseRole={pulseRole}
          pulseAccent={pulseAccent}
          glow={glow}
          playing={playing}
          visualPulse={visualPulse}
          motionGain={highlightGain}
          background={pack.background}
          fx={pack.fx}
          ribbon={pack.ribbon}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      key={skin}
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(220)}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none">
      {pack.background ? (
        <FullBleedImage source={pack.background} recyclingKey={`${skin}-background`} />
      ) : null}
      {pack.focal ? (
        <SkinFocal
          source={pack.focal}
          recyclingKey={`${skin}-focal`}
          pulse={pulse}
          pulseRole={pulseRole}
          motionGain={highlightGain}
          feel={feel}
          skin={skin}
          playing={playing}
        />
      ) : null}
      {pack.light ? (
        <SkinHighlight
          source={pack.light}
          glow={glow}
          pulseRole={pulseRole}
          playing={playing}
          motionGain={highlightGain}
          skin={skin}
        />
      ) : null}
      {skin === 'studio' ? (
        <StudioRoomFx
          pulse={pulse}
          pulseRole={pulseRole}
          glow={glow}
          motionGain={highlightGain}
          playing={playing}
        />
      ) : null}
      {skin === 'after-dark' ? (
        <AfterDarkSculptureFx
          pulse={pulse}
          pulseRole={pulseRole}
          glow={glow}
          motionGain={highlightGain}
          playing={playing}
        />
      ) : null}
      {pack.foreground ? (
        <SkinForeground
          source={pack.foreground}
          recyclingKey={`${skin}-foreground`}
          pulse={pulse}
          pulseRole={pulseRole}
          motionGain={highlightGain}
          feel={feel}
          skin={skin}
        />
      ) : null}
      {skin === 'studio' ? (
        <StudioConsoleFx
          pulse={pulse}
          pulseRole={pulseRole}
          motionGain={highlightGain}
          playing={playing}
          feel={feel}
        />
      ) : null}
      {skin === 'after-dark' ? (
        <AfterDarkAtmosphereFx
          pulse={pulse}
          pulseRole={pulseRole}
          motionGain={highlightGain}
          playing={playing}
          feel={feel}
        />
      ) : null}
    </Animated.View>
  );
}

function SkinFocal({
  source,
  recyclingKey,
  pulse,
  pulseRole,
  motionGain,
  feel,
  skin,
  playing,
}: {
  source: number;
  recyclingKey: string;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  feel: FeelId;
  skin: SkinId;
  playing: boolean;
}) {
  const swamp = feel === 'swampy';
  const push = feel === 'push';
  const drift = useSharedValue(0.5);

  useEffect(() => {
    if (skin !== 'after-dark' || !playing || motionGain <= 0) {
      drift.value = withTiming(0.5, { duration: 900, easing: Easing.inOut(Easing.sin) });
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 16800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [drift, motionGain, playing, skin]);

  const liveStyle = useAnimatedStyle(() => {
    if (motionGain <= 0 || skin === 'studio') {
      return { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }, { translateX: 0 }, { rotate: '0deg' }] };
    }
    if (skin === 'after-dark') {
      const amount = pulse.value * motionGain;
      const down = pulseRole.value >= 1.5;
      const ambient = playing ? drift.value : 0.5;
      const rot = interpolate(ambient, [0, 1], [-0.48, 0.48]);
      const breathe = interpolate(ambient, [0, 1], [1, 1.012]);
      const x = interpolate(ambient, [0, 1], [-2.2, 2.2]);
      const y = interpolate(ambient, [0, 1], [-1.6, 1.6]);
      const beatScale = interpolate(amount, [0, 1], [1, down ? 1.01 : 1.004]);
      const beatY = interpolate(amount, [0, 1], [0, down ? -2.6 : -1.1]);
      return {
        opacity: 1,
        transform: [
          { translateX: x },
          { translateY: y + beatY },
          { rotate: `${rot}deg` },
          { scale: breathe * beatScale },
        ],
      };
    }
    const amount = pulse.value;
    const down = pulseRole.value >= 1.5;
    const depth = (down ? 0.018 : 0.01) * motionGain * (push ? 1.1 : swamp ? 0.84 : 1);
    return {
      opacity: 1,
      transform: [
        { scale: interpolate(amount, [0, 1], [1, 1 + depth]) },
        { translateY: interpolate(amount, [0, 1], [0, down ? -0.8 : -0.35]) },
        { translateX: 0 },
        { rotate: '0deg' },
      ],
    };
  });

  const bloomStyle = useAnimatedStyle(() => {
    if (motionGain <= 0) return { opacity: 0, transform: [{ scale: 1 }, { translateX: 0 }] };
    const amount = pulse.value * motionGain;
    const down = pulseRole.value >= 1.5;
    if (skin === 'studio') {
      return {
        opacity: interpolate(amount, [0, 1], [0, down ? 0.22 : 0.08]),
        transform: [{ scale: 1 }, { translateX: 0 }],
      };
    }
    if (skin === 'after-dark') {
      const shift = interpolate(drift.value, [0, 1], [-1.4, 1.4]);
      return {
        opacity: interpolate(amount, [0, 1], [0, down ? 0.46 : 0.16]),
        transform: [
          { translateX: shift },
          { scale: interpolate(amount, [0, 1], [1, down ? 1.014 : 1.005]) },
        ],
      };
    }
    return {
      opacity: interpolate(amount, [0, 1], [0, down ? 0.36 : 0.14]),
      transform: [{ scale: interpolate(amount, [0, 1], [1, down ? 1.012 : 1.005]) }, { translateX: 0 }],
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, liveStyle]}>
        <Image
          source={source}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={recyclingKey}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, bloomStyle]}>
        <Image
          source={source}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={`${recyclingKey}-bloom`}
        />
      </Animated.View>
    </>
  );
}

function SkinForeground({
  source,
  recyclingKey,
  pulse,
  pulseRole,
  motionGain,
  feel,
  skin,
}: {
  source: number;
  recyclingKey: string;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  feel: FeelId;
  skin: SkinId;
}) {
  const swamp = feel === 'swampy';
  const style = useAnimatedStyle(() => {
    if (motionGain <= 0) {
      return { opacity: 1, transform: [{ translateY: 0 }, { translateX: 0 }, { scale: 1 }] };
    }
    const amount = pulse.value * motionGain;
    const down = pulseRole.value >= 1.5;
    if (skin === 'studio') {
      const y = down ? 1.5 : 0.7;
      return {
        opacity: 1,
        transform: [
          { translateY: interpolate(amount, [0, 1], [0, y]) },
          { translateX: 0 },
          { scale: 1 },
        ],
      };
    }
    if (skin === 'after-dark') {
      return {
        opacity: 1,
        transform: [
          { translateY: interpolate(amount, [0, 1], [0, down ? 1.4 : 0.6]) },
          { translateX: interpolate(amount, [0, 1], [0, down ? -0.6 : -0.25]) },
          { scale: 1 },
        ],
      };
    }
    const y = swamp ? -3.2 : -2.4;
    return {
      opacity: 1,
      transform: [
        { translateY: interpolate(amount, [0, 1], [0, y]) },
        { translateX: 0 },
        { scale: interpolate(amount, [0, 1], [1, 1.007]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey={recyclingKey}
      />
    </Animated.View>
  );
}

export function SkinPulse(props: SkinWorldProps) {
  const { skin } = props;
  return (
    <Animated.View
      key={skin}
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(180)}
      style={styles.pulse}>
      {skin === 'altered' ? <AlteredArtwork {...props} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pulse: {
    flex: 1,
    width: '100%',
  },
});

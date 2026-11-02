import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  HEART_CHAMBER,
  HEART_GLOW,
  HEART_MODEL,
  HEART_PARTICLE,
  HEART_PHASES,
  HEART_PHASE_ORDER,
  HEART_VEINS,
  HEART_WAVE,
  type HeartPhaseId,
} from '@/lib/heart-assets';

type LiveProps = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  pulseAccent?: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
};

function phaseIndex(progress: number, down: boolean): number {
  'worklet';
  if (down) {
    return interpolate(progress, [0, 0.08, 0.2, 0.38, 0.54, 0.74, 1], [0, 1, 2, 3, 4, 5, 0]);
  }
  return interpolate(progress, [0, 0.1, 0.24, 0.42, 0.6, 0.8, 1], [0, 1, 2, 3, 4, 5, 0]);
}

export function HeartWorld({ pulse, pulseRole, playing, visualPulse, motionGain }: LiveProps) {
  const { width, height } = useWindowDimensions();
  const heartW = Math.min(width * 0.96, height * 0.72);
  const heartH = heartW * 1.12;
  const live = playing && visualPulse && motionGain > 0;
  const liveSv = useSharedValue(live ? 1 : 0);
  const reduceSv = useSharedValue(0);
  const gainSv = useSharedValue(motionGain);
  const drift = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    liveSv.value = live ? 1 : 0;
    gainSv.value = motionGain;
  }, [gainSv, live, liveSv, motionGain]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!mounted) return;
      setReduceMotion(value);
      reduceSv.value = value ? 1 : 0;
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      setReduceMotion(value);
      reduceSv.value = value ? 1 : 0;
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, [reduceSv]);

  useEffect(() => {
    if (reduceMotion) {
      drift.value = 0;
      return;
    }
    drift.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      drift.value = 0;
    };
  }, [drift, reduceMotion]);

  const chamber = useAnimatedStyle(() => {
    if (reduceSv.value > 0.5) return { transform: [{ scale: 1.12 }] };
    const p = liveSv.value > 0.5 ? pulse.value * gainSv.value : 0;
    return {
      transform: [
        { scale: interpolate(p, [0, 1], [1.12, pulseRole.value >= 1.5 ? 1.16 : 1.135]) },
        { translateX: interpolate(drift.value, [0, 1], [-10, 8]) },
        { translateY: interpolate(drift.value, [0, 1], [6, -8]) },
      ],
    };
  });

  const veins = useAnimatedStyle(() => {
    const ambient = interpolate(drift.value, [0, 1], [0.34, 0.48]);
    if (liveSv.value < 0.5) return { opacity: ambient };
    const p = pulse.value * gainSv.value;
    return { opacity: interpolate(p, [0, 1], [ambient, pulseRole.value >= 1.5 ? 0.86 : 0.62]) };
  });

  const glow = useAnimatedStyle(() => {
    if (liveSv.value < 0.5) return { opacity: 0.22, transform: [{ scale: 1 }] };
    const p = pulse.value * gainSv.value;
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(p, [0, 1], [0.2, down ? 0.78 : 0.42]),
      transform: [{ scale: interpolate(p, [0, 1], [1, down ? 1.12 : 1.05]) }],
    };
  });

  const heartMotion = useAnimatedStyle(() => {
    if (liveSv.value < 0.5) {
      return { transform: [{ scaleX: 1 }, { scaleY: 1 }, { rotate: '0deg' }] };
    }
    const p = pulse.value;
    const down = pulseRole.value >= 1.5;
    const x = interpolate(p, [0, 0.1, 0.22, 0.38, 0.55, 0.74, 1], [1, 1.012, 0.93, 0.84, 0.96, 1.02, 1]);
    const y = interpolate(p, [0, 0.1, 0.22, 0.38, 0.55, 0.74, 1], [1, 0.992, 0.88, 0.78, 0.94, 1.03, 1]);
    const twist = reduceSv.value > 0.5 ? 0 : interpolate(p, [0, 0.2, 0.4, 1], [0, down ? -2.4 : -1.1, down ? 1.6 : 0.6, 0]);
    return {
      transform: [
        { rotate: `${twist}deg` },
        { scaleX: down ? x * 0.97 : x },
        { scaleY: down ? y * 0.93 : y },
      ],
    };
  });

  const wave = useAnimatedStyle(() => {
    if (liveSv.value < 0.5) return { opacity: 0, transform: [{ scale: 0.72 }] };
    const p = pulse.value * gainSv.value;
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(p, [0, 0.18, 1], [0.28, down ? 0.46 : 0.2, 0]),
      transform: [{ scale: interpolate(p, [0, 1], [0.7, down ? 1.55 : 1.28]) }],
    };
  });

  return (
    <View style={styles.root} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFillObject, chamber]}>
        <Image
          source={HEART_CHAMBER}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-chamber"
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.screenBlend, veins]}>
        <Image
          source={HEART_VEINS}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-veins"
        />
      </Animated.View>
      <Animated.View style={[styles.glowLayer, styles.screenBlend, glow]}>
        <Image
          source={HEART_GLOW}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-glow"
        />
      </Animated.View>
      <View style={styles.stage}>
        <Animated.View style={[{ width: heartW, height: heartH }, styles.heartMask, styles.screenBlend, heartMotion]}>
          <Image
            source={HEART_MODEL}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey="heart-model"
          />
          {HEART_PHASE_ORDER.map((id, index) => (
            <HeartPhase
              key={id}
              id={id}
              index={index}
              pulse={pulse}
              pulseRole={pulseRole}
              liveSv={liveSv}
              width={heartW}
              height={heartH}
            />
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[styles.wave, styles.screenBlend, wave]}>
        <Image
          source={HEART_WAVE}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-wave"
        />
      </Animated.View>
      {!reduceMotion
        ? [0, 1, 2, 3, 4, 5].map((slot) => (
            <HeartParticle key={slot} slot={slot} pulse={pulse} liveSv={liveSv} drift={drift} />
          ))
        : null}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(6,1,3,0.42)', 'rgba(6,1,3,0)', 'rgba(4,0,2,0.58)']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

function HeartPhase({
  id,
  index,
  pulse,
  pulseRole,
  liveSv,
  width,
  height,
}: {
  id: HeartPhaseId;
  index: number;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  liveSv: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const current = liveSv.value < 0.5 ? 0 : Math.round(phaseIndex(pulse.value, pulseRole.value >= 1.5));
    const match = current === index;
    return { opacity: match ? 1 : 0 };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screenBlend, style]}>
      <Image
        source={HEART_PHASES[id]}
        style={{ width, height }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={`heart-phase-${id}`}
      />
    </Animated.View>
  );
}

function HeartParticle({
  slot,
  pulse,
  liveSv,
  drift,
}: {
  slot: number;
  pulse: SharedValue<number>;
  liveSv: SharedValue<number>;
  drift: SharedValue<number>;
}) {
  const left = 12 + ((slot * 17) % 76);
  const top = 18 + ((slot * 23) % 58);
  const style = useAnimatedStyle(() => {
    const p = liveSv.value > 0.5 ? pulse.value : 0;
    return {
      opacity: interpolate(p, [0, 1], [0.08, 0.28]) + interpolate(drift.value, [0, 1], [0, 0.06]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-6 + slot, 8 - slot]) },
        { translateY: interpolate(p, [0, 1], [0, slot % 2 === 0 ? -10 : 8]) },
        { scale: interpolate(p, [0, 1], [0.7, 1.05]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particle, { left: `${left}%`, top: `${top}%` }, style]}>
      <Image
        source={HEART_PARTICLE}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={`heart-particle-${slot}`}
      />
    </Animated.View>
  );
}

export function HeartGalleryPreview() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={HEART_CHAMBER}
        style={[StyleSheet.absoluteFillObject, { transform: [{ scale: 1.16 }] }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="heart-gallery-chamber"
      />
      <View style={[StyleSheet.absoluteFillObject, styles.screenBlend, { opacity: 0.46 }]}>
        <Image
          source={HEART_VEINS}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-gallery-veins"
        />
      </View>
      <View style={[styles.stage, styles.screenBlend]}>
        <Image
          source={HEART_MODEL}
          style={styles.galleryHeart}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="heart-gallery-model"
        />
      </View>
      <LinearGradient
        colors={['rgba(6,1,3,0.36)', 'rgba(6,1,3,0)', 'rgba(4,0,2,0.55)']}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#070103',
  },
  screenBlend: {
    mixBlendMode: 'screen',
  } as const,
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36,
  },
  wave: {
    position: 'absolute',
    alignSelf: 'center',
    top: '24%',
    width: '78%',
    aspectRatio: 1,
  },
  particle: {
    position: 'absolute',
    width: 18,
    height: 18,
  },
  heartMask: {
    overflow: 'hidden',
  },
  galleryHeart: {
    width: '92%',
    aspectRatio: 0.92,
  },
});

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as SplashScreen from 'expo-splash-screen';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { resolveClickUris } from '@/audio/click-assets';
import {
  IDENT_ART_SCALE,
  IDENT_BASS_HIT_MS,
  IDENT_BASS_SCALE,
  IDENT_DRIFT_SCALE,
  IDENT_DURATION_MS,
  IDENT_FADE_MS,
  IDENT_FADE_START_MS,
  IDENT_FINAL_HIT_MS,
  IDENT_HAPTIC_FINAL_MS,
  IDENT_SKIP_AFTER_MS,
} from '@/constants/ident';
import { P2 } from '@/constants/pockt-2';
import { BRAND_IDENT_AUDIO } from '@/lib/brand-assets';
import { hapticIdentFinal } from '@/lib/haptics';
import { preloadOpeningAssets } from '@/lib/skin-assets';
import type { SkinId } from '@/lib/types';
import PocktTiming from '@/modules/pockt-timing';

type Props = {
  onDone: () => void;
  launchSound: boolean;
  currentSkin: SkinId;
};

export function BrandedIntro({ onDone, launchSound, currentSkin }: Props) {
  const player = useAudioPlayer(BRAND_IDENT_AUDIO, {
    updateInterval: 10000,
    keepAudioSessionActive: true,
  });
  const fade = useSharedValue(1);
  const drift = useSharedValue(0);
  const bass = useSharedValue(0);
  const settle = useSharedValue(0);
  const ripple = useSharedValue(0);
  const onDoneRef = useRef(onDone);
  const finished = useRef(false);
  const clockStarted = useRef(false);
  const nativeIdent = useRef(false);
  const eventTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [canSkip, setCanSkip] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  onDoneRef.current = onDone;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    for (const timer of eventTimers.current) clearTimeout(timer);
    eventTimers.current = [];
    onDoneRef.current();
  };

  const skip = () => {
    if (!canSkip || finished.current) return;
    fade.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(finish)();
    });
  };

  const startClock = () => {
    if (clockStarted.current) return;
    clockStarted.current = true;
    void preloadOpeningAssets(currentSkin);

    if (reduceMotion) {
      fade.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
      eventTimers.current.push(setTimeout(() => setCanSkip(true), 0));
      eventTimers.current.push(setTimeout(finish, 200));
      return;
    }

    drift.value = withTiming(1, {
      duration: IDENT_DURATION_MS,
      easing: Easing.inOut(Easing.quad),
    });
    bass.value = withDelay(
      IDENT_BASS_HIT_MS,
      withSequence(
        withTiming(1, { duration: 55, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.cubic) })
      )
    );
    settle.value = withDelay(
      IDENT_FINAL_HIT_MS,
      withSequence(
        withTiming(1, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 640, easing: Easing.inOut(Easing.cubic) })
      )
    );
    ripple.value = withDelay(
      IDENT_BASS_HIT_MS,
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 780, easing: Easing.out(Easing.cubic) })
      )
    );
    fade.value = withDelay(
      IDENT_FADE_START_MS,
      withTiming(0, { duration: IDENT_FADE_MS, easing: Easing.inOut(Easing.cubic) })
    );

    eventTimers.current.push(setTimeout(() => setCanSkip(true), IDENT_SKIP_AFTER_MS));
    eventTimers.current.push(setTimeout(finish, IDENT_DURATION_MS + 40));
    eventTimers.current.push(setTimeout(() => void hapticIdentFinal(), IDENT_HAPTIC_FINAL_MS));
  };

  const beginIdent = () => {
    if (clockStarted.current) return;
    if (!launchSound) {
      startClock();
      return;
    }
    void (async () => {
      try {
        if (PocktTiming?.isNativeEngine && PocktTiming.isAvailable?.() && PocktTiming.preview) {
          const uris = await resolveClickUris().catch(() => ({} as Record<string, string>));
          try {
            await PocktTiming.prepare?.(uris);
          } catch {
            /* preview still boots the graph */
          }
          PocktTiming.preview('pockt-ident', 0.68);
          nativeIdent.current = true;
        }
      } catch {
        nativeIdent.current = false;
      }
      if (!nativeIdent.current) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: 'mixWithOthers',
            shouldPlayInBackground: false,
            allowsRecording: false,
          });
          if (finished.current) return;
          player.volume = 0.68;
          player.play();
        } catch {
          /* silent switch or audio session */
        }
      }
      startClock();
    })();
  };

  useEffect(() => {
    return () => {
      for (const timer of eventTimers.current) clearTimeout(timer);
      if (!nativeIdent.current) {
        try {
          player.pause();
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const artStyle = useAnimatedStyle(() => {
    const punch = interpolate(bass.value, [0, 1], [1, IDENT_BASS_SCALE]) * interpolate(settle.value, [0, 1], [1, 1.012]);
    return {
      transform: [
        {
          scale: interpolate(drift.value, [0, 1], [IDENT_DRIFT_SCALE, IDENT_ART_SCALE]) * punch,
        },
      ],
    };
  });
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 0.18, 1], [0, 0.5, 0]),
    transform: [{ scale: interpolate(ripple.value, [0, 1], [0.28, 2.1]) }],
  }));

  return (
    <Animated.View
      collapsable={false}
      style={[styles.root, rootStyle]}
      onLayout={() => {
        void SplashScreen.hideAsync();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => beginIdent());
        });
      }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip opening" />
      <View style={styles.stage} pointerEvents="none">
        <Animated.View style={[styles.ripple, rippleStyle]} />
        <Animated.View style={artStyle}>
          <Pockt2Mark size={188} accessible={false} />
        </Animated.View>
        <Text style={styles.word}>POCKT</Text>
        <Text style={styles.line}>Precision lives here</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P2.field,
    zIndex: 40,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.2,
    borderColor: P2.signalSoft,
    backgroundColor: P2.signalDim,
  },
  word: {
    marginTop: 22,
    color: P2.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 6,
  },
  line: {
    marginTop: 8,
    color: P2.inkMute,
    fontSize: 13,
    fontWeight: '500',
  },
});

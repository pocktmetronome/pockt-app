import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { GALLERY_THUMBS, MECHANICAL_WALNUT_STUDIO, PULSE_RING_INNER } from '@/lib/classic-assets';
import { mechanicalRodLayout } from '@/lib/mechanical-plate';
import type { RoomId } from '@/lib/types';

type Props = {
  roomId: RoomId;
  compact?: boolean;
  active?: boolean;
  reduceMotion?: boolean;
  editing?: boolean;
  bpm?: number;
};

type PreviewFlags = { compact: boolean; active: boolean; reduceMotion: boolean; editing?: boolean; bpm?: number };

export function ClassicPreviewCard({
  roomId,
  compact = false,
  active = true,
  reduceMotion = false,
  editing = false,
  bpm,
}: Props) {
  const flags = { compact, active, reduceMotion, editing, bpm };
  if (roomId === 'pendula-classic') return <PendulumPreview {...flags} />;
  if (roomId === 'smart-pendulum') return <SmartPreview {...flags} />;
  if (roomId === 'ledgear') return <LedgearPreview {...flags} />;
  if (roomId === 'pro') return <ProPreview {...flags} />;
  if (roomId === 'tempo') return <TempoPreview compact={compact} />;
  if (roomId === 'beats') return <BeatsPreview compact={compact} />;
  if (roomId === 'pulse-circle') return <OrbitPreview {...flags} />;
  if (roomId === 'beatline') return <BeatlinePreview {...flags} />;
  if (roomId === 'customized') return <PhotoPreview {...flags} />;
  if (roomId === 'pulse') return <PulseHaloPreview {...flags} />;
  if (roomId === 'dial') return <DialPreview {...flags} />;
  if (roomId === 'rig') return <RigPreview {...flags} />;
  return <BeatlinePreview {...flags} />;
}

function SmartPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const swing = useSharedValue(-1);
  useEffect(() => {
    if (!active || reduceMotion) {
      swing.value = withTiming(0, { duration: 160 });
      return;
    }
    swing.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      swing.value = 0;
    };
  }, [active, reduceMotion, swing]);
  const rod = useAnimatedStyle(() => ({
    transformOrigin: 'bottom',
    transform: [{ rotate: `${swing.value * 28}deg` }],
  }));
  return (
    <View style={[styles.root, { backgroundColor: '#E8E4D8' }]}>
      <Text style={[styles.smartMark, compact && { fontSize: 10 }]}>ANDANTE</Text>
      <Text style={[styles.smartBpm, { fontSize: compact ? 36 : 52 }]}>88</Text>
      <Animated.View
        style={[{ width: 36, height: compact ? 92 : 128, alignItems: 'center', transformOrigin: 'bottom' }, rod]}>
        <View style={{ width: 5, flex: 0.38, backgroundColor: '#E07038', borderRadius: 3 }} />
        <View
          style={{
            width: compact ? 16 : 20,
            height: compact ? 20 : 24,
            borderRadius: 3,
            backgroundColor: '#F7F7F4',
            borderWidth: 1,
            borderColor: 'rgba(40,36,32,0.18)',
            marginVertical: -1,
          }}
        />
        <View style={{ width: 5, flex: 0.62, backgroundColor: '#E07038', borderRadius: 3 }} />
      </Animated.View>
      <View style={styles.smartSteps}>
        <View style={styles.smartStep}>
          <Text style={styles.smartStepText}>−</Text>
        </View>
        <View style={styles.smartStep}>
          <Text style={styles.smartStepText}>+</Text>
        </View>
      </View>
    </View>
  );
}

function TempoPreview({ compact }: { compact: boolean }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#2A2010', '#120E08', '#1C140C']} style={StyleSheet.absoluteFillObject} />
      <Text style={styles.tempoKicker}>SETLIST  ·  COACH</Text>
      <Text style={[styles.ghostBpm, { color: '#F4E8C8', fontSize: compact ? 40 : 62, position: 'relative' }]}>
        120
      </Text>
      <Text style={styles.andante}>ALLEGRO</Text>
      <View style={styles.tempoRow}>
        <View style={styles.tempoChip}>
          <Text style={styles.tempoChipText}>4/4</Text>
        </View>
        <View style={[styles.miniOrb, { backgroundColor: '#E8C46A', width: compact ? 26 : 32, height: compact ? 26 : 32 }]} />
        <View style={styles.tempoChip}>
          <Text style={styles.tempoChipText}>TAP</Text>
        </View>
      </View>
    </View>
  );
}

function BeatsPreview({ compact }: { compact: boolean }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#102028', '#080C10', '#0C1418']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.proBlocks}>
        <View style={[styles.proBlock, { backgroundColor: '#5EC4F0', height: compact ? 26 : 34 }]} />
        <View style={[styles.proBlock, { backgroundColor: '#5EC4F0', opacity: 0.5, height: compact ? 26 : 34 }]} />
        <View style={[styles.proBlock, { backgroundColor: '#5EC4F0', opacity: 0.28, height: compact ? 26 : 34 }]} />
        <View style={[styles.proBlock, styles.proHollow, { height: compact ? 26 : 34 }]} />
      </View>
      <Text style={[styles.ghostBpm, compact && styles.ghostBpmCompact]}>100</Text>
    </View>
  );
}

function BeatlinePreview({ compact, active, reduceMotion }: PreviewFlags) {
  const travel = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      travel.value = withTiming(0, { duration: 160 });
      return;
    }
    travel.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, false);
    return () => {
      travel.value = 0;
    };
  }, [active, reduceMotion, travel]);
  const cell0 = useAnimatedStyle(() => {
    const phase = travel.value % 1;
    const on = phase < 0.28;
    return {
      opacity: interpolate(phase, [0, 0.12, 0.28, 1], [1, 1, 0.28, 0.22]),
      transform: [{ scale: on ? 1.18 : 1 }],
    };
  });
  const cell1 = useAnimatedStyle(() => {
    const phase = (travel.value + 0.75) % 1;
    const on = phase < 0.28;
    return {
      opacity: interpolate(phase, [0, 0.12, 0.28, 1], [1, 1, 0.28, 0.22]),
      transform: [{ scale: on ? 1.18 : 1 }],
    };
  });
  const cell2 = useAnimatedStyle(() => {
    const phase = (travel.value + 0.5) % 1;
    const on = phase < 0.28;
    return {
      opacity: interpolate(phase, [0, 0.12, 0.28, 1], [1, 1, 0.28, 0.22]),
      transform: [{ scale: on ? 1.18 : 1 }],
    };
  });
  const cell3 = useAnimatedStyle(() => {
    const phase = (travel.value + 0.25) % 1;
    const on = phase < 0.28;
    return {
      opacity: interpolate(phase, [0, 0.12, 0.28, 1], [1, 1, 0.28, 0.22]),
      transform: [{ scale: on ? 1.18 : 1 }],
    };
  });
  const cells = [cell0, cell1, cell2, cell3];

  return (
    <View style={styles.root}>
      <Image
        source={GALLERY_THUMBS.beatline}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="gallery-beatline"
      />
      <LinearGradient colors={['rgba(8,9,12,0.18)', 'rgba(8,9,12,0.08)', 'rgba(8,9,12,0.28)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.capsules}>
        {cells.map((style, index) => (
          <Animated.View key={index} style={[styles.capsule, compact && styles.capsuleCompact, index === 0 && styles.capsuleAccent, style]}>
            <View
              style={[
                styles.capsuleFill,
                { height: '100%', backgroundColor: '#F4F6FA', borderRadius: 999 },
              ]}
            />
          </Animated.View>
        ))}
      </View>
      <Text style={[styles.giant, compact && styles.giantCompact]}>88</Text>
      <Text style={styles.andante}>ANDANTE</Text>
    </View>
  );
}

function ProPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const beat = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      beat.value = withTiming(0, { duration: 160 });
      spin.value = withTiming(0.08, { duration: 160 });
      return;
    }
    beat.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, false);
    spin.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    return () => {
      beat.value = 0;
      spin.value = 0;
    };
  }, [active, beat, reduceMotion, spin]);
  const bar0 = useAnimatedStyle(() => ({
    backgroundColor: beat.value < 0.22 ? '#7AE8FF' : '#E070A0',
    opacity: 1,
  }));
  const bar1 = useAnimatedStyle(() => ({
    backgroundColor: beat.value >= 0.22 && beat.value < 0.44 ? '#7AE8FF' : '#C45A88',
  }));
  const bar2 = useAnimatedStyle(() => ({
    backgroundColor: beat.value >= 0.44 && beat.value < 0.66 ? '#7AE8FF' : '#A84872',
  }));
  const bar3 = useAnimatedStyle(() => ({
    backgroundColor: beat.value >= 0.66 && beat.value < 0.88 ? '#7AE8FF' : '#8A385C',
  }));
  const status = useAnimatedStyle(() => ({
    backgroundColor: beat.value < 0.22 ? '#3DDC84' : beat.value < 0.88 ? '#E23B3B' : '#2A3038',
  }));
  const wheel = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 18}deg` }],
  }));
  const dial = compact ? 64 : 88;

  return (
    <View style={[styles.root, styles.proCard]}>
      <LinearGradient colors={['#16181E', '#08090C', '#10141A']} style={StyleSheet.absoluteFillObject} />
      <Text style={styles.proKicker}>TEMPO</Text>
      <Text style={[styles.proBpm, compact && styles.proBpmCompact]}>120</Text>
      <Text style={styles.proTerm}>ANDANTE</Text>
      <View style={styles.proBlocks}>
        <Animated.View style={[styles.proBlock, { height: compact ? 22 : 28 }, bar0]} />
        <Animated.View style={[styles.proBlock, { height: compact ? 18 : 22 }, bar1]} />
        <Animated.View style={[styles.proBlock, { height: compact ? 14 : 18 }, bar2]} />
        <Animated.View style={[styles.proBlock, { height: compact ? 26 : 32 }, bar3]} />
      </View>
      <Animated.View style={[styles.proStatus, compact && styles.proStatusCompact, status]} />
      <Animated.View style={[{ width: dial, height: dial, marginTop: 8, borderRadius: dial / 2, overflow: 'hidden' }, wheel]}>
        <LinearGradient
          colors={['#F2F4F8', '#9AA2AC', '#6A727C', '#E8ECF2']}
          start={{ x: 0.15, y: 0.05 }}
          end={{ x: 0.9, y: 0.95 }}
          style={StyleSheet.absoluteFillObject}
        />
        {Array.from({ length: 18 }, (_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              marginLeft: -1,
              top: '50%',
              width: 2,
              height: 7,
              backgroundColor: 'rgba(12,14,16,0.5)',
              transform: [{ rotate: `${i * 20}deg` }, { translateY: -(dial * 0.42) }],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

function RigPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const roll = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      roll.value = 0;
      return;
    }
    roll.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      roll.value = 0;
    };
  }, [active, reduceMotion, roll]);
  const strip = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(roll.value, [0, 1], [-10, 10]) }],
  }));
  return (
    <View style={[styles.root, styles.rigStage]}>
      <LinearGradient colors={['#1A1C1E', '#0C0E10', '#08090B']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.rigRow}>
        <View style={[styles.rigTap, compact && styles.rigTapCompact]}>
          <Text style={[styles.rigTapText, compact && { fontSize: 8 }]}>TAP</Text>
        </View>
        <View style={styles.rigDigits}>
          <Text style={[styles.rigBpm, compact && styles.rigBpmCompact]}>120</Text>
          <Text style={styles.rigMark}>ALLEGRO</Text>
        </View>
      </View>
      <View style={[styles.rigRoller, compact && styles.rigRollerCompact]}>
        <Animated.View style={[styles.rigTicks, strip]}>
          {Array.from({ length: 11 }, (_, i) => (
            <View key={i} style={[styles.rigTick, i % 2 === 0 && styles.rigTickTall]} />
          ))}
        </Animated.View>
        <View style={styles.rigNotch} />
      </View>
      <View style={[styles.rigStart, compact && styles.rigStartCompact]}>
        <Text style={[styles.rigStartText, compact && { fontSize: 8 }]}>START</Text>
      </View>
    </View>
  );
}

function PendulumPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const swing = useSharedValue(reduceMotion ? 0.35 : -1);
  useEffect(() => {
    if (!active || reduceMotion) {
      swing.value = withTiming(0.35, { duration: 160 });
      return;
    }
    swing.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      swing.value = 0.35;
    };
  }, [active, reduceMotion, swing]);
  const cardW = compact ? 168 : 220;
  const cardH = compact ? 168 : 220;
  const geo = mechanicalRodLayout(cardW, cardH);
  const rod = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value * 18}deg` }],
  }));

  return (
    <View style={styles.root} testID="mechanical-preview">
      <Image
        source={MECHANICAL_WALNUT_STUDIO}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="gallery-mechanical-studio"
      />
      <Animated.View
        pointerEvents="none"
        testID="mechanical-preview-arm"
        style={[
          {
            position: 'absolute',
            left: geo.pivotX - 10,
            top: geo.pivotY - geo.rodHeight,
            width: 20,
            height: geo.rodHeight,
            alignItems: 'center',
            transformOrigin: 'bottom',
            zIndex: 8,
          },
          rod,
        ]}>
        <LinearGradient colors={['#F4F7FB', '#9AA3AD', '#E8EEF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 4, flex: 1, borderRadius: 2 }} />
        <View
          style={{
            position: 'absolute',
            top: geo.rodHeight * 0.38,
            width: compact ? 14 : 18,
            height: compact ? 16 : 20,
            borderRadius: 3,
            backgroundColor: '#DED7CC',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.35)',
          }}
        />
      </Animated.View>
    </View>
  );
}

function LedgearPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const frame = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      frame.value = withTiming(0.2, { duration: 160 });
      return;
    }
    frame.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1, false);
    return () => {
      frame.value = 0;
    };
  }, [active, frame, reduceMotion]);
  const rim = useAnimatedStyle(() => ({
    borderColor: `rgba(220,48,40,${interpolate(frame.value, [0, 0.12, 1], [0.28, 0.95, 0.22])})`,
    shadowOpacity: interpolate(frame.value, [0, 0.12, 1], [0.12, 0.55, 0.1]),
  }));
  const led0 = useAnimatedStyle(() => ({ opacity: interpolate(frame.value, [0, 0.22, 0.28], [1, 1, 0.22]) }));
  const led1 = useAnimatedStyle(() => ({ opacity: interpolate(frame.value, [0.22, 0.28, 0.5, 0.56], [0.22, 1, 1, 0.22]) }));
  const led2 = useAnimatedStyle(() => ({ opacity: interpolate(frame.value, [0.5, 0.56, 0.72, 0.78], [0.22, 1, 1, 0.22]) }));
  const led3 = useAnimatedStyle(() => ({ opacity: interpolate(frame.value, [0.72, 0.78, 1], [0.22, 1, 0.28]) }));

  return (
    <View style={[styles.root, styles.ledgearStage]}>
      <Animated.View style={[styles.ledgearFrame, compact && styles.ledgearFrameCompact, rim]}>
        <Text style={[styles.ledgearBpm, compact && styles.ledgearBpmCompact]}>120</Text>
        <View style={styles.ledgearLeds}>
          <Animated.View style={[styles.ledgearLed, styles.ledgearLedOn, led0]} />
          <Animated.View style={[styles.ledgearLed, styles.ledgearLedOn, led1]} />
          <Animated.View style={[styles.ledgearLed, styles.ledgearLedOn, led2]} />
          <Animated.View style={[styles.ledgearLed, styles.ledgearLedOn, led3]} />
        </View>
      </Animated.View>
    </View>
  );
}

function OrbitPreview({ compact, active, reduceMotion }: PreviewFlags) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.value = withTiming(0.35, { duration: 160 });
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
    return () => {
      pulse.value = 0;
    };
  }, [active, pulse, reduceMotion]);
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.38, 1]),
    transform: [{ rotate: `${interpolate(pulse.value, [0, 1], [0, 360])}deg` }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1C1E22', '#0A0B0E', '#141618']} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[styles.orbitRing, compact && styles.orbitRingCompact, ring]}>
        {Array.from({ length: 12 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.orbitTick,
              { transform: [{ rotate: `${i * 30}deg` }, { translateY: compact ? -46 : -74 }] },
            ]}
          />
        ))}
      </Animated.View>
      <View style={[styles.orbitInner, compact && styles.orbitInnerCompact]} />
      <Text style={[styles.ghostBpm, compact && styles.ghostBpmCompact]}>120</Text>
    </View>
  );
}

function PulseHaloPreview({ compact, active, reduceMotion, editing }: PreviewFlags) {
  const ringA = useSharedValue(1);
  const ringB = useSharedValue(1);
  const ringC = useSharedValue(1);
  useEffect(() => {
    const pause = !active || reduceMotion || editing;
    if (pause) {
      ringA.value = 1;
      ringB.value = 1;
      ringC.value = 1;
      return;
    }
    const expand = { duration: 1320, easing: Easing.out(Easing.cubic) };
    ringA.value = 0;
    ringA.value = withRepeat(withTiming(1, expand), -1, false);
    ringB.value = 0;
    ringB.value = withDelay(440, withRepeat(withTiming(1, expand), -1, false));
    ringC.value = 0;
    ringC.value = withDelay(880, withRepeat(withTiming(1, expand), -1, false));
    return () => {
      ringA.value = 1;
      ringB.value = 1;
      ringC.value = 1;
    };
  }, [active, editing, reduceMotion, ringA, ringB, ringC]);
  const size = compact ? 96 : 168;
  return (
    <View style={styles.root}>
      <View style={{ backgroundColor: '#050506', ...StyleSheet.absoluteFillObject }} />
      <ThumbWave progress={ringA} size={size} />
      <ThumbWave progress={ringB} size={size} />
      <ThumbWave progress={ringC} size={size} />
      <Image
        source={PULSE_RING_INNER}
        style={{ width: size, height: size }}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="gallery-pulse-ring"
      />
      <View style={[styles.pulseCore, compact && { width: 16, height: 16, borderRadius: 8 }]} />
      <Text style={[styles.pulseBpm, compact && styles.pulseBpmCompact]}>120</Text>
    </View>
  );
}

function ThumbWave({ progress, size }: { progress: SharedValue<number>; size: number }) {
  const style = useAnimatedStyle(() => {
    const done = progress.value >= 0.995;
    return {
      opacity: done ? 0 : interpolate(progress.value, [0, 0.08, 0.28, 0.62, 1], [0.95, 0.72, 0.36, 0.12, 0]),
      transform: [{ scale: interpolate(progress.value, [0, 1], [0.78, 1.78]) }],
      borderWidth: interpolate(progress.value, [0, 0.2, 1], [3.2, 1.8, 0.7]),
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.4,
          borderColor: 'rgba(180,230,255,0.92)',
        },
        style,
      ]}
    />
  );
}

function PhotoPreview({ compact }: PreviewFlags) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#2A241C', '#12100C', '#1C1814']} style={StyleSheet.absoluteFillObject} />
      <Text style={[styles.customMark, compact && { fontSize: 64 }]}>P</Text>
    </View>
  );
}

function DialPreview({ compact, active, reduceMotion, bpm = 120 }: PreviewFlags) {
  const beat = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      beat.value = 0;
      return;
    }
    beat.value = withRepeat(withTiming(4, { duration: 3600, easing: Easing.linear }), -1, false);
    return () => {
      beat.value = 0;
    };
  }, [active, beat, reduceMotion]);
  const size = compact ? 86 : 112;
  const hub = compact ? 28 : 36;
  const arcs = [
    { rotate: '0deg', color: '#E23B3B' },
    { rotate: '90deg', color: '#3EE6D8' },
    { rotate: '180deg', color: '#3EE6D8' },
    { rotate: '270deg', color: '#3EE6D8' },
  ];
  return (
    <View style={[styles.root, { backgroundColor: '#050607' }]}>
      <Text style={{ color: '#3EE6D8', fontSize: compact ? 22 : 30, fontWeight: '700', letterSpacing: -1 }}>{Math.round(bpm)}</Text>
      <View style={{ width: size, height: size, marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#10141A',
            borderWidth: 1.5,
            borderColor: 'rgba(210,220,230,0.22)',
            borderTopColor: 'rgba(255,255,255,0.26)',
            shadowColor: '#000',
            shadowOpacity: 0.55,
            shadowRadius: 10,
          }}
        />
        {arcs.map((arc, index) => (
          <DialPreviewArc key={arc.rotate} index={index} beat={beat} size={size} color={arc.color} rotate={arc.rotate} />
        ))}
        <View
          style={{
            position: 'absolute',
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.31,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(220,228,236,0.16)',
          }}
        />
        <View
          style={{
            width: hub,
            height: hub,
            borderRadius: hub / 2,
            backgroundColor: '#161B22',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ width: 8, height: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: 2.4, height: 10, borderRadius: 1, backgroundColor: '#3EE6D8' }} />
            <View style={{ width: 2.4, height: 10, borderRadius: 1, backgroundColor: '#3EE6D8' }} />
          </View>
        </View>
      </View>
    </View>
  );
}

function DialPreviewArc({
  index,
  beat,
  size,
  color,
  rotate,
}: {
  index: number;
  beat: SharedValue<number>;
  size: number;
  color: string;
  rotate: string;
}) {
  const style = useAnimatedStyle(() => {
    const pos = ((beat.value % 4) + 4) % 4;
    const on = Math.abs(pos - index) < 0.72 || (index === 0 && pos > 3.28);
    return {
      opacity: on ? 1 : 0.18,
      shadowOpacity: on ? 0.9 : 0,
    };
  });
  const ring = size * 0.92;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: compactStroke(size),
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate }],
          shadowColor: color,
          shadowRadius: 8,
        },
        style,
      ]}
    />
  );
}

function compactStroke(size: number) {
  return size > 100 ? 8 : 7;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  capsules: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  capsule: {
    width: 14,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1.5,
    borderColor: 'rgba(220,228,236,0.42)',
    backgroundColor: 'transparent',
  },
  capsuleCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  capsuleAccent: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderColor: 'rgba(244,246,250,0.7)',
  },
  capsuleFill: {
    width: '100%',
  },
  capsuleHollow: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(220,228,236,0.5)',
  },
  giant: {
    color: '#F4F6FA',
    fontSize: 72,
    fontWeight: '200',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  giantCompact: {
    fontSize: 48,
  },
  customMark: {
    color: '#E8C878',
    fontSize: 92,
    fontWeight: '300',
    letterSpacing: 2,
  },
  andante: {
    marginTop: -2,
    color: 'rgba(200,210,222,0.7)',
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  tempoKicker: {
    color: 'rgba(232,196,106,0.72)',
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: '800',
    marginBottom: 6,
  },
  tempoRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tempoChip: {
    minWidth: 44,
    minHeight: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,196,106,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tempoChipText: {
    color: '#F4E8C8',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  miniOrb: {
    marginTop: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2E34',
    borderWidth: 1,
    borderColor: 'rgba(230,238,246,0.28)',
  },
  miniOrbCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  proMeta: {
    color: 'rgba(126,200,255,0.7)',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  proCard: {
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  proKicker: {
    color: 'rgba(224,112,160,0.82)',
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '800',
    textAlign: 'center',
  },
  proBpm: {
    color: '#7EC8FF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1.2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  proBpmCompact: {
    fontSize: 28,
  },
  proTerm: {
    color: 'rgba(126,200,255,0.7)',
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  proBlocks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    marginBottom: 6,
    alignSelf: 'center',
  },
  proBlock: {
    width: 16,
    height: 26,
    borderRadius: 4,
  },
  proStatus: {
    width: '62%',
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'center',
  },
  proStatusCompact: {
    height: 6,
  },
  proHollow: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#5EC4F0',
  },
  pyramid: {
    width: 150,
    height: 188,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    transform: [{ scaleX: 0.78 }],
    borderWidth: 1,
    borderColor: 'rgba(212,176,112,0.28)',
  },
  pyramidCompact: {
    width: 92,
    height: 112,
  },
  pyPeak: {
    alignSelf: 'center',
    width: '40%',
    height: 10,
    marginTop: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(90,56,28,0.5)',
  },
  pyWindow: {
    flex: 1,
    marginHorizontal: '20%',
    marginTop: 6,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pyRod: {
    alignItems: 'center',
    height: 96,
    transformOrigin: 'bottom',
  },
  pyStick: {
    width: 3,
    flex: 1,
    backgroundColor: '#E0D4C0',
    borderRadius: 2,
  },
  pyWeight: {
    width: 16,
    height: 16,
    marginBottom: -6,
    borderRadius: 8,
    backgroundColor: '#E8D8C0',
  },
  pyPivot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8D8C0',
    marginTop: 2,
  },
  pyScale: {
    position: 'absolute',
    left: 4,
    top: 8,
    bottom: 14,
    width: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(232,214,180,0.45)',
  },
  pyBase: {
    height: 8,
    backgroundColor: 'rgba(20,10,6,0.55)',
  },
  bezel: {
    width: '68%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#050605',
    borderWidth: 6,
    borderColor: '#161816',
    alignItems: 'center',
  },
  bezelCompact: {
    width: '74%',
    paddingVertical: 10,
    borderWidth: 5,
  },
  leds: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 5,
  },
  led: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(80,20,16,0.5)',
  },
  ledOn: {
    backgroundColor: '#E84838',
  },
  ledHollow: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(232,72,56,0.45)',
  },
  digital: {
    color: '#E84838',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(232,72,56,0.55)',
    textShadowRadius: 10,
  },
  digitalCompact: {
    fontSize: 28,
  },
  orbitRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 10,
    borderColor: 'rgba(90, 160, 220, 0.62)',
    backgroundColor: '#121418',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRingCompact: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 7,
  },
  orbitTick: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: 'rgba(180,210,230,0.55)',
  },
  orbitInner: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  orbitInnerCompact: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  ghostBpm: {
    position: 'absolute',
    color: 'rgba(246,240,228,0.92)',
    fontWeight: '700',
    letterSpacing: -1.4,
    fontSize: 48,
  },
  ghostBpmCompact: {
    fontSize: 28,
  },
  smartMark: {
    position: 'absolute',
    top: '10%',
    color: 'rgba(26,28,32,0.45)',
    letterSpacing: 3,
    fontWeight: '800',
    fontSize: 11,
  },
  smartBpm: {
    position: 'absolute',
    top: '16%',
    color: '#1A1C20',
    fontWeight: '600',
    letterSpacing: -1.6,
  },
  smartSteps: {
    position: 'absolute',
    bottom: '10%',
    flexDirection: 'row',
    gap: 18,
  },
  smartStep: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(26,28,32,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartStepText: {
    color: '#1A1C20',
    fontSize: 22,
    fontWeight: '400',
  },
  pulseCore: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(126,200,255,0.72)',
    backgroundColor: 'rgba(126,200,255,0.12)',
    shadowColor: '#7EC8FF',
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  pulseBpm: {
    position: 'absolute',
    color: '#F4F6FA',
    fontWeight: '300',
    letterSpacing: -1.2,
    fontSize: 52,
  },
  pulseBpmCompact: {
    fontSize: 28,
  },
  photoPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 18,
    borderColor: 'rgba(246,228,196,0.22)',
  },
  photoBars: {
    position: 'absolute',
    bottom: '8%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  photoBar: {
    width: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(246,228,196,0.72)',
  },
  ledgearStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080A08',
  },
  ledgearFrame: {
    width: '62%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#C42828',
    backgroundColor: '#050605',
    alignItems: 'center',
    shadowColor: '#C42828',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  ledgearFrameCompact: {
    width: '70%',
    paddingVertical: 8,
    borderWidth: 2.5,
  },
  ledgearBpm: {
    color: '#E84838',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  ledgearBpmCompact: {
    fontSize: 22,
  },
  ledgearLeds: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 4,
  },
  ledgearLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(80,20,16,0.55)',
  },
  ledgearLedOn: {
    backgroundColor: '#E84838',
  },
  ledgearLedHollow: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(232,72,56,0.45)',
  },
  rigStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#08090B',
    paddingHorizontal: 12,
    gap: 8,
  },
  rigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rigTap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A141C',
    borderWidth: 1.5,
    borderColor: '#3DE8F0',
  },
  rigTapCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  rigTapText: {
    color: '#3DE8F0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rigDigits: {
    alignItems: 'center',
  },
  rigBpm: {
    color: '#3DE8F0',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },
  rigBpmCompact: {
    fontSize: 20,
  },
  rigMark: {
    color: 'rgba(61,232,240,0.62)',
    fontSize: 8,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  rigRoller: {
    width: '78%',
    height: 18,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#101214',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  rigRollerCompact: {
    height: 14,
  },
  rigTicks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    height: '100%',
  },
  rigTick: {
    width: 1.5,
    height: 7,
    backgroundColor: 'rgba(220,226,232,0.45)',
  },
  rigTickTall: {
    height: 11,
    backgroundColor: 'rgba(236,242,248,0.75)',
  },
  rigNotch: {
    position: 'absolute',
    left: '50%',
    top: 2,
    bottom: 2,
    width: 2,
    marginLeft: -1,
    backgroundColor: '#3DE8F0',
  },
  rigStart: {
    minWidth: 64,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#123040',
    borderWidth: 1,
    borderColor: 'rgba(61,232,240,0.4)',
  },
  rigStartCompact: {
    height: 14,
    minWidth: 52,
  },
  rigStartText: {
    color: '#3DE8F0',
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
});

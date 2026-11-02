import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { SkinViewProps } from '@/components/skins/skin-types';
import type { FeelId } from '@/lib/types';

type WorldFxProps = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  glow: SharedValue<number>;
  motionGain: number;
  playing: boolean;
  feel: FeelId;
};

const VU_GAINS = [0.5, 0.86, 0.68, 0.96, 0.54, 0.82, 0.44, 0.9, 0.72, 0.6, 0.78, 0.52];

const LAMPS: { left: `${number}%`; bottom: `${number}%`; size: number; mode: 'idle' | 'beat' | 'down' }[] = [
  { left: '11%', bottom: '9.5%', size: 4, mode: 'idle' },
  { left: '21%', bottom: '8.4%', size: 5, mode: 'beat' },
  { left: '32%', bottom: '10.2%', size: 4, mode: 'down' },
  { left: '44%', bottom: '8.0%', size: 6, mode: 'beat' },
  { left: '55%', bottom: '9.8%', size: 4, mode: 'idle' },
  { left: '66%', bottom: '8.6%', size: 5, mode: 'down' },
  { left: '77%', bottom: '10.0%', size: 4, mode: 'beat' },
  { left: '87%', bottom: '9.2%', size: 5, mode: 'idle' },
];

/** Live-room focal lives in the world layers. No floating emitter. */
export function StudioPulse(props: SkinViewProps) {
  return <StudioArtwork {...props} />;
}

export function StudioArtwork(_props: SkinViewProps) {
  return <View pointerEvents="none" style={styles.stage} />;
}

/** Live-room glow behind the console. */
export function StudioRoomFx({ pulse, pulseRole, glow, motionGain, playing }: Omit<WorldFxProps, 'feel'>) {
  return (
    <>
      <StudioMicGlow pulse={pulse} pulseRole={pulseRole} motionGain={motionGain} playing={playing} />
      <StudioBoothLight pulse={pulse} pulseRole={pulseRole} glow={glow} motionGain={motionGain} playing={playing} />
    </>
  );
}

/** VU meters and console lamps sit on the desk, in front of the foreground plate. */
export function StudioConsoleFx({ pulse, pulseRole, motionGain, playing, feel }: Omit<WorldFxProps, 'glow'>) {
  return (
    <>
      <StudioVuDeck pulse={pulse} pulseRole={pulseRole} motionGain={motionGain} playing={playing} feel={feel} />
      {LAMPS.map((lamp, index) => (
        <StudioLamp
          key={index}
          lamp={lamp}
          pulse={pulse}
          pulseRole={pulseRole}
          motionGain={motionGain}
          playing={playing}
        />
      ))}
    </>
  );
}

function StudioMicGlow({
  pulse,
  pulseRole,
  motionGain,
  playing,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0, transform: [{ scale: 1 }] };
    }
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0.04, down ? 0.28 : 0.12]),
      transform: [{ scale: interpolate(amount, [0, 1], [1, down ? 1.04 : 1.015]) }],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.micGlow, style]} />;
}

function StudioBoothLight({
  pulse,
  pulseRole,
  glow,
  motionGain,
  playing,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  glow: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0 };
    }
    const down = pulseRole.value >= 1.5;
    const amount = Math.max(pulse.value, glow.value * 0.7) * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0.02, down ? 0.2 : 0.08]),
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.boothLight, style]} />;
}

function StudioVuDeck({
  pulse,
  pulseRole,
  motionGain,
  playing,
  feel,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
  feel: FeelId;
}) {
  const swamp = feel === 'swampy';
  const plateStyle = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) return { opacity: 0 };
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    return {
      opacity: interpolate(amount, [0, 1], [0.18, down ? 0.55 : 0.32]),
    };
  });

  return (
    <View pointerEvents="none" style={styles.vuWrap}>
      <Animated.View style={[styles.vuPlate, plateStyle]} />
      <View style={styles.vuRow}>
        {VU_GAINS.map((gain, index) => (
          <StudioVuBar
            key={index}
            channel={gain}
            rest={0.14 + (index % 4) * 0.04}
            pulse={pulse}
            pulseRole={pulseRole}
            motionGain={motionGain}
            playing={playing}
            swamp={swamp}
          />
        ))}
      </View>
    </View>
  );
}

function StudioVuBar({
  channel,
  rest,
  pulse,
  pulseRole,
  motionGain,
  playing,
  swamp,
}: {
  channel: number;
  rest: number;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
  swamp: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { height: 3, opacity: 0 };
    }
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    const peak = channel * (down ? 1 : 0.62) * (swamp ? 0.92 : 1);
    return {
      height: interpolate(amount, [0, 1], [4 + rest * 10, 8 + peak * 30]),
      opacity: interpolate(amount, [0, 1], [0.28, down ? 0.95 : 0.7]),
    };
  });

  return <Animated.View style={[styles.vuBar, style]} />;
}

function StudioLamp({
  lamp,
  pulse,
  pulseRole,
  motionGain,
  playing,
}: {
  lamp: (typeof LAMPS)[number];
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  motionGain: number;
  playing: boolean;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing || motionGain <= 0) {
      return { opacity: 0, transform: [{ scale: 1 }] };
    }
    const down = pulseRole.value >= 1.5;
    const amount = pulse.value * motionGain;
    if (lamp.mode === 'idle') {
      return { opacity: 0.38 + amount * 0.12, transform: [{ scale: 1 }] };
    }
    if (lamp.mode === 'down') {
      const energy = down ? amount : amount * 0.12;
      return {
        opacity: interpolate(energy, [0, 1], [0.1, 0.92]),
        transform: [{ scale: interpolate(energy, [0, 1], [1, 1.18]) }],
      };
    }
    return {
      opacity: interpolate(amount, [0, 1], [0.16, down ? 0.88 : 0.62]),
      transform: [{ scale: interpolate(amount, [0, 1], [1, down ? 1.12 : 1.05]) }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.lamp,
        {
          left: lamp.left,
          bottom: lamp.bottom,
          width: lamp.size,
          height: lamp.size,
          borderRadius: lamp.size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
  },
  micGlow: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: '22%',
    height: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(232, 186, 110, 0.22)',
  },
  boothLight: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '10%',
    height: '42%',
    borderRadius: 200,
    backgroundColor: 'rgba(214, 168, 96, 0.16)',
  },
  vuWrap: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    bottom: '20.5%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  vuPlate: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 164, 88, 0.14)',
  },
  vuRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 8,
  },
  vuBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: '#E8C070',
    shadowColor: '#F0D090',
    shadowOpacity: 0.85,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  lamp: {
    position: 'absolute',
    backgroundColor: '#F0C878',
    shadowColor: '#F0D090',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

import type { SharedValue } from 'react-native-reanimated';

import { SUNDOWN_MOTION, WorldRoomBackdrop } from '@/components/skins/WorldRoomBackdrop';

type Props = {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  pulseAccent: SharedValue<number>;
  glow: SharedValue<number>;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
  background?: number;
  fx?: number;
  ribbon?: number;
};

/**
 * Sundown V12.6: coastal dusk, warm concrete, low-frequency space.
 */
export function SundownBackdrop({
  pulse,
  pulseRole,
  glow,
  playing,
  visualPulse,
  motionGain,
  background,
  fx,
  ribbon,
}: Props) {
  return (
    <WorldRoomBackdrop
      room="sundown"
      pulse={pulse}
      pulseRole={pulseRole}
      glow={glow}
      playing={playing}
      visualPulse={visualPulse}
      motionGain={motionGain}
      background={background}
      pulseArt={fx}
      downbeatArt={ribbon}
      motion={SUNDOWN_MOTION}
    />
  );
}

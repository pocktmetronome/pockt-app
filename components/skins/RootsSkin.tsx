import type { SharedValue } from 'react-native-reanimated';

import { ROOTS_MOTION, WorldRoomBackdrop } from '@/components/skins/WorldRoomBackdrop';

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
 * Roots V12.6: resonant wooden chamber. Full-screen world only.
 */
export function RootsBackdrop({
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
      room="roots"
      pulse={pulse}
      pulseRole={pulseRole}
      glow={glow}
      playing={playing}
      visualPulse={visualPulse}
      motionGain={motionGain}
      background={background}
      pulseArt={fx}
      downbeatArt={ribbon}
      motion={ROOTS_MOTION}
    />
  );
}

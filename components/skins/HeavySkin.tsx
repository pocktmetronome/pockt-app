import type { SharedValue } from 'react-native-reanimated';

import { HEAVY_MOTION, WorldRoomBackdrop } from '@/components/skins/WorldRoomBackdrop';

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
 * Heavy V12.6: mass, pressure, architecture. Full-screen world only.
 */
export function HeavyBackdrop({
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
      room="heavy"
      pulse={pulse}
      pulseRole={pulseRole}
      glow={glow}
      playing={playing}
      visualPulse={visualPulse}
      motionGain={motionGain}
      background={background}
      pulseArt={fx}
      downbeatArt={ribbon}
      motion={HEAVY_MOTION}
    />
  );
}

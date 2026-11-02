import type { SharedValue } from 'react-native-reanimated';

import type { FeelId, SkinId, SoundId, SubdivisionId } from '@/lib/types';

export type SkinViewProps = {
  pulse: SharedValue<number>;
  glow: SharedValue<number>;
  returnPulse: SharedValue<number>;
  /** 0 = subdivision, 1 = primary beat, 2 = downbeat/accent */
  pulseRole: SharedValue<number>;
  feel: FeelId;
  feelDial: number;
  bpm: number;
  beatIndex: number;
  isDownbeat: boolean;
  playing: boolean;
  silent: boolean;
  sound?: SoundId;
  subdivision: SubdivisionId;
  size?: number;
  visualPulse: boolean;
  motionGain: number;
};

export type SkinBackdropProps = {
  glow: SharedValue<number>;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  isDownbeat: boolean;
  playing: boolean;
  visualPulse: boolean;
  motionGain: number;
  feel: FeelId;
  skin: SkinId;
};

export type SkinWorldProps = SkinViewProps & {
  skin: SkinId;
};

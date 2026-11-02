import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { DialSimonSegments } from '@/components/classic/DialRoom';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

type Props = {
  size: number;
  beats: number;
  timeSignature: TimeSignatureId;
  accentPattern: AccentLevel[];
  beatIndex: number;
  playing: boolean;
  pulse: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  bpm?: number;
  invert?: boolean;
  onBpm?: (next: number) => void;
  onToggle?: () => void;
  uiClick?: boolean;
  followRadians?: SharedValue<number>;
};

/**
 * Simon beat sectors from DialWheel at 93c6f86.
 * The drum is not this face. The numbered dial is not this face.
 */
export function RhythmInstrumentFace({
  size,
  beats,
  beatIndex,
  playing,
  pulse,
  pulseBeat,
}: Props) {
  return (
    <View pointerEvents="none" style={{ width: size, height: size }} testID="console-face-rhythm">
      <DialSimonSegments
        size={size}
        beats={beats}
        beatIndex={beatIndex}
        playing={playing}
        pulse={pulse}
        pulseBeat={pulseBeat}
      />
    </View>
  );
}

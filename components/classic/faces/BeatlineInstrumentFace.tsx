import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { BeatlineRail } from '@/components/beatline/BeatlineRail';
import { TempoRingCue } from '@/components/classic/faces/TempoRingCue';
import { P2 } from '@/constants/pockt-2';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  size: number;
  playing: boolean;
  silent: boolean;
  beatIndex: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  onChangeAccents: (pattern: AccentLevel[]) => void;
  pulseBeat?: SharedValue<number>;
};

/** BeatlineFace rail from 32b8c8e, sized to the circular face. The housing is the instrument. */
export function BeatlineInstrumentFace({
  size,
  playing,
  silent,
  timeSignature,
  subdivision,
  accentPattern,
  onChangeAccents,
  pulseBeat,
}: Props) {
  return (
    <View style={[styles.stage, { width: size, height: size }]} testID="console-face-beatline" pointerEvents="box-none">
      <TempoRingCue size={size} />
      <View pointerEvents="box-none" style={{ width: size * 0.9 }}>
        <BeatlineRail
          timeSignature={timeSignature}
          subdivision={subdivision}
          accentPattern={accentPattern}
          playing={playing}
          silent={silent}
          pulseBeat={pulseBeat}
          downbeatColor={P2.signal}
          accentColor={P2.metal}
          visualIntensity={1}
          onChange={onChangeAccents}
          skin="parts"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07080B',
  },
});

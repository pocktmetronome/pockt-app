import { StyleSheet, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';
import {
  beatLampCount,
  beatLampIndex,
  beatLampIsBackbeat,
  beatLampIsDownbeat,
} from '@/constants/meter';
import type { TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent: boolean;
  backbeat: boolean;
  accent: boolean;
};

export function BeatLights({
  timeSignature,
  beatIndex,
  playing,
  silent,
  backbeat,
  accent,
}: Props) {
  const theme = useSkin();
  const count = beatLampCount(timeSignature);
  const activeLamp = beatLampIndex(timeSignature, beatIndex);
  const compact = count > 4;
  const grouped = timeSignature === '6/8';

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => {
        const active = playing && index === activeLamp;
        const down = beatLampIsDownbeat(timeSignature, index);
        const isBack = beatLampIsBackbeat(timeSignature, index);
        const rest = backbeat && isBack ? theme.lampBack : theme.lampOff;
        const lit = down && accent ? theme.lampDown : theme.lampOn;
        return (
          <View
            key={index}
            style={[
              grouped && index === 3 ? styles.groupGap : null,
            ]}>
            <View
              style={[
                styles.lamp,
                compact && styles.lampCompact,
                down && accent && styles.lampDown,
                {
                  backgroundColor: active ? lit : rest,
                  opacity: silent ? 0.28 : active ? 1 : 0.9,
                  shadowColor: active ? lit : 'transparent',
                  shadowOpacity: active ? 0.7 : 0,
                  shadowRadius: active ? 6 : 0,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 22,
  },
  groupGap: {
    marginLeft: 10,
  },
  lamp: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lampCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lampDown: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

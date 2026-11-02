import { StyleSheet, View } from 'react-native';

import { useSkin } from '@/components/skins/SkinContext';
import { TIME_SIGNATURES } from '@/constants/meter';
import type { AccentLevel, FeelId, TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent: boolean;
  accentPattern: AccentLevel[];
  feel: FeelId;
};

export function BeatLamps({
  timeSignature,
  beatIndex,
  playing,
  silent,
  accentPattern,
  feel,
}: Props) {
  const theme = useSkin();
  const count = TIME_SIGNATURES[timeSignature].beatsPerMeasure;
  const compact = count >= 8;
  const swampy = feel === 'swampy';
  const socket = compact ? 18 : count > 4 ? 20 : 22;
  const lamp = compact ? 10 : count > 4 ? 12 : 14;

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => {
        const level = accentPattern[index] ?? 'normal';
        const active = playing && index === beatIndex;
        const backbeat = TIME_SIGNATURES[timeSignature].backbeatBeats.includes(index);
        const lit =
          level === 'mute'
            ? theme.ivoryMute
            : swampy && backbeat
              ? theme.lampBack
              : level === 'strong'
                ? theme.lampDown
                : theme.lampOn;
        return (
          <View
            key={index}
            style={[
              styles.socket,
              {
                width: socket,
                height: socket,
                borderColor: active ? lit : theme.line,
                backgroundColor: theme.bgRaised,
              },
            ]}>
            <View
              style={{
                width: lamp,
                height: lamp,
                borderRadius: lamp / 2,
                backgroundColor: active ? lit : level === 'mute' ? 'transparent' : theme.lampOff,
                borderWidth: level === 'mute' ? 1.5 : 0,
                borderColor: theme.line,
                opacity: silent ? 0.28 : active ? 1 : level === 'mute' ? 0.7 : 0.95,
              }}
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
    minHeight: 28,
    gap: 6,
  },
  socket: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
  },
});

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
  const size = compact ? 10 : count > 4 ? 11 : 13;

  return (
    <View style={styles.back}>
      {Array.from({ length: count }, (_, index) => {
        const level = accentPattern[index] ?? 'normal';
        const active = playing && index === beatIndex;
        const backbeat = TIME_SIGNATURES[timeSignature].backbeatBeats.includes(index);
        const restFill =
          level === 'mute' ? 'transparent' : level === 'strong' ? theme.bgRaised : theme.lampOff;
        const lit =
          level === 'mute'
            ? theme.ivoryMute
            : swampy && backbeat
              ? theme.mustard
              : level === 'strong'
                ? theme.lampDown
                : theme.lampOn;
        const downbeat = level === 'strong';
        const lamp = downbeat && active ? size + 5 : downbeat ? size + 1 : size;
        return (
          <View
            key={index}
            style={[
              styles.socket,
              {
                width: compact ? 16 : 20,
                height: compact ? 16 : 20,
              },
            ]}>
            <View
              style={{
                width: lamp,
                height: lamp,
                borderRadius: lamp / 2,
                backgroundColor: active ? lit : restFill,
                borderWidth: level === 'mute' ? 1.5 : downbeat ? 1.6 : 1,
                borderColor: active
                  ? lit
                  : level === 'mute'
                    ? 'rgba(237,230,216,0.38)'
                    : downbeat
                      ? theme.accent
                      : 'rgba(237,230,216,0.28)',
                opacity: silent ? 0.28 : active ? 1 : level === 'mute' ? 0.75 : 0.92,
                transform: [{ scale: active && downbeat ? 1.22 : 1 }],
                shadowColor: active && downbeat ? lit : 'transparent',
                shadowOpacity: active && downbeat ? 0.9 : 0,
                shadowRadius: active && downbeat ? 8 : 0,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(8,6,5,0.22)',
  },
  socket: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

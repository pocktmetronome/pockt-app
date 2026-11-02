import Slider from '@react-native-community/slider';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TumblerSelector } from '@/components/controls/TumblerSelector';
import { useSkin } from '@/components/skins/SkinContext';
import { SOUND_ORDER, SOUNDS } from '@/constants/sounds';
import { hapticSelection } from '@/lib/haptics';
import type { SoundId } from '@/lib/types';

type Props = {
  visible: boolean;
  sound: SoundId;
  volume: number;
  onSound: (sound: SoundId) => void;
  onVolume: (volume: number) => void;
  onClose: () => void;
};

export function SoundSheet({ visible, sound, volume, onSound, onVolume, onClose }: Props) {
  const theme = useSkin();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.bgRaised,
              borderColor: theme.line,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.top}>
            <Text style={[styles.kicker, { color: theme.mustard }]}>SOUND</Text>
            <Pressable
              onPress={() => {
                void hapticSelection();
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close sound"
              hitSlop={12}
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
              <Text style={[styles.doneText, { color: theme.ivory }]}>DONE</Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: theme.ivoryDim }]}>{SOUNDS[sound].hint}</Text>
          <TumblerSelector
            label="CLICK"
            value={sound}
            options={SOUND_ORDER.map((id) => ({ id, label: SOUNDS[id].label }))}
            onChange={onSound}
          />
          <Text style={[styles.volLabel, { color: theme.ivory }]}>VOLUME</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={volume}
            minimumTrackTintColor={theme.sliderMin}
            maximumTrackTintColor={theme.sliderMax}
            thumbTintColor={theme.thumb}
            onValueChange={(next) => {
              const rounded = Math.round(next * 100) / 100;
              if (Math.round(rounded * 10) !== Math.round(volume * 10)) void hapticSelection();
              onVolume(rounded);
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 3,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  done: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  doneText: {
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '700',
  },
  hint: {
    fontSize: 15,
    marginBottom: 4,
  },
  volLabel: {
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 3,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 48,
  },
});

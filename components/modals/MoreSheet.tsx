import Slider from '@react-native-community/slider';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PracticePanel } from '@/components/modals/PracticePanel';
import { useSkin } from '@/components/skins/SkinContext';
import { TIME_SIGNATURES } from '@/constants/meter';
import { HAPTIC_SYNC_MAX_MS, HAPTIC_SYNC_MIN_MS } from '@/constants/timing';
import { hapticSelection } from '@/lib/haptics';
import type { LockInPattern, TimeSignatureId } from '@/lib/types';

type Props = {
  visible: boolean;
  accent: boolean;
  backbeat: boolean;
  timeSignature: TimeSignatureId;
  lockIn: LockInPattern;
  hapticSyncMs: number;
  onAccent: (value: boolean) => void;
  onBackbeat: (value: boolean) => void;
  onLockIn: (value: LockInPattern) => void;
  onHapticSync: (value: number) => void;
  onClose: () => void;
};

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useSkin();
  return (
    <View style={[styles.toggleRow, disabled && styles.dim]}>
      <Text style={[styles.toggleLabel, { color: theme.ivory }]}>{label}</Text>
      <View style={styles.toggleBtns}>
        <Pressable
          disabled={disabled}
          onPress={() => {
            void hapticSelection();
            onChange(true);
          }}
          style={[
            styles.toggleBtn,
            { borderColor: value ? theme.accent : theme.line },
            value && { backgroundColor: theme.bgRaised },
          ]}>
          <Text style={[styles.toggleText, { color: value ? theme.ivory : theme.ivoryMute }]}>ON</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => {
            void hapticSelection();
            onChange(false);
          }}
          style={[
            styles.toggleBtn,
            { borderColor: !value ? theme.accent : theme.line },
            !value && { backgroundColor: theme.bgRaised },
          ]}>
          <Text style={[styles.toggleText, { color: !value ? theme.ivory : theme.ivoryMute }]}>OFF</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MoreSheet({
  visible,
  accent,
  backbeat,
  timeSignature,
  lockIn,
  hapticSyncMs,
  onAccent,
  onBackbeat,
  onLockIn,
  onHapticSync,
  onClose,
}: Props) {
  const theme = useSkin();
  const insets = useSafeAreaInsets();
  const backbeatSupported = TIME_SIGNATURES[timeSignature].supportsBackbeat;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: theme.bgRaised, borderColor: theme.line },
          ]}
          onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={12}
            style={styles.done}>
            <Text style={[styles.doneText, { color: theme.ivory }]}>DONE</Text>
          </Pressable>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}>
            <Text style={[styles.kicker, { color: theme.mustard }]}>MORE</Text>

            <Toggle label="ACCENT" value={accent} onChange={onAccent} />

            <View style={styles.block}>
              <Toggle
                label="BACKBEAT"
                value={backbeat && backbeatSupported}
                onChange={onBackbeat}
                disabled={!backbeatSupported}
              />
              <Text style={[styles.detail, { color: theme.ivory }]}>Click on 2 + 4.</Text>
              <Text style={[styles.secondary, { color: theme.ivoryMute }]}>
                {backbeatSupported
                  ? 'Make the click groove with you.'
                  : 'Backbeat lives in 4/4.'}
              </Text>
            </View>

            <View style={[styles.rule, { backgroundColor: theme.line }]} />
            <PracticePanel value={lockIn} onChange={onLockIn} />

            <View style={[styles.rule, { backgroundColor: theme.line }]} />
            <Text style={[styles.adv, { color: theme.mustard }]}>ADVANCED</Text>
            <Text style={[styles.syncTitle, { color: theme.ivory }]}>HAPTIC SYNC</Text>
            <Text style={[styles.secondary, { color: theme.ivoryMute }]}>
              {hapticSyncMs > 0 ? `+${hapticSyncMs} ms` : `${hapticSyncMs} ms`}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={HAPTIC_SYNC_MIN_MS}
              maximumValue={HAPTIC_SYNC_MAX_MS}
              step={5}
              value={hapticSyncMs}
              minimumTrackTintColor={theme.sliderMin}
              maximumTrackTintColor={theme.sliderMax}
              thumbTintColor={theme.thumb}
              onValueChange={(next) => {
                const rounded = Math.round(next);
                if (rounded !== hapticSyncMs && rounded % 15 === 0) void hapticSelection();
                onHapticSync(rounded);
              }}
            />
          </ScrollView>
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
    maxHeight: '86%',
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 3,
    marginBottom: 8,
  },
  done: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doneText: {
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '700',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  toggleLabel: {
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '700',
  },
  toggleBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    minWidth: 64,
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  toggleText: {
    fontSize: 15,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  dim: {
    opacity: 0.38,
  },
  block: {
    marginTop: 6,
    marginBottom: 8,
  },
  detail: {
    fontSize: 16,
    marginTop: 4,
  },
  secondary: {
    fontSize: 14,
    marginTop: 4,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
  },
  adv: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: 8,
  },
  syncTitle: {
    fontSize: 16,
    letterSpacing: 2,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 48,
  },
});

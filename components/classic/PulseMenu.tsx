import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeatCapsuleStrip } from '@/components/classic/BeatCapsuleStrip';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import { MixerFader } from '@/components/controls/MixerFader';
import { PULSE_SWATCHES, type DisplayPrefs, type PulseSwatch } from '@/constants/display';
import { TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import type { AccentLevel, MetronomeConfig } from '@/lib/types';

type Props = {
  visible: boolean;
  config: MetronomeConfig;
  prefs: DisplayPrefs;
  playing: boolean;
  beatIndex: number;
  silent: boolean;
  onClose: () => void;
  setBpm: (bpm: number) => void;
  tapTempo: () => void;
  onOpenPad: () => void;
  onOpenTime: () => void;
  onOpenDivision: () => void;
  onOpenSound: () => void;
  onOpenAccents: () => void;
  onOpenPresets: () => void;
  onOpenPractice: () => void;
  onOpenSettings: () => void;
  onGoHome?: () => void;
  onChangeAccents: (pattern: AccentLevel[]) => void;
  onUpdate: (patch: Partial<MetronomeConfig>) => void;
  onDisplayPrefsChange: (patch: Partial<DisplayPrefs>) => void;
};

export function PulseMenu({
  visible,
  config,
  prefs,
  playing,
  beatIndex,
  silent,
  onClose,
  setBpm,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenPresets,
  onOpenPractice,
  onOpenSettings,
  onGoHome,
  onChangeAccents,
  onUpdate,
  onDisplayPrefsChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const safeBpm = sanitizeBpm(config.bpm);

  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.top}>
            {onGoHome ? (
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  onGoHome();
                }}
                hitSlop={12}
                style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
                <Text style={styles.homeText}>‹ HOME</Text>
              </Pressable>
            ) : (
              <Text style={styles.kicker}>PULSE</Text>
            )}
            <Pressable
              onPress={() => {
                void hapticSelection();
                onClose();
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
              <Text style={styles.doneText}>CLOSE</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <Text style={styles.section}>SET BPM</Text>
            <Pressable
              onPress={onOpenPad}
              accessibilityRole="button"
              accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM.`}>
              <Text style={styles.bpm}>{safeBpm}</Text>
            </Pressable>
            <View style={styles.row}>
              <Chip label="−" onPress={() => setBpm(nudgeBpm(config.bpm, -1))} />
              <Chip
                label="TAP"
                onPress={() => {
                  void hapticTap();
                  tapTempo();
                }}
              />
              <Chip label="+" onPress={() => setBpm(nudgeBpm(config.bpm, 1))} />
              <Chip label="SET BPM" onPress={onOpenPad} />
            </View>

            <Line label="TIME" value={config.timeSignature} onPress={onOpenTime} />
            <Line label="SUBDIVISION" value={subdivisionCaption(config.subdivision)} onPress={onOpenDivision} />
            <Line
              label="DOWNBEAT"
              value={TIME_SIGNATURES[config.timeSignature]?.accentBeats.length ? 'CUSTOM' : 'BEAT 1'}
              onPress={onOpenAccents}
            />
            <Text style={styles.section}>BEAT EMPHASIS</Text>
            <BeatCapsuleStrip
              timeSignature={config.timeSignature}
              beatIndex={beatIndex}
              playing={playing}
              silent={silent}
              accentPattern={config.accentPattern}
              onChange={onChangeAccents}
              compact
              tone={{
                mute: 'rgba(126,200,255,0.35)',
                normal: 'rgba(126,200,255,0.5)',
                secondary: '#7EC8FF',
                strong: '#F4F6FA',
                active: '#F4F6FA',
              }}
            />

            <Line
              label="SOUND"
              value={SOUNDS[resolvePlayableSound(config.sound)].label}
              onPress={onOpenSound}
            />
            <Text style={styles.section}>VOLUME</Text>
            <MixerFader immediateGain value={config.volume} onChange={(volume) => onUpdate({ volume })} />

            <Toggle
              label="HAPTIC"
              value={config.haptic}
              onPress={() => onUpdate({ haptic: !config.haptic })}
            />
            <Toggle
              label="TORCH"
              value={config.flashOnBeat}
              onPress={() => onUpdate({ flashOnBeat: !config.flashOnBeat })}
            />
            <Toggle
              label="VISUAL PULSE"
              value={config.visualPulse}
              onPress={() => onUpdate({ visualPulse: !config.visualPulse })}
            />

            <Swatches
              label="RING"
              value={prefs.pulseUpbeatColor}
              onChange={(pulseUpbeatColor) => onDisplayPrefsChange({ pulseUpbeatColor })}
            />
            <Swatches
              label="DOWNBEAT"
              value={prefs.pulseDownbeatColor}
              onChange={(pulseDownbeatColor) => onDisplayPrefsChange({ pulseDownbeatColor })}
            />

            <View style={styles.row}>
              <Chip label="−5" onPress={() => setBpm(nudgeBpm(config.bpm, -5))} />
              <Chip label="+5" onPress={() => setBpm(nudgeBpm(config.bpm, 5))} />
            </View>
            <Toggle
              label="BACKGROUND"
              value={config.backgroundPlay}
              onPress={() => onUpdate({ backgroundPlay: !config.backgroundPlay })}
            />

            <View style={styles.row}>
              <Chip label="PRESETS" onPress={onOpenPresets} wide />
              <Chip label="TIMER" onPress={onOpenPractice} wide />
              <Chip label="MIX" onPress={onOpenSettings} wide />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Line({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </Pressable>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, value && styles.on]}>{value ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

function Chip({ label, onPress, wide }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, wide && styles.chipWide, pressed && styles.pressed]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function Swatches({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PulseSwatch;
  onChange: (next: PulseSwatch) => void;
}) {
  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.section}>{label}</Text>
      <View style={styles.swatchRow}>
        {PULSE_SWATCHES.map((swatch) => (
          <Pressable
            key={`${label}-${swatch}`}
            onPress={() => {
              void hapticSelection();
              onChange(swatch);
            }}
            style={[styles.swatch, { backgroundColor: swatch }, swatch === value && styles.swatchOn]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: '#0A0C10',
    borderTopWidth: 1,
    borderColor: 'rgba(126,200,255,0.18)',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    color: 'rgba(220,228,236,0.5)',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '800',
  },
  done: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  doneText: {
    color: '#F4F6FA',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
  },
  homeText: {
    color: '#7EC8FF',
    fontSize: 14,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  body: {
    paddingBottom: 12,
    gap: 4,
  },
  bpm: {
    color: '#F4F6FA',
    fontSize: 56,
    fontWeight: '500',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(126,200,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWide: {
    flex: 1,
  },
  chipText: {
    color: '#F4F6FA',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  line: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(244,246,250,0.08)',
  },
  lineLabel: {
    color: '#F4F6FA',
    fontSize: 13,
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  lineValue: {
    color: 'rgba(220,228,236,0.62)',
    fontSize: 14,
    fontWeight: '600',
  },
  on: {
    color: '#7EC8FF',
  },
  section: {
    marginTop: 12,
    marginBottom: 8,
    color: 'rgba(220,228,236,0.42)',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  swatchBlock: {
    marginTop: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: '#F4F6FA',
  },
  pressed: {
    opacity: 0.78,
  },
});

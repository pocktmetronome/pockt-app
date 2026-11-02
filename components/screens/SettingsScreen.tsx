import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MixerFader } from '@/components/controls/MixerFader';
import { TimingLab } from '@/components/dev/TimingLab';
import { HelpTip } from '@/components/pockt2/HelpTip';
import { useSkin } from '@/components/skins/SkinContext';
import { ACCENT_SWATCHES, PULSE_SWATCHES, type AccentSwatch, type DisplayPrefs, type PulseSwatch } from '@/constants/display';
import { P2 } from '@/constants/pockt-2';
import { POCKT_HELP } from '@/constants/pockt-help';
import { LOCK_IN_PATTERNS, TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { POCKET_STEPS, resolvePocketStep } from '@/constants/feel';
import { roomIdFromConfig, roomLabel } from '@/constants/rooms';
import { soundDisplay } from '@/constants/sounds';
import { pickCustomPhoto, removeCustomPhoto } from '@/lib/custom-photo';
import { HAPTIC_SYNC_MAX_MS, HAPTIC_SYNC_MIN_MS } from '@/constants/timing';
import { isBackbeatPattern, isDefaultAccentPattern } from '@/lib/accents';
import { hapticSelection } from '@/lib/haptics';
import type { TimingDiagnostics } from '@/modules/pockt-timing';
import type { MetronomeConfig, VisualMotion } from '@/lib/types';
import Slider from '@react-native-community/slider';

type Props = {
  visible: boolean;
  config: MetronomeConfig;
  onChange: (patch: Partial<MetronomeConfig>) => void;
  onOpenSound: () => void;
  onOpenAccents: () => void;
  onOpenLockIn: () => void;
  onOpenPractice?: () => void;
  onOpenSetlists?: () => void;
  onOpenLab?: () => void;
  onOpenDrum?: () => void;
  onOpenStage?: () => void;
  onOpenLibrary?: () => void;
  onOpenAbout?: () => void;
  onOpenTuner?: () => void;
  onOpenLook: () => void;
  onOpenTime?: () => void;
  onOpenDivision?: () => void;
  onOpenFeel?: () => void;
  onOpenBpmLook?: () => void;
  practiceValue?: string;
  onCustomPhotoChange?: (uri: string | null) => void;
  onResetDefaults: () => void;
  onResetAllSettings?: () => void;
  onClose: () => void;
  displayPrefs?: DisplayPrefs;
  onDisplayPrefsChange?: (patch: Partial<DisplayPrefs>) => void;
  nativeAvailable?: boolean;
  engineReady?: boolean;
  engineError?: string | null;
  playing?: boolean;
  onMathSelfTest?: () => Promise<TimingDiagnostics | null>;
  onLiveDiagnostics?: () => TimingDiagnostics | null;
  onAudioProbe?: () => Record<string, unknown> | null;
  onAudioSanityTest?: () => Promise<Record<string, unknown> | null>;
  onTestKnownGoodHomeSound?: () => Promise<Record<string, unknown> | null>;
};

export function SettingsScreen({
  visible,
  config,
  onChange,
  onOpenSound,
  onOpenAccents,
  onOpenLockIn,
  onOpenLook,
  onOpenTime,
  onOpenDivision,
  onOpenFeel,
  onOpenBpmLook,
  onOpenPractice,
  onOpenSetlists,
  onOpenLab,
  onOpenDrum,
  onOpenStage,
  onOpenLibrary,
  onOpenAbout,
  onOpenTuner: _onOpenTuner,
  practiceValue,
  onCustomPhotoChange,
  onResetDefaults,
  onResetAllSettings,
  onClose,
  displayPrefs,
  onDisplayPrefsChange,
  nativeAvailable = false,
  engineReady = false,
  engineError = null,
  playing = false,
  onMathSelfTest,
  onLiveDiagnostics,
  onAudioProbe,
  onAudioSanityTest,
  onTestKnownGoodHomeSound,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useSkin();
  const backbeatOk = TIME_SIGNATURES[config.timeSignature]?.supportsBackbeat ?? false;
  const accentsValue = isBackbeatPattern(config.accentPattern, config.timeSignature)
    ? 'BACKBEAT'
    : isDefaultAccentPattern(config.accentPattern, config.timeSignature)
      ? 'STANDARD'
      : 'CUSTOM';
  const lockLabel = LOCK_IN_PATTERNS.find((item) => item.id === config.lockIn)?.label ?? 'OFF';
  const currentRoom = roomIdFromConfig(config);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.bg,
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={styles.top}>
          <Text style={{ color: theme.mustard, fontSize: 15, letterSpacing: 7, fontWeight: '300' }}>POCKT</Text>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
            <Text style={[styles.doneText, { color: theme.ivory }]}>Done</Text>
          </Pressable>
        </View>
        <Text style={[styles.title, { color: theme.ivory }]}>Settings</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <Section title="POCKET" color={theme.ivoryMute} />
          <Row
            label="POCKETS"
            value={roomLabel(currentRoom)}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={onOpenLook}
          />
          <Section title="SOUND" color={theme.ivoryMute} />
          <Row
            label="SOUND"
            value={soundDisplay(config.sound)}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={onOpenSound}
          />
          <View style={[styles.block, { borderBottomColor: theme.line }]}>
            <Text style={[styles.rowLabel, { color: theme.ivory }]}>VOLUME</Text>
            <MixerFader
              immediateGain
              value={config.volume}
              onChange={(volume) => onChange({ volume })}
            />
          </View>
          <Section title="TIME" color={theme.ivoryMute} />
          <Row
            label="TIME"
            value={config.timeSignature}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenTime?.()}
          />
          <Row
            label="SUBDIVISION"
            value={subdivisionCaption(config.subdivision)}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenDivision?.()}
          />
          {currentRoom === 'pulse' && displayPrefs && onDisplayPrefsChange ? (
            <>
              <SwatchRow
                label="DOWNBEAT"
                value={displayPrefs.pulseDownbeatColor}
                color={theme.ivory}
                dim={theme.ivoryDim}
                line={theme.line}
                onChange={(pulseDownbeatColor) => onDisplayPrefsChange({ pulseDownbeatColor })}
              />
              <SwatchRow
                label="UPBEAT"
                value={displayPrefs.pulseUpbeatColor}
                color={theme.ivory}
                dim={theme.ivoryDim}
                line={theme.line}
                onChange={(pulseUpbeatColor) => onDisplayPrefsChange({ pulseUpbeatColor })}
              />
              <Text style={[styles.syncHint, { color: theme.ivoryMute, marginHorizontal: 4, marginBottom: 12 }]}>
                Tap the circle to start and stop. Colors live in the three-dot Pulse menu.
              </Text>
            </>
          ) : null}
          {currentRoom === 'customized' ? (
            <>
              <Row
                label={config.customPhotoUri ? 'CHANGE PHOTO' : 'CHOOSE PHOTO'}
                value=""
                color={theme.ivory}
                dim={theme.ivoryDim}
                line={theme.line}
                onPress={() => {
                  void pickCustomPhoto().then((result) => {
                    if (result.status === 'picked') onCustomPhotoChange?.(result.uri);
                  });
                }}
              />
              {config.customPhotoUri ? (
                <Row
                  label="REMOVE CUSTOM PHOTO"
                  value=""
                  color={theme.ivory}
                  dim={theme.ivoryDim}
                  line={theme.line}
                  onPress={() => {
                    void removeCustomPhoto(config.customPhotoUri).then(() => {
                      onCustomPhotoChange?.(null);
                    });
                  }}
                />
              ) : null}
            </>
          ) : null}
          <Toggle
            label="FLASH ON BEAT"
            value={config.flashOnBeat}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(flashOnBeat) => {
              void hapticSelection();
              onChange({ flashOnBeat });
            }}
          />
          <Toggle
            label="FLASH SCREEN ON BEAT"
            detail="Washes the screen on each primary beat."
            value={config.flashScreenOnBeat}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(flashScreenOnBeat) => {
              void hapticSelection();
              onChange({ flashScreenOnBeat });
            }}
          />
          <Section title="DISPLAY" color={theme.ivoryMute} />
          <Row
            label="SENSORY"
            value={config.sensoryMode.replace('-', ' + ').toUpperCase()}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            help={POCKT_HELP.sensory}
            onPress={() => {
              const order = ['all', 'audio', 'visual', 'haptic', 'audio-visual', 'audio-haptic'] as const;
              const index = order.indexOf(config.sensoryMode);
              onChange({ sensoryMode: order[(index + 1) % order.length] });
            }}
          />
          <Toggle
            label="HAPTIC"
            value={config.haptic}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(haptic) => {
              void hapticSelection();
              onChange({ haptic });
            }}
          />
          <View style={[styles.block, { borderBottomColor: theme.line }]}>
            <View style={styles.rowInner}>
              <Text style={[styles.rowLabel, { color: theme.ivoryDim }]}>HAPTIC SYNC</Text>
              <View style={styles.syncMeta}>
                <Text style={[styles.rowValue, { color: theme.ivoryDim }]}>
                  {config.hapticSyncMs > 0 ? `+${config.hapticSyncMs} ms` : `${config.hapticSyncMs} ms`}
                </Text>
                {config.hapticSyncMs !== 0 ? (
                  <Pressable
                    onPress={() => {
                      void hapticSelection();
                      onChange({ hapticSyncMs: 0 });
                    }}
                    hitSlop={8}
                    style={styles.syncReset}>
                    <Text style={[styles.syncResetText, { color: theme.accent }]}>RESET</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={HAPTIC_SYNC_MIN_MS}
              maximumValue={HAPTIC_SYNC_MAX_MS}
              step={5}
              value={config.hapticSyncMs}
              minimumTrackTintColor={theme.sliderMin}
              maximumTrackTintColor={theme.sliderMax}
              thumbTintColor={theme.thumb}
              onValueChange={(next) => {
                const rounded = Math.round(next);
                if (rounded !== config.hapticSyncMs && rounded % 15 === 0) void hapticSelection();
                onChange({ hapticSyncMs: rounded });
              }}
            />
            <Text style={[styles.syncHint, { color: theme.ivoryMute }]}>
              Moves haptics only. The click stays on the native clock. Bluetooth and other routes can
              change perceived alignment. This does not measure physical latency.
            </Text>
          </View>
          <View style={[styles.block, { borderBottomColor: theme.line }]}>
            <View style={styles.rowInner}>
              <Text style={[styles.rowLabel, { color: theme.ivoryDim }]}>VISUAL OFFSET</Text>
              <View style={styles.syncMeta}>
                <Text style={[styles.rowValue, { color: theme.ivoryDim }]}>
                  {config.visualOffsetMs > 0 ? `+${config.visualOffsetMs} ms` : `${config.visualOffsetMs} ms`}
                </Text>
                {config.visualOffsetMs !== 0 ? (
                  <Pressable
                    onPress={() => {
                      void hapticSelection();
                      onChange({ visualOffsetMs: 0 });
                    }}
                    hitSlop={8}
                    style={styles.syncReset}>
                    <Text style={[styles.syncResetText, { color: theme.accent }]}>RESET</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={HAPTIC_SYNC_MIN_MS}
              maximumValue={HAPTIC_SYNC_MAX_MS}
              step={5}
              value={config.visualOffsetMs}
              minimumTrackTintColor={theme.sliderMin}
              maximumTrackTintColor={theme.sliderMax}
              thumbTintColor={theme.thumb}
              onValueChange={(next) => onChange({ visualOffsetMs: Math.round(next) })}
            />
            <Text style={[styles.syncHint, { color: theme.ivoryMute }]}>
              Moves visuals only. Musical intervals stay on the native clock.
            </Text>
          </View>
          <Row
            label="ACCENTS"
            value={accentsValue}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={onOpenAccents}
          />
          <Toggle
            label="BACKBEAT"
            detail="2 + 4"
            value={config.backbeat && backbeatOk}
            disabled={!backbeatOk}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(backbeat) => {
              void hapticSelection();
              onChange({ backbeat });
            }}
          />
          <Row
            label="FEEL"
            value={
              POCKET_STEPS.find((step) => step.id === resolvePocketStep(config.feel, config.feelDial))
                ?.label ?? 'STRAIGHT'
            }
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            help={POCKT_HELP.feel}
            onPress={onOpenFeel ?? onClose}
          />
          <Section title="PRACTICE" color={theme.ivoryMute} />
          <Row
            label="PRACTICE"
            value={practiceValue ?? `${config.bpm}`}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenPractice?.()}
          />
          <Row
            label="SETLISTS"
            value="SAVE · RECALL"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenSetlists?.()}
          />
          <Row
            label="STAGE"
            value="PERFORMANCE LAYOUT"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenStage?.()}
          />
          <Section title="LIBRARY" color={theme.ivoryMute} />
          <Row
            label="LIBRARY"
            value="FAVORITES · PRESETS · SONGS"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenLibrary?.()}
          />
          <Row
            label="ABOUT & PRIVACY"
            value="FREE · NO ADS"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenAbout?.()}
          />
          <Section title="LABS" color={theme.ivoryMute} />
          <Row
            label="GLASS PROOF"
            value="EXPERIMENT · NATIVE METAL DIAL"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => {
              void hapticSelection();
              router.push('/glass-proof');
            }}
          />
          <Row
            label="MACHINE"
            value="ARCHIVE · NOT LOADED"
            color={theme.ivoryMute}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => {}}
          />
          <Row
            label="RHYTHM LAB"
            value={`${config.swing.toUpperCase()} · ${config.lockIn === 'full' ? 'GAP OFF' : 'GAP'}`}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenLab?.()}
          />
          <Row
            label="DRUM GRID"
            value="KICK · SNARE · HAT"
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => onOpenDrum?.()}
          />
          <Row
            label="LOCK IN"
            value={lockLabel}
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            help={POCKT_HELP.lockIn}
            onPress={onOpenLockIn}
          />
          <Row
            label="BPM LOOK"
            value={
              displayPrefs
                ? displayPrefs.bpmVisible
                  ? `${displayPrefs.bpmFont.toUpperCase()} · ${displayPrefs.bpmSize.toUpperCase()}`
                  : 'HIDDEN'
                : 'DEFAULT · LARGE'
            }
            color={theme.ivory}
            dim={theme.ivoryDim}
            line={theme.line}
            onPress={() => {
              void hapticSelection();
              onOpenBpmLook?.();
            }}
          />
          <View
            style={[
              styles.visualGroup,
              {
                borderColor: theme.line,
                backgroundColor: 'rgba(237,230,216,0.035)',
              },
            ]}>
            <Toggle
              label="VISUAL PULSE"
              value={config.visualPulse}
              color={theme.ivory}
              line={theme.line}
              raised={theme.bgRaised}
              accent={theme.accentSoft}
              mute={theme.ivoryMute}
              onChange={(visualPulse) => {
                void hapticSelection();
                onChange({ visualPulse });
              }}
            />
            <Segment
              label="MOTION"
              value={config.visualMotion}
              color={theme.ivory}
              line={theme.line}
              raised={theme.bgRaised}
              accent={theme.accentSoft}
              mute={theme.ivoryMute}
              disabled={!config.visualPulse}
              onChange={(visualMotion) => {
                void hapticSelection();
                onChange({ visualMotion });
              }}
            />
          <Toggle
            label="KEEP AWAKE"
            value={config.keepAwake}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(keepAwake) => {
              void hapticSelection();
              onChange({ keepAwake });
            }}
          />
          <Toggle
            label="BACKGROUND PLAY"
            value={config.backgroundPlay}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(backgroundPlay) => {
              void hapticSelection();
              onChange({ backgroundPlay });
            }}
          />
          <Toggle
            label="MIX WITH OTHER APPS"
            value={config.mixWithOthers}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(mixWithOthers) => {
              void hapticSelection();
              onChange({ mixWithOthers });
            }}
          />
          <Toggle
            label="STOP ON HEADPHONE UNPLUG"
            value={config.headphoneDisconnect === 'stop'}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(stop) => {
              void hapticSelection();
              onChange({ headphoneDisconnect: stop ? 'stop' : 'continue' });
            }}
          />
          <Toggle
            label="REVERSE WHEEL"
            detail="Flips drag direction on tempo wheels and dials."
            value={config.wheelInvert}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(wheelInvert) => {
              void hapticSelection();
              onChange({ wheelInvert });
            }}
          />
          <Toggle
            label="COUNT-IN"
            detail="1 bar of full click before a gap or sparse mask."
            value={config.countInBars > 0}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(on) => {
              void hapticSelection();
              onChange({ countInBars: on ? 1 : 0 });
            }}
          />
          <Toggle
            label="LARGE CONTROLS"
            detail="Bigger Play, BPM, and Pocket targets."
            value={config.largeControls}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(largeControls) => {
              void hapticSelection();
              onChange({ largeControls });
            }}
          />
          <Toggle
            label="ONE-HANDED"
            detail="Bigger Pocket and Settings targets. Immersive rooms also move them to the bottom."
            value={config.oneHanded}
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            accent={theme.accentSoft}
            mute={theme.ivoryMute}
            onChange={(oneHanded) => {
              void hapticSelection();
              onChange({ oneHanded });
            }}
          />
          <Toggle
            label="LAUNCH"
            value={config.launchSound}
              color={theme.ivory}
              line={theme.line}
              raised={theme.bgRaised}
              accent={theme.accentSoft}
              mute={theme.ivoryMute}
              groupedLast={!displayPrefs || !onDisplayPrefsChange}
              onChange={(launchSound) => {
                void hapticSelection();
                onChange({ launchSound });
              }}
            />
            {displayPrefs && onDisplayPrefsChange ? (
              <Toggle
                label="SHOW BPM"
                value={displayPrefs.bpmVisible}
                color={theme.ivory}
                line={theme.line}
                raised={theme.bgRaised}
                accent={theme.accentSoft}
                mute={theme.ivoryMute}
                groupedLast
                onChange={(bpmVisible) => {
                  void hapticSelection();
                  onDisplayPrefsChange({ bpmVisible });
                }}
              />
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onResetDefaults();
            }}
            style={({ pressed }) => [
              styles.reset,
              { borderColor: theme.ivory, backgroundColor: theme.bgRaised },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.resetText, { color: theme.ivory }]}>RESET TO DEFAULTS</Text>
          </Pressable>
          {onResetAllSettings ? (
            <Pressable
              onPress={() => {
                void hapticSelection();
                Alert.alert(
                  'Reset all settings?',
                  'This restores global, room, sound, haptic, tuner, practice, and display settings. Recordings, setlists, and custom tunings are kept.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset All Settings', style: 'destructive', onPress: onResetAllSettings },
                  ]
                );
              }}
              style={({ pressed }) => [
                styles.reset,
                { borderColor: '#C45B4A', backgroundColor: theme.bgRaised, marginTop: 10 },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.resetText, { color: '#C45B4A' }]}>RESET ALL SETTINGS</Text>
            </Pressable>
          ) : null}
          {__DEV__ && onMathSelfTest && onLiveDiagnostics ? (
            <TimingLab
              nativeAvailable={nativeAvailable}
              engineReady={engineReady}
              engineError={engineError}
              playing={playing}
              color={theme.ivory}
              dim={theme.ivoryDim}
              line={theme.line}
              raised={theme.bgRaised}
              onMathSelfTest={onMathSelfTest}
              onLiveDiagnostics={onLiveDiagnostics}
              onAudioProbe={onAudioProbe}
              onAudioSanityTest={onAudioSanityTest}
              onTestKnownGoodHomeSound={onTestKnownGoodHomeSound}
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SwatchRow({
  label,
  value,
  onChange,
  color,
  line,
  swatches = PULSE_SWATCHES,
}: {
  label: string;
  value: string;
  onChange: (next: PulseSwatch | AccentSwatch) => void;
  color: string;
  dim: string;
  line: string;
  swatches?: readonly string[];
}) {
  return (
    <View style={[styles.block, { borderBottomColor: line }]}>
      <Text style={[styles.rowLabel, { color, marginBottom: 10 }]}>{label}</Text>
      <View style={styles.swatchRow}>
        {swatches.map((swatch) => {
          const selected = swatch === value;
          return (
            <Pressable
              key={`${label}-${swatch}`}
              onPress={() => {
                void hapticSelection();
                onChange(swatch as PulseSwatch);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${swatch}`}
              style={[
                styles.swatch,
                { backgroundColor: swatch },
                selected && styles.swatchOn,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Rows that open faces or tools not yet rebuilt in the North Star language. Parked, not deleted:
 * each returns when its screen is finished, so Settings never drops the player into an older design.
 */
const PARKED = new Set([
  'POCKET',
  'POCKETS',
  'PRACTICE',
  'SETLISTS',
  'STAGE',
  'LIBRARY',
  'LABS',
  'GLASS PROOF',
  'MACHINE',
  'RHYTHM LAB',
  'DRUM GRID',
  'LOCK IN',
  'BPM LOOK',
  'FEEL',
  'ACCENTS',
  'SENSORY',
  'VISUAL PULSE',
  'MOTION',
  'LARGE CONTROLS',
  'ONE-HANDED',
  'LAUNCH',
  'SHOW BPM',
]);

function Section({ title, color }: { title: string; color: string }) {
  if (PARKED.has(title)) return null;
  return <Text style={[styles.section, { color }]}>{title}</Text>;
}

function Row({
  label,
  value,
  onPress,
  color,
  dim,
  line,
  help,
}: {
  label: string;
  value: string;
  onPress: () => void;
  color: string;
  dim: string;
  line: string;
  help?: { title: string; body: string };
}) {
  if (PARKED.has(label)) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: line }, pressed && styles.pressed]}>
      <View style={styles.rowLabelWrap}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {help ? <HelpTip topic={help} /> : null}
      </View>
      <Text style={[styles.rowValue, { color: dim }]}>{value}</Text>
    </Pressable>
  );
}

function Toggle({
  label,
  detail,
  value,
  onChange,
  disabled,
  color,
  line,
  raised,
  accent,
  mute,
  groupedLast,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  color: string;
  line: string;
  raised: string;
  accent: string;
  mute: string;
  groupedLast?: boolean;
}) {
  if (PARKED.has(label)) return null;
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: line },
        groupedLast && styles.rowLast,
        disabled && styles.dim,
      ]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowLabel, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: mute }]} numberOfLines={2}>{detail}</Text> : null}
      </View>
      <View style={styles.toggles}>
        <Pressable
          disabled={disabled}
          onPress={() => onChange(true)}
          style={[
            styles.toggle,
            { borderColor: line },
            value && { borderColor: accent, backgroundColor: raised },
          ]}>
          <Text style={[styles.toggleText, { color: mute }, value && { color }]}>ON</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => onChange(false)}
          style={[
            styles.toggle,
            { borderColor: line },
            !value && { borderColor: accent, backgroundColor: raised },
          ]}>
          <Text style={[styles.toggleText, { color: mute }, !value && { color }]}>OFF</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Segment({
  label,
  value,
  onChange,
  disabled,
  color,
  line,
  raised,
  accent,
  mute,
}: {
  label: string;
  value: VisualMotion;
  onChange: (value: VisualMotion) => void;
  disabled?: boolean;
  color: string;
  line: string;
  raised: string;
  accent: string;
  mute: string;
}) {
  if (PARKED.has(label)) return null;
  const options: { id: VisualMotion; label: string }[] = [
    { id: 'low', label: 'LOW' },
    { id: 'normal', label: 'NORMAL' },
    { id: 'high', label: 'HIGH' },
  ];

  return (
    <View style={[styles.row, { borderBottomColor: line }, disabled && styles.dim]}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <View style={styles.toggles}>
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              style={[
                styles.toggle,
                styles.segmentToggle,
                { borderColor: line },
                selected && { borderColor: accent, backgroundColor: raised },
              ]}>
              <Text style={[styles.segmentText, { color: mute }, selected && { color }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  doneText: {
    fontSize: 16,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.86,
  },
  title: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 36,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  section: {
    marginTop: 18,
    marginBottom: 4,
    fontSize: 12,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  rowLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingRight: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  visualGroup: {
    marginTop: 10,
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 4,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncReset: {
    minHeight: 32,
    justifyContent: 'center',
  },
  syncResetText: {
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  rowLabel: {
    fontSize: 17,
    letterSpacing: 1.6,
    fontWeight: '700',
    flexShrink: 1,
    paddingRight: 12,
  },
  rowValue: {
    fontSize: 15,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  detail: {
    marginTop: 2,
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  block: {
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
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
  slider: {
    width: '100%',
    height: 40,
  },
  syncHint: {
    marginTop: -2,
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  practice: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  practiceCopy: {
    flex: 1,
    paddingRight: 12,
  },
  practiceHint: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
  },
  toggles: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    minWidth: 56,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    fontSize: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  segmentToggle: {
    minWidth: 58,
    paddingHorizontal: 7,
  },
  segmentText: {
    fontSize: 12,
    letterSpacing: 0.9,
    fontWeight: '700',
  },
  dim: {
    opacity: 0.38,
  },
  reset: {
    marginTop: 22,
    minHeight: 56,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
});

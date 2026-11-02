import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/brand/Wordmark';
import { Studio } from '@/constants/colors';
import { COUNT_IN_OPTIONS } from '@/lib/classic-core';
import { hapticSelection, hapticSoft } from '@/lib/haptics';
import { SPACE_PATTERNS, SPARSE_OPTIONS, maxClickShift, shiftLabel } from '@/lib/practice-masks';
import {
  QUICK_SESSION_MINUTES,
  type PracticeConfig,
  type PracticeMode,
  type RampEndBehavior,
  type SessionLimit,
} from '@/lib/practice';
import { snapshotPracticePreset } from '@/lib/practice-presets';
import type { PracticePreset } from '@/lib/practice-presets';
import type { SubdivisionId } from '@/lib/types';

type Props = {
  visible: boolean;
  bpm: number;
  subdivision: SubdivisionId;
  draft: PracticeConfig;
  active: boolean;
  progress: number;
  barsLeft: number;
  secondsLeft: number;
  sessionBarsLeft?: number;
  sessionSecondsLeft?: number;
  presets?: PracticePreset[];
  onChange: (patch: Partial<PracticeConfig>) => void;
  onStart: () => void;
  onStop: () => void;
  onSavePreset?: (preset: PracticePreset) => void;
  onLoadPreset?: (preset: PracticePreset) => void;
  onClose: () => void;
};

export function PracticeScreen({
  visible,
  bpm,
  subdivision,
  draft,
  active,
  progress,
  barsLeft,
  secondsLeft,
  sessionBarsLeft = 0,
  sessionSecondsLeft = 0,
  presets = [],
  onChange,
  onStart,
  onStop,
  onSavePreset,
  onLoadPreset,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [help, setHelp] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const nextLabel =
    draft.mode === 'bars' ? `${barsLeft} bar${barsLeft === 1 ? '' : 's'}` : `${secondsLeft}s`;
  const shiftMax = maxClickShift(subdivision);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.top}>
          <Wordmark />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close practice"
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
            <Text style={styles.doneText}>DONE</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>PRACTICE</Text>
          <Text style={styles.lede}>
            Timed or bar-limited sessions, tempo ramps, and click masks on the same native clock.
          </Text>

          <Text style={styles.section}>COUNT-IN</Text>
          <View style={styles.modes}>
            {COUNT_IN_OPTIONS.map((item) => (
              <ModeChip
                key={item.id}
                label={item.label}
                selected={draft.countInBars === item.id}
                onPress={() => onChange({ countInBars: item.id })}
              />
            ))}
          </View>
          <HelpLink
            label="What is count-in?"
            text="Count-in plays the click for 1, 2, 3, or 4 bars before a programmed practice mask starts. Turn it off instantly with OFF."
            open={help === 'count'}
            onToggle={() => setHelp(help === 'count' ? null : 'count')}
          />

          <Text style={styles.section}>SESSION</Text>
          <View style={styles.modes}>
            {(['none', 'time', 'bars', 'single'] as SessionLimit[]).map((id) => (
              <ModeChip
                key={id}
                label={id === 'none' ? 'NO LIMIT' : id === 'time' ? 'BY TIME' : id === 'bars' ? 'BY BARS' : 'SINGLE'}
                selected={draft.sessionLimit === id}
                onPress={() => onChange({ sessionLimit: id })}
              />
            ))}
          </View>
          {draft.sessionLimit === 'time' ? (
            <>
              <View style={styles.modes}>
                {QUICK_SESSION_MINUTES.map((mins) => (
                  <ModeChip
                    key={mins}
                    label={`${mins} MIN`}
                    selected={draft.sessionMinutes === mins && draft.sessionSeconds === 0}
                    onPress={() => onChange({ sessionMinutes: mins, sessionSeconds: 0 })}
                  />
                ))}
              </View>
              <Stepper
                label="MINUTES"
                value={draft.sessionMinutes}
                onNudge={(delta) => onChange({ sessionMinutes: draft.sessionMinutes + delta })}
              />
              <Stepper
                label="SECONDS"
                value={draft.sessionSeconds}
                onNudge={(delta) => onChange({ sessionSeconds: draft.sessionSeconds + delta })}
              />
            </>
          ) : null}
          {draft.sessionLimit === 'bars' ? (
            <Stepper
              label="BARS"
              value={draft.sessionBars}
              onNudge={(delta) => onChange({ sessionBars: draft.sessionBars + delta })}
            />
          ) : null}

          <Pressable
            onPress={() => {
              void hapticSelection();
              onChange({ rampEnabled: !draft.rampEnabled });
            }}
            style={({ pressed }) => [styles.preset, draft.rampEnabled && styles.chipOn, pressed && styles.pressed]}>
            <Text style={[styles.presetText, draft.rampEnabled && styles.chipTextOn]}>TEMPO RAMP</Text>
          </Pressable>
          <HelpLink
            label="What is Tempo Ramp?"
            text="Start at one tempo and step toward a target every N bars or seconds. Changes happen on musical boundaries. Hold stays at the target. Stop ends the session. Loop returns to the start tempo."
            open={help === 'ramp'}
            onToggle={() => setHelp(help === 'ramp' ? null : 'ramp')}
          />
          {draft.rampEnabled ? (
            <>
              <Stepper label="START BPM" value={draft.startBpm} onNudge={(delta) => onChange({ startBpm: draft.startBpm + delta })} />
              <Stepper label="TARGET BPM" value={draft.targetBpm} onNudge={(delta) => onChange({ targetBpm: draft.targetBpm + delta })} />
              <Stepper label="STEP BPM" value={draft.step} prefix="+" onNudge={(delta) => onChange({ step: draft.step + delta })} />
              <Stepper label="CHANGE EVERY" value={draft.interval} onNudge={(delta) => onChange({ interval: draft.interval + delta })} />
              <View style={styles.modes}>
                <ModeChip
                  label="BARS"
                  selected={draft.mode === 'bars'}
                  onPress={() => onChange({ mode: 'bars' as PracticeMode, interval: draft.mode === 'bars' ? draft.interval : 4 })}
                />
                <ModeChip
                  label="SECONDS"
                  selected={draft.mode === 'seconds'}
                  onPress={() =>
                    onChange({ mode: 'seconds' as PracticeMode, interval: draft.mode === 'seconds' ? draft.interval : 30 })
                  }
                />
              </View>
              <View style={styles.modes}>
                {(['hold', 'stop', 'loop'] as RampEndBehavior[]).map((id) => (
                  <ModeChip
                    key={id}
                    label={id.toUpperCase()}
                    selected={draft.rampEnd === id}
                    onPress={() => onChange({ rampEnd: id })}
                  />
                ))}
              </View>
            </>
          ) : null}

          <Pressable
            onPress={() => {
              void hapticSelection();
              onChange({ spaceEnabled: !draft.spaceEnabled });
            }}
            style={({ pressed }) => [styles.preset, draft.spaceEnabled && styles.chipOn, pressed && styles.pressed]}>
            <Text style={[styles.presetText, draft.spaceEnabled && styles.chipTextOn]}>SPACE TRAINER</Text>
          </Pressable>
          <HelpLink
            label="What is Space Trainer?"
            text="Play N bars, then silence N bars. The click returns exactly on the next musical boundary. This trains internal time. It is a mask over one clock, not a second metronome."
            open={help === 'space'}
            onToggle={() => setHelp(help === 'space' ? null : 'space')}
          />
          {draft.spaceEnabled ? (
            <View style={styles.modes}>
              {SPACE_PATTERNS.map((item) => (
                <ModeChip
                  key={item.id}
                  label={item.label}
                  selected={!draft.spaceRandom && draft.spacePattern === item.id}
                  onPress={() => onChange({ spacePattern: item.id, spaceRandom: false })}
                />
              ))}
              <ModeChip
                label="RANDOM GAP"
                selected={draft.spaceRandom}
                onPress={() => onChange({ spaceRandom: !draft.spaceRandom, spacePattern: 'custom' })}
              />
            </View>
          ) : null}
          {draft.spaceEnabled && draft.spacePattern === 'custom' && !draft.spaceRandom ? (
            <>
              <Stepper
                label="AUDIBLE BARS"
                value={draft.spaceOnBars}
                onNudge={(delta) => onChange({ spaceOnBars: draft.spaceOnBars + delta })}
              />
              <Stepper
                label="SILENT BARS"
                value={draft.spaceOffBars}
                onNudge={(delta) => onChange({ spaceOffBars: draft.spaceOffBars + delta })}
              />
            </>
          ) : null}
          {draft.spaceEnabled && draft.spaceRandom ? (
            <>
              <Stepper
                label="AUDIBLE MIN"
                value={draft.spaceRandomOnMin}
                onNudge={(delta) => onChange({ spaceRandomOnMin: draft.spaceRandomOnMin + delta })}
              />
              <Stepper
                label="AUDIBLE MAX"
                value={draft.spaceRandomOnMax}
                onNudge={(delta) => onChange({ spaceRandomOnMax: draft.spaceRandomOnMax + delta })}
              />
              <Stepper
                label="SILENT MIN"
                value={draft.spaceRandomOffMin}
                onNudge={(delta) => onChange({ spaceRandomOffMin: draft.spaceRandomOffMin + delta })}
              />
              <Stepper
                label="SILENT MAX"
                value={draft.spaceRandomOffMax}
                onNudge={(delta) => onChange({ spaceRandomOffMax: draft.spaceRandomOffMax + delta })}
              />
            </>
          ) : null}

          <Pressable
            onPress={() => {
              void hapticSelection();
              onChange({ shiftEnabled: !draft.shiftEnabled });
            }}
            style={({ pressed }) => [styles.preset, draft.shiftEnabled && styles.chipOn, pressed && styles.pressed]}>
            <Text style={[styles.presetText, draft.shiftEnabled && styles.chipTextOn]}>SHIFT TRAINER</Text>
          </Pressable>
          <HelpLink
            label="What is Shift Trainer?"
            text="The audible click moves to an offbeat or subdivision while the measure and downbeat stay internally stable. Meter does not change. Best with eighths, triplets, or sixteenths."
            open={help === 'shift'}
            onToggle={() => setHelp(help === 'shift' ? null : 'shift')}
          />
          {draft.shiftEnabled ? (
            <View style={styles.modes}>
              {Array.from({ length: shiftMax + 1 }, (_, index) => (
                <ModeChip
                  key={index}
                  label={shiftLabel(index, subdivision)}
                  selected={draft.clickShift === index}
                  onPress={() => onChange({ clickShift: index })}
                />
              ))}
            </View>
          ) : null}
          {draft.shiftEnabled && shiftMax === 0 ? (
            <Text style={styles.hint}>Choose eighths, triplets, or sixteenths to shift the click off the beat.</Text>
          ) : null}

          <Text style={styles.section}>SPARSE CLICK</Text>
          <View style={styles.modes}>
            {SPARSE_OPTIONS.map((item) => (
              <ModeChip
                key={item.id}
                label={item.label}
                selected={draft.sparseMode === item.id}
                onPress={() => onChange({ sparseMode: item.id })}
              />
            ))}
          </View>

          <Text style={styles.section}>SAVE SETUP</Text>
          <View style={styles.row}>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Practice name"
              placeholderTextColor={Studio.ivoryMute}
              style={styles.input}
              accessibilityLabel="Practice preset name"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save practice preset"
              onPress={() => {
                void hapticSoft();
                onSavePreset?.(snapshotPracticePreset(presetName, draft));
                setPresetName('');
              }}
              style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
              <Text style={styles.saveText}>SAVE</Text>
            </Pressable>
          </View>
          {presets.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => {
                void hapticSelection();
                onLoadPreset?.(preset);
              }}
              style={({ pressed }) => [styles.presetRow, pressed && styles.pressed]}>
              <Text style={styles.presetRowText}>{preset.name}</Text>
            </Pressable>
          ))}

          {active ? (
            <View style={styles.status}>
              <Text style={styles.statusKicker}>ACTIVE</Text>
              {draft.rampEnabled ? (
                <>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusBpm}>{bpm}</Text>
                    <Text style={styles.statusArrow}>→</Text>
                    <Text style={styles.statusTarget}>{draft.targetBpm}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.next}>Next change in {nextLabel}</Text>
                </>
              ) : null}
              {draft.sessionLimit === 'time' ? <Text style={styles.next}>Session {sessionSecondsLeft}s remaining</Text> : null}
              {draft.sessionLimit === 'bars' ? <Text style={styles.next}>Session {sessionBarsLeft} bars remaining</Text> : null}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={active ? 'Stop practice' : 'Start practice'}
            onPress={() => {
              void hapticSoft();
              if (active) onStop();
              else onStart();
            }}
            style={({ pressed }) => [styles.action, active && styles.actionStop, pressed && styles.pressed]}>
            <Text style={styles.actionText}>{active ? 'STOP PRACTICE' : 'START PRACTICE'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function HelpLink({
  label,
  text,
  open,
  onToggle,
}: {
  label: string;
  text: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.helpWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onToggle}
        hitSlop={8}
        style={styles.helpHit}>
        <Text style={styles.helpLabel}>{open ? 'HIDE HELP' : '?'}</Text>
      </Pressable>
      {open ? <Text style={styles.helpText}>{text}</Text> : null}
    </View>
  );
}

function Stepper({
  label,
  value,
  prefix,
  onNudge,
}: {
  label: string;
  value: number;
  prefix?: string;
  onNudge: (delta: number) => void;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => {
            void hapticSoft();
            onNudge(-1);
          }}
          style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}>
          <Text style={styles.nudgeText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>
          {prefix}
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => {
            void hapticSoft();
            onNudge(1);
          }}
          style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}>
          <Text style={styles.nudgeText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 38,
    backgroundColor: Studio.bg,
    paddingHorizontal: 22,
  },
  scroll: {
    paddingBottom: 28,
  },
  top: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  done: {
    minHeight: 44,
    justifyContent: 'center',
  },
  doneText: {
    color: Studio.ivory,
    fontSize: 15,
    letterSpacing: 2.4,
    fontWeight: '600',
  },
  pressed: {
    transform: [{ translateY: 1 }],
    opacity: 0.86,
  },
  title: {
    marginTop: 18,
    color: Studio.ivory,
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: 2,
  },
  lede: {
    marginTop: 8,
    marginBottom: 18,
    color: Studio.ivoryDim,
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    marginTop: 18,
    marginBottom: 10,
    color: Studio.ivoryMute,
    fontSize: 13,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  preset: {
    marginTop: 16,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  presetText: {
    color: Studio.ivoryDim,
    fontSize: 14,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  step: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studio.line,
  },
  stepLabel: {
    color: Studio.ivory,
    fontSize: 15,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nudge: {
    width: 44,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: {
    color: Studio.ivory,
    fontSize: 22,
    fontWeight: '300',
  },
  stepValue: {
    minWidth: 56,
    color: Studio.ivory,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  modes: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minWidth: '30%',
    flexGrow: 1,
    minHeight: 48,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: Studio.amber,
    backgroundColor: Studio.bgRaised,
  },
  chipText: {
    color: Studio.ivoryDim,
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '800',
    textAlign: 'center',
  },
  chipTextOn: {
    color: Studio.ivory,
  },
  hint: {
    marginTop: 8,
    color: Studio.ivoryMute,
    fontSize: 13,
    lineHeight: 18,
  },
  helpWrap: {
    marginBottom: 6,
  },
  helpHit: {
    minHeight: 36,
    justifyContent: 'center',
  },
  helpLabel: {
    color: Studio.ivoryMute,
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  helpText: {
    color: Studio.ivoryDim,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    color: Studio.ivory,
    paddingHorizontal: 12,
  },
  save: {
    minHeight: 48,
    minWidth: 72,
    borderWidth: 1,
    borderColor: Studio.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: Studio.ivory,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  presetRow: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studio.line,
  },
  presetRowText: {
    color: Studio.ivory,
    fontSize: 16,
  },
  status: {
    marginTop: 22,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    backgroundColor: Studio.bgRaised,
  },
  statusKicker: {
    color: Studio.amber,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  statusBpm: {
    color: Studio.ivory,
    fontSize: 42,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statusArrow: {
    color: Studio.ivoryMute,
    fontSize: 22,
  },
  statusTarget: {
    color: Studio.ivoryDim,
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  track: {
    marginTop: 12,
    height: 4,
    backgroundColor: 'rgba(246,240,228,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Studio.amber,
  },
  next: {
    marginTop: 10,
    color: Studio.ivoryDim,
    fontSize: 14,
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  action: {
    marginTop: 22,
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: Studio.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Studio.bgRaised,
  },
  actionStop: {
    borderColor: Studio.amber,
  },
  actionText: {
    color: Studio.ivory,
    fontSize: 15,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
});

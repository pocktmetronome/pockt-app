import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BeatCapsuleStrip } from '@/components/classic/BeatCapsuleStrip';
import { ClassicParam, ClassicParamRow, ClassicRule } from '@/components/classic/ClassicChrome';
import { GlassPlayOrb } from '@/components/classic/GlassPlayOrb';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { TIME_SIGNATURES } from '@/constants/meter';
import { sanitizeBpm } from '@/constants/timing';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { controlStepDetent } from '@/lib/rotary-feedback';
import { tempoName } from '@/lib/tempo-name';

/**
 * RETIRED View. Not hosted. Do not re-wire into ClassicInstrumentHost or the selector.
 */
export function BeatsRoom({
  config,
  compact,
  playing,
  transport,
  pulse,
  setBpm,
  toggle,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenPractice,
  onOpenPresets,
  onOpenSetlists,
  onOpenLab,
  onChangeAccents,
}: ClassicInstrumentProps) {
  const safeBpm = sanitizeBpm(config.bpm);
  const beats = TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4;
  const tap = useClassicTapReaction(tapTempo);

  return (
    <View style={styles.root}>
      <SparkField field={tap.sparks} />
      <Text style={styles.kicker}>BEATS  ·  SPEED TRAINER</Text>
      <Pressable
        onPress={onOpenPad}
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM.`}>
        <Text style={[styles.bpm, compact && { fontSize: 86 }]} allowFontScaling={false}>
          {safeBpm}
        </Text>
        <Text style={styles.mark}>{tempoName(safeBpm)}</Text>
      </Pressable>

      <View style={styles.visual}>
        {Array.from({ length: Math.min(beats, 8) }, (_, index) => (
          <View
            key={index}
            style={[
              styles.block,
              playing && transport.beatIndex === index && !transport.silentMeasure && styles.blockOn,
            ]}
          />
        ))}
      </View>

      <BeatCapsuleStrip
        timeSignature={config.timeSignature}
        beatIndex={transport.beatIndex}
        playing={playing}
        silent={transport.silentMeasure}
        accentPattern={config.accentPattern}
        onChange={onChangeAccents}
        compact
      />

      <View style={styles.steps}>
        <Pressable
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, -5));
          }}
          style={styles.chip}>
          <Text style={styles.chipText}>−5</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, -1));
          }}
          style={styles.chip}>
          <Text style={styles.chipText}>−1</Text>
        </Pressable>
        <GlassPlayOrb playing={playing} onPress={toggle} pulse={pulse} size={compact ? 76 : 88} />
        <Pressable
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, 1));
          }}
          style={styles.chip}>
          <Text style={styles.chipText}>+1</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, 5));
          }}
          style={styles.chip}>
          <Text style={styles.chipText}>+5</Text>
        </Pressable>
      </View>

      <ClassicParamRow>
        <ClassicParam label="METER" value={config.timeSignature} onPress={onOpenTime} />
        <ClassicRule />
        <ClassicParam label="TRAINER" value="80→120" onPress={onOpenPractice} />
        <ClassicRule />
        <ClassicParam label="LAB" value="SWING" onPress={onOpenLab} />
      </ClassicParamRow>
      <ClassicParamRow>
        <ClassicParam label="PRESETS" value="SAVE" onPress={onOpenPresets} />
        <ClassicRule />
        <ClassicParam label="SETLISTS" value="OPEN" onPress={onOpenSetlists} />
        <ClassicRule />
        <ClassicParam
          label="TAP"
          value="TEMPO"
          onPress={(event) => tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        />
      </ClassicParamRow>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  kicker: {
    color: 'rgba(94,196,240,0.7)',
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
  },
  bpm: {
    color: '#F4F6FA',
    fontSize: 108,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  mark: {
    color: 'rgba(94,196,240,0.8)',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '700',
  },
  visual: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    minHeight: 28,
  },
  block: {
    width: 22,
    height: 22,
    borderRadius: 3,
    backgroundColor: 'rgba(94,196,240,0.18)',
  },
  blockOn: {
    backgroundColor: '#5EC4F0',
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    minWidth: 48,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(94,196,240,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#F4F6FA',
    fontWeight: '800',
  },
});

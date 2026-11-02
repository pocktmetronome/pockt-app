import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { BeatCapsuleStrip } from '@/components/classic/BeatCapsuleStrip';
import { GlassPlayOrb } from '@/components/classic/GlassPlayOrb';
import { HardwareKey } from '@/components/classic/ClassicHardware';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { subdivisionCaption } from '@/constants/meter';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { controlStepDetent } from '@/lib/rotary-feedback';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import { tempoName } from '@/lib/tempo-name';

/**
 * RETIRED View. Not hosted. Do not re-wire into ClassicInstrumentHost or the selector.
 */
export function TempoRoom({
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
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenPractice,
  onOpenPresets,
  onOpenSetlists,
  onOpenStage,
  onOpenLab,
  onChangeAccents,
}: ClassicInstrumentProps) {
  const safeBpm = sanitizeBpm(config.bpm);

  const tap = useClassicTapReaction(tapTempo);
  const audio = sensoryFlags(config.sensoryMode).audio;
  const haptic = effectiveHaptic(config);
  return (
    <View style={styles.root}>
      <SparkField field={tap.sparks} />
      <View style={styles.modes}>
        <ModeChip name="tune" label="Basic" active />
        <ModeChip name="bookmark-border" label="Presets" onPress={onOpenPresets} />
        <ModeChip name="queue-music" label="Setlists" onPress={onOpenSetlists} />
        <ModeChip name="trending-up" label="Practice" onPress={onOpenPractice} />
        <ModeChip name="mic" label="Gig" onPress={onOpenStage} />
      </View>
      <Pressable
        onPress={onOpenPad}
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM.`}>
        <Text style={[styles.bpm, compact && { fontSize: 84 }]} allowFontScaling={false}>
          {safeBpm}
        </Text>
        <Text style={styles.mark}>{tempoName(safeBpm)}</Text>
      </Pressable>

      <View style={styles.led}>
        <TempoLamp pulse={pulse} playing={playing && !transport.silentMeasure} />
        <Text style={styles.ledLabel}>{playing ? `BAR ${transport.measureIndex + 1}` : 'READY'}</Text>
      </View>

      <BeatCapsuleStrip
        timeSignature={config.timeSignature}
        beatIndex={transport.beatIndex}
        playing={playing}
        silent={transport.silentMeasure}
        accentPattern={config.accentPattern}
        onChange={onChangeAccents}
        compact={compact}
      />

      <View style={styles.fine}>
        <HardwareKey
          label="−"
          width={56}
          height={48}
          onPress={() => {
            controlStepDetent(audio, haptic);
            setBpm(nudgeBpm(config.bpm, -1));
          }}
        />
        <HardwareKey
          label="TAP"
          width={64}
          height={48}
          onPress={(event) => tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        />
        <GlassPlayOrb playing={playing} onPress={toggle} pulse={pulse} size={compact ? 80 : 92} />
        <HardwareKey
          label="+"
          width={56}
          height={48}
          onPress={() => {
            controlStepDetent(audio, haptic);
            setBpm(nudgeBpm(config.bpm, 1));
          }}
        />
      </View>

      <View style={styles.dock}>
        <Tool name="music-note" label={config.timeSignature} hint="Time signature" onPress={onOpenTime} />
        <Tool name="graphic-eq" label={subdivisionCaption(config.subdivision)} hint="Subdivision" onPress={onOpenDivision} />
        <Tool name="view-column" label="Beats" hint="Accents" onPress={onOpenAccents} />
        <Tool name="volume-up" label={SOUNDS[resolvePlayableSound(config.sound)].label} hint="Sound" onPress={onOpenSound} />
        <Tool name="science" label="Lab" hint="Practice lab" onPress={onOpenLab} />
      </View>
    </View>
  );
}

function TempoLamp({
  pulse,
  playing,
}: {
  pulse: ClassicInstrumentProps['pulse'];
  playing: boolean;
}) {
  const lamp = useAnimatedStyle(() => ({
    opacity: playing ? interpolate(pulse.value, [0, 1], [0.28, 1]) : 0.22,
    transform: [{ scale: playing ? interpolate(pulse.value, [0, 1], [0.92, 1.08]) : 1 }],
  }));
  return <Animated.View style={[styles.lamp, playing && styles.lampOn, lamp]} />;
}

function ModeChip({
  name,
  label,
  active,
  onPress,
}: {
  name: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.mode, active && styles.modeOn]}>
      <MaterialIcons name={name} size={18} color={active ? '#E8C46A' : 'rgba(232,196,106,0.48)'} />
    </Pressable>
  );
}

function Tool({
  name,
  label,
  hint,
  onPress,
}: {
  name: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={({ pressed }) => [styles.tool, pressed && { opacity: 0.8 }]}>
      <MaterialIcons name={name} size={18} color="#E8C46A" />
      <Text style={styles.toolText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  modes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  mode: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeOn: {
    borderBottomColor: '#E8C46A',
  },
  bpm: {
    color: '#F4E8C8',
    fontSize: 104,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  mark: {
    color: 'rgba(232,196,106,0.72)',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '700',
  },
  led: {
    alignItems: 'center',
    gap: 6,
  },
  lamp: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(232,196,106,0.18)',
  },
  lampOn: {
    backgroundColor: '#E8C46A',
  },
  ledLabel: {
    color: 'rgba(244,232,200,0.6)',
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 11,
  },
  fine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  tool: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toolText: {
    color: 'rgba(244,232,200,0.78)',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
});

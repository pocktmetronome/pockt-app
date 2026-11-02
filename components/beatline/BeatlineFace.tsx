import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BeatlineEngrave } from '@/components/beatline/BeatlineEngrave';
import { BeatlineHardwarePress } from '@/components/beatline/BeatlineHardwarePress';
import { BeatlinePart } from '@/components/beatline/BeatlinePart';
import { BeatlinePlayInsert } from '@/components/beatline/BeatlinePlayInsert';
import { BeatlineRail } from '@/components/beatline/BeatlineRail';
import { BeatlineSlider } from '@/components/beatline/BeatlineSlider';
import { BeatlineTempoDial, type BeatlineTempoDialHandle } from '@/components/beatline/BeatlineTempoDial';
import { SUBDIVISIONS } from '@/constants/meter';
import { P2 } from '@/constants/pockt-2';
import { resolvePlayableSound, SOUNDS } from '@/constants/sounds';
import { RIG_MAX_BPM, RIG_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { beatlineMeterCaption, beatlineSoundCaption } from '@/lib/beatline-2';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import { BEATLINE_SLOTS, beatlineCircle, beatlineFrameBox, beatlinePlateFrame, beatlineRect } from '@/lib/beatline-layout';
import { reviveUiDetent } from '@/lib/rotary-feedback';
import { tempoName } from '@/lib/tempo-name';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import type { AccentLevel, MetronomeConfig, SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  config: MetronomeConfig;
  playing: boolean;
  silent: boolean;
  pulseBeat?: SharedValue<number>;
  downbeatColor: string;
  accentColor: string;
  visualIntensity: number;
  setBpm: (bpm: number) => void;
  toggle: () => void;
  tapTempo: () => number | null | void;
  onChangeAccents: (pattern: AccentLevel[]) => void;
  onVolume: (volume: number) => void;
  onOpenRhythm: () => void;
  onOpenSound: () => void;
  onOpenSettings: () => void;
  onOpenPad: () => void;
  onGoHome: () => void;
  onOpenTuner: () => void;
  /** Proof host only. Production uses the window. */
  proofFrame?: { width: number; height: number };
  /** Proof host only. Holds a hardware press for stills. */
  proofPress?: 'rhythm' | 'sound' | 'tap' | 'play' | 'settings';
};

export const BeatlineFace = memo(function BeatlineFace({
  config,
  playing,
  silent,
  pulseBeat,
  downbeatColor,
  accentColor,
  visualIntensity,
  setBpm,
  toggle,
  tapTempo,
  onChangeAccents,
  onVolume,
  onOpenRhythm,
  onOpenSound,
  onOpenSettings,
  onOpenPad,
  onGoHome,
  onOpenTuner,
  proofFrame,
  proofPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const width = proofFrame?.width ?? window.width;
  const height = proofFrame?.height ?? window.height;
  const frame = beatlinePlateFrame(width, height);
  const safeBpm = sanitizeBpm(config.bpm, config.bpm, RIG_MIN_BPM, RIG_MAX_BPM);
  const [dragging, setDragging] = useState(false);
  const dialRef = useRef<BeatlineTempoDialHandle>(null);
  const liveSetterRef = useRef<(bpm: number) => void>(() => {});
  const setLiveBpm = useCallback((bpm: number) => {
    liveSetterRef.current(bpm);
  }, []);
  useEffect(() => {
    reviveUiDetent();
  }, []);
  const commitAndToggle = useCallback(() => {
    dialRef.current?.flush();
    toggle();
  }, [toggle]);
  const onTapTempo = useCallback(() => {
    const bpm = tapTempo();
    if (typeof bpm === 'number' && Number.isFinite(bpm)) {
      setLiveBpm(sanitizeBpm(bpm, bpm, RIG_MIN_BPM, RIG_MAX_BPM));
      dialRef.current?.seat(sanitizeBpm(bpm, bpm, RIG_MIN_BPM, RIG_MAX_BPM));
    }
  }, [setLiveBpm, tapTempo]);
  const sensory = sensoryFlags(config.sensoryMode);

  const rhythm = beatlineCircle(frame, BEATLINE_SLOTS.rhythm);
  const sound = beatlineCircle(frame, BEATLINE_SLOTS.sound);
  const bpmBox = beatlineRect(frame, BEATLINE_SLOTS.bpm);
  const tempoBox = beatlineRect(frame, BEATLINE_SLOTS.tempo);
  const railBox = beatlineRect(frame, BEATLINE_SLOTS.rail);
  const tap = beatlineCircle(frame, BEATLINE_SLOTS.tap);
  const dial = beatlineCircle(frame, BEATLINE_SLOTS.dial);
  const volumeBox = beatlineRect(frame, BEATLINE_SLOTS.volume);
  const volumeHit = {
    left: volumeBox.left,
    top: volumeBox.top - 12,
    width: volumeBox.width,
    height: volumeBox.height + 24,
  };
  const play = beatlineCircle(frame, BEATLINE_SLOTS.play);
  const settings = beatlineCircle(frame, BEATLINE_SLOTS.settings);
  const home = beatlineRect(frame, BEATLINE_SLOTS.home);
  const tuner = beatlineRect(frame, BEATLINE_SLOTS.tuner);
  const bpmSize = Math.round(Math.min(48, Math.max(30, frame.width * 0.1)));
  const meterBox = beatlineRect(frame, BEATLINE_SLOTS.meter);
  const subdBox = beatlineRect(frame, BEATLINE_SLOTS.subdivision);
  const soundBox = beatlineRect(frame, BEATLINE_SLOTS.soundLabel);
  const meterLabel = beatlineMeterCaption(config.timeSignature as TimeSignatureId);
  const subdLabel = SUBDIVISIONS[config.subdivision as SubdivisionId]?.short ?? 'Quarter';
  const soundLabel = beatlineSoundCaption(SOUNDS[resolvePlayableSound(config.sound)].label);

  return (
    <View style={styles.root}>
      <BeatlinePart source={BEATLINE_ASSETS.master} style={[styles.abs, beatlineFrameBox(frame)]} contentFit="cover" />

      <View style={[styles.abs, railBox]}>
        <BeatlineRail
          timeSignature={config.timeSignature as TimeSignatureId}
          subdivision={config.subdivision as SubdivisionId}
          accentPattern={config.accentPattern}
          playing={playing}
          silent={silent}
          pulseBeat={pulseBeat}
          downbeatColor={downbeatColor}
          accentColor={accentColor}
          visualIntensity={visualIntensity}
          onChange={onChangeAccents}
          skin="master"
        />
      </View>

      <View style={[styles.abs, { left: dial.left, top: dial.top, width: dial.size, height: dial.size }]}>
        <BeatlineTempoDial
          ref={dialRef}
          bpm={safeBpm}
          size={dial.size}
          onBpm={setBpm}
          onLiveBpm={setLiveBpm}
          onDragChange={setDragging}
          audioDetent={sensory.audio}
          hapticDetent={effectiveHaptic(config)}
          invert={config.wheelInvert}
          skin="ghost"
        />
      </View>

      <View style={[styles.abs, volumeHit]}>
        <BeatlineSlider
          value={config.volume}
          onChange={onVolume}
          accessibilityLabel="Metronome volume"
          length={Math.max(48, volumeBox.width)}
          skin="master"
        />
      </View>

      <BeatlineEngrave text={meterLabel} style={[styles.abs, meterBox]} />
      <BeatlineEngrave text={subdLabel} style={[styles.abs, subdBox]} />
      <BeatlineEngrave text={soundLabel} style={[styles.abs, soundBox]} />

      <BeatlineLiveReadout
        committedBpm={safeBpm}
        dragging={dragging}
        setterRef={liveSetterRef}
        bpmBox={bpmBox}
        tempoBox={tempoBox}
        bpmSize={bpmSize}
        onOpenPad={onOpenPad}
      />

      <BeatlineHardwarePress
        label="Rhythm"
        onPress={onOpenRhythm}
        kind="nav"
        forced={proofPress === 'rhythm'}
        style={[styles.abs, hitBox(rhythm)]}
      />
      <BeatlineHardwarePress
        label="Sound"
        onPress={onOpenSound}
        kind="nav"
        forced={proofPress === 'sound'}
        style={[styles.abs, hitBox(sound)]}
      />
      <BeatlineHardwarePress
        label="Tap tempo"
        onPress={onTapTempo}
        pressIn
        kind="tap"
        forced={proofPress === 'tap'}
        style={[styles.abs, hitBox(tap)]}
      />
      <BeatlineHardwarePress
        label={playing ? 'Pause' : 'Play'}
        onPress={commitAndToggle}
        pressIn
        kind="play"
        forced={proofPress === 'play'}
        style={[styles.abs, hitBox(play)]}>
        <BeatlinePlayInsert playing={playing} />
      </BeatlineHardwarePress>
      <BeatlineHardwarePress
        label="Settings and mix"
        onPress={onOpenSettings}
        kind="nav"
        forced={proofPress === 'settings'}
        style={[styles.abs, hitBox(settings)]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose Your Pocket"
        onPress={onGoHome}
        hitSlop={8}
        style={[styles.abs, styles.edgeHit, home, { marginBottom: Math.max(0, insets.bottom - 8) }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tuner"
        onPress={onOpenTuner}
        hitSlop={8}
        style={[styles.abs, styles.edgeHit, tuner]}
      />
    </View>
  );
});

function hitBox(box: { left: number; top: number; size: number }) {
  return { left: box.left, top: box.top, width: box.size, height: box.size };
}

const BeatlineLiveReadout = memo(function BeatlineLiveReadout({
  committedBpm,
  dragging,
  setterRef,
  bpmBox,
  tempoBox,
  bpmSize,
  onOpenPad,
}: {
  committedBpm: number;
  dragging: boolean;
  setterRef: { current: (bpm: number) => void };
  bpmBox: { left: number; top: number; width: number; height: number };
  tempoBox: { left: number; top: number; width: number; height: number };
  bpmSize: number;
  onOpenPad: () => void;
}) {
  const [liveBpm, setLiveBpm] = useState(committedBpm);
  const settle = useSharedValue(1);
  const lastAt = useRef(0);
  useEffect(() => {
    setterRef.current = setLiveBpm;
    return () => {
      setterRef.current = () => {};
    };
  }, [setterRef]);
  useEffect(() => {
    if (!dragging) setLiveBpm(committedBpm);
  }, [committedBpm, dragging]);
  useEffect(() => {
    if (!lastAt.current) {
      lastAt.current = Date.now();
      return;
    }
    const now = Date.now();
    if (now - lastAt.current > 88) {
      settle.value = 0.86;
      settle.value = withTiming(1, { duration: 70, easing: Easing.out(Easing.cubic) });
    }
    lastAt.current = now;
  }, [liveBpm, settle]);
  const liveTerm = tempoName(liveBpm).toUpperCase();
  const termTight = liveTerm.length > 8;
  const bpmStyle = useAnimatedStyle(() => ({ opacity: settle.value }));
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${liveBpm} ${tempoName(liveBpm)}. Tap to enter BPM.`}
        onPress={onOpenPad}
        style={[styles.abs, styles.bpmHit, bpmBox]}>
        <Animated.Text style={[styles.bpm, bpmStyle, { fontSize: bpmSize, lineHeight: bpmSize + 6 }]}>{liveBpm}</Animated.Text>
      </Pressable>
      <BeatlineEngrave text={liveTerm} tone="tempo" tight={termTight} style={[styles.abs, tempoBox]} />
    </>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: P2.field,
  },
  abs: {
    position: 'absolute',
  },
  bpmHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpm: {
    color: '#E2C57A',
    fontWeight: '300',
    letterSpacing: 3.2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    textShadowColor: 'rgba(210, 176, 96, 0.28)',
    textShadowRadius: 2.4,
    textShadowOffset: { width: 0, height: 0.4 },
  },
  edgeHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

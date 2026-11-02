import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { ProBeatCells } from '@/components/classic/ProBeatCells';
import { TempoRingCue } from '@/components/classic/faces/TempoRingCue';
import { TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { proModuleRows } from '@/lib/face-geometry';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  size: number;
  playing: boolean;
  silent: boolean;
  beatIndex: number;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  onChangeAccents: (pattern: AccentLevel[]) => void;
  pulse: SharedValue<number>;
  pulseRole?: SharedValue<number>;
  pulseBeat?: SharedValue<number>;
  pulseBeatHost?: SharedValue<number>;
  pulseSpb?: SharedValue<number>;
  pulseHostOffset?: SharedValue<number>;
  previewPhase?: number | null;
};

/**
 * ProRoom beat cells and the pendulum phase bar from 21469e5.
 * The shell already owns BPM, sound, tap, and meter, so those Pro chrome controls stay out.
 */
export function ProInstrumentFace({
  size,
  playing,
  silent,
  beatIndex,
  bpm,
  timeSignature,
  subdivision,
  accentPattern,
  onChangeAccents,
  pulse,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  previewPhase = null,
}: Props) {
  const count = Math.max(1, TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? accentPattern.length ?? 4);
  const rows = proModuleRows(count);
  const wrap = rows > 1;
  const trayW = size * (wrap ? (rows === 3 ? 0.56 : 0.66) : 0.74);
  const preview = useSharedValue(previewPhase ?? 0);
  useEffect(() => {
    if (previewPhase == null) return;
    preview.value = previewPhase;
  }, [preview, previewPhase]);
  const phase = usePendulumPhase(
    playing,
    bpm,
    pulse,
    1,
    false,
    pulseBeat,
    undefined,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const pendulumStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (previewPhase == null ? phase.value : preview.value) * (size * 0.36) }],
  }));
  const travel = trayW - 28;

  return (
    <View style={[styles.stage, { width: size, height: size }]} testID="console-face-pro" pointerEvents="box-none">
      <TempoRingCue size={size} />
      <View pointerEvents="box-none" style={[styles.stack, { width: trayW }]}>
        <Text style={styles.caption} allowFontScaling={false}>
          {timeSignature.replace('-', '/')}  {subdivisionCaption(subdivision)}
        </Text>
        <ProBeatCells
          beatIndex={beatIndex}
          playing={playing}
          silent={silent}
          accentPattern={accentPattern}
          timeSignature={timeSignature}
          pulse={pulse}
          pulseBeat={pulseBeat}
          view="all"
          onChange={onChangeAccents}
        />
        <View style={[styles.pendulumTrack, { width: travel }]}>
          <View style={styles.pendulumRail} />
          <Animated.View style={[styles.pendulumBar, pendulumStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07080B',
  },
  stack: {
    alignItems: 'center',
    gap: 10,
  },
  caption: {
    color: 'rgba(231,215,184,0.72)',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  pendulumTrack: {
    height: 22,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  pendulumRail: {
    height: 2,
    backgroundColor: 'rgba(126,200,255,0.28)',
    borderRadius: 1,
  },
  pendulumBar: {
    position: 'absolute',
    alignSelf: 'center',
    width: 36,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7EC8FF',
    shadowColor: '#7EC8FF',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});

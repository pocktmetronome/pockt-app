import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { phraseClock, phraseRecordFill, phraseScrubRatio, type PhrasePhase } from '@/lib/phrase-deck';
import { hapticEvent } from '@/lib/haptics';

type Props = {
  phase: PhrasePhase;
  loop: boolean;
  progress: number;
  elapsed: number;
  duration: number;
  onBeats: () => void;
  onRecord: () => void;
  onTransport: () => void;
  onLoop: () => void;
  onClear: () => void;
  onScrub: (ratio: number, release: boolean) => void;
};

function barsFor(phase: PhrasePhase, progress: number): number[] {
  if (phase === 'idle') return [];
  const count = 48;
  const fill = phase === 'recording' ? phraseRecordFill(progress * 12) : 1;
  return Array.from({ length: count }, (_, index) => {
    const t = index / count;
    if (t > fill) return 0.08;
    const shape = 0.25 + Math.abs(Math.sin(index * 0.73) * Math.cos(index * 0.31));
    return Math.min(1, shape);
  });
}

export function PhraseFace({
  phase,
  loop,
  progress,
  elapsed,
  duration,
  onBeats,
  onRecord,
  onTransport,
  onLoop,
  onClear,
  onScrub,
}: Props) {
  const empty = phase === 'idle';
  const recording = phase === 'recording';
  const playing = phase === 'playing';
  const bars = barsFor(phase, recording ? elapsed / 12 : progress);
  const playhead = empty || recording ? 0 : progress;
  const waveWidth = useRef(1);
  const seek = (x: number, release: boolean) => {
    if (phase !== 'ready' && phase !== 'playing' && phase !== 'paused') return;
    onScrub(phraseScrubRatio(x, waveWidth.current), release);
  };

  return (
    <View style={styles.root} testID="phrase-viewport">
      <View style={styles.selector}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="BEATS"
          testID="phrase-return"
          onPress={() => {
            void hapticEvent('selector');
            onBeats();
          }}
          style={styles.segment}>
          <Text style={styles.segmentText} allowFontScaling={false}>
            {'BEATS'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="LOOP" accessibilityState={{ selected: true }} style={[styles.segment, styles.segmentOn]}>
          <Text style={[styles.segmentText, styles.segmentTextOn]} allowFontScaling={false}>
            {'LOOP'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.transport}>
        <Pressable accessibilityRole="button" accessibilityLabel={recording ? 'Stop recording' : 'RECORD'} onPress={onRecord} style={styles.round}>
          <View style={recording ? styles.stopDot : styles.recDot} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play phrase'} onPress={onTransport} style={styles.play}>
          <View style={playing ? styles.pause : styles.triangle} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Loop" accessibilityState={{ selected: loop }} onPress={onLoop} style={[styles.round, loop && styles.loopOn]}>
          <Text style={styles.loopMark} allowFontScaling={false}>
            ↻
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="CLEAR" onPress={onClear} style={styles.round}>
          <Text style={styles.clear} allowFontScaling={false}>
            CLEAR
          </Text>
        </Pressable>
      </View>
      <View
        style={styles.wave}
        testID="deck-timeline"
        onLayout={(event) => {
          waveWidth.current = Math.max(1, event.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => phase === 'ready' || phase === 'playing' || phase === 'paused'}
        onMoveShouldSetResponder={() => phase === 'ready' || phase === 'playing' || phase === 'paused'}
        onResponderGrant={(event) => seek(event.nativeEvent.locationX, false)}
        onResponderMove={(event) => seek(event.nativeEvent.locationX, false)}
        onResponderRelease={(event) => seek(event.nativeEvent.locationX, true)}>
        {empty ? <View style={styles.baseline} /> : null}
        {!empty
          ? bars.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: `${Math.round(height * 80)}%`,
                    backgroundColor: index / bars.length < playhead ? '#F3E6C8' : '#8A7350',
                  },
                ]}
              />
            ))
          : null}
        {!empty && !recording ? <View style={[styles.playhead, { left: `${Math.round(playhead * 100)}%` }]} /> : null}
      </View>
      <View style={styles.clocks}>
        <Text style={styles.clock} allowFontScaling={false}>
          {phraseClock(elapsed)}
        </Text>
        <Text style={styles.clock} allowFontScaling={false}>
          {phraseClock(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: 'rgba(184,137,58,0.4)',
    gap: 12,
  },
  selector: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0E0D0C',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: '#1C1814',
    borderBottomWidth: 2,
    borderBottomColor: '#E7D3A8',
  },
  segmentText: {
    color: '#A89A86',
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  segmentTextOn: {
    color: '#F3E6C8',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 72,
  },
  round: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1714',
    borderWidth: 1,
    borderColor: 'rgba(214,186,140,0.45)',
  },
  play: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C4A36A',
  },
  recDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C4483A',
  },
  stopDot: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#C4483A',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: '#1A140C',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  pause: {
    width: 14,
    height: 16,
    backgroundColor: '#1A140C',
  },
  loopMark: {
    color: '#E6D3AE',
    fontSize: 20,
  },
  loopOn: {
    borderColor: '#E7D3A8',
  },
  clear: {
    color: '#E6D3AE',
    fontSize: 9,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  wave: {
    flex: 1,
    minHeight: 120,
    borderRadius: 10,
    backgroundColor: '#07080B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  baseline: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(214,186,140,0.35)',
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
  playhead: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: '#F3E6C8',
  },
  clocks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clock: {
    color: '#C8BBA6',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});

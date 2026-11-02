import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ClassicDialBeats } from '@/components/classic/ClassicDialBeats';
import type { PhrasePhase } from '@/lib/phrase-deck';
import type { AccentLevel } from '@/lib/types';

const PATTERN: AccentLevel[] = ['strong', 'normal', 'mute', 'accent'];

function one(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? fallback;
}

function phaseFor(state: string): PhrasePhase {
  if (state === 'recording') return 'recording';
  if (state === 'ready' || state === 'recorded') return 'ready';
  if (state === 'playing' || state === 'loop') return 'playing';
  if (state === 'paused') return 'paused';
  return 'idle';
}

export default function BeatDeckProofScreen() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state = one(params.state, 'beats');
  const [pattern, setPattern] = useState<AccentLevel[]>(PATTERN);
  const proof = state === 'flip' ? 'flip' : state === 'beats' ? 'beats' : 'deck';
  const phase = phaseFor(state);
  return (
    <View style={styles.page}>
      <Text style={styles.title}>{state}</Text>
      <View style={styles.row} testID="beat-deck-ready">
        <ClassicDialBeats
          timeSignature="4/4"
          beatIndex={state === 'beats' ? 0 : 1}
          playing={state === 'beats'}
          accentPattern={pattern}
          onChange={setPattern}
          width={360}
          proof={proof}
          deck={{
            phase,
            loop: state === 'loop',
            onRecord: () => undefined,
            onReplace: () => undefined,
            onTransport: () => undefined,
            onLoop: () => undefined,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#050607',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#E7D7B8',
    fontSize: 13,
    letterSpacing: 1.4,
    marginBottom: 16,
    fontWeight: '700',
  },
  row: {
    width: 360,
    height: 72,
  },
});

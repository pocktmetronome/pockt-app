import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PocktDialView } from 'pockt-dial';

import { sanitizeBpm } from '@/constants/timing';
import { useMetronome } from '@/hooks/use-metronome';
import { TOUCHLAB_GIT_DIRTY, TOUCHLAB_GIT_SHA } from '@/lib/touchlab-revision';

const GREY = '#3A3A3A';
const PAPER = '#FFFFFF';

type Counts = { down: number; up: number; press: number };

function modulePresent(name: string): boolean {
  try {
    return requireOptionalNativeModule(name) != null;
  } catch {
    return false;
  }
}

function stamp(): string {
  const now = new Date();
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

function LabPress({
  label,
  counts,
  onDown,
  onUp,
  onPress,
}: {
  label: string;
  counts: Counts;
  onDown: () => void;
  onUp: () => void;
  onPress: () => void;
}) {
  const [held, setHeld] = useState(false);
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.count}>DOWN {counts.down}</Text>
        <Text style={styles.count}>UP {counts.up}</Text>
        <Text style={styles.count}>PRESS {counts.press}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          setHeld(true);
          onDown();
        }}
        onPressOut={() => {
          setHeld(false);
          onUp();
        }}
        onPress={onPress}
        style={[styles.key, held && styles.keyHeld]}>
        <Text style={[styles.keyLabel, held && styles.keyLabelHeld]}>{label}</Text>
      </Pressable>
    </View>
  );
}

export default function TouchLab() {
  const { width, height } = useWindowDimensions();
  const { setBpm: commitBpm, start, stop, hydrated, engineError, playing } = useMetronome();
  const [bpm, setBpm] = useState(120);
  const [play, setPlay] = useState<Counts>({ down: 0, up: 0, press: 0 });
  const [tap, setTap] = useState<Counts>({ down: 0, up: 0, press: 0 });
  const [hapticCount, setHapticCount] = useState(0);
  const [engineOn, setEngineOn] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const bpmRef = useRef(120);
  const seeded = useRef(false);
  const dialSize = Math.min(width - 24, Math.max(200, Math.min(300, height * 0.34)));
  const nativeBuild = Constants.platform?.ios?.buildNumber ?? null;

  const push = useCallback((line: string) => {
    setLog((prev) => [...prev, `${stamp()} ${line}`].slice(-8));
  }, []);

  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
    bpmRef.current = 120;
    setBpm(120);
    commitBpm(120);
  }, [hydrated, commitBpm]);

  const onDialBpm = useCallback(
    (value: number) => {
      const next = sanitizeBpm(value, bpmRef.current);
      if (next === bpmRef.current) return;
      bpmRef.current = next;
      setBpm(next);
      commitBpm(next);
      push(`DIAL_BPM ${next}`);
    },
    [commitBpm, push]
  );

  return (
    <View style={[styles.screen, { paddingTop: 20, paddingBottom: 20 }]}>
      <Text style={styles.header}>BUILD {nativeBuild ?? 'UNAVAILABLE'}</Text>
      <Text style={styles.header}>
        GIT {TOUCHLAB_GIT_SHA}
        {TOUCHLAB_GIT_DIRTY ? ' DIRTY' : ''}
      </Text>
      <Text style={styles.header}>
        {Math.round(width)} × {Math.round(height)}
      </Text>
      <Text style={styles.header}>DIAL MODULE {modulePresent('PocktDial') ? 'TRUE' : 'FALSE'}</Text>
      <Text style={styles.header}>TIMING MODULE {modulePresent('PocktTiming') ? 'TRUE' : 'FALSE'}</Text>
      <Text style={styles.header}>CONTROLS MODULE {modulePresent('PocktControls') ? 'TRUE' : 'FALSE'}</Text>

      <Text style={styles.bpm}>{bpm}</Text>

      {Platform.OS === 'ios' ? (
        <View
          style={{ width: dialSize, height: dialSize }}
          onTouchStart={() => push('DIAL_BEGIN')}
          onTouchEnd={() => push('DIAL_END')}
          onTouchCancel={() => push('DIAL_END')}>
          <PocktDialView
            bpm={bpm}
            haptic
            playing={playing}
            style={{ width: dialSize, height: dialSize }}
            onBpm={(event) => onDialBpm(event.nativeEvent.bpm)}
          />
        </View>
      ) : (
        <Text style={styles.header}>BUILD 122 DIAL IS IOS ONLY</Text>
      )}

      <ScrollView style={styles.rest} contentContainerStyle={styles.restContent}>
        <LabPress
          label="PLAY"
          counts={play}
          onDown={() => {
            setPlay((counts) => ({ ...counts, down: counts.down + 1 }));
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            push('PLAY_DOWN');
          }}
          onUp={() => {
            setPlay((counts) => ({ ...counts, up: counts.up + 1 }));
            push('PLAY_UP');
          }}
          onPress={() => {
            setPlay((counts) => ({ ...counts, press: counts.press + 1 }));
            push('PLAY_PRESS');
          }}
        />
        <LabPress
          label="TAP"
          counts={tap}
          onDown={() => {
            setTap((counts) => ({ ...counts, down: counts.down + 1 }));
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            push('TAP_DOWN');
          }}
          onUp={() => {
            setTap((counts) => ({ ...counts, up: counts.up + 1 }));
            push('TAP_UP');
          }}
          onPress={() => {
            setTap((counts) => ({ ...counts, press: counts.press + 1 }));
            push('TAP_PRESS');
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Haptic"
          onPress={() => {
            setHapticCount((count) => count + 1);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            push('HAPTIC');
          }}
          style={styles.haptic}>
          <Text style={styles.keyLabel}>HAPTIC {hapticCount}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={engineOn ? 'Engine on' : 'Engine off'}
          onPress={() => {
            const next = !engineOn;
            setEngineOn(next);
            if (next) void start();
            else stop();
            push(next ? 'ENGINE_ON' : 'ENGINE_OFF');
          }}
          style={styles.engine}>
          <Text style={styles.keyLabel}>ENGINE {engineOn ? 'ON' : 'OFF'}</Text>
        </Pressable>
        {engineError ? <Text style={styles.header}>{engineError}</Text> : null}
        <View style={styles.log}>
          {log.length === 0 ? <Text style={styles.logLine}>LOG EMPTY</Text> : null}
          {log.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.logLine}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GREY,
    paddingHorizontal: 12,
  },
  header: {
    color: PAPER,
    fontSize: 16,
    fontWeight: '700',
  },
  bpm: {
    color: PAPER,
    fontSize: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  rest: {
    flex: 1,
  },
  restContent: {
    gap: 12,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    color: PAPER,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  key: {
    width: 160,
    height: 90,
    backgroundColor: '#6A6A6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHeld: {
    backgroundColor: '#F4F4F4',
    transform: [{ translateY: 2 }],
  },
  keyLabel: {
    color: PAPER,
    fontSize: 28,
    fontWeight: '800',
  },
  keyLabelHeld: {
    color: '#111111',
  },
  haptic: {
    height: 72,
    backgroundColor: '#6A6A6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engine: {
    height: 64,
    backgroundColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  log: {
    minHeight: 120,
  },
  logLine: {
    color: PAPER,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});

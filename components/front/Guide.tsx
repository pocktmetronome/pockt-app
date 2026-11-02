/**
 * One-screen guides, shown once: how the looper works, and what the six face keys are. Large type, the
 * key colours as lit dots, one button. They can be opened again from Setup.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NS, press } from '@/components/front/ui';

export type GuideId = 'loop' | 'faces';
const KEY = 'pockt.guides.v1';

/** Which guides have been seen, kept on the phone. */
export function useGuides() {
  const [seen, setSeen] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setSeen(raw ? (JSON.parse(raw) as Record<string, boolean>) : {}))
      .catch(() => setSeen({}));
  }, []);
  const markSeen = useCallback((id: GuideId) => {
    setSeen((prev) => {
      const next = { ...(prev ?? {}), [id]: true };
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  return { ready: seen !== null, seen: seen ?? {}, markSeen };
}

const LOOP_ROWS: { dot: string; act: string; what: string }[] = [
  { dot: '#ff3b2a', act: 'Tap', what: 'Counts in 4-3-2-1, then records. The key blinks red.' },
  { dot: '#fff4e2', act: 'Tap again', what: 'The loop closes at the bar line and plays. The key glows white.' },
  { dot: '#ff3b2a', act: 'Tap while it plays', what: 'Adds a layer from the top of the loop. Up to 6.' },
  { dot: '#ffa733', act: 'Double-tap', what: 'Stops the loop. It stays saved; the key glows amber.' },
  { dot: '#bfeaff', act: 'Hold', what: 'Playing: undo the last layer. Stopped: clear the loop.' },
];

const NAV = [
  require('../../assets/north-star-face/v9/nav/navi-0.png'),
  require('../../assets/north-star-face/v9/nav/navi-1.png'),
  require('../../assets/north-star-face/v9/nav/navi-2.png'),
  require('../../assets/north-star-face/v9/nav/navi-3.png'),
  require('../../assets/north-star-face/v9/nav/navi-4.png'),
  require('../../assets/north-star-face/v9/nav/navi-5.png'),
];
const FACE_ROWS: { name: string; what: string }[] = [
  { name: 'Dial', what: 'Turn the ring to set the tempo.' },
  { name: 'Rhythm', what: 'Your beats on a wheel. Tap a beat to accent it.' },
  { name: 'Pulse', what: 'Feel the beat as light. Tap the centre for colours.' },
  { name: 'Pendulum', what: 'The classic swing. Drag the weight to set the tempo.' },
  { name: 'Pro', what: 'Accent columns, bar, beat and time. Tap the light bar to change it.' },
  { name: 'Beatline', what: 'Every subdivision on a line of light. Tap a jewel.' },
];

export function Guide({ id, onDone }: { id: GuideId | null; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  if (!id) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <View style={[styles.card, { marginTop: insets.top + 24, marginBottom: insets.bottom + 24 }]}>
        <Text style={styles.title}>{id === 'loop' ? 'THE LOOPER' : 'SIX FACES'}</Text>
        <Text style={styles.sub}>{id === 'loop' ? 'Everything happens on the LOOP key' : 'The keys along the bottom change the face'}</Text>
        <View style={styles.rows}>
          {id === 'loop'
            ? LOOP_ROWS.map((r, i) => (
                <View key={i} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: r.dot, shadowColor: r.dot }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.act}>{r.act}</Text>
                    <Text style={styles.what}>{r.what}</Text>
                  </View>
                </View>
              ))
            : FACE_ROWS.map((r, i) => (
                <View key={i} style={styles.row}>
                  <Image source={NAV[i]} style={styles.icon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.act}>{r.name}</Text>
                    <Text style={styles.what}>{r.what}</Text>
                  </View>
                </View>
              ))}
        </View>
        <Text style={styles.tip}>{id === 'loop' ? 'Tip: wear headphones when you add layers.' : 'Press a face key any time to see its name on the display.'}</Text>
        <Pressable
          accessibilityRole="button"
          onPressIn={press}
          onPress={onDone}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}>
          <Text style={styles.btnText}>GOT IT</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', paddingHorizontal: 16 },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: NS.edge,
    backgroundColor: '#15110D',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 30,
  },
  title: { fontFamily: NS.font.semibold, fontSize: 28, letterSpacing: 3, color: NS.amberHi, textAlign: 'center' },
  sub: { marginTop: 6, fontFamily: NS.font.medium, fontSize: 18, color: NS.inkMute, textAlign: 'center' },
  rows: { marginTop: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dot: { width: 18, height: 18, borderRadius: 9, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  icon: { width: 30, height: 28, tintColor: NS.amberHi },
  act: { fontFamily: NS.font.semibold, fontSize: 21, color: NS.ink },
  what: { marginTop: 2, fontFamily: NS.font.regular, fontSize: 18, lineHeight: 23, color: NS.inkMute },
  tip: { marginTop: 18, fontFamily: NS.font.medium, fontSize: 17, color: NS.inkMute, textAlign: 'center' },
  btn: { marginTop: 18, height: 60, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(240,162,60,0.7)', backgroundColor: 'rgba(240,162,60,0.14)', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: NS.font.semibold, fontSize: 22, letterSpacing: 4, color: NS.amberHi },
});

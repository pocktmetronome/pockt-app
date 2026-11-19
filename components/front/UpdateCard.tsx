/**
 * "New in POCKT": one card, shown once, only to people who already had POCKT before this update (a brand-new
 * install gets the welcome guide instead and never sees this). Never shown while the metronome is playing;
 * it waits for the next launch. Change UPDATE_CARD for the next update's news and it shows once again.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NS, press } from '@/components/front/ui';

const KEY = 'pockt.update-card.v1';

export const UPDATE_CARD = {
  id: 'volume-boost-2026-11',
  kicker: 'NEW IN POCKT',
  title: 'Louder when you need it',
  body: 'Slide volume past 100% into Boost. Sharp clicks get up to twice as loud, with no distortion. Made for loud rooms.',
  action: 'SHOW ME',
};

/**
 * Decides once per launch. `existingUser` is true when this phone already saw the welcome guide on an earlier
 * version; `ready` waits for that to be known.
 */
export function useUpdateCard(ready: boolean, existingUser: boolean, playing: boolean) {
  const [show, setShow] = useState(false);
  const decided = useRef(false);
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(KEY);
        if (seen === UPDATE_CARD.id) return;
        if (!existingUser) {
          // a new install: this news isn't news to them
          await AsyncStorage.setItem(KEY, UPDATE_CARD.id);
          return;
        }
        if (playing) return; // never interrupt playing; try again next launch
        setShow(true);
      } catch {
        /* a news card is never worth an error */
      }
    })();
  }, [ready, existingUser, playing]);
  const close = () => {
    setShow(false);
    void AsyncStorage.setItem(KEY, UPDATE_CARD.id).catch(() => undefined);
  };
  return { show, close };
}

export function UpdateCard({ visible, onShowMe, onClose }: { visible: boolean; onShowMe: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={[StyleSheet.absoluteFill, styles.backdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPressIn={press} onPress={onClose} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
          <Text style={styles.kicker}>{UPDATE_CARD.kicker}</Text>
          <Text style={styles.title}>{UPDATE_CARD.title}</Text>
          <Text style={styles.body}>{UPDATE_CARD.body}</Text>
          {/* the slider as it now looks: amber to the notch at 100%, then Boost shading to red */}
          <View style={styles.demo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.demoTrack}>
              <View style={[styles.demoFill, { width: '66.6%' }]} />
              <LinearGradient colors={[NS.amber, '#F5862E', '#E5402A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.demoBoost} />
            </View>
            <View style={[styles.demoNotch, { left: '66.6%' }]} />
            <View style={[styles.demoThumb, { left: '85%' }]} />
          </View>
          <View style={styles.scale}>
            <Text style={styles.scaleText}>0</Text>
            <Text style={[styles.scaleText, styles.scaleMid]}>100%</Text>
            <Text style={[styles.scaleText, { right: 0, color: '#E5402A' }]}>BOOST</Text>
          </View>
        </ScrollView>
        <Pressable accessibilityRole="button" onPressIn={press} onPress={onShowMe} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}>
          <Text style={styles.btnText}>{UPDATE_CARD.action}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPressIn={press} onPress={onClose} style={({ pressed }) => [styles.btn2, pressed && { opacity: 0.6 }]}>
          <Text style={styles.btn2Text}>GOT IT</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', paddingHorizontal: 16 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  card: { flexShrink: 1, maxHeight: '100%', borderRadius: 26, borderWidth: 1, borderColor: NS.edge, backgroundColor: '#15110D', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 14, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 30 },
  close: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', zIndex: 2 },
  closeText: { fontSize: 22, color: NS.inkMute },
  kicker: { fontFamily: NS.font.semibold, fontSize: 15, letterSpacing: 3, color: NS.inkMute, textAlign: 'center' },
  title: { marginTop: 8, fontFamily: NS.font.semibold, fontSize: 28, letterSpacing: 0, color: NS.amberHi, textAlign: 'center' },
  body: { marginTop: 8, fontFamily: NS.font.regular, fontSize: 19, lineHeight: 25, color: NS.inkMute, textAlign: 'center' },
  demo: { marginTop: 24, height: 30, justifyContent: 'center', marginHorizontal: 6 },
  demoTrack: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  demoFill: { backgroundColor: NS.amber },
  demoBoost: { flex: 1 },
  demoNotch: { position: 'absolute', width: 2, height: 24, marginLeft: -1, borderRadius: 1, backgroundColor: NS.ink, opacity: 0.85 },
  demoThumb: { position: 'absolute', width: 28, height: 28, marginLeft: -14, borderRadius: 14, backgroundColor: '#FFD9A8', shadowColor: '#F06428', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  scale: { marginTop: 6, height: 20, marginHorizontal: 2 },
  scaleText: { position: 'absolute', fontFamily: NS.font.medium, fontSize: 15, color: NS.inkMute },
  scaleMid: { left: '66.6%', width: 50, marginLeft: -25, textAlign: 'center' },
  btn: { marginTop: 18, height: 60, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(240,162,60,0.7)', backgroundColor: 'rgba(240,162,60,0.14)', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: NS.font.semibold, fontSize: 22, letterSpacing: 4, color: NS.amberHi },
  btn2: { marginTop: 4, height: 52, alignItems: 'center', justifyContent: 'center' },
  btn2Text: { fontFamily: NS.font.semibold, fontSize: 19, letterSpacing: 3, color: NS.inkMute },
});

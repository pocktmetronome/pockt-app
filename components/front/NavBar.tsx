/**
 * The face selector: six real keys in a machined bay along the bottom of the faceplate (keys, copper
 * glyphs and LED slots are in the art). The selected face's key lights its LED and its glyph from
 * inside; pressing a key drops it into the bay.
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { FrontFrame } from '@/lib/front-geometry';
import { NS9 } from '@/lib/ns9-layout';

export type FaceId = 'dial' | 'rhythm' | 'pulse' | 'pendulum' | 'pro' | 'beatline';
export const FACE_ORDER: FaceId[] = ['dial', 'rhythm', 'pulse', 'pendulum', 'pro', 'beatline'];
const LABELS: Record<FaceId, string> = { dial: 'Dial', rhythm: 'Rhythm', pulse: 'Pulse', pendulum: 'Pendulum', pro: 'Pro', beatline: 'Beatline' };

const GLYPHS = [
  require('../../assets/north-star-face/v9/nav/navi-0.png'),
  require('../../assets/north-star-face/v9/nav/navi-1.png'),
  require('../../assets/north-star-face/v9/nav/navi-2.png'),
  require('../../assets/north-star-face/v9/nav/navi-3.png'),
  require('../../assets/north-star-face/v9/nav/navi-4.png'),
  require('../../assets/north-star-face/v9/nav/navi-5.png'),
];
const NB = NS9.navbay;

function Slot({ frame, index, selected, live, onPress }: { frame: FrontFrame; index: number; selected: boolean; live: boolean; onPress: () => void }) {
  const on = useSharedValue(selected ? 1 : 0);
  const down = useSharedValue(0);
  const firedIn = useRef(false);
  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, on]);
  const [cx0, cy0, cw, ch] = NB.caps[index] as unknown as number[];
  const r = frame.rect({ x: cx0, y: cy0, w: cw, h: ch });
  const gw = NB.glyph.w * NB.glyph.scale, gh = NB.glyph.h * NB.glyph.scale;
  const g = frame.rect({ x: cx0 + (cw - gw) / 2, y: cy0 + (ch - gh) / 2 + NB.glyph.dy, w: gw, h: gh });
  const led = frame.rect({ x: cx0 + NB.led.x, y: cy0 + NB.led.y, w: NB.led.w, h: NB.led.h });
  const litStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const downStyle = useAnimatedStyle(() => ({ opacity: down.value }));
  const travel = useAnimatedStyle(() => ({ transform: [{ translateY: down.value * 1.6 }] }));
  const id = FACE_ORDER[index];
  const rad = r.w * 0.16;
  const slopX = Math.max(3, frame.s * ((NB.caps[1]?.[0] ?? 0) - (NB.caps[0]?.[0] ?? 0) - cw) / 2);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={live ? `${LABELS[id]} face` : `${LABELS[id]}, coming soon`}
      accessibilityState={{ selected, disabled: !live }}
      disabled={!live}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 40 });
        void Haptics.impactAsync(selected ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Rigid).catch(() => undefined);
        // a hardware key acts as it goes down, not when the finger lifts
        if (!selected) { firedIn.current = true; onPress(); }
      }}
      onPress={() => {
        if (firedIn.current) { firedIn.current = false; return; }
        onPress();
      }}
      onPressOut={() => {
        down.value = withTiming(0, { duration: 120 });
      }}
      // the whole bay is live: the gaps between keys and a band above and below belong to the nearest key
      hitSlop={{ left: slopX, right: slopX, top: 14, bottom: 18 }}
      style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
      {/* pressed: the key drops into the bay */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: rad, backgroundColor: 'rgba(0,0,0,0.32)' }, downStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, travel]}>
        {/* the LED slot lights, the glyph lights from inside */}
        <Animated.View style={[StyleSheet.absoluteFill, litStyle]}>
          {/* the selected key glows from inside its cap, so the chosen face reads at a glance */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.lit, { borderRadius: rad }]} />
          <Image source={GLYPHS[index]} style={{ position: 'absolute', left: g.x - r.x, top: g.y - r.y, width: g.w, height: g.h, tintColor: '#FF9A2E', opacity: 0.85 }} blurRadius={4} />
          <Image source={GLYPHS[index]} style={{ position: 'absolute', left: g.x - r.x, top: g.y - r.y, width: g.w, height: g.h, tintColor: '#FFE6B8' }} />
          <Animated.View style={[styles.led, { left: led.x - r.x, top: led.y - r.y, width: led.w, height: led.h, borderRadius: led.h / 2 }]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function NavBar({ frame, face, live, onFace }: { frame: FrontFrame; face: FaceId; live: FaceId[]; onFace: (f: FaceId) => void }) {
  return (
    <>
      {FACE_ORDER.map((id, i) => (
        <Slot key={id} frame={frame} index={i} selected={face === id} live={live.includes(id)} onPress={() => onFace(id)} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  lit: {
    backgroundColor: 'rgba(255,150,50,0.11)',
    borderWidth: 1.2,
    borderColor: 'rgba(255,190,110,0.5)',
    shadowColor: '#FF8A1E',
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  led: {
    position: 'absolute',
    backgroundColor: '#FFC46A',
    shadowColor: '#FF8A1E',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});

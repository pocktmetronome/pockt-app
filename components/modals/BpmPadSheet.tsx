import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSkin } from '@/components/skins/SkinContext';
import { NS } from '@/constants/skins';
import { DEFAULT_BPM, MAX_BPM, MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { hapticConfirm, hapticSelection, hapticSoft, hapticTap } from '@/lib/haptics';
import { TapTempo } from '@/lib/tap-tempo';
import { tempoName } from '@/lib/tempo-name';

type Props = {
  visible: boolean;
  bpm: number;
  minBpm?: number;
  maxBpm?: number;
  onChange: (bpm: number) => void;
  onClose: () => void;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const RIPPLE_SLOTS = 8;
const CONTACT = 22;
const RIPPLE = 52;
const PARTICLE = 5;
const PARTICLE_DIRS = [
  [1, 0],
  [0.72, 0.72],
  [0, 1],
  [-0.72, 0.72],
  [-1, 0],
  [-0.72, -0.72],
  [0, -1],
  [0.72, -0.72],
] as const;

function useRippleSlot() {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const progress = useSharedValue(1);
  const contact = useSharedValue(1);
  return { x, y, progress, contact };
}

function RippleBurst({
  slot,
}: {
  slot: ReturnType<typeof useRippleSlot>;
}) {
  const contactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(slot.contact.value, [0, 0.08, 1], [0, 1, 0]),
    transform: [
      { translateX: slot.x.value - CONTACT / 2 },
      { translateY: slot.y.value - CONTACT / 2 },
      { scale: interpolate(slot.contact.value, [0, 1], [0.55, 1.35]) },
    ],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(slot.progress.value, [0, 0.08, 0.55, 1], [0, 0.42, 0.12, 0]),
    transform: [
      { translateX: slot.x.value - 70 },
      { translateY: slot.y.value - 70 },
      { scale: interpolate(slot.progress.value, [0, 1], [0.42, 1.18]) },
    ],
  }));

  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(slot.progress.value, [0, 0.12, 1], [0, 0.95, 0]),
    transform: [
      { translateX: slot.x.value - RIPPLE / 2 },
      { translateY: slot.y.value - RIPPLE / 2 },
      { scale: interpolate(slot.progress.value, [0, 1], [0.22, 2.55]) },
    ],
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ripple, ring]} />
      <Animated.View pointerEvents="none" style={[styles.contact, contactStyle]} />
      {PARTICLE_DIRS.map(([dx, dy], index) => (
        <RippleDot key={index} slot={slot} dx={dx} dy={dy} />
      ))}
    </>
  );
}

function RippleDot({
  slot,
  dx,
  dy,
}: {
  slot: ReturnType<typeof useRippleSlot>;
  dx: number;
  dy: number;
}) {
  const style = useAnimatedStyle(() => {
    const travel = interpolate(slot.progress.value, [0, 1], [6, 48]);
    return {
      opacity: interpolate(slot.progress.value, [0, 0.1, 1], [0, 0.95, 0]),
      transform: [
        { translateX: slot.x.value + dx * travel - PARTICLE / 2 },
        { translateY: slot.y.value + dy * travel - PARTICLE / 2 },
        { scale: interpolate(slot.progress.value, [0, 1], [1.15, 0.28]) },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.particle, style]} />;
}

export function BpmPadSheet({ visible, bpm, minBpm = MIN_BPM, maxBpm = MAX_BPM, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useSkin();
  const origin = sanitizeBpm(bpm, DEFAULT_BPM, minBpm, maxBpm);
  const [digits, setDigits] = useState('');
  const [tapped, setTapped] = useState<number | null>(null);
  const [freshStart, setFreshStart] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const submitting = useRef(false);
  const tapper = useRef(new TapTempo());
  const nextSlot = useRef(0);
  const panelW = useSharedValue(1);
  const panelH = useSharedValue(1);
  const panelFlash = useSharedValue(0);
  const slots = [
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
    useRippleSlot(),
  ];
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const preview = tapped ?? (digits.length ? Number.parseInt(digits, 10) : origin);
  const shown = Number.isFinite(preview) ? String(preview) : String(origin);
  const named =
    Number.isFinite(preview) && preview >= minBpm && preview <= maxBpm ? tempoName(preview) : '';

  useEffect(() => {
    if (!visible) {
      submitting.current = false;
      return;
    }
    setDigits('');
    setTapped(null);
    setFreshStart(true);
    setInvalid(false);
    tapper.current.reset();
  }, [visible, bpm]);

  const typeDigit = useCallback((digit: string) => {
    void hapticSoft();
    setInvalid(false);
    setTapped(null);
    tapper.current.reset();
    if (freshStart) {
      setFreshStart(false);
      setDigits(digit);
      return;
    }
    setDigits((prev) => {
      const next = `${prev === '0' ? '' : prev}${digit}`;
      return next.length > 3 ? prev : next;
    });
  }, [freshStart]);

  const backspace = useCallback(() => {
    void hapticSoft();
    setInvalid(false);
    setFreshStart(false);
    setTapped(null);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const applyTap = useCallback((x: number, y: number) => {
    const slot = slotsRef.current[nextSlot.current % RIPPLE_SLOTS];
    nextSlot.current += 1;
    slot.x.value = x;
    slot.y.value = y;
    slot.progress.value = 0;
    slot.contact.value = 0;
    slot.contact.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    slot.progress.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    panelFlash.value = 0;
    panelFlash.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
    void hapticTap();
    const next = tapper.current.tap();
    setFreshStart(false);
    setInvalid(false);
    setDigits('');
    if (next != null) setTapped(next);
  }, [panelFlash]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(800)
        .onEnd((event) => {
          const margin = 10;
          const maxX = Math.max(margin, panelW.value - margin);
          const maxY = Math.max(margin, panelH.value - margin);
          const localX = Math.min(maxX, Math.max(margin, event.x));
          const localY = Math.min(maxY, Math.max(margin, event.y));
          runOnJS(applyTap)(localX, localY);
        }),
    [applyTap, panelH, panelW]
  );

  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(panelFlash.value, [0, 0.12, 1], [0, 0.28, 0]),
  }));

  const commit = useCallback(() => {
    if (submitting.current) return;
    const raw = tapped ?? (digits.length ? Number.parseInt(digits, 10) : origin);
    if (!Number.isFinite(raw) || raw < minBpm || raw > maxBpm) {
      void hapticSelection();
      setInvalid(true);
      return;
    }
    submitting.current = true;
    const next = sanitizeBpm(raw, origin, minBpm, maxBpm);
    void hapticConfirm();
    onChange(next);
    onClose();
  }, [digits, maxBpm, minBpm, onChange, onClose, origin, tapped]);

  const cancel = useCallback(() => {
    void hapticSelection();
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      statusBarTranslucent
      onRequestClose={cancel}>
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.bg,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel tempo entry"
          hitSlop={12}
          onPress={cancel}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={[styles.backArrow, { color: theme.ivory }]}>CLOSE</Text>
        </Pressable>
        <Text style={[styles.kicker, { color: theme.ivoryMute }]}>TEMPO</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.display}>
        <Text style={[styles.entry, { color: theme.ivory }]} numberOfLines={1} allowFontScaling={false}>
          {shown}
        </Text>
        <Text style={[styles.tempo, { color: theme.ivoryDim }]}>{named || 'TEMPO'}</Text>
        <Text style={[styles.warn, { color: invalid ? theme.accent : theme.ivoryMute }]}>
          {invalid ? `Enter ${minBpm}–${maxBpm}` : `NOW ${origin}  ·  ${minBpm}–${maxBpm}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear tempo entry"
          hitSlop={10}
          onPress={() => {
            void hapticSoft();
            setInvalid(false);
            setFreshStart(true);
            setTapped(null);
            setDigits('');
            tapper.current.reset();
          }}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
          <Text style={[styles.clearText, { color: theme.ivoryMute }]}>CLEAR</Text>
        </Pressable>
      </View>

      <View style={styles.pad}>
        {ROWS.map((row) => (
          <View key={row.join('')} style={styles.row}>
            {row.map((key) => (
              <Key
                key={key}
                label={key}
                color={theme.ivory}
                line={theme.line}
                raised={theme.bgRaised}
                onPress={() => typeDigit(key)}
              />
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Key
            label="←"
            accessibilityLabel="Backspace"
            color={theme.ivoryDim}
            line={theme.line}
            raised={theme.bgRaised}
            onPress={backspace}
          />
          <Key
            label="0"
            color={theme.ivory}
            line={theme.line}
            raised={theme.bgRaised}
            onPress={() => typeDigit('0')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set tempo"
            onPress={commit}
            style={({ pressed }) => [styles.key, styles.set, pressed && styles.setPressed]}>
            <View pointerEvents="none" style={styles.setLamp} />
            <Text style={styles.setText}>SET</Text>
          </Pressable>
        </View>
      </View>

      <GestureDetector gesture={tapGesture}>
        <View
          accessibilityRole="button"
          accessibilityLabel="Tap the BPM"
          onLayout={(event) => {
            panelW.value = event.nativeEvent.layout.width;
            panelH.value = event.nativeEvent.layout.height;
          }}
          style={styles.tapPanel}>
          <View pointerEvents="none" style={styles.fxLayer}>
            <Animated.View style={[styles.panelFlash, flashStyle]} />
            {slots.map((slot, index) => (
              <RippleBurst key={index} slot={slot} />
            ))}
          </View>
          <Text style={[styles.tapLabel, { color: theme.ivory }]}>TAP THE BPM</Text>
          <Text style={[styles.tapHint, { color: theme.ivoryMute }]}>Touch anywhere in this panel</Text>
        </View>
      </GestureDetector>
    </View>
    </Modal>
  );
}

function Key({
  label,
  color,
  line,
  raised,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  color: string;
  line: string;
  raised: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
      {({ pressed }) => (
        <>
          <View pointerEvents="none" style={[styles.keyLip, pressed && styles.keyLipPressed]} />
          <Text style={[styles.keyText, { color }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    paddingHorizontal: 22,
  },
  nav: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 14,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 13,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  display: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  entry: {
    fontSize: 76,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  tempo: {
    marginTop: 2,
    fontSize: 16,
    letterSpacing: 2.4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  warn: {
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 2.4,
    fontWeight: '700',
  },
  clear: {
    marginTop: 8,
    minHeight: 32,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  pad: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  // Machined keys: dark graphite cap, champagne edge, a fine top highlight, about 1.5 pt of travel.
  key: {
    flex: 1,
    minHeight: 66,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NS.keyEdge,
    backgroundColor: NS.key,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  keyPressed: {
    backgroundColor: '#17130F',
    borderColor: NS.keyEdgeHi,
    transform: [{ translateY: 1.5 }],
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  keyLip: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 1,
    height: 1,
    backgroundColor: 'rgba(255, 232, 196, 0.16)',
  },
  keyLipPressed: {
    backgroundColor: 'rgba(255, 232, 196, 0.06)',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  set: {
    backgroundColor: '#2A1E10',
    borderColor: 'rgba(240, 162, 60, 0.55)',
  },
  setPressed: {
    backgroundColor: '#3A2812',
    transform: [{ translateY: 1.5 }],
  },
  setLamp: {
    position: 'absolute',
    top: 9,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: NS.amber,
    shadowColor: NS.amber,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  setText: {
    color: NS.amberHi,
    fontSize: 17,
    letterSpacing: 3.4,
    fontWeight: '800',
    marginTop: 4,
  },
  tapPanel: {
    flex: 1,
    marginTop: 14,
    minHeight: 128,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NS.keyEdge,
    backgroundColor: '#15110E',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  panelFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240, 162, 60, 0.16)',
  },
  tapLabel: {
    fontSize: 16,
    letterSpacing: 3.2,
    fontWeight: '800',
    zIndex: 2,
  },
  tapHint: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: '600',
    zIndex: 2,
  },
  contact: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CONTACT,
    height: CONTACT,
    borderRadius: CONTACT / 2,
    backgroundColor: 'rgba(255, 214, 150, 0.96)',
    shadowColor: '#F0A23C',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  wash: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(240, 162, 60, 0.22)',
  },
  ripple: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RIPPLE,
    height: RIPPLE,
    borderRadius: RIPPLE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 200, 120, 0.9)',
    backgroundColor: 'rgba(240, 162, 60, 0.16)',
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PARTICLE,
    height: PARTICLE,
    borderRadius: PARTICLE / 2,
    backgroundColor: 'rgba(255, 220, 160, 0.96)',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }],
  },
});

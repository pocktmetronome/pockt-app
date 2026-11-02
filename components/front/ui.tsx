/**
 * The front page's one control language: graphite surfaces, champagne edges, optical amber.
 * Everything is large enough to read at arm's length on a music stand.
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const NS = {
  bg: '#0E0C0A',
  panel: '#15110E',
  panelHi: '#1F1914',
  key: '#1D1813',
  keyHi: '#29221B',
  ink: '#F2EADC',
  inkDim: '#C2B5A0',
  inkMute: '#BDB29B',
  edge: 'rgba(214, 180, 126, 0.24)',
  edgeHi: 'rgba(244, 196, 126, 0.7)',
  amber: '#F0A23C',
  amberHi: '#FFC66E',
  glass: '#F7C98A',
  font: {
    light: 'Barlow_300Light',
    regular: 'Barlow_400Regular',
    medium: 'Barlow_500Medium',
    semibold: 'Barlow_600SemiBold',
    bold: 'Barlow_700Bold',
  },
} as const;

export const FONTS = {
  Barlow_300Light: require('../../assets/fonts/Barlow_300Light.ttf'),
  Barlow_400Regular: require('../../assets/fonts/Barlow_400Regular.ttf'),
  Barlow_500Medium: require('../../assets/fonts/Barlow_500Medium.ttf'),
  Barlow_600SemiBold: require('../../assets/fonts/Barlow_600SemiBold.ttf'),
  Barlow_700Bold: require('../../assets/fonts/Barlow_700Bold.ttf'),
};

export const tick = () => void Haptics.selectionAsync().catch(() => undefined);
export const press = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => undefined);

/** Bottom sheet: springs up, drags down to close, dims the instrument behind it. */
export function Sheet({
  open,
  onClose,
  title,
  value,
  children,
  footer,
  height = 1,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  value?: string;
  children: ReactNode;
  footer?: ReactNode;
  height?: number;
}) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Full screen: the sheet owns the whole display, its header sits below the status bar.
  const h = Math.round(screenH * height);
  const y = useSharedValue(h);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (open) {
      shown.value = withTiming(1, { duration: 180 });
      y.value = withSpring(0, { damping: 26, stiffness: 300, mass: 0.9 });
    } else {
      shown.value = withTiming(0, { duration: 160 });
      y.value = withTiming(h, { duration: 220, easing: Easing.in(Easing.cubic) });
    }
  }, [open, h, y, shown]);
  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > h * 0.22 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 26, stiffness: 300 });
    });
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (open) setScrollY(0);
  }, [open]);
  const more = contentH > viewH + 24 && scrollY + viewH < contentH - 40;
  const backStyle = useAnimatedStyle(() => ({ opacity: shown.value * interpolate(y.value, [0, h], [1, 0]) }));
  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backStyle]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: h }, panelStyle]}>
        <LinearGradient colors={[NS.panelHi, NS.panel, '#0D0A08']} locations={[0, 0.18, 1]} style={StyleSheet.absoluteFill} />
        <GestureDetector gesture={drag}>
          <View style={[styles.head, height >= 1 && { paddingTop: insets.top + 6 }]}>
            <View style={styles.grip} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
            </View>
          </View>
        </GestureDetector>
        <View style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator
            indicatorStyle="white"
            scrollEventThrottle={32}
            onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, ch) => setContentH(ch)}
            onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}>
            {children}
          </ScrollView>
          {/* there is more below: the list fades softly into the panel (the scroll bar says the rest) */}
          {more ? (
            <View pointerEvents="none" style={styles.moreWrap}>
              <LinearGradient colors={['rgba(13,10,8,0)', 'rgba(13,10,8,0.85)']} style={StyleSheet.absoluteFill} />
            </View>
          ) : null}
        </View>
        <View style={[styles.foot, { paddingBottom: Math.max(16, insets.bottom + 6) }]}>
          {/* a row, so a footer key (flex: 1) fills the width and keeps its full height */}
          <View style={{ flexDirection: 'row', minHeight: 64 }}>{footer ?? <Done onPress={onClose} />}</View>
        </View>
      </Animated.View>
    </View>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A machined key: seats 2 pt on press, lights its LED when selected. */
export function Key({
  label,
  caption,
  selected,
  onPress,
  style,
  big,
  tone,
  accessibilityLabel,
  onLongPress,
  children,
}: {
  onLongPress?: () => void;
  label?: string;
  caption?: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  big?: boolean;
  tone?: 'amber';
  accessibilityLabel?: string;
  children?: ReactNode;
}) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({
    transform: [{ translateY: p.value * 2 }, { scale: 1 - p.value * 0.02 }],
    opacity: 1 - p.value * 0.18,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [label, caption].filter(Boolean).join(', ')}
      accessibilityState={{ selected: !!selected }}
      onPressIn={() => {
        p.value = withTiming(1, { duration: 30 });
        press();
      }}
      onPressOut={() => {
        p.value = withSpring(0, { damping: 9, stiffness: 420 });
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      style={[styles.keyWrap, style]}>
      <Animated.View style={[styles.key, big && styles.keyBig, selected && styles.keyOn, tone === 'amber' && styles.keyAmber, a]}>
        <View style={styles.keyLip} />
        {selected ? <View style={styles.led} /> : <View style={styles.ledOff} />}
        {children}
        {label ? (
          <Text style={[styles.keyText, big && styles.keyTextBig, selected && styles.keyTextOn, tone === 'amber' && styles.keyTextAmber]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {label}
          </Text>
        ) : null}
        {caption ? <Text style={[styles.keyCaption, selected && styles.keyCaptionOn]} numberOfLines={1}>{caption}</Text> : null}
      </Animated.View>
    </Pressable>
  );
}

/** Segmented selector with a sliding amber-lit thumb. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pos = useSharedValue(index);
  const w = useSharedValue(0);
  useEffect(() => {
    pos.value = withSpring(index, { damping: 20, stiffness: 320 });
  }, [index, pos]);
  const thumb = useAnimatedStyle(() => ({ width: w.value / options.length - 6, transform: [{ translateX: 3 + pos.value * (w.value / options.length) }] }));
  return (
    <View style={styles.seg} onLayout={(e) => (w.value = e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.segThumb, thumb]} />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPressIn={tick}
            onPress={() => onChange(o.value)}
            style={styles.segItem}>
            <Text style={[styles.segText, on && styles.segTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ label, detail, children, stacked }: { label: string; detail?: string; children: ReactNode; stacked?: boolean }) {
  // a wide control (four choices) or a long explanation gets its own line under the words, full width
  if (stacked) {
    return (
      <View style={styles.rowStacked}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
        <View style={{ marginTop: 10 }}>{children}</View>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <View style={{ width: '44%', maxWidth: 170 }}>{children}</View>
    </View>
  );
}

export function Done({ onPress, label = 'Done' }: { onPress: () => void; label?: string }) {
  return <Key label={label} onPress={onPress} big tone="amber" style={{ flex: 1 }} />;
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: NS.edge,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -10 },
  },
  head: { paddingTop: 10, paddingBottom: 6, paddingHorizontal: 22 },
  grip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(214,180,126,0.35)', marginBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: NS.font.semibold, fontSize: 26, color: NS.ink, letterSpacing: 0.3 },
  value: { flexShrink: 1, fontFamily: NS.font.medium, fontSize: 20, color: NS.amberHi, textShadowColor: 'rgba(255,150,50,0.5)', textShadowRadius: 8 },
  body: { paddingHorizontal: 18, paddingBottom: 96 },
  moreWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  moreText: { fontFamily: NS.font.semibold, fontSize: 15, letterSpacing: 2.6, color: NS.amberHi, opacity: 0.85 },
  foot: { paddingHorizontal: 18, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: NS.edge },
  section: { marginTop: 22 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { flexShrink: 0, fontFamily: NS.font.semibold, fontSize: 17, letterSpacing: 2.2, color: NS.inkMute, textTransform: 'uppercase' },
  sectionHint: { flexShrink: 1, marginLeft: 12, textAlign: 'right', fontFamily: NS.font.medium, fontSize: 17, color: NS.inkMute },
  keyWrap: { flex: 1 },
  key: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NS.edge,
    backgroundColor: NS.key,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  keyBig: { minHeight: 64 },
  keyOn: { borderColor: NS.edgeHi, backgroundColor: '#2A1E12' },
  keyAmber: { borderColor: 'rgba(240,162,60,0.7)', backgroundColor: '#2C1F10' },
  keyLip: { position: 'absolute', left: 12, right: 12, top: 1, height: 1, backgroundColor: 'rgba(255,232,196,0.16)' },
  led: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: NS.amberHi, shadowColor: NS.amber, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  ledOff: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2C2117' },
  keyText: { fontFamily: NS.font.medium, fontSize: 20, color: NS.inkDim },
  keyTextBig: { fontSize: 22 },
  keyTextOn: { color: NS.ink },
  keyTextAmber: { fontFamily: NS.font.bold, color: NS.amberHi, letterSpacing: 3, textTransform: 'uppercase', fontSize: 18 },
  keyCaption: { marginTop: 2, fontFamily: NS.font.medium, fontSize: 17, color: NS.inkMute },
  keyCaptionOn: { color: NS.amberHi },
  seg: { flexDirection: 'row', height: 54, borderRadius: 14, borderWidth: 1, borderColor: NS.edge, backgroundColor: '#100D0B', overflow: 'hidden' },
  segThumb: { position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 11, backgroundColor: '#2C1F12', borderWidth: 1, borderColor: NS.edgeHi },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segText: { fontFamily: NS.font.medium, fontSize: 17, color: NS.inkMute },
  segTextOn: { color: NS.amberHi },
  rowStacked: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(214,180,126,0.14)' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(214,180,126,0.14)' },
  rowLabel: { fontFamily: NS.font.semibold, fontSize: 18, color: NS.ink },
  rowDetail: { marginTop: 3, fontFamily: NS.font.regular, fontSize: 17, color: NS.inkMute },
});

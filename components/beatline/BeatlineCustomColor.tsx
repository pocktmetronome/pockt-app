import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { BeatlineHeader, MetalRoundButton } from '@/components/beatline/BeatlineChrome';
import { BeatlineSlider } from '@/components/beatline/BeatlineSlider';
import { P2 } from '@/constants/pockt-2';
import { hexToHsv, hsvToHex, withAlpha, type BeatlineColorTarget } from '@/lib/beatline-2';

type Props = {
  target: BeatlineColorTarget;
  draft: string;
  onDraft: (color: string) => void;
  onApply: () => void;
  onBack: () => void;
};

export function BeatlineCustomColor({ target, draft, onDraft, onApply, onBack }: Props) {
  const seed = useMemo(() => hexToHsv(draft), [draft]);
  const [hue, setHue] = useState(seed.h);
  const [brightness, setBrightness] = useState(seed.v);
  const [span, setSpan] = useState(240);
  const live = hsvToHex(hue, 1, brightness);

  const applyHue = useCallback(
    (next: number) => {
      const h = ((next % 360) + 360) % 360;
      setHue(h);
      onDraft(hsvToHex(h, 1, brightness));
    },
    [brightness, onDraft]
  );

  const applyBright = useCallback(
    (next: number) => {
      setBrightness(next);
      onDraft(hsvToHex(hue, 1, next));
    },
    [hue, onDraft]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onUpdate((event) => {
          const next = (event.x / Math.max(1, span)) * 360;
          runOnJS(applyHue)(next);
        }),
    [applyHue, span]
  );

  return (
    <View style={styles.root}>
      <BeatlineHeader title="CUSTOM COLOR" subtitle={target === 'downbeat' ? 'Downbeat' : 'Accent'} onBack={onBack} />
      <View style={styles.orbWrap} pointerEvents="none">
        <View style={[styles.orbGlow, { backgroundColor: withAlpha(live, 0.2) }]} />
        <View style={[styles.orb, { backgroundColor: live, shadowColor: live }]} />
      </View>

      <View style={styles.spectrumRow}>
        <GestureDetector gesture={gesture}>
          <View style={styles.spectrum} onLayout={(event) => setSpan(event.nativeEvent.layout.width)}>
            <LinearGradient
              colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.rainbow}
            />
            <View style={[styles.puck, { left: (hue / 360) * Math.max(0, span - 22) }]}>
              <View style={styles.puckDot} />
            </View>
          </View>
        </GestureDetector>
        <View pointerEvents="none" style={[styles.readout, { backgroundColor: live }]} />
      </View>

      <View style={styles.bright}>
        <BeatlineSlider value={brightness} onChange={applyBright} accessibilityLabel="Brightness" />
      </View>

      <View style={styles.apply}>
        <MetalRoundButton accessibilityLabel="Apply custom color" onPress={onApply} size={72} glow>
          <Text style={styles.applyText}>APPLY</Text>
        </MetalRoundButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  orbWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  orbGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  orb: {
    width: 118,
    height: 118,
    borderRadius: 59,
    shadowOpacity: 0.6,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  spectrumRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  spectrum: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: '#1C2026',
    overflow: 'visible',
  },
  rainbow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  puck: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2A2E34',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puckDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P2.signal,
  },
  readout: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.3)',
  },
  bright: {
    width: '100%',
    marginTop: 22,
  },
  apply: {
    marginTop: 'auto',
    paddingBottom: 24,
  },
  applyText: {
    color: P2.signal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalPill, MetalRoundButton } from '@/components/beatline/BeatlineChrome';
import { P2 } from '@/constants/pockt-2';
import { BEATLINE_SWATCHES, withAlpha, type BeatlineColorTarget } from '@/lib/beatline-2';

type Props = {
  target: BeatlineColorTarget;
  draft: string;
  onDraft: (color: string) => void;
  onCustom: () => void;
  onApply: () => void;
  onBack: () => void;
};

export function BeatlineColorPicker({ target, draft, onDraft, onCustom, onApply, onBack }: Props) {
  return (
    <View style={styles.root}>
      <BeatlineHeader title="COLOR" subtitle={target === 'downbeat' ? 'Downbeat' : 'Accent'} onBack={onBack} />
      <View style={styles.orbWrap} pointerEvents="none">
        <View style={[styles.orbGlow, { backgroundColor: withAlpha(draft, 0.22) }]} />
        <View style={[styles.orb, { backgroundColor: draft, shadowColor: draft }]} />
      </View>

      <View style={styles.rail}>
        {BEATLINE_SWATCHES.map((color) => {
          const on = color.toUpperCase() === draft.toUpperCase();
          return (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel={`Color ${color}`}
              onPress={() => onDraft(color)}
              style={[styles.swatch, { backgroundColor: color }, on && styles.swatchOn]}
            />
          );
        })}
      </View>

      <MetalPill label="CUSTOM COLOR" onPress={onCustom} />

      <View style={styles.apply}>
        <MetalRoundButton accessibilityLabel="Apply color" onPress={onApply} size={72} glow>
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
    marginTop: 20,
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
    shadowOpacity: 0.65,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  rail: {
    width: '100%',
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#1C2026',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: P2.signal,
    transform: [{ scale: 1.15 }],
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

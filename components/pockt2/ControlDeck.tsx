import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BpmSlider } from '@/components/controls/BpmSlider';
import { HiddenBpmControl } from '@/components/controls/BpmDisplay';
import { TapTempo } from '@/components/controls/TapTempo';
import { BpmReadout } from '@/components/pockt2/BpmReadout';
import { InstrumentPanel } from '@/components/pockt2/InstrumentPanel';
import { TransportButton } from '@/components/pockt2/TransportButton';
import { ValueCell } from '@/components/pockt2/ValueCell';
import { P2 } from '@/constants/pockt-2';
import type { DisplayPrefs } from '@/constants/display';

type Props = {
  bpm: number;
  playing: boolean;
  prefs: DisplayPrefs;
  invert?: boolean;
  tapFlash: number;
  meter: string;
  subdivision: string;
  sound: string;
  pulse: SharedValue<number>;
  compact?: boolean;
  onOpenPad: () => void;
  onChangeBpm: (bpm: number) => void;
  onToggle: () => void;
  onTap: () => void;
  onOpenMeter: () => void;
  onOpenSubdivision: () => void;
  onOpenSound: () => void;
};

export function ControlDeck({
  bpm,
  playing,
  prefs,
  invert,
  tapFlash,
  meter,
  subdivision,
  sound,
  pulse,
  compact = false,
  onOpenPad,
  onChangeBpm,
  onToggle,
  onTap,
  onOpenMeter,
  onOpenSubdivision,
  onOpenSound,
}: Props) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(!compact);
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <InstrumentPanel>
        <View style={styles.top}>
          {prefs.bpmVisible ? (
            <BpmReadout bpm={bpm} playing={playing} prefs={prefs} onPress={onOpenPad} compact />
          ) : (
            <HiddenBpmControl bpm={bpm} onPress={onOpenPad} prominent />
          )}
          <TransportButton playing={playing} onPress={onToggle} pulse={pulse} />
        </View>
        {compact ? (
          <Pressable
            onPress={() => setExpanded((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Hide controls' : 'Show tempo and meter controls'}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Text style={styles.moreText}>{expanded ? 'Hide controls' : 'Controls'}</Text>
          </Pressable>
        ) : null}
        {!compact || expanded ? (
          <>
            <View style={styles.slider}>
              <BpmSlider bpm={bpm} invert={invert} onChange={onChangeBpm} />
              <TapTempo flash={tapFlash} onPress={onTap} size="compact" />
            </View>
            <View style={styles.cells}>
              <ValueCell label="Meter" value={meter} onPress={onOpenMeter} />
              <View style={styles.rule} />
              <ValueCell label="Subdivision" value={subdivision} onPress={onOpenSubdivision} />
              <View style={styles.rule} />
              <ValueCell label="Sound" value={sound} onPress={onOpenSound} />
            </View>
          </>
        ) : null}
      </InstrumentPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  more: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  moreText: {
    color: P2.inkMute,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  slider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  cells: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: P2.hairline,
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: P2.hairline,
    marginVertical: 10,
  },
  pressed: {
    opacity: 0.82,
  },
});

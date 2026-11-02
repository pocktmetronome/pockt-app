import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BeatlineHeader, MetalPill } from '@/components/beatline/BeatlineChrome';
import { BeatlineSlider } from '@/components/beatline/BeatlineSlider';
import { BeatlineSoundKnob } from '@/components/beatline/BeatlineSoundKnob';
import { P2 } from '@/constants/pockt-2';
import { beatlineSoundCatalog, nearbySounds, soundTitle, stepSound } from '@/lib/beatline-2';
import { reviveUiDetent } from '@/lib/rotary-feedback';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import type { MetronomeConfig, SoundId } from '@/lib/types';

type Props = {
  config: MetronomeConfig;
  onSelect: (id: SoundId) => void;
  onVolume: (volume: number) => void;
  onBrowse: () => void;
  onFavorites: () => void;
  onRecent: () => void;
  onBack: () => void;
};

export function BeatlineSoundQuick({
  config,
  onSelect,
  onVolume,
  onBrowse,
  onFavorites,
  onRecent,
  onBack,
}: Props) {
  useEffect(() => {
    reviveUiDetent();
  }, []);
  const catalog = beatlineSoundCatalog();
  const current = config.sound;
  const index = Math.max(0, catalog.indexOf(current));
  const nearby = nearbySounds(current, catalog);
  const sensory = sensoryFlags(config.sensoryMode);

  return (
    <View style={styles.root}>
      <BeatlineHeader title="SOUND" onBack={onBack} />

      <View style={styles.module}>
        <Text style={styles.name} numberOfLines={2}>
          {soundTitle(current)}
        </Text>
        <BeatlineSoundKnob
          index={index}
          count={catalog.length}
          size={96}
          onStep={(delta) => onSelect(stepSound(current, delta, catalog))}
          audioDetent={sensory.audio}
          hapticDetent={effectiveHaptic(config)}
        />
      </View>

      <View style={styles.strip}>
        {nearby.map((id, slot) => {
          const on = id === current && slot === 1;
          return (
            <View key={`${id}-${slot}`} style={styles.stripItem}>
              {on ? <View style={styles.stripDot} /> : <View style={styles.stripDotOff} />}
              <Text style={[styles.stripText, on && styles.stripTextOn]} numberOfLines={1}>
                {soundTitle(id)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <MetalPill label="BROWSE ALL SOUNDS" onPress={onBrowse} />
        <View style={styles.row}>
          <MetalPill label="FAVORITES" onPress={onFavorites} compact />
          <MetalPill label="RECENTLY USED" onPress={onRecent} compact />
        </View>
      </View>

      <View style={styles.volume}>
        <BeatlineSlider value={config.volume} onChange={onVolume} accessibilityLabel="Metronome volume" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  module: {
    marginTop: 12,
    minHeight: 148,
    borderRadius: 22,
    backgroundColor: '#1C2026',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.16)',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    color: P2.metalHi,
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: 1.2,
    marginRight: 16,
  },
  strip: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stripDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P2.signal,
  },
  stripDotOff: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  stripText: {
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stripTextOn: {
    color: P2.ink,
  },
  actions: {
    marginTop: 28,
    alignItems: 'center',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  volume: {
    marginTop: 'auto',
    paddingBottom: 18,
  },
});

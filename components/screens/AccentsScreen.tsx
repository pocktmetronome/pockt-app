import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACCENT_SWATCHES, type AccentSwatch } from '@/constants/display';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import type { AccentLevel, MetronomeConfig, SoundId, TimeSignatureId } from '@/lib/types';

const LEVELS: { id: 1 | 2 | 3; accent: AccentLevel; label: string; height: number }[] = [
  { id: 1, accent: 'soft', label: 'LEVEL 1', height: 10 },
  { id: 2, accent: 'normal', label: 'LEVEL 2', height: 26 },
  { id: 3, accent: 'strong', label: 'LEVEL 3', height: 42 },
];

type ColorRole = 'normal' | 'secondary' | 'strong';

type Props = {
  visible: boolean;
  timeSignature: TimeSignatureId;
  pattern: AccentLevel[];
  config: Pick<MetronomeConfig, 'sound' | 'volume' | 'haptic' | 'flashOnBeat' | 'flashScreenOnBeat' | 'soundDownbeat' | 'soundBeat'>;
  accentColor?: AccentSwatch;
  accentSecondaryColor?: AccentSwatch;
  accentStrongColor?: AccentSwatch;
  onChange: (pattern: AccentLevel[]) => void;
  onChangeConfig: (patch: Partial<MetronomeConfig>) => void;
  onChangeAccentColor?: (color: AccentSwatch) => void;
  onChangeAccentSecondary?: (color: AccentSwatch) => void;
  onChangeAccentStrong?: (color: AccentSwatch) => void;
  onPreview: (sound: SoundId) => void;
  onClose: () => void;
};

export function AccentsScreen({
  visible,
  timeSignature: _timeSignature,
  pattern: _pattern,
  config,
  accentColor = '#F4F6FA',
  accentSecondaryColor = '#F4F6FA',
  accentStrongColor = '#F4F6FA',
  onChange: _onChange,
  onChangeConfig: _onChangeConfig,
  onChangeAccentColor,
  onChangeAccentSecondary,
  onChangeAccentStrong,
  onPreview,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const [colorRole, setColorRole] = useState<ColorRole>('secondary');

  const colorFor = (role: ColorRole) =>
    role === 'secondary' ? accentSecondaryColor : role === 'strong' ? accentStrongColor : accentColor;

  const applyColor = (swatch: AccentSwatch) => {
    try {
      if (colorRole === 'secondary') onChangeAccentSecondary?.(swatch);
      else if (colorRole === 'strong') onChangeAccentStrong?.(swatch);
      else onChangeAccentColor?.(swatch);
    } catch {
      /* color apply must never crash Accents */
    }
  };

  const demoSound = (): SoundId => {
    try {
      if (colorRole === 'strong') return (config.soundDownbeat as SoundId | null) ?? config.sound;
      if (colorRole === 'normal') return (config.soundBeat as SoundId | null) ?? config.sound;
      return config.sound;
    } catch {
      return config.sound;
    }
  };

  const roleLabel = colorRole === 'strong' ? 'Downbeat' : colorRole === 'secondary' ? 'Medium' : 'Soft';

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.top}>
          <Text style={styles.title}>Accents</Text>
          <Pressable
            onPress={() => {
              void hapticSelection();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close accents"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.levels}>
            {LEVELS.map((level) => {
              const role: ColorRole = level.id === 1 ? 'normal' : level.id === 2 ? 'secondary' : 'strong';
              const selected = colorRole === role;
              const color = colorFor(role);
              return (
                <Pressable
                  key={level.id}
                  onPress={() => {
                    void hapticSelection();
                    setColorRole(role);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${level.label}. Edit color.`}
                  style={({ pressed }) => [styles.levelCard, selected && styles.levelCardOn, pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.levelPill,
                      {
                        height: level.height,
                        width: selected ? 22 : 18,
                        backgroundColor: color,
                      },
                    ]}
                  />
                  {selected ? (
                    <Pressable
                      onPress={() => {
                        try {
                          void hapticTap();
                          onPreview(demoSound());
                        } catch {
                          /* preview must never crash Accents */
                        }
                      }}
                      style={styles.demo}
                      accessibilityRole="button"
                      accessibilityLabel={`Demo ${level.label}`}>
                      <Text style={styles.demoText}>Demo</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.heading}>{roleLabel}</Text>
          <View style={styles.colorRow}>
            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.swatches}>
              {ACCENT_SWATCHES.map((swatch) => {
                const current = colorFor(colorRole);
                return (
                  <Pressable
                    key={swatch}
                    onPress={() => {
                      void hapticSelection();
                      applyColor(swatch);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${roleLabel} color`}
                    style={[styles.swatch, { backgroundColor: swatch }, swatch === current && styles.swatchOn]}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.soundBox}>
            <Text style={styles.soundKicker}>SOUND SETTINGS</Text>
            <Text style={styles.soundHint}>
              Level color is edited here. Sounds are chosen in Sound Studio so every room stays on one browser.
            </Text>
            <Text style={styles.soundHint}>State 0 stays silent and is not a color category.</Text>
          </View>
        </ScrollView>

        <Pressable
          onPress={() => {
            void hapticSelection();
            onClose();
          }}
          style={({ pressed }) => [styles.apply, pressed && styles.pressed]}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08090C',
    paddingHorizontal: 20,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#F4F6FA',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(244,246,250,0.72)',
    fontSize: 20,
    fontWeight: '500',
  },
  scroll: {
    paddingBottom: 20,
  },
  levels: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 140,
  },
  levelCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(244,246,250,0.1)',
    backgroundColor: 'rgba(16,18,22,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  levelCardOn: {
    minHeight: 132,
    borderColor: 'rgba(244,246,250,0.42)',
    backgroundColor: 'rgba(28,30,36,0.96)',
    transform: [{ scale: 1.06 }],
  },
  levelPill: {
    width: 18,
    borderRadius: 999,
  },
  demo: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(244,246,250,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoText: {
    color: 'rgba(244,246,250,0.78)',
    fontSize: 11,
    fontWeight: '700',
  },
  heading: {
    marginTop: 28,
    color: '#F4F6FA',
    fontSize: 22,
    fontWeight: '700',
  },
  colorRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorLabel: {
    color: 'rgba(220,228,236,0.62)',
    fontSize: 15,
    fontWeight: '600',
  },
  swatches: {
    flexDirection: 'row',
    gap: 10,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: '#F4F6FA',
  },
  soundBox: {
    marginTop: 28,
    borderRadius: 22,
    backgroundColor: 'rgba(16,18,22,0.94)',
    padding: 18,
    gap: 8,
  },
  soundKicker: {
    color: 'rgba(220,228,236,0.42)',
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  soundHint: {
    color: 'rgba(220,228,236,0.55)',
    fontSize: 13,
    lineHeight: 18,
  },
  apply: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyText: {
    color: '#08090C',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
  },
});


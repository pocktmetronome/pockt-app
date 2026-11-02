import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import { hapticSelection, hapticSoft } from '@/lib/haptics';
import type { AccentSwatch, DisplayPrefs } from '@/constants/display';
import { defaultPresetName, presetPrefsPatch, presetToPatch, snapshotPreset, type ClassicPreset } from '@/lib/presets';
import { matchesQuery } from '@/lib/setlists';
import type { MetronomeConfig } from '@/lib/types';
import { loadPresets, savePresets } from '@/storage/presets';

type Props = {
  visible: boolean;
  config: MetronomeConfig;
  accentColor: AccentSwatch;
  onLoad: (patch: Partial<MetronomeConfig>, prefs?: Partial<DisplayPrefs>) => void;
  onClose: () => void;
};

export function PresetsScreen({ visible, config, accentColor, onLoad, onClose }: Props) {
  const [presets, setPresets] = useState<ClassicPreset[]>([]);
  const [name, setName] = useState(defaultPresetName(config));
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => presets.filter((preset) => matchesQuery(`${preset.name} ${preset.bpm} ${preset.timeSignature}`, query)),
    [presets, query]
  );

  useEffect(() => {
    if (!visible) return;
    setName(defaultPresetName(config));
    void loadPresets().then(setPresets);
  }, [config, visible]);

  const persist = useCallback(async (next: ClassicPreset[]) => {
    setPresets(next);
    await savePresets(next);
  }, []);

  return (
    <UtilityShell
      visible={visible}
      title="PRESETS"
      lede="Save this setup. Search, overwrite, duplicate, or delete. Tempo, meter, accents, and sound stay together."
      onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search presets"
        placeholderTextColor={Studio.ivoryMute}
        style={styles.input}
      />
      <View style={styles.saveRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name this preset"
          placeholderTextColor={Studio.ivoryMute}
          style={[styles.input, styles.flex]}
          maxLength={32}
        />
        <Pressable
          onPress={() => {
            void hapticSoft();
            const next = [snapshotPreset(name, config, accentColor), ...presets].slice(0, 80);
            void persist(next);
            setName(defaultPresetName(config));
          }}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
          <Text style={styles.saveText}>SAVE</Text>
        </Pressable>
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.empty}>{presets.length ? 'No matches.' : 'No saved presets yet.'}</Text>
      ) : (
        filtered.map((preset) => (
          <Pressable
            key={preset.id}
            onPress={() => {
              void hapticSelection();
              onLoad(presetToPatch(preset), presetPrefsPatch(preset));
              onClose();
            }}
            onLongPress={() => {
              Alert.alert(preset.name, undefined, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Overwrite',
                  onPress: () => {
                    const next = presets.map((item) =>
                      item.id === preset.id ? { ...snapshotPreset(preset.name, config, accentColor), id: preset.id } : item
                    );
                    void persist(next);
                  },
                },
                {
                  text: 'Duplicate',
                  onPress: () => {
                    const copy = { ...preset, id: `preset-${Date.now()}`, name: `${preset.name} copy` };
                    void persist([copy, ...presets]);
                  },
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => void persist(presets.filter((item) => item.id !== preset.id)),
                },
              ]);
            }}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <Text style={styles.cardName}>{preset.name}</Text>
            <Text style={styles.cardMeta}>
              {preset.bpm}  ·  {preset.timeSignature}  ·  {preset.subdivision}
            </Text>
          </Pressable>
        ))
      )}
    </UtilityShell>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    color: Studio.ivory,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  flex: {
    flex: 1,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  save: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Studio.ivory,
    marginBottom: 10,
  },
  saveText: {
    color: Studio.ivory,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  empty: {
    color: Studio.ivoryDim,
    marginTop: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    padding: 14,
    marginBottom: 8,
  },
  cardName: {
    color: Studio.ivory,
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: Studio.ivoryDim,
  },
  pressed: {
    opacity: 0.8,
  },
});

import { useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { roomLabel, ROOM_ORDER } from '@/constants/rooms';
import { Studio } from '@/constants/colors';
import { makeBackup } from '@/lib/backup';
import { hapticSelection } from '@/lib/haptics';
import { isFavorite, rememberRecent, toggleFavorite, type LibraryState } from '@/lib/library';
import { sanitizePractice } from '@/lib/practice';
import { loadPracticePresets } from '@/storage/practice-presets';
import { loadPracticeConfig } from '@/storage/practice';
import { loadPresets } from '@/storage/presets';
import { loadSetlists, loadSongs } from '@/storage/setlists';
import type { MetronomeConfig, RoomId } from '@/lib/types';

type Props = {
  visible: boolean;
  library: LibraryState;
  config: MetronomeConfig;
  onLibraryChange: (next: LibraryState) => void;
  onOpenRoom: (id: RoomId) => void;
  onOpenPresets: () => void;
  onOpenSetlists: () => void;
  onOpenPractice: () => void;
  onClose: () => void;
};

export function LibraryScreen({
  visible,
  library,
  config,
  onLibraryChange,
  onOpenRoom,
  onOpenPresets,
  onOpenSetlists,
  onOpenPractice,
  onClose,
}: Props) {
  const [counts, setCounts] = useState({ presets: 0, songs: 0, setlists: 0, practice: 0 });

  useEffect(() => {
    if (!visible) return;
    void Promise.all([loadPresets(), loadSongs(), loadSetlists(), loadPracticePresets()]).then(
      ([presets, songs, setlists, practice]) => {
        setCounts({
          presets: presets.length,
          songs: songs.length,
          setlists: setlists.length,
          practice: practice.length,
        });
      }
    );
  }, [visible]);

  return (
    <UtilityShell
      visible={visible}
      title="LIBRARY"
      lede="Presets, songs, setlists, and starred Pockets. Pocket selection lives in Choose Your Pocket."
      onClose={onClose}>
      <Text style={styles.section}>FAVORITE POCKETS</Text>
      {library.favoriteRooms.length ? (
        library.favoriteRooms.map((id) => (
          <RoomRow
            key={id}
            id={id}
            favorite
            onOpen={() => onOpenRoom(id)}
            onToggle={() => onLibraryChange(toggleFavorite(library, id))}
          />
        ))
      ) : (
        <Text style={styles.empty}>Star a Pocket from Choose Your Pocket.</Text>
      )}

      <Text style={styles.section}>RECENT POCKETS</Text>
      {(library.recentRooms.length ? library.recentRooms : ROOM_ORDER.slice(0, 3)).map((id) => (
        <RoomRow
          key={`recent-${id}`}
          id={id}
          favorite={isFavorite(library, id)}
          onOpen={() => {
            onLibraryChange(rememberRecent(library, id));
            onOpenRoom(id);
          }}
          onToggle={() => onLibraryChange(toggleFavorite(library, id))}
        />
      ))}

      <Text style={styles.section}>SAVED WORK</Text>
      <Row label="PRESETS" value={`${counts.presets}`} onPress={onOpenPresets} />
      <Row label="SONGS & SETLISTS" value={`${counts.songs} · ${counts.setlists}`} onPress={onOpenSetlists} />
      <Row label="PRACTICE SETUPS" value={`${counts.practice}`} onPress={onOpenPractice} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export local library backup"
        onPress={() => {
          void hapticSelection();
          void exportBackup(config, library);
        }}
        style={({ pressed }) => [styles.export, pressed && styles.pressed]}>
        <Text style={styles.exportText}>EXPORT LOCAL BACKUP</Text>
      </Pressable>
      <Text style={styles.note}>
        Backup is a JSON file. Import is not automatic. Nothing is uploaded. iCloud sync is not part of this release.
      </Text>
    </UtilityShell>
  );
}

function RoomRow({
  id,
  favorite,
  onOpen,
  onToggle,
}: {
  id: RoomId;
  favorite: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${roomLabel(id)}`}
        onPress={onOpen}
        style={styles.itemMain}>
        <Text style={styles.itemText}>{roomLabel(id)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Unfavorite ${roomLabel(id)}` : `Favorite ${roomLabel(id)}`}
        onPress={onToggle}
        hitSlop={10}
        style={styles.star}>
        <Text style={styles.starText}>{favorite ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Text style={styles.linkValue}>{value}</Text>
    </Pressable>
  );
}

async function exportBackup(config: MetronomeConfig, library: LibraryState) {
  try {
    const [presets, songs, setlists, practicePresets, practice] = await Promise.all([
      loadPresets(),
      loadSongs(),
      loadSetlists(),
      loadPracticePresets(),
      loadPracticeConfig(),
    ]);
    const backup = makeBackup({
      settings: config,
      library,
      practice: sanitizePractice(practice),
      practicePresets,
      presets,
      songs,
      setlists,
    });
    await Share.share({
      title: 'POCKT library backup',
      message: JSON.stringify(backup, null, 2),
    });
  } catch {
    Alert.alert('Export failed', 'The backup could not be written.');
  }
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
    marginBottom: 8,
    color: Studio.ivoryMute,
    letterSpacing: 2,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    justifyContent: 'center',
  },
  chipOn: {
    borderColor: Studio.amber,
  },
  chipText: {
    color: Studio.ivory,
    letterSpacing: 1.2,
    fontWeight: '800',
    fontSize: 12,
  },
  empty: {
    color: Studio.ivoryDim,
    lineHeight: 20,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studio.line,
  },
  itemMain: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  itemText: {
    color: Studio.ivory,
    fontSize: 16,
    fontWeight: '600',
  },
  star: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    color: Studio.ivory,
    fontSize: 20,
  },
  link: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studio.line,
  },
  linkLabel: {
    color: Studio.ivory,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  linkValue: {
    color: Studio.ivoryDim,
  },
  export: {
    marginTop: 22,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Studio.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: {
    color: Studio.ivory,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  note: {
    marginTop: 10,
    color: Studio.ivoryMute,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.86,
  },
});

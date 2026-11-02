import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import { hapticSelection, hapticSoft } from '@/lib/haptics';
import {
  exportSetlistText,
  matchesQuery,
  snapshotSong,
  songToPatch,
  sortByName,
  type ClassicSetlist,
  type ClassicSong,
} from '@/lib/setlists';
import type { MetronomeConfig } from '@/lib/types';
import { loadSetlists, loadSongs, saveSetlists, saveSongs } from '@/storage/setlists';

type Props = {
  visible: boolean;
  config: MetronomeConfig;
  onLoad: (patch: Partial<MetronomeConfig>) => void;
  onOpenStage: (setlistId: string, songId: string) => void;
  onClose: () => void;
};

export function SetlistsScreen({ visible, config, onLoad, onOpenStage, onClose }: Props) {
  const [songs, setSongs] = useState<ClassicSong[]>([]);
  const [setlists, setSetlists] = useState<ClassicSetlist[]>([]);
  const [query, setQuery] = useState('');
  const [songName, setSongName] = useState('');
  const [listName, setListName] = useState('');
  const [alpha, setAlpha] = useState(true);

  useEffect(() => {
    if (!visible) return;
    void Promise.all([loadSongs(), loadSetlists()]).then(([nextSongs, nextLists]) => {
      setSongs(nextSongs);
      setSetlists(nextLists);
    });
  }, [visible]);

  const persistSongs = useCallback(async (next: ClassicSong[]) => {
    setSongs(next);
    await saveSongs(next);
  }, []);

  const persistLists = useCallback(async (next: ClassicSetlist[]) => {
    setSetlists(next);
    await saveSetlists(next);
  }, []);

  const visibleSongs = useMemo(
    () => sortByName(songs.filter((song) => matchesQuery(`${song.name} ${song.bpm} ${song.timeSignature}`, query)), alpha),
    [alpha, query, songs]
  );
  const visibleLists = useMemo(
    () => sortByName(setlists.filter((list) => matchesQuery(list.name, query)), alpha),
    [alpha, query, setlists]
  );

  return (
    <UtilityShell
      visible={visible}
      title="SETLISTS"
      lede="Save the current tempo and settings as a song. Group songs into setlists, then open Live Mode."
      onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search songs and setlists"
        placeholderTextColor={Studio.ivoryMute}
        style={styles.input}
      />
      <Pressable
        onPress={() => setAlpha((value) => !value)}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <Text style={styles.chipText}>{alpha ? 'A–Z' : 'MANUAL'}</Text>
      </Pressable>

      <Text style={styles.section}>SAVE CURRENT AS SONG</Text>
      <View style={styles.row}>
        <TextInput
          value={songName}
          onChangeText={setSongName}
          placeholder="Song name"
          placeholderTextColor={Studio.ivoryMute}
          style={[styles.input, styles.flex]}
        />
        <Pressable
          onPress={() => {
            void hapticSoft();
            void persistSongs([snapshotSong(songName, config), ...songs].slice(0, 80));
            setSongName('');
          }}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
          <Text style={styles.saveText}>SAVE</Text>
        </Pressable>
      </View>

      {visibleSongs.map((song) => (
        <Pressable
          key={song.id}
          onPress={() => {
            void hapticSelection();
            onLoad(songToPatch(song));
            onClose();
          }}
          onLongPress={() => {
            Alert.alert(song.name, undefined, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Duplicate',
                onPress: () => {
                  const copy = { ...song, id: `song-${Date.now()}`, name: `${song.name} copy` };
                  void persistSongs([copy, ...songs]);
                },
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => void persistSongs(songs.filter((item) => item.id !== song.id)),
              },
            ]);
          }}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <Text style={styles.cardName}>{song.name}</Text>
          <Text style={styles.cardMeta}>
            {song.bpm}  ·  {song.timeSignature}  ·  {song.subdivision}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.section}>NEW SETLIST</Text>
      <View style={styles.row}>
        <TextInput
          value={listName}
          onChangeText={setListName}
          placeholder="Setlist name"
          placeholderTextColor={Studio.ivoryMute}
          style={[styles.input, styles.flex]}
        />
        <Pressable
          onPress={() => {
            void hapticSoft();
            const next: ClassicSetlist = {
              id: `list-${Date.now()}`,
              name: listName.trim() || 'Setlist',
              songIds: [],
              notes: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            void persistLists([next, ...setlists]);
            setListName('');
          }}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
          <Text style={styles.saveText}>ADD</Text>
        </Pressable>
      </View>

      {visibleLists.map((list) => (
        <View key={list.id} style={styles.card}>
          <Text style={styles.cardName}>{list.name}</Text>
          <Text style={styles.cardMeta}>{list.songIds.length} songs</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => {
                const first = list.songIds[0];
                if (!first) return;
                onOpenStage(list.id, first);
              }}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipText}>LIVE</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const latest = songs[0];
                if (!latest) return;
                void persistLists(
                  setlists.map((item) =>
                    item.id === list.id ? { ...item, songIds: [...item.songIds, latest.id] } : item
                  )
                );
              }}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipText}>ADD LATEST SONG</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Share.share({ message: exportSetlistText(list, songs) });
              }}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipText}>SHARE</Text>
            </Pressable>
            <Pressable
              onPress={() => void persistLists(setlists.filter((item) => item.id !== list.id))}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
              <Text style={styles.chipText}>DELETE</Text>
            </Pressable>
          </View>
        </View>
      ))}
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  save: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Studio.ivory,
  },
  saveText: {
    color: Studio.ivory,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
    color: Studio.ivoryMute,
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 12,
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
  chip: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Studio.line,
    justifyContent: 'center',
  },
  chipText: {
    color: Studio.ivory,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});

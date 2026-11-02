import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UtilityShell } from '@/components/screens/UtilityShell';
import { Studio } from '@/constants/colors';
import { hapticSelection } from '@/lib/haptics';
import { songToPatch, type ClassicSetlist, type ClassicSong } from '@/lib/setlists';
import type { MetronomeConfig } from '@/lib/types';
import { loadSetlists, loadSongs } from '@/storage/setlists';

type Props = {
  visible: boolean;
  setlistId: string | null;
  songId: string | null;
  playing: boolean;
  bpm: number;
  countInBars: number;
  keepAwake: boolean;
  onLoad: (patch: Partial<MetronomeConfig>) => void;
  onToggle: () => void;
  onKeepAwake?: (value: boolean) => void;
  onClose: () => void;
};

export function StageScreen({
  visible,
  setlistId,
  songId,
  playing,
  bpm,
  countInBars,
  keepAwake,
  onLoad,
  onToggle,
  onKeepAwake,
  onClose,
}: Props) {
  const [songs, setSongs] = useState<ClassicSong[]>([]);
  const [setlists, setSetlists] = useState<ClassicSetlist[]>([]);
  const [currentId, setCurrentId] = useState(songId);
  const [locked, setLocked] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCurrentId(songId);
    setPendingId(null);
    void Promise.all([loadSongs(), loadSetlists()]).then(([nextSongs, nextLists]) => {
      setSongs(nextSongs);
      setSetlists(nextLists);
    });
  }, [songId, visible]);

  const list = setlists.find((item) => item.id === setlistId);
  const ids = list?.songIds ?? songs.map((song) => song.id);
  const index = Math.max(0, ids.findIndex((id) => id === (pendingId ?? currentId)));
  const song = useMemo(() => songs.find((item) => item.id === ids[index]) ?? songs[0], [ids, index, songs]);

  const apply = (id: string) => {
    const found = songs.find((item) => item.id === id);
    if (!found) return;
    setCurrentId(id);
    setPendingId(null);
    onLoad(songToPatch(found));
  };

  const go = (delta: number) => {
    if (!ids.length || locked) return;
    const next = ids[(index + delta + ids.length) % ids.length];
    if (playing) {
      setPendingId(next);
      return;
    }
    apply(next);
  };

  return (
    <UtilityShell
      visible={visible}
      title="STAGE"
      lede="Large play controls for a saved setlist. Prev and Next wait for Apply while a song is running."
      onClose={onClose}
      scroll={false}>
      <View style={styles.stage}>
        <Text style={styles.pos}>
          {ids.length ? `${index + 1} / ${ids.length}` : '0 / 0'}
          {list ? `  ·  ${list.name}` : ''}
        </Text>
        <Text style={styles.song}>{song?.name ?? 'No song'}</Text>
        <Text style={styles.meta}>
          {song
            ? `${song.timeSignature}  ·  ${song.subdivision.toUpperCase()}  ·  COUNT-IN ${song.countInBars || countInBars || 'OFF'}`
            : 'Save a song first'}
        </Text>
        <Text style={styles.bpm} allowFontScaling={false}>
          {song?.bpm ?? bpm}
        </Text>
        {pendingId && pendingId !== currentId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply next song now"
            onPress={() => apply(pendingId)}
            style={({ pressed }) => [styles.apply, pressed && styles.pressed]}>
            <Text style={styles.applyText}>APPLY NEXT SONG</Text>
          </Pressable>
        ) : null}
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous song"
            disabled={locked}
            onPress={() => {
              void hapticSelection();
              go(-1);
            }}
            style={({ pressed }) => [styles.hit, locked && styles.dim, pressed && styles.pressed]}>
            <Text style={styles.hitText}>PREV</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Stop' : 'Start'}
            onPress={onToggle}
            style={({ pressed }) => [styles.play, pressed && styles.pressed]}>
            <Text style={styles.playText}>{playing ? 'STOP' : 'START'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next song"
            disabled={locked}
            onPress={() => {
              void hapticSelection();
              go(1);
            }}
            style={({ pressed }) => [styles.hit, locked && styles.dim, pressed && styles.pressed]}>
            <Text style={styles.hitText}>NEXT</Text>
          </Pressable>
        </View>
        <View style={styles.tools}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={locked ? 'Unlock stage edits' : 'Lock stage edits'}
            onPress={() => {
              void hapticSelection();
              setLocked((value) => !value);
            }}
            style={({ pressed }) => [styles.tool, locked && styles.toolOn, pressed && styles.pressed]}>
            <Text style={styles.toolText}>{locked ? 'STAGE LOCK ON' : 'STAGE LOCK'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={keepAwake ? 'Allow screen sleep' : 'Keep screen awake'}
            onPress={() => {
              void hapticSelection();
              onKeepAwake?.(!keepAwake);
            }}
            style={({ pressed }) => [styles.tool, keepAwake && styles.toolOn, pressed && styles.pressed]}>
            <Text style={styles.toolText}>{keepAwake ? 'KEEP AWAKE ON' : 'KEEP AWAKE'}</Text>
          </Pressable>
        </View>
      </View>
    </UtilityShell>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  pos: {
    color: Studio.ivoryMute,
    textAlign: 'center',
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  song: {
    color: Studio.ivory,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  meta: {
    color: Studio.ivoryDim,
    textAlign: 'center',
    letterSpacing: 1.4,
  },
  bpm: {
    color: Studio.ivory,
    fontSize: 120,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  apply: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Studio.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: Studio.ivory,
    letterSpacing: 2,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  hit: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    flex: 1.4,
    minHeight: 72,
    borderWidth: 2,
    borderColor: Studio.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.35,
  },
  hitText: {
    color: Studio.ivory,
    letterSpacing: 2,
    fontWeight: '800',
  },
  playText: {
    color: Studio.ivory,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tools: {
    flexDirection: 'row',
    gap: 10,
  },
  tool: {
    flex: 1,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Studio.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolOn: {
    borderColor: Studio.amber,
  },
  toolText: {
    color: Studio.ivory,
    letterSpacing: 1.4,
    fontWeight: '800',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.86,
  },
});

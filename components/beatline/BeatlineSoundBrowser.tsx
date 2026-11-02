import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BeatlineHeader, MetalRoundButton, SectionLabel } from '@/components/beatline/BeatlineChrome';
import { P2 } from '@/constants/pockt-2';
import {
  BEATLINE_BROWSER_CATEGORIES,
  beatlineSoundCatalog,
  soundsForBeatlineCategory,
  soundTitle,
  type BeatlineBrowserCategory,
  type BeatlineSoundFilter,
  type BeatlineSoundPick,
} from '@/lib/beatline-2';
import type { SoundId } from '@/lib/types';

type Props = {
  current: SoundId;
  favorites: SoundId[];
  recent: SoundId[];
  filter: BeatlineSoundFilter;
  pick: BeatlineSoundPick;
  onSelect: (id: SoundId) => void;
  onFavorite: (id: SoundId) => void;
  onAudition: (id: SoundId) => void;
  onFilter: (filter: BeatlineSoundFilter) => void;
  onBack: () => void;
};

export function BeatlineSoundBrowser({
  current,
  favorites,
  recent,
  filter,
  pick,
  onSelect,
  onFavorite,
  onAudition,
  onFilter,
  onBack,
}: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<BeatlineBrowserCategory>('classic');
  const catalog = useMemo(() => {
    const source =
      filter === 'favorites'
        ? favorites
        : filter === 'recent'
          ? recent
          : soundsForBeatlineCategory(category);
    const pool = source.length ? source : beatlineSoundCatalog();
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((id) => soundTitle(id).toLowerCase().includes(q) || id.includes(q));
  }, [category, favorites, filter, query, recent]);

  const title = pick === 'downbeat' ? 'DOWNBEAT SOUND' : pick === 'accent' ? 'ACCENT SOUND' : 'SOUNDS';

  return (
    <View style={styles.root}>
      <BeatlineHeader title={title} onBack={onBack} />
      <View style={styles.search}>
        <View style={styles.searchDot} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sound..."
          placeholderTextColor={P2.inkDim}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {filter === 'all' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {BEATLINE_BROWSER_CATEGORIES.map((item) => {
            const on = category === item.id;
            return (
              <View key={item.id} style={styles.cat}>
                <MetalRoundButton
                  accessibilityLabel={item.label}
                  onPress={() => setCategory(item.id)}
                  size={44}
                  glow={on}>
                  <View style={[styles.catPip, on && styles.catPipOn]} />
                </MetalRoundButton>
                <Text style={[styles.catLabel, on && styles.catLabelOn]}>{item.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <SectionLabel>{filter === 'favorites' ? 'FAVORITES' : 'RECENTLY USED'}</SectionLabel>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {catalog.map((id) => {
          const selected = id === current && pick === 'metronome';
          const fav = favorites.includes(id);
          return (
            <View key={id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${soundTitle(id)}`}
                onPress={() => onSelect(id)}
                style={styles.nameHit}>
                <Text style={[styles.name, selected && styles.nameOn]} numberOfLines={1}>
                  {soundTitle(id)}
                </Text>
              </Pressable>
              <MetalRoundButton
                accessibilityLabel={`Audition ${soundTitle(id)}`}
                onPress={() => onAudition(id)}
                size={selected ? 48 : 44}
                glow={selected}>
                <Ionicons name="play" size={selected ? 16 : 13} color={selected ? P2.signal : P2.metalHi} />
              </MetalRoundButton>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={fav ? `Unfavorite ${soundTitle(id)}` : `Favorite ${soundTitle(id)}`}
                onPress={() => onFavorite(id)}
                hitSlop={12}
                style={styles.star}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? P2.metalHi : P2.inkDim} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => onFilter('favorites')} style={styles.footHit} accessibilityRole="button" accessibilityLabel="Favorites">
          <Ionicons name="heart-outline" size={16} color={filter === 'favorites' ? P2.signal : P2.inkMute} />
          <Text style={styles.footText}>FAVORITES</Text>
        </Pressable>
        <Pressable onPress={() => onFilter('recent')} style={styles.footHit} accessibilityRole="button" accessibilityLabel="Recently used">
          <Ionicons name="time-outline" size={16} color={filter === 'recent' ? P2.signal : P2.inkMute} />
          <Text style={styles.footText}>RECENTLY USED</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  search: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111418',
    borderWidth: 1,
    borderColor: 'rgba(213,218,224,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: P2.signal,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: P2.ink,
    fontSize: 15,
    paddingVertical: 0,
  },
  cats: {
    gap: 10,
    paddingBottom: 12,
    alignItems: 'center',
  },
  cat: {
    alignItems: 'center',
    width: 64,
    gap: 4,
  },
  catPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P2.metalLo,
  },
  catPipOn: {
    backgroundColor: P2.signal,
  },
  catLabel: {
    color: P2.inkDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  catLabelOn: {
    color: P2.ink,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameHit: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  name: {
    color: P2.metalHi,
    fontSize: 20,
    fontWeight: '400',
  },
  nameOn: {
    color: P2.signal,
  },
  star: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  footHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
  footText: {
    color: P2.inkMute,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

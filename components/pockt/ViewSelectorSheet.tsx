import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  FlatList,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InstrumentButton } from '@/components/pockt2/InstrumentButton';
import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { RoomTile } from '@/components/rooms/RoomTile';
import { P2, P2Radius, P2Space } from '@/constants/pockt-2';
import { roomA11yLabel, roomShortLabel, ROOMS } from '@/constants/rooms';
import type { CustomLayout } from '@/lib/custom-layout';
import { hapticSelection } from '@/lib/haptics';
import { isFavorite, type LibraryState } from '@/lib/library';
import {
  POCKET_SELECTOR_TITLE,
  isPocketEnterable,
  pocketSelectorGridItems,
  pocketSelectorHero,
  whiskeyBarTeaserLabel,
  type PocketSelectorItem,
} from '@/lib/pockt-pockets';
import type { RoomId } from '@/lib/types';

type Props = {
  visible: boolean;
  activeViewId: RoomId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  library: LibraryState;
  discover?: boolean;
  bpm?: number;
  onSelect: (id: RoomId) => void;
  onClose: () => void;
};

export function ViewSelectorSheet({
  visible,
  activeViewId,
  customPhotoUri,
  customLayout,
  library,
  discover = false,
  bpm,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const rise = useSharedValue(visible ? 1 : 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    rise.value = withTiming(visible ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [rise, visible]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 28 }],
  }));

  const gap = 14;
  const pad = P2Space.lg;
  const tileW = Math.round((width - pad * 2 - gap) / 2);
  const tileH = Math.round(tileW * 1.12);
  const heroW = Math.round(width - pad * 2);
  const heroH = Math.round(Math.min(220, heroW * 0.52));
  const hero = pocketSelectorHero(library, activeViewId, discover);
  const items = pocketSelectorGridItems(library, activeViewId, hero);
  const bar = whiskeyBarTeaserLabel();

  const onViewableItemsChanged = useMemo(
    () =>
      ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const next: Record<string, boolean> = {};
        for (const token of viewableItems) {
          const key = String(token.key ?? '');
          if (key) next[key] = true;
        }
        setVisibleIds(next);
      },
    []
  );

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 40 }), []);

  if (!visible) return null;

  const openPocket = (id: RoomId) => {
    if (!isPocketEnterable(id)) return;
    void hapticSelection();
    onSelect(id);
  };

  const renderItem = ({ item }: { item: PocketSelectorItem }) => {
    if (item.kind === 'teaser') {
      return (
        <View style={{ width: tileW, marginBottom: gap }}>
          <View style={[styles.tileFrame, styles.teaserFrame]}>
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Whiskey Bar. Coming soon."
              style={[styles.teaser, { width: tileW - 8, height: tileH - 8 }]}>
              <Text style={styles.teaserName}>{bar.title}</Text>
              <Text style={styles.teaserStatus}>{bar.status}</Text>
            </View>
          </View>
        </View>
      );
    }
    const id = item.id;
    const room = ROOMS[id];
    if (!room?.enabled) return null;
    const onScreen = visibleIds[id] === true;
    return (
      <View style={{ width: tileW, marginBottom: gap }}>
        <View style={styles.tileFrame}>
          <RoomTile
            id={id}
            width={tileW - 8}
            height={tileH - 8}
            customPhotoUri={customPhotoUri}
            customLayout={customLayout ?? undefined}
            active={onScreen && !reduceMotion}
            reduceMotion={reduceMotion || !onScreen}
            hideName
            library={library}
            bpm={bpm}
            onPress={() => openPocket(id)}
          />
        </View>
        <Text style={styles.name} numberOfLines={1} accessibilityLabel={roomA11yLabel(id)}>
          {roomShortLabel(id)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.root} accessibilityViewIsModal>
      {discover ? <View style={styles.dim} /> : <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Return to Pocket" />}
      <Animated.View style={[styles.sheet, { paddingTop: Math.max(insets.top, 16) }, sheetStyle]}>
        <View style={styles.chrome}>
          {discover ? (
            <View style={{ minWidth: 72 }} />
          ) : (
            <InstrumentButton label="Close" onPress={onClose} accessibilityLabel="Return to current Pocket" compact />
          )}
          <View style={styles.brand}>
            <Pockt2Mark size={28} accessible={false} />
            <Text style={styles.title}>{POCKET_SELECTOR_TITLE}</Text>
          </View>
          <View style={{ minWidth: 72 }} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => (item.kind === 'teaser' ? 'whiskey-bar-teaser' : item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: Math.max(insets.bottom, 18) + 28 }}
          ListHeaderComponent={
            <View>
              <Text style={styles.labsLabel}>LABS</Text>
              <Pressable
                testID="glass-proof-entry"
                accessibilityRole="button"
                accessibilityLabel="Glass Proof"
                onPress={() => {
                  void hapticSelection();
                  router.push('/glass-proof');
                }}
                style={({ pressed }) => [styles.glassProofHit, pressed && styles.pressed]}>
                <View style={[styles.tileFrame, styles.glassProofFrame, { width: heroW }]}>
                  <View style={[styles.glassProof, { width: heroW - 8 }]}>
                    <Text style={styles.glassProofLabel}>GLASS PROOF</Text>
                  </View>
                </View>
              </Pressable>
              <View testID="machine-lab-entry" style={[styles.tileFrame, styles.glassProofFrame, { width: heroW, marginBottom: 18 }]}>
                <View style={[styles.glassProof, { width: heroW - 8 }]}>
                  <Text style={styles.glassProofLabel}>MACHINE</Text>
                  <Text style={styles.teaserStatus}>Archive — not loaded</Text>
                </View>
              </View>
              {hero ? (
                <Pressable
                  onPress={() => openPocket(hero)}
                  accessibilityRole="button"
                  accessibilityLabel={`Current Pocket ${roomShortLabel(hero)}`}
                  style={({ pressed }) => [styles.heroHit, pressed && styles.pressed]}>
                  <View style={[styles.tileFrame, styles.heroFrame]}>
                    <RoomTile
                      id={hero}
                      width={heroW - 8}
                      height={heroH - 8}
                      customPhotoUri={customPhotoUri}
                      customLayout={customLayout ?? undefined}
                      active={!reduceMotion}
                      reduceMotion={reduceMotion}
                      hideName
                      featured
                      library={library}
                      bpm={bpm}
                      onPress={() => openPocket(hero)}
                    />
                  </View>
                  <Text style={styles.heroName}>{roomShortLabel(hero)}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P2.overlay,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: P2.field,
  },
  chrome: {
    paddingHorizontal: P2Space.md,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: P2.ink,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  labsLabel: {
    color: P2.ink,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 8,
    opacity: 0.55,
  },
  glassProofHit: {
    marginBottom: 10,
  },
  glassProofFrame: {
    borderColor: P2.signalSoft,
  },
  glassProof: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: P2Radius.panel - 2,
    backgroundColor: '#0C0D10',
  },
  glassProofLabel: {
    color: P2.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroHit: {
    marginBottom: 18,
  },
  heroFrame: {
    borderColor: P2.signalSoft,
    borderWidth: 1.5,
  },
  heroName: {
    marginTop: 8,
    color: P2.signal,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tileFrame: {
    borderRadius: P2Radius.panel,
    padding: 4,
    borderWidth: 1,
    borderColor: P2.hairline,
    backgroundColor: P2.fieldRaised,
  },
  teaserFrame: {
    opacity: 0.72,
  },
  teaser: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: P2Radius.panel - 2,
    backgroundColor: '#0C0D10',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  teaserName: {
    color: P2.inkMute,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  teaserStatus: {
    marginTop: 8,
    color: P2.signal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.2,
    opacity: 0.86,
  },
  name: {
    marginTop: 8,
    color: P2.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.82,
  },
});

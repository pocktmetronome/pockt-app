import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { ClassicPreviewCard } from '@/components/classic/ClassicPreviewCard';
import { CustomPreview } from '@/components/classic/CustomPreview';
import { ImmersivePreviewTile } from '@/components/rooms/ImmersivePreviewTile';
import { familyForRoom, ROOMS, roomA11yLabel } from '@/constants/rooms';
import { immersiveTitleLayout, type ImmersiveTitleId } from '@/lib/immersive-title-layout';
import { migrateCustomLayout, type CustomLayout } from '@/lib/custom-layout';
import { isFavorite, type LibraryState } from '@/lib/library';
import type { RoomId } from '@/lib/types';

type Props = {
  id: RoomId;
  width: number;
  height: number;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  active: boolean;
  reduceMotion: boolean;
  library?: LibraryState;
  onPress: () => void;
  hideName?: boolean;
  featured?: boolean;
  editing?: boolean;
  lifted?: boolean;
  jigglePhase?: number;
  interactive?: boolean;
  bpm?: number;
};

export function RoomTile({
  id,
  width,
  height,
  customPhotoUri,
  customLayout,
  active,
  reduceMotion,
  library,
  onPress,
  featured = false,
  editing = false,
  lifted = false,
  jigglePhase = 0,
  interactive = true,
  hideName = false,
  bpm,
}: Props) {
  const room = ROOMS[id];
  const family = familyForRoom(id);
  const favorited = library ? isFavorite(library, id) : false;
  const immersive = id === 'studio' || id === 'altered' || id === 'bar' ? id : null;
  const immersiveTitle = immersive
    ? immersiveTitleLayout(immersive as ImmersiveTitleId, width)
    : null;
  const custom = id === 'customized';
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!editing || lifted || reduceMotion || custom) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(
      withTiming(1, { duration: 540 + (jigglePhase % 90), easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => {
      wave.value = 0;
    };
  }, [custom, editing, jigglePhase, lifted, reduceMotion, wave]);

  const jiggleStyle = useAnimatedStyle(() => {
    const live = editing && !lifted ? 1 : 0;
    const phase = wave.value * Math.PI * 2 + jigglePhase * 0.7;
    return {
      transform: [
        { rotate: `${Math.sin(phase) * 0.55 * live}deg` },
        { translateX: Math.cos(phase) * 0.45 * live },
        { translateY: Math.sin(phase * 0.5) * 0.25 * live },
      ],
    };
  });

  return (
    <Animated.View style={[{ width, height }, jiggleStyle, lifted && styles.lifted]}>
      <Pressable
        onPress={interactive && !editing ? onPress : undefined}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel={`${roomA11yLabel(id)}. Button.`}
        style={({ pressed }) => [styles.card, { width, height }, pressed && !editing && styles.pressed, lifted && styles.cardLifted]}>
        <View style={styles.preview} importantForAccessibility="no" accessibilityElementsHidden>
          {custom ? (
            <CustomPreview
              layout={migrateCustomLayout(customLayout, customPhotoUri)}
              active={active}
              reduceMotion={reduceMotion}
            />
          ) : family === 'classic' ? (
            <ClassicPreviewCard roomId={id} compact active={active} reduceMotion={reduceMotion} editing={editing} bpm={bpm} />
          ) : immersive ? (
            <ImmersivePreviewTile id={immersive} active={active} reduceMotion={reduceMotion} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0908' }]} />
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(7,6,5,0.88)', 'rgba(6,6,8,0.35)', 'rgba(6,6,8,0)']}
            locations={[0, 0.72, 1]}
            style={styles.titleShade}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(6,6,8,0)', 'rgba(6,6,8,0.5)', 'rgba(7,6,5,0.9)']}
            locations={[0, 0.48, 1]}
            style={styles.shade}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)', 'transparent']}
            locations={[0, 0.22, 0.46]}
            style={styles.sheen}
          />
          <View pointerEvents="none" style={styles.rim} />
        </View>
        {hideName ? null : immersive && immersiveTitle ? (
          <View
            pointerEvents="none"
            style={[
              styles.titleBand,
              {
                left: immersiveTitle.bandLeft,
                right: immersiveTitle.bandRight,
                top: immersiveTitle.bandTop,
                minHeight: immersiveTitle.bandHeight,
              },
            ]}
            testID={`room-title-${id}`}>
            <View accessible={false} style={styles.immersiveTitle}>
              {immersiveTitle.lines.map((line) => (
                <Text
                  key={line}
                  style={[
                    styles.nameImmersive,
                    {
                      fontSize: immersiveTitle.fontSize,
                      letterSpacing: immersiveTitle.letterSpacing,
                      lineHeight: immersiveTitle.lineHeight,
                    },
                  ]}
                  numberOfLines={1}
                  allowFontScaling={false}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ) : null}
        {hideName ? null : (
        <View style={[styles.meta, featured && styles.metaFeatured]}>
          <View style={styles.metaCopy}>
            {immersive ? null : (
              <Text
                style={styles.name}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}>
                {room.shortLabel.toUpperCase()}
              </Text>
            )}
            {custom ? <Text style={styles.customLine}>Build your own Pocket.</Text> : null}
            {custom ? (
              <View style={styles.hints}>
                <Text style={styles.hint}>Any Tempo</Text>
                <Text style={styles.hint}>Any Sound</Text>
                <Text style={styles.hint}>Your Way</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.go}>
            <Text style={styles.goText}>›</Text>
          </View>
        </View>
        )}
        {favorited ? (
          <View style={styles.fav} pointerEvents="none">
            <Text style={styles.favText}>★</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0C0B0A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,216,186,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
  cardLifted: {
    shadowOpacity: 0.62,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    borderColor: 'rgba(255,255,255,0.22)',
  },
  lifted: {
    zIndex: 40,
  },
  preview: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 54,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.38)',
  },
  meta: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaFeatured: {
    alignItems: 'center',
  },
  metaCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: 'rgba(246,240,228,0.92)',
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '800',
    marginBottom: 3,
  },
  titleShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 58,
  },
  titleBand: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 8,
    minHeight: 40,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nameImmersive: {
    color: 'rgba(246,240,228,0.98)',
    fontSize: 15,
    letterSpacing: 0.8,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  immersiveTitle: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    gap: 0,
  },
  customLine: {
    color: '#F6F0E4',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  hints: {
    flexDirection: 'row',
    gap: 10,
  },
  hint: {
    color: 'rgba(232,216,186,0.55)',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  go: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,216,186,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,10,0.45)',
  },
  goText: {
    color: '#E8D4A8',
    fontSize: 18,
    marginTop: -1,
  },
  fav: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 28,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favText: {
    color: '#E8D4A0',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  pressed: {
    opacity: 1,
    transform: [{ scale: 0.982 }, { translateY: 0.5 }],
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
});

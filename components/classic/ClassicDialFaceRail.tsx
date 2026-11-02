import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useState } from 'react';

import { NorthStarImage, northStar } from '@/components/classic/north-star-assets';
import { ShellGlyph, type ShellIconName } from '@/components/classic/ShellIcons';
import { MetalBar } from '@/components/classic/dial-skia';
import { CLASSIC_DIAL } from '@/lib/classic-dial-visual';
import { hapticEvent } from '@/lib/haptics';
import {
  FACE_RAIL_ORDER,
  INSTRUMENT_FACES,
  type FaceRailId,
  type InstrumentFaceId,
} from '@/lib/instrument-faces';

const ICON_OPTIC: Partial<Record<FaceRailId, { sx: number; sy: number; x: number; y: number }>> = {
  dial: { sx: 2.15, sy: 2.15, x: 2, y: 0 },
  rhythm: { sx: 1.71, sy: 1.8, x: 2, y: 2 },
  pulse: { sx: 1.69, sy: 2.61, x: 0, y: 2 },
  'smart-pendulum': { sx: 1.55, sy: 1.56, x: -1, y: 0 },
  pro: { sx: 1.76, sy: 1.5, x: -4, y: 1 },
  beatline: { sx: 1.71, sy: 2.25, x: -4, y: 2 },
};

const ICONS: Record<InstrumentFaceId, ShellIconName> = {
  dial: 'dial',
  pulse: 'pulse',
  'smart-pendulum': 'pendulum',
  pro: 'pro',
  beatline: 'beatline',
  'pendula-classic': 'pendulum',
  ledgear: 'pro',
};

type Props = {
  activeId: FaceRailId;
  compact?: boolean;
  /** Reference chassis. Dial landing only. Other faces keep the checkpoint rail. */
  facade?: boolean;
  /** Viewport width / 390. Glyph and label ink track the North Star at every width. */
  scale?: number;
  onSelect: (id: FaceRailId) => void;
};

export function ClassicDialFaceRail({ activeId, compact = false, facade = false, scale = 1, onSelect }: Props) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View
      onLayout={(event) => {
        const next = { w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height };
        setBox((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
      }}
      style={[styles.rail, facade && styles.railFacade]}
      testID="classic-dial-face-rail"
      accessibilityRole="tablist"
      accessibilityLabel="Dial, Rhythm, Pulse, Pendulum, Pro, and Beatline">
      {facade ? null : <MetalBar width={box.w} height={box.h} tone="nav" />}
      {FACE_RAIL_ORDER.map((id) => {
        const spec = id === 'rhythm' ? { rail: 'RHYTHM' } : INSTRUMENT_FACES[id];
        const active = id === activeId;
        const icon: ShellIconName = id === 'rhythm' ? 'rhythm' : ICONS[id];
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${spec.rail}${active ? ', selected' : ''}`}
            onPress={() => {
              void hapticEvent('selector');
              onSelect(id);
            }}
            style={[styles.item, compact && styles.itemCompact, facade && styles.itemFacade, facade && { paddingTop: Math.round(8 * scale) }, active && (facade ? styles.itemOnFacade : styles.itemOn)]}>
            {facade && active ? (
              <View
                pointerEvents="none"
                style={[
                  styles.selectedTile,
                  {
                    width: Math.round(70 * scale),
                    height: Math.round(59 * scale),
                    top: Math.round(2 * scale),
                    marginLeft: Math.round(-35 * scale),
                  },
                ]}>
                <NorthStarImage source={northStar.navSelected} mode="stretch" />
              </View>
            ) : null}
            <View
              style={
                facade && ICON_OPTIC[id]
                  ? {
                      transform: [
                        { translateX: ICON_OPTIC[id].x * scale },
                        { translateY: ICON_OPTIC[id].y * scale },
                        { scaleX: ICON_OPTIC[id].sx },
                        { scaleY: ICON_OPTIC[id].sy },
                      ],
                    }
                  : undefined
              }>
              <ShellGlyph
                name={icon}
                size={facade ? Math.max(12, Math.round(15 * scale)) : compact ? 14 : 16}
                fillScale={facade ? 1.02 : 1}
                strokeWidth={facade ? Math.max(1.15, 1.35 * scale) : 1.8}
                color={active ? (facade ? '#E7D3A8' : CLASSIC_DIAL.ivory) : facade ? '#E6D7BE' : '#8E8A84'}
              />
            </View>
            <Text
              style={[
                styles.label,
                !facade && compact && styles.labelCompact,
                facade && {
                  color: active ? '#E7D3A8' : '#C9BBA4',
                  fontSize: Math.max(8, Math.round(10 * scale)),
                  fontWeight: '700',
                  letterSpacing: (id === 'smart-pendulum' ? -0.2 : id === 'beatline' ? 0.7 : id === 'pro' ? 0.4 : id === 'pulse' ? 0.85 : 0.15) * scale,
                  transform:
                    id === 'pro'
                      ? [{ translateX: -4 * scale }]
                      : id === 'beatline'
                        ? [{ translateX: -6 * scale }]
                        : undefined,
                },
                !facade && active && styles.labelOn,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={!facade}
              minimumFontScale={0.55}
              allowFontScaling={false}>
              {spec.rail}
            </Text>
            {facade ? null : <View style={[styles.mark, active && styles.markOn]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  railFacade: {
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
    borderRadius: 18,
  },
  item: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  itemFacade: {
    justifyContent: 'flex-start',
    paddingTop: 8,
    gap: 1,
  },
  selectedTile: {
    position: 'absolute',
    width: 70,
    height: 59,
    top: 2,
    left: '50%',
    marginLeft: -35,
  },
  itemCompact: {
    gap: 2,
  },
  itemOn: {
    backgroundColor: 'rgba(62,230,216,0.1)',
    borderRadius: 8,
  },
  itemOnFacade: {
    backgroundColor: 'transparent',
  },
  label: {
    color: CLASSIC_DIAL.ivoryMute,
    fontSize: 8,
    letterSpacing: -0.3,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 1,
  },
  labelCompact: {
    fontSize: 7,
  },
  labelFacade: {
    color: '#C9BBA4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -1.15,
  },
  labelFacadeCompact: {
    fontSize: 8,
    letterSpacing: -0.8,
  },
  labelPendulum: {
    letterSpacing: -1.85,
  },
  labelPro: {
    transform: [{ translateX: -8.5 }],
  },
  labelBeatline: {
    letterSpacing: -0.55,
    transform: [{ translateX: -11 }],
  },
  labelOn: {
    color: CLASSIC_DIAL.teal,
  },
  labelOnFacade: {
    color: '#E7D3A8',
  },
  mark: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  markOn: {
    backgroundColor: CLASSIC_DIAL.teal,
    width: 16,
  },
  markOnFacade: {
    backgroundColor: '#E7D3A8',
    width: 18,
    height: 3,
    shadowOpacity: 0,
  },
});

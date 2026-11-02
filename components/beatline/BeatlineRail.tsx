import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { BeatlinePart } from '@/components/beatline/BeatlinePart';
import { subdivisionCaption } from '@/constants/meter';
import { P2 } from '@/constants/pockt-2';
import { accentLabel, accentStrength } from '@/lib/accents';
import { beatColor, strengthDotRatio, strengthFill } from '@/lib/beatline-2';
import { BEATLINE_ASSETS } from '@/lib/beatline-assets';
import {
  beatlineBeadIsCurrent,
  beatlineCycleBeat,
  beatlineMasterBeadScale,
  beatlineRailLayout,
  beatlineRailSeats,
} from '@/lib/beatline-pulse';
import {
  BEATLINE_LIGHT_IN_MS,
  BEATLINE_LIGHT_OUT_MS,
  BEATLINE_PRESS_DOWN_MS,
  BEATLINE_PRESS_UP_MS,
  BEATLINE_STRENGTH_MS,
} from '@/lib/beatline-feel';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

type Props = {
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  accentPattern: AccentLevel[];
  playing: boolean;
  silent: boolean;
  pulseBeat?: SharedValue<number>;
  downbeatColor: string;
  accentColor: string;
  visualIntensity: number;
  onChange: (pattern: AccentLevel[]) => void;
  skin?: 'parts' | 'master';
};

export function BeatlineRail({
  timeSignature,
  subdivision,
  accentPattern,
  playing,
  silent,
  pulseBeat,
  downbeatColor,
  accentColor,
  visualIntensity,
  onChange,
  skin = 'parts',
}: Props) {
  const layout = beatlineRailLayout(timeSignature);
  const intensity = useSharedValue(visualIntensity);
  useEffect(() => {
    intensity.value = visualIntensity;
  }, [intensity, visualIntensity]);

  const cycleBeat = (index: number) => {
    const next = beatlineCycleBeat(accentPattern, timeSignature, index);
    const nextLevel = next[index] ?? 'normal';
    const strength = accentStrength(nextLevel);
    if (strength === 0) void hapticLight();
    else if (strength === 1) void hapticSelection();
    else void hapticMedium();
    onChange(next);
  };

  const master = skin === 'master';
  const scale = master ? beatlineMasterBeadScale(layout.count) : 1;
  const seats = master ? beatlineRailSeats(timeSignature) : null;

  return (
    <View style={styles.block}>
      {master ? null : (
        <View style={styles.meta}>
          <Text style={styles.metaText}>METER: {timeSignature.split('-')[0]}</Text>
          <Text style={styles.metaText}>SUBD: {subdivisionCaption(subdivision).replace(/^[^\s]+\s+/, '').toUpperCase()}</Text>
        </View>
      )}
      <View style={[styles.rail, layout.grouped && styles.railGrouped, master && styles.railMaster]}>
        {master ? null : <View pointerEvents="none" style={styles.spine} />}
        {seats
          ? seats.map((seat) => {
              const level = accentPattern[seat.index] ?? 'normal';
              const full = seat.kind === 'full';
              const size = full ? 22 : layout.count >= 12 ? 11 : 15;
              return (
                <View
                  key={`${timeSignature}-${seat.index}`}
                  style={[
                    styles.seat,
                    {
                      left: `${seat.x * 100}%`,
                      width: size + (full ? 14 : 8),
                      marginLeft: -(size + (full ? 14 : 8)) / 2,
                    },
                  ]}>
                  <RailBead
                    index={seat.index}
                    count={layout.count}
                    size={size}
                    halo={full ? size + 10 : size + 6}
                    slot={size + 8}
                    grouped={!full}
                    groupStart={layout.groupStarts.includes(seat.index)}
                    gap={0}
                    strength={accentStrength(level)}
                    fallbackCurrent={false}
                    playing={playing && !silent}
                    pulseBeat={pulseBeat}
                    downbeatColor={downbeatColor}
                    accentColor={accentColor}
                    intensity={intensity}
                    onPress={() => cycleBeat(seat.index)}
                    label={`Beat ${seat.index + 1}, ${accentLabel(level)}`}
                    skin={skin}
                  />
                </View>
              );
            })
          : layout.groups.map((group, groupIndex) => (
              <View
                key={`${timeSignature}-g${groupIndex}`}
                style={[styles.cluster, groupIndex > 0 && layout.grouped ? { marginLeft: layout.groupGap * scale } : null]}>
                {group.map((index, innerIndex) => {
                  const level = accentPattern[index] ?? 'normal';
                  const groupStart = layout.groupStarts.includes(index);
                  return (
                    <RailBead
                      key={`${timeSignature}-${index}`}
                      index={index}
                      count={layout.count}
                      size={(groupStart ? layout.startBead : layout.bead) * scale}
                      halo={layout.halo * scale}
                      slot={layout.slot * scale}
                      grouped={layout.grouped}
                      groupStart={groupStart}
                      gap={innerIndex > 0 ? layout.innerGap * scale : 0}
                      strength={accentStrength(level)}
                      fallbackCurrent={false}
                      playing={playing && !silent}
                      pulseBeat={pulseBeat}
                      downbeatColor={downbeatColor}
                      accentColor={accentColor}
                      intensity={intensity}
                      onPress={() => cycleBeat(index)}
                      label={`Beat ${index + 1}, ${accentLabel(level)}`}
                      skin={skin}
                    />
                  );
                })}
              </View>
            ))}
      </View>
    </View>
  );
}

function RailBead({
  index,
  count,
  size,
  halo,
  slot,
  grouped,
  groupStart,
  gap,
  strength,
  fallbackCurrent,
  playing,
  pulseBeat,
  downbeatColor,
  accentColor,
  intensity,
  onPress,
  label,
  skin = 'parts',
}: {
  index: number;
  count: number;
  size: number;
  halo: number;
  slot: number;
  grouped: boolean;
  groupStart: boolean;
  gap: number;
  strength: 0 | 1 | 2 | 3;
  fallbackCurrent: boolean;
  playing: boolean;
  pulseBeat?: SharedValue<number>;
  downbeatColor: string;
  accentColor: string;
  intensity: SharedValue<number>;
  onPress: () => void;
  label: string;
  skin?: 'parts' | 'master';
}) {
  const live = useSharedValue(strength);
  const press = useSharedValue(0);
  const haloLit = useSharedValue(0);
  const finger = useRef(false);
  useEffect(() => {
    live.value = withTiming(strength, { duration: BEATLINE_STRENGTH_MS, easing: Easing.out(Easing.cubic) });
  }, [live, strength]);
  useAnimatedReaction(
    () => {
      const current = pulseBeat ? beatlineBeadIsCurrent(pulseBeat.value, index, count) : fallbackCurrent;
      return playing && current ? 1 : 0;
    },
    (next, prev) => {
      if (next === prev) return;
      haloLit.value = withTiming(next, {
        duration: next > 0.5 ? BEATLINE_LIGHT_IN_MS : BEATLINE_LIGHT_OUT_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
  );

  const bodyStyle = useAnimatedStyle(() => {
    const current = pulseBeat ? beatlineBeadIsCurrent(pulseBeat.value, index, count) : fallbackCurrent;
    const active = playing && current;
    if (skin === 'master') {
      return {
        transform: [{ translateY: press.value * 0.4 }],
        opacity: 1,
      };
    }
    return {
      transform: [
        { translateY: (active ? 2 : 0) + press.value * 1.05 },
        { scale: (active ? 0.94 : 1) * (1 - press.value * 0.04) },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => {
    const gain = intensity.value;
    const lit = haloLit.value;
    if (skin === 'master') {
      return {
        opacity: 0.2 * gain * lit,
        transform: [{ scale: 1 }],
      };
    }
    return {
      opacity: 0.7 * gain * lit,
      transform: [{ scale: 0.88 + 0.12 * lit }],
    };
  });

  const bloomStyle = useAnimatedStyle(() => {
    const lit = haloLit.value * intensity.value;
    const ratio = Math.max(0.34, strengthDotRatio(live.value));
    const px = Math.max(6, size * ratio * 1.22);
    return {
      width: px,
      height: px,
      borderRadius: px / 2,
      opacity: 0.18 * lit,
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    const ratio = strengthDotRatio(live.value);
    const dim = strengthFill(live.value, intensity.value);
    const color = beatColor(index, live.value, downbeatColor, accentColor);
    const px = Math.max(0, size * ratio);
    const lit = haloLit.value;
    return {
      width: px,
      height: px,
      borderRadius: px / 2,
      backgroundColor: color,
      opacity: dim * (1 + 0.1 * lit),
    };
  });

  const capsuleStyle = useAnimatedStyle(() => {
    const ratio = Math.max(0.16, strengthDotRatio(live.value));
    const color = beatColor(index, live.value, downbeatColor, accentColor);
    return {
      height: `${Math.round(ratio * 100)}%`,
      backgroundColor: color,
      opacity: strengthFill(live.value, intensity.value),
    };
  });

  const hitWidth = grouped ? slot : Math.max(44, size + 10);

  return (
    <Pressable
      testID={`beatline-node-${index}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        finger.current = true;
        press.value = withTiming(1, { duration: BEATLINE_PRESS_DOWN_MS, easing: Easing.out(Easing.cubic) });
        onPress();
      }}
      onPress={() => {
        if (finger.current) {
          finger.current = false;
          return;
        }
        onPress();
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: BEATLINE_PRESS_UP_MS, easing: Easing.out(Easing.cubic) });
      }}
      hitSlop={grouped ? { top: 10, bottom: 10, left: 1, right: 1 } : 12}
      style={[styles.hit, { width: hitWidth, height: Math.max(44, size + 16), marginLeft: gap }]}>
      <Animated.View pointerEvents="none" style={[styles.halo, { width: halo, height: halo }, haloStyle]}>
        <BeatlinePart source={BEATLINE_ASSETS.halo} circular fill={0.92} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bloom,
          { backgroundColor: index === 0 ? downbeatColor : accentColor },
          bloomStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: skin === 'parts' ? (groupStart ? 56 : 42) : size,
            height: skin === 'parts' ? 32 : size,
            alignItems: 'center',
            justifyContent: 'flex-end',
          },
          bodyStyle,
        ]}>
        {skin === 'master' && !grouped ? null : skin === 'parts' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 13,
              backgroundColor: '#141618',
              borderWidth: 1,
              borderTopColor: '#C8C2B4',
              borderBottomColor: '#000',
              overflow: 'hidden',
            }}
          />
        ) : (
          <BeatlinePart source={BEATLINE_ASSETS.node} circular fill={groupStart ? 1.18 : 1.22} style={StyleSheet.absoluteFill} />
        )}
        <Animated.View
          style={
            skin === 'parts'
              ? [styles.capsuleFill, capsuleStyle]
              : [styles.fill, fillStyle]
          }
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  meta: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  metaText: {
    color: P2.inkDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  rail: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#101214',
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: '#3A3E42',
    borderBottomColor: '#000',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  railGrouped: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  railMaster: {
    minHeight: 0,
    height: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  seat: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  housing: {
    ...StyleSheet.absoluteFillObject,
  },
  spine: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0A0C0E',
    borderTopWidth: 1,
    borderTopColor: '#6A7076',
    borderBottomWidth: 3,
    borderBottomColor: '#000',
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  halo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloom: {
    position: 'absolute',
  },
  fill: {},
  capsuleFill: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.88,
  },
});

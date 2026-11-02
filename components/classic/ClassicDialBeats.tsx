import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LoopArrows } from '@/components/classic/ShellIcons';
import { NorthStarImage, northStar } from '@/components/classic/north-star-assets';
import { TIME_SIGNATURES } from '@/constants/meter';
import { accentStrength, cycleAccent } from '@/lib/accents';
import { beatCoverProgress, beatCoverShift } from '@/lib/beat-cover';
import { beatControlMetrics } from '@/lib/beat-row-metrics';
import { hapticEvent, hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';
import { BEAT_ACCENT_STATES, beatGroupsFor, beatRoleLabel } from '@/lib/instrument-beat';
import { proofFlags } from '@/lib/proof-flags';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';
import type { PhrasePhase } from '@/lib/phrase-deck';

type Props = {
  timeSignature: TimeSignatureId;
  beatIndex: number;
  playing: boolean;
  silent?: boolean;
  accentPattern: AccentLevel[];
  compact?: boolean;
  width?: number;
  height?: number;
  facade?: boolean;
  initiallyOpen?: boolean;
  concealed?: boolean;
  /** Scales the beat and loop artwork inside the existing controls. */
  shellScale?: number;
  onToggleCover?: () => void;
  onChange?: (pattern: AccentLevel[]) => void;
  deck?: {
    phase: PhrasePhase;
    loop: boolean;
    progress?: number;
    elapsed?: number;
    duration?: number;
    onRecord: () => void;
    onReplace: () => void;
    onTransport: () => void;
    onLoop: () => void;
    onScrub?: (ratio: number, release: boolean) => void;
    onClear?: () => void;
  };
  proof?: 'beats' | 'flip' | 'deck';
  onMode?: (mode: 'beats' | 'deck') => void;
};

function spokenAccent(level: AccentLevel, downbeat: boolean): string {
  const state = BEAT_ACCENT_STATES.find(
    (item) => item.level === level || (level === 'accent' && item.level === 'strong')
  );
  return state?.label ?? beatRoleLabel(level, downbeat);
}

export function ClassicDialBeats({
  timeSignature,
  beatIndex,
  playing,
  silent = false,
  accentPattern,
  compact = false,
  width = 320,
  height = 108,
  concealed = false,
  shellScale = 1,
  onToggleCover,
  onChange,
  onMode,
}: Props) {
  const memory = useRef<Partial<Record<TimeSignatureId, AccentLevel[]>>>({});
  const lastMeter = useRef(timeSignature);
  const meter = TIME_SIGNATURES[timeSignature];
  const count = Math.max(1, meter?.beatsPerMeasure ?? accentPattern.length ?? 4);
  const groups = beatGroupsFor(timeSignature);
  const stacked = count > 8;
  const columns = stacked ? Math.ceil(count / 2) : count;
  const labelH = Math.max(14, Math.round(Math.min(height, 120) * (stacked ? 0.12 : 0.16)));
  const innerW = Math.max(96, width - 32);
  const metrics = beatControlMetrics(count, innerW, Math.max(36, height - labelH), groups.length);
  let solved = Math.floor((innerW - 2 * Math.max(0, columns - 1)) / (columns + 1.05));
  if (!stacked) {
    for (let pass = 0; pass < 6; pass += 1) {
      const lamp = Math.max(36, Math.round(solved * 0.5));
      const loop = Math.max(56, Math.round(solved * 1.12));
      const used = 24 + 8 + lamp + loop + 2 * Math.max(0, columns - 1);
      solved = Math.max(28, Math.floor((width - used) / Math.max(1, columns)));
    }
  }
  const diameter = Math.max(28, Math.min(height - labelH - (compact ? 4 : 6), stacked ? metrics.diameter : solved, 72));
  const shellBox = Math.max(28, Math.round(56 * (shellScale / 1.16)));
  const numeralPx = Math.max(8, Math.round(11 * (shellScale / 1.16)));
  const side = Math.max(36, Math.round(diameter * 0.52));
  const lampPx = Math.max(16, Math.min(side - 6, Math.round(36 * (shellScale / 1.16))));
  const loopW = Math.max(56, Math.round(diameter * 1.08));
  const [cavity, setCavity] = useState(0);
  const cavityWidth = useSharedValue(0);
  const proofCover =
    proofFlags.beatCover === 'off' ? 1 : proofFlags.beatCover === 'mid' ? 0.5 : proofFlags.beatCover === 'on' ? 0 : null;
  const progress = beatCoverProgress(concealed, proofCover);
  const travel = useSharedValue(progress);

  useEffect(() => {
    memory.current[timeSignature] = accentPattern.slice();
  }, [accentPattern, timeSignature]);

  useEffect(() => {
    if (lastMeter.current === timeSignature) return;
    lastMeter.current = timeSignature;
    const remembered = memory.current[timeSignature];
    if (remembered && onChange && remembered.length === count) onChange(remembered);
  }, [count, onChange, timeSignature]);

  useEffect(() => {
    cavityWidth.value = cavity;
  }, [cavity, cavityWidth]);

  useEffect(() => {
    if (proofCover != null) {
      travel.value = proofCover;
      return;
    }
    travel.value = withTiming(concealed ? 1 : 0, { duration: 220 });
  }, [concealed, proofCover, travel]);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: beatCoverShift(travel.value, cavityWidth.value) }],
  }));

  const cycle = (index: number) => {
    if (!onChange || progress > 0.5) return;
    const level = accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
    const nextLevel = cycleAccent(level);
    const next = Array.from({ length: count }, (_, slot) => accentPattern[slot] ?? (slot === 0 ? 'strong' : 'normal'));
    next[index] = nextLevel;
    memory.current[timeSignature] = next;
    const strength = accentStrength(nextLevel);
    if (strength === 0) void hapticLight();
    else if (strength === 1) void hapticSelection();
    else void hapticMedium();
    onChange(next);
  };

  const cells = Array.from({ length: count }, (_, index) => {
    const level = accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
    const strength = accentStrength(level);
    const current = playing && !silent && beatIndex === index;
    const ink = strength === 0 ? 0.45 : strength === 1 ? 0.5 : strength === 2 ? 0.78 : 1;
    return (
      <Pressable
        key={index}
        accessibilityRole="button"
        accessibilityLabel={`Beat ${index + 1}, ${spokenAccent(level, index === 0)}`}
        hitSlop={count >= 8 ? 2 : 4}
        onPress={() => cycle(index)}
        testID={`beat-cell-${index}`}
        style={[styles.cell, { maxWidth: diameter + 6 }, shellScale !== 1 && { gap: 1 }]}>
        <View
          style={[
            styles.well,
            { width: diameter, height: diameter, maxHeight: diameter },
            strength === 0 && styles.bubbleMute,
            strength === 1 && styles.bubbleSoft,
            strength === 2 && styles.bubbleNormal,
            strength === 3 && styles.bubbleStrong,
            current && styles.beatFlash,
            current && styles.halo,
            { overflow: shellScale === 1 ? 'hidden' : 'visible' },
          ]}>
          <View
            pointerEvents="none"
            style={
              shellScale === 1
                ? StyleSheet.absoluteFill
                : {
                    position: 'absolute',
                    left: (diameter - shellBox) / 2,
                    top: (diameter - shellBox) / 2,
                    width: shellBox,
                    height: shellBox,
                    overflow: 'hidden',
                    borderRadius: 28,
                  }
            }>
            <NorthStarImage source={northStar.beatShell} mode="stretch" />
          </View>
          <View
            pointerEvents="none"
            style={
              shellScale === 1
                ? StyleSheet.absoluteFill
                : {
                    position: 'absolute',
                    left: (diameter - (strength >= 3 ? shellBox * 0.79 : strength === 2 ? shellBox * 0.46 : shellBox * 0.36)) / 2,
                    top: (diameter - (strength >= 3 ? shellBox * 0.79 : strength === 2 ? shellBox * 0.46 : shellBox * 0.36)) / 2,
                    width: strength >= 3 ? shellBox * 0.79 : strength === 2 ? shellBox * 0.46 : shellBox * 0.36,
                    height: strength >= 3 ? shellBox * 0.79 : strength === 2 ? shellBox * 0.46 : shellBox * 0.36,
                    overflow: 'hidden',
                    borderRadius: 999,
                    opacity: strength === 0 ? 0 : strength === 1 ? 0.7 : strength === 2 ? 0.88 : 1,
                  }
            }>
          {shellScale === 1 && strength === 1 ? <NorthStarImage source={northStar.beatGlowSoft} mode="stretch" bleed={0.22} /> : null}
          {shellScale === 1 && strength === 2 ? <NorthStarImage source={northStar.beatGlowNormal} mode="stretch" bleed={0.28} /> : null}
          {shellScale === 1 && strength === 2 ? <NorthStarImage source={northStar.beatGlowNormal} mode="stretch" bleed={0.28} /> : null}
          {shellScale === 1 && strength === 3 ? <NorthStarImage source={northStar.beatGlowStrong} mode="stretch" bleed={0.34} /> : null}
          {shellScale === 1 && strength === 3 ? <NorthStarImage source={northStar.beatGlowStrong} mode="stretch" bleed={0.34} /> : null}
          {shellScale !== 1 && strength === 1 ? <NorthStarImage source={northStar.beatGlowSoft} mode="stretch" bleed={0.45} /> : null}
          {shellScale !== 1 && strength === 2 ? <NorthStarImage source={northStar.beatGlowNormal} mode="stretch" bleed={0.45} /> : null}
          {shellScale !== 1 && strength >= 3 ? <NorthStarImage source={northStar.beatGlowStrong} mode="stretch" bleed={1.15} /> : null}
          {current ? <NorthStarImage source={northStar.beatGlowCurrent} mode="stretch" bleed={shellScale === 1 ? 0.2 : 0.05} /> : null}
          </View>
        </View>
        <Text
          style={[
            styles.numeral,
            {
              color: `rgba(243, 230, 200, ${ink})`,
              fontSize: shellScale === 1 ? Math.max(16, Math.round(diameter * 0.42)) : numeralPx,
              lineHeight: shellScale === 1 ? undefined : numeralPx,
              fontWeight: shellScale === 1 ? '700' : '600',
            },
          ]}
          allowFontScaling={false}>
          {index + 1}
        </Text>
      </Pressable>
    );
  });

  const rows = stacked ? [cells.slice(0, columns), cells.slice(columns)] : [cells];
  const [loopHeld, setLoopHeld] = useState(false);
  const loopDown = loopHeld || proofFlags.loopDown;

  return (
    <View style={styles.root} testID="classic-dial-beats" accessibilityLabel="BEATS">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={progress > 0.5 ? 'Show beats' : 'Hide beats'}
        accessibilityState={{ selected: progress < 0.5 }}
        onPress={() => {
          void hapticEvent('selector');
          onToggleCover?.();
        }}
        testID="beat-visibility"
        style={[styles.lamp, { width: side, height: Math.max(44, diameter), overflow: 'visible' }]}>
        <NorthStarImage source={northStar.visibilityShell} mode="stretch" />
        <View
          pointerEvents="none"
          style={[
            styles.lampLed,
            shellScale !== 1 && {
              width: lampPx,
              height: lampPx,
              borderRadius: lampPx / 2,
              overflow: 'hidden',
              left: (side - lampPx) / 2,
              top: Math.max(0, (Math.max(44, diameter) - lampPx) / 2),
            },
          ]}>
          <NorthStarImage source={progress > 0.5 ? northStar.lampDim : northStar.lampOn} bleed={shellScale === 1 ? 0 : 0.72} />
        </View>
      </Pressable>
      <View
        style={styles.cavity}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.width;
          setCavity((prev) => (prev === next ? prev : next));
        }}>
        <View style={styles.rowWrap}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row}
            </View>
          ))}
        </View>
        <Animated.View pointerEvents="none" style={[styles.cover, coverStyle]}>
          <NorthStarImage source={northStar.cover} mode="stretch" />
        </Animated.View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="LOOP"
        testID="beat-row-deck"
        hitSlop={4}
        onPressIn={() => setLoopHeld(true)}
        onPressOut={() => setLoopHeld(false)}
        onPress={() => {
          void hapticEvent('selector');
          onMode?.('deck');
        }}
        style={({ pressed }) => [
          styles.loopKey,
          { width: loopW, height: Math.max(52, Math.min(height - 8, Math.round(loopW * 1.02))) },
          (pressed || loopDown) && styles.loopDown,
        ]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <NorthStarImage source={loopDown ? northStar.loopPressed : northStar.loopRest} mode="stretch" />
        </View>
        <View pointerEvents="none" style={styles.loopFace}>
          <LoopArrows size={Math.max(22, Math.round(loopW * 0.52))} />
          <Text style={styles.loopWord} allowFontScaling={false}>
            LOOP
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  lamp: {
    width: 42,
    minHeight: 44,
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  cavity: {
    flex: 1,
    minHeight: 44,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rowWrap: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  cell: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  well: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 96,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubbleMute: {},
  bubbleSoft: {},
  bubbleNormal: {},
  bubbleStrong: {},
  beatFlash: {},
  halo: {},
  lampLed: {
    position: 'absolute',
    width: '42%',
    aspectRatio: 1,
    left: '29%',
    top: '29%',
  },
  numeral: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  loopKey: {
    width: 54,
    minHeight: 44,
    alignSelf: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  loopDown: {
    transform: [{ translateY: 1 }],
  },
  loopFace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  loopWord: {
    color: '#E7D3A8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});

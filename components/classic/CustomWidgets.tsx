import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { TunerGlyph } from '@/components/brand/TunerGlyph';
import { GlassPlayOrb } from '@/components/classic/GlassPlayOrb';
import { accentStrength, cycleBeatBlock } from '@/lib/accents';
import type { AccentLevel } from '@/lib/types';
import {
  CUSTOM_WIDGET_META,
  type CustomBeatStyle,
  type CustomMeterStyle,
  type CustomPlayStyle,
  type CustomTextStyle,
  type CustomTunerStyle,
  type CustomWidget,
  type CustomWidgetId,
} from '@/lib/custom-layout';
import { formatClock, formatElapsed } from '@/lib/practice-clock';
import { tempoName } from '@/lib/tempo-name';

type Common = {
  compact?: boolean;
  light?: boolean;
  editing?: boolean;
  selected?: boolean;
};

const TEXT_FACE: Record<
  CustomTextStyle,
  { fontWeight: '400' | '500' | '700' | '800'; letter: number; fontFamily?: string; size: number }
> = {
  clean: { fontWeight: '400', letter: -1.6, size: 1 },
  tech: { fontWeight: '500', letter: 2.6, fontFamily: 'Menlo', size: 0.82 },
  classic: { fontWeight: '500', letter: 0.4, fontFamily: 'Georgia', size: 0.94 },
  bold: { fontWeight: '800', letter: -2.4, size: 1.12 },
};

export function CustomWidgetFace({
  id,
  bpm,
  playing,
  timeSignature,
  pulse,
  pulseRole,
  light,
  editing,
  selected,
  scale = 1,
  textStyle = 'clean',
  beatStyle = 'dot',
  playStyle = 'vinyl',
  meterStyle = 'inline',
  tunerStyle = 'fork',
  clockLabel,
  timerLabel,
  timerRunning,
  beatIndex = 0,
  beatCount = 4,
  recorderLabel,
  recorderHot,
  accentPattern,
  onChangeAccents,
  onBpm,
  onPlay,
  onMeter,
  onTap,
  onTuner,
  onSound,
  onTimer,
  onRecorder,
}: Common & {
  id: CustomWidgetId;
  bpm: number;
  playing: boolean;
  timeSignature: string;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  scale?: number;
  textStyle?: CustomTextStyle;
  beatStyle?: CustomBeatStyle;
  playStyle?: CustomPlayStyle;
  meterStyle?: CustomMeterStyle;
  tunerStyle?: CustomTunerStyle;
  clockLabel?: string;
  timerLabel?: string;
  timerRunning?: boolean;
  beatIndex?: number;
  beatCount?: number;
  recorderLabel?: string;
  recorderHot?: boolean;
  accentPattern?: AccentLevel[];
  onChangeAccents?: (pattern: AccentLevel[]) => void;
  onBpm?: () => void;
  onPlay?: () => void;
  onMeter?: () => void;
  onTap?: (pageX: number, pageY: number) => void;
  onTuner?: () => void;
  onSound?: () => void;
  onTimer?: () => void;
  onRecorder?: () => void;
}) {
  const plate = light ? styles.plateLight : styles.plateDark;
  const ink = light ? styles.inkDark : styles.inkLight;
  const muted = light ? styles.mutedDark : styles.mutedLight;
  const ring = selected ? styles.selected : null;
  const meta = CUSTOM_WIDGET_META[id];
  const face = TEXT_FACE[textStyle];

  if (id === 'bpm') {
    return (
      <Pressable
        disabled={editing}
        onPress={onBpm}
        accessibilityRole="button"
        accessibilityLabel={`${meta.a11y}. Tempo ${bpm}`}
        style={[styles.bpm, plate, ring, { width: '100%', height: '100%', minWidth: 0, minHeight: 0 }]}>
        <Text
          style={[
            styles.bpmNum,
            ink,
            {
              fontWeight: face.fontWeight,
              letterSpacing: face.letter,
              fontFamily: face.fontFamily,
              fontSize: 56 * face.size * scale,
            },
          ]}
          allowFontScaling={false}>
          {bpm}
        </Text>
        <Text style={[styles.mark, muted, { fontSize: Math.max(9, 11 * scale) }]}>{tempoName(bpm)}</Text>
      </Pressable>
    );
  }

  if (id === 'play') {
    return (
      <View style={[styles.playWrap, ring]} pointerEvents={editing ? 'none' : 'auto'}>
        <PlayFace playing={playing} styleId={playStyle} scale={scale} light={light} pulse={pulse} onPress={() => onPlay?.()} />
      </View>
    );
  }

  if (id === 'beat') {
    const blocks = beatStyle === 'blocks';
    return (
      <View
        accessible
        accessibilityLabel={meta.a11y}
        style={[styles.beat, beatStyle === 'blocks' ? null : plate, ring, { width: '100%', height: '100%', borderRadius: beatStyle === 'blocks' ? 8 : 999 }]}
        pointerEvents={blocks && !editing ? 'auto' : 'none'}>
        <BeatFace
          pulse={pulse}
          pulseRole={pulseRole}
          playing={playing}
          light={light}
          styleId={beatStyle}
          scale={scale}
          beatIndex={beatIndex}
          beatCount={beatCount}
          accentPattern={accentPattern}
          editing={editing}
          onCycle={(index) => {
            if (!onChangeAccents) return;
            const current = accentPattern?.[index] ?? 'normal';
            const next = [...(accentPattern ?? Array.from({ length: beatCount }, () => 'normal' as AccentLevel))];
            next[index] = cycleBeatBlock(current);
            onChangeAccents(next);
          }}
        />
      </View>
    );
  }

  if (id === 'meter') {
    const [num, den] = timeSignature.split('/');
    return (
      <Pressable
        disabled={editing}
        onPress={onMeter}
        accessibilityRole="button"
        accessibilityLabel={`${meta.a11y}. ${timeSignature}`}
        style={[
          styles.chip,
          meterStyle === 'badge' ? styles.meterBadge : plate,
          meterStyle === 'minimal' && styles.meterBare,
          ring,
          { width: '100%', height: '100%', minWidth: 0 },
        ]}>
        {meterStyle === 'minimal' ? null : <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]}>METER</Text>}
        {meterStyle === 'stacked' ? (
          <View style={styles.meterStack}>
            <Text style={[styles.chipValue, ink, { fontSize: 20 * face.size * scale }]}>{num}</Text>
            <View style={[styles.meterRule, { backgroundColor: light ? 'rgba(22,18,14,0.4)' : 'rgba(246,240,228,0.4)' }]} />
            <Text style={[styles.chipValue, ink, { fontSize: 20 * face.size * scale }]}>{den}</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.chipValue,
              ink,
              {
                fontWeight: face.fontWeight,
                fontFamily: face.fontFamily,
                letterSpacing: face.letter,
                fontSize: 18 * face.size * scale,
              },
            ]}>
            {num}/{den}
          </Text>
        )}
      </Pressable>
    );
  }

  if (id === 'clock') {
    return (
      <ClockFace
        a11y={meta.a11y}
        plate={plate}
        ring={ring}
        ink={ink}
        muted={muted}
        face={face}
        clockLabel={clockLabel}
        scale={scale}
      />
    );
  }

  if (id === 'timer') {
    return (
      <Pressable
        disabled={editing}
        onPress={onTimer}
        accessibilityRole="button"
        accessibilityLabel={`${meta.a11y}. ${timerLabel ?? '0:00'}`}
        style={[styles.chip, plate, ring, { width: '100%', height: '100%', minWidth: 0 }]}>
        <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]}>
          {timerRunning ? 'PRACTICE' : 'RESET'}
        </Text>
        <Text style={[styles.chipValue, ink, { fontSize: 22 * scale }]}>{timerLabel ?? '0:00'}</Text>
      </Pressable>
    );
  }

  if (id === 'tuner') {
    return (
      <Pressable
        disabled={editing}
        onPress={onTuner}
        accessibilityRole="button"
        accessibilityLabel={meta.a11y}
        style={[styles.chip, plate, ring, { width: '100%', height: '100%', minWidth: 0 }]}>
        <TunerMark styleId={tunerStyle} scale={scale} light={light} />
        <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]}>TUNER</Text>
      </Pressable>
    );
  }

  if (id === 'sound') {
    return (
      <Pressable
        disabled={editing}
        onPress={onSound}
        accessibilityRole="button"
        accessibilityLabel={meta.a11y}
        style={[styles.chip, plate, ring, { width: '100%', height: '100%', minWidth: 0 }]}>
        <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]}>SOUND</Text>
        <Text style={[styles.chipValue, ink, { fontSize: Math.max(11, 13 * scale) }]} numberOfLines={1}>
          ♪
        </Text>
      </Pressable>
    );
  }

  if (id === 'recorder') {
    const tiny = scale < 0.72;
    const status = recorderHot ? (tiny ? 'REC' : 'RECORDING') : recorderLabel === 'PLAYBACK' ? (tiny ? 'PLAY' : 'PLAYBACK') : 'READY';
    return (
      <Pressable
        disabled={editing}
        onPress={onRecorder}
        accessibilityRole="button"
        accessibilityLabel={meta.a11y}
        style={[styles.chip, plate, ring, { width: '100%', height: '100%', minWidth: 0 }]}>
        <View style={[styles.recDot, recorderHot && styles.recDotHot, { width: 18 * scale, height: 18 * scale, borderRadius: 9 * scale }]} />
        {scale >= 0.62 ? (
          <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]} numberOfLines={1} adjustsFontSizeToFit>
            RECORDER
          </Text>
        ) : null}
        <Text
          style={[styles.chipValue, ink, { fontSize: Math.max(9, (tiny ? 11 : 13) * scale) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}>
          {status}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={editing}
      onPress={(event) => onTap?.(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      accessibilityRole="button"
      accessibilityLabel={meta.a11y}
      style={[styles.chip, plate, ring, { width: '100%', height: '100%', minWidth: 0 }]}>
      <Text style={[styles.chipValue, ink, { fontSize: 16 * scale }]}>TAP</Text>
    </Pressable>
  );
}

function ClockFace({
  a11y,
  plate,
  ring,
  ink,
  muted,
  face,
  clockLabel,
  scale,
}: {
  a11y: string;
  plate: StyleProp<ViewStyle>;
  ring: StyleProp<ViewStyle>;
  ink: StyleProp<TextStyle>;
  muted: StyleProp<TextStyle>;
  face: (typeof TEXT_FACE)[CustomTextStyle];
  clockLabel?: string;
  scale: number;
}) {
  const live = useLiveClock();
  const label = clockLabel ?? live;
  return (
    <View
      accessible
      accessibilityLabel={`${a11y}. ${label}`}
        style={[styles.chip, plate, ring, { minWidth: 0, width: '100%', height: '100%', overflow: 'visible', paddingHorizontal: 8 }]}
        pointerEvents="none">
      <Text style={[styles.chipKicker, muted, { fontSize: Math.max(8, 9 * scale) }]}>TIME</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        style={[
          styles.chipValue,
          ink,
          {
            fontWeight: face.fontWeight,
            fontFamily: face.fontFamily,
            letterSpacing: face.letter,
            fontSize: 28 * face.size * scale,
            includeFontPadding: false,
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function useLiveClock(): string {
  const [label, setLabel] = useState(() => formatClock(new Date()));
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const align = () => setLabel(formatClock(new Date()));
    align();
    const wait = 60000 - (Date.now() % 60000) + 20;
    const start = setTimeout(() => {
      align();
      interval = setInterval(align, 60000);
    }, wait);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, []);
  return label;
}

export function formatTimerMs(ms: number): string {
  return formatElapsed(ms);
}

function BeatFace({
  pulse,
  pulseRole,
  playing,
  light,
  styleId,
  scale,
  beatIndex,
  beatCount,
  accentPattern,
  editing,
  onCycle,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  light?: boolean;
  styleId: CustomBeatStyle;
  scale: number;
  beatIndex: number;
  beatCount: number;
  accentPattern?: AccentLevel[];
  editing?: boolean;
  onCycle?: (index: number) => void;
}) {
  const style = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.28, transform: [{ scale: 0.92 }] };
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.22, down ? 1 : 0.72]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.9, down ? 1.12 : 1.02]) }],
    };
  });
  const color = light ? '#8A5A22' : '#E8C878';
  const unit = 42 * scale;
  if (styleId === 'ring') {
    return (
      <Animated.View
        style={[
          styles.ringWide,
          { borderColor: color, width: unit * 1.8, height: unit * 1.8, borderRadius: unit * 0.9, borderWidth: Math.max(2, 3 * scale) },
          style,
        ]}
      />
    );
  }
  if (styleId === 'electricity') {
    return <ElectricityFace pulse={pulse} pulseRole={pulseRole} playing={playing} color={color} unit={unit} />;
  }
  if (styleId === 'blocks') {
    const count = Math.min(8, Math.max(1, beatCount));
    return (
      <View style={styles.blocks}>
        {Array.from({ length: count }, (_, index) => {
          const level = accentPattern ? accentStrength(accentPattern[index] ?? 'normal') : index === 0 ? 3 : 2;
          const h = unit * (0.28 + level * 0.28);
          const current = index === beatIndex % count && playing;
          return (
            <Pressable
              key={`blk-${index}`}
              disabled={editing}
              onPress={() => onCycle?.(index)}
              accessibilityRole="button"
              accessibilityLabel={`Beat ${index + 1} accent`}
              hitSlop={6}
              style={[styles.blockHit, { minWidth: 28, minHeight: 44 }]}>
              <View
                style={[
                  styles.blockCell,
                  {
                    backgroundColor: color,
                    width: Math.max(12, 14 * scale),
                    height: current ? h * 1.12 : h,
                    opacity: level === 0 ? 0.18 : current ? 1 : 0.55,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <Animated.View
      style={[styles.orb, { backgroundColor: color, width: unit, height: unit, borderRadius: unit / 2 }, style]}
    />
  );
}

function ElectricityFace({
  pulse,
  pulseRole,
  playing,
  color,
  unit,
}: {
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  playing: boolean;
  color: string;
  unit: number;
}) {
  const bolt = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.16, transform: [{ scaleY: 0.4 }] };
    return {
      opacity: interpolate(pulse.value, [0, 0.18, 1], [0.12, 1, 0.08]),
      transform: [{ scaleY: interpolate(pulse.value, [0, 0.2, 1], [0.35, 1.18, 0.42]) }],
    };
  });
  const core = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.35, transform: [{ scale: 0.86 }] };
    const down = pulseRole.value >= 1.5;
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.4, down ? 1 : 0.82]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.88, down ? 1.16 : 1.04]) }],
    };
  });
  const arm = Math.max(10, unit * 0.55);
  return (
    <View style={{ width: unit * 2.1, height: unit * 2.1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 3, height: arm * 1.6, backgroundColor: color, borderRadius: 2 }, bolt]} />
      <Animated.View
        style={[
          { position: 'absolute', width: arm * 1.4, height: 2, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '28deg' }] },
          bolt,
        ]}
      />
      <Animated.View
        style={[
          { position: 'absolute', width: arm * 1.15, height: 2, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '-34deg' }] },
          bolt,
        ]}
      />
      <Animated.View
        style={[
          { width: Math.max(10, unit * 0.42), height: Math.max(10, unit * 0.42), borderRadius: 999, backgroundColor: color },
          core,
        ]}
      />
    </View>
  );
}

function PlayFace({
  playing,
  styleId,
  scale,
  light,
  pulse,
  onPress,
}: {
  playing: boolean;
  styleId: CustomPlayStyle;
  scale: number;
  light?: boolean;
  pulse: SharedValue<number>;
  onPress: () => void;
}) {
  if (styleId === 'vinyl') {
    return <GlassPlayOrb playing={playing} onPress={onPress} pulse={pulse} size={Math.round(88 * scale)} />;
  }
  if (styleId === 'neon') {
    const size = Math.round(52 * scale);
    const width = Math.round(118 * scale);
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause' : 'Play'}
        style={{
          width,
          height: size,
          borderRadius: size / 2,
          padding: 4,
          justifyContent: 'center',
          backgroundColor: light ? 'rgba(12,10,16,0.78)' : 'rgba(6,6,10,0.82)',
          borderWidth: 1,
          borderColor: playing ? '#7AE8FF' : 'rgba(122,232,255,0.35)',
        }}>
        <View
          style={{
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            backgroundColor: playing ? '#7AE8FF' : 'rgba(122,232,255,0.28)',
            alignSelf: playing ? 'flex-end' : 'flex-start',
            shadowColor: '#7AE8FF',
            shadowOpacity: playing ? 0.9 : 0.2,
            shadowRadius: playing ? 10 : 4,
          }}
        />
      </Pressable>
    );
  }
  const size = Math.round((styleId === 'pill' ? 56 : 72) * scale);
  const width = styleId === 'pill' ? Math.round(120 * scale) : size;
  const radius = styleId === 'square' ? 16 : styleId === 'pill' ? size / 2 : size / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={[
        styles.playAlt,
        {
          width,
          height: size,
          borderRadius: radius,
          backgroundColor: light ? 'rgba(246,240,228,0.78)' : 'rgba(8,8,10,0.55)',
          borderColor: light ? 'rgba(22,18,14,0.2)' : 'rgba(246,240,228,0.22)',
        },
      ]}>
      {playing ? (
        <View style={[styles.playPause, { backgroundColor: light ? '#16120E' : '#F6F0E4' }]} />
      ) : (
        <View style={[styles.playTri, { borderLeftColor: light ? '#16120E' : '#F6F0E4' }]} />
      )}
    </Pressable>
  );
}

function TunerMark({ styleId, scale, light }: { styleId: CustomTunerStyle; scale: number; light?: boolean }) {
  const ink = light ? '#8A5A22' : '#E8C878';
  if (styleId === 'meter') {
    return <TunerGlyph width={46 * scale} height={22 * scale} />;
  }
  if (styleId === 'note') {
    return (
      <View style={styles.tunerNoteWrap}>
        <Text style={[styles.tunerNote, { color: ink, fontSize: 28 * scale }]}>A</Text>
        <View style={[styles.tunerTarget, { borderColor: ink, width: 22 * scale, height: 22 * scale, borderRadius: 11 * scale }]} />
      </View>
    );
  }
  return (
    <View style={[styles.fork, { width: 22 * scale, height: 32 * scale }]}>
      <View style={[styles.forkTine, { backgroundColor: ink }]} />
      <View style={[styles.forkTine, { backgroundColor: ink }]} />
      <View style={[styles.forkStem, { backgroundColor: ink }]} />
    </View>
  );
}

export function widgetFromLayout(widget: CustomWidget) {
  return widget;
}

const styles = StyleSheet.create({
  plateDark: {
    backgroundColor: 'rgba(8,8,10,0.42)',
    borderColor: 'rgba(246,240,228,0.18)',
  },
  plateLight: {
    backgroundColor: 'rgba(246,240,228,0.78)',
    borderColor: 'rgba(20,16,12,0.16)',
  },
  inkLight: {
    color: '#F6F0E4',
  },
  inkDark: {
    color: '#16120E',
  },
  mutedLight: {
    color: 'rgba(246,240,228,0.7)',
  },
  mutedDark: {
    color: 'rgba(40,32,24,0.62)',
  },
  selected: {
    borderColor: '#E8C878',
    borderWidth: 1.5,
  },
  bpm: {
    minWidth: 168,
    minHeight: 92,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  bpmNum: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    textAlign: 'center',
  },
  mark: {
    marginTop: -2,
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  playWrap: {
    borderRadius: 48,
  },
  beat: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  bar: {
    width: 28,
    height: 6,
    borderRadius: 3,
  },
  ringWide: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
  barWide: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  blocks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
    height: '100%',
  },
  blockHit: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 28,
    minHeight: 44,
  },
  blockCell: {
    borderRadius: 3,
  },
  block: {
    width: 6,
    height: 16,
    borderRadius: 1,
  },
  blockTall: {
    width: 7,
    height: 20,
    borderRadius: 1,
  },
  chip: {
    minWidth: 80,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipKicker: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  chipValue: {
    fontSize: 14,
    letterSpacing: 1.4,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  meterBadge: {
    backgroundColor: 'rgba(8,8,10,0.62)',
    borderColor: 'rgba(232,200,120,0.35)',
    borderRadius: 12,
  },
  meterBare: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  meterStack: {
    alignItems: 'center',
    gap: 2,
  },
  meterRule: {
    width: 22,
    height: 1,
  },
  playAlt: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  playTri: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderLeftWidth: 14,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  playPause: {
    width: 14,
    height: 14,
  },
  recDot: {
    backgroundColor: 'rgba(196,40,40,0.55)',
    marginBottom: 4,
  },
  recDotHot: {
    backgroundColor: '#C42828',
  },
  barTall: {
    width: 12,
    height: 40,
    borderRadius: 3,
  },
  fork: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: 4,
  },
  forkTine: {
    width: 3,
    height: 18,
    borderRadius: 1,
  },
  forkStem: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 12,
    borderRadius: 1,
  },
  tunerMeter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  tunerArc: {
    width: 36,
    height: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2,
    borderBottomWidth: 0,
  },
  tunerNeedle: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    height: 16,
  },
  tunerNoteWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tunerNote: {
    fontWeight: '800',
    letterSpacing: 1,
  },
  tunerTarget: {
    position: 'absolute',
    borderWidth: 1.5,
    opacity: 0.55,
  },
});

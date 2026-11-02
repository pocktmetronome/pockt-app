import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HorizontalTempoWheel } from '@/components/classic/HorizontalTempoWheel';
import { ProBeatCells } from '@/components/classic/ProBeatCells';
import { SparkField, useSparkField } from '@/components/classic/TapSparkLayer';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { nextProView, PRO_REST_FILL } from '@/constants/display';
import { SUBDIVISION_ORDER, SUBDIVISIONS, TIME_SIGNATURES } from '@/constants/meter';
import { sanitizeBpm } from '@/constants/timing';
import { usePendulumPhase } from '@/hooks/use-pendulum-phase';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import { accentStrength, restoreDefaultMeter } from '@/lib/accents';
import { proModuleRows } from '@/lib/face-geometry';
import { tempoName } from '@/lib/tempo-name';
import type { AccentLevel, SubdivisionId } from '@/lib/types';
import type { ProViewId } from '@/constants/display';

export function ProRoom({
  config,
  prefs,
  compact,
  playing,
  transport,
  pulse,
  pulseRole,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  setBpm,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenSound,
  onOpenAccents,
  onOpenPresets,
  onOpenPractice,
  onOpenSetlists,
  onHapticToggle,
  onChangeAccents,
  onUpdate,
  onDisplayPrefsChange,
  viewport,
  frame,
}: ClassicInstrumentProps & { viewport?: number; frame?: { width: number; height: number } }) {
  const window = useWindowDimensions();
  const width = viewport ?? window.width;
  const safeBpm = sanitizeBpm(config.bpm);
  const sparks = useSparkField();
  const [subOpen, setSubOpen] = useState(false);
  const view = prefs.proView;
  const viewLabel =
    view === 'pendulum' ? 'PENDULUM' : view === 'all' ? 'BEAT ONLY' : view === 'subaccents' ? 'ACCENTS' : 'ACCENTS ONLY';
  const proRows = proModuleRows(TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4);
  const faceW = frame?.width ?? width;
  const travel = frame || viewport
    ? Math.round(faceW * (proRows >= 3 ? 0.72 : proRows === 2 ? 0.8 : 0.86))
    : Math.min(width - 48, compact ? 280 : 320);
  const pendulum = usePendulumPhase(
    playing,
    safeBpm,
    pulse,
    1,
    false,
    pulseBeat,
    undefined,
    undefined,
    undefined,
    undefined,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset
  );
  const toastOp = useSharedValue(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState(viewLabel);
  const pendulumStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pendulum.value * (travel / 2 - 22) }],
  }));
  const toastStyle = useAnimatedStyle(() => ({
    opacity: toastOp.value,
  }));

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.02, pulseRole.value >= 1.5 ? 0.08 : 0.04]),
  }));

  const tapAt = (pageX: number, pageY: number) => {
    void hapticTap();
    tapTempo();
    sparks.burst(pageX, pageY);
  };

  const fitted = frame ?? (viewport ? { width: viewport, height: viewport } : null);
  if (fitted) {
    const beatCount = TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4;
    const rows = proModuleRows(beatCount);
    const radius = fitted.width / 2;
    const beatTop = Math.round(fitted.height * (rows >= 3 ? 0.16 : 0.22));
    const beatDist = Math.abs(beatTop + fitted.height * 0.12 - radius);
    const beatChord = 2 * Math.sqrt(Math.max(0, radius * radius - beatDist * beatDist));
    const tray = Math.round(Math.min(fitted.width * 0.9, Math.max(fitted.width * 0.72, beatChord * 0.96)));
    const beatFrame = Math.round(fitted.height * (rows >= 3 ? 0.4 : rows === 2 ? 0.34 : 0.28));
    const wheelBottom = fitted.height - Math.round(fitted.height * 0.16);
    const wheelDist = Math.abs(wheelBottom - radius);
    const wheelChord = 2 * Math.sqrt(Math.max(0, radius * radius - wheelDist * wheelDist));
    const wheelW = Math.max(180, Math.round(Math.min(fitted.width * 0.92, wheelChord * 0.98)));
    return (
      <View style={{ width: fitted.width, height: fitted.height, overflow: 'hidden', backgroundColor: '#07080B', justifyContent: 'space-between', alignItems: 'center', paddingTop: beatTop, paddingBottom: Math.round(fitted.height * 0.045) }}>
        <View style={{ width: tray, alignSelf: 'center', backgroundColor: '#101418', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#8A949C', borderBottomWidth: 3, borderBottomColor: '#000' }}>
          <ProBeatCells
            beatIndex={transport.beatIndex}
            playing={playing}
            silent={transport.silentMeasure}
            accentPattern={config.accentPattern}
            timeSignature={config.timeSignature}
            pulse={pulse}
            pulseRole={pulseRole}
            pulseBeat={pulseBeat}
            view="all"
            onChange={onChangeAccents}
            accentColor="#A68448"
            secondaryColor="#E7D3A4"
            strongColor="#F4E7C8"
            frame={beatFrame}
          />
        </View>
        <HorizontalTempoWheel bpm={safeBpm} invert={config.wheelInvert} width={wheelW} height={40} onChange={setBpm} />
      </View>
    );
  }

  return (
    <View style={[styles.root, viewport ? { width: viewport, height: viewport, overflow: 'hidden' } : null]}>
      <SparkField field={sparks} />
      <View style={styles.oled}>
        <LinearGradient colors={['#0C1016', '#05070A']} style={StyleSheet.absoluteFillObject} />
        <Animated.View pointerEvents="none" style={[styles.oledWash, washStyle]} />
        <View style={styles.readout}>
          <Pressable onPress={onOpenPad} style={styles.tempoCol}>
            <Text style={styles.chipLabel}>TEMPO</Text>
            <Text style={styles.oledBpm}>{safeBpm}</Text>
            <Text style={styles.oledName}>{tempoName(safeBpm)}</Text>
          </Pressable>
          <Pressable onPress={onOpenTime} style={styles.metaChip}>
            <Text style={styles.chipLabel}>TIME</Text>
            <Text style={styles.chipValue}>{config.timeSignature}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              void hapticSelection();
              setSubOpen(true);
            }}
            style={styles.metaChip}>
            <Text style={styles.chipLabel}>SUB</Text>
            <Text style={styles.chipValue}>{SUBDIVISIONS[config.subdivision].symbol}</Text>
          </Pressable>
        </View>
        <ProBeatCells
          beatIndex={transport.beatIndex}
          playing={playing}
          silent={transport.silentMeasure}
          accentPattern={config.accentPattern}
          timeSignature={config.timeSignature}
          pulse={pulse}
          pulseRole={pulseRole}
          pulseBeat={pulseBeat}
          view="all"
          onChange={onChangeAccents}
          accentColor={prefs.accentColor}
          secondaryColor={prefs.accentSecondaryColor}
          strongColor={prefs.accentStrongColor}
        />
        <Pressable
          onPress={() => {
            void hapticSelection();
            const next = nextProView(view);
            onDisplayPrefsChange({ proView: next });
            const label =
              next === 'pendulum'
                ? 'PENDULUM'
                : next === 'all'
                  ? 'BEAT ONLY'
                  : next === 'subaccents'
                    ? 'ACCENTS'
                    : 'ACCENTS ONLY';
            setToast(label);
            toastOp.value = 1;
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => {
              toastOp.value = withTiming(0, { duration: 420 });
            }, 700);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Display ${viewLabel}. Cycle view.`}
          style={styles.modeStrip}>
          {view === 'pendulum' ? (
            <View style={[styles.pendulumTrack, { width: travel }]}>
              <View style={styles.pendulumRail} />
              <Animated.View style={[styles.pendulumBar, pendulumStyle]} />
            </View>
          ) : (
            <ProModeLamps
              view={view}
              accentPattern={config.accentPattern}
              beatIndex={transport.beatIndex}
              playing={playing}
              pulse={pulse}
              pulseBeat={pulseBeat}
              accentColor={prefs.accentColor}
              secondaryColor={prefs.accentSecondaryColor}
              strongColor={prefs.accentStrongColor}
            />
          )}
          <Animated.Text pointerEvents="none" style={[styles.modeToast, toastStyle]}>
            {toast}
          </Animated.Text>
        </Pressable>
      </View>

      <View style={styles.dialStage}>
        <HorizontalTempoWheel bpm={safeBpm} invert={config.wheelInvert} width={Math.min(width - 24, 460)} height={66} onChange={setBpm} />
        <View pointerEvents="box-none" style={styles.dialCorners}>
          <View style={[styles.corner, styles.cornerTL]}>
            <ProGlyph name="options-outline" label="ACCENT" compact onPress={onOpenAccents} />
          </View>
          <View style={[styles.corner, styles.cornerTR]}>
            <ProGlyph name="volume-medium-outline" label="SOUND" compact onPress={onOpenSound} />
          </View>
          <View style={[styles.corner, styles.cornerBL]}>
            <ProGlyph name="musical-notes-outline" label="TIME" value={config.timeSignature} compact onPress={onOpenTime} />
          </View>
          <View style={[styles.corner, styles.cornerBR]}>
            <ProGlyph name="flash-outline" label="TAP" compact onPress={(event) => tapAt(event.nativeEvent.pageX, event.nativeEvent.pageY)} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <ProGlyph name="bookmark-outline" label="PRESETS" compact onPress={onOpenPresets} />
          <ProGlyph name="list-outline" label="SETLIST" compact onPress={onOpenSetlists} />
          <ProGlyph name="trending-up-outline" label="TRAIN" compact onPress={onOpenPractice} />
          <ProGlyph
            name={config.haptic ? 'phone-portrait' : 'phone-portrait-outline'}
            label={config.haptic ? 'HAPTIC ON' : 'HAPTIC OFF'}
            compact
            on={config.haptic}
            onPress={onHapticToggle}
          />
        </View>
      </View>

      {subOpen ? (
        <View style={styles.subSheet} pointerEvents="auto">
          <Pressable style={styles.subBackdrop} onPress={() => setSubOpen(false)} />
          <View style={styles.subCard}>
            <View style={styles.subTop}>
              <Text style={styles.subTitle}>SUBDIVISION</Text>
              <Pressable onPress={() => setSubOpen(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Done">
                <Text style={styles.subTitle}>DONE</Text>
              </Pressable>
            </View>
            <View style={styles.subGrid}>
              {SUBDIVISION_ORDER.map((id: SubdivisionId) => {
                const item = SUBDIVISIONS[id];
                const on = config.subdivision === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      void hapticSelection();
                      onUpdate({ subdivision: id });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={[styles.subCell, on && styles.subCellOn]}>
                    <Text style={[styles.subSymbol, on && styles.subOn]}>{item.symbol}</Text>
                    <Text style={[styles.subLabel, on && styles.subOn]}>{item.short.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => {
                void hapticSelection();
                onUpdate(restoreDefaultMeter());
              }}
              accessibilityRole="button"
              accessibilityLabel="Restore default 4/4 quarter"
              style={styles.subRestore}>
              <Text style={styles.subRestoreText}>RESTORE DEFAULT</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ProModeLamps({
  view,
  accentPattern,
  beatIndex,
  playing,
  pulse,
  pulseBeat,
  accentColor,
  secondaryColor,
  strongColor,
}: {
  view: ProViewId;
  accentPattern: AccentLevel[];
  beatIndex: number;
  playing: boolean;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
  accentColor: string;
  secondaryColor: string;
  strongColor: string;
}) {
  return (
    <View style={styles.lamps}>
      {Array.from({ length: 4 }, (_, index) => (
        <ProModeLamp
          key={index}
          index={index}
          strength={accentStrength(accentPattern[index] ?? 'normal')}
          view={view}
          fallbackCurrent={index === beatIndex % 4}
          playing={playing}
          pulse={pulse}
          pulseBeat={pulseBeat}
          accentColor={accentColor}
          secondaryColor={secondaryColor}
          strongColor={strongColor}
        />
      ))}
    </View>
  );
}

function ProModeLamp({
  index,
  strength,
  view,
  fallbackCurrent,
  playing,
  pulse,
  pulseBeat,
  accentColor,
  secondaryColor,
  strongColor,
}: {
  index: number;
  strength: number;
  view: ProViewId;
  fallbackCurrent: boolean;
  playing: boolean;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat: ClassicInstrumentProps['pulseBeat'];
  accentColor: string;
  secondaryColor: string;
  strongColor: string;
}) {
  const allowed = view === 'accent' ? strength >= 2.5 : view === 'subaccents' ? strength >= 1.5 : strength >= 1;
  const hit = strength >= 2.5 ? strongColor : strength >= 1.5 ? secondaryColor : accentColor;
  const style = useAnimatedStyle(() => {
    const current = pulseBeat ? Math.round(pulseBeat.value) % 4 === index : fallbackCurrent;
    const amount = playing && current && allowed ? pulse.value : 0;
    return {
      opacity: interpolate(amount, [0, 1], [allowed ? 0.22 : 0.06, 1]),
      backgroundColor: amount > 0.18 ? hit : PRO_REST_FILL,
    };
  });
  return <Animated.View style={[styles.lamp, style]} />;
}

function ProGlyph({
  name,
  label,
  value,
  onPress,
  compact,
  on,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress: (event: { nativeEvent: { pageX: number; pageY: number } }) => void;
  compact?: boolean;
  on?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label} ${value}` : label}
      style={({ pressed }) => [styles.glyph, compact && styles.glyphCompact, on && styles.glyphOn, pressed && styles.glyphPressed]}>
      <Ionicons name={name} size={compact ? 16 : 20} color={on ? '#7EC8FF' : '#F4F6FA'} />
      <Text style={[styles.glyphLabel, on && styles.glyphLabelOn]}>{label}</Text>
      {value ? <Text style={styles.glyphValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  oled: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(126,200,255,0.16)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  oledWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(80,160,255,0.08)',
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tempoCol: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
  },
  metaChip: {
    minWidth: 64,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  chipLabel: {
    color: 'rgba(224,112,160,0.78)',
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  chipValue: {
    color: '#7EC8FF',
    fontSize: 22,
    fontWeight: '700',
  },
  oledBpm: {
    color: '#7EC8FF',
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
  },
  oledName: {
    marginTop: -2,
    color: 'rgba(126,200,255,0.72)',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dialStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    minHeight: 280,
    width: '100%',
  },
  dialCorners: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  corner: {
    position: 'absolute',
  },
  cornerTL: {
    top: 8,
    left: 4,
  },
  cornerTR: {
    top: 8,
    right: 4,
  },
  cornerBL: {
    bottom: 8,
    left: 4,
  },
  cornerBR: {
    bottom: 8,
    right: 4,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 12,
  },
  glyph: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: 'transparent',
  },
  glyphCompact: {
    minHeight: 44,
    minWidth: 54,
  },
  glyphOn: {
    borderColor: 'rgba(126,200,255,0.55)',
    backgroundColor: 'rgba(126,200,255,0.1)',
  },
  glyphPressed: {
    opacity: 0.82,
  },
  glyphLabel: {
    color: 'rgba(244,246,250,0.62)',
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  glyphValue: {
    color: '#7EC8FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  glyphLabelOn: {
    color: '#7EC8FF',
  },
  around: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  secondary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  footer: {
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: 6,
  },
  haptic: {
    minWidth: 120,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,220,196,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  hapticOn: {
    borderColor: 'rgba(126,200,255,0.55)',
    backgroundColor: 'rgba(126,200,255,0.1)',
  },
  hapticText: {
    color: 'rgba(244,246,250,0.62)',
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '800',
    textAlign: 'center',
  },
  hapticTextOn: {
    color: '#F4F6FA',
  },
  subSheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 12,
  },
  subBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.46)',
  },
  subCard: {
    backgroundColor: '#0C1016',
    borderTopWidth: 1,
    borderColor: 'rgba(126,200,255,0.2)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  subTitle: {
    color: 'rgba(220,228,236,0.5)',
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  subTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  subDone: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  subDoneText: {
    color: '#F4F6FA',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subRestore: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  subRestoreText: {
    color: 'rgba(220,228,236,0.55)',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  subCell: {
    minWidth: '30%',
    flexGrow: 1,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126,200,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subCellOn: {
    borderColor: '#7EC8FF',
    backgroundColor: 'rgba(126,200,255,0.12)',
  },
  subSymbol: {
    color: 'rgba(244,246,250,0.72)',
    fontSize: 22,
    fontWeight: '600',
  },
  subLabel: {
    color: 'rgba(244,246,250,0.62)',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  subOn: {
    color: '#F4F6FA',
  },
  pendulumTrack: {
    height: 22,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  pendulumRail: {
    height: 2,
    backgroundColor: 'rgba(126,200,255,0.28)',
    borderRadius: 1,
  },
  pendulumBar: {
    position: 'absolute',
    alignSelf: 'center',
    width: 36,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7EC8FF',
    shadowColor: '#7EC8FF',
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  modeStrip: {
    marginTop: 8,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(126,200,255,0.2)',
    backgroundColor: 'rgba(8,12,18,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lamps: {
    width: '100%',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 22,
  },
  lamp: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  modeToast: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#F4F6FA',
    fontSize: 11,
    letterSpacing: 2.2,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(126,200,255,0.2)',
    justifyContent: 'center',
  },
  presetChipOn: {
    borderColor: '#7EC8FF',
    backgroundColor: 'rgba(126,200,255,0.12)',
  },
  presetText: {
    color: 'rgba(244,246,250,0.62)',
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  presetTextOn: {
    color: '#7EC8FF',
  },
});

import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BeatCapsuleStrip } from '@/components/classic/BeatCapsuleStrip';
import { HorizontalTempoWheel } from '@/components/classic/HorizontalTempoWheel';
import { BeatlineSpotlight } from '@/components/classic/BeatlineSpotlight';
import { ClassicTopRail } from '@/components/classic/ClassicTopRail';
import { GlassPlayOrb } from '@/components/classic/GlassPlayOrb';
import { SparkField, useSparkField } from '@/components/classic/TapSparkLayer';
import { HardwareKey } from '@/components/classic/ClassicHardware';
import { MixerFader } from '@/components/controls/MixerFader';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { TIME_SIGNATURES } from '@/constants/meter';
import { sanitizeBpm } from '@/constants/timing';
import { hapticTap } from '@/lib/haptics';
import { tempoName } from '@/lib/tempo-name';

export function BeatlineRoom({
  config,
  prefs,
  compact,
  playing,
  transport,
  pulse,
  pulseRole,
  pulseAccent,
  pulseBeat,
  tapTempo,
  setBpm,
  toggle,
  onOpenPad,
  onOpenSound,
  onOpenPractice,
  onOpenRhythm,
  onOpenSettings,
  onOpenAccents,
  onOpenPresets: _onOpenPresets,
  onOpenSetlists,
  onChangeAccents,
  onUpdate,
  viewport,
  frame: panel,
}: ClassicInstrumentProps & { viewport?: number; frame?: { width: number; height: number } }) {
  const safeBpm = sanitizeBpm(config.bpm);
  const sparks = useSparkField();
  const accent = prefs.accentColor;
  const playSv = useSharedValue(playing ? 1 : 0);
  const stepsSv = useSharedValue(1);
  const [stepsLive, setStepsLive] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playSv.value = withTiming(playing ? 1 : 0, { duration: 260 });
  }, [playSv, playing]);

  const revealSteps = () => {
    setStepsLive(true);
    stepsSv.value = 1;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      stepsSv.value = withTiming(0, { duration: 280 });
      setStepsLive(false);
    }, 1400);
  };

  useEffect(() => {
    revealSteps();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // Tempo changes should bring ± back; playing is independent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeBpm]);

  const tapAt = (pageX: number, pageY: number) => {
    void hapticTap();
    tapTempo();
    sparks.burst(pageX, pageY);
  };

  const bpmStyle = useAnimatedStyle(() => ({
    opacity: interpolate(playSv.value, [0, 1], [1, 0.3]),
    transform: [{ scale: interpolate(playSv.value, [0, 1], [1, 0.84]) }],
  }));

  const stepsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stepsSv.value, [0, 1], [0, 1]),
  }));

  const fitted = panel ?? (viewport ? { width: viewport, height: viewport } : null);
  if (fitted) {
    const beatCount = TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4;
    const rows = beatCount > 8 ? 2 : 1;
    const radius = fitted.width / 2;
    const padTop = Math.round(fitted.height * (rows >= 3 ? 0.1 : 0.16));
    const capsuleH = Math.round(fitted.height * (rows >= 3 ? 0.42 : rows === 2 ? 0.46 : 0.38));
    const stripW = Math.round(fitted.width * 0.94);
    const wheelBottom = fitted.height - Math.round(fitted.height * 0.11);
    const wheelDist = Math.abs(wheelBottom - radius);
    const wheelChord = 2 * Math.sqrt(Math.max(0, radius * radius - wheelDist * wheelDist));
    const wheelW = Math.max(180, Math.round(Math.min(fitted.width * 0.9, wheelChord * 0.98)));
    return (
      <View style={{ width: fitted.width, height: fitted.height, overflow: 'hidden', backgroundColor: '#07080B', justifyContent: 'space-between', alignItems: 'center', paddingTop: padTop, paddingBottom: Math.round(fitted.height * 0.04) }}>
        <View style={{ width: stripW }}>
        <BeatCapsuleStrip
          timeSignature={config.timeSignature}
          beatIndex={transport.beatIndex}
          playing={playing}
          silent={transport.silentMeasure}
          accentPattern={config.accentPattern}
          onChange={onChangeAccents}
          pulse={pulse}
          pulseAccent={pulseAccent}
          pulseBeat={pulseBeat}
          compact={false}
          wrap
          frame={capsuleH}
          accentColor="#C4A36A"
          upbeatColor="#E7D3A4"
          tone={{
            normal: '#8A7048',
            secondary: '#C4A36A',
            strong: '#F3E6C4',
            active: '#7EE8DE',
          }}
        />
        </View>
        <HorizontalTempoWheel bpm={safeBpm} invert={config.wheelInvert} width={wheelW} height={40} onChange={setBpm} />
      </View>
    );
  }

  return (
    <View style={[styles.root, viewport ? { width: viewport, height: viewport, overflow: 'hidden' } : null]}>
      <BeatlineSpotlight
        playing={playing}
        pulse={pulse}
        pulseRole={pulseRole}
        pulseAccent={pulseAccent}
        level1Color={prefs.accentColor}
        level2Color={prefs.accentSecondaryColor}
        level3Color={prefs.accentStrongColor}
      />
      <SparkField field={sparks} />
      <ClassicTopRail
        timeSignature={config.timeSignature}
        subdivision={config.subdivision}
        timerLabel={playing ? 'ON' : 'SET'}
        onOpenRhythm={onOpenRhythm}
        onOpenPractice={onOpenPractice}
        onOpenSound={onOpenSound}
        tint={accent}
      />

      <View style={styles.beatline}>
        <BeatCapsuleStrip
          timeSignature={config.timeSignature}
          beatIndex={transport.beatIndex}
          playing={playing}
          silent={transport.silentMeasure}
          accentPattern={config.accentPattern}
          onChange={onChangeAccents}
          pulse={pulse}
          pulseAccent={pulseAccent}
          pulseBeat={pulseBeat}
          compact={compact}
          accentColor={accent}
          upbeatColor={prefs.accentSecondaryColor}
          tone={{
            normal: prefs.accentColor,
            secondary: prefs.accentSecondaryColor,
            strong: prefs.accentStrongColor,
            active: prefs.accentColor,
          }}
        />
      </View>

      <Pressable
        onPress={() => {
          revealSteps();
          onOpenPad();
        }}
        onLongPress={(event) => tapAt(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        delayLongPress={380}
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${safeBpm}. Tap to enter BPM. Long press to tap tempo.`}
        style={styles.bpmHit}>
        <Animated.View style={bpmStyle}>
          <Text
            style={[
              styles.bpm,
              viewport ? { fontSize: Math.round(viewport * 0.16), lineHeight: Math.round(viewport * 0.17) } : compact && styles.bpmCompact,
              Platform.OS === 'ios' ? styles.bpmIos : null,
            ]}
            allowFontScaling={false}>
            {safeBpm}
          </Text>
          <Text style={styles.marking}>{tempoName(safeBpm)}</Text>
        </Animated.View>
      </Pressable>

      <HorizontalTempoWheel
        bpm={safeBpm}
        invert={config.wheelInvert}
        width={360}
        height={66}
        onChange={(next) => {
          revealSteps();
          setBpm(next);
        }}
      />

      <View style={styles.transport}>
        <Animated.View pointerEvents={stepsLive ? 'auto' : 'none'} style={[styles.steps, stepsStyle]}>
          <HardwareKey
            label="−5"
            width={52}
            height={44}
            onPress={() => {
              revealSteps();
              setBpm(nudgeBpm(config.bpm, -5));
            }}
          />
          <HardwareKey
            label="−"
            width={44}
            height={44}
            onPress={() => {
              revealSteps();
              setBpm(nudgeBpm(config.bpm, -1));
            }}
          />
        </Animated.View>
        <GlassPlayOrb
          playing={playing}
          onPress={toggle}
          pulse={pulse}
          pulseAccent={pulseAccent}
          size={viewport ? Math.round(viewport * 0.2) : compact ? 88 : 104}
          accentColor={accent}
        />
        <Animated.View pointerEvents={stepsLive ? 'auto' : 'none'} style={[styles.steps, stepsStyle]}>
          <HardwareKey
            label="+"
            width={44}
            height={44}
            onPress={() => {
              revealSteps();
              setBpm(nudgeBpm(config.bpm, 1));
            }}
          />
          <HardwareKey
            label="+5"
            width={52}
            height={44}
            onPress={() => {
              revealSteps();
              setBpm(nudgeBpm(config.bpm, 5));
            }}
          />
        </Animated.View>
      </View>

      <View style={styles.dock}>
        <Pressable onPress={onOpenSettings} style={styles.dockHit} accessibilityRole="button" accessibilityLabel="Mix">
          <Text style={styles.dockLabel}>MIX</Text>
        </Pressable>
        <View style={styles.volWrap} accessibilityLabel="VOLUME">
          <MixerFader immediateGain value={config.volume} onChange={(volume) => onUpdate({ volume })} />
          <Text style={styles.volLabel}>VOLUME</Text>
        </View>
        <Pressable
          onPress={onOpenAccents}
          style={styles.dockHit}
          accessibilityRole="button"
          accessibilityLabel="Accents">
          <Text style={styles.dockLabel}>ACCENTS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  beatline: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    width: '100%',
  },
  bpmHit: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 118,
  },
  bpm: {
    color: '#F4F6FA',
    fontSize: 118,
    fontWeight: '600',
    letterSpacing: -4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  bpmIos: {
    fontFamily: 'ui-rounded',
    fontWeight: '600',
  },
  bpmCompact: {
    fontSize: 92,
  },
  marking: {
    marginTop: -4,
    color: 'rgba(220,228,236,0.72)',
    fontSize: 15,
    letterSpacing: 4,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
    minHeight: 52,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  power: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dockHit: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    color: 'rgba(220,228,236,0.78)',
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  volWrap: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  volLabel: {
    color: 'rgba(220,228,236,0.55)',
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  dock: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

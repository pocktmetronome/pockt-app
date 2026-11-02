import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { HardwareKey, HardwarePlay } from '@/components/classic/ClassicHardware';
import { ClassicParam, ClassicParamRow, ClassicRule } from '@/components/classic/ClassicChrome';
import { DigitalDigits } from '@/components/classic/DigitalDigits';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { TIME_SIGNATURES, subdivisionCaption } from '@/constants/meter';
import { SOUNDS, resolvePlayableSound } from '@/constants/sounds';
import { sanitizeBpm } from '@/constants/timing';
import { accentStrength, cycleBeatBlock } from '@/lib/accents';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { controlStepDetent } from '@/lib/rotary-feedback';
import { hapticLight, hapticMedium, hapticSelection } from '@/lib/haptics';

export function LedgearRoom({
  config,
  prefs,
  playing,
  transport,
  pulse,
  pulseRole,
  pulseAccent,
  pulseBeat,
  setBpm,
  toggle,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenPresets,
  onHapticToggle,
  onChangeAccents,
}: ClassicInstrumentProps) {
  const safeBpm = sanitizeBpm(config.bpm);
  const beats = TIME_SIGNATURES[config.timeSignature]?.beatsPerMeasure ?? 4;

  const topPulse = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.05, height: 5 };
    const strength = pulseAccent?.value ?? (pulseRole.value >= 1.5 ? 3 : 1);
    const peak = strength >= 2.5 ? 0.28 : strength >= 1.5 ? 0.18 : 0.1;
    return {
      opacity: interpolate(pulse.value, [0, 0.35, 1], [0.06, peak, peak * 0.22]),
      height: strength >= 2.5 ? 8 : strength >= 1.5 ? 6 : 4,
    };
  });
  const sidePulse = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.05, width: 5 };
    const strength = pulseAccent?.value ?? (pulseRole.value >= 1.5 ? 3 : 1);
    const peak = strength >= 2.5 ? 0.95 : strength >= 1.5 ? 0.7 : 0.42;
    return {
      opacity: interpolate(pulse.value, [0, 0.55, 1], [0.05, peak, peak * 0.3]),
      width: strength >= 2.5 ? 8 : strength >= 1.5 ? 6 : 4,
    };
  });
  const bottomPulse = useAnimatedStyle(() => {
    if (!playing) return { opacity: 0.04, height: 5 };
    const strength = pulseAccent?.value ?? (pulseRole.value >= 1.5 ? 3 : 1);
    const peak = strength >= 2.5 ? 1 : strength >= 1.5 ? 0.72 : 0.4;
    return {
      opacity: interpolate(pulse.value, [0, 0.7, 1], [0.04, peak * 0.55, peak]),
      height: strength >= 2.5 ? 8 : strength >= 1.5 ? 6 : 4,
    };
  });

  const tap = useClassicTapReaction(tapTempo);
  return (
    <View style={styles.root}>
      <SparkField field={tap.sparks} />
      <View style={styles.chassis}>
        <LinearGradient colors={['#2A2C2A', '#121412', '#0A0C0A']} style={StyleSheet.absoluteFillObject} />
        <View pointerEvents="none" style={styles.frameGlow}>
        <Animated.View pointerEvents="none" style={[styles.edge, styles.edgeTop, topPulse]} />
        <Animated.View pointerEvents="none" style={[styles.edge, styles.edgeRight, sidePulse]} />
        <Animated.View pointerEvents="none" style={[styles.edge, styles.edgeLeft, sidePulse]} />
        <Animated.View pointerEvents="none" style={[styles.edge, styles.edgeBottom, bottomPulse]} />
        </View>
        <View style={styles.bezel}>
          <View pointerEvents="none" style={styles.innerLip} />
          <Pressable
            onPress={onOpenPad}
            accessibilityRole="button"
            accessibilityLabel={`Tempo ${safeBpm} beats per minute`}
            style={styles.display}>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.28)']}
              style={styles.reflection}
            />
            <DigitalDigits value={safeBpm} />
          </Pressable>
          <View style={styles.lamps}>
            {Array.from({ length: beats }, (_, i) => {
              const level = config.accentPattern[i] ?? 'normal';
              const strength = accentStrength(level);
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    const next = Array.from({ length: beats }, (_, slot) => config.accentPattern[slot] ?? 'normal');
    const nextLevel = cycleBeatBlock(level);
                    next[i] = nextLevel;
                    const nextStrength = accentStrength(nextLevel);
                    if (nextStrength === 0) void hapticLight();
                    else if (nextStrength === 1) void hapticSelection();
                    else void hapticMedium();
                    onChangeAccents(next);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Beat ${i + 1}, accent ${strength}`}
                  style={styles.lampHit}>
                  <AccentCell
                    index={i}
                    beatCount={beats}
                    fallbackCurrent={i === transport.beatIndex % Math.max(1, beats)}
                    strength={strength}
                    playing={playing}
                    pulse={pulse}
                    pulseBeat={pulseBeat}
                    accentColor={prefs.accentColor}
                    secondaryColor={prefs.accentSecondaryColor}
                    strongColor={prefs.accentStrongColor}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Pressable
        onPress={(event) => tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onLongPress={onOpenPad}
        delayLongPress={380}
        style={styles.tapBar}>
        <Text style={styles.tapText}>TAP TEMPO</Text>
      </Pressable>

      <View style={styles.transport}>
        <HardwareKey
          label="−"
          accessibilityLabel="Decrease tempo"
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, -1));
          }}
        />
        <HardwarePlay playing={playing} onPress={toggle} glow="rgba(72, 196, 96, 0.5)" size={74} />
        <HardwareKey
          label="+"
          accessibilityLabel="Increase tempo"
          onPress={() => {
            controlStepDetent(true, true);
            setBpm(nudgeBpm(config.bpm, 1));
          }}
        />
      </View>

      <ClassicParamRow>
        <ClassicParam label="TIME" value={config.timeSignature} onPress={onOpenTime} />
        <ClassicRule />
        <ClassicParam label="SUB" value={subdivisionCaption(config.subdivision)} onPress={onOpenDivision} />
        <ClassicRule />
        <ClassicParam label="SOUND" value={SOUNDS[resolvePlayableSound(config.sound)].label} onPress={onOpenSound} />
      </ClassicParamRow>
      <View style={styles.utils}>
        <Pressable onPress={onHapticToggle} style={({ pressed }) => [styles.util, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.utilText, config.haptic && styles.utilOn]}>{config.haptic ? 'HAPTIC' : 'HAPTIC OFF'}</Text>
        </Pressable>
        <Pressable onPress={onOpenAccents} style={({ pressed }) => [styles.util, pressed && { opacity: 0.8 }]}>
          <Text style={styles.utilText}>COLOR</Text>
        </Pressable>
        <Pressable onPress={onOpenPresets} style={({ pressed }) => [styles.util, pressed && { opacity: 0.8 }]}>
          <Text style={styles.utilText}>PRESETS</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AccentCell({
  index,
  beatCount,
  fallbackCurrent,
  strength,
  playing,
  pulse,
  pulseBeat,
  accentColor,
  secondaryColor,
  strongColor,
}: {
  index: number;
  beatCount: number;
  fallbackCurrent: boolean;
  strength: 0 | 1 | 2 | 3;
  playing: boolean;
  pulse: ClassicInstrumentProps['pulse'];
  pulseBeat?: ClassicInstrumentProps['pulseBeat'];
  accentColor: string;
  secondaryColor: string;
  strongColor: string;
}) {
  const led = '#C4382C';
  const hit = index === 0 ? '#FFE08A' : strength >= 2.5 ? strongColor : strength >= 1.5 ? secondaryColor : accentColor;
  const fillPx = strength === 0 ? 0 : strength === 1 ? 18 : strength === 2 ? 36 : 56;
  const fillStyle = useAnimatedStyle(() => {
    const current = pulseBeat ? Math.round(pulseBeat.value) % Math.max(1, beatCount) === index : fallbackCurrent;
    const active = playing && current && pulse.value > 0.18 && strength > 0;
    return {
      height: fillPx,
      backgroundColor: active ? hit : led,
      opacity: strength === 0 ? 0 : active ? 1 : 0.82,
    };
  });
  return (
    <View style={styles.cell}>
      <Animated.View style={[styles.cellFill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chassis: {
    marginTop: 8,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200,210,190,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  frameGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  edge: {
    position: 'absolute',
    backgroundColor: '#E84838',
    shadowColor: '#FF6A52',
    shadowOpacity: 0.95,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 4,
  },
  edgeTop: {
    top: 0,
    left: 10,
    right: 10,
    height: 5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  edgeBottom: {
    bottom: 0,
    left: 10,
    right: 10,
    height: 5,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  edgeLeft: {
    left: 0,
    top: 10,
    bottom: 10,
    width: 5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  edgeRight: {
    right: 0,
    top: 10,
    bottom: 10,
    width: 5,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  bezel: {
    margin: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#070808',
    borderWidth: 7,
    borderColor: '#1A1C1A',
  },
  innerLip: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    zIndex: 0,
  },
  display: {
    minHeight: 136,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#030404',
    borderRadius: 8,
    overflow: 'hidden',
  },
  reflection: {
    ...StyleSheet.absoluteFillObject,
  },
  lamps: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 64,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  lampHit: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cell: {
    width: '100%',
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(232,72,56,0.28)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  cellFill: {
    width: '100%',
    backgroundColor: '#C4382C',
    borderRadius: 2,
  },
  tapBar: {
    alignSelf: 'center',
    minWidth: 180,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,72,56,0.28)',
    backgroundColor: 'rgba(12,10,10,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapText: {
    color: '#E8D8D0',
    fontSize: 13,
    letterSpacing: 2.8,
    fontWeight: '800',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginVertical: 8,
  },
  utils: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  util: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilText: {
    color: 'rgba(232,216,208,0.48)',
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  utilOn: {
    color: '#E8D8D0',
  },
});

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState, type ComponentProps } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DigitalDigits } from '@/components/classic/DigitalDigits';
import { FaceToast, faceToastOffset, useFaceToast } from '@/components/classic/FaceToast';
import { SparkField, useClassicTapReaction } from '@/components/classic/TapSparkLayer';
import { TempoRoller } from '@/components/classic/TempoRoller';
import { nudgeBpm } from '@/components/classic/BpmStepper';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { SUBDIVISION_ORDER, SUBDIVISIONS } from '@/constants/meter';
import { RIG_MAX_BPM, RIG_MIN_BPM, sanitizeBpm } from '@/constants/timing';
import { resolveRigBeatLight } from '@/lib/control-detent';
import { PHONE_FLASH_MESSAGE, PHONE_FLASH_TITLE, shouldPromptPhoneFlash } from '@/lib/flash-consent';
import { hapticSelection, hapticTap } from '@/lib/haptics';
import { controlStepDetent } from '@/lib/rotary-feedback';
import {
  isSupportedMeterCombo,
  METER_DENOMINATORS,
  METER_NUMERATORS,
  parseMeterParts,
  resolveMeterId,
  type MeterDenominator,
} from '@/lib/meter-select';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import { tempoName } from '@/lib/tempo-name';
import type { SubdivisionId, TimeSignatureId } from '@/lib/types';

type Picker = 'none' | 'num' | 'den' | 'sub';

function validNumerators(den: MeterDenominator): number[] {
  return METER_NUMERATORS.filter((beats) => isSupportedMeterCombo(beats, den));
}

function validDenominators(beats: number): MeterDenominator[] {
  return METER_DENOMINATORS.filter((den) => isSupportedMeterCombo(beats, den));
}

export function RigRoom({
  config,
  compact,
  playing,
  pulse,
  setBpm,
  toggle,
  tapTempo,
  onOpenPad,
  onOpenSettings,
  onOpenSound,
  onUpdate,
  onDisplayPrefsChange,
  prefs,
  onGoHome: _onGoHome,
}: ClassicInstrumentProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [picker, setPicker] = useState<Picker>('none');
  const [flashPromptOpen, setFlashPromptOpen] = useState(false);
  const toast = useFaceToast();
  const tap = useClassicTapReaction(tapTempo);
  const safeBpm = sanitizeBpm(config.bpm, config.bpm, RIG_MIN_BPM, RIG_MAX_BPM);
  const parts = parseMeterParts(config.timeSignature);
  const short = height < 720 || compact;
  const tapSize = Math.round(Math.min(112, Math.max(86, width * 0.26)));
  const digitScale = short ? 0.72 : width < 390 ? 0.78 : 0.88;
  const beatLightOn = resolveRigBeatLight(config.rigBeatLight);

  const tapGlow = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.2, 1], [0.18, playing ? 0.85 : 0.22, 0.16]),
  }));

  const applyMeter = (next: TimeSignatureId | null) => {
    if (!next || next === config.timeSignature) return;
    onUpdate({ timeSignature: next });
  };

  const chooseNumerator = (beats: number) => {
    const next = resolveMeterId({ ...parts, beats });
    applyMeter(next);
    setPicker('none');
  };

  const chooseDenominator = (denominator: MeterDenominator) => {
    const grouping = isSupportedMeterCombo(parts.beats, denominator) ? parts.grouping : 'none';
    const next = resolveMeterId({ beats: parts.beats, denominator, grouping });
    applyMeter(next);
    setPicker('none');
  };

  const chooseSubdivision = (subdivision: SubdivisionId) => {
    onUpdate({ subdivision });
    setPicker('none');
  };

  const nums = useMemo(() => validNumerators(parts.denominator), [parts.denominator]);
  const dens = useMemo(() => validDenominators(parts.beats), [parts.beats]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 2, paddingBottom: Math.max(insets.bottom, 10) }]}>
      <LinearGradient colors={['#1A1C1E', '#101214', '#08090B']} style={StyleSheet.absoluteFillObject} />
      <FaceToast
        text={toast.text}
        opacity={toast.opacity}
        tone="dark"
        offsetTop={faceToastOffset(insets.top, 48)}
      />

      <View style={styles.nav}>
        <View style={styles.navSide} />
        <Text style={styles.navTitle}>CONSOLE</Text>
        <View style={styles.navSide} />
      </View>

      <View style={[styles.upper, short && styles.upperCompact]}>
        <View style={styles.lightCol}>
          <LightToggle
            name="wb-incandescent"
            label={beatLightOn ? 'Beat light on' : 'Beat light off'}
            on={beatLightOn}
            onPress={() => {
              const next = !beatLightOn;
              void hapticSelection();
              onUpdate({ rigBeatLight: next });
              toast.show(next ? 'BEAT LIGHT ON' : 'BEAT LIGHT OFF');
            }}
          />
          <LightToggle
            name="highlight"
            label={config.flashOnBeat ? 'Phone flash on' : 'Phone flash off'}
            on={config.flashOnBeat}
            onPress={() => {
              const next = !config.flashOnBeat;
              void hapticSelection();
              if (shouldPromptPhoneFlash(prefs.torchHintSeen, next)) {
                if (flashPromptOpen) return;
                setFlashPromptOpen(true);
                Alert.alert(PHONE_FLASH_TITLE, PHONE_FLASH_MESSAGE, [
                  {
                    text: 'Not Now',
                    style: 'cancel',
                    onPress: () => setFlashPromptOpen(false),
                  },
                  {
                    text: 'Turn On',
                    onPress: () => {
                      setFlashPromptOpen(false);
                      onDisplayPrefsChange({ torchHintSeen: true });
                      onUpdate({ flashOnBeat: true });
                      toast.show('PHONE FLASH ON');
                    },
                  },
                ]);
                return;
              }
              onUpdate({ flashOnBeat: next });
              toast.show(next ? 'PHONE FLASH ON' : 'PHONE FLASH OFF');
            }}
          />
        </View>
        <Pressable
          onPress={(event) => {
            tap.fire(event.nativeEvent.pageX, event.nativeEvent.pageY);
          }}
          accessibilityRole="button"
          accessibilityLabel="Tap tempo"
          accessibilityHint="Sets tempo from your taps"
          style={({ pressed }) => [
            styles.tap,
            { width: tapSize, height: tapSize, borderRadius: tapSize / 2 },
            pressed && styles.tapDown,
          ]}>
          <LinearGradient
            colors={['#1A2A38', '#0A1218', '#05080C']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: tapSize / 2 }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tapRing,
              { borderRadius: tapSize / 2 },
              beatLightOn ? tapGlow : styles.lightOff,
            ]}
          />
          <SparkField field={tap.sparks} />
          <Text style={styles.tapLabel}>TAP</Text>
        </Pressable>

        <View style={styles.bpmBlock}>
          <Pressable
            onPress={() => {
              void hapticTap();
              onOpenPad();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Tempo, ${safeBpm} beats per minute. Double tap to enter a precise tempo.`}
            accessibilityHint="Opens exact tempo entry"
            style={styles.bpmWell}>
            <LinearGradient
              colors={['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.35)']}
              style={StyleSheet.absoluteFillObject}
            />
            <DigitalDigits value={safeBpm} lit="#3DE8F0" dim="rgba(18,54,58,0.42)" scale={digitScale} />
          </Pressable>
          <Text style={styles.marking}>{tempoName(safeBpm).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.rollerRow}>
        <Pressable
          onPress={() => {
            controlStepDetent(sensoryFlags(config.sensoryMode).audio, effectiveHaptic(config));
            setBpm(sanitizeBpm(nudgeBpm(safeBpm, -1), safeBpm, RIG_MIN_BPM, RIG_MAX_BPM));
          }}
          accessibilityRole="button"
          accessibilityLabel="Decrease tempo"
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
          <LinearGradient colors={['#2A2E32', '#141618']} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <TempoRoller
          bpm={safeBpm}
          onChange={setBpm}
          audio={sensoryFlags(config.sensoryMode).audio}
          haptic={effectiveHaptic(config)}
        />
        <Pressable
          onPress={() => {
            controlStepDetent(sensoryFlags(config.sensoryMode).audio, effectiveHaptic(config));
            setBpm(sanitizeBpm(nudgeBpm(safeBpm, 1), safeBpm, RIG_MIN_BPM, RIG_MAX_BPM));
          }}
          accessibilityRole="button"
          accessibilityLabel="Increase tempo"
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
          <LinearGradient colors={['#2A2E32', '#141618']} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>

      <View style={styles.void} />

      <View style={styles.lower}>
        <View style={styles.meterRow}>
          <FaceKey label={String(parts.beats)} onPress={() => setPicker('num')} a11y="Beats per measure" />
          <Text style={styles.slash}>/</Text>
          <FaceKey label={String(parts.denominator)} onPress={() => setPicker('den')} a11y="Note value" />
          <FaceKey
            label={SUBDIVISIONS[config.subdivision].symbol}
            onPress={() => setPicker('sub')}
            a11y="Subdivision"
            wide
          />
          <FaceKey label="SND" onPress={() => onOpenSound()} a11y="Sound" />
        </View>
        <Pressable
          onPress={() => {
            void hapticSelection();
            toggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Stop' : 'Play'}
          style={({ pressed }) => [styles.start, playing && styles.startOn, pressed && styles.pressed]}>
          <LinearGradient
            colors={playing ? ['#1A6A88', '#0C3A4C'] : ['#1A4A62', '#0C2430']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.startLabel}>{playing ? 'Stop' : 'Play'}</Text>
        </Pressable>
      </View>

      <Modal visible={picker !== 'none'} transparent animationType="fade" onRequestClose={() => setPicker('none')}>
        <Pressable style={styles.pickBackdrop} onPress={() => setPicker('none')}>
          <Pressable style={styles.pickCard} onPress={(event) => event.stopPropagation()}>
            <LinearGradient colors={['#24282C', '#121416']} style={StyleSheet.absoluteFillObject} />
            <Text style={styles.pickTitle}>
              {picker === 'num' ? 'BEATS' : picker === 'den' ? 'NOTE' : 'SUBDIVISION'}
            </Text>
            <View style={styles.pickGrid}>
              {picker === 'num'
                ? nums.map((n) => (
                    <PickCell
                      key={n}
                      label={String(n)}
                      selected={n === parts.beats}
                      onPress={() => chooseNumerator(n)}
                    />
                  ))
                : null}
              {picker === 'den'
                ? dens.map((d) => (
                    <PickCell
                      key={d}
                      label={String(d)}
                      selected={d === parts.denominator}
                      onPress={() => chooseDenominator(d)}
                    />
                  ))
                : null}
              {picker === 'sub'
                ? SUBDIVISION_ORDER.map((id) => (
                    <PickCell
                      key={id}
                      label={`${SUBDIVISIONS[id].symbol}  ${SUBDIVISIONS[id].short}`}
                      selected={id === config.subdivision}
                      wide
                      onPress={() => chooseSubdivision(id)}
                    />
                  ))
                : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function LightToggle({
  name,
  label,
  on,
  onPress,
}: {
  name: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.lightBtn, on && styles.lightBtnOn, pressed && styles.pressed]}>
      <MaterialIcons name={name} size={20} color={on ? '#3DE8F0' : 'rgba(200,208,216,0.72)'} />
    </Pressable>
  );
}

function FaceKey({
  label,
  onPress,
  a11y,
  wide,
}: {
  label: string;
  onPress: () => void;
  a11y: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.key, wide && styles.keyWide, pressed && styles.pressed]}>
      <LinearGradient colors={['#2A2E32', '#141618', '#0C0E10']} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.keyLip} />
      <Text style={styles.keyLabel}>{label}</Text>
    </Pressable>
  );
}

function PickCell({
  label,
  selected,
  onPress,
  wide,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={[styles.cell, wide && styles.cellWide, selected && styles.cellOn]}>
      <Text style={[styles.cellLabel, selected && styles.cellLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
  },
  nav: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSide: {
    minWidth: 48,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  navRight: {
    alignItems: 'flex-end',
  },
  navHome: {
    color: '#D8DEE6',
    fontSize: 16,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  navTitle: {
    color: '#F4F6FA',
    fontSize: 16,
    letterSpacing: 1.6,
    fontWeight: '600',
  },
  mixHit: {
    minWidth: 72,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  mixLabel: {
    color: '#D8DEE6',
    fontSize: 16,
    letterSpacing: 2.2,
    fontWeight: '700',
  },
  eq: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eqBar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: '#D8DEE6',
  },
  eqA: { height: 8 },
  eqB: { height: 16 },
  eqC: { height: 11 },
  lightCol: {
    justifyContent: 'center',
    gap: 8,
  },
  lightBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8,10,12,0.45)',
  },
  lightBtnOn: {
    borderColor: 'rgba(61,232,240,0.55)',
    backgroundColor: 'rgba(61,232,240,0.1)',
  },
  lightOff: {
    opacity: 0,
  },
  upper: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upperCompact: {
    marginTop: 10,
  },
  tap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRightColor: 'rgba(0,0,0,0.55)',
    borderBottomColor: 'rgba(0,0,0,0.7)',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  tapRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#3DE8F0',
  },
  tapLabel: {
    color: '#3DE8F0',
    fontSize: 22,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  tapDown: {
    transform: [{ translateY: 1 }, { scale: 0.98 }],
  },
  bpmBlock: {
    flex: 1,
    alignItems: 'center',
  },
  bpmWell: {
    minHeight: 88,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050708',
    borderWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.7)',
    borderLeftColor: 'rgba(0,0,0,0.5)',
    borderRightColor: 'rgba(255,255,255,0.06)',
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
  },
  marking: {
    marginTop: 8,
    color: 'rgba(61,232,240,0.72)',
    fontSize: 12,
    letterSpacing: 3.2,
    fontWeight: '700',
  },
  rollerRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRightColor: 'rgba(0,0,0,0.5)',
    borderBottomColor: 'rgba(0,0,0,0.65)',
  },
  stepGlyph: {
    color: '#E8EEF4',
    fontSize: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  void: {
    flex: 1,
    minHeight: 48,
  },
  lower: {
    paddingBottom: 8,
    gap: 16,
    alignItems: 'center',
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  slash: {
    color: 'rgba(200,208,216,0.45)',
    fontSize: 28,
    fontWeight: '200',
    marginHorizontal: 2,
  },
  key: {
    minWidth: 56,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  keyWide: {
    minWidth: 72,
  },
  keyLip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.08)',
    borderRightColor: 'rgba(0,0,0,0.45)',
    borderBottomColor: 'rgba(0,0,0,0.6)',
  },
  keyLabel: {
    color: '#E8EEF4',
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  start: {
    width: 168,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(61,232,240,0.28)',
    shadowColor: '#3DE8F0',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  startOn: {
    borderColor: 'rgba(61,232,240,0.55)',
    shadowOpacity: 0.4,
  },
  startLabel: {
    color: '#3DE8F0',
    fontSize: 16,
    letterSpacing: 2.6,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
  pickBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  pickCard: {
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pickTitle: {
    color: 'rgba(200,208,216,0.6)',
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  pickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cell: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cellWide: {
    minWidth: 132,
  },
  cellOn: {
    borderColor: 'rgba(61,232,240,0.55)',
    backgroundColor: 'rgba(61,232,240,0.1)',
  },
  cellLabel: {
    color: '#D8DEE6',
    fontSize: 16,
    fontWeight: '600',
  },
  cellLabelOn: {
    color: '#3DE8F0',
  },
});

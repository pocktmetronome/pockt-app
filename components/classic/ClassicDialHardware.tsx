import { Ionicons } from '@expo/vector-icons';
import { ShellGlyph } from '@/components/classic/ShellIcons';
import { playChrome } from '@/lib/play-chrome';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { proofFlags } from '@/lib/proof-flags';
import { NorthStarImage, northStar } from '@/components/classic/north-star-assets';
import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { CLASSIC_DIAL } from '@/lib/classic-dial-visual';

type KnobKind = 'pockets' | 'settings' | 'sound' | 'tuner';

const KNOB_ICON: Record<KnobKind, keyof typeof Ionicons.glyphMap> = {
  pockets: 'albums-outline',
  settings: 'settings-outline',
  sound: 'musical-note',
  tuner: 'git-merge-outline',
};

const SOUND_CAP = require('@/assets/shell-v2/sound-cap.png');
const TUNER_CAP = require('@/assets/shell-v2/tuner-cap.png');

function NoteMark({ value }: { value: string }) {
  const flags = value.includes('♬') ? 2 : value.includes('♪') ? 1 : 0;
  return (
    <View style={styles.note}>
      <View style={styles.noteHead} />
      <View style={styles.noteStem} />
      {flags > 0 ? <View style={[styles.noteFlag, { top: 1 }]} /> : null}
      {flags > 1 ? <View style={[styles.noteFlag, { top: 4 }]} /> : null}
    </View>
  );
}

const METAL = ['#3A3834', '#1C1B19', '#0E0D0C'] as const;
const METAL_DEEP = ['#2A2826', '#141312', '#090908'] as const;

export function ClassicDialKnob({
  kind,
  label,
  caption,
  accessibilityLabel,
  selected = false,
  facade = false,
  onPress,
}: {
  kind: KnobKind;
  label: string;
  caption?: string;
  accessibilityLabel: string;
  selected?: boolean;
  facade?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.knobHit, pressed && styles.pressed]}>
      {facade ? (
        <View style={styles.knobFace}>
          <Image source={kind === 'tuner' ? TUNER_CAP : SOUND_CAP} resizeMode="contain" style={styles.capSkin} />
          <View style={styles.knobIcon} pointerEvents="none">
            {kind === 'tuner' ? (
              <FaderIcon ink="#141311" large />
            ) : (
              <View style={styles.engravedIcon}>
                <Ionicons
                  name={KNOB_ICON[kind]}
                  size={27}
                  color="rgba(255,248,236,0.34)"
                  style={styles.engravedLight}
                />
                <Ionicons name={KNOB_ICON[kind]} size={27} color="#141311" />
              </View>
            )}
          </View>
        </View>
      ) : (
      <MachinedDisc size={42} selected={selected}>
        {kind === 'tuner' ? (
          <FaderIcon />
        ) : (
          <Ionicons name={KNOB_ICON[kind]} size={16} color={CLASSIC_DIAL.silver} />
        )}
      </MachinedDisc>
      )}
      <Text
        style={[styles.knobLabel, facade && styles.knobLabelFacade]}
        numberOfLines={1}
        ellipsizeMode="clip"
        allowFontScaling={false}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.knobCaption, facade && styles.knobCaptionFacade]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

function FaderIcon({ ink = CLASSIC_DIAL.silver, large = false }: { ink?: string; large?: boolean }) {
  if (large) {
    const heights = [14, 20, 11];
    return (
      <View style={styles.faderEngraved} accessibilityElementsHidden>
        {heights.map((height, index) => (
          <View key={index} style={styles.faderCol}>
            <View style={[styles.faderCap, { backgroundColor: ink }]} />
            <View style={[styles.faderStem, { height, backgroundColor: ink }]} />
          </View>
        ))}
      </View>
    );
  }
  const heights = [12, 16, 9];
  return (
    <View style={styles.faders} accessibilityElementsHidden>
      <View style={[styles.fader, { height: heights[0], backgroundColor: ink }]} />
      <View style={[styles.fader, { height: heights[1], backgroundColor: ink }]} />
      <View style={[styles.fader, { height: heights[2], backgroundColor: ink }]} />
    </View>
  );
}

function MachinedDisc({ size, selected = false, children }: { size: number; selected?: boolean; children?: ReactNode }) {
  const face = size - 4;
  return (
    <View
      style={[
        styles.discRim,
        selected && styles.discSelected,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <LinearGradient
        colors={METAL}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.discFace, { width: face, height: face, borderRadius: face / 2 }]}>
        <View style={styles.discSheen} />
        <View style={styles.discShade} />
        {children}
      </LinearGradient>
    </View>
  );
}

function scaledFace(scale: number, box: { left: number; top: number; width: number; height: number; radius: number }) {
  return {
    position: 'absolute' as const,
    left: Math.round(box.left * scale),
    top: Math.round(box.top * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
    overflow: 'hidden' as const,
    borderRadius: Math.max(8, Math.round(box.radius * scale)),
  };
}

export function ClassicDialPlay({
  playing,
  onPress,
  facade = false,
  pixelLock = false,
  faceScale = 1,
}: {
  playing: boolean;
  onPress: () => void;
  facade?: boolean;
  pixelLock?: boolean;
  faceScale?: number;
}) {
  const [down, setDown] = useState(false);
  const [armed, setArmed] = useState(false);
  const [released, setReleased] = useState(false);
  const depressed = down || proofFlags.playDown;
  const chrome = playChrome({ down: depressed, armed, playing, released });
  useEffect(() => {
    if (playing) setArmed(false);
  }, [playing]);
  useEffect(() => {
    if (!released) return;
    const timer = setTimeout(() => setReleased(false), 80);
    return () => clearTimeout(timer);
  }, [released]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Stop' : 'Play'}
      accessibilityState={{ selected: playing }}
      hitSlop={12}
      onPress={() => {
        if (!playing) setArmed(true);
        setReleased(false);
        onPress();
      }}
      onPressIn={() => {
        setReleased(false);
        setDown(true);
      }}
      onPressOut={() => {
        setDown(false);
        setReleased(true);
      }}
      style={({ pressed }) => [
        styles.playHit,
        facade && styles.playFacade,
        pixelLock && styles.faceOpen,
        (pressed || proofFlags.playDown) && styles.pressedSkin,
        playing && !facade && styles.playHitOn,
      ]}>
      <View style={facade && pixelLock ? scaledFace(faceScale, { left: 6, top: 3, width: 80, height: 59, radius: 10 }) : StyleSheet.absoluteFill} pointerEvents="none">
        <View style={pixelLock ? styles.primaryInset : StyleSheet.absoluteFill}>
          <NorthStarImage source={depressed || chrome === 'committing' ? northStar.primaryPressed : northStar.primaryRest} mode="stretch" />
        </View>
      </View>
      <View style={facade && pixelLock ? { transform: [{ translateY: Math.round(6 * faceScale) }] } : undefined} pointerEvents="none">
        {chrome === 'stop' || (playing && !depressed) ? (
          <View style={[styles.stopGlyph, facade && styles.stopGlyphFacade]} />
        ) : (
          <ShellGlyph name="play" size={facade ? (pixelLock ? Math.round(28 * faceScale) : 36) : 24} color="#1A140C" />
        )}
      </View>
    </Pressable>
  );
}

export function ClassicDialPocktButton({ onPress, facade = false, pixelLock = false, faceScale = 1 }: { onPress: () => void; facade?: boolean; pixelLock?: boolean; faceScale?: number }) {
  const [down, setDown] = useState(false);
  const sunk = down || proofFlags.pDown;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="POCKT settings"
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[styles.keyHit, pixelLock && styles.faceOpen, sunk && styles.pressedSkin]}>
      <View pointerEvents="none" style={pixelLock ? scaledFace(faceScale, { left: 6, top: 4, width: 74, height: 59, radius: 10 }) : StyleSheet.absoluteFill}>
        <View style={pixelLock ? styles.optBronzeInset : StyleSheet.absoluteFill}>
          <NorthStarImage source={sunk ? northStar.bronzePressed : northStar.bronzeRest} mode="stretch" />
        </View>
      </View>
      {facade ? (
        <View style={[styles.pLogo, pixelLock && { width: Math.round(30 * faceScale), height: Math.round(34 * faceScale), transform: [{ translateY: Math.round(8 * faceScale) }] }]}>
          <NorthStarImage source={northStar.pLogo} mode={pixelLock ? 'stretch' : 'contain'} />
        </View>
      ) : (
      <View style={styles.markClip}>
        <Pockt2Mark size={36} accessible={false} />
      </View>
      )}
    </Pressable>
  );
}

export function ClassicDialPill({
  kicker,
  value,
  accessibilityLabel,
  onPress,
  readout = false,
  pending,
  detail,
  transport = false,
  pixelLock = false,
  faceScale = 1,
}: {
  kicker: string;
  value: string;
  accessibilityLabel: string;
  onPress: () => void;
  readout?: boolean;
  pending?: string;
  /** Engraved grouping, shown only while nothing is waiting. */
  detail?: string;
  /** One transport key for meter and subdivision together. */
  transport?: boolean;
  pixelLock?: boolean;
  faceScale?: number;
}) {
  const [down, setDown] = useState(false);
  if (readout) {
    const secondary = pending ? `NEXT ${pending}` : detail;
    const sunk = down || proofFlags.meterDown;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: pending ? `Now ${value}. Next ${pending}` : detail ? `${value}, ${detail}` : value }}
        onPress={onPress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={[styles.plate, transport && styles.plateTransport, pixelLock && styles.faceOpen, sunk && styles.pressedSkin]}>
        <View pointerEvents="none" style={pixelLock ? scaledFace(faceScale, { left: -16, top: 3, width: 118, height: 59, radius: 12 }) : StyleSheet.absoluteFill}>
          <View style={pixelLock ? styles.darkInset : StyleSheet.absoluteFill}>
            <NorthStarImage source={sunk ? northStar.darkPressed : northStar.darkRest} mode="stretch" />
          </View>
        </View>
        <View style={[styles.meterRow, transport && pixelLock && { gap: 5, transform: [{ translateY: Math.round(6 * faceScale) }] }]}>
          <Text
            style={[
              styles.plateValue,
              transport && (pixelLock ? styles.plateValueTransport : styles.plateValueCompact),
              transport && pixelLock && { fontSize: Math.round(26 * faceScale), lineHeight: Math.round(28 * faceScale) },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            allowFontScaling={false}>
            {value.replace(/[♩♪♬]/g, '').replace(/\.$/, '').trim()}
          </Text>
          {transport ? <NoteMark value={value} /> : null}
        </View>
        {secondary ? (
          <Text
            style={pending ? styles.plateNext : styles.plateDetail}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            allowFontScaling={false}>
            {secondary}
          </Text>
        ) : null}
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pillHit, pressed && styles.pressed]}>
      <LinearGradient colors={METAL_DEEP} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.plateSheen} />
      <View style={styles.plateShade} />
      <Text style={styles.pillKicker}>{kicker}</Text>
      <View style={styles.pillValueRow}>
        <Text style={styles.pillValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={12} color={CLASSIC_DIAL.ivoryMute} />
      </View>
    </Pressable>
  );
}

export function ClassicDialBpmStep({
  glyph,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  glyph: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const [down, setDown] = useState(false);
  const sunk = !disabled && (down || (glyph === '+' ? proofFlags.plusDown : proofFlags.minusDown));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={{ top: 18, bottom: 22, left: 16, right: 16 }}
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[styles.stepHit, sunk && styles.pressedSkin, disabled && styles.stepDisabled]}>
      <View style={styles.stepDisc}>
        <NorthStarImage source={sunk ? northStar.tempoPressed : northStar.tempoRest} mode="stretch" />
        <Text style={styles.stepGlyph} allowFontScaling={false}>
          {glyph}
        </Text>
      </View>
    </Pressable>
  );
}

export function ClassicDialRoundControl({
  accessibilityLabel,
  label,
  onPress,
  facade = false,
  pixelLock = false,
  faceScale = 1,
  children,
}: {
  accessibilityLabel: string;
  label?: string;
  onPress: () => void;
  facade?: boolean;
  pixelLock?: boolean;
  faceScale?: number;
  children?: ReactNode;
}) {
  const [down, setDown] = useState(false);
  const sunk = down || (label === 'TAP' && proofFlags.tapDown);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[styles.keyHit, pixelLock && styles.faceOpen, sunk && styles.pressedSkin]}>
      <View pointerEvents="none" style={pixelLock ? scaledFace(faceScale, { left: 4, top: 3, width: 70, height: 58, radius: 10 }) : StyleSheet.absoluteFill}>
        <View style={pixelLock ? styles.bronzeInset : StyleSheet.absoluteFill}>
          <NorthStarImage source={sunk ? northStar.bronzePressed : northStar.bronzeRest} mode="stretch" />
        </View>
      </View>
      {children}
      {label ? (
        <Text
          style={[
            styles.roundLabel,
            facade && styles.roundLabelFacade,
            facade && pixelLock && {
              fontSize: Math.round(18 * faceScale),
              letterSpacing: -1.1,
              textShadowColor: 'rgba(255,236,200,0.45)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 0,
              transform: [{ translateY: Math.round(8 * faceScale) }],
            },
          ]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knobHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discRim: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A78455',
    borderWidth: 2,
    borderColor: '#6E5430',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  discSelected: {
    borderColor: '#3DCEC4',
    shadowColor: '#3DCEC4',
    shadowOpacity: 0.35,
  },
  discFace: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  discSheen: {
    position: 'absolute',
    top: 2,
    left: '16%',
    right: '16%',
    height: '32%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  discShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  knobFace: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capSkin: {
    ...StyleSheet.absoluteFillObject,
  },
  knobIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engravedIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  engravedLight: {
    position: 'absolute',
    left: 0.8,
    top: 0.9,
  },
  knobLabel: {
    marginTop: 4,
    color: CLASSIC_DIAL.ivory,
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  knobLabelFacade: {
    position: 'absolute',
    bottom: 2,
    color: '#E8E4DA',
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  knobCaption: {
    marginTop: 1,
    color: CLASSIC_DIAL.ivoryMute,
    fontSize: 9,
    fontWeight: '600',
    maxWidth: 72,
  },
  knobCaptionFacade: {
    color: '#D5D0C6',
    fontSize: 10,
    fontWeight: '700',
  },
  faders: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  fadersLarge: {
    width: 22,
    height: 22,
  },
  fader: {
    width: 2.5,
    borderRadius: 1,
    backgroundColor: CLASSIC_DIAL.silver,
  },
  faderLarge: {
    width: 3.2,
  },
  faderEngraved: {
    width: 20,
    height: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  faderCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  faderCap: {
    width: 5.6,
    height: 3.2,
    borderRadius: 1.1,
    marginBottom: 0.4,
  },
  faderStem: {
    width: 2.1,
    borderRadius: 0.8,
  },
  playHit: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  playHitOn: {
    borderColor: '#6E5430',
  },
  playFacade: {
    backgroundColor: 'transparent',
    borderRadius: 14,
  },
  playShellFacade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  playFace: {
    position: 'absolute',
    left: 6,
    top: 14,
    width: 80,
    height: 62,
    overflow: 'hidden',
    borderRadius: 10,
  },
  tapFace: {
    position: 'absolute',
    left: 4,
    top: 16,
    width: 70,
    height: 58,
    overflow: 'hidden',
    borderRadius: 10,
  },
  meterFace: {
    position: 'absolute',
    left: -16,
    top: 14,
    width: 118,
    height: 62,
    overflow: 'hidden',
    borderRadius: 12,
  },
  optFace: {
    position: 'absolute',
    left: 6,
    top: 16,
    width: 74,
    height: 59,
    overflow: 'hidden',
    borderRadius: 10,
  },
  bronzeInset: {
    position: 'absolute',
    left: '-5.4%',
    top: '-8.9%',
    width: '107.5%',
    height: '126.6%',
  },
  optBronzeInset: {
    position: 'absolute',
    left: '-5%',
    top: '-3.5%',
    width: '106.3%',
    height: '111.5%',
  },
  primaryInset: {
    position: 'absolute',
    left: '-2.1%',
    top: '-7.1%',
    width: '103.1%',
    height: '119%',
  },
  darkInset: {
    position: 'absolute',
    left: '-2.2%',
    top: '-9.5%',
    width: '104.3%',
    height: '119%',
  },
  faceOpen: {
    overflow: 'visible',
  },
  playMarkFacade: {
    transform: [{ translateX: 0 }, { translateY: 8 }],
  },
  keyHit: {
    flex: 1,
    position: 'relative',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  keyLetter: {
    color: '#E6D3AE',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  playPresence: {
    marginHorizontal: -2,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  stopGlyph: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#1A140C',
  },
  stopGlyphFacade: {
    width: 26,
    height: 26,
    borderRadius: 3,
    backgroundColor: '#1A140C',
    borderWidth: 0,
  },
  readoutHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    flex: 1,
    position: 'relative',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
  },
  platePressed: {
    backgroundColor: '#100E0C',
    transform: [{ translateY: 1 }],
  },
  plateTransport: {
    borderRadius: 12,
  },
  plateValue: {
    color: '#F2EDE4',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
  plateValueTransport: {
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: 0.8,
  },
  plateValueCompact: {
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 2,
  },
  meterRowFacade: {
    gap: 5,
    transform: [{ translateY: 8 }],
  },
  note: {
    width: 16,
    height: 22,
  },
  noteHead: {
    position: 'absolute',
    left: 1,
    top: 12,
    width: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E6D3AE',
    transform: [{ rotate: '-18deg' }],
  },
  noteStem: {
    position: 'absolute',
    left: 8,
    top: 1,
    width: 1.6,
    height: 15,
    backgroundColor: '#E6D3AE',
  },
  noteFlag: {
    position: 'absolute',
    right: 0,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#E6D3AE',
  },
  plateNext: {
    marginTop: 1,
    color: '#E0B15A',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  plateDetail: {
    marginTop: 1,
    color: '#B7A88C',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  readoutMeter: {
    color: '#E8E4DA',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  readoutNext: {
    color: '#E8E4DA',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  readoutFeel: {
    color: '#C8C4BA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  markClip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillHit: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
    backgroundColor: '#121110',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(184,137,58,0.55)',
    borderTopColor: 'rgba(228,201,138,0.28)',
  },
  plateSheen: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  plateShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  pillKicker: {
    color: CLASSIC_DIAL.bronze,
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  pillValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillValue: {
    color: CLASSIC_DIAL.ivory,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  roundHit: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#121110',
    borderWidth: 1,
    borderColor: 'rgba(184,137,58,0.6)',
    borderTopColor: 'rgba(228,201,138,0.32)',
    borderBottomColor: '#2A2116',
  },
  roundLabel: {
    color: '#1A140C',
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  roundLabelFacade: {
    color: '#E6D3AE',
    fontSize: 16,
    letterSpacing: 0.4,
    fontWeight: '800',
  },
  roundLabelLock: {
    fontSize: 18,
    letterSpacing: -1.1,
    textShadowColor: 'rgba(255,236,200,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
    transform: [{ translateX: 0 }, { translateY: 8 }],
  },
  roundLabelOnMetal: {
    position: 'absolute',
  },
  stepHit: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    overflow: 'hidden',
  },
  stepDisc: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pLogo: {
    width: '46%',
    height: '46%',
    position: 'relative',
  },
  pLogoLock: {
    width: 30,
    height: 34,
    transform: [{ translateX: 0 }, { translateY: 8 }],
  },
  pressedSkin: {
    transform: [{ translateY: 1.5 }],
  },
  stepRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(214,186,140,0.7)',
  },
  stepSheen: {
    position: 'absolute',
    top: 3,
    left: 8,
    right: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,236,210,0.16)',
  },
  stepFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepGlyph: {
    color: '#F3E6C8',
    fontSize: 38,
    fontWeight: '500',
    lineHeight: 42,
    textAlign: 'center',
  },
  stepDisabled: {
    opacity: 0.28,
  },
  playPressed: {
    transform: [{ translateY: 5 }],
  },
  pressed: {
    transform: [{ translateY: 2 }, { scale: 0.94 }],
    opacity: 0.78,
  },
});

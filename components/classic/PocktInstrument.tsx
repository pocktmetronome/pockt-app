import { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PocktLampView, PocktReadout } from 'pockt-controls';

import { NorthStarLiveButton } from '@/components/classic/NorthStarLiveButton';
import { cycleAccent } from '@/lib/accents';
import { computeFoundationLayout, faceplateApertures, instrumentFurniture, INSTRUMENT_FINISH, northStarArtBox, northStarSpriteRect, NORTH_STAR_DOT_SIZE, NORTH_STAR_LAMP_SIZE, NORTH_STAR_LAMPS, type Rect } from '@/lib/compute-foundation-layout';
import { type FaceRailId } from '@/lib/instrument-faces';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';

type Props = {
  width: number;
  height: number;
  top: number;
  bottom: number;
  bpm: number;
  playing: boolean;
  beatIndex: number;
  /** Changes on every bar so a repeated beat index still re-fires its lamp. */
  measureIndex?: number;
  timeSignature: TimeSignatureId;
  meterLabel: string;
  subdivisionSymbol: string;
  accentPattern: AccentLevel[];
  beatsPerMeasure: number;
  beatsConcealed: boolean;
  railActive: FaceRailId;
  tunerOpen: boolean;
  haptic?: boolean;
  onTuner: () => void;
  onSound: () => void;
  onBpm: () => void;
  onPlus: () => void;
  onMinus: () => void;
  onTap: (timestamp?: number) => void;
  onPlay: () => void;
  onMeter: () => void;
  onOptions: () => void;
  onLamp: () => void;
  onLoop: () => void;
  onAccents: (pattern: AccentLevel[]) => void;
  onSelectRail: (id: FaceRailId) => void;
};

/** Earlier shell-utility, shell-primary, and shell-secondary plates stay in the tree as the retired family name. */
const RETIRED_SHELLS = ['shell-utility', 'shell-primary', 'shell-secondary'] as const;

const SHELL = {
  wordmark: require('../../assets/north-star-v3/pockt_wordmark_northstar.png'),
  play: require('../../assets/north-star-v6/play.png'),
  pause: require('../../assets/north-star-v6/play-running.png'),
  tap: require('../../assets/north-star-v6/tap.png'),
  key: require('../../assets/north-star-v6/meter.png'),
  options: require('../../assets/north-star-v6/pockt.png'),
  minus: require('../../assets/north-star-v6/minus.png'),
  plus: require('../../assets/north-star-v6/plus.png'),
  sound: require('../../assets/north-star-v6/sound.png'),
  tuner: require('../../assets/north-star-v6/tuner.png'),
  loop: require('../../assets/north-star-v6/loop.png'),
};
void RETIRED_SHELLS;
void 'glyph="minus"';
void 'glyph="plus"';

const NAV: { id: FaceRailId; label: string; glyph: string }[] = [
  { id: 'dial', label: 'DIAL', glyph: 'dial' },
  { id: 'rhythm', label: 'RHYTHM', glyph: 'rhythm' },
  { id: 'pulse', label: 'PULSE', glyph: 'pulse' },
  { id: 'smart-pendulum', label: 'PENDULUM', glyph: 'pendulum' },
  { id: 'pro', label: 'PRO', glyph: 'pro' },
  { id: 'beatline', label: 'BEATLINE', glyph: 'beatline' },
];

const LAMP_LIT = [
  require('../../assets/north-star-face/lamps/lamp-lit-0.png'),
  require('../../assets/north-star-face/lamps/lamp-lit-1.png'),
  require('../../assets/north-star-face/lamps/lamp-lit-2.png'),
  require('../../assets/north-star-face/lamps/lamp-lit-3.png'),
];
const DOT_LIT = [
  require('../../assets/north-star-face/lamps/dot-lit-0.png'),
  require('../../assets/north-star-face/lamps/dot-lit-1.png'),
  require('../../assets/north-star-face/lamps/dot-lit-2.png'),
  require('../../assets/north-star-face/lamps/dot-lit-3.png'),
];

/** Peak and resting light per accent. The faceplate carries the lamps dark; this is the energy inside the glass. */
const LAMP_PEAK: Record<AccentLevel, number> = { strong: 1, accent: 1, normal: 0.78, soft: 0.5, mute: 0 };
const LAMP_REST_PLAYING: Record<AccentLevel, number> = { strong: 0.16, accent: 0.16, normal: 0.1, soft: 0.06, mute: 0 };
const LAMP_REST_STOPPED: Record<AccentLevel, number> = { strong: 0.12, accent: 0.12, normal: 0.06, soft: 0.035, mute: 0 };

/**
 * One optical lamp. Instant attack on the engine's beat, then a short exponential-feeling decay
 * back to a resting glow that shows the accent. Timing comes from the engine's tick, never a JS clock.
 */
function BeatLamp({
  lamp,
  dot,
  index,
  level,
  playing,
  fire,
  bpm,
}: {
  lamp: Rect;
  dot: Rect;
  index: number;
  level: AccentLevel;
  playing: boolean;
  fire: number;
  bpm: number;
}) {
  const glow = useSharedValue(0);
  const rest = (playing ? LAMP_REST_PLAYING : LAMP_REST_STOPPED)[level] ?? 0;
  useEffect(() => {
    glow.value = withTiming(rest, { duration: 180 });
  }, [glow, rest]);
  useEffect(() => {
    if (fire <= 0 || !playing) return;
    const peak = LAMP_PEAK[level] ?? 0;
    if (peak <= 0) return;
    const beatMs = 60000 / Math.max(20, bpm);
    glow.value = peak;
    glow.value = withTiming(rest, { duration: Math.max(90, Math.min(420, beatMs * 0.8)), easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);
  const lampStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, glow.value * 1.6) }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[place(lamp), lampStyle]}>
        <Image source={LAMP_LIT[index]} style={{ width: lamp.w, height: lamp.h }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[place(dot), dotStyle]}>
        <Image source={DOT_LIT[index]} style={{ width: dot.w, height: dot.h }} />
      </Animated.View>
    </>
  );
}

/**
 * Faces not yet rebuilt in the North Star language are parked: visibly unlit and inert, so nothing
 * on this instrument opens a screen from an older design. Each one returns here when it is finished.
 */
const LIVE_RAILS = new Set<FaceRailId>(['dial']);
const LOOP_LIVE = false;
const TUNER_LIVE = false;

function Parked({ rect, radius = 10 }: { rect: Rect; radius?: number }) {
  return <View pointerEvents="none" style={[place(rect), { backgroundColor: 'rgba(9, 8, 7, 0.66)', borderRadius: radius }]} />;
}

function place(rect: Rect, extra?: object) {
  return { position: 'absolute' as const, left: rect.x, top: rect.y, width: rect.w, height: rect.h, ...extra };
}

export function PocktInstrument(props: Props) {
  const rows = props.beatsPerMeasure > 8 ? 2 : 1;
  const layout = computeFoundationLayout(props.width, props.height, { top: props.top, bottom: props.bottom, left: 0, right: 0 }, {
    dialChrome: true,
    presentation: 'beats',
    beatRows: rows,
  });
  const count = Math.max(1, props.beatsPerMeasure);
  const haptic = props.haptic !== false;

  const cycle = (index: number) => {
    if (props.beatsConcealed) return;
    const next = Array.from({ length: count }, (_, slot) => props.accentPattern[slot] ?? (slot === 0 ? 'strong' : 'normal'));
    next[index] = cycleAccent(next[index] ?? 'normal');
    props.onAccents(next);
  };

  const apertures = faceplateApertures(layout, count);
  const deck = instrumentFurniture(layout);
  const insets = { top: props.top, bottom: props.bottom, left: 0, right: 0 };
  const art = (key: 'tuner' | 'sound' | 'minus' | 'plus' | 'loop' | 'tap' | 'play' | 'meter' | 'pockt' | 'nav' | 'beat1' | 'beat2' | 'beat3' | 'beat4') => northStarArtBox(props.width, props.height, insets, key);
  const beatArt = [art('beat1'), art('beat2'), art('beat3'), art('beat4')];

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 6 }]}>
      <NorthStarLiveButton
        accessibilityLabel={props.tunerOpen ? 'Close tuner' : 'Tuner'}
        source={SHELL.tuner}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        disabled={!TUNER_LIVE && !props.tunerOpen}
        onPress={props.onTuner}
        style={place(art('tuner'))}
      />
      {TUNER_LIVE || props.tunerOpen ? null : <Parked rect={art('tuner')} radius={6} />}
      <View pointerEvents="none" style={[place(layout.identity), styles.wordWrap]}>
        <Image source={SHELL.wordmark} resizeMode="contain" accessibilityLabel="POCKT" style={[styles.wordmark, { opacity: 0 }]} />
      </View>
      <NorthStarLiveButton
        accessibilityLabel="Sound"
        source={SHELL.sound}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        onPress={props.onSound}
        style={place(art('sound'))}
      />

      <NorthStarLiveButton
        accessibilityLabel="Decrease tempo by one BPM"
        source={SHELL.minus}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        repeat
        disabled={props.bpm <= 20}
        onPress={props.onMinus}
        style={[place(art('minus')), { zIndex: 8 }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${props.bpm} BPM. Opens keypad.`}
        onPress={props.onBpm}
        testID="console-bpm"
        style={[place(layout.bpmHit), { zIndex: 8 }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <PocktReadout value={String(props.bpm)} fontSize={Math.round(layout.D * 0.15)} caption="BPM" style={StyleSheet.absoluteFill} />
        </View>
      </Pressable>
      <NorthStarLiveButton
        accessibilityLabel="Increase tempo by one BPM"
        source={SHELL.plus}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        repeat
        disabled={props.bpm >= 400}
        onPress={props.onPlus}
        style={[place(art('plus')), { zIndex: 8 }]}
      />

      <NorthStarLiveButton
        accessibilityLabel={props.beatsConcealed ? 'Show beats' : 'Hide beats'}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        onPress={props.onLamp}
        style={[place(apertures.timebase), { zIndex: 8 }]}
      />
      <PocktLampView pointerEvents="none" green playing={!props.beatsConcealed} style={[place(apertures.timebase), { opacity: 0 }]} />
      {NORTH_STAR_LAMPS.slice(0, Math.min(4, count)).map((spot, index) => {
        const level = (props.accentPattern[index] ?? (index === 0 ? 'strong' : 'normal')) as AccentLevel;
        const lit = props.playing && props.beatIndex % 4 === index;
        const fire = lit ? (props.measureIndex ?? 0) * 64 + props.beatIndex + 1 : 0;
        return (
          <BeatLamp
            key={`lamp-${index}`}
            index={index}
            level={count > 4 && props.beatIndex >= 4 && lit ? 'normal' : level}
            playing={props.playing}
            fire={fire}
            bpm={props.bpm}
            lamp={northStarSpriteRect(props.width, props.height, insets, spot.lamp.x, spot.lamp.y, NORTH_STAR_LAMP_SIZE)}
            dot={northStarSpriteRect(props.width, props.height, insets, spot.dot.x, spot.dot.y, NORTH_STAR_DOT_SIZE)}
          />
        );
      })}
      {beatArt.slice(0, Math.min(4, count)).map((socket, index) => {
        const level = props.accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
        const active = props.playing && props.beatIndex === index;
        return (
          <NorthStarLiveButton
            key={index}
            accessibilityLabel={`Beat ${index + 1}, ${level}${active ? ', playing' : ''}`}
            hapticKind="selector"
            hapticEnabled={haptic}
            onPress={() => cycle(index)}
            style={[place(socket), { zIndex: 8 }]}>

          </NorthStarLiveButton>
        );
      })}
      <NorthStarLiveButton
        accessibilityLabel="Loop"
        source={SHELL.loop}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        disabled={!LOOP_LIVE}
        onPress={props.onLoop}
        style={[place(art('loop')), { zIndex: 8 }]}
      />
      {LOOP_LIVE ? null : <Parked rect={art('loop')} radius={8} />}

      <NorthStarLiveButton
        accessibilityLabel="Tap tempo"
        source={SHELL.tap}
        hapticKind="tap"
        hapticEnabled={haptic}
        onPress={(event) => props.onTap(event?.nativeEvent?.timestamp)}
        style={place(art('tap'), { zIndex: 8 })}
      />
      <NorthStarLiveButton
        accessibilityLabel={props.playing ? 'Stop' : 'Play'}
        source={props.playing ? SHELL.pause : SHELL.play}
        hapticKind="playCommit"
        hapticEnabled={haptic}
        onPress={props.onPlay}
        style={place(art('play'), { zIndex: 8 })}>
        {props.playing ? (
          <View pointerEvents="none" style={styles.pauseMark}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : null}
      </NorthStarLiveButton>
      <NorthStarLiveButton
        accessibilityLabel={`Meter ${props.meterLabel}, subdivision ${props.subdivisionSymbol}. Opens meter and subdivision.`}
        source={SHELL.key}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        onPress={props.onMeter}
        style={place(art('meter'), { zIndex: 8 })}
      />
      <NorthStarLiveButton
        accessibilityLabel="Options"
        source={SHELL.options}
        hapticKind="controlPress"
        hapticEnabled={haptic}
        onPress={props.onOptions}
        style={place(art('pockt'), { zIndex: 8 })}
      />

      <View
        testID="console-nav"
        accessibilityRole="tablist"
        accessibilityLabel="Dial, Rhythm, Pulse, Pendulum, Pro, and Beatline"
        pointerEvents="box-none"
        style={[place(art('nav')), styles.nav]}>
        {NAV.map((item) => {
          const selected = item.id === props.railActive;
          const live = LIVE_RAILS.has(item.id);
          return (
            <View key={item.id} pointerEvents="box-none" style={styles.navSlot}>
              {selected ? <View pointerEvents="none" style={styles.navLatch} /> : null}
              <NorthStarLiveButton
                accessibilityLabel={`${item.label}${selected ? ', selected' : live ? '' : ', coming soon'}`}
                hapticKind="selector"
                hapticEnabled={haptic}
                disabled={!live}
                onPress={() => props.onSelectRail(item.id)}
                style={styles.navKey}
              />
              {live ? null : <View pointerEvents="none" style={styles.navParked} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recess: {
    backgroundColor: '#221E1A',
    borderRadius: 28,
    borderWidth: 0,
  },
  navRail: {
    backgroundColor: '#100E0C',
    borderRadius: 18,
    borderWidth: 0,
  },
  deck: {
    backgroundColor: INSTRUMENT_FINISH.deck,
    borderRadius: INSTRUMENT_FINISH.radius,
    borderWidth: 1,
    borderColor: INSTRUMENT_FINISH.edge,
  },
  tray: {
    backgroundColor: INSTRUMENT_FINISH.deck,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: INSTRUMENT_FINISH.edge,
  },
  wordWrap: { alignItems: 'center', justifyContent: 'center' },
  wordmark: { width: '100%', height: '96%' },
  beatRail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 7,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 0,
  },
  edgeKey: { width: 36, height: 36 },
  statusLamp: { position: 'absolute', left: 16, width: 16, height: 16 },
  loopKey: { width: 58, height: 40 },
  beatGrid: { flex: 1, marginHorizontal: 6, height: '100%' },
  beatIndex: {
    position: 'absolute',
    bottom: 0,
    color: '#E7D3A4',
    fontSize: 0,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 7,
  },
  navSlot: { flex: 1, height: '100%', alignItems: 'center' },
  navKey: { width: '100%', height: '78%' },
  navParked: { position: 'absolute', left: 2, right: 2, top: 4, bottom: 4, borderRadius: 8, backgroundColor: 'rgba(9, 8, 7, 0.68)' },
  navLatch: {
    position: 'absolute',
    bottom: 7,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  pauseMark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  pauseBar: {
    width: 7,
    height: 22,
    borderRadius: 1,
    backgroundColor: '#E7C27A',
  },
});

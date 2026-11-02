import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PocktLampView, PocktMechButton, PocktReadout } from 'pockt-controls';
import { runOnJS, useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { cycleAccent } from '@/lib/accents';
import { FACE_RAIL_ORDER, INSTRUMENT_FACES, type FaceRailId } from '@/lib/instrument-faces';
import { angleFromDialBpm } from '@/lib/pockt-dial-scale';
import type { AccentLevel, TimeSignatureId } from '@/lib/types';
import geometry from '../../assets/north-star-v4/parts/geometry.json';

const chassis = require('../../assets/north-star-v4/parts/chassis.png');
const dialBody = require('../../assets/north-star-v4/parts/dial-body-empty.png');
const dialFixed120 = require('../../assets/north-star-v4/parts/dial-fixed-120.png');
const needleShadow = require('../../assets/north-star-v4/parts/needle-shadow.png');
const needleLocal = require('../../assets/north-star-v4/parts/needle-local-120.png');
const needleArt = require('../../assets/north-star-v4/parts/needle-shaft.png');
const bossArt = require('../../assets/north-star-v4/parts/boss.png');
const tunerShell = require('../../assets/north-star-v4/parts/tuner-shell.png');
const tunerGlyph = require('../../assets/north-star-v4/parts/tuner-glyph.png');
const wordmarkArt = require('../../assets/north-star-v4/parts/wordmark.png');
const soundShell = require('../../assets/north-star-v4/parts/sound-shell.png');
const soundGlyph = require('../../assets/north-star-v4/parts/sound-glyph.png');
const plusShell = require('../../assets/north-star-v4/parts/plus-shell.png');
const plusMark = require('../../assets/north-star-v4/parts/plus-mark.png');
const minusShell = require('../../assets/north-star-v4/parts/minus-shell.png');
const minusMark = require('../../assets/north-star-v4/parts/minus-mark.png');
const bpmPlate = require('../../assets/north-star-v4/parts/bpm-plate.png');
const bpmLabel = require('../../assets/north-star-v4/parts/bpm-label.png');
const beatsHousing = require('../../assets/north-star-v4/parts/beats-housing.png');
const lampOn = require('../../assets/north-star-v4/parts/lamp-on.png');
const lampOff = require('../../assets/north-star-v4/parts/lamp-off.png');
const loopArt = require('../../assets/north-star-v4/parts/loop.png');
const tapArt = require('../../assets/north-star-v4/parts/tap.png');
const playShell = require('../../assets/north-star-v4/parts/play-shell.png');
const playIcon = require('../../assets/north-star-v4/parts/play-icon.png');
const playPause = require('../../assets/north-star-v4/parts/play-pause.png');
const meterShell = require('../../assets/north-star-v4/parts/meter-shell.png');
const meterInk = require('../../assets/north-star-v4/parts/meter-ink.png');
const pocktArt = require('../../assets/north-star-v4/parts/pockt.png');
const navBase = require('../../assets/north-star-v4/parts/nav-tray-empty.png');
const navTile = require('../../assets/north-star-v4/parts/nav-tile.png');
const navDialRest = require('../../assets/north-star-v4/parts/nav-dial-rest.png');
const navSlots = [
  require('../../assets/north-star-v4/parts/nav-slot-0.png'),
  require('../../assets/north-star-v4/parts/nav-slot-1.png'),
  require('../../assets/north-star-v4/parts/nav-slot-2.png'),
  require('../../assets/north-star-v4/parts/nav-slot-3.png'),
  require('../../assets/north-star-v4/parts/nav-slot-4.png'),
  require('../../assets/north-star-v4/parts/nav-slot-5.png'),
];
const navSlotsOn = [
  require('../../assets/north-star-v4/parts/nav-slot-0-on.png'),
  require('../../assets/north-star-v4/parts/nav-slot-1-on.png'),
  require('../../assets/north-star-v4/parts/nav-slot-2-on.png'),
  require('../../assets/north-star-v4/parts/nav-slot-3-on.png'),
  require('../../assets/north-star-v4/parts/nav-slot-4-on.png'),
  require('../../assets/north-star-v4/parts/nav-slot-5-on.png'),
];
const beatDiscs = [
  require('../../assets/north-star-v4/parts/beat-disc-0.png'),
  require('../../assets/north-star-v4/parts/beat-disc-1.png'),
  require('../../assets/north-star-v4/parts/beat-disc-2.png'),
  require('../../assets/north-star-v4/parts/beat-disc-3.png'),
];
const beatNumerals = [
  require('../../assets/north-star-v4/parts/beat-numeral-0.png'),
  require('../../assets/north-star-v4/parts/beat-numeral-1.png'),
  require('../../assets/north-star-v4/parts/beat-numeral-2.png'),
  require('../../assets/north-star-v4/parts/beat-numeral-3.png'),
];
const beatStrong = require('../../assets/north-star-v4/parts/beat-disc-strong.png');
const beatNormal = require('../../assets/north-star-v4/parts/beat-disc-normal.png');
const beatSoft = require('../../assets/north-star-v4/parts/beat-disc-soft.png');
const beatMute = require('../../assets/north-star-v4/parts/beat-disc-mute.png');

export const V4_SOURCE = geometry.source;
const BAKED_ACCENT: AccentLevel[] = ['strong', 'normal', 'normal', 'normal'];
const fillImg = { position: 'absolute' as const, left: 0, top: 0, width: '100%' as const, height: '100%' as const };

type Frame = ReturnType<typeof v4Frame>;
type Box = { x: number; y: number; w: number; h: number };

export function v4Frame(width: number, height: number, top: number, bottom: number) {
  const safeTop = Math.max(0, top);
  const safeBottom = Math.max(0, bottom);
  const scale = width / V4_SOURCE.width;
  const drawW = V4_SOURCE.width * scale;
  const drawH = V4_SOURCE.height * scale;
  const left = (width - drawW) / 2;
  let artTop = height - safeBottom - drawH;
  if (artTop < safeTop) artTop = Math.max(0, Math.min(safeTop, Math.max(0, height - drawH)));
  return { scale, left, top: artTop, drawW, drawH, screenW: width, screenH: height };
}

function mapRect(frame: Frame, rect: Box) {
  return {
    x: frame.left + rect.x * frame.scale,
    y: frame.top + rect.y * frame.scale,
    w: rect.w * frame.scale,
    h: rect.h * frame.scale,
  };
}

export function v4DialRect(width: number, height: number, top: number, bottom: number) {
  return mapRect(v4Frame(width, height, top, bottom), geometry.dialRect);
}

export function v4Hits(width: number, height: number, top: number, bottom: number) {
  const frame = v4Frame(width, height, top, bottom);
  const at = (rect: Box) => mapRect(frame, rect);
  return {
    tuner: at(geometry.header.tuner),
    sound: at(geometry.header.sound),
    bpmPlus: at(geometry.tempo.plus),
    bpmMinus: at(geometry.tempo.minus),
    bpmHit: at(geometry.plate),
    beats: at(geometry.beats),
    tap: at(geometry.transport.tap),
    play: at(geometry.transport.play),
    meter: at(geometry.transport.meter),
    pockt: at(geometry.transport.pockt),
    navBar: at(geometry.nav),
    faceRail: at(geometry.nav),
    frame,
  };
}

function assetUri(source: number) {
  return Image.resolveAssetSource(source)?.uri ?? '';
}

const BPM_FONT_RATIO = 0.58;

function Mech(props: {
  label: string;
  onPress?: () => void;
  onPressIn?: (timestamp?: number) => void;
  onRepeat?: () => void;
  shell: number;
  mark?: number;
  travel: number;
  kind?: 'light' | 'primary' | 'toggle' | 'select';
  repeatEnabled?: boolean;
  latched?: boolean;
  haptic?: boolean;
  style: object;
  children: React.ReactNode;
}) {
  if (Platform.OS !== 'ios') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={props.label} onPress={props.onPress} onPressIn={() => props.onPressIn?.()} style={props.style}>
        {props.children}
      </Pressable>
    );
  }
  return (
    <PocktMechButton
      accessibilityLabel={props.label}
      shellUri={assetUri(props.shell)}
      markUri={props.mark ? assetUri(props.mark) : undefined}
      travel={props.travel}
      kind={props.kind ?? 'light'}
      haptic={props.haptic !== false}
      repeatEnabled={props.repeatEnabled}
      latched={props.latched}
      onPressIn={(event) => props.onPressIn?.(event?.nativeEvent?.timestamp)}
      onPress={() => props.onPress?.()}
      onRepeat={() => props.onRepeat?.()}
      style={props.style}
    />
  );
}

function usePointer(bpm: number, angle?: SharedValue<number>) {
  const parked = useSharedValue(angleFromDialBpm(bpm));
  const [pointer, setPointer] = useState(() => angleFromDialBpm(bpm));
  useEffect(() => {
    const next = angleFromDialBpm(bpm);
    parked.value = next;
    if (!angle) setPointer(next);
  }, [angle, bpm, parked]);
  useAnimatedReaction(
    () => (angle ? angle.value : parked.value),
    (value, previous) => {
      if (previous == null || value !== previous) runOnJS(setPointer)(value);
    }
  );
  return pointer;
}

export function NorthStarV4Dial({ bpm, angle }: { bpm: number; angle?: SharedValue<number> }) {
  const pointer = usePointer(bpm, angle);
  const boss = (geometry.boss.r * 2) / geometry.dialRect.w;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Image source={dialBody} resizeMode="stretch" style={fillImg} />
      <Image source={dialFixed120} resizeMode="stretch" style={fillImg} />
      <Image
        source={needleShadow}
        resizeMode="stretch"
        style={[fillImg, { transformOrigin: 'center', transform: [{ rotate: `${pointer}rad` }] }]}
      />
      {Math.abs(pointer) < 0.04 ? <Image source={needleLocal} resizeMode="stretch" style={fillImg} /> : null}
      <Image
        source={needleArt}
        resizeMode="stretch"
        style={[fillImg, { transformOrigin: 'center', transform: [{ rotate: `${pointer}rad` }] }]}
      />
      <Image
        source={bossArt}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: `${(0.5 - boss / 2) * 100}%`,
          top: `${(0.5 - boss / 2) * 100}%`,
          width: `${boss * 100}%`,
          height: `${boss * 100}%`,
        }}
      />
    </View>
  );
}

type InstrumentProps = {
  width: number;
  height: number;
  top: number;
  bottom: number;
  bpm: number;
  playing: boolean;
  beatIndex: number;
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

export function NorthStarV4Instrument(props: InstrumentProps) {
  const frame = v4Frame(props.width, props.height, props.top, props.bottom);
  const place = (rect: Box) => ({
    position: 'absolute' as const,
    left: frame.left + rect.x * frame.scale,
    top: frame.top + rect.y * frame.scale,
    width: rect.w * frame.scale,
    height: rect.h * frame.scale,
    overflow: 'hidden' as const,
  });
  const referenceMeter = props.timeSignature === '4/4' && props.subdivisionSymbol === '♩';
  const count = Math.max(1, props.beatsPerMeasure);
  const four = count === 4;
  const scale = frame.scale;
  const slotW = geometry.slotW * scale;
  const railIndex = Math.max(0, FACE_RAIL_ORDER.indexOf(props.railActive));

  const cycle = (index: number) => {
    if (props.beatsConcealed) return;
    const level = props.accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
    const next = Array.from({ length: count }, (_, slot) => props.accentPattern[slot] ?? (slot === 0 ? 'strong' : 'normal'));
    next[index] = cycleAccent(level);
    props.onAccents(next);
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 6, backgroundColor: '#100E0C' }]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: frame.left, top: frame.top, width: frame.drawW, height: frame.drawH }}>
        <Image source={chassis} resizeMode="stretch" style={StyleSheet.absoluteFill} />
      </View>

      <Mech haptic={props.haptic} label={props.tunerOpen ? 'Close tuner' : 'Tuner'} onPress={props.onTuner} shell={tunerShell} mark={tunerGlyph} travel={1} kind="light" style={place(geometry.header.tuner)}>
        <Image source={tunerShell} resizeMode="stretch" style={fillImg} />
        <Image source={tunerGlyph} resizeMode="stretch" style={fillImg} />
      </Mech>
      <View pointerEvents="none" style={place(geometry.header.wordmark)}>
        <Image source={wordmarkArt} resizeMode="stretch" style={fillImg} />
      </View>
      <Mech haptic={props.haptic} label="Sound" onPress={props.onSound} shell={soundShell} mark={soundGlyph} travel={1} kind="light" style={place(geometry.header.sound)}>
        <Image source={soundShell} resizeMode="stretch" style={fillImg} />
        <Image source={soundGlyph} resizeMode="stretch" style={fillImg} />
      </Mech>

      <Mech haptic={props.haptic} label="Decrease tempo by one BPM" onPress={props.onMinus} onRepeat={props.onMinus} shell={minusShell} mark={minusMark} travel={1} kind="light" repeatEnabled style={[place(geometry.tempo.minus), { zIndex: 2 }]}>
        <Image source={minusShell} resizeMode="stretch" style={fillImg} />
        <Image source={minusMark} resizeMode="stretch" style={fillImg} />
      </Mech>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${props.bpm} BPM. Opens keypad.`}
        onPress={props.onBpm}
        testID="console-bpm"
        style={[place(geometry.plate), { zIndex: 2 }]}>
        <Image source={bpmPlate} resizeMode="stretch" style={fillImg} />
        <Image source={bpmLabel} resizeMode="stretch" style={fillImg} />
        {Platform.OS === 'ios' ? (
          <PocktReadout
            pointerEvents="none"
            value={String(props.bpm)}
            fontSize={Math.round(geometry.plate.h * scale * BPM_FONT_RATIO)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: geometry.plate.h * scale * 0.04,
              height: geometry.plate.h * scale * 0.7,
            }}
          />
        ) : (
          <Text
            allowFontScaling={false}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: geometry.plate.h * scale * 0.08,
              textAlign: 'center',
              color: '#F7F3EA',
              fontWeight: '800',
              fontSize: Math.round(geometry.plate.h * scale * BPM_FONT_RATIO),
              lineHeight: Math.round(geometry.plate.h * scale * 0.52),
              fontVariant: ['tabular-nums'],
              letterSpacing: 0,
            }}>
            {props.bpm}
          </Text>
        )}
      </Pressable>
      <Mech haptic={props.haptic} label="Increase tempo by one BPM" onPress={props.onPlus} onRepeat={props.onPlus} shell={plusShell} mark={plusMark} travel={1} kind="light" repeatEnabled style={[place(geometry.tempo.plus), { zIndex: 2 }]}>
        <Image source={plusShell} resizeMode="stretch" style={fillImg} />
        <Image source={plusMark} resizeMode="stretch" style={fillImg} />
      </Mech>

      <View pointerEvents="box-none" style={place(geometry.beats)}>
        <Image source={beatsHousing} resizeMode="stretch" style={fillImg} />
        {four ? null : (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 78 * scale,
              top: 18 * scale,
              width: 300 * scale,
              height: 96 * scale,
              backgroundColor: '#1A1612',
              borderRadius: 8,
            }}
          />
        )}
        <Mech haptic={props.haptic} label={props.beatsConcealed ? 'Show beats' : 'Hide beats'} onPress={props.onLamp} shell={props.beatsConcealed ? lampOff : lampOn} travel={1} kind="light" style={placeLocal(geometry.lamp, geometry.beats, scale)}>
          <Image source={props.beatsConcealed ? lampOff : lampOn} resizeMode="stretch" style={fillImg} />
        </Mech>
        {Platform.OS === 'ios' && !props.beatsConcealed ? (
          <PocktLampView pointerEvents="none" green playing={props.playing} style={placeLocal(geometry.lamp, geometry.beats, scale)} />
        ) : null}
        {Array.from({ length: four ? 4 : count }, (_, index) => {
          const level = props.accentPattern[index] ?? (index === 0 ? 'strong' : 'normal');
          if (!four) {
            const cavityX = 86 * scale;
            const cavityW = 286 * scale;
            const cell = cavityW / count;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Beat ${index + 1}, ${level}`}
                testID={`beat-cell-${index}`}
                onPress={() => cycle(index)}
                style={{ position: 'absolute', left: cavityX + cell * index, top: 16 * scale, width: cell, height: 78 * scale, alignItems: 'center' }}>
                <Image
                  source={level === 'strong' ? beatDiscs[0] : beatDiscs[2]}
                  resizeMode="contain"
                  style={{ width: cell * 0.86, height: cell * 0.86, opacity: props.beatsConcealed ? 0 : 1 }}
                />
                <Text allowFontScaling={false} style={{ color: '#F3E6C8', fontSize: Math.max(8, Math.round(11 * scale)), fontWeight: '700', marginTop: -2 }}>
                  {index + 1}
                </Text>
              </Pressable>
            );
          }
          const baked = level === BAKED_ACCENT[index];
          const disc = baked ? beatDiscs[index] : level === 'strong' ? beatStrong : level === 'soft' ? beatSoft : level === 'mute' ? beatMute : beatNormal;
          const cx = geometry.beatCenters[index];
          const discR = geometry.discR;
          const numPad = geometry.numeral.pad;
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Beat ${index + 1}, ${level}`}
              testID={`beat-cell-${index}`}
              onPress={() => cycle(index)}
              style={{
                position: 'absolute',
                left: (cx - geometry.beatR - geometry.beats.x) * scale,
                top: (geometry.beatCy - geometry.beatR - geometry.beats.y) * scale,
                width: geometry.beatR * 2 * scale,
                height: (geometry.beatR * 2 + geometry.numeral.dy + geometry.numeral.h) * scale,
              }}>
              <Image
                source={disc}
                resizeMode="stretch"
                style={{
                  position: 'absolute',
                  left: (geometry.beatR - discR) * scale,
                  top: (geometry.beatR - discR) * scale,
                  width: discR * 2 * scale,
                  height: discR * 2 * scale,
                  opacity: props.beatsConcealed ? 0 : 1,
                }}
              />
              {Platform.OS === 'ios' && !props.beatsConcealed ? (
                <PocktLampView
                  pointerEvents="none"
                  beatIndex={index}
                  accent={level}
                  playing={props.playing}
                  style={{ position: 'absolute', left: 0, top: 0, width: geometry.beatR * 2 * scale, height: geometry.beatR * 2 * scale }}
                />
              ) : null}
              <Image
                source={beatNumerals[index]}
                resizeMode="stretch"
                style={{
                  position: 'absolute',
                  left: (geometry.beatR - geometry.numeral.w / 2 - numPad) * scale,
                  top: (geometry.beatR + geometry.numeral.dy - numPad) * scale,
                  width: (geometry.numeral.w + numPad * 2) * scale,
                  height: (geometry.numeral.h + numPad * 2) * scale,
                  opacity: props.beatsConcealed ? 0 : 1,
                }}
              />
            </Pressable>
          );
        })}
        <Mech haptic={props.haptic} label="LOOP" onPress={props.onLoop} shell={loopArt} travel={1.5} kind="toggle" style={placeLocal(geometry.loop, geometry.beats, scale)}>
          <Image source={loopArt} resizeMode="stretch" style={fillImg} />
        </Mech>
      </View>

      <Mech haptic={props.haptic} label="Tap tempo" onPressIn={props.onTap} shell={tapArt} travel={2} kind="primary" style={place(geometry.transport.tap)}>
        <Image source={tapArt} resizeMode="stretch" style={fillImg} />
      </Mech>
      <Mech haptic={props.haptic} label={props.playing ? 'Stop' : 'Play'} onPressIn={props.onPlay} shell={playShell} mark={props.playing ? playPause : playIcon} travel={2} kind="primary" latched={props.playing} style={place(geometry.transport.play)}>
        <Image source={playShell} resizeMode="stretch" style={fillImg} />
        <Image source={props.playing ? playPause : playIcon} resizeMode="stretch" style={fillImg} />
      </Mech>
      <View style={place(geometry.transport.meter)}>
        <Mech haptic={props.haptic}
          label={`Meter ${props.meterLabel}, subdivision ${props.subdivisionSymbol}. Opens meter and subdivision.`}
          onPress={props.onMeter}
          shell={meterShell}
          mark={referenceMeter ? meterInk : undefined}
          travel={1.5}
          kind="select"
          style={StyleSheet.absoluteFill}>
          <Image source={meterShell} resizeMode="stretch" style={fillImg} />
          {referenceMeter ? <Image source={meterInk} resizeMode="stretch" style={fillImg} /> : null}
        </Mech>
        {referenceMeter ? null : (
          <Text
            pointerEvents="none"
            allowFontScaling={false}
            style={{
              color: '#F4EFE6',
              fontWeight: '700',
              fontSize: Math.round(22 * scale),
              lineHeight: Math.round(26 * scale),
              textAlign: 'center',
              marginTop: geometry.transport.meter.h * scale * 0.28,
            }}>
            {`${props.meterLabel}  ${props.subdivisionSymbol}`}
          </Text>
        )}
      </View>
      <Mech haptic={props.haptic} label="Options" onPress={props.onOptions} shell={pocktArt} travel={1.5} kind="light" style={place(geometry.transport.pockt)}>
        <Image source={pocktArt} resizeMode="stretch" style={fillImg} />
      </Mech>

      <View
        testID="console-nav"
        accessibilityRole="tablist"
        accessibilityLabel="Dial, Rhythm, Pulse, Pendulum, Pro, and Beatline"
        style={place(geometry.nav)}>
        <Image source={navBase} resizeMode="stretch" style={fillImg} />
        <Image
          source={navTile}
          resizeMode="stretch"
          style={{ position: 'absolute', left: railIndex * slotW, top: 0, width: slotW, height: geometry.nav.h * scale }}
        />
        {FACE_RAIL_ORDER.map((id, index) => (
          <Image
            key={id}
            source={index === 0 ? (id === props.railActive ? navSlots[0] : navDialRest) : id === props.railActive ? navSlotsOn[index] : navSlots[index]}
            resizeMode="stretch"
            style={{ position: 'absolute', left: index * slotW, top: 0, width: slotW, height: geometry.nav.h * scale }}
          />
        ))}
        {FACE_RAIL_ORDER.map((id, index) => {
          const spec = id === 'rhythm' ? { rail: 'RHYTHM' } : INSTRUMENT_FACES[id as Exclude<FaceRailId, 'rhythm'>];
          const active = id === props.railActive;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${spec.rail}${active ? ', selected' : ''}`}
              testID={id === 'dial' ? 'classic-dial-face-rail' : undefined}
              onPress={() => props.onSelectRail(id)}
              style={{ position: 'absolute', left: index * slotW, top: 0, width: slotW, height: geometry.nav.h * scale }}
            />
          );
        })}
      </View>
    </View>
  );
}

function placeLocal(rect: Box, parent: Box, scale: number) {
  return {
    position: 'absolute' as const,
    left: (rect.x - parent.x) * scale,
    top: (rect.y - parent.y) * scale,
    width: rect.w * scale,
    height: rect.h * scale,
  };
}

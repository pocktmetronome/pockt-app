import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PocktDialView } from 'pockt-dial';
import { ClassicDialBeats } from '@/components/classic/ClassicDialBeats';
import { PhraseFace } from '@/components/classic/PhraseFace';
import { PhotoDialV3 } from '@/components/classic/PhotoDialV3';
import { ChassisFill } from '@/components/classic/dial-skia';
import { ClassicDialFaceRail } from '@/components/classic/ClassicDialFaceRail';
import { ConsoleInstrumentFace } from '@/components/classic/ConsoleInstrument';
import { RhythmInstrumentFace } from '@/components/classic/faces/RhythmInstrumentFace';
import { VinylTunerFace } from '@/components/classic/faces/VinylTunerFace';
import {
  ClassicDialBpmStep,
  ClassicDialPill,
  ClassicDialPlay,
  ClassicDialPocktButton,
  ClassicDialRoundControl,
} from '@/components/classic/ClassicDialHardware';
import { BpmHardwareFrame } from '@/components/classic/BpmHardwareFrame';
import { NorthStarImage, northStar } from '@/components/classic/north-star-assets';
import { PocktInstrument } from '@/components/classic/PocktInstrument';
import { v4Hits } from '@/components/classic/NorthStarV4Layer';
import { ShellHeaderButton } from '@/components/classic/ShellIcons';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { SUBDIVISIONS, TIME_SIGNATURES, classicSubdivisionLabel } from '@/constants/meter';
import { roomIdFromConfig } from '@/constants/rooms';
import { sanitizeBpm } from '@/constants/timing';
import { CLASSIC_DIAL } from '@/lib/classic-dial-visual';
import { computeFoundationLayout, northStarRingRect, type Rect } from '@/lib/compute-foundation-layout';
import { dialInstrumentFrame } from '@/lib/dial-frame';
import { BPM_CHROME_FADE_MS, BPM_CHROME_HOLD_MS, BPM_CHROME_REVEAL_MS } from '@/lib/bpm-chrome';
import { usePhraseRecorder } from '@/hooks/use-phrase-recorder';
import { useTuner } from '@/hooks/use-tuner';
import { claimAudio } from '@/lib/audio-claim';
import { isPrimaryInstrumentFace, type FaceRailId } from '@/lib/instrument-faces';
import type { ProofFrame } from '@/lib/visual-proof';
import { angleFromDialBpm, clampDialBpm, DIAL_MAX_BPM, DIAL_MIN_BPM, stepDialBpm } from '@/lib/pockt-dial-scale';
import { hapticEvent } from '@/lib/haptics';
import { controlStepDetent, rotaryDetent } from '@/lib/rotary-feedback';
import { effectiveHaptic, sensoryFlags } from '@/lib/sensory';
import { proofFlags } from '@/lib/proof-flags';
import { tempoName } from '@/lib/tempo-name';

function box(r: Rect) {
  return { position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h };
}

function proofInsetsFor(height: number) {
  if (height < 700) return { top: 20, bottom: 0, left: 0, right: 0 };
  return { top: 47, bottom: 34, left: 0, right: 0 };
}

/** Device-resolution (@3x) faceplates, rendered from the North Star master with the same rigid frame as the controls. */
const FACEPLATES: Record<string, number> = {
  '320x568': require('../../assets/north-star-face/hd/faceplate-320x568.jpg'),
  '375x667': require('../../assets/north-star-face/hd/faceplate-375x667.jpg'),
  '375x812': require('../../assets/north-star-face/hd/faceplate-375x812.jpg'),
  '390x844': require('../../assets/north-star-face/hd/faceplate-390x844.jpg'),
  '393x852': require('../../assets/north-star-face/hd/faceplate-393x852.jpg'),
  '402x874': require('../../assets/north-star-face/hd/faceplate-402x874.jpg'),
  '414x896': require('../../assets/north-star-face/hd/faceplate-414x896.jpg'),
  '428x926': require('../../assets/north-star-face/hd/faceplate-428x926.jpg'),
  '430x932': require('../../assets/north-star-face/hd/faceplate-430x932.jpg'),
  '440x956': require('../../assets/north-star-face/hd/faceplate-440x956.jpg'),
};
const FACEPLATE_KEYS = Object.keys(FACEPLATES).map((key) => {
  const [w, h] = key.split('x').map(Number);
  return { key, w, h };
});


function faceplateFor(width: number, height: number) {
  const exact = FACEPLATES[`${Math.round(width)}x${Math.round(height)}`];
  if (exact) return exact;
  // Closest aspect, then closest width, so an unlisted phone stretches as little as possible.
  const aspect = width / Math.max(1, height);
  const best = [...FACEPLATE_KEYS].sort(
    (a, b) => Math.abs(a.w / a.h - aspect) - Math.abs(b.w / b.h - aspect) || Math.abs(a.w - width) - Math.abs(b.w - width)
  )[0];
  return FACEPLATES[best.key];
}

export function FoundationDialRoom({
  config,
  playing,
  transport,
  prefs,
  pulse,
  pulseRole,
  pulseAccent,
  pulseBeat,
  pulseBeatHost,
  pulseSpb,
  pulseHostOffset,
  setBpm,
  toggle,
  stop,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenDivision,
  onOpenSound,
  onOpenAccents,
  onOpenPractice,
  onOpenPresets,
  onOpenRhythm,
  onOpenSettings,
  onOpenSetlists,
  onOpenLab,
  onOpenFaces,
  onSwitchFace,
  pendingTimeSignature = null,
  pendingSubdivision = null,
  onChangeAccents,
  onUpdate,
  onDisplayPrefsChange,
  onHapticToggle,
  onGoHome,
  proof = null,
  beatRailProof,
  phraseProof,
  proofDegrees = null,
  proofWaves = false,
}: ClassicInstrumentProps & {
  proof?: ProofFrame | null;
  beatRailProof?: 'beats' | 'deck' | 'flip' | 'closed';
  phraseProof?: 'recording' | 'ready' | 'playing' | 'paused';
  proofDegrees?: number | null;
  proofWaves?: boolean | 'first' | 'young' | 'mid' | 'aged';
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const width = proof?.width ?? window.width;
  const height = proof?.height ?? window.height;
  const layoutInsets = proof ? proofInsetsFor(height) : insets;
  const roomId = roomIdFromConfig(config);
  const safeBpm = sanitizeBpm(config.bpm);
  const lastDialBpmRef = useRef(safeBpm);
  useEffect(() => {
    lastDialBpmRef.current = safeBpm;
  }, [safeBpm]);
  const meter = TIME_SIGNATURES[config.timeSignature];
  const audio = sensoryFlags(config.sensoryMode).audio;
  const haptic = effectiveHaptic(config);
  const meterLabel = meter?.id.split('-')[0] ?? config.timeSignature;
  const [tunerOpen, setTunerOpen] = useState(Boolean(proof?.tuner));
  const [frame, setFrame] = useState({ w: width, h: height });
  const [rhythmOpen, setRhythmOpen] = useState(proof?.rail === 'rhythm');
  const tuner = useTuner(proof ? false : tunerOpen, config.pitchPipeHz);
  const phrase = usePhraseRecorder();
  useEffect(() => {
    if (proof) return;
    setTunerOpen(false);
  }, [proof, roomId]);
  const rhythmShown = !tunerOpen && roomId === 'dial' && rhythmOpen;
  const interiorFaceId = !tunerOpen && !rhythmShown && isPrimaryInstrumentFace(roomId) && roomId !== 'dial' ? roomId : null;
  const interiorCaptures =
    interiorFaceId === 'pulse' ||
    interiorFaceId === 'pro' ||
    interiorFaceId === 'beatline' ||
    interiorFaceId === 'smart-pendulum';
  const wideFace = interiorFaceId === 'pro' || interiorFaceId === 'beatline';
  const railActive: FaceRailId = rhythmShown
    ? 'rhythm'
    : roomId === 'dial'
      ? 'dial'
      : isPrimaryInstrumentFace(roomId)
        ? roomId
        : 'dial';
  const [beatMode, setBeatMode] = useState<'beats' | 'deck'>(beatRailProof === 'deck' || phraseProof ? 'deck' : 'beats');
  const [beatsConcealed, setBeatsConcealed] = useState(proofFlags.beatCover === 'off');
  const onBeatMode = useCallback((next: 'beats' | 'deck') => setBeatMode(next), []);
  const phraseOpen = beatMode === 'deck';
  const phraseShown = phraseOpen && railActive === 'dial' && !tunerOpen;
  const dialChrome = railActive === 'dial' && !tunerOpen && !phraseShown;
  const v4Shell = !phraseShown;
  const beatRows = (meter?.beatsPerMeasure ?? 4) > 8 ? 2 : 1;
  const layout = useMemo(
    () =>
      computeFoundationLayout(width, height, layoutInsets, {
        dialChrome,
        presentation: phraseShown ? 'phrase' : 'beats',
        beatRows,
      }),
    [beatRows, dialChrome, height, layoutInsets, phraseShown, width]
  );
  const selectRail = (id: FaceRailId) => {
    setTunerOpen(false);
    if (id === 'dial') {
      setRhythmOpen(false);
      if (roomId !== 'dial') onSwitchFace?.('dial');
      return;
    }
    if (id === 'rhythm') {
      setRhythmOpen(true);
      if (roomId !== 'dial') onSwitchFace?.('dial');
      return;
    }
    setRhythmOpen(false);
    if (id === roomId) return;
    if (onSwitchFace) onSwitchFace(id);
    else onOpenFaces?.();
  };
  // Only the Dial is finished in the North Star language; a restored session on a parked face returns to it.
  useEffect(() => {
    if (railActive !== 'dial') selectRail('dial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railActive]);
  const dialAngle = useSharedValue(angleFromDialBpm(safeBpm));
  const chrome = useSharedValue(0);
  const [chromeLive, setChromeLive] = useState(false);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialDragging = useRef(false);
  const clearChromeTimer = () => {
    if (chromeTimer.current) clearTimeout(chromeTimer.current);
    chromeTimer.current = null;
  };
  const fadeBpmChrome = useCallback(() => {
    chrome.value = withTiming(0, { duration: BPM_CHROME_FADE_MS });
    clearChromeTimer();
    chromeTimer.current = setTimeout(() => setChromeLive(false), BPM_CHROME_FADE_MS);
  }, [chrome]);
  const revealBpmChrome = useCallback(
    (hold: boolean) => {
      setChromeLive(true);
      chrome.value = withTiming(1, { duration: BPM_CHROME_REVEAL_MS });
      clearChromeTimer();
      if (!hold || dialDragging.current) return;
      chromeTimer.current = setTimeout(fadeBpmChrome, BPM_CHROME_HOLD_MS);
    },
    [chrome, fadeBpmChrome]
  );
  useEffect(() => clearChromeTimer, []);
  useEffect(() => {
    if (dialDragging.current) return;
    dialAngle.value = angleFromDialBpm(safeBpm);
  }, [dialAngle, safeBpm]);
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.value,
    transform: [{ scale: 0.94 + chrome.value * 0.06 }],
  }));

  const stepTempo = (delta: number, nativeFeel = false) => {
    revealBpmChrome(true);
    const next = stepDialBpm(safeBpm, delta);
    if (next === safeBpm) return;
    controlStepDetent(audio, nativeFeel ? false : haptic);
    lastDialBpmRef.current = next;
    setBpm(next);
  };

  const dialLanding = railActive === 'dial' && !tunerOpen;
  const v4 = dialLanding && !phraseShown ? v4Hits(width, height, layoutInsets.top, layoutInsets.bottom) : null;
  const referenceBeats =
    !playing &&
    config.timeSignature === '4/4' &&
    config.accentPattern[0] === 'strong' &&
    config.accentPattern.slice(1, 4).every((level) => level === 'normal');
  const referenceMeter = config.timeSignature === '4/4';
  const at = (rect: Rect, placed?: Rect) => box(placed ?? rect);
  const face = layout.ns * (484 / 390);
  const homeVisual = dialChrome;
  const plateW = layout.bpmHit.w;
  const plateH = layout.bpmHit.h;
  const plateX = layout.bpmHit.x;
  const plateY = layout.bpmHit.y;
  const showDialFace = !tunerOpen && !interiorFaceId;
  const showDialArt = showDialFace && !rhythmShown && !phraseShown;

  return (
    <View
      pointerEvents="box-none"
      style={styles.root}
      testID="pockt-3-foundation"
      onLayout={(event) => {
        const next = { w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height };
        setFrame((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
      }}>
      <LinearGradient
        pointerEvents="none"
        colors={['#161411', '#0C0B0A', '#070706']}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 1 }]}>
        <Image resizeMode="stretch" source={faceplateFor(frame.w, frame.h)} style={{ position: 'absolute', left: 0, top: 0, width: frame.w, height: frame.h }} />
      </View>
      {v4Shell ? null : <ChassisFill width={frame.w} height={frame.h} />}
      {v4Shell ? null : (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <NorthStarImage source={northStar.chassis} mode="cover" />
      </View>
      )}
      {v4Shell ? null : (
      <View style={at(layout.tuner, v4?.tuner)}>
        <ShellHeaderButton
          label={tunerOpen ? 'Close tuner' : 'Tuner'}
          glyph="fork"
          visualSize={homeVisual ? Math.round(68 * face) : undefined}
          selected={tunerOpen}
          onPress={() => {
            if (tunerOpen) {
              setTunerOpen(false);
              return;
            }
            void phrase.suspend().then(() => {
              if (playing) {
                stop();
              }
              setTunerOpen(true);
            });
          }}
        />
      </View>
      )}
      {v4Shell ? null : (
      <View accessibilityLabel="POCKT" style={[styles.identity, box(layout.identity)]} pointerEvents="none">
        <Image
          source={northStar.wordmark}
          resizeMode={homeVisual ? 'stretch' : 'contain'}
          style={{
            width: homeVisual ? Math.round(160 * face) : layout.compact ? 104 : 112,
            height: homeVisual ? Math.round(46 * face) : layout.compact ? 26 : 27,
            marginTop: homeVisual ? Math.max(2, Math.round(5 * face)) : layout.compact ? 10 : 16,
          }}
        />
      </View>
      )}
      {v4Shell ? null : (
      <View style={at(layout.sound, v4?.sound)}>
        <ShellHeaderButton label="Sound" glyph="speaker" visualSize={homeVisual ? Math.round(68 * face) : undefined} onPress={onOpenSound} />
      </View>
      )}

      {dialChrome && !v4Shell ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: plateX,
              top: plateY,
              width: plateW,
              height: plateH,
            }}>
            <BpmHardwareFrame width={plateW} height={plateH}>
              <NorthStarImage source={northStar.bpmBlank} mode="stretch" />
            </BpmHardwareFrame>
          </View>
          <View style={at(layout.bpmPlus, v4?.bpmPlus)}>
            <ClassicDialBpmStep
              glyph="+"
              accessibilityLabel="Increase tempo by one BPM"
              disabled={clampDialBpm(safeBpm) >= DIAL_MAX_BPM}
              onPress={() => stepTempo(1)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tempo ${safeBpm} BPM, ${tempoName(safeBpm)}. Opens keypad.`}
            accessibilityValue={{ text: `${safeBpm}` }}
            onPressIn={() => revealBpmChrome(true)}
            onPress={onOpenPad}
            testID="console-bpm"
            style={[styles.readout, styles.readoutWell, at(layout.bpmHit, v4?.bpmHit)]}>
            <Text
              style={[
                styles.bpm,
                {
                  fontSize: Math.round(plateH * 0.58),
                  lineHeight: Math.round(plateH * 0.58),
                  fontWeight: '800',
                  letterSpacing: 0,
                  transform: [{ translateY: Math.round(-plateH * 0.14) }, { scaleX: 1.08 }],
                },
              ]}
              allowFontScaling={false}>
              {safeBpm}
            </Text>
          </Pressable>
          <View style={at(layout.bpmMinus, v4?.bpmMinus)}>
            <ClassicDialBpmStep
              glyph="−"
              accessibilityLabel="Decrease tempo by one BPM"
              disabled={clampDialBpm(safeBpm) <= DIAL_MIN_BPM}
              onPress={() => stepTempo(-1)}
            />
          </View>
          <Text
            style={[
              styles.bpmUnit,
              styles.bpmWell,
              dialLanding && styles.bpmUnitDial,
              {
                position: 'absolute',
                left: plateX,
                top: plateY + plateH * 0.58,
                width: plateW,
                height: Math.round(plateH * 0.24),
                fontSize: Math.max(8, Math.round(plateH * 0.175)),
                fontWeight: '700',
                letterSpacing: 6.4,
              },
            ]}
            allowFontScaling={false}>
            BPM
          </Text>
        </>
      ) : null}

      {phraseShown ? (
        <View style={box(layout.stage)} pointerEvents="auto">
          <PhraseFace
            phase={phraseProof ?? phrase.deck.phase}
            loop={phraseProof === 'playing' ? true : phrase.deck.loop}
            progress={phraseProof === 'playing' || phraseProof === 'paused' ? 0.42 : phraseProof === 'recording' ? 0.35 : phrase.progress}
            elapsed={phraseProof ? (phraseProof === 'recording' ? 4.2 : 6.4) : phrase.elapsed}
            duration={phraseProof ? 12 : phrase.duration}
            onBeats={() => onBeatMode('beats')}
            onRecord={() => {
              if (tunerOpen) {
                claimAudio('phrase');
                setTunerOpen(false);
              }
              if (playing && phrase.deck.phase !== 'playing' && phrase.deck.phase !== 'paused') stop();
              if (phrase.deck.phase === 'recording' || phrase.deck.phase === 'idle') phrase.press('tap');
              else if (phrase.deck.hasTake) phrase.press('long');
            }}
            onScrub={(ratio, release) => phrase.scrub(ratio, release)}
            onTransport={() => {
              if (phrase.deck.phase === 'ready' || phrase.deck.phase === 'paused' || phrase.deck.phase === 'playing') phrase.press('tap');
            }}
            onLoop={() => phrase.press('loop')}
            onClear={() => phrase.press('clear')}
          />
        </View>
      ) : null}
      {phraseShown ? null : (
      <View style={[box(dialLanding && showDialArt ? layout.dial : showDialArt ? dialInstrumentFrame(width, layout) : layout.dial), v4Shell ? { zIndex: 3 } : null]} pointerEvents="box-none" testID="console-dial">
      {showDialArt && v4Shell && Platform.OS === 'ios' ? (
        <PocktDialView
          bpm={safeBpm}
          face="ring"
          haptic={haptic}
          playing={playing}
          accessibilityLabel={`Tempo dial. ${safeBpm} BPM. Turn clockwise to speed up.`}
          style={(() => {
            // Sit exactly on the faceplate's fluted ring so the turning flutes register with the artwork.
            const ring = northStarRingRect(width, height, layoutInsets);
            return { position: 'absolute', left: ring.x - layout.dial.x, top: ring.y - layout.dial.y, width: ring.w, height: ring.h, zIndex: 6 };
          })()}
          onBpm={(event) => {
            const next = sanitizeBpm(event.nativeEvent.bpm, lastDialBpmRef.current);
            if (next === lastDialBpmRef.current) return;
            lastDialBpmRef.current = next;
            setBpm(next);
          }}
        />
      ) : showDialFace && Platform.OS === 'ios' ? (
        <PocktDialView
          bpm={safeBpm}
          playing={playing}
          invert={config.wheelInvert}
          haptic={haptic}
          style={StyleSheet.absoluteFill}
          pointerEvents={wideFace ? 'none' : 'auto'}
          accessibilityLabel={`Dial. Tempo ${safeBpm}. ${playing ? 'Playing' : 'Stopped'}`}
          onBpm={(event) => {
            revealBpmChrome(true);
            const next = sanitizeBpm(event.nativeEvent.bpm, lastDialBpmRef.current);
            if (next === lastDialBpmRef.current) return;
            lastDialBpmRef.current = next;
            rotaryDetent('dial', audio, false);
            setBpm(next);
          }}
          onGesture={(event) => {
            const active = Boolean(event.nativeEvent.active);
            const reported = Number(event.nativeEvent.angle);
            if (Number.isFinite(reported)) dialAngle.value = reported;
            if (active) {
              dialDragging.current = true;
              revealBpmChrome(false);
              return;
            }
            const wasDragging = dialDragging.current;
            dialDragging.current = false;
            if (wasDragging) revealBpmChrome(true);
          }}
          onCenterTap={toggle}
        />
      ) : null}
        {showDialArt && !v4Shell ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <PhotoDialV3 bpm={safeBpm} size={dialInstrumentFrame(width, layout).w} angle={dialAngle} />
        </View>
        ) : null}

      </View>
      )}
      {rhythmShown ? (
        <View pointerEvents="none" style={[styles.interior, v4Shell ? box(layout.dial) : box(layout.dial), { borderRadius: 10, overflow: 'hidden' }]}>
          <RhythmInstrumentFace
            size={layout.D}
            beats={meter?.beatsPerMeasure ?? 4}
            timeSignature={config.timeSignature}
            accentPattern={config.accentPattern}
            beatIndex={transport.beatIndex}
            playing={playing && !transport.silentMeasure}
            pulse={pulse}
            pulseBeat={pulseBeat}
            bpm={safeBpm}
            invert={config.wheelInvert}
            followRadians={dialAngle}
            onBpm={setBpm}
            onToggle={toggle}
            uiClick={audio}
          />
        </View>
      ) : null}
      {tunerOpen ? (
        <View
          pointerEvents="none"
          style={[styles.interior, v4Shell ? box(layout.dial) : box(layout.dial), { overflow: 'visible', borderRadius: 0, backgroundColor: 'transparent' }]}
          testID="console-tuner-face">
          <VinylTunerFace
            size={layout.D}
            reading={proof?.tuner ? (proof.reading ?? null) : tuner.reading}
            phase={proof?.tuner ? (proof.reading ? 'listening' : 'listening') : tuner.phase}
            error={proof ? null : tuner.error}
            buffers={proof ? (proof.reading ? 1 : 0) : tuner.diag.buffersReceived}
            trailCents={proof?.trailCents}
          />
        </View>
      ) : null}
      {interiorFaceId ? (
        <View
          pointerEvents={interiorCaptures ? 'box-none' : 'none'}
          style={[
            styles.interior,
            interiorFaceId ? styles.instrumentField : null,
            wideFace ? box(layout.stage) : v4Shell ? box(layout.dial) : box(layout.dial),
            wideFace ? { borderRadius: 12 } : { borderRadius: layout.D / 2 },
          ]}
          testID="console-face-viewport">
          <ConsoleInstrumentFace
            face={interiorFaceId}
            size={wideFace ? layout.stage.w : layout.D}
            width={wideFace ? layout.stage.w : layout.D}
            height={wideFace ? layout.stage.h : layout.D}
            config={config}
            prefs={prefs}
            compact={layout.compact}
            playing={playing}
            transport={transport}
            silent={transport.silentMeasure}
            beatIndex={transport.beatIndex}
            bpm={safeBpm}
            timeSignature={config.timeSignature}
            subdivision={config.subdivision}
            accentPattern={config.accentPattern}
            onChangeAccents={onChangeAccents}
            setBpm={setBpm}
            toggle={toggle}
            tapTempo={tapTempo}
            pulse={pulse}
            pulseRole={pulseRole}
            pulseAccent={pulseAccent}
            pulseBeat={pulseBeat}
            pulseBeatHost={pulseBeatHost}
            pulseSpb={pulseSpb}
            pulseHostOffset={pulseHostOffset}
            proofDegrees={proofDegrees}
            proofWaves={proofWaves}
            onOpenPad={onOpenPad}
            onOpenTime={onOpenTime}
            onOpenDivision={onOpenDivision}
            onOpenSound={onOpenSound}
            onOpenAccents={onOpenAccents}
            onOpenPractice={onOpenPractice}
            onOpenPresets={onOpenPresets}
            onOpenRhythm={onOpenRhythm}
            onOpenSettings={onOpenSettings}
            onOpenSetlists={onOpenSetlists}
            onOpenLab={onOpenLab}
            onUpdate={onUpdate}
            onDisplayPrefsChange={onDisplayPrefsChange}
            onHapticToggle={onHapticToggle}
            onGoHome={onGoHome}
            proof={proof}
          />
        </View>
      ) : null}

      {phraseShown || v4Shell ? null : (
      <View style={[at(layout.beats, v4?.beats), styles.beatsWrap, v4 && !referenceBeats && { zIndex: 50 }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <NorthStarImage source={northStar.beatPanel} mode="stretch" />
        </View>
        <ClassicDialBeats
          facade={false}
          timeSignature={config.timeSignature}
          beatIndex={transport.beatIndex}
          playing={playing}
          silent={transport.silentMeasure}
          accentPattern={config.accentPattern}
          concealed={beatsConcealed}
          onToggleCover={() => setBeatsConcealed((value) => !value)}
          onChange={onChangeAccents}
          onMode={onBeatMode}
          compact={layout.compact}
          shellScale={homeVisual ? 1.16 * face : 1}
          width={layout.beats.w}
          height={layout.beats.h}
        />
      </View>
      )}
      {v4Shell ? null : (
      <>
      <View style={[at(layout.meter, v4?.meter), styles.meterReadout, v4 && !referenceMeter && { zIndex: 50 }]}>
        <ClassicDialPill
          readout
          transport
          pixelLock={homeVisual}
          faceScale={face}
          kicker=""
          value={`${meterLabel}  ${SUBDIVISIONS[config.subdivision]?.symbol ?? '♩'}`}
          detail={pendingTimeSignature || pendingSubdivision ? undefined : meter?.grouping}
          pending={
            pendingTimeSignature
              ? pendingTimeSignature.split('-')[0]
              : pendingSubdivision
                ? classicSubdivisionLabel(pendingSubdivision)
                : undefined
          }
          accessibilityLabel={
            pendingTimeSignature || pendingSubdivision
              ? `Meter ${meterLabel}, subdivision ${classicSubdivisionLabel(config.subdivision)}. Next ${pendingTimeSignature ? (TIME_SIGNATURES[pendingTimeSignature]?.label ?? pendingTimeSignature) : classicSubdivisionLabel(pendingSubdivision ?? config.subdivision)}. Opens meter and subdivision.`
              : `Meter ${meter?.label ?? meterLabel}, subdivision ${classicSubdivisionLabel(config.subdivision)}. Opens meter and subdivision.`
          }
          onPress={onOpenTime}
        />
      </View>
      <View style={[at(layout.tap, v4?.tap), styles.keyLift]}>
        <ClassicDialRoundControl
          facade
          pixelLock={homeVisual}
          faceScale={face}
          accessibilityLabel="Tap tempo"
          label="TAP"
          onPress={() => {
            void hapticEvent('tap');
            tapTempo();
          }}
        />
      </View>
      <View style={[at(layout.play, v4?.play), styles.keyLift]}>
        <ClassicDialPlay
          facade
          pixelLock={homeVisual}
          faceScale={face}
          playing={playing}
          onPress={() => {
            controlStepDetent(audio, false);
            if (haptic) void hapticEvent('playCommit');
            toggle();
          }}
        />
      </View>
      <View style={[at(layout.pockt, v4?.pockt), styles.keyLift]}>
        <ClassicDialPocktButton facade pixelLock={homeVisual} faceScale={face} onPress={onOpenSettings} />
      </View>

      <View
        style={[at(layout.navBar, v4?.navBar), styles.navBarDial]}
        testID="console-nav">
        <View pointerEvents="none" style={{ position: 'absolute', left: layout.g, right: layout.g, top: 0, height: layout.faceRail.h }}>
          <NorthStarImage source={northStar.navTray} mode="stretch" />
        </View>
        <View style={{ height: layout.faceRail.h }}>
          <ClassicDialFaceRail
            activeId={railActive}
            compact={layout.compact}
            facade
            scale={face}
            onSelect={selectRail}
          />
        </View>
      </View>
      </>
      )}
      {v4Shell ? (
        <PocktInstrument
          width={width}
          height={height}
          top={layoutInsets.top}
          bottom={layoutInsets.bottom}
          bpm={safeBpm}
          playing={playing}
          beatIndex={transport.beatIndex}
          measureIndex={transport.measureIndex}
          timeSignature={config.timeSignature}
          meterLabel={meterLabel}
          subdivisionSymbol={SUBDIVISIONS[config.subdivision]?.symbol ?? '♩'}
          accentPattern={config.accentPattern}
          beatsPerMeasure={meter?.beatsPerMeasure ?? 4}
          beatsConcealed={beatsConcealed}
          railActive={railActive}
          tunerOpen={tunerOpen}
          haptic={haptic && !tunerOpen}
          onTuner={() => {
            if (tunerOpen) {
              setTunerOpen(false);
              return;
            }
            void phrase.suspend().then(() => {
              if (playing) {
                stop();
              }
              setTunerOpen(true);
            });
          }}
          onSound={onOpenSound}
          onBpm={onOpenPad}
          onPlus={() => stepTempo(1, true)}
          onMinus={() => stepTempo(-1, true)}
          onTap={(stamp) => {
            tapTempo(typeof stamp === 'number' && stamp > 0 ? stamp : undefined);
          }}
          onPlay={() => {
            controlStepDetent(audio, false);
            toggle();
          }}
          onMeter={onOpenTime}
          onOptions={onOpenSettings}
          onLamp={() => setBeatsConcealed((value) => !value)}
          onLoop={() => {
            onBeatMode('deck');
          }}
          onAccents={onChangeAccents}
          onSelectRail={selectRail}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CLASSIC_DIAL.bg,
  },
  navBarDial: {
    backgroundColor: 'transparent',
  },
  navBarClassic: {
    backgroundColor: '#070808',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(184,137,58,0.45)',
    paddingHorizontal: 2,
  },
  identity: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  wordmark: {
    color: CLASSIC_DIAL.bronzeHi,
    fontSize: 16,
    letterSpacing: 7.2,
    fontWeight: '500',
  },
  wordmarkDial: {
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0,
    fontWeight: '700',
    color: '#E6D3B0',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  wordLetter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineDial: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 3.1,
    color: '#A89880',
  },
  tagline: {
    marginTop: 2,
    color: CLASSIC_DIAL.bronze,
    fontSize: 7,
    letterSpacing: 2.8,
    fontWeight: '600',
  },
  tempoName: {
    color: CLASSIC_DIAL.ivoryMute,
    fontSize: 13,
    letterSpacing: 0.4,
    fontWeight: '400',
    textAlign: 'center',
  },
  tempoNameDial: {
    color: '#E7D7B8',
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  readout: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutWell: {
    backgroundColor: 'transparent',
  },
  bpmWell: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  bpm: {
    width: '100%',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.6,
    color: '#F3EEE4',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  bpmUnit: {
    color: CLASSIC_DIAL.bronze,
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: '700',
    textAlign: 'center',
  },
  bpmUnitDial: {
    color: '#D5D0C6',
  },
  androidDial: {
    borderRadius: 999,
    backgroundColor: '#10141A',
  },
  chrome: {
    flex: 1,
  },
  interior: {
    overflow: 'hidden',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  instrumentField: {
    backgroundColor: '#0C0B0A',
  },
  beatsWrap: {
    overflow: 'hidden',
    zIndex: 3,
    borderRadius: 16,
  },
  phraseDeckLift: {
    zIndex: 7,
  },
  meterReadout: {
    zIndex: 8,
    overflow: 'visible',
  },
  keyLift: {
    zIndex: 9,
    overflow: 'visible',
  },
});

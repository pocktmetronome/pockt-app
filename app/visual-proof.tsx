import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { proofFlags } from '@/lib/proof-flags';
import { useSharedValue } from 'react-native-reanimated';

import { BeatlineInstrumentFace } from '@/components/classic/faces/BeatlineInstrumentFace';
import { PendulumInstrumentFace } from '@/components/classic/faces/PendulumInstrumentFace';
import { ProInstrumentFace } from '@/components/classic/faces/ProInstrumentFace';
import { PulseInstrumentFace } from '@/components/classic/faces/PulseInstrumentFace';
import { RhythmInstrumentFace } from '@/components/classic/faces/RhythmInstrumentFace';
import { VinylTunerFace } from '@/components/classic/faces/VinylTunerFace';
import { FoundationDialRoom } from '@/components/classic/FoundationDialRoom';
import { BpmPadSheet } from '@/components/modals/BpmPadSheet';
import { MeterSheet } from '@/components/modals/MeterSheet';
import { SoundLibrarySheet } from '@/components/modals/SoundLibrarySheet';
import { PracticeScreen } from '@/components/screens/PracticeScreen';
import { TIME_SIGNATURES } from '@/constants/meter';
import { defaultAccentPattern } from '@/lib/accents';
import { DEFAULT_DISPLAY_PREFS } from '@/constants/display';
import { DEFAULT_CONFIG } from '@/constants/timing';
import { DEFAULT_PRACTICE } from '@/lib/practice';
import {
  FACE_REVIEW_IDS,
  MOTION_REVIEW_IDS,
  proofBackdrop,
  proofShot,
  PROOF_SHOTS,
  type ProofFrame,
} from '@/lib/visual-proof';
import type { AccentLevel, SubdivisionId, TimeSignatureId } from '@/lib/types';

const noop = () => undefined;

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? '';
}

function ProofPhone({
  spec,
  bpm = 120,
  meter,
  subdivision: subdivisionOverride,
  accents,
  beatIndex,
  beatRail,
  phraseProof,
  proofWaves = false as boolean | 'first' | 'young' | 'mid' | 'aged',
  pendingTimeSignature = null,
  pendingSubdivision = null,
}: {
  spec: ProofFrame;
  bpm?: number;
  meter?: TimeSignatureId;
  subdivision?: SubdivisionId;
  accents?: AccentLevel[];
  beatIndex?: number;
  beatRail?: 'beats' | 'deck' | 'flip' | 'closed';
  phraseProof?: 'recording' | 'ready' | 'playing' | 'paused';
  proofWaves?: boolean | 'first' | 'young' | 'mid' | 'aged';
  pendingTimeSignature?: TimeSignatureId | null;
  pendingSubdivision?: SubdivisionId | null;
}) {
  const pulse = useSharedValue(spec.playing ? 0.2 : 0);
  const pulseRole = useSharedValue(0.8);
  const pulseBeat = useSharedValue(spec.beatIndex);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const liveMeter = meter ?? spec.meter;
  const subdivision: SubdivisionId = subdivisionOverride ?? (liveMeter.endsWith('8') ? 'eighths' : 'quarter');
  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      bpm,
      timeSignature: liveMeter,
      subdivision,
      accentPattern: accents ?? spec.accents,
      skinCategory: 'classic' as const,
      classicBackdrop: proofBackdrop(spec.rail),
    }),
    [accents, bpm, liveMeter, spec.accents, spec.rail, subdivision]
  );
  return (
    <View style={[styles.phone, { width: spec.width, height: spec.height }]}>
      <FoundationDialRoom
        config={config}
        prefs={DEFAULT_DISPLAY_PREFS}
        compact={false}
        playing={beatIndex != null ? true : spec.playing}
        beatRailProof={beatRail}
        phraseProof={phraseProof}
        proofDegrees={spec.pendulumAngle ?? null}
        proofWaves={proofWaves}
        pendingTimeSignature={pendingTimeSignature}
        pendingSubdivision={pendingSubdivision}
        transport={{
          beatIndex: beatIndex ?? spec.beatIndex,
          measureIndex: 0,
          silentMeasure: false,
          playing: beatIndex != null ? true : spec.playing,
          isDownbeat: (beatIndex ?? spec.beatIndex) === 0,
        }}
        pulse={pulse}
        pulseRole={pulseRole}
        pulseBeat={pulseBeat}
        pulseBeatHost={pulseBeatHost}
        pulseSpb={pulseSpb}
        pulseHostOffset={pulseHostOffset}
        tapFlash={0}
        setBpm={noop}
        toggle={noop}
        stop={noop}
        tapTempo={noop}
        previewSound={noop}
        onOpenPad={noop}
        onOpenTime={noop}
        onOpenDivision={noop}
        onOpenSound={noop}
        onOpenAccents={noop}
        onOpenPractice={noop}
        onOpenPresets={noop}
        onOpenRhythm={noop}
        onOpenSettings={noop}
        onOpenSetlists={noop}
        onOpenStage={noop}
        onOpenLab={noop}
        onOpenDrum={noop}
        onChangeAccents={noop}
        onUpdate={noop}
        onDisplayPrefsChange={noop}
        onHapticToggle={noop}
        onFlashToggle={noop}
        proof={spec}
      />
    </View>
  );
}

function ProofCloseup({ spec }: { spec: ProofFrame }) {
  const pulse = useSharedValue(spec.playing ? 0.85 : 0);
  const pulseRole = useSharedValue(0.8);
  const pulseBeat = useSharedValue(spec.beatIndex);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  const size = 300;
  const beats = TIME_SIGNATURES[spec.meter]?.beatsPerMeasure ?? 4;
  const subdivision: SubdivisionId = spec.meter.endsWith('8') ? 'eighths' : 'quarter';
  let face = null;
  if (spec.tuner) {
    face = (
      <VinylTunerFace
        size={size}
        reading={spec.reading ?? null}
        phase={spec.reading ? 'listening' : 'listening'}
        buffers={spec.reading ? 4 : 0}
        trailCents={spec.trailCents}
      />
    );
  } else if (spec.rail === 'rhythm') {
    face = (
      <RhythmInstrumentFace
        size={size}
        beats={beats}
        timeSignature={spec.meter}
        accentPattern={spec.accents}
        beatIndex={spec.beatIndex}
        playing={spec.playing}
        pulse={pulse}
        pulseBeat={pulseBeat}
      />
    );
  } else if (spec.rail === 'pulse') {
    face = <PulseInstrumentFace size={size} bpm={120} playing={spec.playing} pulseBeat={pulseBeat} fronts={spec.fronts} />;
  } else if (spec.rail === 'smart-pendulum') {
    face = (
      <PendulumInstrumentFace
        size={size}
        playing={spec.playing}
        bpm={120}
        pulse={pulse}
        pulseBeat={pulseBeat}
        previewAngle={spec.pendulumAngle}
        previewHeld={spec.pendulumHeld}
      />
    );
  } else if (spec.rail === 'pro') {
    face = (
      <ProInstrumentFace
        size={size}
        playing={spec.playing}
        silent={false}
        beatIndex={spec.beatIndex}
        bpm={120}
        timeSignature={spec.meter}
        subdivision={subdivision}
        accentPattern={spec.accents}
        onChangeAccents={noop}
        pulse={pulse}
        pulseRole={pulseRole}
        pulseBeat={pulseBeat}
        pulseBeatHost={pulseBeatHost}
        pulseSpb={pulseSpb}
        pulseHostOffset={pulseHostOffset}
        previewPhase={spec.phase}
      />
    );
  } else if (spec.rail === 'beatline') {
    face = (
      <BeatlineInstrumentFace
        size={size}
        playing={spec.playing}
        silent={false}
        beatIndex={spec.beatIndex}
        timeSignature={spec.meter}
        subdivision={subdivision}
        accentPattern={spec.accents}
        onChangeAccents={noop}
        pulseBeat={pulseBeat}
      />
    );
  }
  return <View style={styles.closeup}>{face}</View>;
}

const FACE_LABEL: Record<string, string> = {
  '03_RHYTHM_STOPPED_4-4': 'RHYTHM',
  '13_PULSE_MULTIPLE_WAVES': 'PULSE',
  '14_PENDULUM_CENTER': 'PENDULUM',
  '19_PRO_PLAYING_4-4': 'PRO',
  '23_BEATLINE_BEAT1_4-4': 'BEATLINE',
  '30_TUNER_E3_IN_TUNE': 'TUNER',
};

export default function VisualProofScreen() {
  const params = useLocalSearchParams();
  const sheet = one(params.sheet);
  const shot = one(params.shot);
  proofFlags.playDown = one(params.playDown) === '1';
  proofFlags.tunerDown = one(params.tunerDown) === '1';
  proofFlags.soundDown = one(params.soundDown) === '1';
  proofFlags.tapDown = one(params.tapDown) === '1';
  proofFlags.meterDown = one(params.meterDown) === '1';
  proofFlags.pDown = one(params.pDown) === '1';
  proofFlags.plusDown = one(params.plusDown) === '1';
  proofFlags.minusDown = one(params.minusDown) === '1';
  proofFlags.loopDown = one(params.loopDown) === '1';
  proofFlags.beatCover = one(params.beatCover) === 'off' || one(params.beatCover) === 'mid' || one(params.beatCover) === 'on' ? one(params.beatCover) as 'off' | 'mid' | 'on' : '';
  proofFlags.reduceMotion = one(params.reduceMotion) === '1';
  proofFlags.concept = one(params.concept) === 'b' ? 'b' : 'a';
  const ids = sheet === 'faces' ? FACE_REVIEW_IDS : sheet === 'motion' ? MOTION_REVIEW_IDS : shot ? [shot] : [];
  const widthParam = Number(one(params.width));
  const heightParam = Number(one(params.height));
  const frames = ids
    .map((id) => proofShot(id))
    .filter((item): item is ProofFrame => Boolean(item))
    .map((spec) => ({
      ...spec,
      width: Number.isFinite(widthParam) && widthParam >= 320 ? widthParam : spec.width,
      height: Number.isFinite(heightParam) && heightParam >= 480 ? heightParam : spec.height,
    }));
  const columns = sheet === 'faces' ? 3 : sheet === 'motion' ? 3 : 1;
  const cellWidth = sheet ? 320 : 390;
  const bpmParam = Number(one(params.bpm));
  const bpm = Number.isFinite(bpmParam) && bpmParam >= 20 ? bpmParam : 120;
  const meterParam = one(params.meter) as TimeSignatureId;
  const meter = meterParam && meterParam in TIME_SIGNATURES ? meterParam : undefined;
  const subdivisionParam = one(params.subdivision) as SubdivisionId;
  const accentRaw = one(params.accents);
  const accentParts = accentRaw.split(',');
  const accentLevels: AccentLevel[] = ['mute', 'soft', 'normal', 'strong'];
  const accents =
    accentRaw === 'default'
      ? defaultAccentPattern(meter ?? '4/4')
      : accentParts.length > 0 && accentParts.every((part) => accentLevels.includes(part as AccentLevel))
        ? (accentParts as AccentLevel[])
        : undefined;
  const beatRaw = one(params.beat);
  const beatParam = Number(beatRaw);
  const beatIndex = beatRaw !== '' && Number.isFinite(beatParam) && beatParam >= 0 ? beatParam : undefined;
  const railMode = one(params.railMode);
  const beatRail = railMode === 'deck' || railMode === 'flip' || railMode === 'closed' ? railMode : undefined;
  const phraseParam = one(params.phrase);
  const phraseProof =
    phraseParam === 'recording' || phraseParam === 'ready' || phraseParam === 'playing' || phraseParam === 'paused'
      ? phraseParam
      : undefined;
  const waveParam = Number(one(params.wave));
  const shown = frames.map((spec) =>
    Number.isFinite(waveParam) && waveParam > 0 && waveParam < 1.5
      ? { ...spec, fronts: [{ progress: waveParam, strength: 1 }] }
      : spec
  );
  const panel = one(params.panel);
  return (
    <View
      nativeID="proof-root"
      testID="proof-ready"
      style={[styles.page, { width: cellWidth * columns }]}>
      {shown.length === 0 ? (
        <Text style={styles.missing}>Unknown proof. Shots: {PROOF_SHOTS.map((item) => item.id).join(', ')}</Text>
      ) : (
        shown.map((spec) => (
          <View key={spec.id} style={[styles.cell, { width: sheet ? cellWidth : spec.width }]}>
            {sheet ? (
              <Text style={styles.caption} allowFontScaling={false}>
                {FACE_LABEL[spec.id] ?? spec.id}
              </Text>
            ) : null}
            {sheet || one(params.closeup) === '1' ? (
              <ProofCloseup spec={spec} />
            ) : (
              <ProofPhone
                spec={spec}
                bpm={bpm}
                meter={meter}
                subdivision={subdivisionParam || undefined}
                accents={accents}
                beatIndex={beatIndex}
                beatRail={beatRail}
                phraseProof={phraseProof}
                pendingTimeSignature={
                  one(params.pendingMeter) && one(params.pendingMeter) in TIME_SIGNATURES
                    ? (one(params.pendingMeter) as TimeSignatureId)
                    : null
                }
                pendingSubdivision={subdivisionParam ? undefined : one(params.pendingDivision) === 'eighths' ? 'eighths' : null}
                proofWaves={
                  one(params.waves) === 'young' || one(params.waves) === 'mid' || one(params.waves) === 'aged' || one(params.waves) === 'first'
                    ? (one(params.waves) as 'young' | 'mid' | 'aged' | 'first')
                    : one(params.waves) === '1'
                }
              />
            )}
          </View>
        ))
      )}
      {panel === 'meter' || panel === 'custom' || panel === 'meter5' || panel === 'meter54' || panel === 'meter54b' || panel === 'subdivision' ? (
        <MeterSheet
          visible
          value={
            panel === 'meter5' ? '5/8' : panel === 'meter54b' ? '5/4-23' : panel === 'meter54' || panel === 'custom' ? '5/4' : meter ?? '7/8'
          }
          subdivision={panel === 'subdivision' ? 'eighths' : 'quarter'}
          onChange={noop}
          onSubdivisionChange={noop}
          onClose={noop}
          playing={panel !== 'custom'}
          focusSection={panel === 'subdivision' ? 'subdivision' : 'meter'}
          initialMore={panel === 'custom'}
        />
      ) : null}
      {panel === 'sound' || panel === 'voice' || panel === 'favorites' || panel === 'families' ? (
        <SoundLibrarySheet
          visible
          roomId="dial"
          sound={panel === 'voice' ? 'count' : 'woodblock'}
          recentSounds={['click', 'wood', 'woodblock']}
          favoriteSounds={['woodblock', 'mechanical', 'click']}
          soundDownbeat={null}
          soundBeat={null}
          soundSub={null}
          onSound={noop}
          onFavorite={noop}
          onRoles={noop}
          onPreview={noop}
          onClose={noop}
          initialFamily={
            panel === 'voice' ? 'count' : panel === 'favorites' ? 'favorites' : panel === 'families' ? 'wood' : null
          }
        />
      ) : null}
      {panel === 'bpm' ? <BpmPadSheet visible bpm={bpm} minBpm={20} maxBpm={400} onChange={noop} onClose={noop} /> : null}
      {panel === 'practice' ? (
        <PracticeScreen
          visible
          bpm={bpm}
          subdivision="quarter"
          draft={DEFAULT_PRACTICE}
          active={false}
          progress={0}
          barsLeft={0}
          secondsLeft={0}
          onChange={noop}
          onStart={noop}
          onStop={noop}
          onClose={noop}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#000',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: 390,
  },
  closeup: {
    width: 300,
    height: 300,
    margin: 10,
    overflow: 'hidden',
    backgroundColor: '#07080B',
  },
  phone: {
    width: 390,
    height: 844,
    overflow: 'hidden',
    backgroundColor: '#050608',
  },
  caption: {
    color: '#E7D7B8',
    backgroundColor: '#000',
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  missing: {
    color: '#fff',
    padding: 24,
  },
});

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { Easing, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { FEEL_PRESETS } from '@/constants/feel';
import { resolvePlayableSound } from '@/constants/sounds';
import { DEFAULT_CONFIG, factoryResetConfig, sanitizeBpm } from '@/constants/timing';
import { applyConfigPatch } from '@/lib/accents';
import { isStructuralPatch, structuralCommitReady } from '@/lib/structural-change';
import { isCountMode } from '@/lib/accent-sound';
import { nativeLockIn, panValue, polyLayers } from '@/lib/classic-core';
import { effectiveHaptic, effectiveVisual, effectiveVolume } from '@/lib/sensory';
import { reviveUiDetent } from '@/lib/rotary-feedback';
import { beatTorch } from '@/lib/beat-torch';
import { stressJsThread } from '@/lib/js-thread-stress';
import type { MetronomeConfig, SoundId, SubdivisionId, TickEvent, TimeSignatureId } from '@/lib/types';
import { TapTempo } from '@/lib/tap-tempo';
import { loadSettings, saveSettings } from '@/storage/persist';
import { resolveClickUris } from '@/audio/click-assets';
import { playKnownGoodHomeSound } from '@/audio/known-good-home-sound';
import { audioMode, commitAudioMode, commitAudioModeIf, enqueueAudio } from '@/lib/audio-ownership';
import { friendlyTransportError, startReportIsAlive } from '@/lib/audio-session-policy';
import { crashBreadcrumb, finiteOr, installCrashInstrumentation } from '@/lib/crash-trace';
import { remapBeatHostForTempo, pendulumEpochFromNativeStart } from '@/lib/pendulum-absolute';
import PocktTiming from '@/modules/pockt-timing';
import type { NativeTickEvent, NativeTimingConfig, TimingDiagnostics } from '@/modules/pockt-timing';

/**
 * Room PLAY starts the native V11 PCM-chunk metronome only.
 * Home/opening ident is a separate UI sound and is never used as a metronome click.
 * PLAY must never call preview, audioSanityTest, or the Home ident path.
 */

export type TransportState = {
  beatIndex: number;
  measureIndex: number;
  silentMeasure: boolean;
  playing: boolean;
  isDownbeat: boolean;
};

function clampBpm(value: number): number {
  return sanitizeBpm(value);
}

function toNativeConfig(config: MetronomeConfig): NativeTimingConfig {
  return {
    bpm: config.bpm,
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    feel: config.feel,
    feelDial: config.feelDial,
    sound: resolvePlayableSound(config.sound, 'pocket'),
    soundDownbeat: config.soundDownbeat ? resolvePlayableSound(config.soundDownbeat, config.sound) : '',
    soundBeat: config.soundBeat ? resolvePlayableSound(config.soundBeat, config.sound) : '',
    soundSub: config.soundSub ? resolvePlayableSound(config.soundSub, config.sound) : '',
    voiceCount: config.voiceCount || isCountMode(config.sound),
    volume: effectiveVolume(config),
    haptic: effectiveHaptic(config),
    hapticSyncMs: config.hapticSyncMs,
    hapticStrength: config.hapticStrength ?? 1,
    accentPattern: config.accentPattern,
    lockIn: nativeLockIn(config),
    skin: config.skin,
    countInBars: config.countInBars,
    clickShift: config.clickShift,
    sparseMode: config.sparseMode,
    pan: panValue(config.stereoPan),
    accentVolume: config.accentVolume,
    subVolume: config.subVolume,
    swing: config.swing,
    polyA: polyLayers(config.polyrhythm, config.polyA, config.polyB).a,
    polyB: polyLayers(config.polyrhythm, config.polyA, config.polyB).b,
    mixWithOthers: config.mixWithOthers,
    headphoneStop: config.headphoneDisconnect === 'stop',
  };
}

function nativeTickToVisual(event: NativeTickEvent): TickEvent {
  const beatIndex = typeof event.beatIndex === 'number' ? event.beatIndex : 0;
  const accentLevel =
    event.accentLevel === 'mute' ||
    event.accentLevel === 'soft' ||
    event.accentLevel === 'strong' ||
    event.accentLevel === 'accent'
      ? event.accentLevel
      : 'normal';
  return {
    tickIndex: event.tickIndex ?? 0,
    measureIndex: event.measureIndex ?? 0,
    beatIndex,
    subdivisionIndex: event.subdivisionIndex ?? 0,
    isDownbeat: Boolean(event.isDownbeat),
    isPrimaryBeat: Boolean(event.isPrimaryBeat),
    isBackbeat: Boolean(event.isBackbeat),
    isAccent: Boolean(event.isAccent),
    accentLevel,
    audible: Boolean(event.audible),
    silentMeasure: Boolean(event.silentMeasure),
    clickReturned: Boolean(event.clickReturned),
    volume: typeof event.volume === 'number' ? event.volume : 0,
    soundRole:
      event.soundRole === 'downbeat' || event.soundRole === 'sub' ? event.soundRole : 'beat',
    expectedMs: event.expectedMs ?? 0,
    feelOffsetMs: event.feelOffsetMs ?? 0,
    visualIntensity: typeof event.visualIntensity === 'number' ? event.visualIntensity : 0,
  };
}

export function useMetronome() {
  useEffect(() => {
    installCrashInstrumentation();
  }, []);
  const [config, setConfig] = useState<MetronomeConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [restoredFromDisk, setRestoredFromDisk] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [transport, setTransport] = useState<TransportState>({
    beatIndex: 0,
    measureIndex: 0,
    silentMeasure: false,
    playing: false,
    isDownbeat: true,
  });
  const [returnFlash, setReturnFlash] = useState(0);
  const [tapFlash, setTapFlash] = useState(0);
  const [pendingChange, setPendingChange] = useState<null | {
    timeSignature?: TimeSignatureId;
    subdivision?: SubdivisionId;
  }>(null);

  const pulse = useSharedValue(0);
  const returnPulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const pulseRole = useSharedValue(1);
  const pulseAccent = useSharedValue(1);
  const pulseBeat = useSharedValue(0);
  const pulseBeatHost = useSharedValue(0);
  const pulseSpb = useSharedValue(0.5);
  const pulseHostOffset = useSharedValue(0);
  /** Primary beats since launch (never wraps) and the audible-presentation offset of the last one. */
  const pulseCount = useSharedValue(0);
  const pulseLatency = useSharedValue(0);

  const tapRef = useRef(new TapTempo());
  const configRef = useRef(config);
  const playingRef = useRef(playing);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparedRef = useRef(false);
  const startingRef = useRef(false);
  const startingAtRef = useRef(0);
  const pendingStructuralRef = useRef<null | { patch: Partial<MetronomeConfig>; armedBar: number }>(null);
  const barRef = useRef(0);
  const startGenRef = useRef(0);
  const tickSubRef = useRef<{ remove: () => void } | null>(null);

  configRef.current = config;
  playingRef.current = playing;

  const nativeAvailable = Boolean(PocktTiming && PocktTiming.isNativeEngine && PocktTiming.isAvailable());

  const log = useCallback((..._args: unknown[]) => {
    /* production: no console spam on the play path */
  }, []);

  useEffect(() => {
    let alive = true;
    void loadSettings().then((saved) => {
      if (!alive) return;
      if (saved) {
        setConfig(saved);
        setRestoredFromDisk(true);
      }
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSettings(config);
    }, 280);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [config, hydrated]);

  useEffect(() => {
    return () => {
      void saveSettings(configRef.current);
    };
  }, []);

  useEffect(() => {
    if (!PocktTiming) {
      setEngineError('Native iOS timing engine is not available in this build.');
      setEngineReady(false);
      return;
    }

    const native = PocktTiming;
    log('native beat listener subscribe once');
    let ticks: { remove: () => void } | null = null;
    try {
      ticks = native.addListener('onTick', (nativeEvent: NativeTickEvent) => {
      try {
      if (!nativeEvent || typeof nativeEvent !== 'object') return;
      const event = nativeTickToVisual(nativeEvent);
      if (event.isPrimaryBeat && event.beatIndex === 0) {
        barRef.current += 1;
        const pending = pendingStructuralRef.current;
        if (pending && structuralCommitReady(barRef.current, pending.armedBar) && PocktTiming) {
          pendingStructuralRef.current = null;
          setPendingChange(null);
          const next = applyConfigPatch(configRef.current, pending.patch);
          configRef.current = next;
          setConfig(next);
          try {
            PocktTiming.setConfig(toNativeConfig(next));
          } catch {
            /* the next config effect retries while playing */
          }
        }
      }
      const live = configRef.current;
      const feel = FEEL_PRESETS[live.feel];
      if (!feel) return;
      pulseRole.value = event.isDownbeat ? 2 : event.isPrimaryBeat ? 1 : 0;
      if (event.isPrimaryBeat) {
        pulseBeat.value = event.beatIndex;
        if (typeof nativeEvent.eventHostTime === 'number' && Number.isFinite(nativeEvent.eventHostTime)) {
          pulseBeatHost.value = nativeEvent.eventHostTime;
        }
        if (typeof nativeEvent.secondsPerBeat === 'number' && nativeEvent.secondsPerBeat > 0) {
          pulseSpb.value = nativeEvent.secondsPerBeat;
        } else {
          pulseSpb.value = 60 / Math.max(1, live.bpm);
        }
        // frame.timestamp/1000 is already CACurrentMediaTime seconds — same
        // mach domain as eventHostTime. Do not mix performance.now().
        pulseHostOffset.value = 0;
        const raw = nativeEvent as unknown as Record<string, unknown>;
        // The engine schedules the visual for the audible moment on trusted routes; the beat is heard at
        // eventHostTime + the player's presentation latency. Faces add this to land on the sound itself.
        pulseLatency.value = raw.visualAlignsTo === 'expectedPresentation' && typeof raw.playerOutputPresentationLatencySeconds === 'number' && Number.isFinite(raw.playerOutputPresentationLatencySeconds as number)
          ? Math.max(0, Math.min(0.25, raw.playerOutputPresentationLatencySeconds as number))
          : 0;
        pulseCount.value = pulseCount.value + 1;
        if (event.beatIndex % 8 === 0) {
          crashBreadcrumb('pendulum-align', {
            beat: event.beatIndex,
            expectedMs: nativeEvent.expectedMs,
            host: nativeEvent.eventHostTime,
            delay: nativeEvent.visualDelaySeconds,
            spb: nativeEvent.secondsPerBeat,
          });
        }
      }
      pulseAccent.value =
        event.accentLevel === 'strong' || event.accentLevel === 'accent'
          ? 3
          : event.accentLevel === 'soft'
            ? 1
            : event.accentLevel === 'mute'
              ? 0
              : 2;
      const swamp = live.feel === 'swampy';
      const heavy = live.skin === 'heavy';
      const roots = live.skin === 'roots';
      const attack = heavy
        ? event.isDownbeat
          ? 48
          : event.isAccent
            ? 42
            : 38
        : roots
          ? event.isDownbeat
            ? 52
            : event.isAccent
              ? 48
              : 42
          : Math.max(
              10,
              event.isPrimaryBeat ? feel.visual.attackMs : Math.round(feel.visual.attackMs * 0.55)
            );
      const release = heavy
        ? event.isDownbeat
          ? 102
          : event.isAccent
            ? 88
            : 62
        : roots
          ? event.isDownbeat
            ? 104
            : event.isAccent
              ? 92
              : 70
          : Math.max(
              70,
              event.isPrimaryBeat
                ? feel.visual.releaseMs + feel.visual.settleMs
                : Math.round((feel.visual.releaseMs + feel.visual.settleMs) * 0.55)
            );
      let peak = finiteOr(event.visualIntensity, 0, 'tick-intensity');
      let glowPeak = peak * 0.48;
      if (event.silentMeasure) {
        glowPeak = 0.05;
      } else if (!event.isPrimaryBeat) {
        glowPeak = 0.1;
      } else if (event.accentLevel === 'mute') {
        glowPeak = 0.04;
      } else if (event.accentLevel === 'strong') {
        glowPeak = 1;
      } else if (event.accentLevel === 'accent') {
        glowPeak = 0.78;
      } else if (event.accentLevel === 'soft') {
        glowPeak = 0.28;
      } else {
        glowPeak = event.isBackbeat && swamp ? 0.62 : 0.48;
      }
      if (live.sound === 'subkick' && event.isPrimaryBeat) {
        peak = Math.min(1, peak * 1.14);
      }
      if (!effectiveVisual(live)) {
        peak = 0;
        glowPeak = 0;
      }
      const easing = Easing.bezier(0.2, 0.08, 0.16, 1);
      const visualDelay = Math.max(0, live.visualOffsetMs);
      const pulseAnim = withSequence(
        withTiming(peak, { duration: attack, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: release, easing })
      );
      const glowAnim = withSequence(
        withTiming(glowPeak, { duration: Math.max(16, attack * 0.65), easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: release + (swamp ? 80 : 36), easing })
      );
      pulse.value = visualDelay > 0 ? withDelay(visualDelay, pulseAnim) : pulseAnim;
      glow.value = visualDelay > 0 ? withDelay(visualDelay, glowAnim) : glowAnim;

      if (event.clickReturned) {
        returnPulse.value = withSequence(
          withTiming(1, { duration: 70, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 720, easing: Easing.inOut(Easing.cubic) })
        );
        setReturnFlash((value) => value + 1);
      }

      if (event.isPrimaryBeat) {
        if (configRef.current.flashOnBeat) beatTorch.notePrimaryBeat();
        setTransport({
          beatIndex: event.beatIndex,
          measureIndex: event.measureIndex,
          silentMeasure: event.silentMeasure,
          playing: true,
          isDownbeat: event.isDownbeat,
        });
      }
      } catch (error) {
        crashBreadcrumb('native-tick-ui-fail', {
          message: error instanceof Error ? error.message : String(error),
        });
        log('onTick UI callback failed; audio continues', error);
      }
    });
    } catch (error) {
      crashBreadcrumb('native-listener-fail', {
        message: error instanceof Error ? error.message : String(error),
      });
      log('native beat listener subscribe failed', error);
    }
    tickSubRef.current = ticks;

    let stateSub: { remove: () => void } | null = null;
    try {
      stateSub = native.addListener('onEngineState', (event: { running?: boolean }) => {
        const running = Boolean(event?.running);
        if (!running && playingRef.current) {
          playingRef.current = false;
          startingRef.current = false;
          beatTorch.forceOff();
          void Promise.resolve(deactivateKeepAwake('pockt')).catch(() => {});
          setPlaying(false);
          setTransport({
            beatIndex: 0,
            measureIndex: 0,
            silentMeasure: false,
            playing: false,
            isDownbeat: true,
          });
        } else if (running && !playingRef.current && !startingRef.current) {
          playingRef.current = true;
          setPlaying(true);
          setTransport((prev) => ({ ...prev, playing: true }));
        }
      });
    } catch (error) {
      log('native engine state listener failed', error);
    }

    return () => {
      log('listener cleanup started');
      try {
        tickSubRef.current?.remove();
      } catch (error) {
        log('listener cleanup error', error);
      }
      try {
        stateSub?.remove();
      } catch {
        /* ignore */
      }
      tickSubRef.current = null;
      log('listener cleanup complete');
    };
    // Subscribe once for the app lifetime. Do not stop the native engine here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    beatTorch.setEnabled(config.flashOnBeat && playing);
    if (!config.flashOnBeat || !playing) beatTorch.forceOff();
  }, [config.flashOnBeat, playing]);

  useEffect(() => {
    return () => {
      beatTorch.setEnabled(false);
      beatTorch.forceOff();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !PocktTiming) return;
    let alive = true;
    void (async () => {
      try {
        const uris = await resolveClickUris().catch(() => ({} as Record<string, string>));
        const report = await PocktTiming.prepare(uris);
        if (!alive) return;
        preparedRef.current = true;
        setEngineReady(true);
        if (report?.resourceFound === false || report?.hasDefaultBuffer === false) {
          setEngineError('Native click resources failed to load.');
        } else {
          setEngineError(null);
        }
      } catch {
        if (alive) preparedRef.current = false;
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!PocktTiming || !preparedRef.current) return;
    if (!playingRef.current) return;
    PocktTiming.setConfig(toNativeConfig(config));
  }, [config]);

  const update = useCallback((patch: Partial<MetronomeConfig>) => {
    let livePatch = patch;
    if (playingRef.current && isStructuralPatch(patch)) {
      const structural: Partial<MetronomeConfig> = {
        ...(pendingStructuralRef.current?.patch ?? {}),
        ...(patch.timeSignature != null ? { timeSignature: patch.timeSignature } : {}),
        ...(patch.subdivision != null ? { subdivision: patch.subdivision } : {}),
      };
      pendingStructuralRef.current = { patch: structural, armedBar: barRef.current };
      setPendingChange({
        timeSignature: structural.timeSignature,
        subdivision: structural.subdivision,
      });
      const rest = { ...patch };
      delete rest.timeSignature;
      delete rest.subdivision;
      if (Object.keys(rest).length === 0) return;
      livePatch = rest;
    }
    setConfig((prev) => {
      const next = applyConfigPatch(prev, livePatch);
      if (livePatch.volume != null && PocktTiming) {
        PocktTiming.setMasterGain?.(next.volume);
      }
      if (
        playingRef.current &&
        preparedRef.current &&
        PocktTiming &&
        (livePatch.bpm != null ||
          livePatch.feel != null ||
          livePatch.accentPattern != null ||
          livePatch.volume != null ||
          livePatch.sound != null ||
          livePatch.soundDownbeat != null ||
          livePatch.soundBeat != null ||
          livePatch.soundSub != null)
      ) {
        PocktTiming.setConfig(toNativeConfig(next));
      }
      if (patch.customLayout) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        void saveSettings(next);
      }
      return next;
    });
  }, []);

  const setBpm = useCallback(
    (value: number) => {
      const next = clampBpm(value);
      const newSpb = 60 / Math.max(1, next);
      configRef.current = { ...configRef.current, bpm: next };
      update({ bpm: next });
      if (playingRef.current && pulseBeatHost.value > 0) {
        const nowHost = PocktTiming?.visualHostSeconds?.();
        if (typeof nowHost === 'number' && Number.isFinite(nowHost) && nowHost > 0) {
          pulseBeatHost.value = remapBeatHostForTempo({
            nowHostSeconds: nowHost,
            beatIndex: pulseBeat.value,
            previousHostSeconds: pulseBeatHost.value,
            oldSecondsPerBeat: pulseSpb.value,
            newSecondsPerBeat: newSpb,
          });
          pulseSpb.value = newSpb;
        }
      } else {
        pulseSpb.value = newSpb;
      }
      if (playingRef.current && preparedRef.current && PocktTiming) {
        PocktTiming.setConfig(toNativeConfig({ ...configRef.current, bpm: next }));
      }
    },
    [pulseBeat, pulseBeatHost, pulseSpb, update]
  );

  const start = useCallback(async () => {
    return enqueueAudio(async () => {
    // a start that never finished (a native call that hung) must not block every later Play
    if (startingRef.current && Date.now() - startingAtRef.current < 5000) return;
    const audioToken = commitAudioMode('TRANSITIONING');
    const live = configRef.current;
    const token = startGenRef.current + 1;
    startGenRef.current = token;
    startingRef.current = true;
    startingAtRef.current = Date.now();
    playingRef.current = false;
    barRef.current = 0;
    crashBreadcrumb('play', { bpm: live.bpm, sound: live.sound, room: live.skin });
    log('PLAY pressed');
    log('BPM', live.bpm);
    log('subdivision', live.subdivision);
    log('meter', live.timeSignature);
    log('sound ID', live.sound);
    try {
      if (!PocktTiming || !PocktTiming.isNativeEngine || !PocktTiming.isAvailable()) {
        const message =
          'POCKT requires a native iOS build. Expo Go cannot host the professional timing engine.';
        setEngineError(message);
        log('native engine unavailable; PLAY aborted without opening-sound fallback');
        commitAudioModeIf(audioToken, 'IDLE');
        Alert.alert('Could not start', message);
        return;
      }

      const uris = await resolveClickUris().catch(() => ({} as Record<string, string>));
      try {
        // Play always starts a fresh musical timeline. Stop any stale native run first so
        // restore cannot recoverPlaybackPreservingPhase and emit a click before start.
        try {
          PocktTiming.stop?.();
        } catch {
          /* ignore: Stop is only to clear a desynced native timeline */
        }
        // Always restore session + graph before Play. A still-running AVAudioEngine can
        // report isRunning while its session, player, or buffers are silent.
        log('calling native restorePlaybackGraph');
        const restored = await PocktTiming.restorePlaybackGraph?.();
        log('native restore returned', restored);
        // Always reload the click graph. A restored engine can report buffers
        // after tuner or a cancelled start and still be silent.
        log('calling native prepare');
        const report = await PocktTiming.prepare(uris);
        log('native prepare returned', report);
        preparedRef.current = true;
        setEngineReady(true);
      } catch (prepareError) {
        log('prepare/restore failed; forcing prepare', prepareError);
        const report = await PocktTiming.prepare(uris);
        preparedRef.current = true;
        setEngineReady(true);
        log('native prepare returned', report);
      }
      if (live.keepAwake) await activateKeepAwakeAsync('pockt');
      PocktTiming.resetDiagnostics();
      log('entering native metronome start');
      let started = await PocktTiming.start(toNativeConfig(live));
      if (!startReportIsAlive(started, effectiveVolume(live))) {
        log('start reported invalid audio; restoring playback graph once');
        const restored = await PocktTiming.restorePlaybackGraph?.();
        log('native restore returned', restored);
        preparedRef.current = true;
        started = await PocktTiming.start(toNativeConfig(live));
      }
      log('generation/session ID', started?.generation);
      log('architecture', started?.architecture);
      log('queued chunks', started?.queuedChunkCount);
      log('initial queued seconds', started?.initialQueuedSeconds);
      log('first chunk frames', started?.firstChunkFrameCount);
      log('first chunk peak', started?.firstChunkPeakAmplitude);
      log('first chunk nonzero', started?.firstChunkNonZeroSampleCount);
      log('scheduled through sample', started?.scheduledThroughSample);
      log('engine running', started?.engineRunning ?? started?.running);
      log('player node playing', started?.playerPlaying ?? started?.playerNodePlaying);
      log('player sample advanced', started?.playerSampleAdvanced);
      const alive = startReportIsAlive(started, effectiveVolume(live));
      if (!alive) {
        throw new Error('Native metronome idle after start');
      }
      if (token !== startGenRef.current) {
        try {
          PocktTiming?.stop();
        } catch {
          /* cancelled before visual play */
        }
        return;
      }
      const epoch = pendulumEpochFromNativeStart(started);
      pulseBeat.value = epoch?.beatIndex ?? 0;
      pulseBeatHost.value = epoch?.beatHostSeconds ?? 0;
      pulseSpb.value = epoch?.secondsPerBeat ?? 60 / Math.max(1, live.bpm);
      if (!commitAudioModeIf(audioToken, 'PLAYBACK')) return;
      playingRef.current = true;
      setPlaying(true);
      setTransport({
        beatIndex: 0,
        measureIndex: 0,
        silentMeasure: false,
        playing: true,
        isDownbeat: true,
      });
      setEngineError(null);
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Failed to start native timing engine';
      log('native start failed exact error', raw, error);
      let recovered = false;
      try {
        log('audio recovery: restore playback graph + start');
        await PocktTiming?.restorePlaybackGraph?.();
        preparedRef.current = true;
        const started = await PocktTiming?.start(toNativeConfig(configRef.current));
        log('recovery start returned', started?.generation, started?.engineRunning);
        if (startReportIsAlive(started, effectiveVolume(configRef.current))) {
          if (token !== startGenRef.current) {
            try {
              PocktTiming?.stop();
            } catch {
              /* cancelled during recovery */
            }
            return;
          }
          if (!commitAudioModeIf(audioToken, 'PLAYBACK')) return;
          recovered = true;
          const epoch = pendulumEpochFromNativeStart(started);
          pulseBeat.value = epoch?.beatIndex ?? 0;
          pulseBeatHost.value = epoch?.beatHostSeconds ?? 0;
          pulseSpb.value = epoch?.secondsPerBeat ?? 60 / Math.max(1, configRef.current.bpm);
          playingRef.current = true;
          setPlaying(true);
          setTransport({
            beatIndex: 0,
            measureIndex: 0,
            silentMeasure: false,
            playing: true,
            isDownbeat: true,
          });
          setEngineError(null);
        }
      } catch (retryError) {
        log('audio recovery failed', retryError);
      }
      if (recovered) return;
      commitAudioModeIf(audioToken, 'IDLE');
      const message = friendlyTransportError(raw);
      if (__DEV__) {
        console.warn('[POCKT AUDIO] native start failed', raw, error);
      }
      playingRef.current = false;
      setEngineError(message);
      setPlaying(false);
      setTransport({
        beatIndex: 0,
        measureIndex: 0,
        silentMeasure: false,
        playing: false,
        isDownbeat: true,
      });
      pulse.value = withTiming(0, { duration: 120 });
      glow.value = withTiming(0, { duration: 160 });
      void Promise.resolve(deactivateKeepAwake('pockt')).catch(() => {});
      // Recoverable session failures must not trap the user behind an alert.
    } finally {
      startingRef.current = false;
    }
    });
  }, [glow, log, pulse, pulseBeat, pulseBeatHost, pulseSpb]);

  const stop = useCallback(() => {
    crashBreadcrumb('stop', { room: configRef.current.skin });
    log('STOP pressed:', configRef.current.skin);
    log('playback state:', playingRef.current);
    startGenRef.current += 1;
    if (playingRef.current || startingRef.current) {
      try {
        PocktTiming?.stop();
        log('native stop returned');
      } catch (error) {
        log('native stop failed', error);
      }
    } else {
      log('native stop skipped; musical timeline not running');
    }
    startingRef.current = false;
    preparedRef.current = false;
    beatTorch.forceOff();
    void Promise.resolve(deactivateKeepAwake('pockt')).catch(() => {});
    setPlaying(false);
    setTransport({
      beatIndex: 0,
      measureIndex: 0,
      silentMeasure: false,
      playing: false,
      isDownbeat: true,
    });
    pulse.value = withTiming(0, { duration: 180 });
    glow.value = withTiming(0, { duration: 220 });
    pulseBeat.value = 0;
    pulseBeatHost.value = 0;
    pulseAccent.value = 1;
    pulseRole.value = 1;
    const pending = pendingStructuralRef.current;
    pendingStructuralRef.current = null;
    setPendingChange(null);
    if (pending) {
      setConfig((prev) => {
        const next = applyConfigPatch(prev, pending.patch);
        configRef.current = next;
        return next;
      });
    }
    if (audioMode() === 'PLAYBACK' || audioMode() === 'TRANSITIONING') commitAudioMode('IDLE');
    reviveUiDetent();
  }, [glow, log, pulse, pulseAccent, pulseBeat, pulseBeatHost, pulseRole]);

  const toggle = useCallback(() => {
    if (playingRef.current || startingRef.current) stop();
    else void start();
  }, [start, stop]);

  useEffect(() => {
    let previous = AppState.currentState;
    const sub = AppState.addEventListener('change', (state) => {
      const from = previous;
      previous = state;
      if (state === 'active') {
        crashBreadcrumb('app-foreground', { from, running: Boolean(PocktTiming?.isRunning?.()) });
        const running = Boolean(PocktTiming?.isRunning?.());
        if (running && !playingRef.current) {
          playingRef.current = true;
          setPlaying(true);
          setTransport((prev) => ({ ...prev, playing: true }));
        } else if (!running && playingRef.current) {
          playingRef.current = false;
          startingRef.current = false;
          beatTorch.forceOff();
          setPlaying(false);
          setTransport({
            beatIndex: 0,
            measureIndex: 0,
            silentMeasure: false,
            playing: false,
            isDownbeat: true,
          });
        }
        // Screenshots briefly go inactive→active. Rebuilding the graph there
        // disturbs the native clock. Restore only after a real background.
        if (playingRef.current && from === 'background') {
          void enqueueAudio(async () => {
            if (audioMode() !== 'PLAYBACK') return;
            await PocktTiming?.restorePlaybackGraph?.();
          });
        }
        reviveUiDetent();
      } else if (playingRef.current && !configRef.current.backgroundPlay) {
        crashBreadcrumb('app-background', { from, to: state });
        stop();
      } else {
        crashBreadcrumb('app-background', { from, to: state, playing: playingRef.current });
      }
    });
    return () => sub.remove();
  }, [stop]);

  const tapTempo = useCallback((at?: number) => {
    const bpm = tapRef.current.tap(at);
    setTapFlash((value) => value + 1);
    if (bpm != null) setBpm(bpm);
    return bpm;
  }, [setBpm]);

  const previewSound = useCallback((sound: SoundId) => {
    PocktTiming?.preview(sound, Math.max(0.35, configRef.current.volume));
    PocktTiming?.setMasterGain?.(configRef.current.volume);
    reviveUiDetent();
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig((prev) =>
      factoryResetConfig(prev.skin, {
        skinCategory: prev.skinCategory,
        classicBackdrop: prev.classicBackdrop,
        customPhotoUri: prev.customPhotoUri,
        customLayout: prev.customLayout,
        hasSeenClassicTutorial: prev.hasSeenClassicTutorial,
        hasSeenTitaniumTutorial: prev.hasSeenTitaniumTutorial,
        hasSeenStudioTutorial: prev.hasSeenStudioTutorial,
        hasSeenAlteredTutorial: prev.hasSeenAlteredTutorial,
        hasSeenAfterDarkTutorial: prev.hasSeenAfterDarkTutorial,
        hasSeenHeavyTutorial: prev.hasSeenHeavyTutorial,
        hasSeenRootsTutorial: prev.hasSeenRootsTutorial,
        hasSeenSundownTutorial: prev.hasSeenSundownTutorial,
        hasSeenHeartTutorial: prev.hasSeenHeartTutorial,
      })
    );
  }, []);

  const runMathSelfTest = useCallback(async (): Promise<TimingDiagnostics | null> => {
    if (!PocktTiming) return null;
    return PocktTiming.runMathSelfTest(60, 48000);
  }, []);

  const getDiagnostics = useCallback((): TimingDiagnostics | null => {
    if (!PocktTiming) return null;
    return PocktTiming.getDiagnostics();
  }, []);

  const audioProbe = useCallback((): Record<string, unknown> | null => {
    if (!PocktTiming) return null;
    return PocktTiming.audioProbe();
  }, []);

  const runAudioSanityTest = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!PocktTiming) return null;
    if (PocktTiming.audioSanityTest) {
      return PocktTiming.audioSanityTest();
    }
    return PocktTiming.runAudioSanityTest(configRef.current.sound, Math.max(0.7, configRef.current.volume));
  }, []);

  const runMetronomeSelfTest120 = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!PocktTiming?.metronomeSelfTest120) return null;
    log('metronomeSelfTest120');
    return PocktTiming.metronomeSelfTest120();
  }, [log]);

  const reclaimAudio = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!PocktTiming) return null;
    try {
      const uris = await resolveClickUris().catch(() => ({} as Record<string, string>));
      const report = await PocktTiming.prepare(uris);
      preparedRef.current = true;
      setEngineReady(true);
      const reclaimed = PocktTiming.reclaimSession ? await PocktTiming.reclaimSession() : report;
      const found = reclaimed?.resourceFound !== false;
      const frames = Array.isArray(reclaimed?.buffers)
        ? (reclaimed.buffers as { frames?: number }[]).some((item) => (item.frames ?? 0) > 0)
        : true;
      if (!found || !frames) {
        setEngineError('Native click resources failed to load. See MIX timing lab.');
      } else {
        setEngineError(null);
      }
      if (__DEV__) console.log('[POCKT AUDIO] session reclaimed', reclaimed);
      return reclaimed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reclaim audio session';
      setEngineError(message);
      return null;
    }
  }, []);

  const testKnownGoodHomeSound = useCallback(async (): Promise<Record<string, unknown> | null> => {
    log('testKnownGoodHomeSound: invoking exact Home ident path');
    try {
      await playKnownGoodHomeSound();
      log('testKnownGoodHomeSound: Home ident play() returned');
      return {
        path: 'BrandedIntro.startClock → setAudioModeAsync → useAudioPlayer(BRAND_IDENT_AUDIO).play()',
        source: 'assets/audio/pockt-ident-v83.wav',
        engine: 'expo-audio AudioPlayer (not PocktTimingEngine)',
        played: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log('testKnownGoodHomeSound failed', message);
      return { played: false, error: message };
    }
  }, [log]);

  const runJsStress = useCallback((durationMs = 2500) => stressJsThread(durationMs), []);

  return {
    config,
    update,
    setBpm,
    playing,
    transport,
    pulse,
    returnPulse,
    glow,
    pulseRole,
    pulseAccent,
    pulseBeat,
    pulseBeatHost,
    pulseSpb,
    pulseHostOffset,
    pulseCount,
    pulseLatency,
    returnFlash,
    tapFlash,
    hydrated,
    restoredFromDisk,
    start,
    stop,
    toggle,
    tapTempo,
    pendingChange,
    previewSound,
    resetToDefaults,
    nativeAvailable,
    engineReady,
    engineError,
    runMathSelfTest,
    getDiagnostics,
    audioProbe,
    runAudioSanityTest,
    runMetronomeSelfTest120,
    reclaimAudio,
    testKnownGoodHomeSound,
    runJsStress,
  };
}

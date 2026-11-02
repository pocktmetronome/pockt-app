import { useCallback, useEffect, useRef, useState } from 'react';
import { requestRecordingPermissionsAsync } from 'expo-audio';

import { audioClaim } from '@/lib/audio-claim';
import { audioMode, commitAudioMode, enqueueAudio } from '@/lib/audio-ownership';
import { crashBreadcrumb } from '@/lib/crash-trace';
import { hapticMedium } from '@/lib/haptics';
import {
  advanceTunerTracker,
  createTunerTracker,
  DEFAULT_A4,
  type TunerReading,
} from '@/lib/tuner-math';
import { advanceInTuneLatch, createInTuneLatch } from '@/lib/tuner-lock';
import PocktTiming from '@/modules/pockt-timing';

const IN_TUNE_DWELL_MS = 280;

export type TunerPhase = 'idle' | 'initializing' | 'listening' | 'denied' | 'error';

export type TunerDiagnostics = {
  buffersReceived: number;
  rms: number;
  permission: string;
  inputSampleRate: number;
  inputChannelCount: number;
  sessionCategory?: string;
  sessionMode?: string;
  sessionOptions?: number;
  hardwareSampleRate?: number;
  preferredSampleRate?: number;
  ioBufferDuration?: number;
  inputPort?: string;
  inputNumberOfChannels?: number;
  engineRunning?: boolean;
  tapInstalled?: boolean;
  frequency?: number;
  confidence?: number;
  isOtherAudioPlaying?: boolean;
};

export function useTuner(active: boolean, a4 = DEFAULT_A4, response: 'stable' | 'fast' = 'stable') {
  const [reading, setReading] = useState<TunerReading | null>(null);
  const [phase, setPhase] = useState<TunerPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [diag, setDiag] = useState<TunerDiagnostics>({
    buffersReceived: 0,
    rms: 0,
    permission: 'unknown',
    inputSampleRate: 0,
    inputChannelCount: 0,
  });
  const tracker = useRef(createTunerTracker());
  const latch = useRef(createInTuneLatch());
  const live = useRef(false);
  const lastUi = useRef(0);
  const session = useRef(0);

  const cleanup = useCallback(async () => {
    live.current = false;
    tracker.current = createTunerTracker();
    latch.current = createInTuneLatch();
    setReading(null);
    setPhase('idle');
    setDiag({
      buffersReceived: 0,
      rms: 0,
      permission: 'unknown',
      inputSampleRate: 0,
      inputChannelCount: 0,
    });
    await enqueueAudio(async () => {
      if (audioClaim() === 'phrase') return;
      // always tell the engine the tuner closed: with the click running it keeps the graph and only stops
      // listening, so this can never interrupt playback
      try {
        await PocktTiming?.stopTuner();
      } catch {
        /* session restore is best-effort */
      }
      if (audioMode() === 'TUNER_CAPTURE') commitAudioMode(PocktTiming?.isRunning?.() ? 'PLAYBACK' : 'IDLE');
    });
  }, []);

  useEffect(() => {
    if (!active) {
      session.current += 1;
      void cleanup();
      return;
    }
    const seq = ++session.current;
    const mine = () => session.current === seq;
    live.current = true;
    let cancelled = false;
    let sub: { remove(): void } | undefined;
    void (async () => {
      try {
        setPhase('initializing');
        setError(null);
        if (!PocktTiming?.startTuner) {
          setPhase('error');
          setError('Tuner needs a native POCKT build.');
          return;
        }
        const permission = await requestRecordingPermissionsAsync();
        if (!mine() || cancelled) return;
        if (!permission.granted) {
          setPhase('denied');
          setError('Microphone access is needed to tune.');
          setDiag((prev) => ({ ...prev, permission: 'denied' }));
          return;
        }
        const report = (await enqueueAudio(async () => {
          if (!mine() || cancelled) return null;
          commitAudioMode('TUNER_CAPTURE');
          return (await PocktTiming?.startTuner()) as Record<string, unknown> | boolean;
        })) as Record<string, unknown> | boolean | null;
        if (!mine() || cancelled) {
          // A newer session owns the engine. Do not stopTuner here.
          return;
        }
        if (report && typeof report === 'object') {
          setDiag((prev) => ({
            ...prev,
            permission: String(report.permission ?? 'granted'),
            inputSampleRate: Number(report.inputSampleRate) || 0,
            inputChannelCount: Number(report.inputChannelCount) || 0,
            sessionCategory: typeof report.sessionCategory === 'string' ? report.sessionCategory : undefined,
            sessionMode: typeof report.sessionMode === 'string' ? report.sessionMode : undefined,
            sessionOptions: Number(report.sessionOptions) || undefined,
            hardwareSampleRate: Number(report.hardwareSampleRate ?? report.sessionSampleRate) || undefined,
            preferredSampleRate: Number(report.preferredSampleRate) || undefined,
            ioBufferDuration: Number(report.ioBufferDuration) || undefined,
            inputPort: typeof report.inputPort === 'string' ? report.inputPort : undefined,
            inputNumberOfChannels: Number(report.inputNumberOfChannels) || undefined,
            engineRunning: report.engineRunning === true,
            tapInstalled: report.tapInstalled === true,
            isOtherAudioPlaying: report.isOtherAudioPlaying === true,
            buffersReceived: Number(report.buffersReceived) || 0,
          }));
        }
        const listener = PocktTiming.addListener('onTunerPitch', (event) => {
          if (!mine() || !live.current) return;
          const frequency = Number(event.frequency);
          const confidence = Number(event.confidence);
          const rms = Number(event.rms);
          if (!Number.isFinite(frequency) || !Number.isFinite(confidence) || !Number.isFinite(rms)) return;
          const buffersReceived = Number(event.buffersReceived) || 0;
          const now = Date.now();
          if (now - lastUi.current > 50) {
            lastUi.current = now;
            setDiag((prev) => ({
              ...prev,
              buffersReceived: Math.max(prev.buffersReceived, buffersReceived),
              rms,
              permission: typeof event.permission === 'string' ? event.permission : prev.permission,
              inputSampleRate: Number(event.inputSampleRate) || prev.inputSampleRate,
              inputChannelCount: Number(event.inputChannelCount) || prev.inputChannelCount,
              frequency: Number(event.frequency) || 0,
              confidence: Number(event.confidence) || 0,
            }));
            if (buffersReceived > 0) setPhase('listening');
          }
          const stepped = advanceTunerTracker(tracker.current, frequency, confidence, rms, now, a4, response);
          tracker.current = stepped.tracker;
          const next = stepped.reading;
          if (!next) {
            latch.current = advanceInTuneLatch(latch.current, false, now).latch;
            setReading((prev) => (prev == null ? prev : null));
            return;
          }
          setReading(next);
          const locked = advanceInTuneLatch(latch.current, next.state === 'in-tune', now, IN_TUNE_DWELL_MS);
          latch.current = locked.latch;
          if (locked.fire) {
            // Haptic only. A reference tone boots the playback graph and can drop the tuner input.
            void hapticMedium();
            PocktTiming?.playTuneConfirm?.();
          }
        });
        if (!mine() || cancelled) {
          listener.remove();
          return;
        }
        sub = listener;
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        crashBreadcrumb('native-listener-fail', { source: 'tuner-start', message });
        if (!mine()) return;
        if (/denied|permission/i.test(message)) {
          setPhase('denied');
          setError('Microphone access is needed to tune.');
        } else {
          setPhase('error');
          setError(message || 'Tuner could not start the microphone.');
        }
      }
    })();
    return () => {
      cancelled = true;
      live.current = false;
      sub?.remove();
      if (session.current === seq) {
        session.current += 1;
        void cleanup();
      }
    };
  }, [a4, active, cleanup, response]);

  return {
    reading,
    listening: phase === 'listening',
    phase,
    denied: phase === 'denied',
    error,
    diag,
  };
}

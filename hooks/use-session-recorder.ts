import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { canQueryNativeRecorder, registerRecorderFlush } from '@/lib/recorder-lifecycle';
import PocktTiming from '@/modules/pockt-timing';

export type SessionRecorderStatus = 'idle' | 'recording' | 'playing';

const MAX_BARS = 48;

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function useSessionRecorder() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(null, { keepAudioSessionActive: true, updateInterval: 250 });
  const [uri, setUri] = useState<string | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [guideOn, setGuideOn] = useState(true);
  const [levels, setLevels] = useState<number[]>([]);
  const levelsRef = useRef<number[]>([]);
  const meterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);
  const playingRef = useRef(false);
  const phaseRef = useRef<'active' | 'unmounting' | 'released'>('active');
  const recorderRef = useRef(recorder);
  const playerRef = useRef(player);
  recorderRef.current = recorder;
  playerRef.current = player;

  const recording = recordingRef.current;
  const durationSec = recording
    ? recorderState.durationMillis / 1000
    : uri
      ? savedDuration
      : 0;

  const stopMeter = useCallback(() => {
    if (meterTimer.current) {
      clearInterval(meterTimer.current);
      meterTimer.current = null;
    }
  }, []);

  const enableCapture = useCallback(async (on: boolean) => {
    try {
      if (on) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: true,
          allowsRecording: true,
        });
        if (PocktTiming?.setInputCapture) {
          await PocktTiming.setInputCapture(true);
        }
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: true,
        allowsRecording: false,
      });
      if (PocktTiming?.setInputCapture) {
        await PocktTiming.setInputCapture(false);
      }
      try {
        await PocktTiming?.restorePlaybackGraph?.();
      } catch {
        /* playback restore is best-effort after recorder */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio session could not enter record mode.');
    }
  }, []);

  const startRecord = useCallback(async () => {
    if (phaseRef.current !== 'active') return;
    setError(null);
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone access is required to record a take.');
      return;
    }
    try {
      if (playingRef.current) {
        playingRef.current = false;
        setPlaying(false);
        if (canQueryNativeRecorder(phaseRef.current)) {
          playerRef.current.pause();
        }
      }
      await enableCapture(true);
      levelsRef.current = [];
      setLevels([]);
      await recorderRef.current.prepareToRecordAsync();
      recorderRef.current.record();
      recordingRef.current = true;
      stopMeter();
      meterTimer.current = setInterval(() => {
        if (phaseRef.current !== 'active' || !recordingRef.current) return;
        const raw = typeof recorderState.metering === 'number' ? recorderState.metering : -40;
        const norm = Math.min(1, Math.max(0.04, (raw + 50) / 50));
        const next = [...levelsRef.current, norm].slice(-MAX_BARS);
        levelsRef.current = next;
        setLevels(next);
      }, 120);
    } catch (err) {
      recordingRef.current = false;
      setError(err instanceof Error ? err.message : 'Recording could not start.');
      await enableCapture(false);
    }
  }, [enableCapture, recorderState.metering, stopMeter]);

  const stopRecord = useCallback(async () => {
    stopMeter();
    if (!recordingRef.current) {
      await enableCapture(false);
      return;
    }
    recordingRef.current = false;
    if (!canQueryNativeRecorder(phaseRef.current)) {
      await enableCapture(false);
      return;
    }
    try {
      await recorderRef.current.stop();
      const nextUri = recorderRef.current.uri;
      if (nextUri) {
        const seconds = recorderState.durationMillis / 1000;
        setUri(nextUri);
        setSavedDuration(Number.isFinite(seconds) ? seconds : 0);
        if (canQueryNativeRecorder(phaseRef.current)) {
          playerRef.current.replace({ uri: nextUri });
        }
      } else {
        setError('No audio was captured. Try again without system screen recording.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording could not stop.');
    } finally {
      await enableCapture(false);
    }
  }, [enableCapture, recorderState.durationMillis, stopMeter]);

  const playTake = useCallback(() => {
    if (!uri || !canQueryNativeRecorder(phaseRef.current)) return;
    setError(null);
    try {
      playerRef.current.replace({ uri });
      playerRef.current.play();
      playingRef.current = true;
      setPlaying(true);
    } catch (err) {
      playingRef.current = false;
      setPlaying(false);
      setError(err instanceof Error ? err.message : 'Playback is unavailable.');
    }
  }, [uri]);

  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (!canQueryNativeRecorder(phaseRef.current)) return;
    try {
      playerRef.current.pause();
      void playerRef.current.seekTo(0);
    } catch {
      /* released player must not crash the room */
    }
  }, []);

  const discard = useCallback(async () => {
    stopMeter();
    if (recordingRef.current && canQueryNativeRecorder(phaseRef.current)) {
      recordingRef.current = false;
      try {
        await recorderRef.current.stop();
      } catch {
        /* discard still proceeds */
      }
    }
    recordingRef.current = false;
    stopPlayback();
    setUri(null);
    setSavedDuration(0);
    setLevels([]);
    levelsRef.current = [];
    await enableCapture(false);
  }, [enableCapture, stopMeter, stopPlayback]);

  useEffect(() => {
    registerRecorderFlush(async () => {
      if (playingRef.current) stopPlayback();
      if (recordingRef.current) await stopRecord();
    });
    return () => {
      registerRecorderFlush(null);
    };
  }, [stopPlayback, stopRecord]);

  useEffect(
    () => () => {
      phaseRef.current = 'unmounting';
      stopMeter();
      recordingRef.current = false;
      playingRef.current = false;
      registerRecorderFlush(null);
      void PocktTiming?.setInputCapture?.(false);
      /* Do not read recorder.isRecording / player.playing. Expo owns native release. */
      phaseRef.current = 'released';
    },
    [stopMeter]
  );

  const status: SessionRecorderStatus = recording ? 'recording' : playing ? 'playing' : 'idle';

  return {
    status,
    recording,
    playing,
    hasTake: Boolean(uri),
    uri,
    error,
    durationLabel: formatClock(durationSec),
    durationSec,
    levels,
    guideOn,
    setGuideOn,
    startRecord,
    stopRecord,
    playTake,
    stopPlayback,
    discard,
  };
}

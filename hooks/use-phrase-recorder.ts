import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { claimAudio } from '@/lib/audio-claim';
import { audioMode, captureReleaseIsBlocked, commitAudioMode, enqueueAudio } from '@/lib/audio-ownership';
import { playbackReady } from '@/lib/audio-release';
import { canQueryNativeRecorder } from '@/lib/recorder-lifecycle';
import { createPhraseDeck, phraseFinish, phrasePress, phraseScrub, phraseSuspend, type PhraseCommand, type PhraseDeck } from '@/lib/phrase-deck';
import PocktTiming from '@/modules/pockt-timing';

/**
 * One local phrase. Recording borrows the native session through setInputCapture,
 * then restorePlaybackGraph hands the engine back to the metronome.
 * It does not run beside the tuner tap.
 */
export function usePhraseRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null, { keepAudioSessionActive: true, updateInterval: 250 });
  const [deck, setDeck] = useState<PhraseDeck>(createPhraseDeck);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const deckRef = useRef(deck);
  const generation = useRef(0);
  const startedAt = useRef(0);
  const durationRef = useRef(0);
  const scrubbing = useRef(false);
  const resumeAfter = useRef(false);
  const uriRef = useRef<string | null>(null);
  const phaseRef = useRef<'active' | 'released'>('active');
  const recorderRef = useRef(recorder);
  /** While the click runs, the session stays in record mode between takes: switching it back and forth
   *  under a running engine is what glitched (and sometimes stopped) the click. */
  const keepCapture = useRef(false);
  const captureOn = useRef(false);
  const startedHost = useRef(0);
  const playerRef = useRef(player);
  deckRef.current = deck;
  recorderRef.current = recorder;
  playerRef.current = player;

  const enableCapture = useCallback(async (on: boolean, gen: number) => {
    return enqueueAudio(async () => {
    if (gen !== generation.current) return;
    if (on && captureOn.current) return;
    if (!on && !captureOn.current) return;
    captureOn.current = on;
    if (on) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: true,
        allowsRecording: true,
      });
      if (gen !== generation.current) return;
      await PocktTiming?.setInputCapture?.(true);
      return;
    }
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: true,
      allowsRecording: false,
    });
    if (gen !== generation.current) return;
    await PocktTiming?.setInputCapture?.(false);
    if (gen !== generation.current) return;
    try {
      const probe = await PocktTiming?.restorePlaybackGraph?.();
      if (gen !== generation.current) return;
      if (!playbackReady(probe)) {
        await PocktTiming?.reclaimSession?.();
      }
    } catch {
      if (gen !== generation.current) return;
      await PocktTiming?.reclaimSession?.().catch(() => undefined);
      await PocktTiming?.restorePlaybackGraph?.().catch(() => undefined);
    }
    if (!on && audioMode() === 'RECORDER_CAPTURE') commitAudioMode('IDLE');
    });
  }, []);

  const apply = useCallback(
    async (command: PhraseCommand | null, next: PhraseDeck) => {
      if (phaseRef.current !== 'active' || !command) {
        setDeck(next);
        return;
      }
      try {
        if (command === 'start-record' || command === 'replace') {
          const gen = generation.current + 1;
          generation.current = gen;
          claimAudio('phrase');
          await PocktTiming?.stopTuner?.();
          if (gen !== generation.current) return;
          const permission = await AudioModule.requestRecordingPermissionsAsync();
          if (!permission.granted) {
            setError('Microphone access is required to record.');
            setDeck(createPhraseDeck());
            claimAudio(null);
            return;
          }
          if (canQueryNativeRecorder(phaseRef.current === 'active' ? 'active' : 'released')) {
            try {
              playerRef.current.pause();
            } catch {
              /* no take loaded yet */
            }
          }
          await enableCapture(true, gen);
          if (gen !== generation.current) return;
          await recorderRef.current.prepareToRecordAsync();
          recorderRef.current.record();
          uriRef.current = null;
          startedAt.current = Date.now();
          startedHost.current = PocktTiming?.visualHostSeconds?.() ?? 0;
          durationRef.current = 0;
          setDuration(0);
          setProgress(0);
          setElapsed(0);
          setError(null);
          setDeck({ phase: 'recording', loop: false, hasTake: false });
          return;
        }
        if (command === 'stop-record') {
          const gen = generation.current + 1;
          generation.current = gen;
          if (canQueryNativeRecorder('active')) {
            await recorderRef.current.stop();
            uriRef.current = recorderRef.current.uri;
          }
          if (!keepCapture.current) await enableCapture(false, gen);
          const hasTake = Boolean(uriRef.current);
          const taken = Math.max(0, (Date.now() - startedAt.current) / 1000);
          durationRef.current = hasTake ? taken : 0;
          if (hasTake && uriRef.current && canQueryNativeRecorder('active')) {
            playerRef.current.replace({ uri: uriRef.current });
            playerRef.current.loop = next.loop;
            try {
              playerRef.current.seekTo(0);
            } catch {
              /* the take opens at the start */
            }
          }
          claimAudio(null);
          setDuration(durationRef.current);
          setElapsed(0);
          setProgress(0);
          setDeck({ phase: hasTake ? 'ready' : 'idle', loop: false, hasTake });
          if (!hasTake) setError('No audio was captured.');
          return;
        }
        if (command === 'clear') {
          const gen = generation.current + 1;
          generation.current = gen;
          scrubbing.current = false;
          resumeAfter.current = false;
          if (canQueryNativeRecorder('active')) {
            try {
              await recorderRef.current.stop();
            } catch {
              /* not recording */
            }
            try {
              playerRef.current.pause();
            } catch {
              /* nothing loaded */
            }
          }
          uriRef.current = null;
          durationRef.current = 0;
          setDuration(0);
          setProgress(0);
          setElapsed(0);
          await enableCapture(false, gen);
          claimAudio(null);
          setDeck(createPhraseDeck());
          return;
        }
        if (command === 'finish') {
          setProgress(0);
          setDeck(next);
          return;
        }
        if (command === 'restart') {
          try {
            playerRef.current.seekTo(0);
            playerRef.current.loop = true;
            playerRef.current.play();
          } catch {
            /* the native loop flag is the primary restart */
          }
          setProgress(0);
          setDeck(next);
          return;
        }
        if (command === 'play') {
          if (!uriRef.current) return;
          playerRef.current.loop = deckRef.current.loop;
          playerRef.current.play();
          setDeck(next);
          return;
        }
        if (command === 'pause') {
          playerRef.current.pause();
          setDeck(next);
          return;
        }
        if (command === 'toggle-loop') {
          playerRef.current.loop = next.loop;
          setDeck(next);
          return;
        }
        if (command === 'suspend') {
          if (deckRef.current.phase === 'recording' && canQueryNativeRecorder('active')) {
            try {
              await recorderRef.current.stop();
              uriRef.current = recorderRef.current.uri;
            } catch {
              uriRef.current = null;
            }
          } else if (canQueryNativeRecorder('active')) {
            try {
              playerRef.current.pause();
            } catch {
              /* already quiet */
            }
          }
          const gen = generation.current + 1;
          generation.current = gen;
          await enableCapture(false, gen);
          claimAudio(null);
          const hasTake = Boolean(uriRef.current);
          setDeck(hasTake ? { phase: 'ready', loop: deckRef.current.loop, hasTake: true } : createPhraseDeck());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The phrase deck could not use the microphone.');
        const gen = generation.current + 1;
        generation.current = gen;
        await enableCapture(false, gen).catch(() => undefined);
        claimAudio(null);
        setDeck(createPhraseDeck());
      }
    },
    [enableCapture]
  );

  const press = useCallback(
    (gesture: 'tap' | 'long' | 'loop' | 'clear') => {
      const result = phrasePress(deckRef.current, gesture);
      void apply(result.command, result.deck);
    },
    [apply]
  );

  const suspend = useCallback(() => {
    const next = phraseSuspend(deckRef.current);
    return apply('suspend', next);
  }, [apply]);

  const scrub = useCallback((ratio: number, release = false) => {
    const pose = phraseScrub(deckRef.current, ratio);
    if (!pose.resume && deckRef.current.phase !== 'paused' && deckRef.current.phase !== 'ready' && deckRef.current.phase !== 'playing') {
      return;
    }
    if (!deckRef.current.hasTake) return;
    const span = durationRef.current;
    if (!(span > 0)) return;
    if (!scrubbing.current) {
      resumeAfter.current = deckRef.current.phase === 'playing';
      scrubbing.current = true;
      try {
        playerRef.current.pause();
      } catch {
        /* already quiet */
      }
    }
    try {
      playerRef.current.seekTo(pose.ratio * span);
    } catch {
      /* seek lands on the next status */
    }
    setProgress(pose.ratio);
    setElapsed(pose.ratio * span);
    if (!release) return;
    scrubbing.current = false;
    if (!resumeAfter.current) return;
    try {
      playerRef.current.loop = deckRef.current.loop;
      playerRef.current.play();
    } catch {
      /* play resumes from the released position */
    }
  }, []);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (scrubbing.current) return;
      if (deckRef.current.phase !== 'playing' && deckRef.current.phase !== 'paused') return;
      const span = status.duration;
      if (span > 0.05) {
        durationRef.current = span;
        setDuration(span);
        setProgress(Math.min(1, status.currentTime / span));
        setElapsed(status.currentTime);
      }
      if (deckRef.current.phase !== 'playing') return;
      const ended = !status.playing && !status.loop && span > 0.2 && status.currentTime >= span - 0.08;
      if (!ended) return;
      const result = phraseFinish(deckRef.current);
      if (!result.command) return;
      void apply(result.command, result.deck);
    });
    return () => sub.remove();
  }, [apply, player]);

  useEffect(() => {
    if (deck.phase !== 'recording') return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, (Date.now() - startedAt.current) / 1000);
      setElapsed(seconds);
      setProgress(Math.min(1, seconds / 30));
    }, 80);
    return () => clearInterval(timer);
  }, [deck.phase]);

  useEffect(
    () => () => {
      phaseRef.current = 'released';
      generation.current += 1;
      claimAudio(null);
      void enqueueAudio(async () => {
        if (captureReleaseIsBlocked(audioMode())) return;
        await PocktTiming?.setInputCapture?.(false);
        await PocktTiming?.restorePlaybackGraph?.();
      });
    },
    []
  );

  /** Wall-clock ms when the current take began recording (0 before any take). */
  const recordStartedAt = useCallback(() => startedAt.current, []);
  /** Host seconds (the beat clock's own timebase) when the current take began recording. */
  const recordStartedHost = useCallback(() => startedHost.current, []);
  /** Keep the session in record mode between takes while the click runs; release it when it stops. */
  const holdCapture = useCallback((on: boolean) => {
    keepCapture.current = on;
    if (!on && deckRef.current.phase !== 'recording') {
      const gen = generation.current + 1;
      generation.current = gen;
      void enableCapture(false, gen);
    }
  }, [enableCapture]);
  /**
   * Bar-locked looping: start the take from `sec` into the file, once (no native loop). The caller
   * restarts it on every loop cycle's downbeat, so the take is re-phased to the click each time.
   */
  const playFrom = useCallback((sec: number) => {
    if (!uriRef.current) return;
    try {
      playerRef.current.loop = false;
      playerRef.current.seekTo(Math.max(0, sec));
      playerRef.current.play();
    } catch {
      /* the next downbeat retries */
    }
    setDeck((d) => (d.hasTake ? { ...d, phase: 'playing' } : d));
  }, []);
  const pauseTake = useCallback(() => {
    try {
      playerRef.current.pause();
    } catch {
      /* already quiet */
    }
    setDeck((d) => (d.hasTake ? { ...d, phase: 'paused' } : d));
  }, []);

  return { deck, error, progress, elapsed, duration, press, suspend, scrub, recordStartedAt, recordStartedHost, holdCapture, playFrom, pauseTake };
}

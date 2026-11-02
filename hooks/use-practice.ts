import { useCallback, useEffect, useRef, useState } from 'react';

import { TIME_SIGNATURES } from '@/constants/meter';
import type { TransportState } from '@/hooks/use-metronome';
import {
  DEFAULT_PRACTICE,
  nextPracticeBpm,
  practiceEnginePatch,
  practiceProgress,
  practiceReachedTarget,
  randomGapBars,
  sanitizePractice,
  sessionDurationSec,
  type PracticeConfig,
} from '@/lib/practice';
import type { CountInBars, LockInPattern, MetronomeConfig, SparseMode, SubdivisionId, TimeSignatureId } from '@/lib/types';
import { loadPracticeConfig, savePracticeConfig } from '@/storage/practice';

type Args = {
  bpm: number;
  playing: boolean;
  transport: TransportState;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  setBpm: (bpm: number) => void;
  ensurePlaying: () => void;
  liveMasks: {
    countInBars: CountInBars;
    lockIn: LockInPattern;
    gapOnBars: number;
    gapOffBars: number;
    clickShift: number;
    sparseMode: SparseMode;
  };
  onEnginePatch?: (patch: Partial<MetronomeConfig>) => void;
  onSessionEnd?: () => void;
};

export function usePractice({
  bpm,
  playing,
  transport,
  timeSignature,
  subdivision,
  setBpm,
  ensurePlaying,
  liveMasks,
  onEnginePatch,
  onSessionEnd,
}: Args) {
  const [draft, setDraft] = useState<PracticeConfig>(DEFAULT_PRACTICE);
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [barsLeft, setBarsLeft] = useState(DEFAULT_PRACTICE.interval);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_PRACTICE.interval);
  const [sessionBarsLeft, setSessionBarsLeft] = useState(DEFAULT_PRACTICE.sessionBars);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(0);

  const draftRef = useRef(draft);
  const bpmRef = useRef(bpm);
  const activeRef = useRef(false);
  const lastMeasure = useRef<number | null>(null);
  const lastBeat = useRef<number | null>(null);
  const sessionBars = useRef(0);
  const musicalSeconds = useRef(0);
  const lastRampAt = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef(onSessionEnd);
  const masksRef = useRef<Args['liveMasks'] | null>(null);
  const liveMasksRef = useRef(liveMasks);
  const patchRef = useRef(onEnginePatch);
  endRef.current = onSessionEnd;
  liveMasksRef.current = liveMasks;
  patchRef.current = onEnginePatch;

  draftRef.current = draft;
  bpmRef.current = bpm;
  activeRef.current = active;

  useEffect(() => {
    let alive = true;
    void loadPracticeConfig().then((saved) => {
      if (!alive) return;
      setDraft(saved);
      setBarsLeft(saved.interval);
      setSecondsLeft(saved.interval);
      setSessionBarsLeft(saved.sessionBars);
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
      void savePracticeConfig(draft);
    }, 220);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, hydrated]);

  const clearClock = useCallback(() => {
    /* musical scheduling uses native beat/bar events only */
  }, []);

  const stopPractice = useCallback(
    (stopPlayback = false) => {
      activeRef.current = false;
      setActive(false);
      lastMeasure.current = null;
      lastBeat.current = null;
      musicalSeconds.current = 0;
      lastRampAt.current = 0;
      sessionBars.current = 0;
      if (masksRef.current) {
        patchRef.current?.(masksRef.current);
        masksRef.current = null;
      }
      if (stopPlayback) endRef.current?.();
    },
    [clearClock]
  );

  const applyStep = useCallback(() => {
    const live = draftRef.current;
    if (!live.rampEnabled) return;
    const current = bpmRef.current;
    if (practiceReachedTarget(current, live)) {
      setBpm(live.targetBpm);
      if (live.rampEnd === 'loop') {
        setBpm(live.startBpm);
        setBarsLeft(live.interval);
        setSecondsLeft(live.interval);
        if (live.mode === 'seconds') lastRampAt.current = musicalSeconds.current;
        return;
      }
      if (live.rampEnd === 'stop' || live.sessionLimit === 'single') stopPractice(true);
      return;
    }
    const next = nextPracticeBpm(current, live);
    setBpm(next);
    if (practiceReachedTarget(next, live)) {
      if (live.rampEnd === 'loop') {
        setBpm(live.startBpm);
        setBarsLeft(live.interval);
        setSecondsLeft(live.interval);
        if (live.mode === 'seconds') lastRampAt.current = musicalSeconds.current;
        return;
      }
      if (live.rampEnd === 'stop' || live.sessionLimit === 'single') stopPractice(true);
      return;
    }
    setBarsLeft(live.interval);
    setSecondsLeft(live.interval);
    if (live.mode === 'seconds') lastRampAt.current = musicalSeconds.current;
  }, [setBpm, stopPractice]);

  const startPractice = useCallback(() => {
    let live = sanitizePractice(draftRef.current);
    if (live.spaceEnabled && live.spaceRandom) {
      const next = randomGapBars(live);
      live = sanitizePractice({
        ...live,
        spaceOnBars: next.on,
        spaceOffBars: next.off,
        spacePattern: 'custom',
      });
    }
    setDraft(live);
    if (!activeRef.current) {
      masksRef.current = liveMasksRef.current;
    }
    patchRef.current?.(practiceEnginePatch(live, subdivision));
    if (live.rampEnabled) setBpm(live.startBpm);
    lastMeasure.current = null;
    lastBeat.current = null;
    musicalSeconds.current = 0;
    lastRampAt.current = 0;
    sessionBars.current = 0;
    setBarsLeft(live.interval);
    setSecondsLeft(live.interval);
    setSessionBarsLeft(live.sessionBars);
    const duration = sessionDurationSec(live);
    setSessionSecondsLeft(live.sessionLimit === 'time' ? duration : 0);
    activeRef.current = true;
    setActive(true);
    ensurePlaying();
  }, [ensurePlaying, setBpm, subdivision]);

  useEffect(() => {
    if (!active || !playing || !transport.playing) return;
    const measure = transport.measureIndex;
    const beat = transport.beatIndex;
    if (lastBeat.current === beat && lastMeasure.current === measure) return;
    const beatAdvanced = lastBeat.current != null;
    lastBeat.current = beat;
    if (beatAdvanced) {
      musicalSeconds.current += 60 / Math.max(1, bpmRef.current);
      const live = draftRef.current;
      if (live.rampEnabled && live.mode === 'seconds') {
        const elapsed = musicalSeconds.current - lastRampAt.current;
        const remain = Math.max(0, Math.ceil(live.interval - elapsed));
        setSecondsLeft(remain);
        if (elapsed >= live.interval) {
          lastRampAt.current = musicalSeconds.current;
          applyStep();
        }
      }
      if (live.sessionLimit === 'time') {
        const duration = sessionDurationSec(live);
        const remain = Math.max(0, Math.ceil(duration - musicalSeconds.current));
        setSessionSecondsLeft(remain);
        if (musicalSeconds.current >= duration) {
          stopPractice(true);
          return;
        }
      }
    }
    if (lastMeasure.current == null) {
      lastMeasure.current = measure;
      return;
    }
    if (measure === lastMeasure.current) return;
    lastMeasure.current = measure;
    sessionBars.current += 1;
    const live = draftRef.current;
    if (live.spaceEnabled && live.spaceRandom) {
      const cycle = Math.max(1, live.spaceOnBars + live.spaceOffBars);
      if (sessionBars.current % cycle === 0) {
        const next = randomGapBars(live);
        const patched = sanitizePractice({
          ...live,
          spaceOnBars: next.on,
          spaceOffBars: next.off,
          spacePattern: 'custom',
        });
        setDraft(patched);
        patchRef.current?.(practiceEnginePatch(patched, subdivision));
      }
    }
    if (live.sessionLimit === 'bars') {
      const remain = live.sessionBars - sessionBars.current;
      setSessionBarsLeft(Math.max(0, remain));
      if (remain <= 0) {
        stopPractice(true);
        return;
      }
    }
    if (live.sessionLimit === 'single' && !live.rampEnabled && sessionBars.current >= 1) {
      stopPractice(true);
      return;
    }
    if (!live.rampEnabled || live.mode !== 'bars') return;
    setBarsLeft((prev) => {
      const next = prev - 1;
      if (next > 0) return next;
      applyStep();
      return draftRef.current.interval;
    });
  }, [active, applyStep, playing, stopPractice, subdivision, transport.beatIndex, transport.measureIndex, transport.playing]);

  const updateDraft = useCallback((patch: Partial<PracticeConfig>) => {
    setDraft((prev) => sanitizePractice({ ...prev, ...patch }));
  }, []);

  const beats = TIME_SIGNATURES[timeSignature]?.beatsPerMeasure ?? 4;

  return {
    draft,
    updateDraft,
    active,
    startPractice,
    stopPractice: () => stopPractice(false),
    barsLeft,
    secondsLeft,
    sessionBarsLeft,
    sessionSecondsLeft,
    progress: practiceProgress(bpm, draft),
    beatsPerBar: beats,
  };
}

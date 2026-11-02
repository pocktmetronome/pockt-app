import { useCallback, useEffect, useRef, useState } from 'react';

import {
  sameSnapshot,
  snapshotTape,
  type ProgramTape,
  type TapeEvent,
  type TapeSnapshot,
} from '@/lib/program-tape';
import type { MetronomeConfig } from '@/lib/types';

export type TapeStatus = 'idle' | 'recording' | 'playing';

type Handlers = {
  apply: (patch: Partial<MetronomeConfig>) => void;
  ensurePlaying: () => void;
  halt: () => void;
};

/**
 * Retired program-tape path. Isolated so it cannot be wired as a musical clock.
 * Do not call startRecord / playTape from product UI.
 */
const TAPE_RETIRED =
  'useProgramTape is retired. Musical timing is owned by the native PocktTimingEngine.';

export function useProgramTape() {
  const [status, setStatus] = useState<TapeStatus>('idle');
  const [hasTape, setHasTape] = useState(false);
  const statusRef = useRef<TapeStatus>('idle');
  const tapeRef = useRef<ProgramTape | null>(null);
  const originRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cursorRef = useRef(0);
  const lastRef = useRef<TapeSnapshot | null>(null);

  const setLive = (next: TapeStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const cancelRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopPlayback = useCallback(() => {
    cancelRaf();
    if (statusRef.current === 'playing') setLive('idle');
  }, []);

  const startRecord = useCallback((_snapshot: TapeSnapshot) => {
    throw new Error(TAPE_RETIRED);
  }, []);

  const captureFrom = useCallback((snapshot: TapeSnapshot) => {
    if (statusRef.current !== 'recording' || !tapeRef.current || !lastRef.current) return;
    if (sameSnapshot(lastRef.current, snapshot)) return;
    const t = globalThis.performance.now() - originRef.current;
    const events: TapeEvent[] = [];
    const prev = lastRef.current;
    if (prev.bpm !== snapshot.bpm) events.push({ t, kind: 'bpm', bpm: snapshot.bpm });
    if (prev.timeSignature !== snapshot.timeSignature) {
      events.push({ t, kind: 'timeSignature', timeSignature: snapshot.timeSignature });
    }
    if (prev.subdivision !== snapshot.subdivision) {
      events.push({ t, kind: 'subdivision', subdivision: snapshot.subdivision });
    }
    if (
      prev.accentPattern.length !== snapshot.accentPattern.length ||
      prev.accentPattern.some((level, index) => level !== snapshot.accentPattern[index])
    ) {
      events.push({ t, kind: 'accents', accentPattern: snapshot.accentPattern });
    }
    if (prev.playing !== snapshot.playing) {
      events.push({ t, kind: snapshot.playing ? 'play' : 'stop' });
    }
    if (!events.length) return;
    tapeRef.current.events.push(...events);
    tapeRef.current.durationMs = t;
    lastRef.current = snapshot;
  }, []);

  const stopRecord = useCallback(() => {
    if (statusRef.current !== 'recording' || !tapeRef.current) return;
    tapeRef.current.durationMs = Math.max(
      tapeRef.current.durationMs,
      globalThis.performance.now() - originRef.current
    );
    setHasTape(true);
    setLive('idle');
  }, []);

  const playTape = useCallback((_handlers: Handlers) => {
    throw new Error(TAPE_RETIRED);
  }, []);

  useEffect(() => () => cancelRaf(), []);

  return {
    status,
    hasTape,
    startRecord,
    stopRecord,
    captureFrom,
    playTape,
    stopPlayback,
    snapshotTape,
  };
}

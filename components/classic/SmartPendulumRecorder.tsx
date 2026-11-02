import { useEffect, useRef } from 'react';

import { useSessionRecorder } from '@/hooks/use-session-recorder';

type RecorderApi = ReturnType<typeof useSessionRecorder>;

type Props = {
  autoStart: boolean;
  onApi: (api: RecorderApi) => void;
};

/** Exists only after the user arms Record. Idle Smart Pendulum never creates a native recorder. */
export function SmartPendulumRecorderEngine({ autoStart, onApi }: Props) {
  const rec = useSessionRecorder();
  const started = useRef(false);
  const recRef = useRef(rec);
  const onApiRef = useRef(onApi);
  recRef.current = rec;
  onApiRef.current = onApi;

  useEffect(() => {
    onApiRef.current(recRef.current);
  }, [
    rec.discard,
    rec.durationLabel,
    rec.error,
    rec.guideOn,
    rec.hasTake,
    rec.levels,
    rec.playTake,
    rec.playing,
    rec.recording,
    rec.setGuideOn,
    rec.startRecord,
    rec.stopPlayback,
    rec.stopRecord,
  ]);

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    void recRef.current.startRecord();
  }, [autoStart]);

  return null;
}

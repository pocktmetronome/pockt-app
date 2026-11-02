import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { stressJsThread } from '@/lib/js-thread-stress';
import type { TimingDiagnostics } from '@/modules/pockt-timing';

type Props = {
  nativeAvailable: boolean;
  engineReady: boolean;
  engineError: string | null;
  playing: boolean;
  color: string;
  dim: string;
  line: string;
  raised: string;
  onMathSelfTest: () => Promise<TimingDiagnostics | null>;
  onLiveDiagnostics: () => TimingDiagnostics | null;
  onAudioProbe?: () => Record<string, unknown> | null;
  onAudioSanityTest?: () => Promise<Record<string, unknown> | null>;
  onTestKnownGoodHomeSound?: () => Promise<Record<string, unknown> | null>;
};

function formatDiag(data: TimingDiagnostics | null, fallback: string): string {
  if (!data) return fallback;
  const lines: string[] = [];
  if (data.passed != null) lines.push(`MATH ${data.passed ? 'PASS' : 'FAIL'}`);
  if (data.bpm != null) lines.push(`BPM ${data.bpm}`);
  if (data.subdivision) lines.push(`SUB ${data.subdivision}`);
  if (data.sampleRate != null) lines.push(`SR ${data.sampleRate}`);
  if (data.scheduledEventCount != null) lines.push(`EVENTS ${data.scheduledEventCount}`);
  if (data.accumulatedTimelineErrorSeconds != null) {
    lines.push(`DRIFT ${data.accumulatedTimelineErrorSeconds.toExponential(3)} s`);
  }
  if (data.maxSchedulingDeviationSeconds != null) {
    lines.push(`MAX DEV ${data.maxSchedulingDeviationSeconds.toExponential(3)} s`);
  }
  if (data.duplicateEventCount != null) lines.push(`DUP ${data.duplicateEventCount}`);
  if (data.missedEventCount != null) lines.push(`MISS ${data.missedEventCount}`);
  if (data.measurementKind) lines.push(data.measurementKind);
  if (data.note) lines.push(data.note);
  if (data.failures?.length) lines.push(data.failures.slice(0, 4).join('\n'));
  if (data.reports?.length) {
    const failed = data.reports.filter((item) => item.passed === false);
    const passed = data.reports.length - failed.length;
    lines.push(`CASES ${passed}/${data.reports.length} passed`);
  }
  return lines.join('\n');
}

export function TimingLab({
  nativeAvailable,
  engineReady,
  engineError,
  playing,
  color,
  dim,
  line,
  raised,
  onMathSelfTest,
  onLiveDiagnostics,
  onAudioProbe,
  onAudioSanityTest,
  onTestKnownGoodHomeSound,
}: Props) {
  const [log, setLog] = useState('DEV timing lab. Audio clock is native; these controls do not schedule beats.');
  const [busy, setBusy] = useState(false);

  return (
    <View style={[styles.wrap, { borderColor: line, backgroundColor: 'rgba(237,230,216,0.035)' }]}>
      <Text style={[styles.title, { color: dim }]}>DEV TIMING LAB</Text>
      <Text style={[styles.meta, { color: dim }]}>
        {nativeAvailable ? 'NATIVE iOS ENGINE' : 'ENGINE UNAVAILABLE'}
        {engineReady ? '  ·  PREPARED' : ''}
        {playing ? '  ·  RUNNING' : ''}
      </Text>
      {engineError ? <Text style={[styles.error, { color }]}>{engineError}</Text> : null}

      <View style={styles.row}>
        <Pressable
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void onMathSelfTest()
              .then((result) => setLog(formatDiag(result, 'Native math self-test unavailable.')))
              .finally(() => setBusy(false));
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>MATH TEST</Text>
        </Pressable>
        <Pressable
          onPress={() => setLog(formatDiag(onLiveDiagnostics(), 'Start playback, then read live diagnostics.'))}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>LIVE DIAG</Text>
        </Pressable>
        <Pressable
          disabled={!playing}
          onPress={() => {
            const result = stressJsThread(2500);
            const diag = onLiveDiagnostics();
            setLog(
              `JS THREAD BLOCKED ${Math.round(result.durationMs)} ms\n${result.iterations} iterations\nIf audible spacing changed, V8.6 fails.\n\n${formatDiag(diag, '')}`
            );
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised, opacity: playing ? 1 : 0.4 }]}>
          <Text style={[styles.btnText, { color }]}>JS STRESS</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            const probe = onAudioProbe?.();
            setLog(
              probe
                ? `AUDIO PROBE\nengine ${String(probe.engineRunning)}\nplayer ${String(probe.playerPlaying)}\nsession ${String(probe.sessionActive)}\nbundle ${String(probe.clickBundle)}\nsounds ${Array.isArray(probe.loadedSounds) ? probe.loadedSounds.join(',') : ''}\nscheduled ${String(probe.scheduledAudioCount)}\n${JSON.stringify(probe.buffers ?? [], null, 0).slice(0, 700)}`
                : 'Audio probe unavailable.'
            );
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>AUDIO PROBE</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => {
            if (!onAudioSanityTest) return;
            setBusy(true);
            void onAudioSanityTest()
              .then((result) =>
                setLog(
                  result
                    ? `SANITY CLICK (same AVAudioEngine path, not the musical clock)\nresourceFound ${String(result.resourceFound)}\nfileOpened ${String(result.fileOpened)}\nframeLength ${String(result.frameLength ?? result.sanityFrames)}\nsampleRate ${String(result.sampleRate)}\nsessionActive ${String(result.audioSessionActive ?? result.sessionActive)}\nengineRunning ${String(result.engineRunning)}\nplayerRunning ${String(result.playerRunning ?? result.playerPlaying)}\nbufferScheduled ${String(result.bufferScheduled ?? result.sanityScheduled)}\nsound ${String(result.sanitySound)}\nbundle ${String(result.clickBundle)}`
                    : 'Sanity test unavailable.'
                )
              )
              .finally(() => setBusy(false));
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>SANITY CLICK</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => {
            if (!onTestKnownGoodHomeSound) return;
            setBusy(true);
            void onTestKnownGoodHomeSound()
              .then((result) =>
                setLog(
                  result
                    ? `HOME SOUND PATH (exact ident playback, not AVAudioEngine)\nplayed ${String(result.played)}\nengine ${String(result.engine)}\nsource ${String(result.source)}\n${String(result.path ?? result.error ?? '')}`
                    : 'Home sound path unavailable.'
                )
              )
              .finally(() => setBusy(false));
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>HOME SOUND</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const diag = onLiveDiagnostics();
            const probe = onAudioProbe?.() ?? {};
            void Share.share({
              title: 'POCKT Precision Lab',
              message: JSON.stringify(
                {
                  kind: 'pockt.precision-lab.v1',
                  note: 'Internal scheduler diagnostics. Not a speaker-output accuracy claim.',
                  exportedAt: Date.now(),
                  diagnostics: diag,
                  audioProbe: probe,
                },
                null,
                2
              ),
            });
            setLog('Exported internal scheduler report. This is not physical speaker-output proof.');
          }}
          style={[styles.btn, { borderColor: line, backgroundColor: raised }]}>
          <Text style={[styles.btnText, { color }]}>EXPORT JSON</Text>
        </Pressable>
      </View>
      <Text style={[styles.log, { color: dim }]}>{log}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '800',
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  btnText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  log: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
});

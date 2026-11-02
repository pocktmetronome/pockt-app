import { CustomEditor } from '@/components/classic/CustomEditor';
import { CustomSurface } from '@/components/classic/CustomSurface';
import { SmartPendulumRecorderEngine } from '@/components/classic/SmartPendulumRecorder';
import { CustomWidgetFace, formatTimerMs, useLiveClock } from '@/components/classic/CustomWidgets';
import type { ClassicInstrumentProps } from '@/components/classic/classic-types';
import { TIME_SIGNATURES } from '@/constants/meter';
import { sanitizeBpm } from '@/constants/timing';
import type { useSessionRecorder } from '@/hooks/use-session-recorder';
import {
  cloneLayout,
  isLightCustomSurface,
  migrateCustomLayout,
  photoUriFromLayout,
  sanitizePhotoFit,
  widgetSize,
  type CustomLayout,
} from '@/lib/custom-layout';
import { pickCustomPhoto } from '@/lib/custom-photo';
import { hapticSelection, hapticSoft, hapticTap } from '@/lib/haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SparkField, useSparkField } from '@/components/classic/TapSparkLayer';
import type { TimeSignatureId } from '@/lib/types';

export function CustomizedRoom({
  config,
  playing,
  transport,
  pulse,
  pulseRole,
  toggle,
  stop,
  tapTempo,
  onOpenPad,
  onOpenTime,
  onOpenTuner,
  onOpenSound,
  onUpdate,
  onCustomPhotoChange: _onCustomPhotoChange,
  onChangeAccents,
  onCustomEditingChange,
}: ClassicInstrumentProps) {
  const insets = useSafeAreaInsets();
  const sparks = useSparkField();
  const clockLabel = useLiveClock();
  const [timerMs, setTimerMs] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const timerOrigin = useRef(0);
  const elapsedRef = useRef(0);
  const saved = useMemo(
    () => migrateCustomLayout(config.customLayout, config.customPhotoUri),
    [config.customLayout, config.customPhotoUri]
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CustomLayout>(saved);
  const [optimistic, setOptimistic] = useState<CustomLayout | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const layout = editing ? draft : (optimistic ?? saved);
  const light = isLightCustomSurface(layout.background);
  const safeBpm = sanitizeBpm(config.bpm);
  const firstVisit = !saved.onboarded && saved.background.type !== 'photo';
  const [promptingPhoto, setPromptingPhoto] = useState(firstVisit);
  const taughtSelect = useRef(false);
  const photoScale = useSharedValue(saved.photoFit?.scale ?? 1);
  const photoX = useSharedValue(saved.photoFit?.x ?? 0);
  const photoY = useSharedValue(saved.photoFit?.y ?? 0);
  const [recorderArmed, setRecorderArmed] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const recorderRef = useRef<ReturnType<typeof useSessionRecorder> | null>(null);
  const [recMeta, setRecMeta] = useState({ recording: false, playing: false, hasTake: false, durationLabel: '0:00' });
  const beatCount = TIME_SIGNATURES[config.timeSignature as TimeSignatureId]?.beatsPerMeasure ?? 4;

  const bindRecorder = useCallback((api: ReturnType<typeof useSessionRecorder>) => {
    recorderRef.current = api;
    setRecMeta({
      recording: api.recording,
      playing: api.playing,
      hasTake: api.hasTake,
      durationLabel: api.durationLabel,
    });
  }, []);

  useEffect(() => {
    if (editing) return;
    if (!optimistic) return;
    const same = optimistic.widgets.length === saved.widgets.length
      && optimistic.widgets.every((widget, index) => {
        const next = saved.widgets[index];
        return next && next.id === widget.id && next.x === widget.x && next.y === widget.y;
      })
      && (optimistic.photoFit?.scale ?? 1) === (saved.photoFit?.scale ?? 1)
      && (optimistic.photoFit?.x ?? 0) === (saved.photoFit?.x ?? 0)
      && (optimistic.photoFit?.y ?? 0) === (saved.photoFit?.y ?? 0);
    if (same) setOptimistic(null);
  }, [editing, optimistic, saved]);

  useEffect(() => {
    onCustomEditingChange?.(editing);
    return () => onCustomEditingChange?.(false);
  }, [editing, onCustomEditingChange]);

  useEffect(() => {
    if (!firstVisit) setPromptingPhoto(false);
  }, [firstVisit]);

  useEffect(() => {
    if (editing) return;
    const fit = layout.photoFit;
    photoScale.value = fit?.scale ?? 1;
    photoX.value = fit?.x ?? 0;
    photoY.value = fit?.y ?? 0;
  }, [editing, layout.photoFit, photoScale, photoX, photoY]);

  useEffect(() => {
    if (playing) {
      timerOrigin.current = Date.now() - elapsedRef.current;
      setTimerOn(true);
      return;
    }
    setTimerOn(false);
  }, [playing]);

  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => {
      const next = Date.now() - timerOrigin.current;
      elapsedRef.current = next;
      setTimerMs(next);
    }, 250);
    return () => clearInterval(id);
  }, [timerOn]);

  const commit = (next: CustomLayout) => {
    const persisted = cloneLayout({ ...next, onboarded: true });
    onUpdate({
      customLayout: persisted,
      customPhotoUri: photoUriFromLayout(persisted) ?? config.customPhotoUri,
    });
  };

  return (
    <View style={styles.root}>
      <CustomSurface
        background={layout.background}
        pulse={pulse}
        pulseRole={pulseRole}
        playing={playing}
        visualPulse={config.visualPulse}
        photoFit={layout.photoFit}
        livePhotoFit={{ scale: photoScale, x: photoX, y: photoY }}
      />
      {recorderArmed ? <SmartPendulumRecorderEngine autoStart={false} onApi={bindRecorder} /> : null}
      <SparkField field={sparks} />

      {editing ? (
        <CustomEditor
          draft={draft}
          onChange={setDraft}
          initialSelected={taughtSelect.current ? null : draft.widgets.some((widget) => widget.id === 'bpm') ? 'bpm' : null}
          onCancel={() => {
            taughtSelect.current = true;
            setDraft(cloneLayout(saved));
            setOptimistic(null);
            setEditing(false);
          }}
          onDone={() => {
            taughtSelect.current = true;
            const photoFit = sanitizePhotoFit({
              scale: photoScale.value,
              x: photoX.value,
              y: photoY.value,
            });
            const committed = cloneLayout({ ...draft, onboarded: true, photoFit });
            setOptimistic(committed);
            commit(committed);
            setDraft(committed);
            setEditing(false);
          }}
          bpm={safeBpm}
          playing={playing}
          timeSignature={config.timeSignature}
          pulse={pulse}
          pulseRole={pulseRole}
          clockLabel={clockLabel}
          livePhotoFit={{ scale: photoScale, x: photoX, y: photoY }}
        />
      ) : (
        <View style={styles.live} pointerEvents="box-none">
          {layout.widgets.map((widget) => {
            const size = widgetSize(widget);
            return (
              <View
                key={widget.uid}
                pointerEvents="box-none"
                style={[
                  styles.slot,
                  {
                    left: `${widget.x * 100}%`,
                    top: `${widget.y * 100}%`,
                    width: size.width,
                    height: size.height,
                    marginLeft: -size.width / 2,
                    marginTop: -size.height / 2,
                  },
                ]}>
                <CustomWidgetFace
                  id={widget.id}
                  bpm={safeBpm}
                  playing={playing}
                  timeSignature={config.timeSignature}
                  pulse={pulse}
                  pulseRole={pulseRole}
                  light={light}
                  scale={widget.scale}
                  textStyle={widget.textStyle}
                  beatStyle={widget.beatStyle}
                  playStyle={widget.playStyle}
                  meterStyle={widget.meterStyle}
                  tunerStyle={widget.tunerStyle}
                  clockLabel={clockLabel}
                  timerLabel={formatTimerMs(timerMs)}
                  timerRunning={timerOn}
                  beatIndex={transport.beatIndex}
                  beatCount={beatCount}
                  accentPattern={config.accentPattern}
                  onChangeAccents={onChangeAccents}
                  recorderLabel={recMeta.recording ? 'RECORDING' : recMeta.playing ? 'PLAYBACK' : 'READY'}
                  recorderHot={recMeta.recording}
                  onBpm={onOpenPad}
                  onPlay={toggle}
                  onMeter={onOpenTime}
                  onTuner={onOpenTuner}
                  onSound={onOpenSound}
                  onRecorder={() => {
                    void hapticSelection();
                    setRecorderArmed(true);
                    setRecorderOpen(true);
                  }}
                  onTimer={() => {
                    elapsedRef.current = 0;
                    setTimerMs(0);
                    timerOrigin.current = Date.now();
                  }}
                  onTap={(pageX, pageY) => {
                    void hapticTap();
                    tapTempo();
                    sparks.burst(pageX, pageY);
                  }}
                />
              </View>
            );
          })}

          {promptingPhoto ? (
            <View style={styles.onboard} pointerEvents="box-none">
              <Pressable
                onPress={() => {
                  void hapticSoft();
                  void pickCustomPhoto().then((result) => {
                    if (result.status === 'picked') {
                      const next = {
                        ...saved,
                        onboarded: true,
                        background: { type: 'photo' as const, uri: result.uri },
                        photoFit: { scale: 1, x: 0, y: 0 },
                      };
                      commit(next);
                    } else {
                      commit({ ...saved, onboarded: true });
                    }
                    setPromptingPhoto(false);
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel="Choose photo"
                style={styles.choosePhoto}>
                <Text style={styles.choosePhotoText}>CHOOSE PHOTO</Text>
              </Pressable>
            </View>
          ) : null}

          {recorderOpen ? (
            <View style={[styles.recSheet, { bottom: Math.max(insets.bottom, 10) + 58 }]} pointerEvents="auto">
              <Text style={styles.recTitle}>
                {recMeta.recording ? `RECORDING ${recMeta.durationLabel}` : recMeta.playing ? `PLAYBACK ${recMeta.durationLabel}` : recMeta.hasTake ? `READY ${recMeta.durationLabel}` : 'READY'}
              </Text>
              <View style={styles.recRow}>
                <Pressable
                  onPress={() => {
                    const rec = recorderRef.current;
                    if (!rec) return;
                    if (rec.recording) {
                      void rec.stopRecord();
                      return;
                    }
                    rec.stopPlayback();
                    void rec.startRecord();
                  }}
                  style={styles.recHit}>
                  <Text style={styles.recHitText}>{recMeta.recording ? 'STOP' : 'RECORD'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const rec = recorderRef.current;
                    if (!rec?.hasTake) return;
                    if (rec.playing) rec.stopPlayback();
                    else rec.playTake();
                  }}
                  style={styles.recHit}>
                  <Text style={styles.recHitText}>{recMeta.playing ? 'PAUSE' : 'PLAY'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void recorderRef.current?.discard();
                  }}
                  style={styles.recHit}>
                  <Text style={styles.recHitText}>DELETE</Text>
                </Pressable>
                <Pressable onPress={() => setRecorderOpen(false)} style={styles.recHit}>
                  <Text style={styles.recHitText}>CLOSE</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={() => {
              void hapticSoft();
              stop();
              const source = cloneLayout({ ...(optimistic ?? saved), onboarded: true });
              if (firstVisit) commit(source);
              setDraft(source);
              setEditing(true);
              setPromptingPhoto(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Customize"
            style={({ pressed }) => [
              styles.customize,
              { bottom: Math.max(insets.bottom, 10) + 4 },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="options-outline" size={18} color="#F6F0E4" />
            <Text style={styles.customizeText}>CUSTOMIZE</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  live: {
    ...StyleSheet.absoluteFillObject,
  },
  slot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customize: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -86,
    minHeight: 48,
    minWidth: 172,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,240,228,0.22)',
    backgroundColor: 'rgba(8,8,10,0.48)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 8,
  },
  customizeText: {
    color: '#F6F0E4',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
  },
  onboard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    zIndex: 6,
  },
  choosePhoto: {
    minHeight: 48,
    minWidth: 188,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,200,120,0.4)',
    backgroundColor: 'rgba(8,8,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choosePhotoText: {
    color: '#E8C878',
    fontSize: 13,
    letterSpacing: 2.2,
    fontWeight: '800',
  },
  recSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(8,7,6,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,240,228,0.16)',
    padding: 12,
    gap: 10,
  },
  recTitle: {
    color: '#F6F0E4',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '800',
    textAlign: 'center',
  },
  recRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  recHit: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,240,228,0.08)',
  },
  recHitText: {
    color: '#E8C878',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
});

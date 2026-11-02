import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LivePhotoFit } from '@/components/classic/CustomSurface';
import { CustomWidgetFace } from '@/components/classic/CustomWidgets';
import {
  addWidget,
  CUSTOM_BEAT_STYLES,
  CUSTOM_COLORS,
  CUSTOM_METER_STYLES,
  CUSTOM_PLAY_STYLES,
  CUSTOM_POCKT_BACKGROUNDS,
  CUSTOM_TEXT_STYLES,
  CUSTOM_TUNER_STYLES,
  CUSTOM_WIDGET_META,
  CUSTOM_WIDGET_ORDER,
  clampScale,
  clampWidget,
  isLightCustomSurface,
  moveWidget,
  nudgeWidget,
  PHOTO_SCALE_MAX,
  PHOTO_SCALE_MIN,
  removeWidget,
  sanitizePhotoFit,
  scaleWidget,
  styleWidget,
  type CustomLayout,
  type CustomPhotoFit,
  type CustomWidget,
  type CustomWidgetId,
} from '@/lib/custom-layout';
import { pickCustomPhoto } from '@/lib/custom-photo';
import { hapticSelection, hapticSoft } from '@/lib/haptics';
import type { SharedValue } from 'react-native-reanimated';

type Tool = 'none' | 'widgets' | 'background';

type Props = {
  draft: CustomLayout;
  onChange: (next: CustomLayout) => void;
  onDone: () => void;
  onCancel: () => void;
  bpm: number;
  playing: boolean;
  timeSignature: string;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  clockLabel?: string;
  initialSelected?: CustomWidgetId | null;
  livePhotoFit?: LivePhotoFit;
};

export function CustomEditor({
  draft,
  onChange,
  onDone,
  onCancel,
  bpm,
  playing,
  timeSignature,
  pulse,
  pulseRole,
  clockLabel,
  initialSelected = null,
  livePhotoFit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tool, setTool] = useState<Tool>('none');
  const [selected, setSelected] = useState<CustomWidgetId | null>(initialSelected);
  const [denied, setDenied] = useState(false);
  const [voiceOver, setVoiceOver] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const picking = useRef(false);

  const commitDraft = (next: CustomLayout) => {
    draftRef.current = next;
    onChangeRef.current(next);
  };
  const [canvas, setCanvas] = useState({ width: 390, height: 640 });
  const light = isLightCustomSurface(draft.background);
  const headerReserve = Math.max(insets.top, 8) + 52;
  const editorInset = { top: headerReserve, bottom: Math.max(insets.bottom, 10) + 64 };

  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (live) setVoiceOver(value);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setVoiceOver);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const choosePhoto = async () => {
    if (picking.current) return;
    picking.current = true;
    try {
      const result = await pickCustomPhoto();
      if (result.status === 'denied') {
        setDenied(true);
        return;
      }
      if (result.status !== 'picked') return;
      setDenied(false);
      void hapticSoft();
      commitDraft({
        ...draftRef.current,
        background: { type: 'photo', uri: result.uri },
        photoFit: { scale: 1, x: 0, y: 0 },
      });
      setTool('none');
    } finally {
      picking.current = false;
    }
  };

  const insertWidget = (id: CustomWidgetId) => {
    void hapticSelection();
    if (draftRef.current.widgets.some((widget) => widget.id === id)) {
      setSelected(id);
      setTool('none');
      return;
    }
    commitDraft(addWidget(draftRef.current, id));
    setSelected(id);
    setTool('none');
  };

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={[styles.top, { paddingTop: Math.max(insets.top, 8) }]} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            void hapticSelection();
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={8}
          style={styles.topHit}>
          <Text style={styles.topGhost}>CANCEL</Text>
        </Pressable>
        <Text style={styles.title}>CUSTOMIZE</Text>
        <Pressable
          onPress={() => {
            void hapticSoft();
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel="Done"
          hitSlop={8}
          style={styles.topHit}>
          <Text style={styles.topStrong}>DONE</Text>
        </Pressable>
      </View>

      <View
        style={styles.canvas}
        pointerEvents="box-none"
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 1 && height > 1) {
            const next = { width, height };
            setCanvas(next);
            const recovered = draftRef.current.widgets.map((widget) =>
              clampWidget(widget, next, { top: headerReserve, bottom: Math.max(insets.bottom, 10) + 64 })
            );
            const moved = recovered.some(
              (widget, index) =>
                Math.abs(widget.x - draftRef.current.widgets[index].x) > 0.001 ||
                Math.abs(widget.y - draftRef.current.widgets[index].y) > 0.001
            );
            if (moved) commitDraft({ ...draftRef.current, widgets: recovered });
          }
        }}>
        {draft.background.type === 'photo' ? (
          <PhotoFitPad
            fit={draft.photoFit}
            live={livePhotoFit}
            onChange={(photoFit) => commitDraft({ ...draftRef.current, photoFit })}
          />
        ) : null}
        {draft.widgets.map((widget) => (
          <EditorWidget
            key={widget.uid}
            widget={widget}
            canvas={canvas}
            clockLabel={clockLabel}
            selected={selected === widget.id}
            light={light}
            bpm={bpm}
            playing={playing}
            timeSignature={timeSignature}
            pulse={pulse}
            pulseRole={pulseRole}
            onSelect={() => setSelected(widget.id)}
            onMove={(x, y) => commitDraft(moveWidget(draftRef.current, widget.id, x, y, canvas, editorInset))}
            onRemove={() => {
              void hapticSelection();
              commitDraft(removeWidget(draftRef.current, widget.id));
              setSelected(null);
            }}
            onNudge={(dx, dy) => commitDraft(nudgeWidget(draftRef.current, widget.id, dx, dy, canvas, editorInset))}
            onScale={(scale) => commitDraft(scaleWidget(draftRef.current, widget.id, scale, canvas, editorInset))}
            inset={editorInset}
            onStyle={(patch) => commitDraft(styleWidget(draftRef.current, widget.id, patch))}
            voiceOver={voiceOver}
          />
        ))}
      </View>

      <View
        style={[styles.tools, { bottom: Math.max(insets.bottom, 10) + 8 }, tool !== 'none' && styles.toolsHidden]}
        pointerEvents={tool === 'none' ? 'box-none' : 'none'}>
        <Pressable
          onPress={() => {
            void hapticSoft();
            setTool((current) => (current === 'widgets' ? 'none' : 'widgets'));
          }}
          accessibilityRole="button"
          accessibilityLabel="Add widget"
          style={({ pressed }) => [styles.toolBtn, tool === 'widgets' && styles.toolOn, pressed && styles.pressed]}>
          <Ionicons name="add" size={22} color="#F6F0E4" />
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticSoft();
            void choosePhoto();
          }}
          accessibilityRole="button"
          accessibilityLabel={draft.background.type === 'photo' ? 'Change Photo' : 'Choose Photo'}
          style={({ pressed }) => [styles.toolBtn, styles.photoFront, pressed && styles.pressed]}>
          <Ionicons name="image-outline" size={18} color="#E8C878" />
          <Text style={styles.photoFrontText}>
            {draft.background.type === 'photo' ? 'CHANGE PHOTO' : 'CHOOSE PHOTO'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticSoft();
            setTool((current) => (current === 'background' ? 'none' : 'background'));
          }}
          accessibilityRole="button"
          accessibilityLabel="Background"
          style={({ pressed }) => [styles.toolBtn, styles.bgBtn, tool === 'background' && styles.toolOn, pressed && styles.pressed]}>
          <Ionicons name="color-palette-outline" size={18} color="#F6F0E4" />
          <Text style={styles.bgLabel}>BG</Text>
        </Pressable>
      </View>

      {tool === 'widgets' ? (
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="auto">
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>ADD</Text>
            <Pressable onPress={() => setTool('none')} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Text style={styles.sheetClose}>CLOSE</Text>
            </Pressable>
          </View>
          <View style={styles.pickerRow}>
            {CUSTOM_WIDGET_ORDER.map((id) => {
              const added = draft.widgets.some((widget) => widget.id === id);
              return (
                <Pressable
                  key={id}
                  onPress={() => insertWidget(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${CUSTOM_WIDGET_META[id].a11y}. ${added ? 'Already added' : 'Add'}`}
                  style={[styles.pick, added && styles.pickAdded]}>
                  <Text style={styles.pickText}>{CUSTOM_WIDGET_META[id].label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {tool === 'background' ? (
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="auto">
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>BACKGROUND</Text>
            <Pressable onPress={() => setTool('none')} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Text style={styles.sheetClose}>CLOSE</Text>
            </Pressable>
          </View>
          {denied ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
              accessibilityLabel="Open Settings to allow photos"
              style={styles.denied}>
              <Text style={styles.deniedText}>Photos access is off. Tap to open Settings.</Text>
            </Pressable>
          ) : null}
          <Text style={styles.group}>POCKT</Text>
          <View style={styles.swatches}>
            {CUSTOM_POCKT_BACKGROUNDS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void hapticSelection();
                  commitDraft({ ...draftRef.current, background: { type: 'pockt', id: item.id } });
                  setTool('none');
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={[
                  styles.swatch,
                  { backgroundColor: item.colors[1] },
                  draft.background.type === 'pockt' && draft.background.id === item.id && styles.swatchOn,
                ]}
              />
            ))}
          </View>
          <Text style={styles.group}>COLOR</Text>
          <View style={styles.swatches}>
            {CUSTOM_COLORS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  void hapticSelection();
                  commitDraft({ ...draftRef.current, background: { type: 'color', id: item.id } });
                  setTool('none');
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={[
                  styles.swatch,
                  { backgroundColor: item.hex },
                  draft.background.type === 'color' && draft.background.id === item.id && styles.swatchOn,
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PhotoFitPad({
  fit,
  live,
  onChange,
}: {
  fit?: CustomPhotoFit;
  live?: LivePhotoFit;
  onChange: (next: CustomPhotoFit) => void;
}) {
  const start = sanitizePhotoFit(fit);
  const localScale = useSharedValue(start.scale);
  const localX = useSharedValue(start.x);
  const localY = useSharedValue(start.y);
  const startScale = useSharedValue(start.scale);
  const startX = useSharedValue(start.x);
  const startY = useSharedValue(start.y);
  const liveScale = live?.scale ?? localScale;
  const liveX = live?.x ?? localX;
  const liveY = live?.y ?? localY;

  useEffect(() => {
    if (live) return;
    const next = sanitizePhotoFit(fit);
    liveScale.value = next.scale;
    liveX.value = next.x;
    liveY.value = next.y;
  }, [fit, live, liveScale, liveX, liveY]);

  const commit = useCallback(
    (scale: number, x: number, y: number) => {
      onChange(sanitizePhotoFit({ scale, x, y }));
    },
    [onChange]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          startScale.value = liveScale.value;
        })
        .onUpdate((event) => {
          liveScale.value = Math.min(PHOTO_SCALE_MAX, Math.max(PHOTO_SCALE_MIN, startScale.value * event.scale));
        })
        .onEnd(() => {
          runOnJS(commit)(liveScale.value, liveX.value, liveY.value);
        }),
    [commit, liveScale, liveX, liveY, startScale]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onBegin(() => {
          startX.value = liveX.value;
          startY.value = liveY.value;
        })
        .onUpdate((event) => {
          liveX.value = Math.min(1, Math.max(-1, startX.value + event.translationX / 160));
          liveY.value = Math.min(1, Math.max(-1, startY.value + event.translationY / 160));
        })
        .onEnd(() => {
          runOnJS(commit)(liveScale.value, liveX.value, liveY.value);
        }),
    [commit, liveScale, liveX, liveY, startX, startY]
  );

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
      <View style={StyleSheet.absoluteFillObject} />
    </GestureDetector>
  );
}

function EditorWidget({
  widget,
  canvas,
  selected,
  light,
  bpm,
  playing,
  timeSignature,
  pulse,
  pulseRole,
  clockLabel,
  onSelect,
  onMove,
  onRemove,
  onNudge,
  onScale,
  onStyle,
  voiceOver,
  inset,
}: {
  widget: CustomWidget;
  canvas: { width: number; height: number };
  selected: boolean;
  light: boolean;
  bpm: number;
  playing: boolean;
  timeSignature: string;
  pulse: SharedValue<number>;
  pulseRole: SharedValue<number>;
  clockLabel?: string;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onRemove: () => void;
  onNudge: (dx: number, dy: number) => void;
  onScale: (scale: number) => void;
  onStyle: (patch: Partial<Pick<CustomWidget, 'textStyle' | 'beatStyle' | 'playStyle' | 'meterStyle' | 'tunerStyle'>>) => void;
  voiceOver: boolean;
  inset?: { top?: number; bottom?: number; side?: number };
}) {
  const meta = CUSTOM_WIDGET_META[widget.id];
  const startX = useSharedValue(widget.x);
  const startY = useSharedValue(widget.y);
  const draggingRef = useRef(false);
  const liveX = useSharedValue(widget.x);
  const liveY = useSharedValue(widget.y);
  const startScale = useSharedValue(widget.scale);
  const liveScale = useSharedValue(widget.scale);
  const pinchOriginX = useSharedValue(widget.x);
  const pinchOriginY = useSharedValue(widget.y);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const width = canvas.width || 390;
  const height = canvas.height || 640;
  const minScale = meta.minScale;
  const maxScale = meta.maxScale;
  const baseW = meta.width;
  const baseH = meta.height;
  const [faceScale, setFaceScale] = useState(widget.scale);
  const actions = useRef({ onSelect, onMove, onScale });
  actions.current = { onSelect, onMove, onScale };

  useAnimatedReaction(
    () => liveScale.value,
    (value) => {
      runOnJS(setFaceScale)(Math.round(value * 100) / 100);
    }
  );

  const commitMove = useCallback(
    (x: number, y: number, scale: number) => {
      try {
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale)) return;
        const next = clampWidget({ ...widget, x, y, scale }, { width, height }, inset);
        onMove(next.x, next.y);
        if (Math.abs(next.scale - widget.scale) > 0.001) onScale(next.scale);
      } catch {
        /* keep last good layout */
      }
    },
    [height, inset, onMove, onScale, widget, width]
  );

  const commitScale = useCallback(
    (scale: number) => {
      try {
        const next = clampScale(widget.id, scale);
        if (!Number.isFinite(next)) return;
        onScale(next);
      } catch {
        /* keep last good scale */
      }
    },
    [onScale, widget.id]
  );

  useEffect(() => {
    if (draggingRef.current) return;
    liveX.value = widget.x;
    liveY.value = widget.y;
    liveScale.value = widget.scale;
  }, [liveScale, liveX, liveY, widget.scale, widget.x, widget.y]);

  const markDrag = useCallback((on: boolean) => {
    draggingRef.current = on;
  }, []);

  const finishDrag = useCallback(
    (x: number, y: number, scale: number) => {
      draggingRef.current = false;
      commitMove(x, y, scale);
    },
    [commitMove]
  );

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(1)
        .onBegin(() => {
          startX.value = liveX.value;
          startY.value = liveY.value;
          runOnJS(markDrag)(true);
          runOnJS(actions.current.onSelect)();
        })
        .onUpdate((event) => {
          liveX.value = startX.value + event.translationX / Math.max(1, width);
          liveY.value = startY.value + event.translationY / Math.max(1, height);
        })
        .onEnd(() => {
          runOnJS(finishDrag)(liveX.value, liveY.value, liveScale.value);
        }),
    [finishDrag, height, liveScale, liveX, liveY, markDrag, startX, startY, width]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin((event) => {
          startScale.value = liveScale.value;
          pinchOriginX.value = liveX.value;
          pinchOriginY.value = liveY.value;
          const left = liveX.value * width - (baseW * liveScale.value) / 2;
          const top = liveY.value * height - (baseH * liveScale.value) / 2;
          focalX.value = left + event.focalX;
          focalY.value = top + event.focalY;
          runOnJS(actions.current.onSelect)();
        })
        .onUpdate((event) => {
          const next = Math.min(maxScale, Math.max(minScale, startScale.value * event.scale));
          const ratio = next / Math.max(0.001, startScale.value);
          liveScale.value = next;
          const localX = focalX.value - pinchOriginX.value * width;
          const localY = focalY.value - pinchOriginY.value * height;
          liveX.value = (focalX.value - localX * ratio) / Math.max(1, width);
          liveY.value = (focalY.value - localY * ratio) / Math.max(1, height);
        })
        .onEnd(() => {
          runOnJS(commitMove)(liveX.value, liveY.value, liveScale.value);
        }),
    [baseH, baseW, commitMove, focalX, focalY, height, liveScale, liveX, liveY, maxScale, minScale, pinchOriginX, pinchOriginY, startScale, width]
  );

  const resize = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
          startScale.value = liveScale.value;
          runOnJS(actions.current.onSelect)();
        })
        .onUpdate((event) => {
          const next = startScale.value + event.translationX / 140 + event.translationY / 180;
          liveScale.value = Math.min(maxScale, Math.max(minScale, next));
        })
        .onEnd(() => {
          runOnJS(commitScale)(liveScale.value);
        }),
    [commitScale, liveScale, maxScale, minScale, startScale]
  );

  const composed = useMemo(() => Gesture.Simultaneous(drag, pinch), [drag, pinch]);

  const style = useAnimatedStyle(() => {
    const w = baseW * liveScale.value;
    const h = baseH * liveScale.value;
    return {
      width: w,
      height: h,
      left: liveX.value * width - w / 2,
      top: liveY.value * height - h / 2,
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        accessible
        accessibilityLabel={`${meta.a11y}${selected ? ', selected' : ''}`}
        accessibilityActions={[
          { name: 'activate', label: 'Select' },
          { name: 'moveUp', label: 'Move Up' },
          { name: 'moveDown', label: 'Move Down' },
          { name: 'moveLeft', label: 'Move Left' },
          { name: 'moveRight', label: 'Move Right' },
          { name: 'delete', label: 'Remove' },
        ]}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === 'activate') onSelect();
          if (name === 'moveUp') onNudge(0, -0.04);
          if (name === 'moveDown') onNudge(0, 0.04);
          if (name === 'moveLeft') onNudge(-0.05, 0);
          if (name === 'moveRight') onNudge(0.05, 0);
          if (name === 'delete') onRemove();
        }}
        accessibilityHint="Pinch to resize, drag to move, or use rotor actions."
        style={[{ position: 'absolute' }, style]}>
        <View style={styles.widgetHit} pointerEvents="box-none">
          <CustomWidgetFace
            id={widget.id}
            bpm={bpm}
            playing={playing}
            timeSignature={timeSignature}
            pulse={pulse}
            pulseRole={pulseRole}
            light={light}
            editing
            selected={selected}
            scale={faceScale}
            textStyle={widget.textStyle}
            beatStyle={widget.beatStyle}
            playStyle={widget.playStyle}
            meterStyle={widget.meterStyle}
            tunerStyle={widget.tunerStyle}
            clockLabel={clockLabel}
          />
        </View>
        {selected ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${meta.label}`}
            hitSlop={8}
            style={styles.delete}>
            <Ionicons name="remove" size={14} color="#0A0908" />
          </Pressable>
        ) : null}
        {selected ? (
          <GestureDetector gesture={resize}>
            <View
              accessible
              accessibilityLabel={`Resize ${meta.label}`}
              style={styles.resize}
            />
          </GestureDetector>
        ) : null}
        {selected && (widget.id === 'bpm' || widget.id === 'clock') ? (
          <View style={styles.styleRow} pointerEvents="auto">
            {CUSTOM_TEXT_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onStyle({ textStyle: item.id })}
                style={[styles.styleChip, widget.textStyle === item.id && styles.styleOn]}>
                <Text style={styles.styleText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected && widget.id === 'play' ? (
          <View style={styles.styleRow} pointerEvents="auto">
            {CUSTOM_PLAY_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onStyle({ playStyle: item.id })}
                style={[styles.styleChip, widget.playStyle === item.id && styles.styleOn]}>
                <Text style={styles.styleText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected && widget.id === 'meter' ? (
          <View style={styles.styleRow} pointerEvents="auto">
            {CUSTOM_METER_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onStyle({ meterStyle: item.id })}
                style={[styles.styleChip, widget.meterStyle === item.id && styles.styleOn]}>
                <Text style={styles.styleText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected && widget.id === 'tuner' ? (
          <View style={styles.styleRow} pointerEvents="auto">
            {CUSTOM_TUNER_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onStyle({ tunerStyle: item.id })}
                style={[styles.styleChip, widget.tunerStyle === item.id && styles.styleOn]}>
                <Text style={styles.styleText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected && widget.id === 'beat' ? (
          <View style={styles.styleRow} pointerEvents="auto">
            {CUSTOM_BEAT_STYLES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onStyle({ beatStyle: item.id })}
                style={[styles.styleChip, widget.beatStyle === item.id && styles.styleOn]}>
                <Text style={styles.styleText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected && voiceOver ? (
          <View style={styles.a11yMove} pointerEvents="auto">
            <Pressable onPress={() => onNudge(0, -0.04)} accessibilityLabel="Move Up" style={styles.a11yHit}>
              <Text style={styles.a11yText}>↑</Text>
            </Pressable>
            <Pressable onPress={() => onNudge(0, 0.04)} accessibilityLabel="Move Down" style={styles.a11yHit}>
              <Text style={styles.a11yText}>↓</Text>
            </Pressable>
            <Pressable onPress={() => onNudge(-0.05, 0)} accessibilityLabel="Move Left" style={styles.a11yHit}>
              <Text style={styles.a11yText}>←</Text>
            </Pressable>
            <Pressable onPress={() => onNudge(0.05, 0)} accessibilityLabel="Move Right" style={styles.a11yHit}>
              <Text style={styles.a11yText}>→</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
    minHeight: 44,
  },
  title: {
    color: '#F6F0E4',
    fontSize: 14,
    letterSpacing: 3.2,
    fontWeight: '800',
  },
  topHit: {
    minHeight: 44,
    minWidth: 72,
    justifyContent: 'center',
  },
  topGhost: {
    color: 'rgba(246,240,228,0.62)',
    fontSize: 13,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  topStrong: {
    color: '#E8C878',
    fontSize: 13,
    letterSpacing: 1.8,
    fontWeight: '800',
    textAlign: 'right',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  tools: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 10,
    zIndex: 24,
  },
  toolsHidden: {
    opacity: 0,
  },
  toolBtn: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,10,0.56)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,240,228,0.2)',
  },
  bgBtn: {
    minWidth: 64,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
  },
  photoFront: {
    minWidth: 148,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    borderColor: 'rgba(232,200,120,0.45)',
  },
  photoFrontText: {
    color: '#E8C878',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  bgLabel: {
    color: '#F6F0E4',
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  toolOn: {
    backgroundColor: 'rgba(232,200,120,0.22)',
    borderColor: 'rgba(232,200,120,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    elevation: 20,
    backgroundColor: 'rgba(8,7,6,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,240,228,0.14)',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetClose: {
    color: '#E8C878',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    minHeight: 44,
    textAlignVertical: 'center',
  },
  sheetTitle: {
    color: 'rgba(246,240,228,0.5)',
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pick: {
    minHeight: 48,
    minWidth: 72,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246,240,228,0.08)',
  },
  pickAdded: {
    backgroundColor: 'rgba(232,200,120,0.16)',
  },
  pickText: {
    color: '#F6F0E4',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  photoBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(246,240,228,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoText: {
    color: '#F6F0E4',
    fontSize: 13,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  denied: {
    minHeight: 44,
    justifyContent: 'center',
  },
  deniedText: {
    color: '#E8C878',
    fontSize: 12,
    fontWeight: '600',
  },
  group: {
    color: 'rgba(246,240,228,0.46)',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: '#F6F0E4',
  },
  widgetHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resize: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8C878',
    borderWidth: 2,
    borderColor: '#0A0908',
    zIndex: 5,
  },
  styleRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -36,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  styleChip: {
    minHeight: 28,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(8,8,10,0.72)',
    justifyContent: 'center',
  },
  styleOn: {
    backgroundColor: 'rgba(232,200,120,0.28)',
  },
  styleText: {
    color: '#F6F0E4',
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  delete: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8C878',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  a11yMove: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  a11yHit: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(8,8,10,0.7)',
  },
  a11yText: {
    color: '#F6F0E4',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
});

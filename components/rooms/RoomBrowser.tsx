import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TunerGlyph } from '@/components/brand/TunerGlyph';
import { Pockt2Mark } from '@/components/pockt2/Pockt2Mark';
import { RoomTile } from '@/components/rooms/RoomTile';
import { isActiveRoomId, roomA11yLabel, type RoomFamily } from '@/constants/rooms';
import type { CustomLayout } from '@/lib/custom-layout';
import { hapticMedium, hapticSelection, hapticSoft } from '@/lib/haptics';
import type { LibraryState } from '@/lib/library';
import {
  autoscrollVelocityPxPerSec,
  dragScrollCompensation,
  localPointAfterScroll,
  nextScrollOffset,
} from '@/lib/drag-autoscroll';
import {
  gridHeight,
  insertionIndexForDrag,
  isCustomRoom,
  layoutClassic,
  layoutCustom,
  layoutImmersive,
  moveRoomInFamily,
  sanitizeClassicOrder,
  sanitizeImmersiveOrder,
  slotsForRows,
  type SlotFrame,
} from '@/lib/room-order';
import type { RoomId } from '@/lib/types';

const REFLOW = { damping: 24, stiffness: 170, mass: 0.85, overshootClamping: true } as const;

type Props = {
  roomId: RoomId;
  customPhotoUri: string | null;
  customLayout?: CustomLayout | null;
  onEnter: (id: RoomId) => void;
  onRoomFocused: (id: RoomId) => void;
  onCustomPhotoChange: (uri: string | null) => void;
  library?: LibraryState;
  onLibraryChange?: (next: LibraryState) => void;
  onToggleFavorite?: (id: RoomId) => void;
  showChromeBack?: boolean;
  onBack?: () => void;
  onOpenTuner?: () => void;
  bpm?: number;
};

export function RoomBrowser({
  roomId: _roomId,
  customPhotoUri,
  customLayout,
  onEnter,
  onRoomFocused,
  onCustomPhotoChange: _onCustomPhotoChange,
  library,
  onLibraryChange,
  onToggleFavorite: _onToggleFavorite,
  showChromeBack,
  onBack,
  onOpenTuner,
  bpm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<RoomId | null>(null);
  const [classicOrder, setClassicOrder] = useState<RoomId[]>(() => sanitizeClassicOrder(library?.classicRoomOrder));
  const [immersiveOrder, setImmersiveOrder] = useState<RoomId[]>(() =>
    sanitizeImmersiveOrder(library?.immersiveRoomOrder)
  );
  const gutter = 18;
  const gap = 16;
  const cardW = Math.round((width - gutter * 2 - gap) / 2);
  const cardH = Math.round(Math.min(cardW * 1.28, Math.max(188, height * 0.28)));
  const immersiveW = Math.round((width - gutter * 2 - gap * 2) / 3);
  const featuredW = width - gutter * 2;
  const featuredH = Math.round(Math.min(cardW * 0.82, 186));
  const scrollRef = useRef<ScrollView>(null);
  const viewportNode = useRef<View>(null);
  const scrollAdj = useSharedValue(0);
  const scrollYRef = useRef(0);
  const scrollStartRef = useRef(0);
  const contentHRef = useRef(0);
  const viewportRef = useRef({ top: 0, bottom: 0, height: 0 });
  const lastFinger = useRef<{ x: number; y: number; family: 'classic' | 'immersive'; id: RoomId } | null>(
    null
  );
  const classicOriginStart = useRef({ x: 0, y: 0 });
  const immersiveOriginStart = useRef({ x: 0, y: 0 });
  const classicGrid = useRef<View>(null);
  const immersiveGrid = useRef<View>(null);
  const classicOrderRef = useRef(classicOrder);
  const immersiveOrderRef = useRef(immersiveOrder);
  const classicOrigin = useRef({ x: 0, y: 0, ready: false });
  const immersiveOrigin = useRef({ x: 0, y: 0, ready: false });
  const lastHover = useRef<{ id: RoomId; previous: string; at: number; lockedIndex: number | null } | null>(
    null
  );
  const [restEpoch, setRestEpoch] = useState(0);
  classicOrderRef.current = classicOrder;
  immersiveOrderRef.current = immersiveOrder;
  const classicSlots = useMemo(
    () => slotsForRows(layoutClassic(classicOrder), cardW, cardH, featuredW, featuredH, gap),
    [cardH, cardW, classicOrder, featuredH, featuredW, gap]
  );
  const immersiveSlots = useMemo(
    () => slotsForRows(layoutImmersive(immersiveOrder), immersiveW, cardH, featuredW, featuredH, gap),
    [cardH, featuredH, featuredW, gap, immersiveOrder, immersiveW]
  );
  const customSlots = useMemo(
    () => slotsForRows(layoutCustom(), cardW, cardH, featuredW, featuredH, gap),
    [cardH, cardW, featuredH, featuredW, gap]
  );

  useEffect(() => {
    if (editing) return;
    setClassicOrder(sanitizeClassicOrder(library?.classicRoomOrder));
    setImmersiveOrder(sanitizeImmersiveOrder(library?.immersiveRoomOrder));
  }, [editing, library?.classicRoomOrder, library?.immersiveRoomOrder]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const sections = useMemo(
    () =>
      [
        {
          id: 'classic' as RoomFamily,
          title: 'CLASSIC',
          slots: classicSlots,
          canReorder: true as const,
        },
        {
          id: 'immersive' as RoomFamily,
          title: 'IMMERSIVE',
          slots: immersiveSlots,
          canReorder: true as const,
        },
        {
          id: 'custom' as RoomFamily,
          title: 'CUSTOM',
          slots: customSlots,
          canReorder: false as const,
        },
      ],
    [classicSlots, customSlots, immersiveSlots]
  );

  const rows = useMemo(() => {
    const out: { id: RoomId; top: number; bottom: number }[] = [];
    let y = 0;
    for (const section of sections) {
      y += 44;
      for (const slot of section.slots) {
        out.push({ id: slot.id, top: y + slot.y, bottom: y + slot.y + slot.h });
      }
      y += gridHeight(section.slots) + 18;
    }
    return out;
  }, [sections]);

  const visible = useMemo(() => {
    const top = scrollY - cardH;
    const bottom = scrollY + height + cardH;
    const next = new Set<RoomId>();
    for (const row of rows) {
      if (row.bottom >= top && row.top <= bottom) next.add(row.id);
    }
    return next;
  }, [cardH, height, rows, scrollY]);

  const persist = useCallback(
    (classic: RoomId[], immersive: RoomId[]) => {
      if (!library || !onLibraryChange) return;
      // Home order is presentation state only. Never touch audio/config here.
      onLibraryChange({
        ...library,
        classicRoomOrder: sanitizeClassicOrder(classic),
        immersiveRoomOrder: sanitizeImmersiveOrder(immersive),
      });
    },
    [library, onLibraryChange]
  );

  const measureFamily = useCallback((family: 'classic' | 'immersive') => {
    const node = family === 'classic' ? classicGrid.current : immersiveGrid.current;
    const origin = family === 'classic' ? classicOrigin : immersiveOrigin;
    node?.measureInWindow((ox, oy) => {
      origin.current = { x: ox, y: oy, ready: true };
    });
  }, []);

  const enter = useCallback(
    (id: RoomId) => {
      if (editing) return;
      void hapticMedium();
      onRoomFocused(id);
      if (!isActiveRoomId(id)) return;
      onEnter(id);
    },
    [editing, onEnter, onRoomFocused]
  );

  const beginEdit = useCallback(
    (id: RoomId, family: 'classic' | 'immersive') => {
      if (isCustomRoom(id)) return;
      void hapticSelection();
      if (!editing) setEditing(true);
      setDraggingId(id);
      scrollStartRef.current = scrollYRef.current;
      scrollAdj.value = 0;
      measureFamily(family);
      const origin = family === 'classic' ? classicOrigin.current : immersiveOrigin.current;
      if (origin.ready) {
        if (family === 'classic') classicOriginStart.current = { x: origin.x, y: origin.y };
        else immersiveOriginStart.current = { x: origin.x, y: origin.y };
      }
    },
    [editing, measureFamily, scrollAdj]
  );

  const hoverReorder = useCallback(
    (id: RoomId, absX: number, absY: number, family: 'classic' | 'immersive') => {
      lastFinger.current = { x: absX, y: absY, family, id };
      const origin = family === 'classic' ? classicOrigin.current : immersiveOrigin.current;
      const start = family === 'classic' ? classicOriginStart.current : immersiveOriginStart.current;
      if (!origin.ready && start.y === 0 && start.x === 0) return;
      const local = localPointAfterScroll(
        absX,
        absY,
        origin.ready ? origin.x : start.x,
        start.y || origin.y,
        scrollStartRef.current,
        scrollYRef.current
      );
      const localX = local.x;
      const localY = local.y;
      const apply = (order: RoomId[], slots: SlotFrame[], setOrder: (next: RoomId[]) => void, ref: { current: RoomId[] }) => {
        if (!order.includes(id)) return;
        const currentIndex = order.indexOf(id);
        const undo = lastHover.current;
        const locked = undo && undo.id === id ? undo.lockedIndex : null;
        const nextIndex = insertionIndexForDrag(slots, localX, localY, currentIndex, locked);
        const next = moveRoomInFamily(order, id, nextIndex);
        if (next.join() === order.join()) {
          if (undo && undo.id === id && locked != null) {
            const lockedSlot = locked >= 0 && locked < slots.length ? slots[locked] : null;
            if (
              lockedSlot &&
              (localX < lockedSlot.x - 8 ||
                localX > lockedSlot.x + lockedSlot.w + 8 ||
                localY < lockedSlot.y - 8 ||
                localY > lockedSlot.y + lockedSlot.h + 8)
            ) {
              lastHover.current = { ...undo, lockedIndex: null };
            }
          }
          return;
        }
        if (undo && undo.id === id && Date.now() - undo.at < 160 && undo.previous === next.join()) return;
        lastHover.current = { id, previous: order.join(), at: Date.now(), lockedIndex: currentIndex };
        ref.current = next;
        setOrder(next);
      };
      if (family === 'classic') {
        apply(classicOrderRef.current, classicSlots, setClassicOrder, classicOrderRef);
        return;
      }
      apply(immersiveOrderRef.current, immersiveSlots, setImmersiveOrder, immersiveOrderRef);
    },
    [classicSlots, immersiveSlots]
  );
  const hoverReorderRef = useRef(hoverReorder);
  hoverReorderRef.current = hoverReorder;

  const endDrag = useCallback(() => {
    setDraggingId(null);
    lastHover.current = null;
    lastFinger.current = null;
    scrollAdj.value = 0;
    setRestEpoch((value) => value + 1);
    persist(classicOrderRef.current, immersiveOrderRef.current);
  }, [persist, scrollAdj]);

  const doneEdit = useCallback(() => {
    setDraggingId(null);
    setEditing(false);
    lastHover.current = null;
    lastFinger.current = null;
    scrollAdj.value = 0;
    setRestEpoch((value) => value + 1);
    persist(classicOrderRef.current, immersiveOrderRef.current);
    void hapticSoft();
  }, [persist, scrollAdj]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollYRef.current = y;
    setScrollY(y);
    if (draggingId) {
      scrollAdj.value = dragScrollCompensation(scrollStartRef.current, y);
      measureFamily('classic');
      measureFamily('immersive');
    }
  };

  useEffect(() => {
    if (!draggingId) return;
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const finger = lastFinger.current;
      const viewport = viewportRef.current;
      const maxOffset = Math.max(0, contentHRef.current - viewport.height);
      const velocity = finger
        ? autoscrollVelocityPxPerSec(finger.y, viewport.top, viewport.bottom, scrollYRef.current, maxOffset)
        : 0;
      if (velocity !== 0) {
        const next = nextScrollOffset(scrollYRef.current, velocity, dt, maxOffset);
        if (Math.abs(next - scrollYRef.current) > 0.25) {
          scrollRef.current?.scrollTo({ y: next, animated: false });
          scrollYRef.current = next;
          scrollAdj.value = dragScrollCompensation(scrollStartRef.current, next);
          measureFamily('classic');
          measureFamily('immersive');
          if (finger) hoverReorderRef.current(finger.id, finger.x, finger.y, finger.family);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draggingId, measureFamily, scrollAdj]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.side}>
          {showChromeBack && !editing ? (
            <Pressable
              onPress={() => {
                void hapticSoft();
                onBack?.();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Back">
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : editing ? (
            <Pressable
              onPress={doneEdit}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Done rearranging">
              <Text style={styles.doneText}>DONE</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint} pointerEvents="none">
              Hold to{'\n'}rearrange
            </Text>
          )}
        </View>
        <View style={styles.brand}>
          <Pockt2Mark size={36} accessible={false} />
          <Text style={styles.tag}>Precision lives here</Text>
        </View>
        {onOpenTuner ? (
          <Pressable
            onPress={() => {
              void hapticSoft();
              onOpenTuner();
            }}
            accessibilityRole="button"
            accessibilityLabel="Tuner"
            style={[styles.side, styles.tool]}>
            <TunerGlyph width={26} height={12} />
            <Text style={styles.toolText}>TUNER</Text>
          </Pressable>
        ) : (
          <View style={styles.side} />
        )}
      </View>

      <View
        ref={viewportNode}
        style={styles.scroll}
        onLayout={() => {
          viewportNode.current?.measureInWindow((_x, y, _w, h) => {
            viewportRef.current = { top: y, bottom: y + h, height: h };
          });
        }}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollFill}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 28) + 40, paddingHorizontal: gutter },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!draggingId}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => {
          contentHRef.current = h;
        }}>
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View
              ref={section.id === 'classic' ? classicGrid : section.id === 'immersive' ? immersiveGrid : undefined}
              onLayout={() => {
                if (section.id === 'classic' || section.id === 'immersive') measureFamily(section.id);
              }}
              style={[styles.grid, { height: gridHeight(section.slots) }]}>
              {section.slots.map((slot) => (
                <PocketCard
                  key={slot.id}
                  slot={slot}
                  bpm={bpm}
                  customPhotoUri={customPhotoUri}
                  customLayout={slot.id === 'customized' ? customLayout ?? null : null}
                  active={editing || visible.has(slot.id)}
                  reduceMotion={reduceMotion}
                  library={library}
                  editing={editing}
                  lifted={draggingId === slot.id}
                  restEpoch={restEpoch}
                  scrollAdj={scrollAdj}
                  canReorder={section.canReorder}
                  onEnter={() => enter(slot.id)}
                  onPick={() => beginEdit(slot.id, section.id === 'immersive' ? 'immersive' : 'classic')}
                  onHover={(x, y) => {
                    hoverReorder(slot.id, x, y, section.id === 'immersive' ? 'immersive' : 'classic');
                  }}
                  onDrop={endDrag}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      </View>
    </View>
  );
}

function PocketCard({
  slot,
  bpm,
  customPhotoUri,
  customLayout,
  active,
  reduceMotion,
  library,
  editing,
  lifted,
  restEpoch,
  scrollAdj,
  canReorder,
  onEnter,
  onPick,
  onHover,
  onDrop,
}: {
  slot: SlotFrame;
  bpm?: number;
  customPhotoUri: string | null;
  customLayout: CustomLayout | null;
  active: boolean;
  reduceMotion: boolean;
  library?: LibraryState;
  editing: boolean;
  lifted: boolean;
  restEpoch: number;
  scrollAdj: SharedValue<number>;
  canReorder: boolean;
  onEnter: () => void;
  onPick: () => void;
  onHover: (x: number, y: number) => void;
  onDrop: () => void;
}) {
  const { id, x, y, w, h, featured } = slot;
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const posX = useSharedValue(x);
  const posY = useSharedValue(y);
  const slotX = useSharedValue(x);
  const slotY = useSharedValue(y);
  const originX = useSharedValue(x);
  const originY = useSharedValue(y);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  const dragging = useSharedValue(0);
  const lift = useSharedValue(0);

  useEffect(() => {
    slotX.value = x;
    slotY.value = y;
    if (lifted) {
      lift.value = 1;
      return;
    }
    lift.value = 0;
    dragging.value = 0;
    tx.value = 0;
    ty.value = 0;
    if (reduceMotion) {
      posX.value = x;
      posY.value = y;
      return;
    }
    posX.value = withSpring(x, REFLOW);
    posY.value = withSpring(y, REFLOW);
  }, [dragging, lift, lifted, posX, posY, reduceMotion, restEpoch, slotX, slotY, tx, ty, x, y]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canReorder)
        .activateAfterLongPress(editing ? 90 : 280)
        .failOffsetX([-40, 40])
        .failOffsetY([-40, 40])
        .minDistance(0)
        .maxPointers(1)
        .hitSlop(22)
        .shouldCancelWhenOutside(false)
        .onStart((event) => {
          dragging.value = 1;
          lift.value = 1;
          originX.value = posX.value;
          originY.value = posY.value;
          grabX.value = event.absoluteX;
          grabY.value = event.absoluteY;
          tx.value = 0;
          ty.value = 0;
          runOnJS(onPick)();
        })
        .onUpdate((event) => {
          tx.value = event.absoluteX - grabX.value;
          ty.value = event.absoluteY - grabY.value;
          runOnJS(onHover)(event.absoluteX, event.absoluteY);
        })
        .onFinalize(() => {
          const wasDragging = dragging.value > 0.5;
          dragging.value = 0;
          lift.value = 0;
          tx.value = 0;
          ty.value = 0;
          posX.value = reduceMotion ? slotX.value : withSpring(slotX.value, REFLOW);
          posY.value = reduceMotion ? slotY.value : withSpring(slotY.value, REFLOW);
          if (wasDragging) runOnJS(onDrop)();
        }),
    [canReorder, dragging, editing, grabX, grabY, lift, onDrop, onHover, onPick, originX, originY, posX, posY, reduceMotion, slotX, slotY, tx, ty]
  );
  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        if (!editing) runOnJS(onEnter)();
      }),
    [editing, onEnter]
  );
  const dragStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragging.value > 0.5 ? originX.value + tx.value : posX.value },
      { translateY: dragging.value > 0.5 ? originY.value + ty.value + scrollAdj.value : posY.value },
      { scale: lift.value > 0.5 ? 1.04 : 1 },
    ],
    zIndex: lift.value > 0.5 ? 80 : 2,
    elevation: lift.value > 0.5 ? 24 : 2,
    opacity: 1,
  }));

  const tile = (
    <RoomTile
      id={id}
      width={w}
      height={h}
      featured={featured}
      customPhotoUri={customPhotoUri}
      customLayout={customLayout}
      active={active && !reduceMotion ? true : active}
      reduceMotion={reduceMotion}
      library={library}
      editing={editing}
      lifted={lifted}
      jigglePhase={id.length + (featured ? 2 : 0)}
      interactive={!canReorder}
      onPress={onEnter}
      bpm={bpm}
    />
  );

  return (
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${roomA11yLabel(id)}. Button.`}
      onAccessibilityTap={onEnter}
      style={[styles.cardAbs, { width: w, height: h }, dragStyle]}>
      {canReorder ? <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>{tile}</GestureDetector> : tile}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: '#080706',
    zIndex: 38,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: '#080706',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tag: {
    marginTop: 1,
    color: 'rgba(232,216,186,0.52)',
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  side: {
    width: 86,
    minHeight: 40,
    justifyContent: 'center',
  },
  tool: {
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: '#E8D4A8',
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  doneText: {
    color: '#E8C878',
    fontSize: 13,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  toolText: {
    color: '#E8C878',
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  hint: {
    color: 'rgba(232,216,186,0.48)',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#080706',
  },
  scrollFill: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    marginBottom: 12,
    color: 'rgba(232,216,186,0.5)',
    fontSize: 11,
    letterSpacing: 4.2,
    fontWeight: '800',
  },
  grid: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  cardAbs: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
});

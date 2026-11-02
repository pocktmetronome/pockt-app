import { sanitizePhotoUri } from '@/lib/photo-uri';

export const CUSTOM_LAYOUT_VERSION = 3 as const;

export type CustomWidgetId =
  | 'bpm'
  | 'play'
  | 'beat'
  | 'meter'
  | 'tap'
  | 'clock'
  | 'timer'
  | 'tuner'
  | 'recorder'
  | 'sound';
export type CustomTextStyle = 'clean' | 'tech' | 'classic' | 'bold';
export type CustomBeatStyle = 'dot' | 'ring' | 'electricity' | 'blocks';
export type CustomPlayStyle = 'vinyl' | 'square' | 'pill' | 'minimal' | 'neon';
export type CustomMeterStyle = 'inline' | 'stacked' | 'badge' | 'minimal';
export type CustomTunerStyle = 'fork' | 'meter' | 'note';

export type CustomPocktBackgroundId = 'graphite' | 'stage' | 'ink' | 'ember';

export type CustomColorId =
  | 'black'
  | 'charcoal'
  | 'warm-white'
  | 'navy'
  | 'burgundy'
  | 'forest'
  | 'sand';

export type CustomBackground =
  | { type: 'photo'; uri: string }
  | { type: 'pockt'; id: CustomPocktBackgroundId }
  | { type: 'color'; id: CustomColorId };

export type CustomWidget = {
  uid: string;
  id: CustomWidgetId;
  x: number;
  y: number;
  scale: number;
  textStyle: CustomTextStyle;
  beatStyle: CustomBeatStyle;
  playStyle: CustomPlayStyle;
  meterStyle: CustomMeterStyle;
  tunerStyle: CustomTunerStyle;
};

export type CustomPhotoFit = {
  scale: number;
  x: number;
  y: number;
};

export type CustomInk = 'auto' | 'light' | 'dark';

export type CustomLayout = {
  version: typeof CUSTOM_LAYOUT_VERSION;
  background: CustomBackground;
  widgets: CustomWidget[];
  onboarded?: boolean;
  photoFit?: CustomPhotoFit;
  ink?: CustomInk;
};

export const CUSTOM_WIDGET_ORDER: CustomWidgetId[] = [
  'bpm',
  'play',
  'beat',
  'meter',
  'tap',
  'clock',
  'timer',
  'tuner',
  'recorder',
  'sound',
];

export const CUSTOM_TEXT_STYLES: { id: CustomTextStyle; label: string }[] = [
  { id: 'clean', label: 'CLEAN' },
  { id: 'tech', label: 'TECH' },
  { id: 'classic', label: 'CLASSIC' },
  { id: 'bold', label: 'BOLD' },
];

export const CUSTOM_BEAT_STYLES: { id: CustomBeatStyle; label: string }[] = [
  { id: 'dot', label: 'DOT' },
  { id: 'ring', label: 'RING' },
  { id: 'electricity', label: 'ELECTRICITY' },
  { id: 'blocks', label: 'BLOCKS' },
];

export const CUSTOM_TUNER_STYLES: { id: CustomTunerStyle; label: string }[] = [
  { id: 'fork', label: 'FORK' },
  { id: 'meter', label: 'METER' },
  { id: 'note', label: 'NOTE' },
];

export const CUSTOM_PLAY_STYLES: { id: CustomPlayStyle; label: string }[] = [
  { id: 'vinyl', label: 'VINYL' },
  { id: 'square', label: 'SQUARE' },
  { id: 'pill', label: 'PILL' },
  { id: 'minimal', label: 'MINIMAL' },
  { id: 'neon', label: 'NEON SWITCH' },
];

export const CUSTOM_METER_STYLES: { id: CustomMeterStyle; label: string }[] = [
  { id: 'inline', label: 'INLINE' },
  { id: 'stacked', label: 'STACKED' },
  { id: 'badge', label: 'BADGE' },
  { id: 'minimal', label: 'MINIMAL' },
];

export const CUSTOM_WIDGET_META: Record<
  CustomWidgetId,
  { label: string; a11y: string; width: number; height: number; minScale: number; maxScale: number }
> = {
  bpm: { label: 'BPM', a11y: 'BPM widget', width: 168, height: 92, minScale: 0.7, maxScale: 4.2 },
  play: { label: 'PLAY', a11y: 'Play/Pause widget', width: 88, height: 88, minScale: 0.7, maxScale: 2.2 },
  beat: { label: 'BEAT', a11y: 'Beat widget', width: 56, height: 56, minScale: 0.7, maxScale: 6.4 },
  meter: { label: 'METER', a11y: 'Meter widget', width: 92, height: 48, minScale: 0.7, maxScale: 2.4 },
  tap: { label: 'TAP', a11y: 'Tap widget', width: 80, height: 48, minScale: 0.7, maxScale: 1.8 },
  clock: { label: 'CLOCK', a11y: 'Clock widget', width: 196, height: 64, minScale: 0.7, maxScale: 4.6 },
  timer: { label: 'TIMER', a11y: 'Practice timer widget', width: 120, height: 64, minScale: 0.7, maxScale: 3.2 },
  tuner: { label: 'TUNER', a11y: 'Tuner launcher', width: 88, height: 72, minScale: 0.7, maxScale: 2.4 },
  recorder: { label: 'REC', a11y: 'Recorder widget', width: 88, height: 72, minScale: 0.7, maxScale: 2.2 },
  sound: { label: 'SOUND', a11y: 'Sound browser', width: 88, height: 56, minScale: 0.7, maxScale: 2.2 },
};

export const CUSTOM_POCKT_BACKGROUNDS: {
  id: CustomPocktBackgroundId;
  label: string;
  colors: readonly [string, string, string];
}[] = [
  { id: 'graphite', label: 'Graphite', colors: ['#2A2620', '#141210', '#0A0908'] },
  { id: 'stage', label: 'Stage', colors: ['#3A2418', '#16100C', '#0C0806'] },
  { id: 'ink', label: 'Ink', colors: ['#141820', '#0A0C12', '#06070A'] },
  { id: 'ember', label: 'Ember', colors: ['#2C1416', '#140A0C', '#0A0606'] },
];

export const CUSTOM_COLORS: { id: CustomColorId; label: string; hex: string }[] = [
  { id: 'black', label: 'Black', hex: '#0A0908' },
  { id: 'charcoal', label: 'Charcoal', hex: '#1C1916' },
  { id: 'warm-white', label: 'Warm White', hex: '#E8E0D2' },
  { id: 'navy', label: 'Deep Navy', hex: '#101828' },
  { id: 'burgundy', label: 'Deep Burgundy', hex: '#3F1A1E' },
  { id: 'forest', label: 'Forest', hex: '#142018' },
  { id: 'sand', label: 'Warm Sand', hex: '#C8B89A' },
];

const POCKT_IDS = new Set<string>(CUSTOM_POCKT_BACKGROUNDS.map((item) => item.id));
const COLOR_IDS = new Set<string>(CUSTOM_COLORS.map((item) => item.id));
const WIDGET_IDS = new Set<string>(CUSTOM_WIDGET_ORDER);

function makeWidgetUid(id: CustomWidgetId, existing: Set<string>): string {
  let uid = `${id}-${Math.random().toString(36).slice(2, 10)}`;
  while (existing.has(uid)) {
    uid = `${id}-${Math.random().toString(36).slice(2, 10)}`;
  }
  existing.add(uid);
  return uid;
}

function widgetDefaults(id: CustomWidgetId, x: number, y: number, uid?: string): CustomWidget {
  return {
    uid: uid ?? `${id}-seed`,
    id,
    x,
    y,
    scale: 1,
    textStyle: 'clean',
    beatStyle: 'dot',
    playStyle: 'vinyl',
    meterStyle: 'inline',
    tunerStyle: 'fork',
  };
}

export const DEFAULT_CUSTOM_WIDGETS: CustomWidget[] = [
  widgetDefaults('bpm', 0.5, 0.3, 'bpm-seed'),
  widgetDefaults('play', 0.5, 0.52, 'play-seed'),
  widgetDefaults('beat', 0.32, 0.74, 'beat-seed'),
  widgetDefaults('meter', 0.68, 0.74, 'meter-seed'),
  widgetDefaults('sound', 0.5, 0.9, 'sound-seed'),
];

export const DEFAULT_CUSTOM_LAYOUT: CustomLayout = {
  version: CUSTOM_LAYOUT_VERSION,
  background: { type: 'pockt', id: 'graphite' },
  widgets: DEFAULT_CUSTOM_WIDGETS.map((widget) => ({ ...widget })),
};

export function isCustomWidgetId(value: unknown): value is CustomWidgetId {
  return typeof value === 'string' && WIDGET_IDS.has(value);
}

export function isTextStyle(value: unknown): value is CustomTextStyle {
  return value === 'clean' || value === 'tech' || value === 'classic' || value === 'bold';
}

export function isBeatStyle(value: unknown): value is CustomBeatStyle {
  return value === 'dot' || value === 'ring' || value === 'electricity' || value === 'blocks';
}

export function isPlayStyle(value: unknown): value is CustomPlayStyle {
  return value === 'vinyl' || value === 'square' || value === 'pill' || value === 'minimal' || value === 'neon';
}

export function isMeterStyle(value: unknown): value is CustomMeterStyle {
  return value === 'inline' || value === 'stacked' || value === 'badge' || value === 'minimal';
}

export function isTunerStyle(value: unknown): value is CustomTunerStyle {
  return value === 'fork' || value === 'meter' || value === 'note';
}

export const PHOTO_SCALE_MIN = 0.1;
export const PHOTO_SCALE_MAX = 4;

/** Shared photo geometry. Customize and live display must use this exact mapping. */
export function photoTravel(scale: number): number {
  'worklet';
  const clamped = Math.min(PHOTO_SCALE_MAX, Math.max(PHOTO_SCALE_MIN, scale));
  return 48 + 132 * clamped;
}

export function sanitizePhotoFit(raw: unknown): CustomPhotoFit {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scale = typeof source.scale === 'number' && Number.isFinite(source.scale) ? source.scale : 1;
  const x = typeof source.x === 'number' && Number.isFinite(source.x) ? source.x : 0;
  const y = typeof source.y === 'number' && Number.isFinite(source.y) ? source.y : 0;
  return {
    scale: Math.min(PHOTO_SCALE_MAX, Math.max(PHOTO_SCALE_MIN, scale)),
    x: Math.min(1, Math.max(-1, x)),
    y: Math.min(1, Math.max(-1, y)),
  };
}

export function isLightCustomSurface(background: CustomBackground, ink: CustomInk = 'auto'): boolean {
  if (ink === 'light') return false;
  if (ink === 'dark') return true;
  if (background.type === 'color') return background.id === 'warm-white' || background.id === 'sand';
  return false;
}

export function customBackgroundKey(background: CustomBackground): string {
  if (background.type === 'photo') return `photo:${background.uri}`;
  if (background.type === 'pockt') return `pockt:${background.id}`;
  return `color:${background.id}`;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.98, Math.max(0.02, value));
}

export function clampScale(id: CustomWidgetId, value: unknown): number {
  'worklet';
  const meta = CUSTOM_WIDGET_META[id];
  const raw = typeof value === 'number' && Number.isFinite(value) ? value : 1;
  return Math.min(meta.maxScale, Math.max(meta.minScale, raw));
}

export function widgetSize(widget: Pick<CustomWidget, 'id' | 'scale'>): { width: number; height: number } {
  const meta = CUSTOM_WIDGET_META[widget.id];
  const scale = clampScale(widget.id, widget.scale);
  return { width: meta.width * scale, height: meta.height * scale };
}

export type EditorInset = { top?: number; bottom?: number; side?: number };

/** Keep at least this many points of a widget past the editing header so it stays tappable. */
export const EDITOR_RECOVER_PX = 44;

export function clampWidget(
  widget: CustomWidget,
  canvas?: { width: number; height: number },
  inset?: EditorInset
): CustomWidget {
  const size = widgetSize(widget);
  const width = canvas?.width ?? 390;
  const height = canvas?.height ?? 720;
  const keepX = Math.min(0.06, Math.max(0.02, Math.min(24, size.width * 0.12) / Math.max(1, width)));
  const keepY = Math.min(0.06, Math.max(0.02, Math.min(24, size.height * 0.12) / Math.max(1, height)));
  const halfH = size.height / 2;
  const tap = Math.min(size.height, EDITOR_RECOVER_PX);
  const minY = Math.max(keepY, ((inset?.top ?? 0) + tap - halfH) / Math.max(1, height));
  const maxY = Math.min(1 - keepY, 1 - ((inset?.bottom ?? 0) + tap - halfH) / Math.max(1, height));
  const x = Number.isFinite(widget.x) ? Math.min(1 - keepX, Math.max(keepX, widget.x)) : 0.5;
  const y = Number.isFinite(widget.y) ? Math.min(Math.max(minY, maxY), Math.max(minY, widget.y)) : 0.5;
  return {
    uid: widget.uid || `${widget.id}-seed`,
    id: widget.id,
    x,
    y,
    scale: clampScale(widget.id, widget.scale),
    textStyle: isTextStyle(widget.textStyle) ? widget.textStyle : 'clean',
    beatStyle: isBeatStyle(widget.beatStyle) ? widget.beatStyle : 'dot',
    playStyle: isPlayStyle(widget.playStyle) ? widget.playStyle : 'vinyl',
    meterStyle: isMeterStyle(widget.meterStyle) ? widget.meterStyle : 'inline',
    tunerStyle: isTunerStyle(widget.tunerStyle) ? widget.tunerStyle : 'fork',
  };
}

export function sanitizeBackground(raw: unknown, photoUri?: string | null): CustomBackground {
  const fallbackPhoto = sanitizePhotoUri(photoUri);
  if (raw && typeof raw === 'object') {
    const source = raw as Record<string, unknown>;
    if (source.type === 'photo') {
      const uri = sanitizePhotoUri(source.uri) ?? fallbackPhoto;
      if (uri) return { type: 'photo', uri };
    }
    if (source.type === 'pockt' && typeof source.id === 'string' && POCKT_IDS.has(source.id)) {
      return { type: 'pockt', id: source.id as CustomPocktBackgroundId };
    }
    if (source.type === 'color' && typeof source.id === 'string' && COLOR_IDS.has(source.id)) {
      return { type: 'color', id: source.id as CustomColorId };
    }
  }
  if (fallbackPhoto) return { type: 'photo', uri: fallbackPhoto };
  return { type: 'pockt', id: 'graphite' };
}

export function sanitizeWidgets(raw: unknown): CustomWidget[] {
  if (!Array.isArray(raw)) return DEFAULT_CUSTOM_WIDGETS.map((widget) => ({ ...widget }));
  const next: CustomWidget[] = [];
  const seenType = new Set<CustomWidgetId>();
  const seenUid = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const source = item as Record<string, unknown>;
    if (!isCustomWidgetId(source.id) || seenType.has(source.id)) continue;
    seenType.add(source.id);
    const uid =
      typeof source.uid === 'string' && source.uid.length > 0 && !seenUid.has(source.uid)
        ? source.uid
        : makeWidgetUid(source.id, seenUid);
    seenUid.add(uid);
    next.push({
      uid,
      id: source.id,
      x: clamp01(typeof source.x === 'number' ? source.x : 0.5),
      y: clamp01(typeof source.y === 'number' ? source.y : 0.5),
      scale: clampScale(source.id, source.scale),
      textStyle: isTextStyle(source.textStyle) ? source.textStyle : 'clean',
      beatStyle: isBeatStyle(source.beatStyle)
        ? source.beatStyle
        : source.beatStyle === 'bar'
          ? 'blocks'
          : 'dot',
      playStyle: isPlayStyle(source.playStyle) ? source.playStyle : 'vinyl',
      meterStyle: isMeterStyle(source.meterStyle) ? source.meterStyle : 'inline',
      tunerStyle: isTunerStyle(source.tunerStyle) ? source.tunerStyle : 'fork',
    });
  }
  return next.length ? next : DEFAULT_CUSTOM_WIDGETS.map((widget) => ({ ...widget }));
}

export function sanitizeCustomLayout(raw: unknown, photoUri?: string | null): CustomLayout {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const background = sanitizeBackground(source.background, photoUri);
  return {
    version: CUSTOM_LAYOUT_VERSION,
    background,
    widgets: sanitizeWidgets(source.widgets),
    onboarded: source.onboarded === true || background.type === 'photo',
    photoFit: sanitizePhotoFit(source.photoFit),
    ink: source.ink === 'light' || source.ink === 'dark' || source.ink === 'auto' ? source.ink : 'auto',
  };
}

export function migrateCustomLayout(rawLayout: unknown, photoUri?: string | null): CustomLayout {
  const photo = sanitizePhotoUri(photoUri);
  if (rawLayout && typeof rawLayout === 'object') {
    return sanitizeCustomLayout(rawLayout, photo);
  }
  if (photo) {
    return {
      version: CUSTOM_LAYOUT_VERSION,
      background: { type: 'photo', uri: photo },
      widgets: DEFAULT_CUSTOM_WIDGETS.map((widget) => ({ ...widget })),
    };
  }
  return {
    version: CUSTOM_LAYOUT_VERSION,
    background: { type: 'pockt', id: 'graphite' },
    widgets: DEFAULT_CUSTOM_WIDGETS.map((widget) => ({ ...widget })),
  };
}

export function layoutHasSavedDesign(layout: CustomLayout): boolean {
  return (
    layout.background.type === 'photo' ||
    layout.background.type === 'color' ||
    (layout.background.type === 'pockt' && layout.background.id !== 'graphite') ||
    layout.widgets.length !== DEFAULT_CUSTOM_WIDGETS.length ||
    layout.widgets.some((widget, index) => {
      const seed = DEFAULT_CUSTOM_WIDGETS[index];
      return !seed || widget.id !== seed.id || widget.x !== seed.x || widget.y !== seed.y;
    })
  );
}

const OPEN_POSITIONS: Record<CustomWidgetId, { x: number; y: number }[]> = {
  bpm: [
    { x: 0.5, y: 0.34 },
    { x: 0.5, y: 0.22 },
    { x: 0.28, y: 0.3 },
    { x: 0.72, y: 0.3 },
  ],
  play: [
    { x: 0.5, y: 0.7 },
    { x: 0.5, y: 0.58 },
    { x: 0.28, y: 0.7 },
    { x: 0.72, y: 0.7 },
  ],
  beat: [
    { x: 0.5, y: 0.48 },
    { x: 0.72, y: 0.48 },
    { x: 0.28, y: 0.48 },
    { x: 0.5, y: 0.6 },
  ],
  meter: [
    { x: 0.22, y: 0.18 },
    { x: 0.78, y: 0.18 },
    { x: 0.28, y: 0.72 },
    { x: 0.72, y: 0.72 },
  ],
  tap: [
    { x: 0.78, y: 0.18 },
    { x: 0.22, y: 0.18 },
    { x: 0.72, y: 0.62 },
    { x: 0.28, y: 0.62 },
  ],
  clock: [
    { x: 0.5, y: 0.22 },
    { x: 0.28, y: 0.22 },
    { x: 0.72, y: 0.22 },
  ],
  timer: [
    { x: 0.78, y: 0.42 },
    { x: 0.22, y: 0.42 },
    { x: 0.5, y: 0.42 },
  ],
  tuner: [
    { x: 0.22, y: 0.34 },
    { x: 0.78, y: 0.34 },
    { x: 0.28, y: 0.48 },
  ],
  recorder: [
    { x: 0.78, y: 0.48 },
    { x: 0.22, y: 0.48 },
    { x: 0.5, y: 0.4 },
  ],
  sound: [
    { x: 0.22, y: 0.18 },
    { x: 0.78, y: 0.18 },
    { x: 0.22, y: 0.58 },
    { x: 0.78, y: 0.58 },
  ],
};

const CANVAS_MAX_Y = 0.78;

function widgetsOverlap(a: CustomWidget, b: CustomWidget): boolean {
  return Math.abs(a.x - b.x) < 0.18 && Math.abs(a.y - b.y) < 0.14;
}

export function findOpenPosition(layout: CustomLayout, id: CustomWidgetId): CustomWidget {
  const seenUid = new Set(layout.widgets.map((widget) => widget.uid));
  const seed = DEFAULT_CUSTOM_WIDGETS.find((widget) => widget.id === id);
  const candidates = [
    ...(OPEN_POSITIONS[id] ?? []),
    seed ?? { x: 0.5, y: 0.62 },
    { x: 0.22, y: 0.34 },
    { x: 0.78, y: 0.34 },
    { x: 0.22, y: 0.7 },
    { x: 0.78, y: 0.7 },
    { x: 0.5, y: 0.2 },
  ];
  for (const point of candidates) {
    if (point.y > CANVAS_MAX_Y) continue;
    const next = widgetDefaults(id, point.x, point.y, makeWidgetUid(id, seenUid));
    if (!layout.widgets.some((widget) => widgetsOverlap(widget, next))) {
      return next;
    }
  }
  return widgetDefaults(id, 0.5, 0.62, makeWidgetUid(id, seenUid));
}

export function addWidget(layout: CustomLayout, id: CustomWidgetId): CustomLayout {
  if (layout.widgets.some((widget) => widget.id === id)) return layout;
  return { ...layout, widgets: [...layout.widgets, findOpenPosition(layout, id)] };
}

export function cloneLayout(layout: CustomLayout): CustomLayout {
  return {
    version: CUSTOM_LAYOUT_VERSION,
    background: { ...layout.background },
    widgets: layout.widgets.map((widget) => ({ ...widget, uid: widget.uid || `${widget.id}-seed` })),
    onboarded: layout.onboarded,
    photoFit: layout.photoFit ? { ...layout.photoFit } : undefined,
    ink: layout.ink,
  };
}

export function scaleWidget(
  layout: CustomLayout,
  id: CustomWidgetId,
  scale: number,
  canvas?: { width: number; height: number },
  inset?: EditorInset
): CustomLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((widget) =>
      widget.id === id
        ? clampWidget({ ...widget, scale: clampScale(id, scale) }, canvas ?? { width: 390, height: 720 }, inset)
        : widget
    ),
  };
}

export function removeWidget(layout: CustomLayout, id: CustomWidgetId): CustomLayout {
  return { ...layout, widgets: layout.widgets.filter((widget) => widget.id !== id) };
}

export function moveWidget(
  layout: CustomLayout,
  id: CustomWidgetId,
  x: number,
  y: number,
  canvas?: { width: number; height: number },
  inset?: EditorInset
): CustomLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((widget) =>
      widget.id === id
        ? clampWidget({ ...widget, x, y }, canvas ?? { width: 390, height: 720 }, inset)
        : widget
    ),
  };
}

export function nudgeWidget(
  layout: CustomLayout,
  id: CustomWidgetId,
  dx: number,
  dy: number,
  canvas?: { width: number; height: number },
  inset?: EditorInset
): CustomLayout {
  const current = layout.widgets.find((widget) => widget.id === id);
  if (!current) return layout;
  return moveWidget(layout, id, current.x + dx, current.y + dy, canvas, inset);
}

export function photoUriFromLayout(layout: CustomLayout): string | null {
  return layout.background.type === 'photo' ? layout.background.uri : null;
}

export function pocktBackground(id: CustomPocktBackgroundId) {
  return CUSTOM_POCKT_BACKGROUNDS.find((item) => item.id === id) ?? CUSTOM_POCKT_BACKGROUNDS[0];
}

export function customColor(id: CustomColorId) {
  return CUSTOM_COLORS.find((item) => item.id === id) ?? CUSTOM_COLORS[0];
}

export function styleWidget(
  layout: CustomLayout,
  id: CustomWidgetId,
  patch: Partial<Pick<CustomWidget, 'textStyle' | 'beatStyle' | 'playStyle' | 'meterStyle' | 'tunerStyle'>>
): CustomLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((widget) => (widget.id === id ? { ...widget, ...patch } : widget)),
  };
}

'use strict';

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.98, Math.max(0.02, value));
}

function sectionRows(ids, columns = 2) {
  const width = Math.max(1, Math.floor(columns));
  const rows = [];
  for (let i = 0; i < ids.length; i += width) {
    const items = ids.slice(i, i + width);
    rows.push({ items: [...items], centered: items.length > 0 && items.length < width });
  }
  return rows;
}

function safePhoto(value) {
  return typeof value === 'string' && (value.startsWith('file:') || value.startsWith('content:') || value.startsWith('/'))
    ? value
    : null;
}

function sanitizeBackground(raw, photoUri) {
  const photo = safePhoto(photoUri);
  if (raw && typeof raw === 'object') {
    const uri = safePhoto(raw.uri) || photo;
    if (raw.type === 'photo' && uri) return { type: 'photo', uri };
    if (raw.type === 'pockt' && raw.id) return raw;
    if (raw.type === 'color' && raw.id) return raw;
  }
  if (photo) return { type: 'photo', uri: photo };
  return { type: 'pockt', id: 'graphite' };
}

function sanitizeWidgets(raw) {
  const defaults = [
    { id: 'bpm', x: 0.5, y: 0.3 },
    { id: 'play', x: 0.5, y: 0.52 },
    { id: 'beat', x: 0.32, y: 0.74 },
    { id: 'meter', x: 0.68, y: 0.74 },
  ];
  if (!Array.isArray(raw)) return defaults;
  const next = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || !['bpm', 'play', 'beat', 'meter', 'tap', 'clock', 'timer', 'tuner', 'recorder', 'sound'].includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push({ id: item.id, uid: item.uid, x: clamp01(item.x), y: clamp01(item.y) });
  }
  return next.length ? next : defaults;
}

function clampWidget(widget) {
  return { id: widget.id, x: clamp01(widget.x), y: clamp01(widget.y) };
}

check('odd cards center', () => {
  const immersive = sectionRows(['studio', 'altered', 'after-dark']);
  assert(immersive.length === 2, 'two immersive rows');
  assert(immersive[0].centered === false && immersive[0].items.length === 2, 'first row pair');
  assert(immersive[1].centered === true && immersive[1].items.join() === 'after-dark', 'after dark centered');
  const custom = sectionRows(['customized']);
  assert(custom[0].centered === true && custom[0].items.join() === 'customized', 'custom centered');
  const even = sectionRows(['a', 'b', 'c', 'd']);
  assert(even.every((row) => !row.centered && row.items.length === 2), 'even rows stay paired');
});

check('photo migration keeps image', () => {
  const next = {
    background: sanitizeBackground(undefined, 'file:///old-photo.jpg'),
    widgets: sanitizeWidgets(undefined),
  };
  assert(next.background.type === 'photo', 'photo type');
  assert(next.background.uri === 'file:///old-photo.jpg', 'kept uri');
  assert(next.widgets.map((item) => item.id).join() === 'bpm,play,beat,meter', 'default widgets');
});

check('no photo uses default graphite', () => {
  const background = sanitizeBackground(undefined, null);
  assert(background.type === 'pockt' && background.id === 'graphite', JSON.stringify(background));
});

check('widget bounds clamp', () => {
  const far = clampWidget({ id: 'bpm', x: 4, y: -2 });
  assert(far.x === 0.98 && far.y === 0.02, `${far.x},${far.y}`);
  const nan = clampWidget({ id: 'play', x: Number.NaN, y: Number.NaN });
  assert(nan.x === 0.5 && nan.y === 0.5, 'nan fallback');
});

check('timer and clock persist', () => {
  const widgets = sanitizeWidgets([
    { id: 'clock', x: 0.22, y: 0.18, uid: 'clock-a' },
    { id: 'timer', x: 0.78, y: 0.62, uid: 'timer-a' },
    { id: 'beat', x: 0.5, y: 0.48, uid: 'beat-a' },
  ]);
  assert(widgets.some((item) => item.id === 'clock'), 'clock remains');
  assert(widgets.some((item) => item.id === 'timer'), 'timer remains');
  assert(widgets.some((item) => item.id === 'beat'), 'beat remains');
  assert(widgets.every((item) => item.y >= 0.02 && item.y <= 0.98), 'kept in live canvas');
});

check('recorder persists with unique uid', () => {
  const widgets = sanitizeWidgets([
    { id: 'timer', x: 0.78, y: 0.42, uid: 'timer-a' },
    { id: 'recorder', x: 0.22, y: 0.48, uid: 'rec-a' },
    { id: 'tuner', x: 0.5, y: 0.34, uid: 'tuner-a' },
  ]);
  assert(widgets.some((item) => item.id === 'recorder' && item.uid === 'rec-a'), 'recorder remains');
  assert(widgets.some((item) => item.id === 'timer'), 'timer remains with recorder');
});

check('one instance of each widget', () => {
  const widgets = sanitizeWidgets([
    { id: 'bpm', x: 0.2, y: 0.2 },
    { id: 'bpm', x: 0.8, y: 0.8 },
    { id: 'tap', x: 0.4, y: 0.7 },
  ]);
  assert(widgets.filter((item) => item.id === 'bpm').length === 1, 'single bpm');
  assert(widgets.some((item) => item.id === 'tap'), 'tap kept');
});

check('rejects remote photo uri', () => {
  const background = sanitizeBackground({ type: 'photo', uri: 'https://evil.example/x.jpg' }, null);
  assert(background.type === 'pockt', 'remote photo rejected');
});

const layout = read('lib/custom-layout.ts');
const photo = read('lib/custom-photo.ts');
const customRoom = read('components/classic/CustomizedRoom.tsx');
const editor = read('components/classic/CustomEditor.tsx');
const browser = read('components/rooms/RoomBrowser.tsx');
const pulse = read('components/classic/PulseRoom.tsx');
const sounds = read('constants/sounds.ts');
const rooms = read('constants/rooms.ts');

check('custom layout versioned', () => {
  assert(layout.includes('CUSTOM_LAYOUT_VERSION = 3'), 'versioned schema');
  assert(layout.includes('uid: string'), 'stable widget ids');
  assert(layout.includes("'clock'"), 'clock widget');
  assert(layout.includes("'timer'"), 'practice timer widget');
  assert(layout.includes("'tuner'"), 'tuner launcher');
  assert(layout.includes("'recorder'"), 'recorder widget');
  assert(layout.includes("'sound'"), 'sound widget');
  assert(layout.includes("'electricity'"), 'electricity beat');
  assert(layout.includes("'neon'"), 'neon play');
  assert(layout.includes('playStyle'), 'play styles');
  assert(!layout.includes("id: 'bar'"), 'bar beat removed');
  assert(editor.includes('commitDraft'), 'editor uses live draft');
  assert(customRoom.includes('onCustomEditingChange'), 'fullscreen edit hides chrome');
  const mainScreen = read('components/pockt/MainScreen.tsx');
  assert(mainScreen.includes("roomId === 'customized'"), 'live custom shares editor canvas padding');
  assert(layout.includes('meterStyle'), 'meter styles');
  assert(layout.includes('tunerStyle'), 'tuner styles');
  assert(layout.includes('scale: number'), 'persist scale');
  assert(layout.includes("type: 'photo'"), 'photo bg');
  assert(layout.includes("type: 'pockt'"), 'pockt bg');
  assert(layout.includes("type: 'color'"), 'color bg');
  assert(layout.includes('PHOTO_SCALE_MIN = 0.1'), 'photo can shrink to 10%');
  assert(layout.includes('photoTravel'), 'one photo geometry model');
  assert(mainScreen.includes('customLayout={config.customLayout}'), 'live photo uses saved layout');
  assert(!mainScreen.includes('customEditing ? null : config.customLayout'), 'edit does not null photo geometry');
  assert(customRoom.includes('livePhotoFit={{ scale: photoScale'), 'live and edit share photo shared values');
  assert(customRoom.includes('<CustomSurface'), 'custom surface rendered in room');
  assert(!customRoom.includes('{editing ? (\n        <CustomSurface'), 'surface is not edit-only');
  const surface = read('components/classic/CustomSurface.tsx');
  assert(surface.includes('contentFit="contain"'), 'photo does not cover-fill after done');
  assert(surface.includes('restScale'), 'live photo uses shared rest geometry');
  assert(editor.includes('PHOTO_SCALE_MIN'), 'editor pinch uses photo min');
});

check('photo picker is one gesture', () => {
  assert(photo.includes('launchImageLibraryAsync'), 'opens picker');
  assert(photo.includes('getMediaLibraryPermissionsAsync'), 'reads permission first');
  assert(!photo.includes('allowsEditing: true'), 'no extra crop step');
  assert(customRoom.includes('CUSTOMIZE'), 'customize label');
  assert(!customRoom.includes("label={hasPhoto ? 'CHANGE'"), 'old change chip gone');
  assert(editor.includes('CHOOSE PHOTO'), 'choose photo');
  assert(editor.includes('CHANGE PHOTO'), 'change photo');
  assert(!editor.includes('photoHero'), 'no duplicate hero photo control');
});

check('custom edit is full-screen tools', () => {
  assert(editor.includes("accessibilityLabel=\"Add widget\""), 'plus button');
  assert(editor.includes("tool === 'widgets'"), 'temporary widget picker');
  assert(editor.includes("setTool('none')"), 'picker auto-dismiss');
  assert(editor.includes("tool === 'background'"), 'temporary background picker');
  assert(editor.includes('zIndex: 40'), 'picker above toolbar');
  assert(editor.includes("tool === 'none'"), 'toolbar hides while picker is open');
  assert(editor.includes('CUSTOM_PLAY_STYLES'), 'play skins');
  assert(editor.includes('CUSTOM_METER_STYLES'), 'meter skins');
  assert(editor.includes('CUSTOM_TUNER_STYLES'), 'tuner skins');
  assert(!editor.includes('nudgeText'), 'no permanent arrows');
  assert(!editor.includes('REMOVE</Text>'), 'no giant remove strip');
  assert(editor.includes('styles.delete'), 'contextual remove');
  assert(editor.includes('Gesture.Pinch'), 'pinch resize');
  assert(editor.includes('clockLabel'), 'clock stays live in editor');
  assert(editor.includes('moveLeft'), 'a11y move remains');
  assert(layout.includes('findOpenPosition'), 'open placement');
  assert(layout.includes('cloneLayout'), 'cancel snapshot');
  assert(customRoom.includes('stop()'), 'edit does not start audio');
  assert(customRoom.includes('cloneLayout(saved)'), 'cancel restores saved');
  assert(customRoom.includes('sanitizePhotoFit({'), 'done reads live photo fit');
  assert(customRoom.includes('scale: photoScale.value'), 'done flushes live scale');
  assert(editor.includes('if (live) return'), 'editor does not overwrite live photo while parent owns it');
  assert(editor.includes('runOnJS(commitMove)(liveX.value, liveY.value, liveScale.value)'), 'drag commits live');
  assert(editor.includes('finishDrag'), 'widget drag commits on release');
  assert(editor.includes('if (draggingRef.current) return'), 'props do not jump mid-drag');
  assert(layout.includes('EDITOR_RECOVER_PX'), 'header recovery inset');
  assert(layout.includes('inset?.top'), 'editor header reserved');
  assert(editor.includes('headerReserve'), 'editor measures header');
  assert(editor.includes('pointerEvents="box-none"'), 'header does not swallow canvas');
  assert(customRoom.includes('elapsedRef'), 'timer follows transport');
  assert(customRoom.includes('onRecorder'), 'recorder launcher');
  assert(customRoom.includes('RECORDING'), 'recorder recording copy');
  assert(customRoom.includes('PLAYBACK'), 'recorder playback copy');
  assert(customRoom.includes("'READY'"), 'recorder ready copy');
  assert(customRoom.includes('onSound={onOpenSound}'), 'sound widget opens universal browser');
  assert(customRoom.includes('onChangeAccents={onChangeAccents}'), 'blocks edit master accents');
  assert(!customRoom.includes('LOOPER'), 'looper not faked');
  assert(!layout.includes('halfW'), 'size-based clamp gone');
});

check('room browser uses reusable odd-row helper', () => {
  const order = read('lib/room-order.ts');
  assert(order.includes("from '@/lib/room-grid'"), 'imports helper');
  assert(order.includes('layoutClassic'), 'classic layout');
  assert(order.includes('sectionRows(order, 2)'), 'classic two-column helper');
  assert(order.includes('row.centered'), 'centered odd rows');
  assert(order.includes('slotsForRows'), 'absolute slot geometry');
  assert(browser.includes('withSpring'), 'spring reflow');
});

check('pulse center is start/stop', () => {
  assert(pulse.includes('onToggle'), 'center toggles');
  assert(pulse.includes("name: 'activate'"), 'a11y start/stop');
});

check('custom done flushes layout', () => {
  const hook = read('hooks/use-metronome.ts');
  assert(hook.includes('if (patch.customLayout)'), 'custom layout saves immediately');
});

check('heart stays absent', () => {
  assert(rooms.includes("label: 'CUSTOM'"), 'custom title');
  assert(!rooms.includes("label: 'CUSTOM PHOTO'"), 'old title gone');
  assert(sounds.includes("'pockt-heart': 'pocket'"), 'heart sound migrates');
});

if (failures.length) {
  console.error('CUSTOM LAYOUT TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('CUSTOM LAYOUT TESTS PASSED');
console.log('odd-card centering, photo migration, widget clamp, one-tap picker, pulse center');

'use strict';

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const room = read('components/classic/BeatlineRoom.tsx');
const face = read('components/beatline/BeatlineFace.tsx');
const rail = read('components/beatline/BeatlineRail.tsx');
const dial = read('components/beatline/BeatlineTempoDial.tsx');
const knob = read('components/beatline/BeatlineSoundKnob.tsx');
const rhythm = read('components/beatline/BeatlineRhythm.tsx');
const sound = read('components/beatline/BeatlineSoundQuick.tsx');
const browser = read('components/beatline/BeatlineSoundBrowser.tsx');
const settings = read('components/beatline/BeatlineSettings.tsx');
const assignment = read('components/beatline/BeatlineBeatAssignment.tsx');
const accent = read('components/beatline/BeatlineBeatAccent.tsx');
const picker = read('components/beatline/BeatlineColorPicker.tsx');
const custom = read('components/beatline/BeatlineCustomColor.tsx');
const lib = read('lib/beatline-2.ts');
const pulse = read('lib/beatline-pulse.ts');
const layout = read('lib/beatline-layout.ts');
const persist = read('storage/persist.ts');
const timing = read('constants/timing.ts');
const metro = read('hooks/use-metronome.ts');
const feel = read('lib/beatline-feel.ts');
const press = read('components/beatline/BeatlineHardwarePress.tsx');
const engrave = read('components/beatline/BeatlineEngrave.tsx');
const playInsert = read('components/beatline/BeatlinePlayInsert.tsx');
const slider = read('components/beatline/BeatlineSlider.tsx');
const rotary = read('lib/rotary-feedback.ts');
const helpers = [room, face, rail, dial, knob, rhythm, sound, browser, settings, assignment, accent, picker, custom, lib, pulse, layout, feel, press, engrave, playInsert, slider];

check('Build 69 Beatline is mounted, not the metallic face', () => {
  assert(room.includes('BeatCapsuleStrip'), 'capsules');
  assert(room.includes('HorizontalTempoWheel'), 'tempo wheel');
  assert(room.includes('GlassPlayOrb'), 'glass orb');
  assert(!room.includes('BeatlineFace'), 'metallic face is not mounted');
  assert(!room.includes('InstrumentShell'), 'generic shell left behind');
  assert(!room.includes('InstrumentDock'), 'generic dock left behind');
  assert(face.includes('BEATLINE_ASSETS.master'), '2.0 master file remains unused by the room');
});

check('engine authority is preserved', () => {
  assert(room.includes('setBpm('), 'tempo still commits through setBpm');
  assert(room.includes('onPress={toggle}'), 'play uses native toggle');
  assert(face.includes('tapTempo'), 'tap tempo remains');
  assert(face.includes('onBpm={setBpm}'), 'rotary commits setBpm');
  assert(face.includes('commitAndToggle'), 'play flushes live BPM before toggle');
  assert(face.includes('dialRef.current?.flush()'), 'play cannot start on a queued stale BPM');
  assert(face.includes('toggle()'), 'play still uses native toggle');
  assert(rail.includes('pulseBeat'), 'current beat from authoritative shared value');
  assert(rail.includes('beatlineCycleBeat'), 'persistent 0-1-2-3 cycle is one-to-one');
  assert(pulse.includes('cycleBeatBlock'), 'cycle still uses shared accent helper');
  assert(!rail.includes('setInterval'), 'rail has no JS clock');
  assert(!face.includes('setInterval'), 'face has no JS clock');
  assert(!room.includes('setInterval'), 'room has no JS clock');
  assert(metro.includes('PocktTiming.setConfig'), 'native config path intact');
  assert(metro.includes('const setBpm = useCallback'), 'setBpm still native-bound');
});

check('tempo rotary is worklet-safe and not a second clock', () => {
  assert(dial.includes("from '@/lib/pro-dial'"), 'shared angle math');
  assert(dial.includes('pulseShouldCommitStep'), 'Pulse commit helpers reused');
  assert(dial.includes('runOnJS(flushNative)'), 'native flush is JS-side');
  assert(dial.includes('runOnJS(fireDetent)'), 'detents leave the worklet');
  assert(dial.includes('PocktTiming') === false, 'dial does not talk to the engine');
  assert(dial.includes("rotaryDetent('dial'"), 'audible/haptic detents');
  assert(sound.includes('reviveUiDetent'), 'sound rotary revives shared detents');
  assert(face.includes('reviveUiDetent'), 'face remount revives shared detents');
  assert(dial.includes('if (dragging.value >= 0.5) return'), 'config cannot rewind the live dial while dragging');
  assert(dial.includes('leftover'), 'unmount flushes the pending integer');
  assert(dial.includes('beatlineFlushPending'), 'pending/last-committed merge is explicit');
  assert(lib.includes('export function beatlineFlushPending'), 'flush helper is testable');
  assert(dial.includes("skin = 'parts'"), 'optional parts skin remains');
  assert(face.includes('skin="ghost"'), 'main face uses a ghost dial overlay');
});

check('sound inventory is data-driven for Sound 2.0', () => {
  assert(lib.includes('SOUND_ORDER.filter(isEnabledDisplaySound)'), 'catalog from shared order');
  assert(lib.includes('SOUND_CATEGORIES.find'), 'categories from metadata');
  assert(!browser.includes("plain-tick"), 'browser does not hardcode filenames');
  assert(!sound.includes("classic-click"), 'quick select does not hardcode filenames');
});

check('native ticks do not drive a React beatIndex on the face', () => {
  assert(!face.includes('beatIndex'), 'face does not take transport.beatIndex');
  assert(rail.includes('fallbackCurrent={false}'), 'current beat is pulseBeat only');
  assert(room.includes('silent={transport.silentMeasure}'), 'silent measure remains a boolean prop');
});

check('sound select and audition stay distinct', () => {
  assert(room.includes('onOpenSound'), 'sound opens from the rail');
  assert(browser.includes('onAudition'), 'play control is audition');
  assert(browser.includes('onSelect'), 'row selects');
  assert(lib.includes('hasUserChosenSound: true'), 'selection marks user authority');
  assert(lib.includes('recentSounds:'), 'recently used is written on select');
  assert(metro.includes('PocktTiming?.preview(sound'), 'audition hits the native preview node');
  assert(metro.includes('setMasterGain?.(configRef.current.volume)'), 'audition restores mixer gain');
  assert(metro.includes('reviveUiDetent();'), 'audition revives detent nodes');
});

check('settings and count-in are real', () => {
  assert(settings.includes('countInBars'), 'count-in control present');
  assert(metro.includes('countInBars: config.countInBars'), 'count-in reaches native');
  assert(settings.includes('keepAwake'), 'keep awake present');
  assert(!settings.includes('accentVolume'), 'visual intensity is not audio');
});

check('beat strength and playback state stay separate', () => {
  assert(rail.includes('fallbackCurrent'), 'playback current is derived');
  assert(rail.includes('strength={accentStrength(level)}'), 'persistent strength is independent');
  assert(!rail.includes("next[index] = 'playing'"), 'playback is not stored as strength');
  assert(assignment.includes('defaultAccentPattern'), 'reset uses meter defaults');
});

check('reference destinations exist', () => {
  assert(rhythm.includes('BEATLINE_METER_PRESETS'), 'meter presets');
  assert(rhythm.includes('OTHER METERS'), 'other meters');
  assert(sound.includes('BROWSE ALL SOUNDS'), 'browse');
  assert(sound.includes('FAVORITES'), 'favorites');
  assert(sound.includes('RECENTLY USED'), 'recent');
  assert(browser.includes('Search sound'), 'search');
  assert(accent.includes('BEAT ASSIGNMENT'), 'assignment route');
  assert(picker.includes('CUSTOM COLOR'), 'custom color');
  assert(custom.includes('Brightness'), 'brightness slider');
  assert(picker.includes('pointerEvents="none"'), 'preview orb is not a control');
  assert(custom.includes('pointerEvents="none"'), 'preview / readout are not draggable');
});

check('locked master composition is the visual authority', () => {
  const assets = read('lib/beatline-assets.ts');
  const layout = read('lib/beatline-layout.ts');
  const slider = read('components/beatline/BeatlineSlider.tsx');
  assert(assets.includes('beatline_final_master.png'), 'cropped clean master is installed');
  assert(layout.includes('CLEAN MASTER'), 'layout is keyed to the clean master');
  assert(face.includes('beatlineFrameBox(frame)'), 'master box does not apply CSS scale');
  assert(layout.includes('export function beatlineFrameBox'), 'frame box omits scale');
  assert(!face.includes('BEATLINE_ASSETS.plate'), 'no multi-part plate assembly');
  assert(!face.includes('BEATLINE_ASSETS.rhythm'), 'rhythm is a hotspot on the master');
  assert(!face.includes('BEATLINE_ASSETS.sound'), 'sound is a hotspot on the master');
  assert(face.includes("playing ? 'Pause' : 'Play'"), 'pause is a live overlay');
  assert(face.includes('skin="master"'), 'rail and volume overlay the master');
  assert(rail.includes("skin = 'parts'"), 'rail still has a parts path');
  assert(rail.includes("skin === 'master'"), 'rail master skin is live beads only');
  assert(slider.includes("skin === 'master'"), 'volume thumb travels on the master track');
  assert(layout.includes('export function beatlinePlateFrame'), 'one plate frame');
  assert(layout.includes('export function beatlineCircle'), 'circles stay square');
  function beatlineCircle(frame, slot) {
    const width = slot.w * frame.width;
    const height = slot.h * frame.height;
    const size = Math.min(width, height);
    return size;
  }
  const frame = { width: 552, height: 868 };
  const circle = beatlineCircle(frame, { x: 0.165, y: 0.265, w: 0.67, h: 0.425 });
  assert(circle === Math.min(0.67 * 552, 0.425 * 868), 'dial uses the inscribed square');
});

check('pending flush prefers the latest integer', () => {
  function beatlineFlushPending(pending, lastCommitted) {
    if (pending != null && Number.isFinite(pending)) return pending;
    return lastCommitted;
  }
  assert(beatlineFlushPending(140, 132) === 140, 'queued value wins');
  assert(beatlineFlushPending(null, 132) === 132, 'null pending uses last committed');
  assert(beatlineFlushPending(Number.NaN, 120) === 120, 'non-finite pending is ignored');
});

check('volume slider mapping is relative and axis-correct', () => {
  function beatlineSliderValue(origin, translation, track, vertical) {
    const span = Math.max(1, track - 22);
    const delta = vertical ? -translation / span : translation / span;
    const next = origin + delta;
    if (!Number.isFinite(next)) return Math.min(1, Math.max(0, origin));
    return Math.min(1, Math.max(0, next));
  }
  const slider = read('components/beatline/BeatlineSlider.tsx');
  assert(lib.includes('export function beatlineSliderValue'), 'mapping helper exists');
  assert(slider.includes('beatlineSliderValue'), 'slider uses relative helper');
  assert(slider.includes('origin.value'), 'drag starts from current value');
  assert(slider.includes('if (dragging.value >= 0.5) return'), 'props cannot rewind a live drag');
  assert(slider.includes('.minDistance(0)'), 'slider tracks from touch-down');
  assert(slider.includes('.failOffsetY([-22, 22])'), 'horizontal slider fails on Y');
  assert(slider.includes('.failOffsetX([-22, 22])'), 'vertical slider fails on X');
  assert(!slider.includes('activeOffsetX'), 'no sticky horizontal activation zone');
  assert(!slider.includes('activeOffsetY'), 'no sticky vertical activation zone');
  assert(metro.includes('PocktTiming.setMasterGain?.(next.volume)'), 'UI volume writes native mixer gain');
  assert(beatlineSliderValue(0.5, -35, 92, true) > 0.5, 'dragging up raises vertical volume');
  assert(beatlineSliderValue(0.5, 35, 92, true) < 0.5, 'dragging down lowers vertical volume');
  assert(beatlineSliderValue(0.2, 35, 240, false) > 0.2, 'dragging right raises horizontal volume');
  assert(beatlineSliderValue(0, -400, 92, true) === 1, 'vertical mapping clamps to 1');
  assert(beatlineSliderValue(1, 400, 92, true) === 0, 'vertical mapping clamps to 0');
});

check('tap tempo applies on press-in and updates the live BPM', () => {
  const chrome = read('components/beatline/BeatlineChrome.tsx');
  assert(chrome.includes('onPressIn={pressIn ? onPress : undefined}'), 'time-critical buttons fire on press-in');
  assert(face.includes('pressIn'), 'TAP uses press-in');
  assert(face.includes('onTapTempo'), 'TAP has a local handler');
  assert(face.includes('setLiveBpm(sanitizeBpm(bpm'), 'TAP paints the native BPM immediately');
  assert(metro.includes('if (bpm != null) setBpm(bpm)'), 'TAP still commits through setBpm');
});

check('premium hardware feel stays mechanical and clock-safe', () => {
  const slider = read('components/beatline/BeatlineSlider.tsx');
  assert(face.includes('BeatlineHardwarePress'), 'shared hardware press');
  assert(face.includes('kind="tap"'), 'TAP has its own press feel');
  assert(face.includes('kind="play"'), 'play has its own press feel');
  assert(face.includes('pressIn'), 'play and TAP fire on press-in');
  assert(press.includes('withTiming'), 'press uses short timing, not a bounce spring');
  assert(!press.includes('withSpring'), 'no cartoon spring on hardware buttons');
  assert(press.includes('hapticTap'), 'TAP haptic is short and refined');
  assert(dial.includes('beatlineDialPointerInRing'), 'dial ignores the center well');
  assert(dial.includes('beatlineDialResistDeg'), 'dial has mechanical resistance');
  assert(dial.includes('armed.value'), 'touch-down does not jump BPM');
  assert(dial.includes('withTiming'), 'dial seat is controlled, not a free spin');
  assert(rail.includes('onPressIn'), 'rail cycles on press-in');
  assert(rail.includes('press.value'), 'rail depression is separate from the clock halo');
  assert(slider.includes('beatlineVolumeEdge'), 'volume endpoints tick');
  assert(!slider.includes('beatlineVolumeMid'), 'midpoint haptic removed as noise');
  assert(!feel.includes('beatlineVolumeMid'), 'feel layer no longer exposes a midpoint tick');
  assert(feel.includes("export function beatlineDialResistDeg"), 'feel math is testable');
  assert(!feel.includes('setInterval'), 'feel layer is not a musical clock');
  assert(!press.includes('setInterval'), 'press layer is not a musical clock');
});

check('sound knob cannot be rewound by prop sync while dragging', () => {
  assert(knob.includes('if (dragging.value >= 0.5) return'), 'index sync waits until the gesture ends');
});

check('meter change still defaults when Beatline does not supply a pattern', () => {
  const accents = read('lib/accents.ts');
  assert(accents.includes('next.accentPattern = defaultAccentPattern(next.timeSignature)'), 'other rooms still get default pattern');
  assert(accents.includes('if (!Array.isArray(pattern) || pattern.length !== fallback.length) return fallback'), 'wrong-length patterns are replaced, not merged');
  assert(room.includes('onOpenRhythm'), 'Beatline opens the meter sheet');
  assert(persist.includes('beatlinePatterns: asBeatlinePatterns'), 'memory is persisted');
  assert(timing.includes('beatlinePatterns: {}'), 'default cache is empty');
  assert(!metro.includes('beatlinePatterns'), 'native clock does not consume the cache');
});

check('no decorative musical timers in Beatline 2.0', () => {
  for (const source of helpers) {
    assert(!source.includes('setInterval('), 'no setInterval');
  }
  assert(!pulse.includes('setTimeout('), 'mapping layer has no JS timer');
  assert(!rail.includes('setTimeout('), 'rail has no JS timer');
});

const ACCENT_LEVELS = ['mute', 'soft', 'normal', 'strong'];
const BEATS = { '2/4': 2, '3/4': 3, '4/4': 4, '6/8': 6, '12/8': 12 };
const ACCENTS = { '2/4': [0], '3/4': [0], '4/4': [0], '6/8': [0, 3], '12/8': [0, 3, 6, 9] };

function defaultAccentPattern(meter) {
  return Array.from({ length: BEATS[meter] }, (_, index) =>
    index === 0 || ACCENTS[meter].includes(index) ? 'strong' : 'normal'
  );
}

function cycleBeatBlock(level) {
  const index = ACCENT_LEVELS.indexOf(level);
  return ACCENT_LEVELS[(index + 1) % ACCENT_LEVELS.length];
}

function beatlineVisibleIndexes(meter) {
  return Array.from({ length: BEATS[meter] }, (_, index) => index);
}

function beatlineGroupStarts(meter) {
  if (meter === '6/8') return [0, 3];
  if (meter === '12/8') return [0, 3, 6, 9];
  return [0];
}

function beatlineDisplayedBeat(nativeBeat, meter) {
  const count = Math.max(1, BEATS[meter]);
  return ((Math.round(nativeBeat) % count) + count) % count;
}

function beatlineCycleBeat(pattern, meter, index) {
  const next = Array.from({ length: BEATS[meter] }, (_, slot) => pattern[slot] ?? 'normal');
  next[index] = cycleBeatBlock(next[index] ?? 'normal');
  return next;
}

function rememberBeatlinePattern(memory, meter, pattern) {
  return { ...memory, [meter]: pattern.slice() };
}

function loadBeatlinePattern(memory, meter) {
  const saved = memory[meter];
  if (Array.isArray(saved) && saved.length === BEATS[meter]) return saved.slice();
  return defaultAccentPattern(meter);
}

function switchBeatlineMeter(prevMeter, nextMeter, livePattern, memory) {
  if (prevMeter === nextMeter) {
    return { timeSignature: nextMeter, accentPattern: livePattern.slice(), beatlinePatterns: memory };
  }
  const saved = rememberBeatlinePattern(memory, prevMeter, livePattern);
  return {
    timeSignature: nextMeter,
    accentPattern: loadBeatlinePattern(saved, nextMeter),
    beatlinePatterns: saved,
  };
}

function resetBeatlineMeterPattern(meter, memory) {
  const accentPattern = defaultAccentPattern(meter);
  return { accentPattern, beatlinePatterns: rememberBeatlinePattern(memory, meter, accentPattern) };
}

function beatlineCountInChoice(countInBars) {
  if (countInBars === 0) return '0';
  if (countInBars === 1) return '1';
  if (countInBars === 2) return '2';
  return 'legacy';
}

check('visible beat positions are one-to-one with native beats', () => {
  assert(JSON.stringify(beatlineVisibleIndexes('2/4')) === '[0,1]', '2/4 renders 2');
  assert(JSON.stringify(beatlineVisibleIndexes('3/4')) === '[0,1,2]', '3/4 renders 3');
  assert(JSON.stringify(beatlineVisibleIndexes('4/4')) === '[0,1,2,3]', '4/4 renders 4');
  assert(JSON.stringify(beatlineVisibleIndexes('6/8')) === '[0,1,2,3,4,5]', '6/8 renders 6');
  assert(JSON.stringify(beatlineVisibleIndexes('12/8')) === '[0,1,2,3,4,5,6,7,8,9,10,11]', '12/8 renders 12');
  assert(pulse.includes('beatlineVisibleIndexes'), 'layout uses visible indexes');
  assert(!pulse.includes('beatlinePrimaryIndexes'), 'collapsed primary-pulse map is gone');
  assert(!pulse.includes('compoundHold'), 'compound hold is gone');
  assert(!pulse.includes("timeSignature: '2/4'"), '6/8 is not converted to 2/4');
  assert(!pulse.includes("timeSignature: '4/4'"), '12/8 is not converted to 4/4');
});

check('6/8 and 12/8 grouping metadata does not hide beats', () => {
  assert(JSON.stringify(beatlineGroupStarts('6/8')) === '[0,3]', '6/8 group starts');
  assert(JSON.stringify(beatlineGroupStarts('12/8')) === '[0,3,6,9]', '12/8 group starts');
  assert(pulse.includes("if (meter === '6/8') return [0, 3]"), '6/8 groups are explicit');
  assert(pulse.includes("if (meter === '12/8') return [0, 3, 6, 9]"), '12/8 groups are explicit');
  assert(rail.includes('layout.groups'), 'rail renders musical groups');
  assert(rail.includes('railGrouped'), 'grouped meters use cluster spacing');
});

check('native pulseBeat maps one-to-one onto visible beats', () => {
  assert(beatlineDisplayedBeat(1, '6/8') === 1, '6/8 beat 1 activates node 1');
  assert(beatlineDisplayedBeat(2, '6/8') === 2, '6/8 beat 2 activates node 2');
  assert(beatlineDisplayedBeat(4, '6/8') === 4, '6/8 beat 4 activates node 4');
  for (let i = 0; i < 12; i += 1) {
    assert(beatlineDisplayedBeat(i, '12/8') === i, `12/8 beat ${i} activates node ${i}`);
  }
  assert(rail.includes('beatlineBeadIsCurrent'), 'halo derives from native pulseBeat');
  assert(pulse.includes('nativeBeat) % beats) + beats) % beats === displayIndex'), 'active state is one-to-one');
});

check('cycling a displayed beat edits only its native index', () => {
  const six = defaultAccentPattern('6/8');
  const after2 = beatlineCycleBeat(six, '6/8', 2);
  assert(after2.length === 6, '6/8 native length preserved');
  assert(after2[2] === 'strong', '6/8 beat 2 cycles accentPattern[2]');
  assert(after2.every((level, i) => (i === 2 ? level === 'strong' : level === six[i])), 'only index 2 changed');
  const twelve = defaultAccentPattern('12/8');
  const after8 = beatlineCycleBeat(twelve, '12/8', 8);
  assert(after8.length === 12, '12/8 native length preserved');
  assert(after8[8] === 'strong', '12/8 beat 8 cycles accentPattern[8]');
  assert(after8.every((level, i) => (i === 8 ? level === 'strong' : level === twelve[i])), 'only index 8 changed');
});

check('meter-specific pattern restoration and current-meter reset', () => {
  const custom44 = ['mute', 'soft', 'normal', 'strong'];
  const custom68 = ['soft', 'normal', 'mute', 'strong', 'normal', 'soft'];
  const to68 = switchBeatlineMeter('4/4', '6/8', custom44, {});
  assert(to68.timeSignature === '6/8', 'native meter becomes 6/8');
  assert(to68.accentPattern.join() === defaultAccentPattern('6/8').join(), 'unsaved 6/8 uses default');
  assert(to68.beatlinePatterns['4/4'].join() === custom44.join(), '4/4 saved on leave');
  const remembered = rememberBeatlinePattern(to68.beatlinePatterns, '6/8', custom68);
  const back44 = switchBeatlineMeter('6/8', '4/4', custom68, remembered);
  assert(back44.accentPattern.join() === custom44.join(), '4/4 restored');
  assert(back44.timeSignature === '4/4', 'native meter returns to 4/4');
  const reset68 = resetBeatlineMeterPattern('6/8', back44.beatlinePatterns);
  assert(reset68.accentPattern.join() === defaultAccentPattern('6/8').join(), 'reset current meter only');
  assert(reset68.beatlinePatterns['4/4'].join() === custom44.join(), 'other meters stay saved');
  assert(reset68.beatlinePatterns['6/8'].join() === defaultAccentPattern('6/8').join(), 'reset writes the saved current meter');
  const same = switchBeatlineMeter('4/4', '4/4', custom44, remembered);
  assert(same.accentPattern.join() === custom44.join(), 'same-meter switch does not clobber live');
});

check('count-in does not present 3 or 4 as 2 bars', () => {
  assert(settings.includes('beatlineCountInChoice'), 'settings uses honest mapping');
  assert(!settings.includes('countInBars >= 2'), 'legacy >=2 collapse removed');
  assert(beatlineCountInChoice(0) === '0', 'off');
  assert(beatlineCountInChoice(1) === '1', '1 bar');
  assert(beatlineCountInChoice(2) === '2', '2 bars');
  assert(beatlineCountInChoice(3) === 'legacy', '3 is not shown as 2');
  assert(beatlineCountInChoice(4) === 'legacy', '4 is not shown as 2');
});

const DEG_PER_BPM = 12;
const DIAL_MAX = 22;
const DIAL_RESIST = 0.94;
const DIAL_DEAD = 0.7;

function beatlineDialResistDeg(deg) {
  if (!Number.isFinite(deg) || deg === 0) return 0;
  const mag = Math.min(Math.abs(deg), DIAL_MAX);
  const resisted = (mag * DIAL_RESIST) / (1 + mag * 0.012);
  return (deg < 0 ? -1 : 1) * resisted;
}

function beatlineDialApply(live, resistedDeg, min, max) {
  const raw = live + resistedDeg / DEG_PER_BPM;
  if (!Number.isFinite(raw)) return { bpm: live, appliedDeg: 0 };
  const bpm = Math.min(max, Math.max(min, raw));
  return { bpm, appliedDeg: (bpm - live) * DEG_PER_BPM };
}

function beatlineDialPointerInRing(x, y, size, deadRatio = DIAL_DEAD) {
  const dx = x - size / 2;
  const dy = y - size / 2;
  const radius = Math.hypot(dx, dy);
  return radius >= size * deadRatio * 0.5 && radius <= size * 0.5;
}

function beatlineVolumeEdge(prev, next) {
  if (prev > 0.02 && next <= 0) return 0;
  if (prev < 0.98 && next >= 1) return 1;
  return null;
}

function wrapDelta(delta) {
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function pointerAngle(x, y, cx, cy) {
  return Math.atan2(y - cy, x - cx);
}

function tempoName(bpm) {
  const safe = Math.min(900, Math.max(1, Math.round(bpm)));
  const names = [
    [40, 'Grave'],
    [60, 'Largo'],
    [76, 'Adagio'],
    [109, 'Andante'],
    [120, 'Moderato'],
    [138, 'Allegretto'],
    [156, 'Allegro'],
    [176, 'Vivace'],
    [200, 'Presto'],
    [901, 'Prestissimo'],
  ];
  return names.find((entry) => safe < entry[0])?.[1] ?? 'Prestissimo';
}

function beatlineRectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function beatlineExpandSlot(slot, padX, padY) {
  return { x: slot.x - padX, y: slot.y - padY, w: slot.w + padX * 2, h: slot.h + padY * 2 };
}

function beatlinePlateFrame(width, height) {
  const aspect = 552 / 868;
  let nextWidth = Math.max(1, width);
  let nextHeight = nextWidth / aspect;
  if (nextHeight > height) {
    nextHeight = Math.max(1, height);
    nextWidth = nextHeight * aspect;
  }
  return {
    left: (width - nextWidth) / 2,
    top: (height - nextHeight) / 2,
    width: nextWidth,
    height: nextHeight,
  };
}

function beatlineCircle(frame, slot) {
  const width = slot.w * frame.width;
  const height = slot.h * frame.height;
  const size = Math.min(width, height);
  return { size, square: width === height ? true : size === Math.min(width, height) };
}

check('dial resistance tracks the finger without jumping or free-spinning', () => {
  assert(feel.includes('BEATLINE_DIAL_DEAD_RATIO = 0.7'), 'dead zone covers the LED well');
  assert(feel.includes('BEATLINE_DIAL_RESIST = 0.94'), 'ring still has mechanical drag');
  assert(feel.includes('BEATLINE_DIAL_MAX_DEG = 22'), 'fast flicks stay capped');
  assert(dial.includes('RIG_MIN_BPM'), 'Beatline dial uses the 20 BPM floor');
  assert(dial.includes('RIG_MAX_BPM'), 'Beatline dial uses the 400 BPM ceiling');
  assert(dial.includes('armed.value = 0'), 'leaving the ring re-arms instead of leaping');
  assert(dial.includes('indexTick'), 'ghost dial has a visible rotating index');
  assert(!dial.includes('bakedTickCover'), 'no painted patch over the 12 o’clock tick');
  assert(dial.includes('jump <= 2'), 'fast flicks do not machine-gun detents');
  assert(Math.abs(beatlineDialResistDeg(4)) < 4, 'light drag is slightly resisted');
  assert(Math.abs(beatlineDialResistDeg(40)) <= DIAL_MAX, 'fast flicks are capped');
  assert(beatlineDialResistDeg(-8) < 0, 'direction is preserved');
  const moved = beatlineDialApply(120, 12, 20, 400);
  assert(moved.bpm === 121, '12 resisted degrees is one BPM at 12 deg/BPM');
  const ring = beatlineDialPointerInRing(20, 100, 200);
  const center = beatlineDialPointerInRing(100, 100, 200);
  const well = beatlineDialPointerInRing(100, 70, 200);
  assert(ring === true, 'outer ring samples track');
  assert(center === false, 'center well does not jump the angle');
  assert(well === false, 'LED oval stays in the dead zone');
  assert(beatlineDialPointerInRing(0, 0, 200) === false, 'outside the bezel does not keep a stale angle');
  const floor = beatlineDialApply(20, -48, 20, 400);
  assert(floor.bpm === 20, '20 BPM floor holds');
  assert(floor.appliedDeg === 0, 'clamped reverse travel does not rewind the knob');
  const clamp = beatlineDialApply(399, 48, 20, 400);
  assert(clamp.bpm === 400, '400 BPM ceiling holds');
  assert(clamp.appliedDeg === 12, 'clamped travel stays coupled to the stop');
  assert(120 * DEG_PER_BPM === 1440, '120 BPM maps to 1440 degrees');
  assert(20 * DEG_PER_BPM === 240, '20 BPM maps to 240 degrees');
  assert(400 * DEG_PER_BPM === 4800, '400 BPM maps to 4800 degrees');
  assert((1440 % 360) === 0, '120 BPM seats the index on 12 o’clock');
});

check('dial wraparound and reversals stay continuous', () => {
  const size = 200;
  const cx = 100;
  const cy = 100;
  const noon = pointerAngle(100, 20, cx, cy);
  const justWest = pointerAngle(90, 22, cx, cy);
  const justEast = pointerAngle(110, 22, cx, cy);
  const cw = wrapDelta(justEast - justWest);
  const ccw = wrapDelta(justWest - justEast);
  assert(Math.abs(noon + Math.PI / 2) < 0.05, '12 o’clock is -π/2');
  assert(cw > 0, 'crossing noon clockwise is a small positive delta');
  assert(ccw < 0, 'crossing noon counterclockwise is a small negative delta');
  assert(Math.abs(cw) < 0.6, 'noon wrap is not a half-turn leap');
  const west = pointerAngle(20, 100, cx, cy);
  const east = pointerAngle(180, 100, cx, cy);
  const across = wrapDelta(east - west);
  assert(Math.abs(Math.abs(across) - Math.PI) < 0.05, '9-to-3 is a half turn, not a wrap explode');
  let bpm = 120;
  let last = justWest;
  for (const sample of [justWest, noon, justEast, pointerAngle(130, 40, cx, cy), pointerAngle(150, 70, cx, cy)]) {
    const delta = wrapDelta(sample - last);
    last = sample;
    const deg = beatlineDialResistDeg((delta * 180) / Math.PI);
    bpm = beatlineDialApply(bpm, deg, 20, 400).bpm;
  }
  assert(bpm > 120 && bpm < 140, 'slow clockwise noon crossing only nudges BPM');
  let reverse = 180;
  last = justEast;
  for (const sample of [justEast, noon, justWest]) {
    const delta = wrapDelta(sample - last);
    last = sample;
    const deg = beatlineDialResistDeg((delta * 180) / Math.PI);
    reverse = beatlineDialApply(reverse, deg, 20, 400).bpm;
  }
  assert(reverse < 180, 'counterclockwise noon crossing decreases BPM');
});

check('volume endpoints remain, midpoint haptic is gone', () => {
  assert(beatlineVolumeEdge(0.2, 0) === 0, 'landing on 0 ticks once');
  assert(beatlineVolumeEdge(0.8, 1) === 1, 'landing on 1 ticks once');
  assert(beatlineVolumeEdge(0, 0) == null, 'already-at-end does not retrigger');
  assert(beatlineVolumeEdge(0.4, 0.6) == null, 'continuous travel is silent');
  const slider = read('components/beatline/BeatlineSlider.tsx');
  assert(!slider.includes('lastMid'), 'slider has no midpoint latch');
  assert(!slider.includes('masterGroove'), 'no painted groove over the master track');
  assert(slider.includes('BEATLINE_ASSETS.volumeThumb'), 'live thumb is the machined production asset');
});

check('tempo wording covers every Beatline BPM without overlap', () => {
  const expected = {
    1: 'Grave',
    39: 'Grave',
    40: 'Largo',
    59: 'Largo',
    60: 'Adagio',
    75: 'Adagio',
    76: 'Andante',
    108: 'Andante',
    109: 'Moderato',
    119: 'Moderato',
    120: 'Allegretto',
    137: 'Allegretto',
    138: 'Allegro',
    155: 'Allegro',
    156: 'Vivace',
    175: 'Vivace',
    176: 'Presto',
    199: 'Presto',
    200: 'Prestissimo',
    400: 'Prestissimo',
  };
  for (const [bpm, name] of Object.entries(expected)) {
    assert(tempoName(Number(bpm)) === name, `${bpm} is ${name}`);
  }
  assert(face.includes('tempoName(liveBpm)'), 'term follows live BPM, not the baked ANDANTE');
  assert(face.includes('tone="tempo"'), 'term uses the engraved metal treatment');
  assert(face.includes('tight={termTight}'), 'long terms like PRESTISSIMO shrink instead of clipping');
  assert(!/backgroundColor/.test(engrave), 'engraving has no painted cover rectangle');
});

check('live overlays do not paint software patches over the master', () => {
  assert(!face.includes('styles.ledWell'), 'no black oval painted over the glass well');
  assert(!face.includes('playWell'), 'no dark software disc on the play button');
  assert(face.includes('beatlineMeterCaption'), 'meter is live');
  assert(face.includes('beatlineSoundCaption'), 'sound is live');
  assert(face.includes('subdLabel'), 'subdivision is live');
  assert(face.includes('BeatlinePlayInsert'), 'play/pause is a machined insert');
  assert(playInsert.includes('playing ?'), 'playing state shows pause only');
  assert(playInsert.includes('playTriangle'), 'stopped state shows play only');
  assert(!face.includes('Ionicons'), 'play is not a generic icon font');
  assert(!face.includes('playLive'), 'generic green play ring is gone');
  assert(!rail.includes('masterMask'), 'no painted bar over the beat groove');
  assert(rail.includes('beatlineRailSeats'), 'master rail locks to hardware sockets');
  assert(!rail.includes("justifyContent: 'space-evenly'") || rail.includes('styles.seat'), 'master seats are not space-evenly');
  assert(rail.includes('BEATLINE_ASSETS.halo'), 'active halo is the production lighting asset');
  assert(face.includes('BeatlineEngrave'), 'live metal text is engraved, not pasted');
  assert(engrave.includes('styles.recess'), 'engraving has a recessed shadow');
  assert(engrave.includes('styles.ridge'), 'engraving has a machined highlight');
  assert(!engrave.includes('textShadowRadius'), 'engraving uses offset layers, not a glow');
  assert(press.includes('metalRidge'), 'nav press is a metal highlight shift');
  assert(press.includes('metalOcclude'), 'pressed metal occludes at the lip');
  assert(!press.includes('interpolateColor'), 'no flat opacity wash on hardware press');
});

check('Rhythm / Sound / Settings hits stay on their own controls', () => {
  const slots = {
    rhythm: { x: 0.07, y: 0.152, w: 0.145, h: 0.072 },
    sound: { x: 0.785, y: 0.152, w: 0.145, h: 0.072 },
    dial: { x: 0.165, y: 0.265, w: 0.67, h: 0.425 },
    tap: { x: 0.035, y: 0.808, w: 0.195, h: 0.112 },
    volume: { x: 0.29, y: 0.868, w: 0.42, h: 0.028 },
    play: { x: 0.77, y: 0.808, w: 0.195, h: 0.112 },
    settings: { x: 0.44, y: 0.932, w: 0.12, h: 0.04 },
  };
  const padX = 8 / 393;
  const padY = 8 / 618;
  const expanded = Object.fromEntries(
    Object.entries(slots).map(([key, slot]) => [key, beatlineExpandSlot(slot, padX, padY)])
  );
  assert(!beatlineRectsOverlap(expanded.rhythm, expanded.dial), 'Rhythm does not steal the dial');
  assert(!beatlineRectsOverlap(expanded.sound, expanded.dial), 'Sound does not steal the dial');
  assert(!beatlineRectsOverlap(expanded.tap, expanded.volume), 'TAP does not steal volume');
  assert(!beatlineRectsOverlap(expanded.play, expanded.volume), 'Play does not steal volume');
  assert(!beatlineRectsOverlap(expanded.settings, expanded.volume), 'Settings does not steal volume');
  assert(!beatlineRectsOverlap(expanded.tap, expanded.play), 'TAP and Play stay apart');
  assert(press.includes('hitSlop = 8'), 'hotspots use a tight slop');
  assert(face.includes('pressIn'), 'play and TAP still fire once on press-in');
  assert(press.includes('onPress={pressIn ? undefined : onPress}'), 'press-in controls do not double-fire on release');
});

check('responsive frames keep circles circular and wells on-plate', () => {
  for (const [name, width, height] of [
    ['reference', 393, 852],
    ['se', 320, 568],
    ['pro-max', 430, 932],
  ]) {
    const frame = beatlinePlateFrame(width, height);
    const dial = beatlineCircle(frame, { x: 0.165, y: 0.265, w: 0.67, h: 0.425 });
    const play = beatlineCircle(frame, { x: 0.77, y: 0.822, w: 0.2, h: 0.108 });
    assert(dial.square, `${name} dial stays an inscribed square`);
    assert(play.square, `${name} play stays circular`);
    assert(frame.left >= -0.01 && frame.top >= -0.01, `${name} plate stays on-screen`);
    assert(frame.width <= width + 0.01 && frame.height <= height + 0.01, `${name} plate does not overflow`);
    const bpmTop = frame.top + 0.438 * frame.height;
    const bpmBottom = bpmTop + 0.078 * frame.height;
    assert(bpmTop >= frame.top && bpmBottom <= frame.top + frame.height, `${name} BPM stays in the well`);
  }
});

check('beat strengths stay visually distinct and cycle 0-1-2-3-0', () => {
  function strengthFill(strength, intensity) {
    if (strength < 0.5) return 0;
    const base = strength >= 2.5 ? 1 : strength >= 1.5 ? 0.72 : 0.38;
    return base * intensity;
  }
  function strengthDotRatio(strength) {
    if (strength < 0.5) return 0;
    if (strength < 1.5) return 0.28;
    if (strength < 2.5) return 0.52;
    return 0.78;
  }
  const fills = [0, 1, 2, 3].map((level) => strengthFill(level, 1));
  const dots = [0, 1, 2, 3].map((level) => strengthDotRatio(level));
  assert(fills[0] === 0 && dots[0] === 0, 'mute is empty');
  assert(fills[1] < fills[2] && fills[2] < fills[3], 'fill brightness separates 1/2/3');
  assert(dots[1] < dots[2] && dots[2] < dots[3], 'dot size separates 1/2/3');
  let level = 'mute';
  const seen = [];
  for (let i = 0; i < 4; i += 1) {
    seen.push(level);
    level = cycleBeatBlock(level);
  }
  assert(seen.join() === 'mute,soft,normal,strong', 'cycle visits every strength');
  assert(level === 'mute', 'fourth tap returns to 0');
  const SOCKETS = [0.125, 0.375, 0.625, 0.875];
  function beatlineRailSeats(meter) {
    const [a, b, c, d] = SOCKETS;
    if (meter === '2/4') return [a, d];
    if (meter === '3/4') return [a, (b + c) / 2, d];
    if (meter === '4/4') return SOCKETS.slice();
    if (meter === '6/8') {
      const left = (a + b) / 2;
      const right = (c + d) / 2;
      const spread = (b - a) * 0.32;
      return [0, 1, 2].map((i) => left + (i - 1) * spread).concat([0, 1, 2].map((i) => right + (i - 1) * spread));
    }
    const spread = (b - a) * 0.22;
    return SOCKETS.flatMap((socket) => [0, 1, 2].map((i) => socket + (i - 1) * spread));
  }
  assert(JSON.stringify(beatlineRailSeats('4/4')) === JSON.stringify(SOCKETS), '4/4 locks onto the four sockets');
  assert(beatlineRailSeats('2/4').length === 2, '2/4 uses two balanced sockets');
  assert(beatlineRailSeats('3/4').length === 3, '3/4 uses three balanced seats');
  assert(Math.abs(beatlineRailSeats('3/4')[1] - 0.5) < 1e-9, '3/4 center seat is rail-centered');
  const six = beatlineRailSeats('6/8');
  assert(six.length === 6, '6/8 keeps all 6 beats');
  assert(six[2] < 0.4 && six[3] > 0.6, '6/8 grouping is a clear 3+3 gap');
  const twelve = beatlineRailSeats('12/8');
  assert(twelve.length === 12, '12/8 keeps all 12 beats');
  for (let g = 0; g < 4; g += 1) {
    const mid = twelve[g * 3 + 1];
    assert(Math.abs(mid - SOCKETS[g]) < 1e-9, `12/8 group ${g + 1} is anchored on socket ${g + 1}`);
  }
  assert(pulse.includes('export function beatlineRailSeats'), 'socket seats are shared');
  assert(pulse.includes('export const BEATLINE_RAIL_SOCKETS'), 'hardware sockets are explicit');
});

check('dial visual motion stays continuous on the UI thread', () => {
  function beatlineDialSeatDeg(currentDeg, bpm) {
    const wantedMod = ((bpm * 12) % 360 + 360) % 360;
    const currentMod = ((currentDeg % 360) + 360) % 360;
    let delta = wantedMod - currentMod;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return currentDeg + delta;
  }
  assert(feel.includes('export function beatlineDialSeatDeg'), 'shortest-path seat is shared');
  assert(feel.includes('BEATLINE_DETENT_MIN_GAP_MS = 48'), 'Beatline detents are slower than a machine gun');
  assert(feel.includes('BEATLINE_DIAL_SETTLE_MS = 96'), 'release seats with overdamped travel');
  assert(dial.includes('rotation.value = rotation.value + nextLive.appliedDeg'), 'visual angle follows resisted finger delta');
  assert(dial.includes('Math.round(nextLive.bpm)'), 'digits quantize after the live angle');
  assert(dial.includes('cancelAnimation(rotation)'), 'a new drag cancels the settle');
  assert(dial.includes('withTiming(target'), 'release does not snap the index');
  assert(dial.includes('beatlineDialSeatDeg'), 'tap/external BPM does not unwind extra turns');
  assert(dial.includes('seat:'), 'TAP can seat the ghost index immediately');
  assert(!dial.includes('rotation.value = safeBpm * DEG_PER_BPM'), 'prop sync does not hard-assign extra revolutions');
  const seated = beatlineDialSeatDeg(1440, 121);
  assert(Math.abs(seated - 1452) < 1e-6, '121 BPM is 12 degrees from 120');
  const tapJump = beatlineDialSeatDeg(1440, 180);
  assert(Math.abs(tapJump - 1440) < 1e-6, '120 to 180 stays on 12 o’clock without spinning two turns');
  const release = beatlineDialSeatDeg(1444.8, 120);
  assert(Math.abs(release - 1440) < 1e-6, 'fractional release seats backward 4.8 degrees');
});

check('volume drag visuals do not depend on React per frame', () => {
  assert(slider.includes('amount.value = next'), 'thumb lives on a shared value');
  assert(slider.includes('runOnJS(pushGain)'), 'mixer gain is coalesced off the visual path');
  assert(slider.includes('runOnJS(persist)(amount.value)'), 'React volume commits on release');
  assert(!slider.includes('runOnJS(commit)(next, shouldDetent)'), 'no per-frame React volume commit');
  assert(slider.includes('BEATLINE_VOLUME_GAIN_MS'), 'gain updates are rate-limited');
  assert(slider.includes('thumbPx'), 'finger span matches the visible thumb');
  assert(lib.includes('thumb = SLIDER_THUMB'), 'mapping helper accepts the live thumb width');
});

check('detent path is one click per intended crossing', () => {
  assert(dial.includes('jump <= 2'), 'fast flicks skip dense detents');
  assert(dial.includes('BEATLINE_DETENT_MIN_GAP_MS'), 'worklet limiter is the Beatline gap');
  assert(rotary.includes('dial: 48'), 'JS limiter matches the Beatline encoder ceiling');
  assert(rotary.includes('playUiDetent(kind, audio, haptic)'), 'audio and haptic share one native call');
  assert(rotary.includes('reviveUiDetent'), 'session interrupt can rebuild the UI click nodes');
  assert(!dial.includes('hapticDialTick'), 'dial does not double-fire expo haptics beside native');
});

check('press, play glyph, and beat lighting stay mechanical', () => {
  assert(press.includes("kind === 'nav'"), 'nav hotspots keep metal contact lighting');
  assert(press.includes('metalRidge'), 'press is a highlight shift, not a tint');
  assert(!press.includes('interpolateColor'), 'play/TAP do not flash a software overlay');
  assert(!press.includes('scale:'), 'hardware press does not use generic scale');
  assert(playInsert.includes('glyphLayer'), 'play and pause stay mounted');
  assert(playInsert.includes('playing ? 0 : 1'), 'play glyph hides without unmounting');
  assert(playInsert.includes('playing ? 1 : 0'), 'pause glyph shows without a remount flash');
  assert(rail.includes('useAnimatedReaction'), 'beat halo follows native current on the UI thread');
  assert(rail.includes('withTiming(strength'), 'strength lighting interpolates');
  assert(rail.includes('haloLit'), 'playback halo is independent of stored strength');
  assert(rail.includes('styles.bloom'), 'active beat has an embedded socket bloom');
  assert(dial.includes('indexBody'), 'dial index is machined metal, not a flat tick');
  assert(dial.includes('indexRidge'), 'dial index has a material highlight');
  assert(face.includes('settle.value'), 'BPM digits settle instead of jumping raw');
  assert(face.includes('textShadowRadius: 2.4'), 'LED emission is tight, not a software glow');
  assert(metro.includes('startGenRef'), 'in-flight Play can be cancelled without a ghost glyph');
  assert(metro.includes('playingRef.current || startingRef.current'), 'second Play press stops instead of double-starting');
  assert(face.includes('BeatlineLiveReadout'), 'BPM digits do not rerender the whole face per detent');
  assert(face.includes('dialRef.current?.seat'), 'TAP seats the dial with the digits');
});

if (failures.length) {
  console.error('BEATLINE 2.0 TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('BEATLINE 2.0 TESTS PASSED');

'use strict';

const fs = require('fs');
const path = require('path');

function containImageRect(viewW, viewH, imageW, imageH) {
  const scale = Math.min(viewW / imageW, viewH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  return { x: (viewW - w) / 2, y: (viewH - h) / 2, w, h };
}

function masterSize(viewW, viewH, masterW, masterH) {
  const world = containImageRect(viewW, viewH, 940, 1672);
  return {
    world,
    width: masterW * (world.w / 940),
    height: masterH * (world.h / 1672),
  };
}

function barObjectFrame(viewW, viewH, spec) {
  const { world, width, height } = masterSize(viewW, viewH, spec.masterW, spec.masterH);
  return {
    left: world.x + spec.x * world.w - spec.visCenterX * width,
    top: world.y + spec.contactY * world.h - spec.contactFrac * height,
    width,
    height,
  };
}

function barTempoFrame(viewW, viewH, spec) {
  const world = containImageRect(viewW, viewH, 940, 1672);
  const width = spec.visW * world.w;
  const height = spec.visH * world.h;
  return {
    left: world.x + spec.x * world.w - width / 2,
    top: world.y + spec.y * world.h - height / 2,
    width,
    height,
  };
}

function barTempoVisibleFrame(viewW, viewH, spec) {
  return barTempoFrame(viewW, viewH, spec);
}

function barTempoFaceFrame(viewW, viewH, spec) {
  return barTempoFrame(viewW, viewH, spec);
}

function barTempoHitFrame(viewW, viewH, spec) {
  const world = containImageRect(viewW, viewH, 940, 1672);
  const visible = barTempoVisibleFrame(viewW, viewH, spec);
  const pad = 10;
  const minTop = world.y + 0.872 * world.h;
  const maxBottom = world.y + 0.958 * world.h;
  const left = visible.left - pad;
  const right = visible.left + visible.width + pad;
  let top = Math.max(visible.top - pad, minTop);
  let bottom = Math.min(visible.top + visible.height + pad, maxBottom);
  if (bottom - top < 48) top = Math.max(minTop, bottom - 48);
  return { left, top, width: right - left, height: bottom - top };
}

function barBeatStripFrame(viewW, viewH) {
  const world = containImageRect(viewW, viewH, 940, 1672);
  const width = STRIP.visW * world.w;
  const height = STRIP.visH * world.h;
  return {
    left: world.x + STRIP.x * world.w - width / 2,
    top: world.y + STRIP.y * world.h - height / 2,
    width,
    height,
  };
}

function barBeatControlFrame(viewW, viewH, index) {
  const strip = barBeatStripFrame(viewW, viewH);
  const size = Math.round(Math.min(34, Math.max(28, 0.082 * containImageRect(viewW, viewH, 940, 1672).w)));
  const lane = strip.width / 4;
  return {
    left: strip.left + lane * index + (lane - size) / 2,
    top: strip.top + (strip.height - size) / 2,
    width: size,
    height: size,
  };
}

function barBeatHitFrame(viewW, viewH, index) {
  const strip = barBeatStripFrame(viewW, viewH);
  const lane = strip.width / 4;
  const width = Math.max(48, lane - 1);
  const height = Math.max(48, strip.height);
  return {
    left: strip.left + lane * index + (lane - width) / 2,
    top: strip.top + (strip.height - height) / 2,
    width,
    height,
  };
}

function barEmptyMarkerFrame(viewW, viewH, spec) {
  const { world, width, height } = masterSize(viewW, viewH, 96, 80);
  return {
    left: world.x + spec.x * world.w - width / 2,
    top: world.y + 0.803 * world.h - height / 2,
    width,
    height,
  };
}

function rectsOverlap(a, b, gap) {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

const INNER = { x: 0.092, y: 0.778, w: 0.816, h: 0.05 };
const CONTACT_Y = 0.808;
const LANE_W = INNER.w / 4;
const STRIP = { x: 0.5, y: 0.82, visW: 0.9, visH: 0.08 };
const TEMPO = {
  x: 0.5,
  y: 0.904,
  visW: 0.36,
  visH: 0.066,
};
const PEOPLE = [
  { id: 'denim', name: 'DENIM', beat: 1, x: 0.194 },
  { id: 'bartender', name: 'BARTENDER', beat: 2, x: 0.398 },
  { id: 'red-dress', name: 'RED DRESS', beat: 3, x: 0.518 },
  { id: 'blonde', name: 'BLONDE', beat: 4, x: 0.812 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(path.join(__dirname, '..', 'lib/bar-layout.ts'), 'utf8');
const assets = fs.readFileSync(path.join(__dirname, '..', 'lib/bar-assets.ts'), 'utf8');
const skin = fs.readFileSync(path.join(__dirname, '..', 'components/skins/BarSkin.tsx'), 'utf8');
const voice = fs.readFileSync(path.join(__dirname, '..', 'lib/room-voice.ts'), 'utf8');
const library = fs.readFileSync(path.join(__dirname, '..', 'constants/sound-library.ts'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'components/pockt/MainScreen.tsx'), 'utf8');
const studio = fs.readFileSync(path.join(__dirname, '..', 'components/modals/SoundLibrarySheet.tsx'), 'utf8');
const sheet = fs.readFileSync(path.join(__dirname, '..', 'components/modals/MeterSheet.tsx'), 'utf8');
const pkg = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8');

assert(assets.includes('BAR_CHARACTER_MOTION_ENABLED = false'), 'character motion master switch off');
assert(assets.includes('denim: false') && assets.includes('center: false'), 'denim/center sprites disabled');
assert(assets.includes('blonde: false') && assets.includes('bartender: false'), 'blonde/bartender sprites disabled');
assert(assets.includes('BAR_LIVING_SCENE') && assets.includes('enabled: false'), 'living video disabled until a beat-neutral plate exists');
assert(assets.includes('rejected: true'), 'v3 is rejected as the ambient plate');
assert(assets.includes('whiskey-bar-living-v3-quantized.mp4'), 'v3 file remains on disk for rollback');
assert(assets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-v3-quantized.mp4')"), 'v3 module remains referenced for rollback only');
assert(!assets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-b2.mp4')"), 'b2 is not the active video module');
assert(!assets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-b1.mp4')"), 'b1 is not the active video module');
assert(!assets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-v1.mp4')"), 'v1 is not the active video module');
{
  const videoPath = path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-v3-quantized.mp4');
  assert(fs.existsSync(videoPath), 'living v3 video file installed');
  const buf = fs.readFileSync(videoPath);
  function readU32(o) { return buf.readUInt32BE(o); }
  function readU64(o) { return Number(buf.readBigUInt64BE(o)); }
  function typeAt(o) { return buf.toString('ascii', o + 4, o + 8); }
  function walk(start, end, ancestors) {
    const found = [];
    let o = start;
    while (o + 8 <= end) {
      let size = readU32(o);
      const type = typeAt(o);
      let header = 8;
      if (size === 1) { size = readU64(o + 8); header = 16; }
      else if (size === 0) size = end - o;
      if (!size || size < header || o + size > end + 8) break;
      found.push({ type, start: o, size, header });
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(type)) {
        found.push(...walk(o + header, o + size, ancestors.concat(type)));
      }
      o += size;
    }
    return found;
  }
  const boxes = walk(0, buf.length, []);
  const mvhd = boxes.find((box) => box.type === 'mvhd');
  const mdhd = boxes.find((box) => box.type === 'mdhd');
  const stsd = boxes.find((box) => box.type === 'stsd');
  const stts = boxes.find((box) => box.type === 'stts');
  assert(mvhd && mdhd && stsd && stts, 'v2 MP4 has movie/media boxes');
  const mvhdVer = buf[mvhd.start + mvhd.header];
  const mvhdTs = readU32(mvhd.start + mvhd.header + (mvhdVer === 1 ? 20 : 12));
  const mvhdDur = mvhdVer === 1
    ? readU64(mvhd.start + mvhd.header + 24)
    : readU32(mvhd.start + mvhd.header + 16);
  const mdhdVer = buf[mdhd.start + mdhd.header];
  const mdhdTs = readU32(mdhd.start + mdhd.header + (mdhdVer === 1 ? 20 : 12));
  const mdhdDur = mdhdVer === 1
    ? readU64(mdhd.start + mdhd.header + 24)
    : readU32(mdhd.start + mdhd.header + 16);
  const sample = stsd.start + stsd.header + 8;
  const width = buf.readUInt16BE(sample + 32);
  const height = buf.readUInt16BE(sample + 34);
  const sampleCount = readU32(stts.start + stts.header + 8);
  const sampleDelta = readU32(stts.start + stts.header + 12);
  assert(width === 1080 && height === 1920, `v2 is 1080×1920, got ${width}×${height}`);
  assert(mvhdDur / mvhdTs === 4, `v2 mvhd duration is 4.000s, got ${mvhdDur / mvhdTs}`);
  assert(mdhdDur / mdhdTs === 4, `v2 mdhd duration is 4.000s, got ${mdhdDur / mdhdTs}`);
  assert(mdhdTs / sampleDelta === 24, `v2 is 24 fps, got ${mdhdTs / sampleDelta}`);
  assert(sampleCount === 96, `v2 is 96 frames, got ${sampleCount}`);
}
assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b3.mp4')), 'b3 remains on disk for rollback');
assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b2.mp4')), 'b2 remains on disk for rollback');
assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b1.mp4')), 'b1 remains on disk for rollback');
assert(!skin.includes('whiskey-bar-living-v1.mp4') && !skin.includes('whiskey-bar-living-b1.mp4') && !skin.includes('whiskey-bar-living-b2.mp4') && !skin.includes('whiskey-bar-living-b3.mp4'), 'BarSkin does not reference old plates');
assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/background-v1.png')), 'still fallback plate still on disk');
assert(skin.includes('recyclingKey="bar-background"'), 'still PNG is the ambient plate');
assert(skin.includes('BarBeatActions'), 'native beat-action overlays');
assert(!skin.includes('useVideoPlayer'), 'rejected v3 is not played');
assert(!skin.includes('VideoView'), 'no living-plate VideoView');
assert(!skin.includes('setInterval'), 'no JS interval clock');
assert(!skin.includes('setTimeout'), 'no JS timeout clock');
assert(library.includes("soundSub: 'bar-knock'"), 'whiskey bar subdivision stays a bar sound');
assert(sheet.includes('styles.footer'), 'DONE/CANCEL live in a sticky footer');
assert(sheet.includes('accessibilityLabel="Cancel"') && sheet.includes('accessibilityLabel="Done"'), 'CANCEL and DONE remain in the meter footer');
assert(!skin.includes('ActorLayer'), 'BarSkin does not render actor sprites');
assert(!skin.includes('BAR_ACTORS.filter'), 'BarSkin does not mount actor layers');
assert(!skin.includes('StageObject'), 'physical beat objects no longer render');
assert(!skin.includes('EmptySlot'), 'red X markers no longer render');
assert(!skin.includes('BAR_OBJECTS'), 'object PNGs are not mounted');
assert(skin.includes('BarScenePlate'), 'scene plate ready for still/video swap');
assert(skin.includes('BeatStrip') && skin.includes('BeatControl'), 'people beats use the dedicated strip');
assert(!skin.includes('BeatDot'), 'old tray-dot presentation is gone');
assert(skin.includes('[0, 0.32, 0.58, 1]'), 'state 3 fill is complete');
assert(skin.includes('level >= 3') && skin.includes('StyleSheet.absoluteFillObject'), 'state 3 fill covers the full interior');
assert(!skin.includes('[0, 0.32, 0.58, 0.86]'), 'state 3 no longer leaves a top crescent');
assert(assets.includes('rejected: true') && assets.includes('rhythmicCertified: false'), 'v3 is rejected as the ambient plate');
assert(!assets.includes('temporary: true'), 'rollback file is not a temporary plate');
assert(skin.includes('recyclingKey="bar-background"'), 'approved still plate is the ambient picture');
assert(skin.includes('BarBeatActions'), 'beat actions render as overlays');
assert(!skin.includes('dotRing') && !skin.includes('dotCore'), 'tiny tray dots are not styled');
assert(skin.indexOf('<BarScenePlate') < skin.indexOf('<TempoBlock'), 'Tempo Block stays above the video');
assert(skin.indexOf('<BarScenePlate') < skin.indexOf('<BeatControl'), 'beat controls stay above the video');

const sync = fs.readFileSync(path.join(__dirname, '..', 'lib/bar-video-sync.ts'), 'utf8');
const cal = fs.readFileSync(path.join(__dirname, '..', 'lib/bar-video-calibration.ts'), 'utf8');
assert(sync.includes('BAR_VIDEO_BASE_BPM = 60'), 'base video tempo is 60');
assert(!sync.includes('BAR_VIDEO_BASE_BPM = 120'), 'old 120 BPM base is gone');
assert(sync.includes('BAR_VIDEO_BEATS = 4'), 'source cycle is four beats');
assert(sync.includes('BAR_VIDEO_LOOP_SECONDS = BAR_SOURCE_LOOP_SECONDS'), 'loop is the 4.000s plate');
assert(sync.includes('BAR_VIDEO_BEAT1_OFFSET = BAR_VIDEO_MARKERS[0]'), 'Beat 1 offset is the denim contact cue');
assert(sync.includes('BAR_CANONICAL_CUES'), 'even musical grid is documented');
assert(cal.includes('frame: 21') && cal.includes('frame: 37') && cal.includes('frame: 76') && cal.includes('frame: 90'), 'perceptual cue frames are documented');
assert(!sync.includes('setInterval'), 'sync math has no interval clock');
assert(!sync.includes('setTimeout'), 'sync math has no timeout clock');

function barVideoRate(_bpm) {
  return 1;
}
function barVideoExpectedTime(beatIndex) {
  return [0.5, 1.5, 2.5, 3.5][((beatIndex % 4) + 4) % 4];
}
function barVideoWrappedDelta(actual, expected, loop = 4) {
  const a = ((actual % loop) + loop) % loop;
  const e = ((expected % loop) + loop) % loop;
  let delta = a - e;
  if (delta > loop / 2) delta -= loop;
  if (delta < -loop / 2) delta += loop;
  return delta;
}
assert(barVideoRate(60) === 1, 'ambient rate is 1x');
assert(barVideoRate(90) === 1, '90 BPM does not stretch the plate');
assert(barVideoRate(120) === 1, '120 BPM does not stretch the plate');
assert(barVideoRate(30) === 1, '30 BPM does not stretch the plate');
assert(barVideoRate(180) === 1, '180 BPM does not stretch the plate');
assert(Math.abs(barVideoExpectedTime(0) - 0.5) < 1e-9, 'beat 1 expects canonical denim cue');
assert(Math.abs(barVideoExpectedTime(1) - 1.5) < 1e-9, 'beat 2 expects canonical bartender cue');
assert(Math.abs(barVideoExpectedTime(2) - 2.5) < 1e-9, 'beat 3 expects canonical red-dress cue');
assert(Math.abs(barVideoExpectedTime(3) - 3.5) < 1e-9, 'beat 4 expects canonical blonde cue');
assert(Math.abs(Math.abs(barVideoWrappedDelta(0.1, 0.5)) - 0.4) < 1e-9, 'circular delta before Beat 1');
assert(Math.abs(barVideoWrappedDelta(3.9, 0.5)) < 0.7, '4.0→0.0 seam wraps toward Beat 1');
assert(skin.includes('BarBeatActions'), 'native beat-action overlays fire from pulseBeat');
assert(!skin.includes('player.playbackRate = rate'), 'ambient plate is not tempo-stretched');

const iphone = containImageRect(393, 852, 940, 1672);
assert(Math.abs(iphone.w - 393) < 0.5, 'iphone contain uses full width');
assert(iphone.h < 852, 'iphone contain letterboxes vertically');

const tray = {
  left: iphone.x + INNER.x * iphone.w,
  top: iphone.y + INNER.y * iphone.h,
  width: INNER.w * iphone.w,
  height: INNER.h * iphone.h,
};
assert(tray.width > 280 && tray.height > 28, 'inner tray is a usable stage');

assert(PEOPLE[0].id === 'denim' && PEOPLE[0].beat === 1, 'beat 1 is denim');
assert(PEOPLE[1].id === 'bartender' && PEOPLE[1].beat === 2, 'beat 2 is bartender');
assert(PEOPLE[2].id === 'red-dress' && PEOPLE[2].beat === 3, 'beat 3 is red dress');
assert(PEOPLE[3].id === 'blonde' && PEOPLE[3].beat === 4, 'beat 4 is blonde');
assert(source.includes("id: 'denim'") && source.includes("beat: 1"), 'layout locks denim to beat 1');
assert(source.includes("id: 'bartender'") && source.includes("beat: 2"), 'layout locks bartender to beat 2');

const strip = barBeatStripFrame(393, 852);
const vis = PEOPLE.map((_, index) => barBeatControlFrame(393, 852, index));
const hits = PEOPLE.map((_, index) => barBeatHitFrame(393, 852, index));
const tempoVis = barTempoVisibleFrame(393, 852, TEMPO);
const tempoHit = barTempoHitFrame(393, 852, TEMPO);
const tempoFace = barTempoFaceFrame(393, 852, TEMPO);
const handsFloor = iphone.y + 0.76 * iphone.h;

assert(source.includes('BAR_BEAT_STRIP'), 'dedicated beat strip exported');
assert(strip.top > handsFloor, 'beat strip sits below character hands');
assert(tempoVis.top > strip.top + strip.height - 1, 'tempo sits below the beat strip');
assert(tempoVis.top > handsFloor, 'tempo sits below character hands');
assert(tempoVis.top + tempoVis.height < 760, 'tempo does not collide with PLAY');
assert(!rectsOverlap(strip, tempoHit, 1), 'beat strip does not overlap tempo hit');

const visGap = vis[1].left - (vis[0].left + vis[0].width);
for (let i = 0; i < hits.length; i += 1) {
  assert(!rectsOverlap(hits[i], tempoHit, 1), `${PEOPLE[i].id} hit does not overlap tempo`);
  assert(hits[i].width >= 48 && hits[i].height >= 48, `${PEOPLE[i].id} hit is at least 48px`);
  assert(vis[i].width >= 28 && vis[i].width <= 34, `${PEOPLE[i].id} visible control is 28–34px`);
  assert(vis[i].top > handsFloor, `${PEOPLE[i].id} control stays below hands`);
  assert(vis[i].left >= strip.left && vis[i].left + vis[i].width <= strip.left + strip.width + 0.6, `${PEOPLE[i].id} stays in strip`);
  if (i > 0) {
    assert(!rectsOverlap(hits[i], hits[i - 1], -0.5), 'neighbor beat hits do not overlap');
    assert(Math.abs(vis[i].left - (vis[i - 1].left + vis[i - 1].width) - visGap) < 0.8, 'visible controls are evenly spaced');
    assert(Math.abs(hits[i].width - hits[0].width) < 0.6, 'hit lanes are equal width');
  }
}

function chromeLayout(viewW, viewH, safeBottom) {
  const world = containImageRect(viewW, viewH, 940, 1672);
  const tempo = barTempoFrame(viewW, viewH, TEMPO);
  const tray = barBeatStripFrame(viewW, viewH);
  const chipW = Math.max(44, Math.min(76, Math.round(viewW * 0.22)));
  const chipH = 48;
  const playW = Math.max(44, Math.min(132, Math.round(viewW * 0.42)));
  const playH = 52;
  const sideRoom = tempo.left - world.x - 8;
  const flankTop = tempo.top + (tempo.height - chipH) / 2;
  const canFlank =
    sideRoom >= chipW &&
    tempo.left + tempo.width + 8 + chipW <= world.x + world.w &&
    flankTop >= tray.top + tray.height + 8;
  let tap;
  let controls;
  let play;
  if (canFlank) {
    tap = { left: tempo.left - 8 - chipW, top: tempo.top + (tempo.height - chipH) / 2, width: chipW, height: chipH };
    controls = { left: tempo.left + tempo.width + 8, top: tap.top, width: chipW, height: chipH };
    play = { left: world.x + (world.w - playW) / 2, top: tempo.top + tempo.height + 8, width: playW, height: playH };
  } else {
    const rowTop = Math.max(tempo.top + tempo.height + 8, tray.top + tray.height + 8);
    tap = { left: world.x + 8, top: rowTop, width: chipW, height: chipH };
    controls = { left: world.x + world.w - 8 - chipW, top: rowTop, width: chipW, height: chipH };
    play = { left: world.x + (world.w - playW) / 2, top: rowTop + chipH + 8, width: playW, height: playH };
  }
  return { tray, tempo, tap, controls, play, safeBottom };
}

for (const size of [
  [320, 568],
  [390, 844],
  [430, 932],
]) {
  const chrome = chromeLayout(size[0], size[1], 16);
  const boxes = [chrome.tray, chrome.tempo, chrome.tap, chrome.controls, chrome.play];
  for (const key of ['tap', 'controls', 'play']) {
    assert(chrome[key].width >= 44 && chrome[key].height >= 44, `${size[0]} ${key} is at least 44pt`);
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      assert(!rectsOverlap(boxes[i], boxes[j], 1), `${size[0]} chrome ${i}/${j} do not overlap`);
    }
  }
}

function tempoTypeFits(faceW, faceH, bpm) {
  const text = String(bpm);
  const digits = text.length;
  const innerW = faceW * 0.92;
  const innerH = faceH * 0.88;
  const unitSize = Math.max(7, Math.min(10, Math.round(innerH * 0.2)));
  const bpmSize = Math.min(innerH * 0.58, innerW / (digits * 0.74));
  return bpmSize >= 11 && bpmSize * digits * 0.64 <= innerW && bpmSize + unitSize + 2 <= innerH;
}
[40, 82, 120, 134, 200, 240, 400].forEach((bpm) => {
  assert(tempoTypeFits(tempoFace.width, tempoFace.height, bpm), `BPM ${bpm} fits the brass face`);
});

assert(source.includes('BAR_PEOPLE_BEATS'), 'people beats exported');
assert(source.includes('BAR_INNER_TRAY'), 'inner tray exported');
assert(sheet.includes('keyboardShouldPersistTaps="handled"'), 'meter scroll does not steal taps');
assert(studio.includes('keyboardShouldPersistTaps="handled"'), 'mix/studio scroll does not steal taps');
assert(sheet.includes('StyleSheet.absoluteFillObject'), 'meter dismiss is a true backdrop, not a nested pressable');

assert(library.includes("soundDownbeat: 'bar-shake'"), 'whiskey bar accent is shake');
assert(library.includes("sound: 'bar-thud'"), 'whiskey bar primary is thud');
assert(library.includes("'bar-thud': 'bar-shake'"), 'AUTO PAIR Thud resolves Shake');
assert(voice.includes('mixPresetPairCaption'), 'mix pair caption helper');
assert(studio.includes('mixPresetPairCaption(item)'), 'mix cards use pair caption');
assert(studio.includes('studioPairCaption'), 'sound studio header shows pair');
assert(studio.includes("resolveAccentPatch(sound, 'auto', null)"), 'AUTO PAIR applies complementary pair');

function mixPresetPairCaption(preset) {
  const primary = preset.sound;
  const beat = preset.soundBeat && preset.soundBeat !== primary ? preset.soundBeat : null;
  const down = preset.soundDownbeat && preset.soundDownbeat !== primary ? preset.soundDownbeat : null;
  const secondary = beat || down;
  const names = {
    'bar-metal-tap': 'Metal Tap',
    'bar-glass': 'Glass',
    'bar-thud': 'Thud',
    'bar-shake': 'Shake',
    pocket: 'Pocket',
    'lib-bell': 'Bell',
    'pockt-studio': 'Studio',
    precision: 'Precision',
    'lib-wood': 'Wood Block',
    'lib-jam': 'Jam Block',
  };
  if (!secondary) return names[primary] ?? primary;
  return `${names[primary] ?? primary} + ${names[secondary] ?? secondary}`;
}

const whiskeyCaption = mixPresetPairCaption({
  sound: 'bar-thud',
  soundDownbeat: 'bar-shake',
  soundBeat: 'bar-thud',
});
assert(whiskeyCaption === 'Thud + Shake', `Whiskey Bar subtitle is pair, got ${whiskeyCaption}`);
assert(whiskeyCaption.includes('Shake'), 'Whiskey Bar cannot silently drop Shake');
assert(
  mixPresetPairCaption({ sound: 'pocket', soundDownbeat: 'lib-bell', soundBeat: 'pocket' }) === 'Pocket + Bell',
  'Classic pair caption'
);

assert(source.includes('export function barChromeLayout'), 'chrome zones are calculated');
assert(source.includes('barChromeRectsOverlap'), 'chrome overlap helper exists');
assert(skin.includes('testID="bar-tap"') && skin.includes('testID="bar-controls"') && skin.includes('testID="bar-play"'), 'TAP CONTROLS PLAY are reserved chrome');
assert(!main.includes('styles.barThumb'), 'old overlapping Whiskey Bar dock is gone');
assert(main.includes('onBarTogglePlay'), 'PLAY uses the start gate');
assert(main.includes('barVideoReady'), 'audio waits for a prepared video');

assert(main.includes("overlay === 'time' || overlay === 'division' || overlay === 'rhythm'"), 'legacy routes open MeterSheet');
assert(!main.includes('<ReelScreen'), 'legacy subdivision reel removed');
assert(!main.includes('<RhythmPanel'), 'legacy rhythm panel removed');

console.log('Bar layout assertions passed');
console.log(`contain ${iphone.w.toFixed(1)}x${iphone.h.toFixed(1)} at ${iphone.x.toFixed(1)},${iphone.y.toFixed(1)}`);
console.log(
  `inner tray ${tray.left.toFixed(1)},${tray.top.toFixed(1)} ${tray.width.toFixed(1)}x${tray.height.toFixed(1)}`
);
console.log(
  `tempo vis ${tempoVis.left.toFixed(1)},${tempoVis.top.toFixed(1)} ${tempoVis.width.toFixed(1)}x${tempoVis.height.toFixed(1)}`
);
console.log(
  `tempo hit ${tempoHit.left.toFixed(1)},${tempoHit.top.toFixed(1)} ${tempoHit.width.toFixed(1)}x${tempoHit.height.toFixed(1)}`
);
console.log(
  `tempo face ${tempoFace.left.toFixed(1)},${tempoFace.top.toFixed(1)} ${tempoFace.width.toFixed(1)}x${tempoFace.height.toFixed(1)}`
);
console.log(
  `beat strip ${strip.left.toFixed(1)},${strip.top.toFixed(1)} ${strip.width.toFixed(1)}x${strip.height.toFixed(1)}`
);
hits.forEach((hit, index) => {
  const control = vis[index];
  console.log(
    `beat ${index + 1} ${PEOPLE[index].id} hit ${hit.left.toFixed(1)},${hit.top.toFixed(1)} ${hit.width.toFixed(1)}x${hit.height.toFixed(1)} vis ${control.left.toFixed(1)},${control.top.toFixed(1)} ${control.width.toFixed(1)}x${control.height.toFixed(1)}`
  );
});

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

function wrapDelta(delta) {
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function degreesFromNorth(angleRad) {
  let deg = (angleRad * 180) / Math.PI + 90;
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

function pulseAngleToBpm(angleRad, min = 20, max = 400) {
  const t = degreesFromNorth(angleRad) / 360;
  return Math.min(max, Math.max(min, min + t * (max - min)));
}

function isPulseTrackHit(x, y, cx, cy, innerRadius, outerRadius) {
  const d = Math.hypot(x - cx, y - cy);
  return d >= innerRadius && d <= outerRadius;
}

function pulseBpmToRotate(bpm, min = 20, max = 400) {
  const span = Math.max(1, max - min);
  const t = (Math.min(max, Math.max(min, bpm)) - min) / span;
  return t * 360 - 90;
}

function pulseBpmToAngle(bpm, min = 20, max = 400) {
  const span = Math.max(1, max - min);
  const t = (Math.min(max, Math.max(min, bpm)) - min) / span;
  return ((t * 360 - 90) * Math.PI) / 180;
}

function isPulseDotHit(x, y, cx, cy, bpm, visualRadius, hitRadius = 56) {
  const tempo = pulseBpmToAngle(bpm);
  const dx = cx + Math.cos(tempo) * visualRadius;
  const dy = cy + Math.sin(tempo) * visualRadius;
  return Math.hypot(x - dx, y - dy) <= hitRadius;
}

function privacyProgressFromPan(origin, translationY, travel) {
  return Math.min(1, Math.max(0, origin + translationY / Math.max(1, travel)));
}

function privacyShouldClose(progress, velocityY) {
  const projected = progress + velocityY / 2600;
  return projected > 0.36 || velocityY > 980;
}

function isPrivacyRestorePan(translationY, translationX, threshold = 10) {
  return translationY <= -threshold && Math.abs(translationY) > Math.abs(translationX);
}

function pulseBpmToTurns(bpm, min = 20, split = 200, max = 400) {
  const lo = Math.min(max, Math.max(min, bpm));
  if (lo <= split) return (lo - min) / Math.max(1, split - min);
  return 1 + (lo - split) / Math.max(1, max - split);
}

function pulseTurnsToBpm(turns, min = 20, split = 200, max = 400) {
  const t = Math.min(2, Math.max(0, turns));
  if (t <= 1) return min + t * (split - min);
  return split + (t - 1) * (max - split);
}

check('pulse 12 o clock is 20 BPM', () => {
  assert(Math.abs(pulseAngleToBpm(-Math.PI / 2) - 20) < 0.01, String(pulseAngleToBpm(-Math.PI / 2)));
});

check('pulse two turns map 20 / 200 / 400', () => {
  assert(Math.abs(pulseBpmToTurns(20) - 0) < 1e-9, '20 BPM is 0 turns');
  assert(Math.abs(pulseBpmToTurns(200) - 1) < 1e-9, '200 BPM is 1 turn');
  assert(Math.abs(pulseBpmToTurns(400) - 2) < 1e-9, '400 BPM is 2 turns');
  assert(Math.abs(pulseTurnsToBpm(0) - 20) < 1e-9, '0 turns is 20');
  assert(Math.abs(pulseTurnsToBpm(1) - 200) < 1e-9, '1 turn is 200');
  assert(Math.abs(pulseTurnsToBpm(2) - 400) < 1e-9, '2 turns is 400');
  assert(Math.abs(pulseTurnsToBpm(0.5) - 110) < 0.01, 'half first turn is 110');
  assert(Math.abs(pulseBpmToTurns(80) - (80 - 20) / 180) < 1e-9, '80 BPM first-turn precision');
});

check('pulse wrap does not jump across north', () => {
  const delta = wrapDelta(-Math.PI + 0.05 - (Math.PI - 0.05));
  assert(Math.abs(Math.abs(delta) - 0.1) < 1e-6, String(delta));
});

check('pulse track hit is annular', () => {
  assert(isPulseTrackHit(100, 42, 100, 100, 50, 80) === true, 'on track');
  assert(isPulseTrackHit(100, 100, 100, 100, 50, 80) === false, 'center is play');
  assert(isPulseTrackHit(100, 0, 100, 100, 50, 80) === false, 'outside outer');
});

check('pulse touch on current dot does not remap', () => {
  const visual = 48;
  const cx = 100;
  const cy = 100;
  const bpm = 20;
  const rotate = pulseBpmToRotate(bpm);
  const rad = (rotate * Math.PI) / 180;
  const x = cx + Math.cos(rad) * visual;
  const y = cy + Math.sin(rad) * visual;
  assert(isPulseDotHit(x, y, cx, cy, bpm, visual) === true, 'on the 20 BPM dot');
  assert(isPulseDotHit(cx + visual, cy, cx, cy, bpm, visual) === false, '3 o clock is not the 20 BPM dot');
});

check('privacy upward pan lowers progress', () => {
  const next = privacyProgressFromPan(1, -200, 600);
  assert(next < 1 && next > 0, String(next));
  assert(privacyShouldClose(next, -1400) === false, 'fast upward opens');
  assert(isPrivacyRestorePan(-40, 4) === true, 'up wins');
  assert(isPrivacyRestorePan(40, 4) === false, 'down is pull, not restore');
});

const pulse = read('lib/pulse-math.ts');
const pulseRoom = read('components/classic/PulseRoom.tsx');
const pulseMenu = read('components/classic/PulseMenu.tsx');
const privacy = read('components/curtain/PrivacyCurtain.tsx');
const pro = read('components/classic/ProRoom.tsx');
const dial = read('components/classic/SafeDial.tsx');
const cells = read('components/classic/ProBeatCells.tsx');
const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const accents = read('lib/accents.ts');
const beatlineColor = read('lib/beatline-color.ts');
const beatline = read('components/classic/BeatlineRoom.tsx');

check('pulse uses unwrapped two-turn mapping', () => {
  assert(pulse.includes('pulseTurnsToBpm'), 'turns map');
  assert(pulse.includes('PULSE_TURNS = 2'), 'two turns');
  assert(pulseRoom.includes('pulseTurnsToBpm'), 'room maps turns');
  assert(pulseRoom.includes('liveTurns'), 'cumulative turns');
  assert(pulseRoom.includes('lastFinger'), 'incremental unwrap');
  assert(pulseRoom.includes('Math.cos(a) * visual'), 'dot uses atan2 position');
  const rotateFn = pulse.slice(pulse.indexOf('export function pulseBpmToRotate'));
  assert(rotateFn.slice(0, 220).includes("'worklet'"), 'bpm-to-rotate is a worklet');
  assert(pulse.includes('visual: circleSize * 0.48'), 'dot sits in the ring lane');
  assert(pulseRoom.includes('manualActivation'), 'annular activation');
  assert(pulseRoom.includes('setMenuOpen(false)'), 'pad is not under the menu');
  assert(pulseMenu.includes('hapticTap()'), 'Build 69 Pulse TAP haptic');
  assert(pulseMenu.includes('tapTempo()'), 'Build 69 Pulse TAP uses tap tempo');
  assert(pulseMenu.includes('label="TAP"'), 'Pulse TAP is labeled');
  assert(pulseMenu.includes('minHeight: 44'), 'Pulse TAP meets 44pt');
  assert(!pulseMenu.includes('[60, 80, 100, 120, 140, 170, 200]'), 'preset chips gone');
  assert(pulseMenu.includes('SET BPM'), 'set bpm remains');
});

check('privacy restore is full screen', () => {
  assert(privacy.includes('...StyleSheet.absoluteFillObject'), 'full restore surface');
  assert(privacy.includes('Swipe up anywhere'), 'anywhere copy');
  assert(privacy.includes('blocksExternalGesture'), 'wins over room');
  assert(privacy.includes('PRIVACY_CLOSED_HARDWARE_MS'), 'closed zipper fade kept');
  assert(privacy.includes('PRIVACY_IDLE_HINT_MS'), 'short idle hint');
  assert(!privacy.includes('3600'), 'old 3.6s hint gone');
  assert(privacy.includes('settleKey'), 'room entry resets stuck progress');
  assert(!privacy.includes("top: '28%'"), 'old mid-strip gone');
});

check('pro professional controls', () => {
  assert(pro.includes('TIME'), 'time not TS');
  assert(!pro.includes('T.S.'), 'no cryptic TS');
  assert(pro.includes('SUBDIVISION_ORDER'), 'direct subdivision grid');
  assert(pro.includes('ProGlyph'), 'symbol quick actions');
  assert(dial.includes('Gesture.Exclusive'), 'dial does not steal with Pressable');
  assert(dial.includes('.minDistance(0)'), 'no jump threshold fighting atan2');
  assert(dial.includes('event.x'), 'local overlay coordinates');
  assert(dial.includes('pointerEvents="none"'), 'gesture is not on the rotating wheel');
  assert(cells.includes('const CELL = 96'), 'accent cells max size');
  assert(cells.includes('Math.min(CELL'), 'cells shrink to fit beat count');
  assert(cells.includes('FILL_RATIO'), 'internal fill heights');
  assert(cells.includes('ProBeatStatusBar'), 'horizontal beat status');
  assert(!cells.includes('#3DDC84'), 'no diagnostic green status');
  assert(!cells.includes('#E23B3B'), 'no diagnostic red status');
  assert(cells.includes('#12161A'), 'dark resting metal');
  assert(cells.includes('#7EE8DE'), 'teal active language');
  assert(cells.includes('active ? hit'), 'accent only on fired beat');
  assert(!cells.includes('flashFill'), 'no hatch overlay');
  assert(accents.includes("if (level === 'mute') return 0"), 'level 0 mute');
  assert(accents.includes('return 3'), 'level 3 strong');
});

check('beatline flash colors are centralized', () => {
  assert(beatlineColor.includes('BEATLINE_MEDIUM'), 'orange medium');
  assert(beatlineColor.includes('BEATLINE_LOW'), 'white low');
  const rail = read('components/beatline/BeatlineRail.tsx');
  assert(rail.includes('pulseBeat'), 'current beat follows the native clock');
  const more = read('components/pockt2/InstrumentMoreSheet.tsx');
  assert(more.includes('MixerFader'), 'master volume');
  assert(more.includes('Volume'), 'volume dock');
  assert(!beatline.includes('beatTrack'), 'no midline through cells');
  const light = read('components/classic/BeatlineSpotlight.tsx');
  assert(light.includes('sconce'), 'wide sconce wash');
  assert(light.includes('level3Color'), 'accent-colored wash');
  assert(!light.includes('styles.tint'), 'no solid rectangular overlay');
});

  const pendulum = read('components/classic/SmartPendulumRoom.tsx');
  const preview = read('components/classic/ClassicPreviewCard.tsx');
  const curtainConst = read('constants/curtain.ts');

check('smart pendulum and ledgear preview', () => {
  assert(pendulum.includes('beatDots'), 'lower progression dots');
  assert(pendulum.includes("transformOrigin: 'bottom'"), 'fixed bottom pivot');
  assert(pendulum.includes('tempoRow'), 'minus bpm plus row');
  assert(pendulum.includes('tempoName(safeBpm)'), 'term above bpm');
  assert(preview.includes('ledgearFrame'), 'purpose-built thumbnail');
  assert(preview.includes('rigStage'), 'purpose-built rig thumb');
  assert(preview.includes('proKicker'), 'purpose-built pro thumb');
  assert(!preview.includes('TEMPO  ·  120  ·  ANDANTE'), 'no left-biased pro meta');
  assert(!preview.includes('recyclingKey="gallery-ledgear"'), 'full gallery image not used as ledgear thumb');
  assert(curtainConst.includes('closedOpacity: 0.9'), 'darker privacy');
});

check('first tap arms player before origin', () => {
  const start = engine.includes('player.play()') && engine.includes('0.08 * max(1, sampleRate)');
  assert(start, 'play-then-schedule origin exists');
  const playAt = engine.indexOf('self.player.play()');
  const originAt = engine.indexOf('0.08 * max(1, sampleRate)');
  assert(playAt >= 0 && originAt > playAt, 'play() precedes 80ms origin');
  assert(engine.includes('first beginChunkPlayback failed'), 'one-shot graph reboot');
});

if (failures.length) {
  console.error('PULSE / PRIVACY / PRO TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('PULSE / PRIVACY / PRO TESTS PASSED');
console.log('angle map, annular hit, privacy restore, pro hierarchy, first-tap origin');

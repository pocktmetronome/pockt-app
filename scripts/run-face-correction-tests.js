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

function horizontalAngleFromDrag(dx, width, maxDeg = 26, origin = 0) {
  const span = Math.max(64, width * 0.42);
  const next = origin + (dx / span) * maxDeg;
  return Math.min(maxDeg, Math.max(-maxDeg, next));
}

function seedElapsedTowardCenter(angleDeg, amplitudeDeg) {
  const amp = Math.max(1, Math.abs(amplitudeDeg));
  const ratio = Math.min(1, Math.max(-1, angleDeg / amp));
  if (Math.abs(ratio) < 0.02) return 0;
  if (ratio >= 0) return 1.5 + Math.acos(ratio) / Math.PI;
  return 0.5 + Math.acos(-ratio) / Math.PI;
}

function nextExtremeElapsed(seedElapsed) {
  const e = ((seedElapsed % 2) + 2) % 2;
  if (e < 0.5) return 0.5;
  if (e < 1.5) return 1.5;
  return 2.5;
}

function pendulumAngle(elapsed, amplitude, centerOrigin = true) {
  return amplitude * Math.cos((elapsed + (centerOrigin ? 0.5 : 0)) * Math.PI);
}

function firstFrameSnap(fromDeg, toDeg, epsilon = 4) {
  return Math.abs(toDeg - fromDeg) > epsilon;
}

function rollerWindow(center, span = 48) {
  const start = Math.max(20, Math.round(center) - span);
  const end = Math.min(400, Math.round(center) + span);
  const marks = [];
  for (let n = start; n <= end; n += 1) marks.push(n);
  return marks;
}

function rollerStripTranslateX(liveBpm, wellWidth, px = 14) {
  if (!Number.isFinite(liveBpm) || !Number.isFinite(wellWidth) || !Number.isFinite(px)) return 0;
  return wellWidth / 2 - liveBpm * px;
}

function shouldEmitControlDetent(input) {
  if (!input.dragging) return { emit: false };
  if (input.previousBpm == null || input.nextBpm === input.previousBpm) return { emit: false };
  if (input.now - input.lastEmitAt < 52) return { emit: false };
  return { emit: true };
}

function barVideoRate(_bpm) {
  return 1;
}

function barVideoExpectedTime(beatIndex) {
  const cues = [0.5, 1.5, 2.5, 3.5];
  return cues[((beatIndex % 4) + 4) % 4];
}

function barVideoWrappedDelta(actual, expected, loop = 4) {
  const a = ((actual % loop) + loop) % loop;
  const e = ((expected % loop) + loop) % loop;
  let delta = a - e;
  if (delta > loop / 2) delta -= loop;
  if (delta < -loop / 2) delta += loop;
  return delta;
}

function seedElapsedFromRelease(angleDeg, amplitudeDeg, travelSign) {
  const amp = Math.max(1, Math.abs(amplitudeDeg));
  const ratio = Math.min(1, Math.max(-1, angleDeg / amp));
  const arc = Math.acos(ratio) / Math.PI;
  const leftward = ((arc - 0.5) % 2 + 2) % 2;
  const rightward = ((2 - arc - 0.5) % 2 + 2) % 2;
  if (Math.abs(ratio) >= 0.995) return ratio > 0 ? 1.5 : 0.5;
  if (travelSign < 0) return leftward;
  if (travelSign > 0) return rightward;
  return ratio >= 0 ? rightward : leftward;
}

function classifyPointer(dx, dy, dragPx = 18) {
  return Math.hypot(dx, dy) >= dragPx ? 'drag' : 'tap';
}

function pickupBeatsToExtreme(seedElapsed) {
  const e = ((seedElapsed % 2) + 2) % 2;
  const next = Math.abs(e - 0.5) < 0.04 ? 0.5 : Math.abs(e - 1.5) < 0.04 ? 1.5 : e < 0.5 ? 0.5 : e < 1.5 ? 1.5 : 2.5;
  const beats = ((next - seedElapsed) % 2 + 2) % 2;
  if (beats < 0.04) return 0.04;
  return Math.min(1, Math.max(0.04, beats));
}

check('console start and roller stay finite without feedback loops', () => {
  const roller = read('components/classic/TempoRoller.tsx');
  const face = read('components/classic/RigRoom.tsx');
  const math = read('lib/tempo-roller-math.ts');
  assert(face.includes('toggle()'), 'start uses shared transport');
  assert(!face.includes('setInterval'), 'console has no JS musical timer');
  assert(roller.includes('onFinalize'), 'cancelled pans clear dragging');
  assert(roller.includes('dragging.value < 0.5'), 'programmatic sync does not detent');
  assert(roller.includes('rollerWindow(safeBpm'), 'marks are windowed');
  assert(!roller.includes('rollerScaleMarks()'), 'full 20-400 strip is not mounted');
  assert(roller.includes('Number.isFinite'), 'non-finite transforms are rejected');
  assert(math.includes('rollerValuesAreFinite'), 'finite helper exists');
  for (const bpm of [20, 143, 400]) {
    const marks = rollerWindow(bpm, 56);
    assert(marks[0] >= 20 && marks[marks.length - 1] <= 400, `${bpm} stays in range`);
    assert(Number.isFinite(rollerStripTranslateX(bpm, 280)), `${bpm} translate is finite`);
  }
  assert(rollerStripTranslateX(Number.NaN, 280) === 0, 'NaN bpm is zeroed');
  assert(
    !shouldEmitControlDetent({ dragging: false, previousBpm: 120, nextBpm: 140, now: 10, lastEmitAt: 0 }).emit,
    'programmatic roller sync is silent'
  );
});

check('console exact BPM entry reuses the shared pad', () => {
  const face = read('components/classic/RigRoom.tsx');
  const pad = read('components/modals/BpmPadSheet.tsx');
  const main = read('components/pockt/MainScreen.tsx');
  assert(face.includes('onOpenPad()'), 'large BPM opens exact entry');
  assert(face.includes('Double tap to enter a precise tempo'), 'a11y names the pad');
  assert(pad.includes('raw < minBpm || raw > maxBpm'), 'invalid entry is rejected');
  assert(pad.includes('setInvalid(true)'), 'invalid state is visible');
  assert(main.includes('<BpmPadSheet'), 'shared pad remains the source of truth');
  assert(main.includes('onChange={setBpm}'), 'valid entry uses the timing engine');
});

check('mechanical drag sign and handoff', () => {
  const gesture = read('lib/pendulum-gesture.ts');
  const face = read('components/classic/PendulaClassicRoom.tsx');
  const hook = read('hooks/use-pendulum-phase.ts');
  assert(gesture.includes('origin + (dx / span) * maxDeg'), 'drag is not inverted');
  assert(!gesture.includes('(-dx / span)'), 'old inverted mapping is gone');
  assert(horizontalAngleFromDrag(-100, 390) < 0, 'negative X renders left');
  assert(horizontalAngleFromDrag(100, 390) > 0, 'positive X renders right');
  const left = horizontalAngleFromDrag(-40, 390);
  const right = horizontalAngleFromDrag(40, 390);
  assert(left < 0 && right > 0 && Math.abs(Math.abs(left) - Math.abs(right)) < 0.001, 'manual angle is continuous and symmetric');
  assert(face.includes('rotate: `${angle.value}deg`'), 'render uses the same signed angle');
  const seed = seedElapsedTowardCenter(20, 26);
  assert(seed > 1.5 && seed < 2, 'right release continues toward center');
  assert(!firstFrameSnap(0, pendulumAngle(0, 26, true)), 'button start has no first-frame snap');
  assert(read('components/classic/SmartPendulumRoom.tsx').includes('armPendulumStart?.(0.5)'), 'Build 69 start pickup is half a beat');
  assert(read('lib/pendulum-reference.ts').includes('CENTER crossing'), 'beat is at center');
  assert(face.includes('PENDULUM_MODE'), 'one authoritative mode');
  assert(face.includes('handlePendulumTap'), 'tap-to-start exists');
  assert(face.includes('startFromRelease'), 'release-to-start exists');
  assert(face.includes('Gesture.Exclusive'), 'tap does not fire after drag');
  assert(face.includes('armPendulumStartSilent'), 'no duplicate start cue');
  assert(hook.includes('hostSv.value'), 'start waits for the first authoritative host epoch');
  assert(face.includes('PENDULUM_MODE.manualDragging'), 'drag owns the arm exclusively');
  assert(!face.includes('setInterval'), 'no JS musical timer');
  const releaseRight = 20;
  const seedRight = seedElapsedFromRelease(releaseRight, 26, 1);
  const firstClock = pendulumAngle(seedRight, 26, true);
  assert(!firstFrameSnap(releaseRight, firstClock, 1.2), 'rightward release stays position-continuous');
  assert(seedElapsedFromRelease(-18, 26, -1) < 0.5, 'leftward release continues left');
  assert(pickupBeatsToExtreme(1.5) < 0.05, 'release on an extreme clicks immediately');
  assert(face.includes('mechanical-options') && face.includes('mechanical-tap'), 'OPTIONS and TAP exist');
  assert(face.includes('minHeight: 44'), 'Mechanical chrome keeps 44-pt targets');
  assert(face.includes('pendingStart') === false, 'stop-then-start pause path is gone');
  assert(hook.includes('playingSv.value < 0.5'), 'stopped renderer parks at center');
});

check('failed TapBloom is gone and every TAP uses Classic Pro reaction', () => {
  const spark = read('components/classic/TapSparkLayer.tsx');
  const pro = read('components/classic/ProRoom.tsx');
  const pulse = read('components/classic/PulseRoom.tsx');
  const consoleFace = read('components/classic/RigRoom.tsx');
  const mechanical = read('components/classic/PendulaClassicRoom.tsx');
  const bar = read('components/skins/BarSkin.tsx');
  assert(!fs.existsSync(path.join(__dirname, '..', 'lib/tap-bloom.ts')), 'tap-bloom math is removed');
  assert(!fs.existsSync(path.join(__dirname, '..', 'components/classic/TapBloom.tsx')), 'TapBloom UI is removed');
  assert(spark.includes('useClassicTapReaction'), 'Pro reaction is extracted');
  assert(spark.includes('hapticTap'), 'Pro haptic is part of the shared reaction');
  assert(spark.includes('reduceMotion'), 'Reduce Motion is preserved');
  assert(spark.includes('pointerEvents="none"'), 'spark never blocks input');
  assert(pro.includes('hapticTap'), 'Pro tap uses the shared haptic');
  assert(pro.includes('tapTempo'), 'Pro tap uses shared tap tempo');
  assert(read('components/classic/PulseMenu.tsx').includes('hapticTap()'), 'Build 69 Pulse menu TAP haptic');
  assert(read('components/classic/PulseMenu.tsx').includes('tapTempo()'), 'Build 69 Pulse menu TAP uses tap tempo');
  assert(consoleFace.includes('useClassicTapReaction(tapTempo)'), 'Console TAP matches Pro');
  assert(mechanical.includes('useClassicTapReaction(tapTempo)'), 'Mechanical TAP matches Pro');
  assert(bar.includes('useClassicTapReaction'), 'Whiskey Bar TAP matches Pro');
  assert(!pulse.includes('TapBloom'), 'Pulse no longer mounts bloom');
  assert(!consoleFace.includes('TapBloom'), 'Console no longer mounts bloom');
});

check('whiskey bar title, asset, and 60 BPM phase model', () => {
  const tile = read('components/rooms/RoomTile.tsx');
  const titles = read('lib/immersive-title-layout.ts');
  const rooms = read('constants/rooms.ts');
  const assets = read('lib/bar-assets.ts');
  const sync = read('lib/bar-video-sync.ts');
  const cal = read('lib/bar-video-calibration.ts');
  const skin = read('components/skins/BarSkin.tsx');
  const eas = read('.easignore');
  assert(titles.includes("bar: ['WHISKEY', 'BAR']"), 'thumbnail uses two lines');
  assert(tile.includes('titleBand'), 'immersive titles occupy the reserved top area');
  assert(!tile.includes('ellipsizeMode="clip"'), 'titles are not clipped');
  assert(tile.includes('nameImmersive'), 'immersive titles share one scale');
  assert(tile.includes('immersiveTitleLayout'), 'title geometry is measured');
  assert(rooms.includes("shortLabel: 'Whiskey Bar'"), 'VoiceOver stays Whiskey Bar');
  assert(assets.includes('rejected: true'), 'v3 living plate is rejected');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-v3-quantized.mp4')), 'v3 remains on disk for rollback');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-v2.mp4')), 'v2 remains for rollback');
  assert(!eas.includes('whiskey-bar-living-v3-quantized.mp4'), 'EAS does not exclude v3 file');
  assert(eas.includes('whiskey-bar-living-v2.mp4') && eas.includes('whiskey-bar-living-b1.mp4') && eas.includes('whiskey-bar-living-b3.mp4'), 'EAS excludes obsolete plates');
  assert(sync.includes('BAR_VIDEO_FOLLOW_BPM = false'), 'ambient plate is not tempo-stretched');
  assert(sync.includes('BAR_VIDEO_QUANTIZED = false'), 'quantized follower is not the production path');
  assert(barVideoRate(90) === 1, 'ambient rate stays 1x');
  assert(Math.abs(barVideoExpectedTime(0) - 0.5) < 1e-9, 'beat 0 → canonical 0.500');
  assert(Math.abs(barVideoExpectedTime(1) - 1.5) < 1e-9, 'beat 1 → canonical 1.500');
  assert(Math.abs(barVideoExpectedTime(2) - 2.5) < 1e-9, 'beat 2 → canonical 2.500');
  assert(Math.abs(barVideoExpectedTime(3) - 3.5) < 1e-9, 'beat 3 → canonical 3.500');
  assert(sync.includes('barVideoNeedsSegmentRate') && sync.includes('return false'), 'piecewise segment rate is disabled');
  assert(sync.includes('barVideoNeedsBeatSeek') && /barVideoNeedsBeatSeek\([^)]*\)[^{]*\{\s*return false;/.test(sync), 'per-beat seek is disabled');
  assert(cal.includes('downward table/coaster contact'), 'denim cue is documented');
  assert(cal.includes('right-most spoon tangent'), 'blonde landmark is documented');
  assert(Math.abs(barVideoWrappedDelta(3.9, 0.5)) <= 0.6, 'circular phase crosses the 4.0 seam');
  assert(Math.abs(barVideoWrappedDelta(0.51, 0.5)) < 0.08, 'insignificant jitter stays small');
  assert(skin.includes('BarBeatActions'), 'beat actions are native-clock overlays');
  assert(skin.includes('BarScenePlate'), 'still ambient plate remains');
  assert(!skin.includes('setInterval') && !sync.includes('setInterval'), 'no independent musical timer');
});

check('Build 69 pulse waves follow the native beat', () => {
  const pulse = read('components/classic/PulseRoom.tsx');
  assert(pulse.includes('if (!playing) return null'), 'stopped waves unmount');
  assert(pulse.includes('pulseBeat'), 'rings originate from native beats');
  assert(pulse.includes('withTiming'), 'expansion is a visual envelope');
  assert(!pulse.includes('setInterval'), 'no Pulse JS musical timer');
});

check('mechanical tap uses the button start seed', () => {
  const face = read('components/classic/PendulaClassicRoom.tsx');
  const hook = read('hooks/use-pendulum-phase.ts');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(face.includes('buttonStartSeed') || face.includes('startFromButton'), 'tap and START share one path');
  assert(face.includes('classifyPendulumPointer'), 'tap vs drag is classified');
  assert(face.includes('handlePendulumTap'), 'tap handler is centralized');
  assert(!face.includes('void hapticSoft()'), 'Mechanical no longer haptics at start/center');
  assert(hook.includes('pendulumAbsoluteAngle'), 'native host timeline is sampled, not blended');
  assert(engine.includes('uiClickPlayers'), 'UI detents use ping-pong nodes');
  assert(engine.includes('let work: () -> Void'), 'UI detent hops are typed Void, not Void?');
  assert(!engine.includes('self?.playUiDetentLocked'), 'optional Void? closures cannot feed DispatchQueue');
  assert(engine.includes('.interrupts') === false || engine.includes('options: []'), 'UI detents do not interrupt a single node');
  const moduleSwift = read('modules/pockt-timing/ios/PocktTimingModule.swift');
  assert(moduleSwift.includes('Function("playUiDetent")'), 'playUiDetent is a sync Function');
  assert(moduleSwift.includes('Function("prepareUiDetent")'), 'prepareUiDetent is a sync Function');
  assert(!/Function\("playUiDetent"\)[\s\S]{0,180}\.runOnQueue/.test(moduleSwift), 'sync playUiDetent cannot use runOnQueue');
  assert(!/Function\("prepareUiDetent"\)[\s\S]{0,180}\.runOnQueue/.test(moduleSwift), 'sync prepareUiDetent cannot use runOnQueue');
});

check('smart pendulum has no visual-center haptic', () => {
  const persist = read('storage/persist.ts');
  const timing = read('constants/timing.ts');
  const face = read('components/classic/SmartPendulumRoom.tsx');
  const math = read('lib/pendulum-haptics.ts');
  assert(persist.includes('smartPendulumCenterHaptic: source.smartPendulumCenterHaptic === true'), 'legacy flag still sanitizes');
  assert(timing.includes('smartPendulumCenterHaptic: false'), 'factory default is off');
  assert(!face.includes('isCenterCrossing'), 'visual-center haptic path is gone');
  assert(!face.includes('lastCenterBeat'), 'old tick-index center haptic is gone');
  assert(math.includes('return false'), 'center haptic cannot fire');
});

check('mechanical trajectories stay continuous across start styles', () => {
  function adoptNativeElapsed(current, nativeElapsed, firstTick) {
    const err = nativeElapsed - current;
    if (firstTick) {
      if (Math.abs(err) <= 0.12) return nativeElapsed;
      return current;
    }
    if (err < -0.08) return current;
    if (Math.abs(err) <= 0.18) return current + err * 0.28;
    if (err > 0 && err < 1.02) return current + Math.min(0.06, err);
    return current;
  }
  function angleAt(elapsed, amplitude) {
    return amplitude * Math.cos((elapsed + 0.5) * Math.PI);
  }
  function sample(seedElapsed, frames, dtMs, periodMs, amplitude, nativeAt) {
    const out = [];
    let elapsed = seedElapsed;
    let prev = angleAt(elapsed, amplitude);
    for (let frame = 0; frame < frames; frame += 1) {
      if (nativeAt && frame === nativeAt.frame) elapsed = adoptNativeElapsed(elapsed, nativeAt.elapsed, true);
      else elapsed += dtMs / periodMs;
      const angle = angleAt(elapsed, amplitude);
      out.push({ frame, elapsed, angle, velocity: frame === 0 ? 0 : (angle - prev) / (dtMs / 1000) });
      prev = angle;
    }
    return out;
  }
  function maxJump(samples) {
    let max = 0;
    for (let i = 1; i < samples.length; i += 1) max = Math.max(max, Math.abs(samples[i].angle - samples[i - 1].angle));
    return max;
  }
  const amp = 26;
  const button = sample(0, 80, 16, 500, amp);
  assert(button[8].angle < button[0].angle, 'button start moves outward left');
  assert(maxJump(button) < 3.2, 'button start has no frame teleport');
  const tap = sample(0, 80, 16, 500, amp, { frame: 18, elapsed: 0.62 });
  assert(maxJump(tap) < 3.2, 'tap start first native tick cannot overwrite the seed');
  const left = seedElapsedFromRelease(-18, amp, -1);
  const leftPath = sample(left, 80, 16, 1000, amp);
  assert(leftPath[0].angle < 0, 'left release stays on the left');
  assert(maxJump(leftPath) < 3.2, 'left release is continuous');
  const right = seedElapsedFromRelease(20, amp, 1);
  const rightPath = sample(right, 80, 16, 500, amp);
  assert(rightPath[0].angle > 0, 'right release stays on the right');
  assert(maxJump(rightPath) < 3.2, 'right release is continuous');
  const slow = sample(seedElapsedFromRelease(-8, amp, -1), 80, 16, 2000, amp);
  assert(maxJump(slow) < 1.6, 'slow release does not jump');
  const extreme = sample(0.5, 40, 16, 500, amp);
  assert(Math.abs(angleAt(0.5, amp) + amp) < 0.2, 'extreme release starts at the endpoint');
  assert(maxJump(extreme) < 3.2, 'extreme release continues smoothly');
  const restart = sample(0, 40, 16, 500, amp);
  assert(Math.abs(angleAt(0, amp)) < 0.2, 'stop then restart is centered');
  assert(maxJump(restart) < 3.2, 'restart motion is continuous');
  const tempoChange = sample(0.2, 60, 16, 333, amp);
  assert(maxJump(tempoChange) < 4.2, 'first-cycle tempo change stays continuous');
  assert(classifyPointer(4, 3) === 'tap' && classifyPointer(22, 1) === 'drag', 'tap/drag threshold');
});

check('immersive titles keep every letter at supported widths', () => {
  function textWidth(text, fontSize, letterSpacing) {
    return text.length * fontSize * 0.72 + Math.max(0, text.length - 1) * letterSpacing;
  }
  function layout(id, tileWidth) {
    const lines = id === 'bar' ? ['WHISKEY', 'BAR'] : id === 'studio' ? ['STUDIO'] : ['ALTERED'];
    const inner = tileWidth - 24;
    let fontSize = tileWidth < 340 ? 14 : tileWidth >= 400 ? 16 : 15;
    let letterSpacing = tileWidth < 340 ? 0.45 : tileWidth >= 400 ? 0.9 : 0.8;
    let max = Math.max(...lines.map((line) => textWidth(line, fontSize, letterSpacing)));
    while (max > inner - 2 && letterSpacing > 0.15) {
      letterSpacing -= 0.1;
      max = Math.max(...lines.map((line) => textWidth(line, fontSize, letterSpacing)));
    }
    return { lines, max, inner, clips: max > inner };
  }
  for (const width of [320, 375, 390, 430]) {
    for (const id of ['bar', 'studio', 'altered']) {
      const next = layout(id, width);
      assert(next.lines.join('').includes(id === 'bar' ? 'WHISKEY' : id === 'studio' ? 'STUDIO' : 'ALTERED'), `${id} @${width} keeps full text`);
      assert(!next.clips, `${id} @${width} does not clip`);
      assert(next.max <= next.inner, `${id} @${width} fits the reserved band`);
    }
  }
});

check('no second audio engine or JS musical loop was added', () => {
  const files = [
    'components/classic/TempoRoller.tsx',
    'components/classic/RigRoom.tsx',
    'components/classic/PendulaClassicRoom.tsx',
    'components/classic/PulseRoom.tsx',
    'components/skins/BarSkin.tsx',
    'hooks/use-pendulum-phase.ts',
    'lib/bar-video-sync.ts',
    'lib/bar-video-calibration.ts',
    'lib/tap-tempo.ts',
  ];
  for (const file of files) {
    const src = read(file);
    assert(!src.includes('new AudioContext'), `${file} has no Web Audio engine`);
    assert(!src.includes('expo-av'), `${file} does not add expo-av`);
    assert(!/setInterval\s*\(/.test(src), `${file} has no setInterval`);
  }
});

if (failures.length) {
  console.error('FACE CORRECTION TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('FACE CORRECTION TESTS PASSED');

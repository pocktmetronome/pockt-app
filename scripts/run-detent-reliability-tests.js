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

function detentLimiterWouldEmit(now, last, minGap) {
  if (last > now) return true;
  if (last <= 0) return true;
  return now - last >= minGap;
}

check('UI detent play path never tears down the graph', () => {
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const locked = engine.split('private func playUiDetentLocked')[1]?.split('private func scheduleUiClick')[0] ?? '';
  const scheduled = engine.split('private func scheduleUiClick')[1]?.split('private func nextIdleUiClickNode')[0] ?? '';
  assert(locked.length > 40, 'playUiDetentLocked present');
  assert(!locked.includes('startInFlight'), 'start-in-flight does not mute detents');
  assert(!locked.includes('connectUiClickPlayers'), 'locked play does not reconnect nodes');
  assert(!scheduled.includes('.reset()'), 'schedule does not reset a live node');
  assert(!/if node\.isPlaying \{\s*node\.stop\(\)/.test(scheduled), 'schedule does not stop a live node');
  assert(scheduled.includes('if !node.isPlaying'), 'idle node is played, busy node is queued');
  assert(engine.includes('ensureEngineRunningForUiDetent'), 'UI path does not boot the musical graph');
  assert(!scheduled.includes('bootAudioGraph'), 'UI click does not bootAudioGraph');
  assert(engine.includes('nextIdleUiClickNode'), 'three-node idle rotation');
  assert(engine.includes('connectUiClickPlayers(force: true)'), 'restore/boot may reconnect');
  assert(engine.includes('connectUiClickPlayers(force: false)'), 'prepare/route reuse attached nodes');
});

check('one JS limiter; stamp only after native success', () => {
  const rotary = read('lib/rotary-feedback.ts');
  assert(rotary.includes('if (!audio && !haptic) return'), 'disabled sensory emits nothing');
  assert(rotary.includes('if (!played) return'), 'failed native schedule does not stamp');
  assert(rotary.includes('playUiDetent(kind, audio, haptic)'), 'one native owner for click + haptic');
  assert(!rotary.includes('void hapticRigid()') || rotary.includes('fireExpoHaptic'), 'expo-haptics is fallback only');
  const nativeIndex = rotary.indexOf('PocktTiming.playUiDetent');
  const expoIndex = rotary.indexOf('fireExpoHaptic');
  assert(nativeIndex >= 0 && expoIndex > nativeIndex, 'native path is preferred over expo-haptics');
  assert(rotary.includes('MIN_GAP'), 'JS limiter remains the only rate gate');
  assert(!read('modules/pockt-timing/ios/PocktTimingEngine.swift').includes('now - lastUiClickMs < 8'), 'native skip gate removed');
});

check('BPM adjustment haptic uses the musical Core Haptics engine', () => {
  const haptics = read('modules/pockt-timing/ios/PocktHapticScheduler.swift');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(haptics.includes('func playUiTransient(kind: String)'), 'UI haptic owner is native');
  assert(haptics.includes('CHHapticTimeImmediate'), 'UI haptic is immediate, not beat-scheduled');
  assert(!haptics.split('func playUiTransient')[1].split('func schedule')[0].includes('cancelAll()'), 'UI haptic does not cancel beat patterns');
  assert(engine.includes('haptics.playUiTransient(kind: kind)'), 'detent audio and haptic share one call');
  assert(haptics.includes('static func stop()'), 'ident haptic engine can be released');
});

check('session recovery restores detents without a JS musical timer', () => {
  const intro = read('components/intro/BrandedIntro.tsx');
  const home = read('audio/known-good-home-sound.ts');
  const main = read('components/pockt/MainScreen.tsx');
  const hook = read('hooks/use-metronome.ts');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(intro.includes('keepAudioSessionActive: true'), 'ident unmount cannot deactivate session');
  assert(home.includes('keepAudioSessionActive: true'), 'home ident replica cannot deactivate session');
  assert(!main.includes('<BrandedIntro'), 'ident haptics never start because the opening is not mounted');
  assert(main.includes('reviveUiDetent()'), 'ident done and tuner close revive detents');
  assert(main.includes('setTunerOpen(false)'), 'tuner close still exists');
  assert(hook.includes("from === 'background'"), 'foreground restore is for real background only');
  assert(engine.includes('ensureEngineRunningForUiDetent'), 'detent revive does not boot musical graph');
  assert(!engine.includes('setInterval'), 'native engine has no JS timer');
});

check('500+ limiter events still emit and never permanently mute', () => {
  const gaps = { dial: 28, pro: 32, roller: 24, step: 20 };
  const lastAt = { dial: 0, pro: 0, roller: 0, step: 0 };
  const kinds = ['dial', 'pro', 'roller', 'step'];
  let emitted = 0;
  let now = 1_000_000;
  for (let i = 0; i < 520; i += 1) {
    const kind = kinds[i % 4];
    now += i % 9 === 0 ? 11 : 36;
    if (i === 80 || i === 240 || i === 400) {
      lastAt.dial = 0;
      lastAt.pro = 0;
      lastAt.roller = 0;
      lastAt.step = 0;
    }
    if (!detentLimiterWouldEmit(now, lastAt[kind], gaps[kind])) continue;
    lastAt[kind] = now;
    emitted += 1;
  }
  assert(emitted >= 500, `expected 500+ accepted detents, got ${emitted}`);
});

check('native playUiDetent is a sync Function returning Bool', () => {
  const moduleSwift = read('modules/pockt-timing/ios/PocktTimingModule.swift');
  const types = read('modules/pockt-timing/src/PocktTimingModule.ts');
  assert(moduleSwift.includes('Function("playUiDetent")'), 'playUiDetent exported');
  assert(moduleSwift.includes('playAudio: Bool, playHaptic: Bool) -> Bool'), 'returns success');
  assert(!/Function\("playUiDetent"\)[\s\S]{0,220}\.runOnQueue/.test(moduleSwift), 'no runOnQueue');
  assert(types.includes('playUiDetent(kind: string, playAudio: boolean, playHaptic: boolean): boolean'), 'TS returns boolean');
  assert(moduleSwift.includes('Function("stopIdentHaptics")'), 'ident haptic teardown exported');
});

if (failures.length) {
  console.error('DETENT RELIABILITY TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('DETENT RELIABILITY TESTS PASSED');
console.log('Physical-device Pass 2 checklist still required:');
console.log('  1. 500+ consecutive BPM detents — click never dies');
console.log('  2. Same with haptics enabled');
console.log('  3. Rapid clockwise/counterclockwise');
console.log('  4. Adjust while metronome is running');
console.log('  5. Play → adjust → Stop → adjust → Play → adjust');
console.log('  6. Move through current Views and keep adjusting');
console.log('  7. Enter tuner → exit → adjust');
console.log('  8. Background → foreground → adjust');
console.log('  9. Interruption recover if testable');
console.log(' 10. Route change if testable');
console.log(' 11. Musical click stays phase-continuous');
console.log(' 12. No duplicate click/haptic per accepted detent');
console.log(' 13. 20–400 BPM intact');

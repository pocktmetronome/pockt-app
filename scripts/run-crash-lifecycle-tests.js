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

check('crash identities are logged, not swallowed', () => {
  const trace = read('lib/crash-trace.ts');
  const metro = read('hooks/use-metronome.ts');
  const main = read('components/pockt/MainScreen.tsx');
  const tuner = read('hooks/use-tuner.ts');
  assert(trace.includes('installCrashInstrumentation'), 'global handler installed');
  assert(trace.includes('previous?.(error, isFatal)'), 'fatal handler still forwards');
  assert(!trace.includes('catch (error) {\n    return'), 'no broad swallow in tracer');
  assert(metro.includes("crashBreadcrumb('play'"), 'play identity');
  assert(metro.includes("crashBreadcrumb('stop'"), 'stop identity');
  assert(metro.includes("crashBreadcrumb('app-foreground'"), 'foreground identity');
  assert(metro.includes("crashBreadcrumb('native-tick-ui-fail'"), 'tick UI failure identity');
  assert(metro.includes('finiteOr(event.visualIntensity'), 'NaN visual guard');
  assert(main.includes("crashBreadcrumb('first-use-selector'"), 'first-use identity');
  assert(main.includes("crashBreadcrumb('pocket-enter'"), 'pocket switch identity');
  assert(main.includes("crashBreadcrumb('tuner-enter'"), 'tuner identity');
  assert(tuner.includes('cancelled'), 'tuner listener cannot attach after unmount');
  assert(tuner.includes('const seq = ++session.current'), 'tuner session generation');
  assert(tuner.includes('A newer session owns the engine'), 'stale startTuner must not stop a newer session');
});

check('tuner pitch events hop to main before the RN bridge', () => {
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const module = read('modules/pockt-timing/ios/PocktTimingModule.swift');
  assert(engine.includes('private func emitTunerPitch'), 'engine marshals tuner pitch');
  assert(engine.includes('self.emitTunerPitch(payload)'), 'tap does not sendEvent directly');
  assert(module.includes('tuner-pitch-off-main'), 'off-main sendEvent is identified');
  const emit = module.slice(module.indexOf('private func emitTunerPitch'), module.indexOf('private func handleDestroy'));
  assert(emit.includes('DispatchQueue.main.async'), 'module hops off-main events');
  assert(!emit.includes('main.sync'), 'tuner pitch must not block the audio thread on main');
});

check('onTick and onEngineState never sendEvent off-main', () => {
  const module = read('modules/pockt-timing/ios/PocktTimingModule.swift');
  assert(module.includes('tick-off-main'), 'off-main tick is identified');
  assert(module.includes('engine-state-off-main'), 'off-main engine state is identified');
  assert(!module.includes('DispatchQueue.main.sync'), 'JS-callable paths must not main.sync');
});

check('detent audio failure does not fire a lone haptic', () => {
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const locked = engine.slice(engine.indexOf('private func playUiDetentLocked'), engine.indexOf('private func scheduleUiClick'));
  assert(locked.includes('playAudio && !audioOk'), 'audio failure aborts before haptic');
  assert(locked.includes('detent-audio-fail'), 'audio-fail breadcrumb exists');
});

check('privacy pull is disabled rather than shipped broken', () => {
  const main = read('components/pockt/MainScreen.tsx');
  assert(main.includes('Privacy pull disabled this recovery pass'), 'disabled with reason');
  assert(fs.existsSync(path.join(__dirname, '..', 'components/curtain/PrivacyCurtain.tsx')), 'source preserved');
});

check('crash recovery does not blindly restore a failing Pocket', () => {
  const health = read('lib/session-health.ts');
  const main = read('components/pockt/MainScreen.tsx');
  assert(health.includes('shouldRecoverToSelector'), 'recovery predicate exists');
  assert(health.includes("healthy === false"), 'unhealthy previous session recovers');
  assert(main.includes('session.recover'), 'unhealthy sessions are still detected');
  assert(main.includes("setLaunchGate('resume')"), 'recovery opens Console instead of the room library');
  assert(main.includes('beginSession'), 'boot writes an unhealthy checkpoint first');
  assert(main.includes('markSessionHealthy'), 'healthy runtime is checkpointed');
  assert(main.includes("AppState.addEventListener('change'"), 'background is a normal exit');
});

if (failures.length) {
  console.error('CRASH LIFECYCLE TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('CRASH LIFECYCLE TESTS PASSED');

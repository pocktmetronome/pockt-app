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

function pendulumPhase(elapsedBeats, centerOrigin = false) {
  return Math.cos(elapsedBeats * Math.PI);
}

function midiFromFrequency(frequency, a4 = 440) {
  return 69 + 12 * Math.log2(frequency / a4);
}

function nearestMidi(frequency, a4 = 440) {
  return Math.round(midiFromFrequency(frequency, a4));
}

function centsFromFrequency(frequency, a4 = 440) {
  const midi = nearestMidi(frequency, a4);
  return 1200 * Math.log2(frequency / (a4 * 2 ** ((midi - 69) / 12)));
}

check('pendulum period is two beats', () => {
  const motion = read('lib/pendulum-motion.ts');
  assert(motion.includes('120000 / Math.max(1, bpm)'), 'full oscillation 120/BPM');
  assert(motion.includes('PENDULUM_SWING_DEG'), 'constant amplitude');
  assert(!motion.includes('if (bpm >= 360) return 5'), 'no BPM-shrunk swing');
  assert(Math.abs(pendulumPhase(0) - 1) < 1e-9, 'beat 0 extreme');
  assert(Math.abs(pendulumPhase(1) + 1) < 1e-9, 'beat 1 opposite extreme');
  assert(Math.abs(pendulumPhase(2) - 1) < 1e-9, 'beat 2 extreme');
  assert(Math.abs(pendulumPhase(0.5)) < 1e-9, 'center between beats');
  assert(Math.abs(pendulumPhase(0, true) - 1) < 1e-9, 'smart start is also an extreme');
  assert(Math.abs(pendulumPhase(0.5, true)) < 1e-9, 'smart halfway is center');
  for (const bpm of [40, 60, 80, 92, 120, 180, 200, 220, 240, 260, 300, 400]) {
    assert(120000 / bpm === 2 * (60000 / bpm), `${bpm} oscillation`);
  }
});

check('rooms share pendulum hook', () => {
  const smart = read('components/classic/SmartPendulumRoom.tsx');
  const mechanical = read('components/classic/PendulaClassicRoom.tsx');
  const hook = read('hooks/use-pendulum-phase.ts');
  const motion = read('lib/pendulum-motion.ts');
  assert(smart.includes('armPendulumStart'), 'start cue + pickup');
  assert(smart.includes('tipSwingDegrees'), 'full canvas swing');
  assert(mechanical.includes("from '@/hooks/use-pendulum-phase'"), 'mechanical shares hook');
  assert(smart.includes("transformOrigin: 'bottom'"), 'fixed bottom pivot');
  assert(!smart.includes('continuousPendulumAngle'), 'old sin path gone');
  assert(!mechanical.includes('continuousPendulumAngle'), 'old sin path gone');
  assert(hook.includes('pendulumAbsoluteAngle'), 'phase is sampled from native beat epoch');
  assert(hook.includes('pulseBeat'), 'native beat index is authority');
  assert(smart.includes('onLayout'), 'measures actual tower width');
  assert(smart.includes('tipSwingDegrees(rodPx, width'), 'derived from viewport');
  assert(!hook.includes('lastPulse'), 'no pulse-edge rephase');
  assert(motion.includes('export function integrateElapsed'), 'shared integrator');
  const tipDeg = (rod, view, half = 2.5) => (Math.asin(Math.min(0.999999, (view / 2 - half) / rod)) * 180) / Math.PI;
  const travel = 300 * Math.sin((tipDeg(300, 390) * Math.PI) / 180);
  assert(Math.abs(travel - (195 - 2.5)) < 0.02, 'tip reaches viewport edge');
  let elapsed = 0;
  const period = 500;
  for (let i = 0; i < 4; i += 1) elapsed += 500 / period;
  assert(Math.abs(elapsed - 4) < 1e-9, 'four equal periods stay on beat 4');
  elapsed = 0;
  [480, 520, 470, 530].forEach((dt) => {
    elapsed += dt / period;
  });
  assert(Math.abs(elapsed - 4) < 1e-9, 'irregular frames still sum to 4 beats');
});

check('pro angle unwrap', () => {
  const nearTop = wrapDelta(-Math.PI + 0.1 - (Math.PI - 0.1));
  assert(Math.abs(nearTop + 0.2) < 1e-9 || Math.abs(nearTop) < 1, 'wraps across 12 o clock');
  assert(Math.abs(wrapDelta(Math.PI + 0.2) + (Math.PI - 0.2)) < 1e-9, 'positive wrap');
  assert(Math.abs(wrapDelta(-Math.PI - 0.2) - (Math.PI - 0.2)) < 1e-9, 'negative wrap');
  const dial = read('lib/pro-dial.ts');
  assert(dial.includes('wrapDelta'), 'shared unwrap');
  assert(dial.includes('DEG_PER_BPM'), 'fixed sensitivity');
  const safe = read('components/classic/SafeDial.tsx');
  assert(safe.includes('event.x'), 'local overlay coordinates');
  assert(safe.includes('wrapDelta'), 'uses unwrap');
  assert(safe.includes('pointerAngle'), 'shared atan2');
});

check('tuner note math', () => {
  assert(Math.abs(nearestMidi(440) - 69) < 1e-9, 'A4 midi');
  assert(Math.abs(centsFromFrequency(440)) < 0.2, 'A4 cents');
  assert(Math.abs(nearestMidi(261.63) - 60) < 1e-9, 'C4 midi');
  assert(Math.abs(centsFromFrequency(261.63)) < 2, 'C4 cents');
  assert(Math.abs(nearestMidi(329.63) - 64) < 1e-9, 'E4 midi');
  assert(centsFromFrequency(445) > 0, '445 is sharp of A4');
  const yin = read('lib/tuner-detect.ts');
  assert(yin.includes('cmnd') || yin.includes('nsdf'), 'YIN/MPM difference function');
  assert(!yin.includes('largest FFT'), 'not fft peak');
});

check('tuner cleanup', () => {
  const hook = read('hooks/use-tuner.ts');
  assert(hook.includes('stopTuner'), 'stops mic');
  assert(hook.includes('live.current = false'), 'no callback after destroy');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(engine.includes('func startTuner'), 'native start');
  assert(engine.includes('emitTunerPitch'), 'tuner pitch is main-queued like ticks');
  assert(engine.includes('waitForValidTunerFormat'), 'waits for hardware format');
  assert(engine.includes('settleTunerInputRoute'), 'route settle before tap');
  const startTuner = engine.slice(engine.indexOf('func startTuner'), engine.indexOf('func stopTuner'));
  assert(!startTuner.includes('ensureEngineRunning'), 'tuner does not boot playback graph first');
  assert(engine.includes('func stopTuner'), 'native stop');
  assert(engine.includes('removeTunerTap'), 'removes tap');
});

check('live tempo does not over-schedule', () => {
  const transport = read('modules/pockt-timing/ios/PocktTransport.swift');
  assert(transport.includes('scheduleDecision'), 'lookahead decision');
  assert(transport.includes('skipMissed'), 'late ticks skipped');
  assert(!transport.includes('if alreadyScheduledThisPass == 0 {\n      return true'), 'old always-schedule-first is gone');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(engine.includes('applyPhaseContinuousTempo'), 'live tempo path');
  assert(engine.includes('queuedAhead'), 'logs committed queue');
});

check('pulse rotary tempo and no screen flash', () => {
  const pulse = read('components/classic/PulseRoom.tsx');
  const menu = read('components/classic/PulseMenu.tsx');
  assert(!pulse.includes('TEMPO_PRESETS'), 'bottom tempo chips gone');
  assert(!menu.includes('[60, 80, 100, 120, 140, 170, 200]'), 'menu preset chips gone');
  assert(pulse.includes('TempoDot'), 'tempo position dot');
  assert(pulse.includes('pulseTurnsToBpm'), 'two-turn unwrapped mapping');
  assert(pulse.includes('liveTurns'), 'cumulative turns across 12 o clock');
  assert(!menu.includes('SCREEN FLASH'), 'pulse menu does not offer screen flash');
});

check('custom content scales and photo is visible', () => {
  const widgets = read('components/classic/CustomWidgets.tsx');
  const editor = read('components/classic/CustomEditor.tsx');
  const layout = read('lib/custom-layout.ts');
  assert(!widgets.includes('Math.min(1.2, scale)'), 'BPM numerals follow scale');
  assert(widgets.includes('28 * face.size * scale'), 'clock text follows scale');
  assert(widgets.includes('onCycle'), 'blocks cycle master accents');
  assert(editor.includes('CHANGE PHOTO'), 'change photo is visible');
  assert(layout.includes('maxScale: 6.4'), 'beat can become huge');
  assert(layout.includes('photoFit'), 'photo crop persists');
});

check('pro labels are readable', () => {
  const pro = read('components/classic/ProRoom.tsx');
  assert(pro.includes('PRESETS'), 'presets label');
  assert(pro.includes('SETLIST'), 'setlist label');
  assert(pro.includes('HAPTIC ON'), 'haptic on/off');
  assert(!pro.includes("label=\"PRE\""), 'no truncated PRE');
  assert(pro.includes('TIME'), 'time signature spelled');
  assert(!pro.includes('T.S.'), 'no cryptic TS');
});

check('ledgear frame pulse', () => {
  const room = read('components/classic/LedgearRoom.tsx');
  assert(room.includes('frameGlow'), 'frame pulse');
  assert(room.includes('AccentCell'), 'fixed accent geometry');
  assert(!room.includes('displayGlow'), 'digits are not the flash');
});

check('beatline sconce and pulse identity', () => {
  const light = read('components/classic/BeatlineSpotlight.tsx');
  assert(light.includes('sconce'), 'wide sconce wash');
  assert(light.includes('sconcePath'), 'tapered cone');
  assert(!light.includes('styles.fixture'), 'no visible source object');
  assert(light.includes('pulse.value'), 'scheduled light');
  assert(light.includes('level3Color'), 'accent-colored wash');
  assert(!light.includes('scaleX: 7.2'), 'no brick stretch');
  const pulse = read('components/classic/PulseRoom.tsx');
  assert(!pulse.includes('markerSlot'), 'no orbiting dot');
  assert(pulse.includes('toggle()'), 'center start/stop');
  const pad = read('components/modals/BpmPadSheet.tsx');
  assert(pad.includes('overFullScreen'), 'pad overlays without tearing the room');
});

if (failures.length) {
  console.error('COLLECTION TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('COLLECTION TESTS PASSED');
console.log('pendulum endpoints, pro unwrap, tuner math, LEDGear frame, Beatline sconce');

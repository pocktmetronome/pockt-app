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

const AMP = 34;

function clampPhase(phase) {
  if (!Number.isFinite(phase) || phase <= 0) return 0;
  if (phase >= 1) return 1;
  return phase;
}

function travelSign(beatIndex) {
  return Math.max(0, Math.floor(beatIndex)) % 2 === 0 ? 1 : -1;
}

function visualFromPhase(beatIndex, phase01, amplitude = AMP) {
  return travelSign(beatIndex) * amplitude * Math.sin(Math.PI * clampPhase(phase01));
}

function phaseFromAge(ageMs, periodMs) {
  if (!(periodMs > 0) || !Number.isFinite(ageMs) || ageMs <= 0) return 0;
  return Math.min(1, ageMs / periodMs);
}

function anchorFromNativeBeat(nowMs, previousAnchorMs, previousBeat, nextBeat, periodMs) {
  const jumped = nextBeat - previousBeat;
  if (previousAnchorMs > 0 && jumped > 0 && Number.isFinite(jumped) && periodMs > 0) {
    return previousAnchorMs + jumped * periodMs;
  }
  return nowMs;
}

check('isolated mapping: beat is CENTER, extreme is halfway', () => {
  assert(Math.abs(visualFromPhase(0, 0)) < 1e-9, 'beat 0 is CENTER');
  assert(visualFromPhase(0, 0.25) > 0 && visualFromPhase(0, 0.25) < AMP, 'quarter is toward RIGHT');
  assert(Math.abs(visualFromPhase(0, 0.5) - AMP) < 1e-9, 'halfway is RIGHT extreme');
  assert(visualFromPhase(0, 0.75) > 0 && visualFromPhase(0, 0.75) < AMP, 'three-quarter returning');
  assert(Math.abs(visualFromPhase(1, 0)) < 1e-9, 'beat 1 is CENTER');
  assert(Math.abs(visualFromPhase(1, 0.5) + AMP) < 1e-9, 'beat 1 halfway is LEFT extreme');
  assert(Math.abs(visualFromPhase(2, 0)) < 1e-9, 'beat 2 returns CENTER moving right');
});

check('mapping holds across BPM range without using display time as musical truth', () => {
  for (const bpm of [20, 40, 60, 80, 120, 180, 200, 300, 400]) {
    const period = 60000 / bpm;
    assert(Math.abs(visualFromPhase(0, phaseFromAge(0, period))) < 1e-6, `${bpm} beat is center`);
    assert(Math.abs(visualFromPhase(0, phaseFromAge(period / 2, period)) - AMP) < 1e-6, `${bpm} halfway is right extreme`);
    assert(Math.abs(visualFromPhase(0, phaseFromAge(period, period))) < 1e-6, `${bpm} next beat is center`);
    assert(Math.abs(visualFromPhase(1, phaseFromAge(period / 2, period)) + AMP) < 1e-6, `${bpm} odd halfway is left extreme`);
    const skipped = visualFromPhase(0, phaseFromAge(period * 0.8, period));
    const dense = visualFromPhase(0, 0.8);
    assert(Math.abs(skipped - dense) < 1e-9, `${bpm} skipped frames do not change phase mapping`);
  }
});

check('late JS rendering samples a later phase instead of snapping to center', () => {
  const late = visualFromPhase(0, phaseFromAge(180, 500));
  const snapped = visualFromPhase(0, 0);
  assert(Math.abs(late - snapped) > 1, 'late sample is not forced to center');
  assert(phaseFromAge(800, 500) === 1, 'age past one beat clamps; native must advance beatIndex');
});

check('native beat identity advances epoch instead of Date.now()', () => {
  const period = 500;
  const first = anchorFromNativeBeat(1000, 0, -1, 0, period);
  assert(first === 1000, 'first beat anchors at arrival');
  const lateSecond = anchorFromNativeBeat(1640, first, 0, 1, period);
  assert(lateSecond === 1500, 'second beat uses previous + period, not display now');
  const phase = phaseFromAge(1640 - lateSecond, period);
  assert(Math.abs(phase - 0.28) < 1e-9, 'late JS sits 140ms past center, not snapped');
});

check('live BPM change keeps visual phase', () => {
  const now = 8000;
  const oldPeriod = 500;
  const anchor = 7750;
  const phase = phaseFromAge(now - anchor, oldPeriod);
  const newPeriod = 250;
  const remapped = now - phase * newPeriod;
  assert(Math.abs(phaseFromAge(now - remapped, newPeriod) - phase) < 1e-9, 'phase survives tempo change');
});

check('Mechanical and Smart Pendulum consume the absolute renderer', () => {
  const hook = read('hooks/use-pendulum-phase.ts');
  const smart = read('components/classic/SmartPendulumRoom.tsx');
  const mechanical = read('components/classic/PendulaClassicRoom.tsx');
  const haptics = read('lib/pendulum-haptics.ts');
  const align = read('lib/pendulum-align.ts');
  assert(hook.includes("from '@/lib/pendulum-absolute'"), 'hook imports absolute renderer');
  assert(hook.includes('pendulumAbsoluteAngle'), 'hook outputs absolute angle');
  assert(hook.includes('pendulumMusicalPosition'), 'hook samples musical position');
  assert(!hook.includes('Date.now()'), 'hook does not reset epoch to Date.now()');
  assert(!hook.includes('pendulumThetaFromNative'), 'old double-count path is gone');
  assert(!hook.includes('setInterval'), 'no JS musical timer');
  assert(smart.includes('usePendulumPhase'), 'Smart Pendulum consumes the hook');
  assert(mechanical.includes('usePendulumPhase'), 'Mechanical consumes the hook');
  assert(haptics.includes('return false'), 'animation-center haptic forbidden');
  assert(!smart.includes('isCenterCrossing'), 'no Smart center haptic');
  assert(!mechanical.includes('isCenterCrossing'), 'no Mechanical center haptic');
  assert(align.includes('pendulumBeatEventAgrees'), 'AVH compare helper exists');
  assert(smart.includes('armPendulumStart?.(0.5)'), 'Build 69 Smart start pickup is half a beat');
});

check('source files document center-at-beat', () => {
  const reference = read('lib/pendulum-reference.ts');
  assert(reference.includes('Musical beat / click / beat haptic = CENTER crossing'), 'contract locked');
  assert(reference.includes('Visual extremes are turnarounds BETWEEN pulses'), 'extremes are not beats');
  assert(reference.includes('Math.sin(Math.PI * phase)'), 'sin center model');
});

if (failures.length) {
  console.error('PENDULUM REFERENCE TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('PENDULUM REFERENCE TESTS PASSED');

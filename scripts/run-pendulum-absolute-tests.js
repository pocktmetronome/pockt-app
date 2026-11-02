'use strict';

/**
 * Independent pendulum invariants. These re-implement the equation in this file
 * so they do not merely echo the production source.
 *
 * angle = A * sin(π * p)
 * p = beatIndex + (nowHost - beatHost) / secondsPerBeat
 */

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

function position(beatIndex, beatHost, nowHost, spb) {
  return beatIndex + (nowHost - beatHost) / spb;
}

function angle(p, amplitude = AMP) {
  return amplitude * Math.sin(Math.PI * p);
}

function angleAt(beatIndex, beatHost, nowHost, spb, amplitude = AMP) {
  return angle(position(beatIndex, beatHost, nowHost, spb), amplitude);
}

const TEMPOS = [20, 40, 60, 80, 120, 180, 200, 300, 400];

check('integer beat is center; half-beat is alternating extreme', () => {
  for (const bpm of TEMPOS) {
    const spb = 60 / bpm;
    const host = 10;
    assert(Math.abs(angleAt(0, host, host, spb)) < 1e-9, `${bpm} p=0 center`);
    assert(Math.abs(angleAt(0, host, host + spb / 2, spb) - AMP) < 1e-9, `${bpm} p=0.5 right`);
    assert(Math.abs(angleAt(0, host, host + spb, spb)) < 1e-9, `${bpm} p=1 center`);
    assert(Math.abs(angleAt(1, host + spb, host + spb * 1.5, spb) + AMP) < 1e-9, `${bpm} p=1.5 left`);
    assert(Math.abs(angleAt(2, host + 2 * spb, host + 2 * spb, spb)) < 1e-9, `${bpm} p=2 center`);
  }
});

check('continuity around beat and extreme', () => {
  const spb = 0.5;
  const host = 0;
  const eps = 1e-4;
  const before = angleAt(0, host, host + spb - eps * spb, spb);
  const at = angleAt(0, host, host + spb, spb);
  const after = angleAt(0, host, host + spb + eps * spb, spb);
  assert(Math.abs(at) < 1e-9, 'beat is center');
  assert(before > 0 && after < 0, 'center crossing reverses sign');
  assert(Math.abs(before) < AMP * 0.02 && Math.abs(after) < AMP * 0.02, 'near-beat is near center');
  const exBefore = angleAt(0, host, host + spb * (0.5 - eps), spb);
  const ex = angleAt(0, host, host + spb * 0.5, spb);
  const exAfter = angleAt(0, host, host + spb * (0.5 + eps), spb);
  assert(Math.abs(ex - AMP) < 1e-6, 'extreme is +A');
  assert(exBefore > 0 && exAfter > 0, 'extreme neighborhood stays same sign');
  assert(exBefore < ex && exAfter < ex, 'velocity is zero at extreme (neighbors lower)');
});

check('velocity direction: max at center, zero at extreme', () => {
  const dAngle = (p) => AMP * Math.PI * Math.cos(Math.PI * p);
  assert(Math.abs(dAngle(0) - AMP * Math.PI) < 1e-9, 'max +velocity at even center');
  assert(Math.abs(dAngle(0.5)) < 1e-9, 'zero velocity at right extreme');
  assert(Math.abs(dAngle(1) + AMP * Math.PI) < 1e-9, 'max -velocity at odd center');
  assert(Math.abs(dAngle(1.5)) < 1e-9, 'zero velocity at left extreme');
});

check('arbitrary timestamp sampling equals the closed form', () => {
  const samples = [0, 0.017, 0.113, 0.5, 0.791, 1.333, 2.017, 5.173];
  for (const t of samples) {
    const closed = angleAt(0, 0, t, 0.5);
    const p = t / 0.5;
    assert(Math.abs(closed - angle(p)) < 1e-12, `t=${t}`);
  }
});

check('skipped display frames do not change the sampled angle', () => {
  const T = 5.173;
  const direct = angleAt(0, 0, T, 0.5);
  const frames60 = [];
  for (let t = 5.1; t <= T + 1e-9; t += 1 / 60) frames60.push(t);
  frames60.push(T);
  const last60 = angleAt(0, 0, frames60[frames60.length - 1], 0.5);
  assert(Math.abs(direct - last60) < 1e-12, '60Hz walk equals direct sample');

  const frames120 = [];
  for (let t = 5.1; t <= T + 1e-9; t += 1 / 120) frames120.push(t);
  frames120.push(T);
  assert(Math.abs(direct - angleAt(0, 0, frames120[frames120.length - 1], 0.5)) < 1e-12, '120Hz walk equals direct');

  const irregular = [5.1, 5.116, 5.19, 5.21, 5.4, T];
  assert(Math.abs(direct - angleAt(0, 0, irregular[irregular.length - 1], 0.5)) < 1e-12, 'irregular walk equals direct');

  const dropped = angleAt(0, 0, T, 0.5);
  assert(Math.abs(direct - dropped) < 1e-12, 'one jump to T equals dense walk');

  const stall100 = angleAt(0, 0, 5.1 + 0.1, 0.5);
  const stall100Direct = angle(position(0, 0, 5.2, 0.5));
  assert(Math.abs(stall100 - stall100Direct) < 1e-12, '100ms stall next frame is absolute');

  const stall250 = angleAt(0, 0, 5.1 + 0.25, 0.5);
  assert(Math.abs(stall250 - angle(position(0, 0, 5.35, 0.5))) < 1e-12, '250ms stall next frame is absolute');
});

check('late JS beat delivery samples elapsed host time, never snaps to center', () => {
  const spb = 0.5;
  const beatHost = 1.0;
  const now = 1.18;
  const late = angleAt(0, beatHost, now, spb);
  assert(Math.abs(late) > 1, 'late sample is not center');
  assert(Math.abs(late - angle(0 + (now - beatHost) / spb)) < 1e-12, 'late sample uses host elapsed');
});

check('coalesced beats use the latest native epoch', () => {
  const spb = 0.5;
  const now = 2.05;
  const coalesced = angleAt(2, 2.0, now, spb);
  const skippedIntermediate = angleAt(0, 0, now, spb);
  assert(Math.abs(coalesced - skippedIntermediate) < 1e-9, 'beat 2 at t=2 is the same timeline as beat 0 at t=0');
});

check('live BPM change can remap host without teleporting position', () => {
  const now = 8;
  const beat = 4;
  const oldSpb = 0.5;
  const oldHost = 7.75;
  const p = position(beat, oldHost, now, oldSpb);
  const newSpb = 0.25;
  const newHost = now - (p - beat) * newSpb;
  assert(Math.abs(position(beat, newHost, now, newSpb) - p) < 1e-12, 'position continuous across tempo remap');
  assert(Math.abs(angle(position(beat, newHost, now, newSpb)) - angle(p)) < 1e-12, 'angle continuous');
});

check('stop parks at center; Play requires a native start epoch before motion', () => {
  assert(Math.abs(angle(0)) < 1e-12, 'rest is center');
  const epoch = { beatIndex: 0, beatHostSeconds: 12.4, secondsPerBeat: 0.5 };
  assert(epoch.beatHostSeconds > 0, 'start epoch host is nonzero');
  const metro = read('hooks/use-metronome.ts');
  assert(metro.includes('pendulumEpochFromNativeStart'), 'Play writes native start epoch');
  assert(metro.includes('firstBeatHostTime') || metro.includes('beatHostSeconds'), 'start report host is consumed');
  const startIdx = metro.indexOf('pendulumEpochFromNativeStart(started)');
  const playIdx = metro.indexOf('setPlaying(true)', startIdx);
  assert(startIdx >= 0 && playIdx > startIdx, 'epoch is written before playing=true');
});

check('startup acquisition: late onTick with the same epoch does not move the arm', () => {
  const delays = [0, 1 / 60, 2 / 60, 0.05, 0.1, 0.25];
  const frame = 1 / 60;
  for (const bpm of TEMPOS) {
    const spb = 60 / bpm;
    const E = 40;
    const t1 = E + frame;
    const firstMoving = angleAt(0, E, t1, spb);
    for (const delay of delays) {
      const t2 = t1 + delay;
      const afterTickSameEpoch = angleAt(0, E, t2, spb);
      const stillAtT1 = angleAt(0, E, t1, spb);
      assert(Math.abs(stillAtT1 - firstMoving) < 1e-12, `${bpm} BPM delay=${delay} tick must not change T1`);
      assert(Math.abs(afterTickSameEpoch - angle(position(0, E, t2, spb))) < 1e-12, `${bpm} BPM delay=${delay} T2 is absolute`);
      const differentEpoch = angleAt(0, E + delay, t2, spb);
      if (delay > 0) {
        assert(Math.abs(afterTickSameEpoch - differentEpoch) > 1e-6, `${bpm} BPM a new epoch at tick time would be a visible correction`);
      }
    }
  }
});

check('stop/restart uses a fresh epoch and does not inherit phase', () => {
  const spb = 0.5;
  const first = { beat: 4, host: 10, t: 10.4 };
  const stale = angleAt(first.beat, first.host, first.t, spb);
  const restart = { beat: 0, host: 50, t: 50.02 };
  const fresh = angleAt(restart.beat, restart.host, restart.t, spb);
  assert(Math.abs(stale - fresh) > 1e-6, 'new start is not the previous visual phase');
  assert(Math.abs(fresh - angle(position(0, 50, 50.02, spb))) < 1e-12, 'restart samples the new epoch');
  const metro = read('hooks/use-metronome.ts');
  const stop = metro.slice(metro.indexOf('const stop = useCallback'));
  assert(stop.includes('pulseBeatHost.value = 0'), 'Stop clears beatHost');
  assert(stop.includes('pulseBeat.value = 0'), 'Stop clears beatIndex');
});

check('Pocket switch samples the existing epoch instead of restarting visual phase', () => {
  const spb = 0.5;
  const epoch = { beat: 2, host: 8, now: 8.37 };
  const mechanical = angleAt(epoch.beat, epoch.host, epoch.now, spb);
  const smart = angleAt(epoch.beat, epoch.host, epoch.now, spb);
  assert(Math.abs(mechanical - smart) < 1e-12, 'Mechanical and Smart share one absolute sample');
  const hook = read('hooks/use-pendulum-phase.ts');
  assert(hook.includes('visualHostSeconds'), 'remount seeds from native host now');
  assert(hook.includes('pendulumAngleAtHost'), 'remount uses the absolute equation');
});

check('runtime consumes the absolute renderer, not the retired path', () => {
  const hook = read('hooks/use-pendulum-phase.ts');
  const abs = read('lib/pendulum-absolute.ts');
  const smart = read('components/classic/SmartPendulumRoom.tsx');
  const mechanical = read('components/classic/PendulaClassicRoom.tsx');
  const harness = read('components/classic/PendulumReferenceHarness.tsx');
  const metro = read('hooks/use-metronome.ts');
  const native = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(abs.includes('amp * Math.sin(Math.PI * p)'), 'absolute sine model');
  assert(abs.includes('beat + elapsed / secondsPerBeat'), 'absolute musical position');
  assert(hook.includes("from '@/lib/pendulum-absolute'"), 'hook uses replacement math');
  assert(hook.includes('pendulumMusicalPosition'), 'samples absolute position');
  assert(hook.includes('pendulumAbsoluteAngle'), 'renders absolute angle');
  assert(!hook.includes('pendulumPhaseFromDisplayAge'), 'retired clamp path is gone');
  assert(!hook.includes('remapPendulumAnchor'), 'retired display remap is gone');
  assert(!hook.includes('pendulumAnchorFromNativeBeat'), 'retired receipt-time epoch is gone');
  assert(!hook.includes('Date.now()'), 'no Date.now musical clock');
  assert(!hook.includes('integrateElapsed'), 'no per-frame integration');
  assert(!hook.includes('timeSincePreviousFrame'), 'no dt integration');
  assert(!hook.includes('setInterval'), 'no JS musical timer');
  assert(metro.includes('pendulumEpochFromNativeStart'), 'Play applies native start epoch');
  assert(metro.includes('eventHostTime'), 'tick carries host time');
  assert(metro.includes('visualHostSeconds'), 'native host seconds used for live BPM remap');
  assert(metro.includes('remapBeatHostForTempo'), 'live BPM remaps host instead of teleporting');
  assert(!metro.includes('nativeNow - performance.now()'), 'tick path does not mix performance.now into host time');
  assert(native.includes('func visualHostSeconds'), 'native host seconds bridge exists');
  assert(native.includes('firstBeatHostTime'), 'start report exposes first beat host');
  assert(/visualOriginHostTime = mach_absolute_time\(\)\s*scheduleUntilHorizon/s.test(native), 'visual origin is captured before first schedule');
  assert(smart.includes('usePendulumPhase'), 'Smart uses one renderer');
  assert(mechanical.includes('usePendulumPhase'), 'Mechanical uses one renderer');
  assert(mechanical.includes("transformOrigin: 'bottom'"), 'Mechanical pivot is bottom');
  assert(smart.includes("transformOrigin: 'bottom'"), 'Smart pivot is bottom');
  assert(harness.includes('pendulum-reference-harness'), 'reference harness exists');
  assert(!smart.includes('isCenterCrossing'), 'no visual-center haptic');
  assert(!mechanical.includes('isCenterCrossing'), 'no visual-center haptic');
  const pulse = read('components/classic/PulseRoom.tsx');
  assert(pulse.includes('pulseBeat'), 'Pulse follows the native beat');
  const commit = read('lib/pulse-commit.ts');
  assert(commit.includes("'worklet'"), 'Pulse worklets remain');
});

if (failures.length) {
  console.error('PENDULUM ABSOLUTE TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('PENDULUM ABSOLUTE TESTS PASSED');
console.log('absolute sine model, drop-frame identity, late/coalesced beats, tempo remap');

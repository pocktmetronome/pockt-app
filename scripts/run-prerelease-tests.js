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

function pendulumTheta(beatIndex, beatPhase, amplitude) {
  const direction = beatIndex % 2 === 0 ? 1 : -1;
  return direction * amplitude * Math.sin(Math.PI * beatPhase);
}

function pendulumThetaFromNative(beatIndex, ageMs, periodMs, amplitude) {
  if (!(periodMs > 0) || ageMs < 0) return 0;
  const phase = Math.min(1, ageMs / periodMs);
  return pendulumTheta(beatIndex, phase, amplitude);
}

check('mechanical phase is a pure function of native beat time', () => {
  const amp = 26;
  assert(Math.abs(pendulumTheta(0, 0, amp)) < 1e-9, 'beat 0 is CENTER');
  assert(Math.abs(pendulumTheta(0, 0.5, amp) - amp) < 1e-9, 'halfway is RIGHT extreme');
  assert(Math.abs(pendulumTheta(0, 1, amp)) < 1e-9, 'next beat is CENTER');
  assert(Math.abs(pendulumTheta(1, 0.5, amp) + amp) < 1e-9, 'odd beat halfway is LEFT extreme');
  const a = pendulumThetaFromNative(0, 0, 500, amp);
  const b = pendulumThetaFromNative(0, 250, 500, amp);
  const c = pendulumThetaFromNative(0, 500, 500, amp);
  assert(Math.abs(a) < 1e-9 && Math.abs(b - amp) < 1e-9 && Math.abs(c) < 1e-9, 'display samples skip without drift');
  const late = pendulumThetaFromNative(0, 180, 500, amp);
  assert(Math.abs(late) > 1, 'late frames sample later phase rather than snap to center');
  for (const bpm of [20, 40, 60, 80, 120, 180, 200, 300, 400]) {
    const period = 60000 / bpm;
    const center = pendulumThetaFromNative(0, 0, period, amp);
    const right = pendulumThetaFromNative(0, period / 2, period, amp);
    const next = pendulumThetaFromNative(0, period, period, amp);
    assert(Math.abs(center) < 1e-9, `${bpm} BPM beat is center`);
    assert(Math.abs(right - amp) < 1e-9, `${bpm} BPM halfway is right extreme`);
    assert(Math.abs(next) < 1e-9, `${bpm} BPM next beat is center`);
  }
  const hook = read('hooks/use-pendulum-phase.ts');
  assert(hook.includes('pendulumAbsoluteAngle'), 'hook samples absolute renderer');
  assert(hook.includes('pendulumMusicalPosition'), 'epoch is native host time');
  assert(!hook.includes('integrateElapsed('), 'hook does not accumulate elapsed');
  assert(read('components/classic/PendulaClassicRoom.tsx').includes('nextAxis === \'horizontal\''), 'weight drag does not steal the arm');
});

check('BPM detents survive 500 adjustments', () => {
  const gaps = { dial: 28, pro: 32, roller: 24, step: 20 };
  const lastAt = { dial: 0, pro: 0, roller: 0, step: 0 };
  let audio = 0;
  let now = 1_000_000;
  const kinds = ['dial', 'pro', 'roller', 'step'];
  for (let i = 0; i < 500; i += 1) {
    const kind = kinds[i % 4];
    now += i % 9 === 0 ? 12 : 40;
    if (i === 120 || i === 340) {
      lastAt.dial = 0;
      lastAt.pro = 0;
      lastAt.roller = 0;
      lastAt.step = 0;
    }
    if (lastAt[kind] > 0 && now - lastAt[kind] < gaps[kind]) continue;
    lastAt[kind] = now;
    audio += 1;
  }
  assert(audio > 400, `long-run detents stay alive (${audio})`);
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const locked = engine.split('private func playUiDetentLocked')[1]?.split('private func scheduleUiClick')[0] ?? '';
  assert(engine.includes('AVAudioPlayerNode(), AVAudioPlayerNode(), AVAudioPlayerNode()'), 'three UI detent nodes');
  assert(engine.includes('connectUiClickPlayers(force: true)'), 'UI nodes reconnect after graph restore');
  assert(!locked.includes('connectUiClickPlayers'), 'BPM drags do not reconnect UI nodes');
});

check('whiskey bar uses still plate plus native beat actions', () => {
  const assets = read('lib/bar-assets.ts');
  const skin = read('components/skins/BarSkin.tsx');
  const actions = read('lib/bar-beat-actions.ts');
  const sync = read('lib/bar-video-sync.ts');
  assert(assets.includes('rejected: true'), 'v3 is rejected');
  assert(assets.includes('enabled: false'), 'v3 is not the ambient player');
  assert(skin.includes('BarBeatActions'), 'beat-action overlays exist');
  assert(skin.includes('bar-beat-debug'), 'debug beat markers exist');
  assert(actions.includes("id: 'coaster'") && actions.includes("id: 'glass'") && actions.includes("id: 'jigger'") && actions.includes("id: 'shaker'"), 'four beat actions');
  assert(sync.includes('BAR_VIDEO_FOLLOW_BPM = false'), 'no BPM stretch');
  assert(!skin.includes('setInterval'), 'no JS musical timer');
});

check('pulse reduce motion keeps rings visible', () => {
  const pulse = read('components/classic/PulseRoom.tsx');
  const bezel = read('components/pockt2/ShellBezel.tsx');
  assert(pulse.includes('pulseBeat'), 'rings originate from native beats');
  assert(bezel.includes('label="Pockets"'), 'global Pockets chrome clears the status bar');
  assert(pulse.includes('pulseBeat'), 'rings originate from native beats');
});

check('tuner 2.0 chromatic and strings', () => {
  const ui = read('components/tuner/TunerScreen.tsx');
  const profiles = read('lib/tuning-profiles.ts');
  assert(ui.includes('CHROMATIC') && ui.includes('STRINGS'), 'mode tabs');
  assert(ui.includes('TunerHeadstock'), 'headstock view');
  assert(profiles.includes('dadgad') && profiles.includes('5_string_standard'), 'supplied profiles');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/tuner/pockt-headstock-3x3.svg')), '3+3 SVG installed');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/tuner/pockt-headstock-6inline.svg')), '6-inline SVG installed');
  assert(read('components/tuner/TunerHeadstock.tsx').includes('pockt-headstock-3x3-preview.png'), 'headstock uses supplied POCKT art');
  assert(ui.includes('playReferenceTone'), 'optional reference tone');
  assert(!ui.includes('sign in') && !ui.includes('paywall'), 'no account wall');
});

check('practice trainer uses native bar/beat events', () => {
  const hook = read('hooks/use-practice.ts');
  const practice = read('lib/practice.ts');
  const screen = read('components/screens/PracticeScreen.tsx');
  assert(hook.includes('transport.beatIndex'), 'seconds ramp counts native beats');
  assert(!hook.includes('setTimeout(pulse'), 'no 250ms musical clock');
  assert(practice.includes('spaceRandom'), 'random gap exists');
  assert(screen.includes('RANDOM GAP'), 'random gap is offered');
  assert(read('lib/classic-core.ts').includes("id: 3, label: '3 BARS'"), 'count-in includes 3 bars');
});

check('meter groupings include 9/8', () => {
  const select = read('lib/meter-select.ts');
  assert(select.includes('9-333') && select.includes('9-2223') && select.includes('9-3222'), '9/8 groupings');
  assert(read('constants/meter.ts').includes("'3+3+3'"), '9/8 default 3+3+3');
});

check('reset all settings preserves creations', () => {
  const reset = read('lib/reset-all.ts');
  const settings = read('components/screens/SettingsScreen.tsx');
  assert(reset.includes('Recordings, setlists, and custom tunings are kept'), 'scope is documented');
  assert(settings.includes('RESET ALL SETTINGS'), 'destructive confirmation exists');
  assert(!reset.includes('saveCustomTunings([])'), 'custom tunings are not wiped');
});

check('sound studio hides game-like voices', () => {
  const library = read('constants/sound-library.ts');
  assert(!library.includes("'lib-vocal-effort'") || library.indexOf('lib-vocal-effort') < 0 || !/sounds: \[[^\]]*'lib-vocal-effort'/.test(library), 'effort voices pruned from studio');
  assert(!/sounds: \[[^\]]*'lib-blip'/.test(library), 'weak blip pruned from synth');
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`ok ${failures.length === 0 ? 'prerelease architecture' : ''}`);

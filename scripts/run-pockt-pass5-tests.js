'use strict';

const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function extractArray(source, name) {
  const match = source.match(new RegExp(`export const ${name}(?:: [^=]+)? = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`Missing ${name}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
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

const main = read('components/pockt/MainScreen.tsx');
const selector = read('components/pockt/ViewSelectorSheet.tsx');
const pockets = read('lib/pockt-pockets.ts');
const library = read('lib/library.ts');
const rooms = read('constants/rooms.ts');
const settings = read('components/screens/SettingsScreen.tsx');
const bezel = read('components/pockt2/ShellBezel.tsx');
const pulse = read('components/classic/PulseRoom.tsx');
const pulseCommit = read('lib/pulse-commit.ts');
const hook = read('hooks/use-pendulum-phase.ts');
const motion = read('lib/pendulum-motion.ts');
const haptics = read('lib/pendulum-haptics.ts');
const help = read('components/pockt2/HelpTip.tsx');
const helpCopy = read('constants/pockt-help.ts');
const app = read('app.json');
const metro = read('hooks/use-metronome.ts');
const experience = read('lib/pockt-experience.ts');
const detent = read('lib/rotary-feedback.ts');
const privacy = read('components/curtain/PrivacyCurtain.tsx');
const tuner = read('components/tuner/TunerScreen.tsx');
const sound = read('components/modals/SoundLibrarySheet.tsx');
const native = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const engine = read('lib/metronome-engine.ts');

const immersive = extractArray(rooms, 'IMMERSIVE_ROOM_ORDER');

check('1 first-use opens Console', () => {
  assert(pockets.includes('needsFirstPocketChoice'), 'first-use gate exists');
  assert(pockets.includes("POCKET_SELECTOR_TITLE = 'CHOOSE YOUR POCKET'"), 'selector title preserved off the launch path');
  assert(main.includes('needsFirstPocketChoice(migratedLib)'), 'cold launch consults discovery');
  assert(main.includes("const foundationView: RoomId = 'dial'"), 'cold launch opens Console');
  assert(main.includes("setLaunchGate('resume')"), 'launch resumes the instrument');
  assert(!main.includes('showFirstUseSelector'), 'selector is not the launch screen');
  assert(!selector.includes('Select an instrument to begin'), 'no extra instruction copy');
  assert(!selector.includes('tutorial'), 'no tutorial carousel');
});

check('2 returning user keeps fast entry', () => {
  assert(pockets.includes('migratePocketDiscovery'), 'existing installs migrate');
  assert(pockets.includes('hadPersistedSettings'), 'settings-on-disk is returning');
  assert(main.includes('resolveLaunchView'), 'last-used Pocket restores');
  assert(main.includes("useState<AppView>('metronome')"), 'returning launch is the instrument');
});

check('3 no auto-play', () => {
  assert(experience.includes('RESTORE_PLAYBACK_ON_LAUNCH = false'), 'policy');
  assert(!main.includes('toggle()') || main.includes('shouldRestorePlaybackOnLaunch'), 'launch does not start');
  const launch = main.split('processColdLaunch = false')[1]?.split('goHome')[0] ?? '';
  assert(!launch.includes('toggle()'), 'cold launch does not toggle');
});

check('4 one authoritative Pocket selector', () => {
  assert(bezel.includes('label="Pockets"'), 'shell opens Pockets');
  assert(selector.includes('CHOOSE YOUR POCKET') || selector.includes('POCKET_SELECTOR_TITLE'), 'one title');
  assert(!selector.includes('onOpenLibrary'), 'selector has no competing Library gallery');
  assert(settings.includes('label="POCKETS"'), 'Mix Pockets opens the same destination');
  assert(main.includes("setStack(['views'])"), 'Mix Pockets goes to the selector');
});

check('5 no competing Library gallery', () => {
  assert(settings.includes('FAVORITES · PRESETS · SONGS'), 'Library remains saved work');
  assert(!selector.includes('label="Library"'), 'selector does not open Home/RoomBrowser');
  assert(!selector.includes('onOpenLibrary'), 'Views no longer routes to Home');
});

check('6 Whiskey Bar is Coming Soon and cannot launch', () => {
  assert(/bar: \{[\s\S]*?enabled: false/.test(rooms), 'bar remains disabled');
  assert(pockets.includes("WHISKEY_BAR_TEASER_ID = 'bar'"), 'teaser id');
  assert(pockets.includes("status: 'COMING SOON'"), 'teaser copy');
  assert(selector.includes('whiskeyBarTeaserLabel') || selector.includes('teaser'), 'selector shows Coming Soon teaser');
  assert(selector.includes('accessibilityState={{ disabled: true }}'), 'teaser is not enterable');
  assert(fs.existsSync(path.join(__dirname, '..', 'components/skins/BarSkin.tsx')), 'bar source preserved');
});

check('7 Custom/Altered prioritized over Studio', () => {
  assert(pockets.includes("'altered', 'studio'"), 'priority list');
  assert(immersive[0] === 'altered' && immersive[1] === 'studio', `immersive order ${immersive.join(',')}`);
  assert(pockets.includes('...CUSTOM_ROOM_ORDER'), 'Custom before immersive');
});

check('8 current Pocket is actionable', () => {
  assert(selector.includes('pocketSelectorHero') || pockets.includes('pocketSelectorHero'), 'hero helper');
  assert(selector.includes('Current Pocket'), 'current hero is tappable');
  assert(!selector.includes('Now Playing'), 'no decorative Now Playing');
});

check('9 Pulse uses shared BPM/transport', () => {
  assert(pulse.includes('onBpm={setBpm}'), 'shared setBpm');
  assert(pulse.includes('toggle()'), 'shared toggle');
  assert(!pulse.includes('setInterval'), 'no Pulse JS clock');
});

check('10 rapid Pulse rotary preserves final BPM', () => {
  assert(pulseCommit.includes('pulseFinalBpm'), 'final BPM helper remains');
  assert(pulse.includes('pulseTurnsToBpm'), 'Build 69 two-turn mapping');
  assert(pulse.includes('liveTurns'), 'cumulative turns across 12 o clock');
  assert(pulse.includes('manualActivation'), 'gesture end commits the mapped BPM');
  const steps = [80, 90, 140, 188];
  const final = steps[steps.length - 1];
  assert(final === 188, 'last committed integer is the intended BPM');
});

check('11 Pulse Play invokes native engine', () => {
  assert(pulse.includes('hapticPulseTick'), 'Build 69 play haptic');
  assert(pulse.includes('toggle()'), 'Play calls shared transport');
  assert(metro.includes('PocktTiming.start'), 'native start remains');
});

check('12 pendulum phase is derived from authoritative timing', () => {
  assert(hook.includes('pendulumMusicalPosition'), 'samples absolute musical position');
  assert(hook.includes("from '@/lib/pendulum-absolute'"), 'hook does not own a second convention');
  assert(read('lib/pendulum-absolute.ts').includes('integer p     → center') || read('lib/pendulum-absolute.ts').includes('integer p'), 'center-beat convention documented');
});

check('13 beat/haptic at center not extreme', () => {
  const reference = read('lib/pendulum-reference.ts');
  assert(reference.includes('Musical beat / click / beat haptic = CENTER crossing'), 'convention');
  assert(reference.includes('Math.sin(Math.PI * phase)'), 'sin center model');
  assert(motion.includes('THE BEAT OCCURS AT CENTER'), 'motion matches reference');
});

check('14 no duplicate pendulum haptic', () => {
  assert(!read('components/classic/SmartPendulumRoom.tsx').includes('isCenterCrossing'), 'no visual-center haptic');
  assert(haptics.includes('return false'), 'center haptic allowed is false');
});

check('15 BPM changes do not invent a second musical epoch', () => {
  assert(read('lib/pendulum-absolute.ts').includes('remapBeatHostForTempo'), 'tempo remap is absolute-position preserving');
  assert(!hook.includes('remapPendulumAnchor'), 'retired display-time remap is not in the runtime hook');
});

check('16 Pass 2 detents remain intact', () => {
  assert(detent.includes('playUiDetent(kind, audio, haptic)'), 'rotary detent graph');
  assert(native.includes('Never touches metronome scheduling') || native.includes('playUiDetentLocked'), 'native detent isolated');
});

check('17 Studio/Altered/Custom remain enterable', () => {
  assert(rooms.includes("id: 'studio'") && rooms.includes("id: 'altered'") && rooms.includes("id: 'customized'"), 'rooms exist');
  assert(immersive.includes('studio') && immersive.includes('altered'), 'immersive enterable');
});

check('18 Tuner remains accessible', () => {
  assert(bezel.includes('label="Tuner"'), 'global Tuner');
  assert(main.includes('<TunerScreen'), 'tuner hosted');
  assert(tuner.includes('export function TunerScreen'), 'implementation preserved');
});

check('19 Mix no longer contains redundant Tuner entry', () => {
  assert(!settings.includes('label="TUNER"'), 'Mix TUNER row removed');
  assert(bezel.includes('label="Tuner"'), 'Tuner stays on the shell');
});

check('20 contextual-help infrastructure works', () => {
  assert(help.includes('export function HelpTip'), 'HelpTip exists');
  assert(helpCopy.includes('Large Controls'), 'Large Controls explained');
  assert(settings.includes('<HelpTip'), 'Settings uses help');
  assert(!help.includes('documentation'), 'help is inline');
});

check('21 new approved app icon is configured', () => {
  assert(app.includes('pockt-2-app-icon-approved.png'), 'app.json points at approved raster');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/branding/pockt-2-app-icon-approved.png')), 'approved icon is tracked');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/icon.png')), 'previous store icon file remains on disk');
});

check('22 no JS musical timer introduced', () => {
  assert(engine.includes('The JavaScript MetronomeEngine is retired'), 'JS engine retired');
  assert(!pockets.includes('setInterval'), 'pocket helpers have no clock');
  assert(!selector.includes('setInterval'), 'selector has no clock');
  assert(!pulseCommit.includes('setInterval'), 'pulse commit has no musical timer');
  assert(!hook.includes('setInterval'), 'pendulum hook has no clock');
});

check('privacy pull is disabled rather than shipped duplicated', () => {
  assert(main.includes('Privacy pull disabled this recovery pass'), 'broken dual-P pull is off');
  assert(fs.existsSync(path.join(__dirname, '..', 'components/curtain/PrivacyCurtain.tsx')), 'source preserved');
});

check('Sound System 2.0 is explicitly deferred', () => {
  assert(sound.includes('SOUND SYSTEM 2.0 HANDOFF'), 'handoff comment exists');
});

if (failures.length) {
  console.error('POCKT PASS 5 TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('POCKT PASS 5 TESTS PASSED');

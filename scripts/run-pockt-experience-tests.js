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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

const rooms = read('constants/rooms.ts');
const library = read('lib/library.ts');
const main = read('components/pockt/MainScreen.tsx');
const persist = read('storage/persist.ts');
const metro = read('hooks/use-metronome.ts');
const timing = read('constants/timing.ts');
const experience = read('lib/pockt-experience.ts');
const contract = read('lib/pockt-control-contract.ts');
const viewport = read('components/pockt/InstrumentViewport.tsx');
const selector = read('components/pockt/ViewSelectorSheet.tsx');
const host = read('components/classic/ClassicInstrumentHost.tsx');
const dispatch = read('timing/event-dispatch.ts');
const engine = read('lib/metronome-engine.ts');
const tape = read('hooks/use-program-tape.ts');
const pkg = read('package.json');
const native = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const detent = read('scripts/run-detent-reliability-tests.js');
const tuner = read('components/tuner/TunerScreen.tsx');

const immersive = extractArray(rooms, 'IMMERSIVE_ROOM_ORDER');
const classic = extractArray(rooms, 'CLASSIC_ROOM_ORDER');

check('1 existing saved user opens last-used View', () => {
  assert(main.includes("useState<AppView>('metronome')"), 'app starts in the metronome shell');
  assert(main.includes('resolveLaunchView'), 'cold launch resolves last-used View');
  assert(main.includes("setView('metronome')"), 'cold launch stays in the working View');
  assert(library.includes("launchBehavior: 'last'"), 'library launch is last-used');
  assert(!main.includes('Never Last Used'), 'forced gallery startup is gone');
});

check('2 persisted musical configuration restores', () => {
  assert(metro.includes('loadSettings()'), 'metronome hydrates persisted config');
  assert(persist.includes('bpm: sanitizeBpmFromPersist'), 'BPM restores');
  assert(persist.includes('timeSignature'), 'meter restores');
  assert(persist.includes('subdivision'), 'subdivision restores');
  assert(persist.includes('feel: asFeel'), 'feel restores');
  assert(persist.includes('sound: resolvedSound'), 'sound restores');
  assert(persist.includes('volume: sanitizeMasterVolume'), 'volume restores');
  assert(persist.includes('haptic: asBool(source.haptic'), 'haptics restore');
  assert(persist.includes('favoriteSounds'), 'sound favorites restore');
  assert(persist.includes('recentSounds'), 'recent sounds restore');
  assert(timing.includes("classicBackdrop: 'beatline'"), 'default View is Beatline');
});

check('3 app never auto-plays on launch', () => {
  assert(experience.includes('RESTORE_PLAYBACK_ON_LAUNCH = false'), 'playback restore is forbidden');
  assert(main.includes('shouldRestorePlaybackOnLaunch'), 'launch path consults the policy');
  assert(metro.includes('const [playing, setPlaying] = useState(false)'), 'transport starts stopped');
  assert(!persist.includes('playing:'), 'playing is not a persisted config field');
  const launch = main.split('processColdLaunch = false')[1]?.split('goHome')[0] ?? '';
  assert(!launch.includes('toggle()'), 'cold launch does not toggle play');
  assert(!launch.includes('start('), 'cold launch does not start the engine');
});

check('4 first install opens Choose Your Pocket, not Beatline dump', () => {
  assert(experience.includes("DEFAULT_LAUNCH_VIEW: RoomId = FALLBACK_ROOM"), 'default launch View is fallback');
  assert(rooms.includes("export const FALLBACK_ROOM: RoomId = 'beatline'"), 'fallback is Beatline');
  assert(metro.includes('useState<MetronomeConfig>(DEFAULT_CONFIG)'), 'unset storage uses DEFAULT_CONFIG');
  assert(metro.includes('if (saved)'), 'null settings keep defaults');
  assert(main.includes('needsFirstPocketChoice'), 'first-use Pocket discovery is required');
});

check('5 Pocket selector remains accessible', () => {
  assert(main.includes("open('views')") || main.includes("openViewSelector"), 'selector opens from the shell');
  assert(selector.includes('Return to current Pocket') || selector.includes('Return to Pocket'), 'selector returns to the instrument');
  assert(selector.includes('CHOOSE YOUR POCKET') || selector.includes('POCKET_SELECTOR_TITLE'), 'one Pocket selector');
  assert(!selector.includes('onOpenLibrary'), 'Library gallery is not a second selector');
});

check('6 View switch preserves musical configuration', () => {
  assert(experience.includes('viewSwitchPatch'), 'view switch is a dedicated patch');
  assert(experience.includes('Callers must not merge room-entry mix or sound'), 'sound is not rewritten on switch');
  assert(main.includes('update(viewSwitchPatch(next))'), 'shell uses view-only patch');
  const switchFn = main.split('const switchInstrumentView')[1]?.split('return (')[0] ?? '';
  assert(!switchFn.includes('resolveRoomEntrySound'), 'switch does not apply room-entry sound');
  assert(!switchFn.includes('resolveRoomEntryMix'), 'switch does not apply room-entry mix');
  assert(!switchFn.includes('stop()'), 'switch does not stop transport');
});

check('7 play can continue through View changes', () => {
  const switchFn = main.split('const switchInstrumentView')[1]?.split('return (')[0] ?? '';
  assert(!switchFn.includes('stop()'), 'view change does not halt playback');
  assert(main.includes('PocktExperienceShell'), 'one persistent shell owns transport');
});

check('8 native timing engine remains authoritative', () => {
  assert(metro.includes('PocktTiming'), 'hook still binds native module');
  assert(native.includes('class PocktTimingEngine'), 'native engine present');
  assert(engine.includes('The JavaScript MetronomeEngine is retired'), 'JS engine stays retired');
});

check('9 no JS musical timer introduced', () => {
  assert(dispatch.includes('EventDispatch is retired'), 'event-dispatch is isolated');
  assert(dispatch.includes('throw new Error'), 'event-dispatch cannot schedule');
  assert(tape.includes('useProgramTape is retired'), 'program tape cannot play');
  assert(!experience.includes('setInterval'), 'experience helpers have no JS clock');
  assert(!contract.includes('setInterval'), 'control contract has no JS clock');
  assert(!viewport.includes('setInterval'), 'viewport has no JS clock');
  assert(!selector.includes('setInterval'), 'selector has no JS clock');
});

check('10 Whiskey Bar cannot be entered through normal UI', () => {
  assert(/bar: \{[\s\S]*?enabled: false/.test(rooms), 'bar.enabled is false');
  assert(!immersive.includes('bar'), 'bar is out of the active immersive order');
  assert(immersive.join() === 'altered,studio', `immersive order is ${immersive.join(',')}`);
  assert(selector.includes('whiskeyBarTeaserLabel') || selector.includes('Coming soon') || selector.includes('COMING SOON'), 'selector shows Coming Soon teaser');
  assert(experience.includes("config.skin === 'bar'"), 'saved bar View migrates off');
  assert(persist.includes('migrateDisabledExperience'), 'persist migrates disabled Views');
  assert(rooms.includes("id: 'bar'"), 'bar source remains');
  assert(fs.existsSync(path.join(__dirname, '..', 'components/skins/BarSkin.tsx')), 'BarSkin preserved');
});

check('11 Studio and Altered remain available', () => {
  assert(immersive.includes('studio') && immersive.includes('altered'), 'studio and altered are selectable');
  assert(rooms.includes("id: 'studio'") && rooms.includes("enabled: true"), 'studio enabled');
  assert(rooms.includes("id: 'altered'"), 'altered present');
});

check('12 tuner remains accessible', () => {
  assert(main.includes('onOpenTuner'), 'shell still opens tuner');
  assert(main.includes('<TunerScreen'), 'tuner screen still hosted');
  assert(contract.includes('openTuner'), 'control contract exposes tuner');
  assert(tuner.includes('export function TunerScreen'), 'tuner implementation preserved');
});

check('13 Pass 2 detent architecture remains intact', () => {
  assert(pkg.includes('run-detent-reliability-tests.js'), 'detent suite still in npm test');
  assert(detent.includes('playUiDetentLocked'), 'detent graph assertions remain');
  assert(native.includes('private func playUiDetentLocked'), 'native detent graph remains');
  assert(native.includes('Never touches metronome scheduling'), 'UI clicks stay isolated');
});

check('14 sound/favorites/recent persistence remains intact', () => {
  assert(persist.includes('favoriteSounds'), 'favorite sounds persist');
  assert(persist.includes('recentSounds'), 'recent sounds persist');
  assert(library.includes('favoriteRooms'), 'favorite views persist');
  assert(library.includes('recentRooms'), 'recent views persist');
  assert(classic.includes('beatline'), 'classic views remain');
});

check('experience shell architecture', () => {
  assert(main.includes('function PocktExperienceShell'), 'named experience shell');
  assert(viewport.includes('export function InstrumentViewport'), 'swappable instrument viewport');
  assert(host.includes('export function ClassicInstrumentHost'), 'existing views are not merged');
  assert(viewport.includes('<ClassicInstrumentHost'), 'classic views stay hosted intact');
  assert(contract.includes('bindPocktControls'), 'shared control binding exists');
  assert(main.includes('bindPocktControls({'), 'shell binds the contract');
  assert(main.includes('openViewSelector'), 'selector is a first-class control');
});

if (failures.length) {
  console.error('POCKT EXPERIENCE TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('POCKT EXPERIENCE TESTS PASSED');
console.log(`Active immersive: ${immersive.join(' → ')}`);

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

const rooms = read('constants/rooms.ts');
const sounds = read('constants/sounds.ts');
const voice = read('lib/room-voice.ts');
const library = read('lib/library.ts');
const lifecycle = read('lib/recorder-lifecycle.ts');
const main = read('components/pockt/MainScreen.tsx');
const browser = read('components/rooms/RoomBrowser.tsx');
const persist = read('storage/persist.ts');
const practice = read('hooks/use-practice.ts');

const classic = extractArray(rooms, 'CLASSIC_ROOM_ORDER');
const immersive = extractArray(rooms, 'IMMERSIVE_ROOM_ORDER');
const custom = extractArray(rooms, 'CUSTOM_ROOM_ORDER');

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

check('immersive roster', () => {
  assert(immersive.join() === 'altered,studio', immersive.join());
  for (const banned of ['heart', 'roots', 'sundown', 'happy', 'heavy', 'pulse-circle', 'tempo', 'bar']) {
    assert(!classic.includes(banned) && !immersive.includes(banned) && !custom.includes(banned), banned);
  }
});

check('classic roster', () => {
  assert(
    classic.join() === 'beatline,pulse,dial,pro,smart-pendulum,pendula-classic,ledgear,rig',
    classic.join()
  );
  assert(!classic.includes('customized'), 'custom mixed into classic');
});

check('custom section', () => {
  assert(custom.join() === 'customized', custom.join());
});

check('stale rooms migrate home', () => {
  assert(rooms.includes("if (isStaleRoomId(value)) return FALLBACK_ROOM"), 'stale migrate');
  assert(rooms.includes("export const FALLBACK_ROOM: RoomId = 'beatline'"), 'fallback beatline');
});

check('launch opens last-used View ready to play', () => {
  assert(library.includes("launchBehavior: 'last'"), 'library default last-used');
  assert(main.includes("setView('metronome')"), 'cold launch metronome');
  assert(main.includes('resolveLaunchView'), 'last-used View restored');
  assert(main.includes('shouldRestorePlaybackOnLaunch'), 'launch playback policy present');
  assert(!main.includes('Never Last Used'), 'forced gallery launch removed');
  assert(main.includes("open('views')") || main.includes('openViewSelector'), 'Pocket selector remains reachable');
});

check('whiskey bar mix and after dark stay inactive', () => {
  const library = read('constants/sound-library.ts');
  const barSkin = read('components/skins/BarSkin.tsx');
  const mainScreen = read('components/pockt/MainScreen.tsx');
  assert(library.includes("id: 'whiskey-bar'"), 'whiskey bar mix');
  assert(library.includes("sound: 'bar-thud'"), 'mix starts on thud');
  assert(library.includes("soundDownbeat: 'bar-shake'"), 'mix shake accent');
  assert(library.includes("soundBeat: 'bar-thud'"), 'mix thud beats');
  assert(library.includes("soundSub: 'bar-knock'"), 'mix keeps a bar subdivision');
  assert(library.includes("'bar-thud': 'bar-shake'"), 'AUTO PAIR Thud is Shake');
  assert(!/id: 'vocal',\s*label: 'Vocal'/.test(library), 'vocal mix removed');
  assert(library.includes("id: 'vocal'"), 'vocal category remains');
  assert(rooms.includes("id: 'after-dark'"), 'after dark preserved');
  assert(rooms.includes("id: 'bar'"), 'whiskey bar source preserved');
  assert(/bar: \{[\s\S]*?enabled: false/.test(rooms), 'whiskey bar is not enterable');
  assert(!immersive.includes('bar'), 'whiskey bar is not in the active immersive selector');
  assert(mainScreen.includes('whiskeyBar ? null : (') && mainScreen.includes('BeatAccentStrip'), 'generic bars hidden in bar');
  assert(barSkin.includes('pulseBeat'), 'native pulseBeat');
  assert(barSkin.includes('BAR_TEMPO') && barSkin.includes('BeatControl'), 'tempo block and beat-state strip');
  assert(!barSkin.includes('BeatDot'), 'old tray dots removed');
  assert(!barSkin.includes('puck'), 'tap puck retired from live skin');
  assert(!barSkin.includes('setInterval'), 'no JS interval clock');
  assert(!barSkin.includes('setTimeout'), 'no JS timeout clock');
  assert(barSkin.includes('contain') || barSkin.includes('barWorldRect'), 'contained world');
  assert(mainScreen.includes('whiskeyBar ? null : (') && mainScreen.includes('FeelDial'), 'feel dial not on whiskey bar');
  assert(mainScreen.includes('whiskeyBar ? null : (') && mainScreen.includes('ControlDeck'), 'control deck hidden in bar');
  assert(read('components/pockt2/ControlDeck.tsx').includes('BpmSlider'), 'universal BPM slider lives in the control deck');
  assert(mainScreen.includes("open('bar-controls')") && barSkin.includes('CONTROLS'), 'compact controls access');
  const barAssets = read('lib/bar-assets.ts');
  assert(barAssets.includes('BAR_CHARACTER_MOTION_ENABLED = false'), 'character motion disabled');
  assert(barAssets.includes('denim: false') && barAssets.includes('center: false') && barAssets.includes('blonde: false') && barAssets.includes('bartender: false'), 'all actor sprites disabled');
  assert(!barSkin.includes('ActorLayer') && !barSkin.includes('BAR_ACTORS.filter'), 'BarSkin does not render character sprites');
  assert(barAssets.includes('BAR_LIVING_SCENE') && barAssets.includes('whiskey-bar-living-v3-quantized.mp4'), 'rejected v3 remains referenced for rollback');
  assert(barAssets.includes('rejected: true') && barAssets.includes('rhythmicCertified: false'), 'v3 is rejected as the ambient plate');
  assert(barAssets.includes('enabled: false') && barAssets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-v3-quantized.mp4')"), 'living video is not the ambient path');
  assert(!barAssets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-b2.mp4')"), 'b2 is not the active video');
  assert(!barAssets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-b1.mp4')"), 'b1 is not the active video');
  assert(barSkin.includes('BarBeatActions'), 'native beat-action overlays are mounted');
  assert(barSkin.includes('recyclingKey="bar-background"'), 'still plate is the ambient picture');
  assert(!barAssets.includes("videoModule: require('@/assets/skins/bar/whiskey-bar-living-v1.mp4')"), 'v1 is not the active video');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-v3-quantized.mp4')), 'living v3 video file installed');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-v2.mp4')), 'living v2 video file remains for rollback');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b3.mp4')), 'living b3 video file remains for rollback');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b2.mp4')), 'b2 remains for rollback');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/skins/bar/whiskey-bar-living-b1.mp4')), 'b1 remains for rollback');
  assert(barSkin.includes('recyclingKey="bar-background"'), 'still plate is the ambient picture');
  assert(!barSkin.includes('VideoView'), 'rejected v3 is not played as the ambient loop');
  assert(!barSkin.includes('StageObject') && !barSkin.includes('EmptySlot'), 'physical objects and red X are gone');
  assert(!barSkin.includes('translateY') || !barSkin.includes('-lift.value'), 'no object lift travel');
  assert(voice.includes('roomSoundCaption') && mainScreen.includes('roomSoundCaption(config)'), 'bar shows primary plus secondary');
  assert(read('components/modals/MeterSheet.tsx').includes('draftCustom') && read('components/modals/MeterSheet.tsx').includes('commitCustom'), 'custom meter stays open');
  assert(read('components/modals/MeterSheet.tsx').includes('accessibilityLabel="Done"'), 'custom meter Done');
  assert(read('components/modals/MeterSheet.tsx').includes('styles.footer'), 'custom meter sticky footer');
  assert(!barSkin.includes('MotionActor'), 'old MotionActor unused');
  assert(barAssets.includes('denim-hand-clean-plate-v3.png') && barAssets.includes('denim-hand-rest-v3.png') && barAssets.includes('denim-hand-tap-v3.png'), 'denim v3 pack');
  assert(barAssets.includes('center-hands-clean-plate-v3.png') && barAssets.includes('center-hands-rest-v3.png') && barAssets.includes('center-hands-tap-v3.png'), 'center v3 pack');
  assert(barAssets.includes('blonde-stir-clean-plate-v3.png') && barAssets.includes('blonde-spoon-hand-rest-v3.png') && barAssets.includes('blonde-spoon-hand-stroke-v3.png'), 'blonde v3 pack');
  assert(barAssets.includes('bartender-clean-plate-v4.png') && barAssets.includes('bartender-shaker-rest-v3.png') && barAssets.includes('bartender-shaker-stroke-v4.png'), 'bartender v4/v3/v4 pack');
  assert(!barAssets.includes('denim-hand-tap-v2.png') && !barAssets.includes('center-hands-tap-v2.png') && !barAssets.includes('blonde-spoon-hand-rest-v2.png') && !barAssets.includes('bartender-shaker-stroke-v3.png'), 'old isolation layers not required');
  const motionFiles = [
    ['assets/skins/bar/layers/denim-hand-clean-plate-v3.png', 252, 168],
    ['assets/skins/bar/layers/denim-hand-rest-v3.png', 252, 168],
    ['assets/skins/bar/layers/denim-hand-tap-v3.png', 252, 168],
    ['assets/skins/bar/layers/center-hands-clean-plate-v3.png', 312, 214],
    ['assets/skins/bar/layers/center-hands-rest-v3.png', 312, 214],
    ['assets/skins/bar/layers/center-hands-tap-v3.png', 312, 214],
    ['assets/skins/bar/layers/blonde-stir-clean-plate-v3.png', 292, 352],
    ['assets/skins/bar/layers/blonde-spoon-hand-rest-v3.png', 292, 352],
    ['assets/skins/bar/layers/blonde-spoon-hand-stroke-v3.png', 292, 352],
    ['assets/skins/bar/layers/bartender-clean-plate-v4.png', 214, 292],
    ['assets/skins/bar/layers/bartender-shaker-rest-v3.png', 214, 292],
    ['assets/skins/bar/layers/bartender-shaker-stroke-v4.png', 214, 292],
  ];
  for (const [rel, width, height] of motionFiles) {
    const abs = path.join(__dirname, '..', rel);
    assert(fs.existsSync(abs), `${rel} exists`);
    const buf = fs.readFileSync(abs);
    assert(buf.readUInt32BE(16) === width && buf.readUInt32BE(20) === height, `${rel} is ${width}x${height}`);
  }
  assert(barSkin.includes('BAR_PEOPLE_BEATS') || read('lib/bar-layout.ts').includes('BAR_PEOPLE_BEATS'), 'people beats exist');
  assert(barSkin.includes("id: 'denim'") || read('lib/bar-layout.ts').includes("id: 'denim'"), 'denim is beat 1');
  assert(voice.includes('resolveRoomEntryMix'), 'bar mix helper');
  const soundSheet = read('components/modals/SoundLibrarySheet.tsx');
  assert(soundSheet.includes('revealAssignment'), 'beat assignment reveals');
  assert(soundSheet.includes('scrollTo'), 'beat assignment scrolls into view');
});

check('sound defaults', () => {
  assert(voice.includes("studio: 'pockt-studio'"), 'studio');
  assert(voice.includes("altered: 'pockt-altered'"), 'altered');
  assert(voice.includes("'after-dark': 'pockt-after-dark'"), 'after dark');
  assert(voice.includes("bar: 'bar-thud'"), 'whiskey bar');
  assert(!voice.includes("heart: 'pockt-heart'"), 'heart voice gone');
  assert(sounds.includes("'pockt-heart': 'pocket'"), 'heart sound migrates to pocket');
  const pocktOrder = extractArray(sounds, 'POCKT_SOUND_ORDER');
  assert(!pocktOrder.includes('pockt-heart'), 'heart not in display order');
  assert(sounds.includes("return 'pocket'"), 'safe fallback pocket');
  assert(!/label: 'ROOTS'/.test(sounds) && !/label: 'SUNDOWN'/.test(sounds) && !/label: 'HEART'/.test(sounds), 'stale sound labels');
});

check('browser is living grid', () => {
  assert(browser.includes("title: 'CLASSIC'"), 'classic section');
  assert(browser.includes("title: 'IMMERSIVE'"), 'immersive section');
  assert(browser.includes("title: 'CUSTOM'"), 'custom section');
  assert(!browser.includes('pagingEnabled'), 'no primary carousel');
  assert(browser.includes('Hold to'), 'reorder hint');
  assert(browser.includes('rearrange'), 'rearrange copy');
  assert(!browser.includes('Hold a Pocket to rearrange'), 'old long hint gone');
  assert(browser.includes('classicOrderRef'), 'live order refs');
  assert(browser.includes('insertionIndexForDrag'), 'stable insertion hysteresis');
  assert(browser.includes('classicOrigin'), 'drag origin armed before hover');
  assert(browser.includes('overflow: \'visible\'') || browser.includes('overflow: "visible"'), 'grid overflow visible');
  assert(browser.includes('editing || visible.has'), 'previews stay mounted while editing');
  assert(browser.includes('shouldCancelWhenOutside(false)'), 'long-press survives slop');
  assert(browser.includes('withSpring'), 'spring reflow');
  assert(!browser.includes('LinearTransition'), 'no row-jump layout animation');
  assert(browser.includes('DONE'), 'edit done');
  assert(browser.includes('activateAfterLongPress(editing ? 90 : 280)'), 'long-press rearrange');
  assert(browser.includes('failOffsetX([-40, 40])'), 'pickup allows slight movement');
  assert(browser.includes('restEpoch'), 'rest snap after drag');
  assert(!browser.includes('posX.value = originX.value + tx.value'), 'drop does not keep finger coords');
});

check('recorder lifecycle helpers', () => {
  assert(lifecycle.includes("phase === 'active'"), 'native query only while active');
  assert(lifecycle.includes('registerRecorderFlush'), 'home flush');
});

check('practice has no master interval', () => {
  assert(!practice.includes('setInterval('), 'no setInterval metronome');
  assert(practice.includes('transport.measureIndex'), 'follows master bars');
});

check('browser tiles have metadata', () => {
  for (const id of [...classic, ...custom, ...immersive]) {
    assert(rooms.includes(`id: '${id}'`), `${id} metadata`);
  }
});

const capsules = read('components/classic/BeatCapsuleStrip.tsx');
const proCells = read('components/classic/ProBeatCells.tsx');
const proRoom = read('components/classic/ProRoom.tsx');
const dialRoom = read('components/classic/DialRoom.tsx');
const ledgear = read('components/classic/LedgearRoom.tsx');
const studio = read('components/modals/SoundLibrarySheet.tsx');
const motion = read('lib/pendulum-motion.ts');

check('beat pills grow from center and mute is smallest', () => {
  assert(capsules.includes('const STATE_HEIGHT = [0.24, 0.24, 0.6, 1]'), '0 and 1 share smallest height');
  assert(capsules.includes("justifyContent: 'center'"), 'center justified');
  assert(capsules.includes('strength === 0 ? null'), 'state 0 renders no fill view');
  assert(capsules.includes('styles.outline'), 'state 0 white outline');
  assert(capsules.includes("borderColor: '#F4F6FA'"), 'state 0 white border');
  assert(capsules.includes('BEATLINE_REST_FILL'), 'resting gray not accent');
  assert(capsules.includes('cycleBeatBlock'), 'shared 0-1-2-3 cycle');
  assert(!capsules.includes('Mute is a full-size hollow outline'), 'old mute comment gone');
  assert(!capsules.includes('ScrollView'), 'no horizontal beat scroll');
});

check('classic rooms lost sound-chip clutter', () => {
  assert(!proRoom.includes('MET 1'), 'no MET 1 chips');
  assert(!proRoom.includes('LIBRARY'), 'no library chip row');
  assert(!dialRoom.includes('DIAL_SOUND_PRESETS'), 'no dial preset chips');
  assert(dialRoom.includes('ringSector'), 'outer beat arcs');
  assert(dialRoom.includes('pointerAngle'), 'polar rotary');
  assert(!dialRoom.includes('blur={48}'), 'no rectangular outer shadow');
  assert(dialRoom.includes('clip={clipCircle}'), 'arcs clipped to circle');
  assert(dialRoom.includes("overflow: 'hidden'"), 'dial disc clips glow');
  assert(dialRoom.includes('ellipsizeMode="tail"'), 'sound name stays in badge');
  assert(studio.includes('SOUND STUDIO'), 'universal studio');
  assert(studio.includes('onPreview'), 'preview required');
});

check('pro cells stay fixed size', () => {
  assert(proCells.includes('const CELL = 96'), 'max cell');
  assert(proCells.includes('Math.min(CELL'), 'cells shrink to fit');
  assert(proCells.includes('highlightAllowed'), 'accent filter');
  assert(proCells.includes('FILL_RATIO = [0, 1 / 3, 2 / 3, 1]'), 'internal 0/1/2/3 thirds');
  assert(proCells.includes('styles.band'), 'visible level boxes');
  assert(proCells.includes('#12161A'), 'dark resting metal');
  assert(!proCells.includes('flashFill'), 'no hatch overlay');
  assert(!proCells.includes('ScrollView'), 'no horizontal beat scroll');
});

check('sound close returns to metronome', () => {
  const soundBlock = main.slice(main.indexOf("overlay === 'sound'"), main.indexOf("overlay === 'accents'"));
  assert(soundBlock.includes('onClose={closeMix}'), 'sound close clears overlay stack');
  assert(!soundBlock.includes('onClose={close}'), 'sound close does not pop back to Mix');
});

check('sound studio is one hierarchy', () => {
  assert(studio.includes('PRIMARY_MIX_PRESETS'), 'mixes are a family');
  assert(studio.includes('mixFamilyForPreset'), 'mix opens related family');
  assert(studio.includes('POCKT MIXES'), 'curated mixes labeled');
  assert(studio.includes('INDIVIDUAL SOUNDS'), 'individual sounds labeled');
  assert(!studio.includes('POCKT MIX</Text>'), 'no redundant mix badges');
  assert(!studio.includes('showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}'), 'no competing mix chip row');
});

check('led gear changes the cell color', () => {
  assert(!ledgear.includes('cellFlash'), 'no purple overlay');
  assert(ledgear.includes("index === 0 ? '#FFE08A'"), 'downbeat color');
  assert(ledgear.includes('fillPx'), 'graduated LED height');
});

check('pendulum can reach the rendered edge', () => {
  assert(motion.includes('tipSwingDegrees'), 'tip geometry');
  assert(motion.includes('viewportWidth / 2 - tipHalfWidth'), 'edge from viewport');
  assert(!motion.includes('bobRadius + 10'), 'no guessed overshoot');
});

const pulse = read('components/classic/PulseRoom.tsx');
const tile = read('components/rooms/RoomTile.tsx');
const recorder = read('hooks/use-session-recorder.ts');
const pendulum = read('components/classic/SmartPendulumRoom.tsx');
const dial = read('components/classic/SafeDial.tsx');

check('pulse center is start/stop', () => {
  assert(pulse.includes("name: 'activate'"), 'a11y start/stop');
  assert(pulse.includes('toggle()'), 'center toggles');
  assert(!pulse.includes('styles.bpmHit'), 'no separate bpm hit on center');
  assert(pulse.includes('onOpenPad()'), 'menu pad is immediate');
  assert(!pulse.includes('markerSlot'), 'no orbiting pulse marker');
  assert(!pulse.includes('setTimeout(() => onOpenPad()'), 'no delayed keypad');
  assert(pulse.includes('hapticPulseTick'), 'bpm changes tick on the Build 69 tempo dot');
  assert(pulse.includes('pulseBeat'), 'ripples follow native beat index');
  assert(pulse.includes('if (!playing) return null'), 'Build 69 waves unmount while Pulse is stopped');
});

check('pulse thumbnail expands outward and pauses while rearranging', () => {
  const preview = read('components/classic/ClassicPreviewCard.tsx');
  assert(preview.includes('function ThumbWave'), 'outward thumbnail rings');
  assert(preview.includes('editing?: boolean'), 'preview can pause for reorder');
  assert(tile.includes('editing={editing}'), 'home tiles pass editing');
});

check('immersive cards keep signature objects', () => {
  assert(tile.includes('ImmersivePreviewTile'), 'composed immersive previews');
  const preview = read('components/rooms/ImmersivePreviewTile.tsx');
  assert(preview.includes('pack.focal'), 'studio/after-dark focal');
  assert(preview.includes('pack.emitter'), 'altered eye');
});

check('recorder never queries native on unmount', () => {
  assert(!recorder.includes('if (recorder.isRecording)'), 'no native isRecording in hook');
  assert(recorder.includes('Do not read recorder.isRecording'), 'explicit unmount rule');
  assert(pendulum.includes('recorderArmed'), 'lazy recorder');
  assert(pendulum.includes('SmartPendulumRecorderEngine'), 'isolated engine');
});

check('classic host has no orbit or tempo', () => {
  const host = read('components/classic/ClassicInstrumentHost.tsx');
  assert(host.includes('return <BeatlineRoom'), 'fallback beatline');
  assert(host.includes('DialRoom'), 'dial room hosted');
  assert(!host.includes('PulseCircleRoom'), 'orbit host gone');
  assert(!host.includes('TempoRoom'), 'tempo host gone');
});

check('pro dial is vector', () => {
  assert(dial.includes('@shopify/react-native-skia'), 'skia dial');
  assert(!dial.includes('PRO_SAFE_DIAL'), 'no raster dial asset');
  assert(dial.includes('wrapDelta'), 'continuous 12 o clock');
  assert(dial.includes('lastAngle'), 'accumulate from last pointer');
});

const spotlight = read('components/classic/BeatlineSpotlight.tsx');
const orb = read('components/classic/GlassPlayOrb.tsx');
const customRoom = read('components/classic/CustomizedRoom.tsx');
const grid = read('lib/room-grid.ts');

check('beatline sconce is scheduled light', () => {
  assert(spotlight.includes('pulse.value'), 'follows master pulse');
  assert(spotlight.includes('pulseRole'), 'downbeat stronger');
  assert(spotlight.includes('sconcePath'), 'tapered sconce cone');
  assert(!spotlight.includes('styles.fixture'), 'no visible lamp object');
  assert(spotlight.includes('LinearGradient'), 'downward falloff');
  assert(!spotlight.includes('setInterval'), 'no free timer');
});

check('beatline mix volume accents labels', () => {
  const beatline = read('components/classic/BeatlineRoom.tsx');
  const settings = read('components/beatline/BeatlineSettings.tsx');
  const more = read('components/pockt2/InstrumentMoreSheet.tsx');
  assert(beatline.includes('MixerFader'), 'Build 69 volume fader is on the face');
  assert(beatline.includes('accessibilityLabel="Mix"'), 'Settings / Mix stays a Beatline destination');
  assert(settings.includes('METRONOME VOLUME'), 'volume remains reachable');
  assert(settings.includes('DOWNBEAT ACCENT'), 'accents remain reachable');
  assert(settings.includes('HAPTICS FEEDBACK'), 'haptics remain reachable');
  assert(more.includes('MixerFader'), 'shared more-sheet volume remains');
  assert(more.includes('Practice'), 'practice remains reachable from the shared sheet');
  assert(more.includes('Setlists'), 'setlists remain reachable from the shared sheet');
});

check('classic pro resting is base not accent', () => {
  assert(proCells.includes('#12161A'), 'pro rest fill');
  assert(proCells.includes('cycleBeatBlock'), 'shared 0-1-2-3');
  assert(proRoom.includes('BEAT ONLY'), 'mode toast copy');
  assert(proRoom.includes('modeToast'), 'momentary mode label');
  assert(proRoom.includes('view="all"'), 'four bars always');
});

check('recorder and metronome share playAndRecord', () => {
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const policy = read('lib/audio-session-policy.ts');
  assert(engine.includes('keepCapture'), 'preserve input capture on restore');
  assert(policy.includes("current === 'recording') return 'playing'"), 'play while recording');
});

check('selected sound applies related accent pair', () => {
  const library = read('constants/sound-library.ts');
  const main = read('components/pockt/MainScreen.tsx');
  const accent = read('lib/accent-sound.ts');
  assert(library.includes('rolesForSelectedSound'), 'pair helper');
  assert(accent.includes('resolveAccentPatch'), 'auto/custom accent resolver');
  assert(main.includes('resolveAccentPatch('), 'select applies auto or custom accent');
  assert(!main.includes('soundDownbeat: null,\n              soundBeat: null'), 'select no longer clears roles');
});

check('beatline vinyl transport', () => {
  assert(orb.includes('withRepeat'), 'vinyl spin');
  assert(orb.includes('styles.groove'), 'record grooves');
  assert(orb.includes("playing ? 'Pause' : 'Play'"), 'transport first');
});

check('custom customize is first tap', () => {
  assert(customRoom.includes('CUSTOMIZE'), 'customize');
  assert(customRoom.includes('setEditing(true)'), 'opens editor immediately');
  assert(!customRoom.includes('<Pressable style={styles.root}'), 'no wrapping pressable');
});

const session = read('modules/pockt-timing/ios/PocktAudioSession.swift');
const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const metro = read('hooks/use-metronome.ts');

check('audio session policy is centralized', () => {
  assert(session.includes('applyPlayback'), 'playback owner');
  assert(session.includes('applyRecording'), 'recording owner');
  assert(engine.includes('PocktAudioSession.shared'), 'engine uses owner');
  assert(!/CategoryOptions = \[\.defaultToSpeaker\]/.test(engine), 'illegal playback options gone');
  assert(metro.includes('friendlyTransportError'), 'calm start error');
  assert(metro.includes('restorePlaybackGraph'), 'js restore path');
  assert(metro.includes("from === 'background'"), 'screenshot inactive does not rebuild graph');
  assert(metro.includes('Always restore session + graph before Play'), 'play always restores');
  assert(metro.includes('PocktTiming.stop?.()'), 'stale native run is stopped before restore');
  assert(!metro.includes('skip restore before start'), 'silent running engine cannot skip restore');
  assert(metro.includes('if (!alive)'), 'playing UI waits for start report');
  const voice = read('lib/room-voice.ts');
  assert(voice.includes("config.roomVoice?.[id] ??"), 'stored room voice wins');
  assert(voice.includes("rig: 'digital-click'"), 'rig default is first-run only');
  assert(engine.includes('func restorePlaybackGraph'), 'native restore');
  assert(engine.includes('func audioLifecycleStress'), 'native audio stress');
  assert(metro.includes('playing: false'), 'failed start resets transport');
  assert(engine.includes('kind == "pro" ? 0.09'), 'pro detent quieter');
  assert(engine.includes('kind == "pro" ? 1860.0'), 'pro detent brighter');
});

check('home reorder does not touch audio engine', () => {
  assert(browser.includes('Home order is presentation state only'), 'order is presentation');
  assert(!browser.includes('PocktTiming'), 'browser never calls native audio');
  assert(!browser.includes('previewSound'), 'browser never previews');
  assert(!browser.includes('restorePlaybackGraph'), 'reorder cannot restore engine');
});

check('odd card helper exists', () => {
  assert(grid.includes('sectionRows'), 'helper');
  assert(grid.includes('centered: items.length > 0 && items.length < width'), 'centers leftover');
});

const settings = read('components/screens/SettingsScreen.tsx');
const moduleSwift = read('modules/pockt-timing/ios/PocktTimingModule.swift');
const nowPlaying = read('modules/pockt-timing/ios/PocktNowPlaying.swift');
const podspec = read('modules/pockt-timing/ios/PocktTiming.podspec');
const reel = read('components/selectors/ReelScreen.tsx');
const accentsLib = read('lib/accents.ts');

check('time and subdivision selectors apply and close', () => {
  assert(main.includes("overlay === 'division'"), 'division is top overlay only');
  assert(main.includes("overlay === 'time'"), 'time is top overlay only');
  assert(main.includes("overlay === 'settings'"), 'mix unmounts under nested overlays');
  assert(main.includes("pointerEvents={overlay ? 'none'"), 'stage ignores touches under mix');
  assert(reel.includes('>DONE<') === false, 'division has no Done');
  assert(read('components/modals/MeterSheet.tsx').includes('accessibilityLabel="Done"'), 'custom meter Done');
  assert(!read('components/modals/RhythmPanel.tsx').includes('accessibilityLabel="Done"'), 'beatline rhythm has no Done');
});

check('count mode uses spoken samples on beat index', () => {
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  const library = read('constants/sound-library.ts');
  assert(engine.includes('count-\\(spokenIndex)'), 'native count buffers');
  assert(engine.includes('(event.beatIndex % 12) + 1'), 'count wraps on beat index');
  assert(library.includes("id: 'count'"), 'count category');
  assert(library.includes("'count-12'"), 'count 1-12');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/audio/library/count-1.wav')), 'count-1 production wav');
  assert(fs.existsSync(path.join(__dirname, '..', 'modules/pockt-timing/ios/Clicks/count-4.wav')), 'native count-4 wav');
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/audio/library/lib-choir-a.wav')), 'choir production wav');
});

check('restore default is meter-only 4/4 quarter', () => {
  assert(accentsLib.includes('export function restoreDefaultMeter'), 'shared restore');
  assert(accentsLib.includes("timeSignature: '4/4'"), '4/4');
  assert(accentsLib.includes("subdivision: 'quarter'"), 'quarter');
  assert(main.includes('restoreDefaultMeter()'), 'wired');
  assert(reel.includes('RESTORE DEFAULT'), 'division restore');
});

check('immersive rooms do not inherit classic sound on first entry', () => {
  assert(voice.includes('export function isImmersiveRoom'), 'immersive helper');
  assert(voice.includes('export function resolveRoomEntrySound'), 'entry sound helper');
  assert(voice.includes('export function migrateRoomVoice'), 'safe voice migration');
  assert(!voice.includes('if (config.hasUserChosenSound)'), 'classic rooms no longer inherit global sound');
  assert(!main.includes('resolveRoomEntrySound'), 'View switch preserves sound instead of room-entry overwrite');
  assert(main.includes('viewSwitchPatch'), 'switch uses view-only patch');
  assert(persist.includes('migrateRoomVoice'), 'persist seeds only current room');
});

check('curated room defaults resolve to registered native sounds', () => {
  const ids = [
    'mechanical',
    'wood',
    'pocket',
    'digital-click',
    'beep',
    'soft-click',
    'click',
    'pockt-studio',
    'pockt-altered',
    'pockt-after-dark',
  ];
  for (const id of ids) {
    assert(voice.includes(`'${id}'`), `voice maps ${id}`);
    assert(sounds.includes(`id: '${id}'`), `registry has ${id}`);
    assert(
      fs.existsSync(path.join(__dirname, '..', 'modules/pockt-timing/ios/Clicks', `${id}.wav`)),
      `native wav ${id}`
    );
  }
  assert(voice.includes("beatline: 'pocket'"), 'beatline default');
  assert(voice.includes("pulse: 'soft-click'"), 'pulse default');
  assert(voice.includes("dial: 'click'"), 'dial default');
  assert(voice.includes("pro: 'digital-click'"), 'pro default');
});

check('immersive opening has no own-sound warning', () => {
  const hint = read('components/pockt/PocketHint.tsx');
  assert(!hint.includes('own Studio sound'), 'studio sound warning gone');
  assert(!hint.includes('own starting sound'), 'altered sound warning gone');
  assert(main.includes("config.skin !== 'studio'"), 'studio hint suppressed');
  assert(main.includes("config.skin !== 'altered'"), 'altered hint suppressed');
  assert(main.includes("config.skin !== 'after-dark'"), 'after-dark hint suppressed');
});

check('mix does not duplicate accent color for beatline', () => {
  assert(!settings.includes("label=\"ACCENT COLOR\""), 'no mix accent color row');
  assert(settings.includes("currentRoom === 'pulse'"), 'pulse colors remain pulse-only');
});

check('classic dial idle beats stay dark', () => {
  const dial = read('components/classic/DialRoom.tsx');
  assert(!dial.includes('#1C1214'), 'no maroon rest fill');
  assert(dial.includes("const rInner = size * 0.348"), 'substantial outer beat channel');
  assert(dial.includes("const rOuter = size * 0.498"), 'lights stay on the rim');
  assert(dial.includes("rotaryDetent('dial'"), 'dial rotary click is UI feedback');
  assert(!dial.includes('hapticDialTick()'), 'dial no longer uses metronome-tied haptic helper');
});

check('home order persists inside families', () => {
  const order = read('lib/room-order.ts');
  assert(library.includes('classicRoomOrder'), 'classic order field');
  assert(library.includes('immersiveRoomOrder'), 'immersive order field');
  assert(order.includes('sanitizeFamilyOrder'), 'malformed order fallback');
  assert(read('constants/rooms.ts').includes("id: 'ledgear'"), 'ledgear stays classic');
  assert(read('constants/rooms.ts').includes("id: 'rig'"), 'rig is a classic face');
  assert(read('constants/rooms.ts').includes("label: 'CONSOLE'"), 'user-facing CONSOLE name');
  const safeDial = read('components/classic/SafeDial.tsx');
  assert(safeDial.includes("rotaryDetent('pro'"), 'pro rotary click');
  const engine = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
  assert(engine.includes('uiClickPlayer'), 'dedicated UI click node');
  assert(engine.includes('Never touches metronome scheduling'), 'ui click isolated');
});

check('feel and single-choice mix screens return to the metronome', () => {
  const feel = read('components/selectors/FeelReelScreen.tsx');
  const settings = read('components/screens/SettingsScreen.tsx');
  const pulse = read('components/classic/PulseRoom.tsx');
  assert(feel.includes('onSettled={onSettled}'), 'feel reel settles');
  assert(main.includes('onSettled={(step) => {'), 'feel settle closes mix');
  assert(main.includes('onClose={closeMix}'), 'feel back clears mix');
  assert(main.includes("overlay === 'time' || overlay === 'division' || overlay === 'rhythm'"), 'division resolves to MeterSheet');
  assert(main.includes('onSubdivisionChange'), 'unified meter handles subdivision');
  assert(main.includes('closeMix();'), 'single-choice closeMix');
  assert(!settings.includes('PHOTO MOTION'), 'dead photo motion toggle removed');
  assert(settings.includes('Flips drag direction on tempo wheels and dials.'), 'reverse wheel copy');
  assert(main.includes('enabled={config.flashScreenOnBeat}'), 'screen flash is wired');
  assert(main.includes('invert={config.wheelInvert}'), 'immersive slider invert');
  assert(pulse.includes('60000 / Math.max(1, bpm)') && pulse.includes('bpm >= 240') && pulse.includes('proofFlags.reduceMotion'), 'pulse travel breathes at slow tempos and shortens when the tempo is high or motion is reduced');
  assert(practice.includes('masksRef.current'), 'practice restores engine masks');
});

check('lock screen now playing uses MediaPlayer not a widget', () => {
  assert(nowPlaying.includes('MPNowPlayingInfoCenter'), 'now playing info');
  assert(nowPlaying.includes('MPRemoteCommandCenter'), 'remote commands');
  assert(nowPlaying.includes('MPNowPlayingInfoPropertyIsLiveStream'), 'live stream metronome');
  assert(podspec.includes('MediaPlayer'), 'links MediaPlayer');
  assert(moduleSwift.includes('bindNowPlaying'), 'wired to engine');
  assert(metro.includes("addListener('onEngineState'"), 'js follows remote pause');
});

if (failures.length) {
  console.error('RECOVERY TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('RECOVERY TESTS PASSED');
console.log(`Classic ${classic.join(' → ')}`);
console.log(`Immersive ${immersive.join(' → ')}`);
console.log(`Custom ${custom.join(' → ')}`);

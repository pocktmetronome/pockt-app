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

const brand = read('lib/brand-assets.ts');
const tokens = read('constants/pockt-2.ts');
const intro = read('components/intro/BrandedIntro.tsx');
const shell = read('components/pockt/MainScreen.tsx');
const bezel = read('components/pockt2/ShellBezel.tsx');
const deck = read('components/pockt2/ControlDeck.tsx');
const transport = read('components/pockt2/TransportButton.tsx');
const selector = read('components/pockt/ViewSelectorSheet.tsx');
const mark = read('components/pockt2/Pockt2Mark.tsx');
const metro = read('hooks/use-metronome.ts');
const native = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
const rotary = read('lib/rotary-feedback.ts');
const rooms = read('constants/rooms.ts');
const experience = read('lib/pockt-experience.ts');
const slider = read('components/controls/BpmSlider.tsx');
const pkg = read('package.json');

check('approved P mark is installed, not redrawn', () => {
  assert(fs.existsSync(path.join(__dirname, '..', 'assets/branding/pockt-2-mark-approved.png')), 'approved 1024 mark copied in-app');
  assert(brand.includes("require('@/assets/branding/pockt-2-mark-approved.png')"), 'brand assets bind the locked raster');
  assert(mark.includes('POCKT_2_MARK'), 'Pockt2Mark uses the locked raster');
  assert(!mark.includes('<Svg') && !mark.includes('Path'), 'P mark is not redrawn as vector');
  assert(intro.includes('<Pockt2Mark'), 'opening uses the approved mark');
  assert(!intro.includes('BRAND_OPENING'), 'old opening art is not the 2.0 ident');
});

check('launch screen is the instrument field, not a branded opening', () => {
  const app = read('app.json');
  const layout = read('app/_layout.tsx');
  assert(app.includes('launch-field.png'), 'splash is the instrument field');
  assert(app.includes('#141311'), 'splash matches the first live frame');
  assert(!app.includes('pockt-logo.png'), 'old gold logo is not the splash');
  assert(!shell.includes('<BrandedIntro'), 'the instrument does not play a branded opening');
  assert(intro.includes('SplashScreen.hideAsync'), 'splash hide remains available');
  assert(!layout.includes('hideAsync'), 'root layout does not hide splash before the instrument paints');
});

check('design system tokens exist', () => {
  assert(tokens.includes("signal: '#3DFF7A'"), 'phosphor signal token');
  assert(tokens.includes("field: '#050608'"), 'dark instrument field');
  assert(tokens.includes('P2Touch'), 'touch targets');
  assert(tokens.includes('P2Motion'), 'motion tokens');
  assert(tokens.includes('P2Type'), 'type hierarchy');
});

check('experience shell is POCKT 2.0', () => {
  assert(shell.includes('<ShellBezel'), 'machined bezel remains for non-Beatline Pockets');
  assert(bezel.includes('label="Pockets"'), 'Pockets is first-class navigation');
  assert(bezel.includes('label="Tuner"'), 'tuner remains in the shell');
  assert(bezel.includes('label="Settings"'), 'settings remains in the global bezel');
  assert(read('components/classic/BeatlineRoom.tsx').includes('BeatCapsuleStrip'), 'Build 69 Beatline uses capsules');
  assert(read('components/classic/BeatlineRoom.tsx').includes('HorizontalTempoWheel'), 'Beatline uses the shared tempo wheel');
  assert(read('components/classic/BeatlineRoom.tsx').includes('GlassPlayOrb'), 'Build 69 Beatline uses the glass orb');
  assert(read('components/beatline/BeatlineFace.tsx').includes('BEATLINE_ASSETS.master'), 'Beatline uses the locked visual master');
  assert(shell.includes('<ControlDeck'), 'universal control deck');
  assert(deck.includes('<TransportButton'), 'play lives in the deck');
  assert(deck.includes('<BpmReadout'), 'BPM readout is instrument-grade');
  assert(transport.includes('accessibilityLabel={playing ? \'Stop\' : \'Play\'}'), 'play/stop labeled');
});

check('selector is an instrument picker', () => {
  assert(selector.includes('CHOOSE YOUR POCKET') || selector.includes('POCKET_SELECTOR_TITLE'), 'selector hierarchy');
  assert(selector.includes('<RoomTile'), 'visual previews remain');
  assert(selector.includes('pocketSelectorItems') || selector.includes('whiskeyBarTeaserLabel'), 'Whiskey Bar is a teaser');
  assert(selector.includes('Return to current Pocket') || selector.includes('Return to Pocket'), 'easy dismissal');
});

check('architecture remains intact', () => {
  assert(metro.includes('PocktTiming'), 'native engine still bound');
  assert(native.includes('class PocktTimingEngine'), 'native engine present');
  assert(rotary.includes('playUiDetent(kind, audio, haptic)'), 'Pass 2 detents intact');
  assert(slider.includes("rotaryDetent('dial'"), 'BPM slider still uses detent architecture');
  assert(slider.includes('controlStepDetent(true, true)'), 'stepper detents intact');
  assert(experience.includes('RESTORE_PLAYBACK_ON_LAUNCH = false'), 'Open → Play never auto-starts');
  assert(shell.includes('resolveLaunchView'), 'last-used View restore remains');
  assert(/bar: \{[\s\S]*?enabled: false/.test(rooms), 'Whiskey Bar remains non-enterable');
  assert(rooms.includes("id: 'studio'") && rooms.includes("id: 'altered'"), 'Studio and Altered remain');
  assert(!deck.includes('setInterval') && !bezel.includes('setInterval') && !selector.includes('setInterval'), 'no JS musical timer in 2.0 chrome');
  assert(pkg.includes('run-detent-reliability-tests.js'), 'detent suite still in npm test');
});

if (failures.length) {
  console.error('POCKT 2.0 VISUAL TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('POCKT 2.0 VISUAL TESTS PASSED');

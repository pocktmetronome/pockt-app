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

const selector = read('components/pockt/ViewSelectorSheet.tsx');
const pockets = read('lib/pockt-pockets.ts');
const tile = read('components/rooms/RoomTile.tsx');
const rooms = read('constants/rooms.ts');

check('one Pocket selector concept', () => {
  assert(pockets.includes("POCKET_SELECTOR_TITLE = 'CHOOSE YOUR POCKET'"), 'locked title');
  assert(!selector.includes('onOpenLibrary'), 'no competing Library gallery');
  assert(!selector.includes('Views gallery'), 'no Views gallery');
});

check('Pocket name appears once', () => {
  assert(selector.includes('hideName'), 'preview does not carry a second name');
  assert(tile.includes('hideName'), 'RoomTile can suppress in-card names');
  assert(selector.includes('styles.heroName') || selector.includes('heroName'), 'hero has one label');
});

check('current Pocket is a tappable hero', () => {
  assert(pockets.includes('pocketSelectorHero'), 'hero helper');
  assert(selector.includes('Current Pocket'), 'hero is labeled as current and tappable');
  assert(!selector.includes('Now Playing'), 'no decorative Now Playing');
});

check('Custom and Altered before Studio', () => {
  assert(pockets.includes("'altered', 'studio'"), 'priority');
  assert(pockets.includes('...CUSTOM_ROOM_ORDER'), 'Custom first among immersive');
});

check('Whiskey Bar coming soon is not enterable', () => {
  assert(/bar: \{[\s\S]*?enabled: false/.test(rooms), 'bar disabled');
  assert(selector.includes('Coming soon'), 'teaser');
  assert(selector.includes('accessibilityState={{ disabled: true }}'), 'not enterable');
  assert(fs.existsSync(path.join(__dirname, '..', 'components/skins/BarSkin.tsx')), 'assets preserved');
});

check('previews animate on-screen only', () => {
  assert(selector.includes('onViewableItemsChanged'), 'offscreen pause');
  assert(selector.includes('active={onScreen && !reduceMotion}'), 'on-screen motion');
});

if (failures.length) {
  console.error('POCKET SELECTOR IA TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('POCKET SELECTOR IA TESTS PASSED');

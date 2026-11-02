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

check('first-use never mounts a Pocket under the opening ident', () => {
  const main = read('components/pockt/MainScreen.tsx');
  assert(main.includes("launchGate === 'resume'"), 'instrument waits for resume gate');
  assert(main.includes('showInstrument'), 'instrument visibility is gated');
  assert(main.includes("const foundationView: RoomId = 'dial'"), 'cold launch opens Console');
  assert(!main.includes('showFirstUseSelector'), 'choose-your-pocket is not the launch screen');
  assert(main.includes('!identVisible && hydrated && launchGate === \'resume\''), 'ident finishes before the console');
  assert(!main.includes('discoverPockets && !identVisible'), 'old overlay-on-Beatline discover path is gone');
});

check('first-use heading is CHOOSE YOUR POCKET only', () => {
  const selector = read('components/pockt/ViewSelectorSheet.tsx');
  assert(selector.includes('POCKET_SELECTOR_TITLE'), 'locked heading');
  assert(!selector.includes('>POCKETS<'), 'no POCKETS kicker');
  assert(!selector.includes('Select an instrument to begin'), 'no extra instruction');
});

check('no autoplay', () => {
  const experience = read('lib/pockt-experience.ts');
  const main = read('components/pockt/MainScreen.tsx');
  assert(experience.includes('RESTORE_PLAYBACK_ON_LAUNCH = false'), 'policy');
  const launch = main.split('processColdLaunch = false')[1]?.split('goHome')[0] ?? '';
  assert(!launch.includes('toggle()'), 'cold launch does not play');
});

if (failures.length) {
  console.error('FIRST-USE TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('FIRST-USE TESTS PASSED');

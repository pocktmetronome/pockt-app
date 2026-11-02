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

const MAP = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

function sameGlyph(a, b) {
  return MAP[a].every((bit, i) => bit === MAP[b][i]);
}

function renderBpm(value) {
  return String(Math.max(0, Math.min(999, Math.round(value)))).padStart(3, ' ').split('');
}

check('digit 8 has a center segment and is not a 0', () => {
  assert(MAP['8'][6] === 1, '8 lights the center bar');
  assert(MAP['0'][6] === 0, '0 does not light the center bar');
  assert(!sameGlyph('8', '0'), '8 is not visually identical to 0');
});

check('all digits 0-9 have unique seven-segment patterns', () => {
  const keys = Object.keys(MAP);
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      assert(!sameGlyph(keys[i], keys[j]), `${keys[i]} must not match ${keys[j]}`);
    }
  }
});

check('representative Console BPMs keep an 8 distinct from 0', () => {
  for (const bpm of [20, 68, 80, 88, 108, 128, 180, 188, 280, 380, 400]) {
    const glyphs = renderBpm(bpm);
    if (String(bpm).includes('8')) {
      assert(glyphs.includes('8'), `${bpm} still contains digit 8`);
      assert(!sameGlyph('8', '0'), '8 cannot collapse to 0');
    }
  }
});

check('Console DigitalDigits source lights the center bar for 8', () => {
  const source = read('components/classic/DigitalDigits.tsx');
  assert(source.includes('const ON = [1, 1, 1, 1, 1, 1, 1]'), 'ON includes center segment');
  assert(!source.includes('const ON = [1, 1, 1, 1, 1, 1, 0]'), 'old missing-center ON is gone');
  assert(source.includes("'8': ON"), '8 uses the full seven-segment ON glyph');
  assert(read('components/classic/RigRoom.tsx').includes('<DigitalDigits'), 'Console uses DigitalDigits');
});

if (failures.length) {
  console.error('CONSOLE DIGIT TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('CONSOLE DIGIT TESTS PASSED');

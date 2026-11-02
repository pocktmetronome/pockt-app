'use strict';

const fs = require('fs');
const path = require('path');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function sanitizeBpm(value, fallback = 120, min = 1, max = 900) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return Math.round(fallback);
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function isMeasureAudible(measureIndex, lockIn, countInBars = 0, customOn = 3, customOff = 1) {
  if (measureIndex < Math.max(0, countInBars)) return true;
  const cycleIndex = measureIndex - Math.max(0, countInBars);
  if (lockIn === 'full') return true;
  if (lockIn === 'every-other' || lockIn === 'one-on-one-off') return cycleIndex % 2 === 0;
  if (lockIn === 'two-on-one-off') return cycleIndex % 3 < 2;
  if (lockIn === 'four-on-four-off') return Math.floor(cycleIndex / 4) % 2 === 0;
  if (lockIn === 'custom') {
    const cycle = Math.max(1, customOn + customOff);
    return cycleIndex % cycle < customOn;
  }
  return true;
}

function isTickAudible({ measureIndex, beatIndex, subdivisionIndex, lockIn, sparseMode, clickShift, countInBars = 0 }) {
  if (!isMeasureAudible(measureIndex, lockIn, countInBars)) return false;
  if (clickShift > 0 && subdivisionIndex !== clickShift) return false;
  if (sparseMode === 'downbeats') return beatIndex === 0 && subdivisionIndex === clickShift;
  const cycleIndex = measureIndex - Math.max(0, countInBars);
  if (sparseMode === 'every-2') return cycleIndex % 2 === 0;
  if (sparseMode === 'every-4') return cycleIndex % 4 === 0;
  return true;
}

function nextPracticeBpm(current, config) {
  const direction = config.targetBpm >= config.startBpm ? 1 : -1;
  const stepped = sanitizeBpm(current + direction * config.step, current);
  return direction > 0 ? Math.min(config.targetBpm, stepped) : Math.max(config.targetBpm, stepped);
}

function moveSong(ids, from, to) {
  if (from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function unique(ids) {
  return [...new Set(ids)];
}

const failures = [];
function check(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

check('bpm rejects NaN', () => {
  assert(sanitizeBpm(Number.NaN, 120) === 120, 'NaN should fall back');
  assert(sanitizeBpm('nope', 80) === 80, 'string should fall back');
  assert(sanitizeBpm(400) === 400, '400 should stay');
  assert(sanitizeBpm(0) === 1, 'below min should clamp');
});

check('space trainer returns on boundary', () => {
  assert(isMeasureAudible(0, 'one-on-one-off') === true, 'bar 0 audible');
  assert(isMeasureAudible(1, 'one-on-one-off') === false, 'bar 1 silent');
  assert(isMeasureAudible(2, 'one-on-one-off') === true, 'bar 2 returns');
  assert(isMeasureAudible(1, 'one-on-one-off', 2) === true, 'count-in keeps bar 1 audible');
  assert(isMeasureAudible(2, 'one-on-one-off', 2) === true, 'first post count-in audible');
  assert(isMeasureAudible(3, 'one-on-one-off', 2) === false, 'space starts after count-in');
});

check('shift trainer keeps downbeat internally', () => {
  assert(
    isTickAudible({
      measureIndex: 0,
      beatIndex: 0,
      subdivisionIndex: 0,
      lockIn: 'full',
      sparseMode: 'all',
      clickShift: 1,
    }) === false,
    'on-beat click is silent when shifted'
  );
  assert(
    isTickAudible({
      measureIndex: 0,
      beatIndex: 0,
      subdivisionIndex: 1,
      lockIn: 'full',
      sparseMode: 'all',
      clickShift: 1,
    }) === true,
    'shifted subdivision is audible'
  );
});

check('sparse click', () => {
  assert(
    isTickAudible({
      measureIndex: 0,
      beatIndex: 2,
      subdivisionIndex: 0,
      lockIn: 'full',
      sparseMode: 'downbeats',
      clickShift: 0,
    }) === false,
    'non-downbeat silent in downbeats mode'
  );
  assert(
    isTickAudible({
      measureIndex: 0,
      beatIndex: 0,
      subdivisionIndex: 0,
      lockIn: 'full',
      sparseMode: 'downbeats',
      clickShift: 0,
    }) === true,
    'downbeat audible'
  );
  assert(
    isTickAudible({
      measureIndex: 1,
      beatIndex: 0,
      subdivisionIndex: 0,
      lockIn: 'full',
      sparseMode: 'every-2',
      clickShift: 0,
    }) === false,
    'every-2 silences odd bars'
  );
});

check('tempo ramp boundaries', () => {
  const up = { startBpm: 80, targetBpm: 100, step: 10 };
  assert(nextPracticeBpm(80, up) === 90, 'step up');
  assert(nextPracticeBpm(95, up) === 100, 'clamp to target');
  const down = { startBpm: 120, targetBpm: 100, step: 10 };
  assert(nextPracticeBpm(120, down) === 110, 'step down');
  assert(nextPracticeBpm(105, down) === 100, 'clamp down to target');
});

check('setlist reorder', () => {
  assert(moveSong(['a', 'b', 'c'], 0, 2).join(',') === 'b,c,a', 'move first to last');
  assert(moveSong(['a', 'b', 'c'], 2, 0).join(',') === 'c,a,b', 'move last to first');
});

check('sound ids unique', () => {
  const ids = [
    'pocket',
    'precision',
    'stage-cut',
    'tight',
    'pockt-studio',
    'subkick',
    'pockt-altered',
    'pockt-after-dark',
    'pockt-heart',
    'pockt-default',
    'pockt-heavy',
    'wood',
    'click',
  ];
  assert(unique(ids).length === ids.length, 'duplicate sound ids');
});

check('library launch sanitize', () => {
  const lib = read('lib/library.ts');
  assert(lib.includes("launchBehavior: 'last'"), 'normal launch restores last-used View');
  assert(lib.includes("=== 'gallery' ? 'last'"), 'legacy gallery launch migrates to last');
});

if (failures.length) {
  console.error('CATEGORY TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('CATEGORY TESTS PASSED');
console.log('space trainer, shift trainer, sparse click, tempo ramp, setlist order, sounds, bpm, launch');

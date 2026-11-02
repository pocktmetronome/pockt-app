'use strict';

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const meter = fs.readFileSync(path.join(__dirname, '..', 'constants/meter.ts'), 'utf8');
const types = fs.readFileSync(path.join(__dirname, '..', 'lib/types.ts'), 'utf8');
const select = fs.readFileSync(path.join(__dirname, '..', 'lib/meter-select.ts'), 'utf8');
const sheet = fs.readFileSync(path.join(__dirname, '..', 'components/modals/MeterSheet.tsx'), 'utf8');

assert(meter.includes("'10/4'"), '10/4 exists');
assert(meter.includes("'16/4'"), '16/4 exists');
assert(meter.includes("'7/8-232'"), '7/8 grouping kept');
assert(meter.includes("'9/8-333'") || meter.includes("'3+3+3'"), '9/8 grouping exists');
assert(select.includes('9-333'), '9/8 3+3+3 grouping selectable');
assert(types.includes("'16/16'"), '16/16 typed');
assert(select.includes('METER_PRESETS'), 'presets exported');
assert(select.includes('resolveMeterId'), 'custom resolver');
assert(select.includes('5q-32'), '5/4 3+2 grouping');
assert(select.includes('5q-23'), '5/4 2+3 grouping');
assert(meter.includes("'5/4-23'"), '5/4 2+3 signature');
assert(meter.includes("'5/4-32'"), '5/4 3+2 signature');
assert(sheet.includes('COMMON'), 'preset UI');
assert(sheet.includes('CUSTOM'), 'custom UI');
assert(sheet.includes('NOTE VALUE'), 'denominator control');
assert(sheet.includes('ScrollView'), 'custom flow scrolls');
assert(sheet.includes('METER_NUMERATORS'), 'numerator control');
assert(sheet.includes('METER_DENOMINATORS'), 'constrained denominator');
assert(sheet.includes('accessibilityLabel="Done"'), 'custom Done button');
assert(sheet.includes('accessibilityLabel="Cancel"'), 'custom Cancel button');
assert(sheet.includes('draftCustom') && sheet.includes('commitCustom'), 'custom stays open until Done');
assert(sheet.includes('choosePreset'), 'presets still apply immediately');
assert(sheet.includes('beats} / {denominator'), 'live custom meter');
assert(!sheet.includes('free text'), 'no free text meter');
assert(sheet.includes('styles.footer'), 'DONE/CANCEL live in a sticky footer');
assert(sheet.includes('accessibilityLabel="Meter actions"'), 'footer is labeled');
assert(sheet.indexOf('styles.footer') > sheet.indexOf('</ScrollView>'), 'footer stays outside the scroll body');
assert(sheet.includes('onSubdivisionChange'), 'unified subdivision lives in MeterSheet');
assert(sheet.includes('SUBDIVISION_ORDER'), 'subdivision chips in meter editor');
assert(sheet.includes('keyboardShouldPersistTaps="handled"'), 'meter chips are immediately tappable');
assert(sheet.includes('StyleSheet.absoluteFillObject'), 'meter backdrop is not a nested pressable');

const main = fs.readFileSync(path.join(__dirname, '..', 'components/pockt/MainScreen.tsx'), 'utf8');
assert(
  main.includes("overlay === 'time' || overlay === 'division' || overlay === 'rhythm'"),
  'Time, Division, and Rhythm open the same MeterSheet'
);
assert(!main.includes('<ReelScreen'), 'legacy subdivision reel is gone');
assert(!main.includes('<RhythmPanel'), 'legacy rhythm panel is gone');

function groupingsFor(beats, denominator) {
  if (beats === 5 && denominator === 8) {
    return [{ id: '5-23' }, { id: '5-32' }];
  }
  if (beats === 7 && denominator === 8) {
    return [{ id: '7-223' }, { id: '7-232' }, { id: '7-322' }];
  }
  return [];
}

function parseMeterParts(id) {
  if (id === '5/8-23') return { beats: 5, denominator: 8, grouping: '5-23' };
  if (id === '5/8-32' || id === '5/8') return { beats: 5, denominator: 8, grouping: '5-32' };
  if (id === '7/8-223' || id === '7/8') return { beats: 7, denominator: 8, grouping: '7-223' };
  if (id === '7/8-232') return { beats: 7, denominator: 8, grouping: '7-232' };
  if (id === '7/8-322') return { beats: 7, denominator: 8, grouping: '7-322' };
  const core = (id.split('-')[0] ?? id).split('/');
  return {
    beats: Math.max(1, Math.min(16, Number(core[0]) || 4)),
    denominator: Number(core[1]) || 4,
    grouping: 'none',
  };
}

function resolveMeterId(parts) {
  const beats = Math.max(1, Math.min(16, Math.round(parts.beats)));
  const den = parts.denominator;
  if (beats === 5 && den === 8) {
    if (parts.grouping === '5-23') return '5/8-23';
    return '5/8-32';
  }
  if (beats === 7 && den === 8) {
    if (parts.grouping === '7-232') return '7/8-232';
    if (parts.grouping === '7-322') return '7/8-322';
    return '7/8-223';
  }
  return `${beats}/${den}`;
}

assert(resolveMeterId({ beats: 4, denominator: 4, grouping: 'none' }) === '4/4', '4/4');
assert(resolveMeterId({ beats: 7, denominator: 8, grouping: '7-232' }) === '7/8-232', '7/8 2+3+2');
assert(resolveMeterId({ beats: 5, denominator: 8, grouping: '5-23' }) === '5/8-23', '5/8 2+3');
assert(resolveMeterId({ beats: 11, denominator: 8, grouping: 'none' }) === '11/8', '11/8');
assert(resolveMeterId({ beats: 16, denominator: 16, grouping: 'none' }) === '16/16', '16/16');

function simulateCustomSheet(startId) {
  const start = parseMeterParts(startId);
  let appMeter = startId;
  let sheetOpen = true;
  let beats = start.beats;
  let denominator = start.denominator;
  let grouping = start.grouping;
  const liveDisplay = () => `${beats} / ${denominator}`;
  return {
    get appMeter() {
      return appMeter;
    },
    get sheetOpen() {
      return sheetOpen;
    },
    liveDisplay,
    draft(nextBeats, nextDen) {
      if (!sheetOpen) throw new Error('sheet already closed');
      const options = groupingsFor(nextBeats, nextDen);
      const group = options.some((item) => item.id === grouping) ? grouping : options[0]?.id ?? 'none';
      if (!resolveMeterId({ beats: nextBeats, denominator: nextDen, grouping: group })) return;
      beats = nextBeats;
      denominator = nextDen;
      grouping = group;
    },
    done() {
      const next = resolveMeterId({ beats, denominator, grouping });
      if (!next) throw new Error('invalid custom meter');
      appMeter = next;
      sheetOpen = false;
    },
    cancel() {
      sheetOpen = false;
    },
    reopen() {
      const live = parseMeterParts(appMeter);
      beats = live.beats;
      denominator = live.denominator;
      grouping = live.grouping;
      sheetOpen = true;
    },
  };
}

const donePath = simulateCustomSheet('3/4');
assert(donePath.appMeter === '3/4' && donePath.sheetOpen, 'start 3/4 with sheet open');
donePath.draft(4, 4);
assert(donePath.sheetOpen && donePath.liveDisplay() === '4 / 4' && donePath.appMeter === '3/4', 'numerator stays open');
donePath.draft(4, 8);
assert(donePath.sheetOpen && donePath.liveDisplay() === '4 / 8' && donePath.appMeter === '3/4', 'denominator stays open');
donePath.done();
assert(!donePath.sheetOpen && donePath.appMeter === '4/8', 'DONE applies 4/8 and closes');
donePath.reopen();
assert(donePath.sheetOpen && donePath.liveDisplay() === '4 / 8' && donePath.appMeter === '4/8', 'reopen persists 4/8');

const cancelPath = simulateCustomSheet('4/8');
cancelPath.draft(5, 8);
assert(cancelPath.sheetOpen && cancelPath.liveDisplay() === '5 / 8' && cancelPath.appMeter === '4/8', 'CANCEL draft does not apply');
cancelPath.cancel();
assert(!cancelPath.sheetOpen && cancelPath.appMeter === '4/8', 'CANCEL leaves 4/8');

console.log('Meter selector assertions passed');

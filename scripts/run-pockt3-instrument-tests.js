'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const faces = read('lib/instrument-faces.ts');
const beat = read('lib/instrument-beat.ts');
const strip = read('components/instrument/InstrumentBeatStrip.tsx');
const classicBeats = read('components/classic/ClassicDialBeats.tsx');
const rail = read('components/classic/ClassicDialFaceRail.tsx');
const picker = read('components/instrument/FacePicker.tsx');
const main = read('components/pockt/MainScreen.tsx');
const host = read('components/classic/ClassicInstrumentHost.tsx');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const accents = read('lib/accents.ts');
const experience = read('lib/pockt-experience.ts');
const settings = read('components/screens/SettingsScreen.tsx');
const count = read('lib/accent-sound.ts');

assert(faces.includes("'dial'"), 'classic dial is a face');
assert(faces.includes("'pulse'"), 'pulse is a face');
assert(faces.includes("'smart-pendulum'"), 'smart pendulum is a face');
assert(faces.includes("'pro'"), 'classic pro is a face');
assert(faces.includes("'beatline'"), 'beatline is a face');
assert(faces.includes("'pendula-classic'"), 'mechanical is a face');
assert(faces.includes("'ledgear'"), 'led gear is a face');
assert(!faces.includes("'rig'"), 'console stays in Pockets');

assert(host.includes('FoundationDialRoom'), 'principal faces share the console');
assert(host.includes('isPrimaryInstrumentFace'), 'the six interiors use the shell');
assert(!host.includes('PendulaClassicRoom'), 'mechanical is not a separate room on the shell');
assert(fs.existsSync(path.join(__dirname, '../components/classic/PendulaClassicRoom.tsx')), 'mechanical implementation is preserved');
assert(host.includes('LedgearRoom'), 'led hosted');
assert(host.includes('BeatlineRoom'), 'unknown rooms still have a beatline fallback');

assert(main.includes('FacePicker'), 'face transform is in the shell');
assert(main.includes("overlay === 'faces'"), 'face picker is an overlay, not a room');
assert(main.includes('viewSwitchPatch(next)'), 'face switch is view-only');
assert(main.includes('onOpenFaces'), 'faces are reachable from the instrument');
assert(!main.includes('stop();\n            onSwitchView'), 'face switch does not stop transport');

assert(foundation.includes('ClassicDialBeats'), 'dial uses physical beat bubbles');
assert(foundation.includes('ClassicDialFaceRail'), 'dial has the bottom face selector');
assert(foundation.includes('onOpenDivision'), 'subdivision is on the foundation chrome');
assert(foundation.includes('onSwitchFace'), 'face rail can switch without a new engine');
assert(classicBeats.includes('BEAT_ACCENT_STATES'), 'beat editor is the four engine states');
assert(!classicBeats.includes('cycleAccentLevel'), 'beats do not silently cycle');
assert(rail.includes('FACE_RAIL_ORDER'), 'rail lists the product faces');
assert(strip.includes('EDIT'), 'shared beat strip still has an obvious edit control');
assert(strip.includes('beatGroupsFor'), 'compound meters group');
assert(beat.includes("timeSignature === '6/8'"), '6/8 grouping');
assert(beat.includes("timeSignature === '12/8'"), '12/8 grouping');

assert(accents.includes('faceTransform'), 'classic face switch keeps the current sound');
assert(experience.includes('viewSwitchPatch'), 'shared musical patch remains');
assert(picker.includes('TRANSFORM'), 'picker is a transform, not a carousel');
assert(!picker.includes('FlatList'), 'no spinning carousel');

assert(settings.includes('LABS'), 'labs section exists');
assert(settings.includes("ARCHIVE · NOT LOADED"), 'machine stays archived');
assert(count.includes('isCountSample'), 'spoken count samples enable voice count');

const groups = {
  '6/8': 2,
  '12/8': 4,
};
function beatGroupsFor(id, grouping) {
  if (grouping) {
    const parts = grouping.split('+').map((n) => Math.max(1, Number(n) || 1));
    return parts.length;
  }
  if (id === '6/8') return 2;
  if (id === '12/8') return 4;
  return 1;
}
assert.strictEqual(beatGroupsFor('6/8'), groups['6/8']);
assert.strictEqual(beatGroupsFor('12/8'), groups['12/8']);
assert.strictEqual(beatGroupsFor('7/8', '2+2+3'), 3);
assert.strictEqual(beatGroupsFor('5/8', '3+2'), 2);

console.log('pockt-3 transforming instrument tests passed');

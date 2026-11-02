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

function instrumentMeterCaption(id) {
  return id.split('-')[0] ?? id;
}

const beatline = read('components/classic/BeatlineRoom.tsx');
const face = read('components/beatline/BeatlineFace.tsx');
const shell = read('components/pockt2/InstrumentShell.tsx');
const dock = read('components/pockt2/InstrumentDock.tsx');
const transport = read('components/pockt2/TransportKey.tsx');
const digits = read('components/pockt2/BpmDigits.tsx');
const more = read('components/pockt2/InstrumentMoreSheet.tsx');
const main = read('components/pockt/MainScreen.tsx');
const captions = read('lib/instrument-captions.ts');
const mark = read('components/pockt2/Pockt2Mark.tsx');

check('Beatline Build 69 is the mounted face', () => {
  assert(beatline.includes('BeatCapsuleStrip'), 'capsules');
  assert(beatline.includes('HorizontalTempoWheel'), 'tempo wheel');
  assert(beatline.includes('GlassPlayOrb'), 'glass orb');
  assert(!beatline.includes('BeatlineFace'), 'metallic 2.0 face is not mounted');
  assert(!beatline.includes('InstrumentShell'), 'generic shell is not Beatline chrome');
});

check('Beatline keeps its musical authority', () => {
  assert(beatline.includes('setBpm('), 'tempo still commits through setBpm');
  assert(beatline.includes('onPress={toggle}'), 'existing transport action');
  assert(face.includes('onBpm={setBpm}'), 'dial receives setBpm');
  assert(face.includes('commitAndToggle'), 'play flushes then toggles');
  assert(face.includes('onOpenPad'), 'tempo pad remains');
  assert(face.includes('onOpenRhythm'), 'rhythm destination');
  assert(face.includes('onOpenSound'), 'sound destination');
  assert(face.includes('tapTempo'), 'tap tempo remains');
  assert(face.includes('onChangeAccents'), 'rail accent editing remains');
});

check('shared shell chrome remains available and global bezel is skipped for Beatline', () => {
  assert(shell.includes('Pockt2Mark'), 'approved P in the edge');
  assert(shell.includes('Pockets'), 'Pockets on the quiet edge');
  assert(shell.includes('Tuner'), 'Tuner on the quiet edge');
  assert(mark.includes('POCKT_2_MARK'), 'P is the locked raster');
  assert(main.includes('beatlineFace'), 'Beatline remains a known face');
  assert(main.includes('isPrimaryInstrumentFace(roomId)'), 'Beatline shares the dial shell');
  assert(main.includes('instrumentShell ? null'), 'the shared instrument skips the global bezel');
});

check('quiet play is playing-state animation, not a musical clock', () => {
  assert(dock.includes('quiet.value = withTiming(playing ? 1 : 0'), 'quiet follows playing');
  assert(!dock.includes('setInterval'), 'no interval clock');
  assert(!dock.includes('performance.now'), 'no performance.now clock');
  assert(!shell.includes('setInterval'), 'shell has no interval');
  assert(!transport.includes('setInterval'), 'transport has no interval');
  assert(!beatline.includes('setInterval'), 'Beatline has no interval');
  assert(dock.includes('TransportKey'), 'stop remains while playing');
});

check('more sheet preserves secondary functionality', () => {
  assert(more.includes('Settings') && more.includes('Accents'), 'settings and accents');
  assert(more.includes('Practice') && more.includes('Setlists'), 'practice and setlists');
  assert(more.includes('Tap tempo'), 'tap tempo path');
  assert(more.includes('MixerFader'), 'volume path');
});

check('dock captions stay truthful', () => {
  assert(captions.includes('instrumentMeterCaption'), 'meter caption helper');
  assert(captions.includes('instrumentSoundCaption'), 'sound caption helper');
  assert(instrumentMeterCaption('4/4') === '4/4', '4/4 stays 4/4');
  assert(instrumentMeterCaption('7/8-223') === '7/8', 'grouped meters collapse for the dock');
  assert(instrumentMeterCaption('12/8') === '12/8', '12/8 stays 12/8');
  assert(digits.includes("fontVariant: ['tabular-nums']"), 'tabular BPM');
  assert(digits.includes("playing ? ', playing' : ''"), 'BPM label includes running state');
});

check('transport invokes the existing action only', () => {
  assert(transport.includes('onPress()'), 'calls supplied toggle');
  assert(beatline.includes('onPress={toggle}'), 'Beatline binds useMetronome toggle');
  assert(!transport.includes('PocktTiming'), 'transport does not talk to the engine');
  assert(!shell.includes('PocktTiming'), 'shell does not talk to the engine');
});

if (failures.length) {
  console.error('INSTRUMENT SHELL TESTS FAILED');
  for (const item of failures) console.error(' -', item);
  process.exit(1);
}

console.log('INSTRUMENT SHELL TESTS PASSED');

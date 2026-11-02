'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const layout = read('lib/compute-foundation-layout.ts');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const rhythm = read('components/classic/faces/RhythmInstrumentFace.tsx');
const pulse = read('components/classic/PulseRoom.tsx');
const pendulum = read('components/classic/SmartPendulumRoom.tsx');
const pro = read('components/classic/ProRoom.tsx');
const beatline = read('components/classic/BeatlineRoom.tsx');
const dial = read('components/classic/DialRoom.tsx');

assert(layout.includes('const meter = rect(meterX'), 'meter key is on the transport row');
assert(!layout.includes('const plateH'), 'meter plates are not inside the beat window');
assert(layout.includes('const bpmMinus = rect(g, thumbY'), 'left thumb key is minus one');
assert(layout.includes('const bpmPlus = rect(width - sideX - step'), 'right thumb key is plus one');
assert(layout.includes('const railY = railCeiling'), 'navigation sits on the safe-area ceiling');
assert(foundation.includes('transport'), 'the meter control uses the transport key');
assert(!foundation.includes('layout.division'), 'subdivision is not a second plate');
assert(foundation.includes('stepTempo(1)') && foundation.includes('stepTempo(-1)'), 'steppers remain one BPM');
assert(!beats.includes('if (!deck || flipping || proof)'), 'phrase selector is not locked by a cancelled flip');
assert(beats.includes('LOOP') && beats.includes('BEATS'), 'selector names loop and the beats return');
assert(rhythm.includes('DialSimonSegments'), 'rhythm uses the Simon sector structure');
assert(dial.includes('function ringSector') && dial.includes('function BeatArc'), 'Simon sectors stay in the dial room');
assert(!rhythm.includes('<DialWheel'), 'the drum is not the rhythm face');
assert(!pulse.includes('<PulseEnergy size={viewport}'), 'the gray diaphragm does not cover the pulse field');
assert(pulse.includes('PulseWaves'), 'pulse still launches wavefronts');
assert(pendulum.includes('testID="machined-pendulum"'), 'pendulum viewport is a machined assembly');
assert(pendulum.includes("transformOrigin: 'bottom'"), 'pendulum still swings from the pivot');
assert(pro.includes('view="all"'), 'pro shows the full beat cells');
assert(beatline.includes('BeatCapsuleStrip'), 'beatline uses capsule progression');
assert(beatline.includes('wrap'), 'beatline adapts wide meters');

console.log('device recovery invariants passed');

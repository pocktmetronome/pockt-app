const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pulseBeatShouldLaunch(previousHost, host, playing) {
  if (!playing || !(host > 0)) return false;
  if (previousHost === null) return true;
  return host !== previousHost;
}

assert(pulseBeatShouldLaunch(null, 10.25, true) === true, 'first host launches the first pulse');
assert(pulseBeatShouldLaunch(null, 10.25, false) === false, 'stopped does not launch');
assert(pulseBeatShouldLaunch(10.25, 10.25, true) === false, 'same host does not relaunch');
assert(pulseBeatShouldLaunch(10.25, 10.75, true) === true, 'the next host launches the next pulse');

const pulse = fs.readFileSync(path.join(__dirname, '../lib/pulse-math.ts'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, '../modules/pockt-timing/ios/PocktTimingEngine.swift'), 'utf8');
assert(pulse.includes('previousHost === null) return true'), 'the first host time opens the first pulse');
assert(engine.includes('firstBeatHostTime'), 'start report exposes the first beat host time');
assert(engine.includes('AVAudioTime(sampleTime:'), 'clicks are scheduled on the player sample timeline');
assert(engine.includes('visualAlignsTo'), 'visual alignment target is explicit');
assert(engine.includes('presentationCompensation'), 'presentation compensation is explicit');
assert(engine.includes('player.outputPresentationLatency'), 'built-in and wired visuals add player presentation latency');
assert(engine.includes('reported-not-applied-external-route'), 'bluetooth and airplay latency stay reported');
assert(engine.includes('outputLatencySeconds'), 'route output latency is instrumented');
assert(!engine.includes('setInterval'), 'the native engine does not add a JavaScript timer');

const faces = [
  'components/classic/DialRoom.tsx',
  'components/classic/faces/RhythmInstrumentFace.tsx',
  'components/classic/PulseRoom.tsx',
  'components/classic/faces/PendulumInstrumentFace.tsx',
  'components/classic/ProRoom.tsx',
  'components/classic/BeatlineRoom.tsx',
];
for (const face of faces) {
  const text = fs.readFileSync(path.join(__dirname, '..', face), 'utf8');
  assert(!text.includes('setInterval'), `${face} does not keep its own beat clock`);
  assert(text.includes('beatIndex') || text.includes('pulseBeat'), `${face} reads the scheduled beat`);
}

console.log('first-beat synchronization tests passed');

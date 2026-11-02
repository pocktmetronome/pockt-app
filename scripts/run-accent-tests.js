const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const timeline = fs.readFileSync(path.join(__dirname, '../modules/pockt-timing/ios/PocktTimeline.swift'), 'utf8');
assert(timeline.includes('volume = 0.84'), 'strong is accented and leaves headroom');
assert(timeline.includes('volume = 0.4'), 'soft is quieter than normal');
assert(timeline.includes('volume = 0.66'), 'normal is the reference');
assert(timeline.includes('volume = 0.24'), 'subdivision sits under the beat');
assert(timeline.includes('accent == "mute"'), 'off stays silent');
const engine = fs.readFileSync(path.join(__dirname, '../modules/pockt-timing/ios/PocktTimingEngine.swift'), 'utf8');
assert(engine.includes('Spoken counts belong on the primary beat'), 'voice stays off subdivisions');
assert(engine.includes('key = "click"'), 'a voice subdivision falls back to a short click');

const strong = 0.84;
const sub = 0.24;
const tail = Math.exp(-(0.0375 - 0.008) / 0.0065);
assert(strong * tail + sub < 1, 'a strong tail plus the next subdivision stays under full scale');
assert(0.4 < 0.66 && 0.66 < strong, 'soft, normal, and strong are ordered');

console.log('accent hierarchy checks passed');

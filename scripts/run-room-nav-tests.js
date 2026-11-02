const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'constants', 'rooms.ts'), 'utf8');

function extractArray(name) {
  const match = source.match(new RegExp(`export const ${name}: RoomId\\[\\] = \\[([\\s\\S]*?)\\];`));
  if (!match) throw new Error(`Missing ${name}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const classic = extractArray('CLASSIC_ROOM_ORDER');
const immersive = extractArray('IMMERSIVE_ROOM_ORDER');
const custom = extractArray('CUSTOM_ROOM_ORDER');
const all = [...classic, ...custom, ...immersive];

assert(
  /export const ROOM_ORDER: RoomId\[\] = \[\.\.\.CLASSIC_ROOM_ORDER, \.\.\.CUSTOM_ROOM_ORDER, \.\.\.IMMERSIVE_ROOM_ORDER\];/.test(
    source
  ),
  'ROOM_ORDER must concatenate Classic, Custom, then Immersive'
);

const expectedClassic = [
  'beatline',
  'pulse',
  'dial',
  'pro',
  'smart-pendulum',
  'pendula-classic',
  'ledgear',
  'rig',
];
const expectedImmersive = ['altered', 'studio'];
const expectedCustom = ['customized'];
const banned = ['heart', 'roots', 'sundown', 'happy', 'heavy', 'pulse-circle', 'tempo', 'orbit', 'after-dark'];

assert(classic.join() === expectedClassic.join(), `Classic order drifted: ${classic.join(',')}`);
assert(immersive.join() === expectedImmersive.join(), `Immersive order drifted: ${immersive.join(',')}`);
assert(custom.join() === expectedCustom.join(), `Custom order drifted: ${custom.join(',')}`);
assert(all.join() === [...expectedClassic, ...expectedCustom, ...expectedImmersive].join(), 'ROOM_ORDER drifted');
assert(
  banned.every((id) => !classic.includes(id) && !immersive.includes(id) && !custom.includes(id)),
  'Stale rooms leaked into the active roster'
);
assert(source.includes("if (backdrop === 'pulse') return FALLBACK_ROOM"), 'retired Orbit backdrop migrates home');
assert(source.includes("if (backdrop === 'ring') return 'pulse'"), 'Pulse room must keep backdrop `ring`');
assert(source.includes("if (backdrop === 'custom') return 'customized'"), 'Photo room mapping missing');
assert(source.includes("export const FALLBACK_ROOM: RoomId = 'beatline'"), 'Fallback must be Beatline');

console.log('Room navigation assertions passed');
console.log(`Active order (${all.length}): ${all.join(' → ')}`);

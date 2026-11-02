'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const MASTERS = 'assets-src/pockt-3-console/masters';
const PROD = 'assets/pockt-3-console';

const REQUIRED_MASTERS = [
  'console_chassis_deck.png',
  'console_well_annulus.png',
  'console_knob_housing.png',
  'console_tap_housing.png',
  'console_play_plate.png',
  'console_pockt_housing.png',
  'console_pill_plate.png',
  'console_beats_track.png',
];

const REPL = 'assets-src/pockt-3-console/replacements';

const BLOCKED_PROD = [];

const PROD_SPECS = {
  'console_chassis_deck.png': { w: 1290, h: 2796, opaqueDeck: true },
  'console_knob_housing.png': { w: 256, h: 256, darkCenter: true },
  'console_tap_housing.png': { w: 256, h: 256, darkCenter: true },
  'console_pockt_housing.png': { w: 256, h: 256, darkCenter: true },
  'console_pill_plate.png': { w: 768, h: 192, darkCenter: true },
  'console_play_plate.png': { w: 1024, h: 192, darkCenter: false },
  'console_beats_track.png': { w: 1176, h: 162, darkCenter: false },
};

function loadPng(rel) {
  const buf = fs.readFileSync(path.join(root, rel));
  const png = PNG.sync.read(buf);
  return { buf, png };
}

function sample(png, x, y) {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function isPng(buf) {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

for (const name of REQUIRED_MASTERS) {
  const rel = `${MASTERS}/${name}`;
  assert(exists(rel), `master missing: ${name}`);
  const { buf, png } = loadPng(rel);
  assert(isPng(buf), `${name} is not a PNG`);
  assert(png.width > 0 && png.height > 0, `${name} has no pixels`);
  assert(png.colorType === 6, `${name} must be RGBA`);
}

const chassis = loadPng(`${MASTERS}/console_chassis_deck.png`);
assert.strictEqual(chassis.png.width, 759);
assert.strictEqual(chassis.png.height, 2072);
assert.strictEqual(sample(chassis.png, Math.floor(chassis.png.width / 2), Math.floor(chassis.png.height / 2))[3], 0, 'chassis center is a true hole');
assert.strictEqual(sample(chassis.png, 0, 0)[3], 0, 'chassis corner is transparent');

const well = loadPng(`${MASTERS}/console_well_annulus.png`);
assert.notStrictEqual(well.png.width, 2048, 'annulus is not the required square');
assert.strictEqual(sample(well.png, Math.floor(well.png.width / 2), Math.floor(well.png.height / 2))[3], 0, 'annulus hole is true alpha');

const play = loadPng(`${MASTERS}/console_play_plate.png`);
const playC = sample(play.png, Math.floor(play.png.width / 2), Math.floor(play.png.height / 2));
assert(playC[3] > 200 && playC[0] > 180, 'play plate still has a baked bright icon at center');

const beats = loadPng(`${MASTERS}/console_beats_track.png`);
const beatC = sample(beats.png, Math.floor(beats.png.width / 2), Math.floor(beats.png.height / 2));
assert(beatC[3] > 200 && beatC[0] > 180, 'beats track still has a baked lit marker at center');

for (const name of BLOCKED_PROD) {
  assert(!exists(`${PROD}/${name}`), `blocked asset must not ship: ${name}`);
}

for (const [name, spec] of Object.entries(PROD_SPECS)) {
  const { buf, png } = loadPng(`${PROD}/${name}`);
  assert(isPng(buf), `${name} production is not a PNG`);
  assert.strictEqual(png.width, spec.w, `${name} width`);
  assert.strictEqual(png.height, spec.h, `${name} height`);
  const tl = sample(png, 0, 0);
  const tr = sample(png, png.width - 1, 0);
  const bl = sample(png, 0, png.height - 1);
  const br = sample(png, png.width - 1, png.height - 1);
  const c = sample(png, Math.floor(png.width / 2), Math.floor(png.height / 2));
  if (spec.opaqueDeck) {
    assert(tl[3] >= 240 && tr[3] >= 240 && bl[3] >= 240 && br[3] >= 240, `${name} deck is opaque`);
    assert(c[3] >= 240 && c[0] < 160, `${name} center is opaque metal, not a hole`);
    continue;
  }
  assert(tl[3] < 8 && tr[3] < 8 && bl[3] < 8 && br[3] < 8, `${name} corners stay transparent`);
  assert(c[3] >= 240, `${name} center metal stays opaque`);
  assert(c[0] < 180, `${name} center is not a baked bright icon`);
  if (spec.darkCenter) {
    assert(c[0] < 80 && c[1] < 60 && c[2] < 50, `${name} center is dark metal, not punched`);
  }
}

const housingA = fs.readFileSync(path.join(root, `${PROD}/console_knob_housing.png`));
const housingB = fs.readFileSync(path.join(root, `${PROD}/console_tap_housing.png`));
const housingC = fs.readFileSync(path.join(root, `${PROD}/console_pockt_housing.png`));
assert(housingA.equals(housingB) && housingA.equals(housingC), 'round housings share the corrected plate');

const replaceChassis = loadPng(`${REPL}/console_chassis_deck.png`);
assert.strictEqual(replaceChassis.png.width, 852);
assert.strictEqual(replaceChassis.png.height, 1846);
assert.strictEqual(replaceChassis.png.colorType, 2, 'replacement chassis is opaque RGB');
const rc = sample(replaceChassis.png, Math.floor(replaceChassis.png.width / 2), Math.floor(replaceChassis.png.height / 2));
assert(rc[3] === 255 && rc[0] < 160, 'replacement chassis center is opaque metal, not a hole');
assert.strictEqual(+(replaceChassis.png.width / replaceChassis.png.height).toFixed(4), 0.4615, 'chassis aspect matches iPhone');

const replaceWell = loadPng(`${REPL}/console_well_annulus.png`);
assert.strictEqual(replaceWell.png.width, 1254);
assert.strictEqual(sample(replaceWell.png, 627, 627)[3], 0, 'replacement well center is true alpha');

const replacePlay = loadPng(`${REPL}/console_play_plate.png`);
const rpc = sample(replacePlay.png, Math.floor(replacePlay.png.width / 2), Math.floor(replacePlay.png.height / 2));
assert(rpc[3] > 200 && rpc[0] < 180, 'replacement play plate has no baked bright icon');

const replaceBeats = loadPng(`${REPL}/console_beats_track.png`);
const rbc = sample(replaceBeats.png, Math.floor(replaceBeats.png.width / 2), Math.floor(replaceBeats.png.height / 2));
assert(rbc[3] > 200 && rbc[0] < 180, 'replacement beats track has no baked lit marker');

const wellProd = loadPng(`${PROD}/console_well_annulus.png`);
assert.strictEqual(wellProd.png.width, 2048);
assert.strictEqual(wellProd.png.height, 2048);
assert.strictEqual(sample(wellProd.png, 1024, 1024)[3], 0, 'production well hole is open at center');
assert(sample(wellProd.png, 1024, 1024 - 700)[3] < 16, 'production well is open inside r=768');
const wellRing = sample(wellProd.png, 1024, 80);
assert(wellRing[3] >= 200 && wellRing[0] > wellRing[2], 'production well keeps the outer bronze lip');
assert(sample(wellProd.png, 0, 0)[3] < 8, 'production well corners stay transparent');

const assets = read('lib/console-assets.ts');
assert(assets.includes("require('@/assets/pockt-3-console/console_knob_housing.png')"), 'knob housing referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_tap_housing.png')"), 'TAP housing referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_pockt_housing.png')"), 'POCKT housing referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_pill_plate.png')"), 'pill plate referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_well_annulus.png')"), 'well referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_play_plate.png')"), 'play plate referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_beats_track.png')"), 'beats track referenced');
assert(assets.includes("require('@/assets/pockt-3-console/console_chassis_deck.png')"), 'chassis referenced');
assert(assets.includes('CONSOLE_WELL_SCALE = 1.28'), 'well uses the manifest 1.28 D scale');

const foundation = read('components/classic/FoundationDialRoom.tsx');
assert(foundation.includes('PocktDialView'), 'native dial remains the instrument');
assert(foundation.includes('computeFoundationLayout'), 'console uses the foundation layout');
assert(!foundation.includes('CONSOLE_'), 'chassis, annulus, and plates are not mounted');
assert(!foundation.includes('expo-image'), 'console has no generated image layer');
assert(foundation.includes('ClassicDialBpmStep'), '+/− sit beside the BPM readout');
assert(foundation.includes('stepDialBpm'), '+/− use the dial clamp path');
assert(!foundation.includes('CLASSIC_DIAL_MASTER'), 'concept still is not a background');
assert(!foundation.includes('setInterval'), 'no JS musical timer in the room');
assert(foundation.includes('ClassicDialPlay'), 'live Play/Stop stays');
assert(foundation.includes('ClassicDialBeats'), 'live beats stay');
assert(foundation.includes('onCenterTap={toggle}'), 'hub press stays');
assert(foundation.includes('onBpm='), 'rotary BPM stays');
assert(foundation.includes('tapTempo'), 'TAP stays');
assert(foundation.includes('ClassicDialPocktButton'), 'POCKT stays');
assert(foundation.includes('ClassicDialFaceRail'), 'face rail stays');
assert(foundation.includes('testID="console-nav"'), 'bottom navigation is its own bar');

const hardware = read('components/classic/ClassicDialHardware.tsx');
assert(!hardware.includes('CONSOLE_'), 'control plates stay off the active controls');
assert(hardware.includes("name=\"play\""), 'Play glyph stays live');
assert(hardware.includes('stopGlyph'), 'Stop glyph stays live');
assert(hardware.includes('Pockt2Mark'), 'approved P mark stays live');
assert(hardware.includes("label=\"TAP\"") || foundation.includes("label=\"TAP\""), 'TAP label stays live');

const beatsSrc = read('components/classic/ClassicDialBeats.tsx');
assert(beatsSrc.includes('beatIndex === index'), 'live beat index drives bubbles');
assert(!beatsSrc.includes('CONSOLE_BEATS_TRACK'), 'beats plate is not behind the bubbles');
assert(!beatsSrc.includes('setInterval'), 'beats have no JS timer');

const layout = read('lib/compute-foundation-layout.ts');
assert(layout.includes('const D = Math.min'), 'dial scale formula unchanged');
assert(layout.includes('dial = rect((width - D) / 2'), 'dial remains centered in the band');

const metal = read('modules/pockt-dial/ios/PocktDialShader.metal');
assert(metal.includes('VIEW_FILL') || metal.includes('0.48'), 'native housing radius stays in Metal');

const swift = read('modules/pockt-dial/ios/PocktDialView.swift');
assert(swift.includes('override func touchesBegan'), 'build 122 touch path');
assert(swift.includes('onBpm(["bpm": bpm])'), 'build 122 emits integer BPM');
assert(swift.includes('applyBpm'), '+/− updates the native angle through the bpm prop');
assert(!swift.includes('G_MAX'), 'Video A map only');

console.log('pockt-3 console asset tests passed');

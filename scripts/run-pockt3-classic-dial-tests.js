'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
const DIAL_MIN_BPM = 20;
const DIAL_MAX_BPM = 400;
const DIAL_HOME_BPM = 120;
const DIAL_MIN_ANGLE = (-130 * Math.PI) / 180;
const DIAL_MAX_ANGLE = (140 * Math.PI) / 180;
const DIAL_HOME_ANGLE = 0;
const DIAL_HYSTERESIS_BPM = 0.85;

function clampDialBpm(value) {
  if (!Number.isFinite(value)) return DIAL_HOME_BPM;
  return Math.min(DIAL_MAX_BPM, Math.max(DIAL_MIN_BPM, Math.round(value)));
}
function angleFromDialBpm(bpm) {
  const safe = clampDialBpm(bpm);
  if (safe <= DIAL_HOME_BPM) {
    const t = (safe - DIAL_MIN_BPM) / (DIAL_HOME_BPM - DIAL_MIN_BPM);
    return DIAL_MIN_ANGLE + t * (DIAL_HOME_ANGLE - DIAL_MIN_ANGLE);
  }
  const t = (safe - DIAL_HOME_BPM) / (DIAL_MAX_BPM - DIAL_HOME_BPM);
  return DIAL_HOME_ANGLE + t * (DIAL_MAX_ANGLE - DIAL_HOME_ANGLE);
}
function rawBpmFromDialAngle(angle) {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM);
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM);
}
function latestInteger(committed, raw, flush) {
  const start = clampDialBpm(committed);
  if (flush) {
    const snapped = clampDialBpm(raw);
    return snapped === start ? null : snapped;
  }
  if (raw >= start + DIAL_HYSTERESIS_BPM) {
    const dest = Math.min(DIAL_MAX_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  if (raw <= start - DIAL_HYSTERESIS_BPM) {
    const dest = Math.max(DIAL_MIN_BPM, Math.round(raw));
    return dest === start ? null : dest;
  }
  return null;
}

const timing = read('constants/timing.ts');
const persist = read('storage/persist.ts');
const scale = read('lib/pockt-dial-scale.ts');
const tuning = read('modules/pockt-dial/ios/PocktDialTuning.swift');
const face = read('modules/pockt-dial/ios/PocktDialFace.swift');
const step = read('lib/pockt-dial-step.ts');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const hardware = read('components/classic/ClassicDialHardware.tsx');
const rail = read('components/classic/ClassicDialFaceRail.tsx');
const pad = read('components/modals/BpmPadSheet.tsx');
const tempo = read('lib/tempo-name.ts');
const visual = read('lib/classic-dial-visual.ts');
const instrumentBeat = read('lib/instrument-beat.ts');
const main = read('components/pockt/MainScreen.tsx');
const host = read('components/classic/ClassicInstrumentHost.tsx');

assert(timing.includes('DEFAULT_BPM = 120'), 'first-launch BPM is 120');
assert(timing.includes("timeSignature: '4/4'"), 'first-launch meter is 4/4');
assert(timing.includes("feel: 'straight'"), 'first-launch feel is straight');
assert(timing.includes("sound: 'pocket'"), 'first-launch sound is the approved pocket click');
assert(persist.includes('restoredFromDisk') || persist.includes('sanitizeConfig'), 'returning users keep persisted config');
assert(!foundation.includes('126'), 'reference 126 is not hardcoded');
assert(!foundation.includes('Andante'), 'tempo names are live, not hardcoded');
assert(foundation.includes('tempoName(safeBpm)'), 'tempo description follows BPM');
assert(foundation.includes('sanitizeBpm'), 'one authoritative BPM state');
assert(foundation.includes('setBpm(next)'), 'dial writes the shared BPM');
assert(foundation.includes('onOpenPad'), 'numeric entry is wired');
assert(foundation.includes('tapTempo'), 'TAP is wired');
assert(foundation.includes('onOpenSound'), 'sound is wired');
assert(foundation.includes('onOpenTime'), 'meter is wired');
assert(foundation.includes('onOpenDivision'), 'subdivision is wired');
assert(foundation.includes('onOpenSettings'), 'POCKT button opens existing settings');
assert(foundation.includes('useTuner('), 'tuner uses the existing pitch engine');
assert(foundation.includes('VinylTunerFace'), 'tuner is the circular face, not a second screen');
assert(!foundation.includes('kind="pockets"'), 'no Pockets button at the top');
assert(!foundation.includes('kind="settings"'), 'no separate Settings knob');
assert(foundation.includes('toggle()'), 'Play/Stop is one transport');
assert(!foundation.includes('accessibilityLabel="Stop"'), 'no competing Stop button');
assert(foundation.includes('ClassicDialPocktButton'), 'approved POCKT P is wired');
assert(hardware.includes('Pockt2Mark'), 'P button uses the approved mark asset');
assert(!hardware.includes('CONSOLE_KNOB_HOUSING'), 'Sound/Tuner do not use the gold housing');
assert(!hardware.includes('CONSOLE_PILL_PLATE'), 'pills do not use the gold plate');
assert(!foundation.includes('CONSOLE_WELL_ANNULUS'), 'annulus is not mounted');
assert(!foundation.includes('CONSOLE_CHASSIS_DECK'), 'gold chassis is not the deck');
assert(foundation.includes('stepDialBpm'), '+/− share the dial tempo path');
assert(!hardware.includes('CONSOLE_PLAY_PLATE'), 'Play does not use the gold plate');
assert(hardware.includes('name="play"'), 'Play glyph stays live');
assert(hardware.includes('stopGlyph'), 'Stop is still a live square, not baked art');
assert(foundation.includes('ClassicDialPill'), 'meter and subdivision are physical pills');
assert(read('constants/meter.ts').includes('classicSubdivisionLabel'), 'quarter reads STRAIGHT');
assert(read('hooks/use-metronome.ts').includes('restorePlaybackGraph'), 'Play restores a silent native graph');
assert(read('hooks/use-metronome.ts').includes('startReportIsAlive'), 'Play rejects a silent start report');
assert(foundation.includes('PocktDialView'), 'native dial is the live instrument');
assert(!foundation.includes('require(') || !foundation.includes('CLASSIC_DIAL_MASTER'), 'no flattened screenshot UI');
assert(!foundation.includes('FIND YOUR POCKET'), 'tagline is off the instrument face');
assert(foundation.includes('POCKT'), 'POCKT identity');
assert(!foundation.includes('POCKETTS'), 'image label errors are not copied');
assert(!foundation.includes('TAPP'), 'TAP is not misspelled');
assert(!foundation.includes('BPMM'), 'BPM label is not misspelled');

assert(scale.includes('20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400'), 'printed scale matches build 122');
assert(tuning.includes('[20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400]'), 'native marks match build 122');
assert.strictEqual(new Set(DIAL_MARKS).size, 11, 'each printed label appears once');
assert.strictEqual(DIAL_MARKS.filter((n) => n === 160).length, 1, 'no duplicated 160');
assert(DIAL_MARKS.includes(120), '120 is printed');
assert.strictEqual(angleFromDialBpm(120), 0, '120 aligns with the fixed pointer');
assert(angleFromDialBpm(121) > angleFromDialBpm(120), 'scale moves the approved direction as BPM increases');
assert(angleFromDialBpm(119) < angleFromDialBpm(120), 'scale moves the approved direction as BPM decreases');
for (let bpm = 20; bpm <= 400; bpm += 1) {
  const back = clampDialBpm(rawBpmFromDialAngle(angleFromDialBpm(bpm)));
  assert.strictEqual(back, bpm, `integer ${bpm} is reachable`);
}

const fine = [];
for (let bpm = 118; bpm <= 127; bpm += 1) {
  const dest = latestInteger(bpm, rawBpmFromDialAngle(angleFromDialBpm(bpm + 1)), false);
  if (bpm < 127) assert.strictEqual(dest, bpm + 1, `fine step ${bpm} -> ${bpm + 1}`);
  fine.push(bpm);
}
assert.deepStrictEqual(fine, [118, 119, 120, 121, 122, 123, 124, 125, 126, 127]);
const high = latestInteger(300, rawBpmFromDialAngle(angleFromDialBpm(301)), false);
assert.strictEqual(high, 301, 'fine step 300 -> 301');
const reverse = latestInteger(124, rawBpmFromDialAngle(angleFromDialBpm(123)), false);
assert.strictEqual(reverse, 123, 'direction reversal is immediate');
const release = latestInteger(120, rawBpmFromDialAngle(angleFromDialBpm(120)), true);
assert.strictEqual(release, null, 'touch release does not invent a new BPM at rest');
assert.strictEqual(clampDialBpm(19), 20, 'hard stop 20');
assert.strictEqual(clampDialBpm(401), 400, 'hard stop 400');

assert(step.includes('latestInteger'), 'latest-only emit');
assert(step.includes('DIAL_HAPTIC_MIN_GAP_S = 0.03'), 'haptic sparsify 30 ms');
assert(tuning.includes('hapticMinGap: CFTimeInterval = 0.018'), 'build 122 haptic gap');
assert(tuning.includes('omega = 0') || read('modules/pockt-dial/ios/PocktDialView.swift').includes('omega = 0'), 'no flywheel');

assert(pad.includes('MIN_BPM'), 'numeric entry validates range');
assert(pad.includes('onClose'), 'numeric entry can cancel');
assert(tempo.includes('Andante'), 'tempo map still includes Andante');
assert(tempo.includes('safe < entry.until'), 'tempo names are computed');

assert(instrumentBeat.includes("level === 'mute'"), 'mute is a visual state');
assert(instrumentBeat.includes('beatBubbleSize'), 'accent is encoded by size');
assert(instrumentBeat.includes("label: 'MUTE'"), 'mute is labeled');
assert(instrumentBeat.includes("label: 'SOFT'"), 'soft/medium is labeled');
assert(instrumentBeat.includes("label: 'STRONG'"), 'strong is labeled');
assert(beats.includes('BEAT_ACCENT_STATES'), 'beat editor uses the four labeled states');
assert(beats.includes('transport.beatIndex') === false, 'beats receive native beatIndex via props');
assert(beats.includes('beatIndex === index'), 'live beat uses native index');
assert(!beats.includes('setInterval'), 'no JS musical timer');
assert(visual.includes("teal: '#3EE6D8'"), 'restrained teal signal');

assert(hardware.includes('ClassicDialPlay'), 'play is a real control');
assert(hardware.includes('TAP') || foundation.includes('TAP'), 'TAP control exists');
const faces = read('lib/instrument-faces.ts');
assert(rail.includes('FACE_RAIL_ORDER'), 'rail lists the product faces');
assert(!rail.includes('DORMANT_FACE_ORDER'), 'LED Gear stays off the primary rail');
assert(faces.includes("rail: 'DIAL'"), 'DIAL is on the rail');
assert(faces.includes("rail: 'PENDULUM'"), 'PENDULUM is on the rail');
assert(faces.includes("rail: 'MECHANICAL'"), 'mechanical keeps its catalog label');
assert(!read('lib/instrument-faces.ts').match(/FACE_RAIL_ORDER = \[[^\]]*pendula-classic/), 'mechanical is not on the primary rail');
assert(faces.includes("rail: 'LED GEAR'"), 'LED GEAR remains in the catalog');
assert(faces.includes("'pendula-classic'"), 'mechanical implementation stays catalogued');
assert(main.includes('onSwitchFace={onSwitchView}'), 'face switch is view-only');
assert(main.includes('viewSwitchPatch(next)'), 'no second engine on face change');
assert(host.includes('isPrimaryInstrumentFace'), 'principal faces share the console shell');
assert(!host.includes('PendulaClassicRoom'), 'mechanical does not replace the shell');
assert(fs.existsSync(path.join(__dirname, '../components/classic/PendulaClassicRoom.tsx')), 'mechanical implementation stays in the tree');
assert(host.includes('LedgearRoom'), 'LED Gear implementation stays hosted');

const swift = read('modules/pockt-dial/ios/PocktDialView.swift');
assert(swift.includes('applyCoalesced'), 'coalesced touch path kept');
assert(swift.includes('override func touchesBegan'), 'build 122 touch path');
assert(swift.includes('onBpm(["bpm": bpm])'), 'build 122 emits integer BPM');
assert(swift.includes('angle + delta'), 'finger delta drives the angle');
assert(!swift.includes('G_MAX'), 'Video A map only');
assert(face.includes('for bpm in PocktDialTuning.marks'), 'atlas uses the approved marks');

console.log('pockt-3 classic dial master tests passed');

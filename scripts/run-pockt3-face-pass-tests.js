'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const main = read('components/pockt/MainScreen.tsx');
const faces = read('lib/instrument-faces.ts');
const rail = read('components/classic/ClassicDialFaceRail.tsx');
const host = read('components/classic/ClassicInstrumentHost.tsx');
const foundation = read('components/classic/FoundationDialRoom.tsx');
const beats = read('components/classic/ClassicDialBeats.tsx');
const hardware = read('components/classic/ClassicDialHardware.tsx');
const faceDir = path.join(__dirname, '../components/classic/faces');
const faceSources = fs
  .readdirSync(faceDir)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => fs.readFileSync(path.join(faceDir, name), 'utf8'))
  .join('\n');
const instrument = read('components/classic/ConsoleInstrument.tsx') + '\n' + faceSources;
const interior = read('lib/dial-interior.ts');
const feedback = read('lib/rotary-feedback.ts');
const scale = read('lib/pockt-dial-scale.ts');
const layout = read('lib/compute-foundation-layout.ts');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');

assert(main.includes("const foundationView: RoomId = 'dial'"), 'launch opens Console');
assert(main.includes("setLaunchGate('resume')"), 'startup resumes the instrument');
assert(!main.includes('showFirstUseSelector'), 'room library is off the launch path');
assert(main.includes('viewSwitchPatch(next)'), 'faces share the view-only tempo patch');
const switchFn = main.split('const switchInstrumentView')[1]?.split('return (')[0] ?? '';
assert(!switchFn.includes('stop()'), 'face change does not stop playback');
assert(!switchFn.includes('toggle()'), 'face change does not restart playback');
assert(switchFn.includes('faceSwitchDetent'), 'face change uses the existing detent click');
assert(feedback.includes('face: 240'), 'rapid face switches do not stack clicks');
assert(feedback.includes("if (kind === 'face') return 'roller'"), 'switch click reuses a UI detent');

assert(
  faces.includes("['dial', 'pulse', 'smart-pendulum', 'pro', 'beatline']"),
  'dial and the room faces share the instrument'
);
assert(faces.includes("DORMANT_FACE_ORDER = ['pendula-classic', 'ledgear']"), 'mechanical and LED Gear stay off the primary rail');
assert(rail.includes('FACE_RAIL_ORDER'), 'navigation renders the product faces');
assert(!rail.includes('DORMANT_FACE_ORDER'), 'LED Gear is not on the bar');
assert(rail.includes('adjustsFontSizeToFit'), 'six labels scale instead of truncating');
assert(rail.includes('minimumFontScale={0.55}'), 'long labels can fit the tab');
assert(host.includes('isPrimaryInstrumentFace(room)'), 'six faces share one shell');
assert(!host.includes('PendulaClassicRoom'), 'mechanical is an interior, not a second room');
assert(fs.existsSync(path.join(__dirname, '../components/classic/PendulaClassicRoom.tsx')), 'mechanical room file is preserved');
assert(host.includes('LedgearRoom'), 'LED Gear room remains');
assert(main.includes('isPrimaryInstrumentFace(roomId)'), 'face changes keep the full-bleed shell');
assert(main.includes('instrumentShell ? null'), 'the shared shell hides the old bezel');

assert(foundation.includes('PocktDialView'), 'native dial remains the Console instrument');
assert(foundation.includes('testID="console-face-viewport"'), 'faces render in the interior viewport');
assert(foundation.includes('box(layout.dial)'), 'alternate faces cover the full dial');
assert(!foundation.includes('DIAL_INTERIOR_FRACTION'), 'alternate faces are not confined to the hub');
assert(interior.includes('DIAL_POINTER_SOLID_START'), 'viewport stops at the fixed pointer');
assert(!interior.includes('DIAL_INTERIOR_FRACTION = DIAL_HUB_DEADZONE_FRACTION * 2'), 'viewport is not the touch dead zone');
assert(foundation.includes('interiorCaptures'), 'only pro and beatline claim interior touches');
assert(foundation.includes("pointerEvents={interiorCaptures ? 'box-none' : 'none'}"), 'other faces pass touches to the dial');
const dialAt = foundation.indexOf('<PocktDialView');
const faceAt = foundation.indexOf('<ConsoleInstrumentFace');
assert(dialAt > 0 && faceAt > dialAt, 'the interior is layered on the mounted dial');
assert(foundation.includes('onBpm='), 'dial still writes BPM while dragging');
assert(foundation.includes('onCenterTap={toggle}'), 'center press remains');
assert(foundation.includes('stepDialBpm'), '+/− stay on the dial tempo path');
assert(scale.includes('return clampDialBpm(clampDialBpm(current) + delta)'), '+/− moves by the requested integer');
assert(hardware.includes('stepDisc'), '+/− are circular controls');
assert(hardware.includes('borderRadius: 20'), 'step disc is round');
assert(swift.includes('override func touchesBegan'), 'build 122 dial owns touchesBegan');
assert(!swift.includes('setInterval'), 'native dial has no JS timer');

assert(!layout.includes('meterPeek'), 'beats rail is not sharing space with a second meter');
assert(!beats.includes('beat-strength-sheet'), 'beat strength does not open a word sheet');
assert(!beats.includes('>BEATS<'), 'the beats label is gone');
assert(beats.includes('cycleAccent('), 'a tap cycles mute, soft, normal, strong');
assert(beats.includes('beatControlMetrics'), 'controls size themselves to the meter');
assert(beats.includes('minHeight: 44'), 'beat targets stay tappable');
assert(beats.includes('BEAT_ACCENT_STATES'), 'selector uses the existing four strengths');
assert(!beats.includes('setInterval'), 'beats have no musical timer');
assert(foundation.includes('BPM_CHROME_HOLD_MS'), 'plus minus hide after a short hold');
assert(foundation.includes('revealBpmChrome'), 'tempo interaction reveals plus minus');
assert(!swift.includes('bpmHysteresis') || read('modules/pockt-dial/ios/PocktDialTuning.swift').includes('bpmHysteresis: Double = 0.85'), 'hysteresis unchanged');

assert(instrument.includes('testID="console-face-pro"'), 'pro face is live');
assert(instrument.includes('onChangeAccents'), 'pro faders write the shared pattern');
assert(instrument.includes('beatsPerMeasure'), 'pro and beatline follow the meter');
assert(instrument.includes('ProBeatCells'), 'pro mounts the historical beat cells');
assert(!instrument.includes('length: 9'), 'beatline is not hardcoded to the artwork');
assert(read('components/classic/BeatlineRoom.tsx').includes('BeatCapsuleStrip'), 'beatline bars edit the shared pattern');
assert(read('components/classic/BeatlineRoom.tsx').includes('onChange={onChangeAccents}'), 'beatline capsules write the shared pattern');
assert(read('components/beatline/BeatlineRail.tsx').includes('beatlineBeadIsCurrent'), 'beatline beads follow the native beat');
assert(instrument.includes('testID="console-face-pulse"'), 'pulse face is live');
assert(instrument.includes('PULSE_RING_WAVE_1'), 'pulse uses the historical wave asset');
assert(instrument.includes('usePendulumPhase'), 'pendulum samples the existing native phase');
assert(instrument.includes('testID="console-face-mechanical"'), 'mechanical interior is live');
assert(instrument.includes('mechanicalWeightT'), 'mechanical weight follows the shared BPM');
assert(instrument.includes("face === 'pendula-classic'"), 'mechanical is an interior mode');
for (const name of fs.readdirSync(faceDir).filter((file) => file.endsWith('.tsx'))) {
  const src = fs.readFileSync(path.join(faceDir, name), 'utf8');
  assert(!src.includes('stop('), `${name} does not stop playback`);
  if (name === 'MechanicalInstrumentFace.tsx') {
    assert(src.includes('setBpm'), 'mechanical weight uses the shared tempo setter');
    assert(src.includes('mechanicalBpmFromWeightT'), 'mechanical weight uses the existing scale');
  } else {
    assert(!src.includes('setBpm'), `${name} does not own tempo`);
  }
}
assert(!instrument.includes('setInterval'), 'faces have no independent musical timer');
assert(instrument.includes('pointerEvents="none"'), 'non-interactive interiors pass touches to the dial');
assert(instrument.includes('pointerEvents="box-none"'), 'pro faders do not claim the whole dial');
assert(!foundation.includes('setInterval'), 'console shell has no musical timer');

console.log('pockt-3 face pass tests passed');

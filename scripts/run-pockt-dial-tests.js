'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const DIAL_MIN_BPM = 20;
const DIAL_MAX_BPM = 400;
const DIAL_HOME_BPM = 120;
const DIAL_MIN_ANGLE = (-130 * Math.PI) / 180;
const DIAL_MAX_ANGLE = (140 * Math.PI) / 180;
const DIAL_HOME_ANGLE = 0;
const DIAL_MARKS = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];

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

function bpmFromDialAngle(angle) {
  const clamped = Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, angle));
  if (clamped <= DIAL_HOME_ANGLE) {
    const span = DIAL_HOME_ANGLE - DIAL_MIN_ANGLE;
    const t = span <= 0 ? 0 : (clamped - DIAL_MIN_ANGLE) / span;
    return clampDialBpm(DIAL_MIN_BPM + t * (DIAL_HOME_BPM - DIAL_MIN_BPM));
  }
  const span = DIAL_MAX_ANGLE - DIAL_HOME_ANGLE;
  const t = span <= 0 ? 0 : (clamped - DIAL_HOME_ANGLE) / span;
  return clampDialBpm(DIAL_HOME_BPM + t * (DIAL_MAX_BPM - DIAL_HOME_BPM));
}

assert(exists('modules/pockt-dial/ios/PocktDialView.swift'), 'native Swift view');
assert(exists('modules/pockt-dial/ios/PocktDialModule.swift'), 'native Swift module');
assert(exists('modules/pockt-dial/ios/PocktDialTuning.swift'), 'tuning constants');
assert(exists('modules/pockt-dial/ios/PocktDialFace.swift'), 'face atlas painter');
assert(exists('modules/pockt-dial/ios/PocktDialShader.metal'), 'Metal shader source');
assert(exists('modules/pockt-dial/ios/PocktDial.podspec'), 'podspec');
assert(exists('modules/pockt-dial/expo-module.config.json'), 'expo-module.config.json');
assert(exists('modules/pockt-dial/src/PocktDialView.tsx'), 'JS native view wrapper');
assert(exists('modules/pockt-dial/src/PocktDialView.web.tsx'), 'web fallback');
assert(exists('modules/pockt-dial/android/src/main/java/expo/modules/pocktdial/PocktDialView.kt'), 'android stub');
assert(exists('lib/pockt-dial-scale.ts'), 'shared JS scale');

const scale = read('lib/pockt-dial-scale.ts');
const swift = read('modules/pockt-dial/ios/PocktDialView.swift');
const metal = read('modules/pockt-dial/ios/PocktDialShader.metal');
const tuning = read('modules/pockt-dial/ios/PocktDialTuning.swift');
const face = read('modules/pockt-dial/ios/PocktDialFace.swift');
const moduleSwift = read('modules/pockt-dial/ios/PocktDialModule.swift');
const podspec = read('modules/pockt-dial/ios/PocktDial.podspec');
const dialRoom = read('components/classic/DialRoom.tsx');
const pkg = JSON.parse(read('package.json'));
const expoMod = JSON.parse(read('modules/pockt-dial/expo-module.config.json'));
const wrapper = read('modules/pockt-dial/src/PocktDialView.tsx');
const web = read('modules/pockt-dial/src/PocktDialView.web.tsx');
const androidView = read('modules/pockt-dial/android/src/main/java/expo/modules/pocktdial/PocktDialView.kt');
const androidMod = read('modules/pockt-dial/android/src/main/java/expo/modules/pocktdial/PocktDialModule.kt');

assert.equal(clampDialBpm(120), 120, 'home bpm');
assert.equal(clampDialBpm(19), 20, 'floor 20');
assert.equal(clampDialBpm(401), 400, 'ceiling 400');
assert.equal(clampDialBpm(Number.NaN), 120, 'non-finite home');
assert.equal(angleFromDialBpm(120), DIAL_HOME_ANGLE, '120 sits at 12 o clock');
assert.equal(angleFromDialBpm(20), DIAL_MIN_ANGLE, '20 at -130 deg');
assert.equal(angleFromDialBpm(400), DIAL_MAX_ANGLE, '400 at +140 deg');
assert.equal(bpmFromDialAngle(DIAL_HOME_ANGLE), DIAL_HOME_BPM, 'angle 0 is 120');
assert.equal(bpmFromDialAngle(DIAL_MIN_ANGLE), DIAL_MIN_BPM, 'min angle is 20');
assert.equal(bpmFromDialAngle(DIAL_MAX_ANGLE), DIAL_MAX_BPM, 'max angle is 400');
for (const mark of DIAL_MARKS) {
  assert.equal(bpmFromDialAngle(angleFromDialBpm(mark)), mark, `round-trip mark ${mark}`);
}
assert.equal(bpmFromDialAngle(angleFromDialBpm(80)), 80, 'round-trip 80');
assert.equal(bpmFromDialAngle(angleFromDialBpm(200)), 200, 'round-trip 200');

assert(scale.includes('120 sits at 12 o'), 'JS documents home pose');
assert(scale.includes('export const DIAL_MIN_BPM = 20'), 'JS min 20');
assert(scale.includes('export const DIAL_MAX_BPM = 400'), 'JS max 400');
assert(scale.includes('export const DIAL_HOME_BPM = 120'), 'JS home 120');
assert(scale.includes('(-130 * Math.PI) / 180'), 'JS min angle');
assert(scale.includes('(140 * Math.PI) / 180'), 'JS max angle');
assert(tuning.includes('static let homeBpm: Double = 120'), 'native home 120');
assert(tuning.includes('static let minAngle: CGFloat = -130'), 'native -130 deg');
assert(tuning.includes('static let maxAngle: CGFloat = 140'), 'native +140 deg');
assert(tuning.includes('20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400'), 'native marks match reference');
assert(face.includes('120 at 12 o'), 'atlas rest pose');
assert(face.includes('POCKT'), 'wordmark');
assert(face.includes('METRONOME'), 'subtitle');
assert(face.includes('-> CGImage?'), 'atlas can fail without crashing');
assert(face.includes('monospacedDigitSystemFont'), 'tabular BPM labels');

assert(swift.includes('CAMetalLayer'), 'CAMetalLayer host, not MTKView');
assert(!swift.includes('import MetalKit'), 'MetalKit renderer not used');
assert(!swift.includes('MTKView'), 'MTKView not used');
assert(!swift.includes('fatalError('), 'no fatalError during mount');
assert(!swift.includes('preconditionFailure('), 'no preconditionFailure');
assert(swift.includes('metalReady = false'), 'inert until Metal is ready');
assert(swift.includes('NSLog("[POCKT][Dial]'), 'mount failures log');
assert(swift.includes('.bgra8Unorm_srgb'), 'Swift pixel format casing');
assert(!swift.includes('bgra8Unorm_sRGB'), 'wrong sRGB camel-case that killed build 115');
assert(swift.includes('.rgba8Unorm_srgb'), 'atlas texture sRGB casing');
assert(!swift.includes('rgba8Unorm_sRGB'), 'wrong atlas sRGB camel-case');
assert(swift.includes('makeDefaultLibrary(bundle: shaderBundle)'), 'loads compiled default metallib from resource bundle');
assert(!swift.includes('makeDefaultLibrary(bundle: Bundle(for:'), 'never Bundle(for:) as the metallib root');
assert(swift.includes('forResource: "PocktDial", withExtension: "bundle"'), 'looks up PocktDial.bundle');
assert(swift.includes('Bundle.main'), 'also searches main bundle');
assert(!swift.includes('makeLibrary(source:'), 'no runtime shader string compile');
assert(swift.includes('pockt_dial_vertex'), 'vertex entry');
assert(swift.includes('pockt_dial_fragment'), 'fragment entry');
assert(swift.includes('loadBakedMaps'), 'loads baked IBL maps once');
assert(swift.includes('forResource: name, withExtension: ext'), 'PNG lookup in PocktDial.bundle');
assert(swift.includes('subdirectory: "Resources"'), 'also searches Resources/ inside the bundle');
assert(swift.includes('.rgba8Unorm'), 'linear maps use rgba8Unorm (not sRGB)');
assert(swift.includes('generateMipmaps'), 'env mips generated once at setup');
assert(swift.includes('baked IBL maps missing'), 'missing maps log + inert');
assert(swift.includes('CHHapticEngine'), 'Core Haptics engine');
assert(swift.includes('CMMotionManager'), 'CoreMotion lighting');
assert(swift.includes('CADisplayLink'), 'native display link');
assert(swift.includes('preferredFrameRateRange'), 'up to 120Hz');
assert(swift.includes('coalescedTouches'), 'coalesced native touches');
assert(swift.includes('isPaused'), 'idle renderer pause');
assert(swift.includes('didEnterBackgroundNotification'), 'background pause');
assert(swift.includes('willEnterForegroundNotification'), 'foreground wake');
assert(swift.includes('deinit'), 'engine cleanup');
assert(!swift.includes('PocktTiming'), 'does not touch timing engine');
assert(!swift.includes('AVAudioEngine'), 'does not duplicate audio engine');
assert(swift.includes('onBpm'), 'emits integer BPM');
assert(swift.includes('onCenterTap'), 'hub tap event');
assert(swift.includes('private let passDescriptor = MTLRenderPassDescriptor()'), 'render pass reused');
assert(!swift.includes('let pass = MTLRenderPassDescriptor()'), 'no per-frame pass descriptor');
assert(swift.includes('omega = 0'), 'release has no flick inertia');
assert(swift.includes('hapticsEnabled'), 'native haptics can follow sensory mode');
assert(swift.includes('func applyHaptics'), 'haptic prop');
assert(!swift.includes('points = coalesced.map'), 'coalesced path does not allocate a mapped array');

assert(metal.includes('pockt_dial_fragment'), 'fragment entry');
assert(metal.includes('D_GGX_aniso'), 'anisotropic GGX');
assert(metal.includes('sdCircle'), 'analytic well/dial');
assert(metal.includes('knobAlbedo'), 'baked knob albedo');
assert(metal.includes('knobNormal'), 'baked object-space normal');
assert(metal.includes('knobAo'), 'baked AO');
assert(metal.includes('knobRough'), 'baked roughness / spun grain');
assert(metal.includes('knobAniso'), 'radial aniso map');
assert(metal.includes('staticBeauty'), 'static AgX layer');
assert(metal.includes('staticNormal'), 'static knurl/bezel normal');
assert(metal.includes('envMap'), 'RGBM environment');
assert(metal.includes('decodeRGBM'), 'RGBM decode');
assert(metal.includes('BAKE_EXTENT'), 'bake UV contract');
assert(metal.includes('rotate2'), 'UV/normal rotate vs world-fixed light');
assert(metal.includes('faceMap'), 'face atlas sample');
assert(!metal.includes('sin(restR * 210'), 'no concentric hub ripples');
assert(!metal.includes('43758.5453'), 'no hash-grain placeholder');
assert(metal.includes('mix(0.62, 0.78, u.playing)'), 'amber pointer restrained');
assert(metal.includes('rim * gold * 0.04'), 'amber rim restrained');
assert(metal.includes('writeLinear'), 'linear writes for sRGB drawable');
assert(metal.includes('return float4(writeLinear(col), 1.0)'), 'build 122 shader return');

assert(swift.includes('metalLayer.isOpaque = true'), 'build 122 metal layer');
assert(swift.includes('UIColor(red: 0.02, green: 0.018, blue: 0.016, alpha: 1)'), 'build 122 view fill');
assert(swift.includes('MTLClearColor(red: 0.02, green: 0.018, blue: 0.016, alpha: 1)'), 'build 122 clear color');

assert(moduleSwift.includes('Name("PocktDial")'), 'Expo module name');
assert(moduleSwift.includes('View(PocktDialView.self)'), 'registers Swift view');
assert(moduleSwift.includes('"onBpm"') && moduleSwift.includes('"onCenterTap"'), 'BPM and hub events');
assert(!moduleSwift.includes('"onGesture"'), 'build 122 events are onBpm and onCenterTap');
assert(moduleSwift.includes('Prop("bpm")'), 'bpm prop');
assert(moduleSwift.includes('Prop("playing")'), 'playing prop');
assert(moduleSwift.includes('Prop("invert")'), 'invert prop');
assert(moduleSwift.includes('Prop("haptic")'), 'haptic prop');

assert(podspec.includes('s.static_framework = true'), 'static_framework pod');
assert(podspec.includes('CoreMotion'), 'links CoreMotion');
assert(podspec.includes('CoreHaptics'), 'links CoreHaptics');
assert(podspec.includes('Metal'), 'links Metal');
assert(!podspec.includes('MetalKit'), 'MetalKit not required');
assert(podspec.includes("s.dependency 'ExpoModulesCore'"), 'ExpoModulesCore dependency');
assert(podspec.includes("s.source_files = '**/*.{h,m,mm,swift}'"), 'Swift only in source_files');
assert(!podspec.includes('swift,metal'), 'metal is not compiled via source_files');
assert(podspec.includes('resource_bundles'), 'metallib + maps via resource_bundles');
assert(podspec.includes("'PocktDial'"), 'bundle name PocktDial');
assert(podspec.includes('**/*.metal'), 'podspec glob **/*.metal');
assert(podspec.includes('**/*.png'), 'podspec glob **/*.png — build-116 class if missing');
assert(!/\bs\.resources\s*=/.test(podspec), 'no s.resources copy that skips metallib compile');
assert(podspec.includes('NEVER load shaders via makeDefaultLibrary(bundle: Bundle(for:))'), 'packaging comment');
assert(exists('modules/pockt-dial/ios/Resources/knob_albedo.png'), 'shipped knob albedo');
assert(exists('modules/pockt-dial/ios/Resources/knob_normal.png'), 'shipped knob normal');
assert(exists('modules/pockt-dial/ios/Resources/knob_ao.png'), 'shipped knob AO');
assert(exists('modules/pockt-dial/ios/Resources/knob_rough.png'), 'shipped knob roughness');
assert(exists('modules/pockt-dial/ios/Resources/knob_aniso.png'), 'shipped knob aniso');
assert(exists('modules/pockt-dial/ios/Resources/static_beauty.png'), 'shipped static beauty');
assert(exists('modules/pockt-dial/ios/Resources/static_normal.png'), 'shipped static normal');
assert(exists('modules/pockt-dial/ios/Resources/env_rgbm.png'), 'shipped RGBM env');

assert.deepStrictEqual(expoMod.platforms.sort(), ['android', 'apple', 'web'].sort(), 'module platforms');
assert(expoMod.apple.modules.includes('PocktDialModule'), 'apple autolink module');
assert(expoMod.android.modules.includes('expo.modules.pocktdial.PocktDialModule'), 'android autolink module');

assert.equal(pkg.dependencies['pockt-dial'], 'file:./modules/pockt-dial', 'file: dependency');
assert.equal(pkg.expo.autolinking.nativeModulesDir, './modules', 'nativeModulesDir autolinking');
assert(pkg.scripts.test.includes('run-pockt-dial-tests.js'), 'dial tests in npm test');

assert(wrapper.includes("requireNativeViewManager<PocktDialViewProps>('PocktDial')"), 'native view manager name matches module');
assert(web.includes('pockt-dial-web-fallback'), 'web fallback test id');
assert(androidView.includes('ExpoView'), 'android stub is ExpoView');
assert(!androidView.includes('GLSurfaceView'), 'android does not ship a fake GL renderer');
assert(androidMod.includes('Name("PocktDial")'), 'android module name matches');

assert(dialRoom.includes("Platform.OS === 'ios'"), 'iOS hosts native Metal face');
assert(dialRoom.includes('PocktDialView'), 'native view wired');
assert(dialRoom.includes('from \'pockt-dial\''), 'imports pockt-dial');
assert(dialRoom.includes('ringSector'), 'Skia DialWheel remains for Android/web');
assert(dialRoom.includes('const rInner = size * 0.348'), 'recovery inner radius');
assert(dialRoom.includes('const rOuter = size * 0.498'), 'recovery outer radius');
assert(dialRoom.includes("rotaryDetent('dial'"), 'JS rotary detent remains');
assert(dialRoom.includes("rotaryDetent('dial', sensoryFlags(config.sensoryMode).audio, false)"), 'iOS JS detent is sound-only');
assert(dialRoom.includes('effectiveHaptic(config)'), 'native haptics follow sensory flags');
assert(dialRoom.includes('function DialWheel'), 'Skia wheel kept in source');
assert(!dialRoom.includes('PocktTiming'), 'Dial room does not talk to timing engine');
assert(!dialRoom.includes('requestAnimationFrame'), 'no JS rAF clock on Dial');

const glassView = read('modules/pockt-glass-proof/ios/PocktGlassProofView.swift');
const glassRoute = read('app/glass-proof.tsx');
assert(glassView.includes('PocktGlassProofView'), 'glass-proof view untouched by this pass');
assert(glassRoute.includes('testID="glass-proof-page"'), 'glass-proof route untouched by this pass');

function dialScaleRotation(pointerAngle) {
  return -pointerAngle;
}
function wrapDelta(delta) {
  let next = delta;
  while (next > Math.PI) next -= 2 * Math.PI;
  while (next < -Math.PI) next += 2 * Math.PI;
  return next;
}
function clampAngle(value) {
  return Math.min(DIAL_MAX_ANGLE, Math.max(DIAL_MIN_ANGLE, value));
}
const BPM_HYSTERESIS = 0.85;
function liveBpm(angle, committed) {
  const raw = bpmFromDialAngle(angle);
  if (raw >= committed + BPM_HYSTERESIS) return clampDialBpm(Math.round(raw));
  if (raw <= committed - BPM_HYSTERESIS) return clampDialBpm(Math.round(raw));
  return committed;
}

assert.equal(dialScaleRotation(0), 0, '120 keeps the scale at rest');
assert.equal(0.4 + dialScaleRotation(0.4), 0, 'active mark lands under the fixed pointer');
assert.ok(dialScaleRotation(angleFromDialBpm(200)) < 0, 'higher BPM turns the scale counterclockwise');
assert.ok(dialScaleRotation(angleFromDialBpm(60)) > 0, 'lower BPM turns the scale clockwise');
const facade = read('components/classic/DialFacade.tsx');
const plate = read('components/classic/dial-skia.tsx');
assert(facade.includes('dialScaleRotation(angle.value)'), 'numerals rotate with the scale');
assert(plate.includes('dialScaleRotation(angle.value)'), 'dial plate rotates with the scale');
assert(plate.includes('<Group origin={origin} transform={turn}>'), 'scale plate rotates as one assembly');
const pointerGroup = plate.split('<Group origin={origin}>')[1] || '';
assert(pointerGroup.length > 0 && !pointerGroup.includes('transform={turn}'), 'pointer stays at 12 o\'clock');
assert(swift.includes('angle + delta'), 'finger delta drives the dial angle directly');
assert(swift.includes('PocktDialTuning.minAngle'), '20 is a hard angle stop');
assert(swift.includes('PocktDialTuning.maxAngle'), '400 is a hard angle stop');
assert(swift.includes('beganInHub'), 'center press is separate from a rotary grab');
assert(swift.includes('omega = 0'), 'release kills inertia');
assert(swift.includes('springK * dist'), 'build 122 release spring is in the source');

let angle = angleFromDialBpm(119);
const grabbed = angle;
angle = clampAngle(angle + 0);
assert.equal(angle, grabbed, 'touch-down does not jump');
const clockwise = wrapDelta(-0.04);
const counter = wrapDelta(0.04);
const cw = clampAngle(grabbed + clockwise);
const ccw = clampAngle(grabbed + counter);
assert.ok(dialScaleRotation(cw) > dialScaleRotation(grabbed), 'clockwise finger rotates the scale clockwise');
assert.ok(dialScaleRotation(ccw) < dialScaleRotation(grabbed), 'counterclockwise finger rotates the scale the other way');
const toward120 = angleFromDialBpm(119) + 0.25 * (angleFromDialBpm(120) - angleFromDialBpm(119));
assert.notEqual(dialScaleRotation(toward120), dialScaleRotation(angleFromDialBpm(119)), 'fractional travel moves the scale');
assert.equal(liveBpm(toward120, 119), 119, 'fractional travel does not cross the integer');
const crossed = angleFromDialBpm(119) + 0.95 * (angleFromDialBpm(120) - angleFromDialBpm(119));
assert.equal(liveBpm(crossed, 119), 120, 'one threshold crossing changes BPM once');
assert.equal(liveBpm(crossed, 120), 120, 'holding past the crossing does not emit again');
let atMin = DIAL_MIN_ANGLE;
atMin = clampAngle(atMin - 0.2);
assert.equal(atMin, DIAL_MIN_ANGLE, '20 absorbs further travel');
atMin = clampAngle(atMin + 0.05);
assert.ok(atMin > DIAL_MIN_ANGLE, 'reverse leaves 20 immediately');
let atMax = DIAL_MAX_ANGLE;
atMax = clampAngle(atMax + 0.2);
assert.equal(atMax, DIAL_MAX_ANGLE, '400 absorbs further travel');
atMax = clampAngle(atMax - 0.05);
assert.ok(atMax < DIAL_MAX_ANGLE, 'reverse leaves 400 immediately');
const released = angleFromDialBpm(liveBpm(cw, 119));
assert.equal(liveBpm(released, liveBpm(cw, 119)), liveBpm(cw, 119), 'release does not keep changing BPM');
const regrasped = released;
assert.equal(clampAngle(regrasped + 0), regrasped, 're-grab does not jump');
assert(swift.includes('if beganInHub'), 'a hub press does not start as a drag');
assert(swift.includes('onCenterTap'), 'center press stays on the hub path');

const foundation = read('components/classic/FoundationDialRoom.tsx');
assert(!foundation.includes('caption={current.label}'), 'sound name is not under the SOUND label');
assert(foundation.includes('label="Sound"'), 'Sound stays in the universal header');
assert(foundation.includes("label={tunerOpen ? 'Close tuner' : 'Tuner'}"), 'Tuner stays in the universal header');
const beats = read('components/classic/ClassicDialBeats.tsx');
assert(beats.includes('strength === 2 ? 0.78'), 'normal accent is visibly above soft');
assert(beats.includes('strength === 1 ? 0.5'), 'soft accent is visibly above off');
assert(foundation.includes('ellipsizeMode="clip"') || read('components/classic/ClassicDialHardware.tsx').includes('ellipsizeMode="clip"'), 'hardware labels do not ellipsize');
assert(!foundation.includes('FIND YOUR POCKET'), 'instrument header has no tagline');
assert(foundation.includes('tempoName(safeBpm)'), 'tempo name stays available to the BPM control');
assert(foundation.includes('<ChassisFill'), 'every face uses the shared chassis');
assert(beats.includes('beatFlash'), 'playback is a flash of the beat control');
assert(!beats.includes('setInterval'), 'beat rail has no JS musical timer');
assert(!beats.includes('testID="beat-row-shutter"'), 'the beat shutter is gone');
assert(beats.includes('testID="beat-row-deck"'), 'phrase entry is its own control');
assert(beats.includes('beatIndex === index'), 'playback follows the native beat index');
assert(beats.includes('hitSlop={count >= 8 ? 2 : 4}'), 'beat cells do not overlap');
assert(scale.includes('return -pointerAngle'), 'scale turns opposite the stored pointer angle');
assert(scale.includes('DIAL_POINTER_ANGLE = 0'), 'pointer index is 12 o clock');

console.log('pockt-dial Metal face contract checks passed');

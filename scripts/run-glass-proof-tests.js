const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

assert(exists('app/glass-proof.tsx'), 'isolated /glass-proof route');
assert(exists('modules/pockt-glass-proof/ios/PocktGlassProofView.swift'), 'native Swift view');
assert(exists('modules/pockt-glass-proof/ios/PocktGlassProofModule.swift'), 'native Swift module');
assert(exists('modules/pockt-glass-proof/ios/DialTuning.swift'), 'tuning constants');
assert(exists('modules/pockt-glass-proof/ios/DialShader.metal'), 'Metal shader source');
assert(!exists('modules/pockt-glass-proof/ios/DialShaderSource.swift'), 'duplicate shader string removed');
assert(exists('modules/pockt-glass-proof/ios/PocktGlassProof.podspec'), 'podspec');
assert(exists('modules/pockt-glass-proof/expo-module.config.json'), 'expo-module.config.json');
assert(exists('modules/pockt-glass-proof/src/PocktGlassProofView.tsx'), 'JS native view wrapper');
assert(exists('modules/pockt-glass-proof/src/PocktGlassProofView.web.tsx'), 'web fallback');
assert(exists('modules/pockt-glass-proof/android/src/main/java/expo/modules/pocktglassproof/PocktGlassProofView.kt'), 'android stub');

const route = read('app/glass-proof.tsx');
assert(route.includes('PocktGlassProofView'), 'route hosts native view');
assert(route.includes('testID="glass-proof-page"'), 'route test id');
assert(!route.includes('BeatlineFace') && !route.includes('components/beatline'), 'route does not import Beatline');
assert(!route.includes('requestAnimationFrame'), 'no JS per-frame on the route');
assert(!route.includes('setInterval'), 'no JS interval timer on the route');
assert(!route.includes('useAnimated'), 'no Reanimated on the route');
assert(!route.includes('Gesture.'), 'no RNGH on the route');

const swift = read('modules/pockt-glass-proof/ios/PocktGlassProofView.swift');
assert(swift.includes('CAMetalLayer'), 'CAMetalLayer host, not MTKView');
assert(!swift.includes('import MetalKit'), 'MetalKit renderer removed');
assert(!swift.includes('MTKView'), 'MTKView removed');
assert(!swift.includes('UIImpactFeedbackGenerator'), 'UIKit impact haptics removed');
assert(swift.includes('CHHapticEngine'), 'Core Haptics engine');
assert(swift.includes('CMMotionManager'), 'CoreMotion lighting');
assert(swift.includes('CADisplayLink'), 'native display link');
assert(swift.includes('preferredFrameRateRange'), 'up to 120Hz');
assert(swift.includes('coalescedTouches'), 'coalesced native touches');
assert(swift.includes('touchesBegan'), 'native UIKit touch, not JS');
assert(swift.includes('dial_fragment'), 'Metal fragment shader');
assert(swift.includes('makeDefaultLibrary(bundle:'), 'loads compiled default metallib');
assert(!swift.includes('makeLibrary(source:'), 'no runtime shader string compile');
assert(!swift.includes('DialShaderSource'), 'no DialShaderSource fallback');
assert(swift.includes('D_GGX_aniso') || read('modules/pockt-glass-proof/ios/DialShader.metal').includes('D_GGX_aniso'), 'anisotropic GGX');
assert(swift.includes('isPaused'), 'idle renderer pause');
assert(swift.includes('didEnterBackgroundNotification'), 'background pause');
assert(swift.includes('willEnterForegroundNotification'), 'foreground wake');
assert(swift.includes('deinit'), 'engine cleanup');
assert(!swift.includes('PocktTiming'), 'does not touch timing engine');
assert(!swift.includes('AVAudioEngine'), 'does not duplicate audio engine');
assert(!swift.includes('requestAnimationFrame'), 'no JS clock in native view');

const metal = read('modules/pockt-glass-proof/ios/DialShader.metal');
assert(metal.includes('dial_fragment'), 'fragment entry');
assert(metal.includes('D_GGX_aniso'), 'anisotropic GGX');
assert(metal.includes('sdCircle'), 'analytic well/dial');
assert(metal.includes('contact'), 'contact shadow');
assert(metal.includes('u.press'), 'press depression');
assert(metal.includes('u.parallax'), 'tilt parallax');
assert(metal.includes('knurl') || metal.includes('80.0'), 'knurl teeth');
assert(!metal.includes('43758.5453'), 'no hash-grain placeholder');

const tuning = read('modules/pockt-glass-proof/ios/DialTuning.swift');
assert(tuning.includes('detentCount: Int = 12'), '12 detents');
assert(tuning.includes('parallaxAmplitude'), 'parallax amplitude');
assert(tuning.includes('anisoAlphaT'), 'anisotropy');
assert(tuning.includes('knurlTeeth'), 'knurl tooth count');

const moduleSwift = read('modules/pockt-glass-proof/ios/PocktGlassProofModule.swift');
assert(moduleSwift.includes('Name("PocktGlassProof")'), 'Expo module name');
assert(moduleSwift.includes('View(PocktGlassProofView.self)'), 'registers Swift view');
assert(moduleSwift.includes('Events("onSettle")'), 'settle event once per capture');
assert(moduleSwift.includes('Prop("detentCount")'), 'optional detentCount prop');

const podspec = read('modules/pockt-glass-proof/ios/PocktGlassProof.podspec');
assert(podspec.includes('CoreMotion'), 'links CoreMotion');
assert(podspec.includes('CoreHaptics'), 'links CoreHaptics');
assert(podspec.includes('Metal'), 'links Metal');
assert(!podspec.includes('MetalKit'), 'MetalKit not required');
assert(podspec.includes("s.dependency 'ExpoModulesCore'"), 'ExpoModulesCore dependency');
assert(podspec.includes('swift,metal'), 'compiles .metal via source_files');
assert(!podspec.includes('s.resources'), 'metal is compiled, not a copied resource');

const expoMod = JSON.parse(read('modules/pockt-glass-proof/expo-module.config.json'));
assert.deepStrictEqual(expoMod.platforms.sort(), ['android', 'apple', 'web'].sort(), 'module platforms');
assert(expoMod.apple.modules.includes('PocktGlassProofModule'), 'apple autolink module');
assert(expoMod.android.modules.includes('expo.modules.pocktglassproof.PocktGlassProofModule'), 'android autolink module');

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.dependencies['pockt-glass-proof'], 'file:./modules/pockt-glass-proof', 'file: dependency');
assert.equal(pkg.expo.autolinking.nativeModulesDir, './modules', 'nativeModulesDir autolinking');

const wrapper = read('modules/pockt-glass-proof/src/PocktGlassProofView.tsx');
assert(wrapper.includes("requireNativeViewManager<PocktGlassProofViewProps>('PocktGlassProof')"), 'native view manager name matches module');

const web = read('modules/pockt-glass-proof/src/PocktGlassProofView.web.tsx');
assert(web.includes('glass-proof-web-fallback'), 'web fallback test id');
assert(web.includes('Native iOS Metal prototype'), 'web does not pretend to be Metal');

const androidView = read('modules/pockt-glass-proof/android/src/main/java/expo/modules/pocktglassproof/PocktGlassProofView.kt');
assert(androidView.includes('ExpoView'), 'android stub is ExpoView');
assert(!androidView.includes('GLSurfaceView'), 'android does not ship a fake GL renderer');

const androidMod = read('modules/pockt-glass-proof/android/src/main/java/expo/modules/pocktglassproof/PocktGlassProofModule.kt');
assert(androidMod.includes('Name("PocktGlassProof")'), 'android module name matches');

const selector = read('components/pockt/ViewSelectorSheet.tsx');
assert(selector.includes('testID="glass-proof-entry"'), 'CHOOSE YOUR POCKET glass-proof card');
assert(selector.includes("router.push('/glass-proof')"), 'card opens /glass-proof');
assert(selector.includes('GLASS PROOF'), 'card label');

const timing = read('modules/pockt-timing/ios/PocktTimingEngine.swift');
assert(timing.includes('class PocktTimingEngine') || timing.includes('PocktTimingEngine'), 'timing engine still present');

const beatline = read('components/beatline/BeatlineFace.tsx');
assert(beatline.includes('BeatlineFace'), 'Beatline face untouched in this check');

console.log('glass-proof isolation and native contract checks passed');

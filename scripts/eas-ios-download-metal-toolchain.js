const { spawnSync } = require('child_process');

/**
 * EAS iOS images (Xcode 26+) ship without the Metal compiler component.
 * DialShader.metal is compiled at Xcode time, so the toolchain must be present
 * before "Run fastlane" / xcodebuild.
 */
if (process.env.EAS_BUILD_PLATFORM !== 'ios') {
  process.exit(0);
}

console.log('[POCKT] Downloading Xcode MetalToolchain (missing metal tool on EAS image)');
const result = spawnSync('xcodebuild', ['-downloadComponent', 'MetalToolchain'], {
  stdio: 'inherit',
  encoding: 'utf8',
});
if (result.status !== 0) {
  console.error('[POCKT] xcodebuild -downloadComponent MetalToolchain failed');
  process.exit(result.status == null ? 1 : result.status);
}

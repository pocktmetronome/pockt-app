const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copies native click WAVs into the iOS app target Resources so
 * Bundle.main.url(forResource:withExtension:) can open them in EAS/TestFlight.
 * Heavy / Roots default tones are generated in Swift and are not copied here.
 */
function withPocktTimingClicks(config) {
  return withXcodeProject(config, (cfg) => {
    const iosRoot = cfg.modRequest.platformProjectRoot;
    const srcDir = path.join(__dirname, 'ios', 'Clicks');
    const destDir = path.join(iosRoot, 'PocktTimingClicks');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(destDir, { recursive: true });

    const wavs = fs.existsSync(srcDir)
      ? fs.readdirSync(srcDir).filter((name) => {
          const lower = name.toLowerCase();
          if (!lower.endsWith('.wav')) return false;
          if (lower.includes('heavy')) return false;
          if (lower.includes('roots')) return false;
          return true;
        })
      : [];
    const project = cfg.modResults;
    console.log('[pockt-timing] Copying', wavs.length, 'library click WAVs into iOS app resources');

    for (const wav of wavs) {
      const dest = path.join(destDir, wav);
      fs.copyFileSync(path.join(srcDir, wav), dest);
      try {
        IOSConfig.XcodeUtils.addResourceFileToGroup({
          filepath: path.relative(iosRoot, dest),
          groupName: 'PocktTimingClicks',
          project,
          isBuildFile: true,
          verbose: false,
        });
      } catch (error) {
        console.warn('[pockt-timing] Could not add', wav, 'to Xcode resources:', error);
      }
    }

    cfg.modResults = project;
    return cfg;
  });
}

module.exports = withPocktTimingClicks;

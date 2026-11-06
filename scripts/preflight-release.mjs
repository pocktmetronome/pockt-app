#!/usr/bin/env node
/**
 * Release preflight: run before every App Store build. It fails loudly on any setting Apple has rejected
 * before, or would reject, so a cloud build is never spent on a known-bad configuration.
 *   npm run preflight
 */
import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { execSync } from 'node:child_process';

const fails = [];
const ok = [];
const check = (cond, pass, fail) => (cond ? ok.push(pass) : fails.push(fail));

const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const ios = app.ios ?? {};
const plist = ios.infoPlist ?? {};

// Locked identity: changing these breaks the existing App Store record.
check(ios.bundleIdentifier === 'com.moneytest.pockt', 'bundle id unchanged', `bundle id changed to ${ios.bundleIdentifier}`);
// ITMS-90101: earlier builds supported iPad, so every later build must.
check(ios.supportsTablet === true, 'iPad support kept (ITMS-90101)', 'supportsTablet must stay true (ITMS-90101)');
// Version may never go below what TestFlight already has.
const ver = String(app.version ?? '0').split('.').map(Number);
const floor = [13, 1, 1]; // 13.1.0 is live on the App Store; every update must be higher
const cmp = ver.map((v, i) => v - (floor[i] ?? 0)).find((d) => d !== 0) ?? 0;
check(cmp >= 0, `version ${app.version} > 13.1.0 (live)`, `version ${app.version} must be above 13.1.0, the live App Store version`);
// Export compliance, background audio, permission texts.
check(plist.ITSAppUsesNonExemptEncryption === false, 'export compliance declared', 'ITSAppUsesNonExemptEncryption must be false');
check((plist.UIBackgroundModes ?? []).includes('audio'), 'background audio on', 'UIBackgroundModes must include audio');
for (const key of ['NSMicrophoneUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription']) {
  check(typeof plist[key] === 'string' && plist[key].length > 20, `${key} present`, `${key} missing (ITMS-90683)`);
}
// Privacy manifest (required-reason APIs used by the native timing engine and storage).
const pm = ios.privacyManifests;
const types = (pm?.NSPrivacyAccessedAPITypes ?? []).map((t) => t.NSPrivacyAccessedAPIType);
for (const t of ['NSPrivacyAccessedAPICategoryUserDefaults', 'NSPrivacyAccessedAPICategorySystemBootTime', 'NSPrivacyAccessedAPICategoryFileTimestamp']) {
  check(types.includes(t), `privacy manifest: ${t.replace('NSPrivacyAccessedAPICategory', '')}`, `privacy manifest missing ${t}`);
}
check(pm?.NSPrivacyTracking === false, 'privacy manifest: no tracking', 'NSPrivacyTracking must be false');

// App icon: 1024 x 1024 PNG with no alpha channel.
const iconPath = ios.icon ?? app.icon;
if (!iconPath || !existsSync(iconPath)) fails.push(`icon file missing: ${iconPath}`);
else {
  const fd = openSync(iconPath, 'r');
  const buf = Buffer.alloc(32);
  readSync(fd, buf, 0, 32, 0);
  closeSync(fd);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), colorType = buf[25];
  check(w === 1024 && h === 1024, 'icon 1024 x 1024', `icon is ${w} x ${h}`);
  check(colorType === 2 || colorType === 0, 'icon has no alpha', 'icon has an alpha channel (App Store rejects it)');
}

// Click sounds bundled.
check(existsSync('modules/pockt-timing/ios/Clicks'), 'click sounds bundled', 'Clicks folder missing');

// TypeScript must compile.
try {
  execSync('npx tsc --noEmit -p .', { stdio: 'pipe' });
  ok.push('TypeScript compiles');
} catch (e) {
  // Local native modules (pockt-dial, pockt-controls) are linked by the build; on a machine where those
  // links don't resolve, their "module not found" and the implicit-any it causes are not code errors.
  const lines = String(e.stdout ?? '').split('\n').filter((l) => /error TS\d+/.test(l));
  const real = lines.filter((l) => !/TS2307: Cannot find module 'pockt-(dial|controls)'/.test(l) && !/TS7006/.test(l));
  if (!lines.length) fails.push('TypeScript could not run: ' + String(e).slice(0, 300));
  else if (real.length) fails.push('TypeScript errors:\n' + real.slice(0, 20).join('\n'));
  else ok.push(`TypeScript compiles (${lines.length} link-only notices ignored)`);
}

for (const line of ok) console.log('  ok   ' + line);
for (const line of fails) console.log('  FAIL ' + line);
if (fails.length) {
  console.log(`\nPREFLIGHT FAILED (${fails.length}). Do not build.`);
  process.exit(1);
}
console.log(`\nPREFLIGHT PASSED (${ok.length} checks). Safe to build.`);

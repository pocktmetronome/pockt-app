'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const typesSrc = fs.readFileSync(path.join(ROOT, 'lib', 'types.ts'), 'utf8');
const clickSrc = fs.readFileSync(path.join(ROOT, 'audio', 'click-assets.ts'), 'utf8');
const librarySrc = fs.readFileSync(path.join(ROOT, 'constants', 'sound-library.ts'), 'utf8');
const bankSrc = fs.readFileSync(path.join(ROOT, 'modules', 'pockt-timing', 'ios', 'PocktClickBank.swift'), 'utf8');
const clicksDir = path.join(ROOT, 'modules', 'pockt-timing', 'ios', 'Clicks');

const soundBlock = typesSrc.slice(
  typesSrc.indexOf('export type SoundId'),
  typesSrc.indexOf('export type SkinCategoryId')
);
const soundIds = [...soundBlock.matchAll(/\| '([a-z0-9-]+)'/g)].map((match) => match[1]);

const requires = {};
for (const match of clickSrc.matchAll(/^\s+'([^']+)': require\('([^']+)'\)/gm)) {
  requires[match[1]] = match[2];
}
for (const match of clickSrc.matchAll(/^\s+([a-z0-9-]+): require\('([^']+)'\)/gm)) {
  requires[match[1]] = match[2];
}

const categoryIds = [...librarySrc.matchAll(/'([a-z0-9-]+)'/g)]
  .map((match) => match[1])
  .filter((id) => soundIds.includes(id));

const clicks = fs.existsSync(clicksDir)
  ? new Set(
      fs
        .readdirSync(clicksDir)
        .filter((name) => /\.wav$/i.test(name))
        .map((name) => name.replace(/\.wav$/i, ''))
    )
  : new Set();

const rows = [];
let brokenRegistered = 0;
let brokenBrowser = 0;
for (const id of soundIds) {
  const modulePath = requires[id];
  const abs = modulePath ? path.join(ROOT, modulePath.replace(/^@\//, '')) : null;
  const fileExists = Boolean(abs && fs.existsSync(abs));
  const native = clicks.has(id);
  const bankListed = bankSrc.includes(`"${id}"`);
  const inBrowser = categoryIds.includes(id);
  const ok = Boolean(modulePath && fileExists);
  if (!ok) brokenRegistered += 1;
  if (inBrowser && !ok) brokenBrowser += 1;
  rows.push({
    id,
    modulePath: modulePath || 'MISSING CLICK_MODULES',
    fileExists,
    native,
    bankListed,
    inBrowser,
    browserEligible: inBrowser ? ok : false,
  });
}

const out = [];
out.push('# POCKT Sound QA');
out.push('');
out.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
out.push('');
out.push(`- Registered SoundId values: **${soundIds.length}**`);
out.push(`- Metro click modules: **${Object.keys(requires).length}**`);
out.push(`- Native Clicks WAVs: **${clicks.size}**`);
out.push(`- Browser family entries: **${[...new Set(categoryIds)].length}**`);
out.push(`- Registered without a Metro file: **${brokenRegistered}** (hidden unless also in a family)`);
out.push(`- Browser sounds with broken paths: **${brokenBrowser}**`);
out.push('');
out.push('A sound with a broken path MUST NOT appear in the browser. `SoundLibrarySheet` requires both `SOUNDS[id]` and `CLICK_MODULES[id]`.');
out.push('');
out.push('| id | module | file | native click | bank listed | in family | browser |');
out.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  out.push(
    `| ${row.id} | ${row.modulePath} | ${row.fileExists ? 'yes' : 'NO'} | ${row.native ? 'yes' : 'no'} | ${row.bankListed ? 'yes' : 'no'} | ${row.inBrowser ? 'yes' : 'no'} | ${row.inBrowser && row.fileExists ? 'yes' : row.inBrowser ? 'NO' : 'hidden'} |`
  );
}
out.push('');

fs.writeFileSync(path.join(ROOT, 'docs', 'POCKT_SOUND_QA.md'), out.join('\n'));
console.log(out.filter((line) => line.startsWith('- ')).join('\n'));
if (brokenBrowser) {
  console.error(`SOUND QA: ${brokenBrowser} browser sounds missing files`);
  process.exitCode = 1;
} else {
  console.log('SOUND QA PASSED');
}

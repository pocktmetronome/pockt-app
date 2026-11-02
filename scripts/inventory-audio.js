'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'POCKT_AUDIO_SOURCE');
const OUT = path.join(__dirname, '..', 'docs', 'POCKT_AUDIO_INVENTORY.md');
const MASTER = path.join(__dirname, '..', 'docs', 'POCKT_AUDIO_MASTER_INVENTORY.md');

const AUDIO_EXT = new Set(['.wav', '.aif', '.aiff', '.mp3', '.m4a', '.caf', '.flac', '.ogg']);
const IGNORE_DIR = new Set(['__MACOSX', 'LICENSES_RECEIPTS', '.git']);
const IGNORE_FILE = new Set(['.ds_store', 'thumbs.db']);
const LONG_HINT = /demo|compilation|loop|full.?mix|soundtrack|bed|underscore|trailer/i;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (IGNORE_FILE.has(name.toLowerCase())) continue;
    if (entry.isDirectory()) {
      if (IGNORE_DIR.has(name) || name.startsWith('.')) continue;
      walk(path.join(dir, name), acc);
      continue;
    }
    const ext = path.extname(name).toLowerCase();
    if (!AUDIO_EXT.has(ext)) continue;
    acc.push(path.join(dir, name));
  }
  return acc;
}

function readWavInfo(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(48);
    fs.readSync(fd, header, 0, 48, 0);
    const size = fs.fstatSync(fd).size;
    fs.closeSync(fd);
    if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
      return { kind: 'audio', duration: null, channels: null, sampleRate: null, bytes: size };
    }
    const channels = header.readUInt16LE(22);
    const sampleRate = header.readUInt32LE(24);
    const bits = header.readUInt16LE(34);
    const byteRate = header.readUInt32LE(28);
    const duration = byteRate > 0 ? (size - 44) / byteRate : null;
    return { kind: 'wav', duration, channels, sampleRate, bits, bytes: size };
  } catch {
    return { kind: 'unknown', duration: null, channels: null, sampleRate: null, bytes: 0 };
  }
}

function libraryOf(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const top = rel.split('/')[0] || 'unknown';
  return top;
}

function categoryGuess(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/').toLowerCase();
  if (/vocal|voice|count|speech|one|two|three/.test(rel)) return 'voice';
  if (/kick|snare|hat|tom|rim|drum|taiko/.test(rel)) return 'drums';
  if (/wood|clave|block|temple|stick/.test(rel)) return 'wood';
  if (/cym|ride|gong|bell|metal|cowbell/.test(rel)) return 'metal';
  if (/synth|analog|bass|pulse/.test(rel)) return 'synth';
  if (/click|tick|metronome|bleep|digital/.test(rel)) return 'digital';
  if (/perc|djembe|doumbek|shaker|tamb/.test(rel)) return 'percussion';
  return 'uncategorized';
}

function recommended(file, info) {
  const name = path.basename(file);
  if (LONG_HINT.test(name) || (info.duration != null && info.duration > 2.4)) {
    return 'reject-long-form';
  }
  if (info.duration != null && info.duration < 0.02) return 'reject-too-short';
  if (info.duration != null && info.duration > 0.9) return 'review-tail';
  return 'candidate-oneshot';
}

const files = walk(ROOT);
const rows = files.map((file) => {
  const info = readWavInfo(file);
  return {
    library: libraryOf(file),
    original: path.relative(ROOT, file).replace(/\\/g, '/'),
    filename: path.basename(file),
    category: categoryGuess(file),
    duration: info.duration,
    channels: info.channels,
    sampleRate: info.sampleRate,
    bytes: info.bytes,
    form: info.duration != null && info.duration <= 1.2 ? 'one-shot' : info.duration != null && info.duration > 2.4 ? 'long-form' : 'unknown',
    use: recommended(file, info),
  };
});

rows.sort((a, b) => a.original.localeCompare(b.original));

const ignored = [];
function walkIgnored(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__MACOSX' || entry.name === '.DS_Store' || entry.name.toLowerCase() === '.ds_store') {
      ignored.push(path.relative(ROOT, path.join(dir, entry.name)).replace(/\\/g, '/'));
    }
    if (entry.isDirectory() && entry.name !== '__MACOSX') walkIgnored(path.join(dir, entry.name));
  }
}
walkIgnored(ROOT);

const byLib = {};
for (const row of rows) {
  byLib[row.library] = (byLib[row.library] || 0) + 1;
}

const candidates = rows.filter((row) => row.use === 'candidate-oneshot');
const rejected = rows.filter((row) => row.use !== 'candidate-oneshot');

const lines = [];
lines.push('# POCKT Audio Inventory');
lines.push('');
lines.push('Purchased/licensed source libraries under `POCKT_AUDIO_SOURCE/`.');
lines.push('ORIGINAL folders are archival. This inventory does not modify originals.');
lines.push('');
lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push(`- Usable audio files discovered: **${rows.length}**`);
lines.push(`- Candidate one-shots (≤1.2s, not demo/compilation): **${candidates.length}**`);
lines.push(`- Long-form / review / rejected for metronome use: **${rejected.length}**`);
lines.push(`- Ignored junk paths (__MACOSX / .DS_Store): **${ignored.length}**`);
lines.push('');
lines.push('### By source library');
lines.push('');
for (const [lib, count] of Object.entries(byLib).sort()) {
  lines.push(`- \`${lib}\`: ${count}`);
}
lines.push('');
lines.push('## Notes');
lines.push('');
lines.push('- Duration is read from WAV headers when present. Compressed formats may show unknown duration.');
lines.push('- Long demo compilations, documentation, and license PDFs are not runtime assets.');
lines.push('- Production copies are derived separately. Originals stay untouched.');
lines.push('');
lines.push('## Files');
lines.push('');
lines.push('| Source library | Original filename | Category | Duration s | Form | Recommended use |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  const dur = row.duration == null ? '—' : row.duration.toFixed(3);
  lines.push(
    `| ${row.library} | ${row.filename.replace(/\|/g, '/')} | ${row.category} | ${dur} | ${row.form} | ${row.use} |`
  );
}
lines.push('');
lines.push('## Ignored');
lines.push('');
if (!ignored.length) lines.push('_None found._');
else for (const item of ignored.slice(0, 80)) lines.push(`- \`${item}\``);
if (ignored.length > 80) lines.push(`- … ${ignored.length - 80} more`);
lines.push('');

const shipped = new Set();
try {
  const sources = fs.readFileSync(path.join(__dirname, '..', 'docs', 'POCKT_SOUND_SOURCES.md'), 'utf8');
  for (const match of sources.matchAll(/`([^`]+\.wav)`/g)) shipped.add(path.basename(match[1]));
} catch {
  /* sources doc may not exist yet */
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'));

const master = [];
master.push('# POCKT Audio Master Inventory');
master.push('');
master.push('Programmatic inventory of usable audio under `POCKT_AUDIO_SOURCE/`. Originals were not modified.');
master.push('');
master.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
master.push('');
master.push('## Pack counts');
master.push('');
for (const [lib, count] of Object.entries(byLib).sort()) {
  master.push(`- \`${lib}\`: ${count}`);
}
master.push('');
master.push('## Files');
master.push('');
master.push('| Source pack | Original filename | Format | Duration s | Inferred category | Candidate purpose | Production inclusion |');
master.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const row of rows) {
  const dur = row.duration == null ? '—' : row.duration.toFixed(3);
  const ext = path.extname(row.filename).replace('.', '').toUpperCase() || 'AUDIO';
  const included = shipped.has(row.filename) ? 'SHIPPED (derived copy)' : row.use === 'candidate-oneshot' ? 'source only' : 'excluded';
  master.push(
    `| ${row.library} | ${row.filename.replace(/\|/g, '/')} | ${ext} | ${dur} | ${row.category} | ${row.use} | ${included} |`
  );
}
master.push('');
fs.writeFileSync(MASTER, master.join('\n'));

const COUNT_NAME = /(?:^|[^a-z])(?:count(?:ing)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:[^a-z]|$)/i;
const countingHits = rows.filter((row) => COUNT_NAME.test(row.filename) && !/tone|drone|oneshot|stone|bone|done/i.test(row.filename));
const byCat = {};
for (const row of candidates) {
  byCat[row.category] = (byCat[row.category] || 0) + 1;
}
const catalog = {
  generated: new Date().toISOString().slice(0, 10),
  files: rows.length,
  candidates: candidates.length,
  rejected: rejected.length,
  byLibrary: byLib,
  candidateByCategory: byCat,
  isolatedSpokenCounting: countingHits.slice(0, 40).map((row) => ({ library: row.library, filename: row.filename, duration: row.duration })),
  isolatedSpokenCountingExists: countingHits.some((row) => /count/i.test(row.filename) && !/account/i.test(row.filename)),
  notes: {
    selectedFolder: '04_POCKT_SELECTED is empty. Curation lives in assets/audio/library derived copies.',
    gameLibraries: '05/06 contain character dialogue and are not metronome voices.',
    chamberVocals: '07 is long atmospheric material, not beat one-shots.',
  },
};
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'POCKT_AUDIO_CATALOG.json'), JSON.stringify(catalog, null, 2));
console.log(JSON.stringify({ files: rows.length, candidates: candidates.length, rejected: rejected.length, ignored: ignored.length, out: OUT }, null, 2));

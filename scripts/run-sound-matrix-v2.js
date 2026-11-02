/**
 * Classifies every shipped click, applies the performance envelope, and writes
 * the pass-2 sound reports plus the user-facing allow list.
 */
const fs = require('fs');
const path = require('path');
const perf = require('./click-performance');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'quality-9', 'core-research-pass2');
const TEMPOS = [20, 40, 60, 96, 120, 160, 200, 260, 320, 400];
const DIVISIONS = [
  { id: 'quarter', perBeat: 1 },
  { id: 'eighth', perBeat: 2 },
  { id: 'triplet', perBeat: 3 },
  { id: 'sixteenth', perBeat: 4 },
];

const LONG_VOICE = new Set([
  'lib-vocal-ahh',
  'lib-vocal-ooh',
  'lib-vocal-ahh-deep',
  'lib-vocal-chamber',
  'lib-vocal-chorus',
  'lib-vocal-chorus-b',
  'lib-vocal-ensemble',
  'lib-vocal-ensemble-b',
  'lib-vocal-emote',
  'lib-vocal-emote-b',
  'lib-vocal-character',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.toLowerCase().endsWith('.wav')) out.push(full);
  }
  return out;
}

function parseModules() {
  const text = fs.readFileSync(path.join(ROOT, 'audio', 'click-assets.ts'), 'utf8');
  const map = new Map();
  const re = /['"]?([A-Za-z0-9-]+)['"]?\s*:\s*require\('(@\/assets\/[^']+\.wav)'\)/g;
  let match = re.exec(text);
  while (match) {
    const file = match[2].replace('@/', '');
    if (!map.has(file)) map.set(file, []);
    map.get(file).push(match[1]);
    match = re.exec(text);
  }
  return map;
}

function modulesHas(modules, id) {
  for (const list of modules.values()) {
    if (list.includes(id)) return true;
  }
  return false;
}

function familyFor(id) {
  if (id.startsWith('count')) return 'VOICE';
  if (id.startsWith('lib-vocal') || id.startsWith('lib-choir')) return 'VOICE';
  if (id.includes('wood') || id === 'clave' || id === 'temple' || id === 'dry-stick') return 'WOOD';
  if (id.includes('kick') || id.includes('snare') || id.includes('hat') || id === 'rim' || id === 'cowbell' || id === 'stick') return 'PERCUSSION';
  if (id.includes('digital') || id.includes('synth') || id === 'beep' || id === 'pulse' || id === 'electronic-tick') return 'ELECTRONIC';
  if (id.includes('mechanical') || id === 'tight' || id === 'precision') return 'MECHANICAL';
  return 'CLASSIC';
}

function classify(id, raw, shaped) {
  if (id.startsWith('bar-')) return 'C';
  if (id.startsWith('lib-choir') || LONG_VOICE.has(id)) return 'C';
  if (id.startsWith('count') || id.startsWith('lib-vocal')) return 'D';
  if (raw.effectiveSec <= perf.DENSE_SEC + 0.004) return 'A';
  if (shaped.effectiveSec <= perf.TAIL_GENERAL + 0.004 && shaped.peak >= raw.peak * 0.9) return 'B';
  return 'C';
}

function main() {
  const files = [...walk(path.join(ROOT, 'assets', 'sounds')), ...walk(path.join(ROOT, 'assets', 'audio'))];
  const modules = parseModules();
  const rows = [];
  const seenFile = new Set();
  const keptFiles = new Set();
  for (const file of files) {
    const wav = perf.readWav(file, fs);
    if (!wav) continue;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const ids = modules.get(rel) || [path.basename(file, '.wav')];
    const raw = perf.analyzePcm(wav.samples, wav.rate);
    for (const id of ids) {
      const special = perf.isSpecialKey(id) || id.startsWith('count') || id.startsWith('lib-vocal') || id.startsWith('lib-choir');
      const shapedSamples = perf.shapeSamples(wav.samples, wav.rate, special && !id.startsWith('bar-'));
      const shaped = perf.analyzePcm(shapedSamples, wav.rate);
      const klass = classify(id, raw, shaped);
      const duplicate = keptFiles.has(rel);
      rows.push({ id, rel, klass, raw, shaped, duplicate });
      if (!duplicate) keptFiles.add(rel);
    }
    seenFile.add(rel);
  }

  const keptIds = [];
  const usedFiles = new Set();
  for (const row of rows) {
    if (row.klass !== 'A' && row.klass !== 'B' && row.klass !== 'D') continue;
    if (!modulesHas(modules, row.id)) continue;
    if (row.id.endsWith('-accent') || row.id.includes('ident')) continue;
    if (row.klass === 'D' && !(row.id === 'count' || /^count-[1-8]$/.test(row.id))) continue;
    if (row.duplicate || usedFiles.has(row.rel)) continue;
    keptIds.push(row.id);
    usedFiles.add(row.rel);
  }

  const matrix = [];
  let generalOverlap = 0;
  for (const row of rows) {
    if (!keptIds.includes(row.id)) continue;
    const special = row.klass === 'D';
    for (const tempo of TEMPOS) {
      for (const division of DIVISIONS) {
        const interval = 60 / tempo / division.perBeat;
        const overlap = row.shaped.effectiveSec > interval + 0.001;
        if (!special && overlap) generalOverlap += 1;
        if (tempo === 120 && division.id === 'quarter' || tempo === 400 && division.id === 'sixteenth' || overlap) {
          matrix.push({
            id: row.id,
            tempo,
            division: division.id,
            seconds: Number(row.shaped.effectiveSec.toFixed(4)),
            interval: Number(interval.toFixed(4)),
            overlap: overlap ? 'yes' : 'no',
            klass: row.klass,
          });
        }
      }
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const analysis = [
    '# Sound analysis',
    '',
    'Offline measurement of every WAV referenced by the click bank. The shaped columns are the performance envelope: 8 ms of full level after the peak, then an exponential decay. The peak sample is not moved and is not turned down except for a 0.98 limiter.',
    '',
    `Files measured: ${seenFile.size}. Sound ids: ${rows.length}. User-facing after curation: ${keptIds.length}.`,
    '',
    '| id | class | raw sec | shaped sec | peak | rms | crest | brightness Hz | pre-roll sec | tail energy | dc |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows
      .filter((row) => keptIds.includes(row.id) || row.klass === 'C')
      .map((row) => `| ${row.id} | ${row.klass} | ${row.raw.effectiveSec.toFixed(3)} | ${row.shaped.effectiveSec.toFixed(3)} | ${row.shaped.peak.toFixed(2)} | ${row.shaped.rms.toFixed(3)} | ${row.shaped.crest.toFixed(1)} | ${Math.round(row.raw.brightness)} | ${row.raw.preRollSec.toFixed(3)} | ${row.shaped.tailRatio.toFixed(2)} | ${row.raw.dc.toFixed(4)} |`),
    '',
  ];
  const curation = [
    '# Sound curation',
    '',
    'A is already shorter than a 400 BPM sixteenth. B becomes that short after the shaped decay, with the attack peak kept. C is quarantined from the browser (novelty tails, choir pads, long vowels). D is voice counting 1–8, usable as a count, not as a sixteenth-note click.',
    '',
    `Retained user-facing sounds: ${keptIds.length}.`,
    '',
    '| id | family | class | attack | tail | character | use | max density | accent |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows
      .filter((row) => keptIds.includes(row.id))
      .map((row) => {
        const bright = row.raw.brightness > 2500 ? 'bright' : row.raw.brightness > 900 ? 'mid' : 'dark';
        const attack = row.raw.preRollSec > 0.012 ? 'late' : 'immediate';
        const tail = row.klass === 'A' ? 'already short' : row.klass === 'D' ? 'spoken, choked to 150 ms' : 'exponential after 8 ms';
        const density = row.klass === 'D' ? 'quarter notes' : '400 BPM sixteenths';
        return `| ${row.id} | ${familyFor(row.id)} | ${row.klass} | ${attack} | ${tail} | ${bright} | metronome click | ${density} | soft / normal / strong |`;
      }),
    '',
  ];
  const matrixDoc = [
    '# Sound matrix v2',
    '',
    'Durations are after the performance envelope. A general click overlaps when its shaped length exceeds the musical gap. Voice counts are special and may overlap sixteenths; they are not general clicks.',
    '',
    `General-click overlaps remaining: ${generalOverlap}.`,
    '',
    '| id | class | bpm | division | shaped sec | interval | overlap |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...matrix.map((row) => `| ${row.id} | ${row.klass} | ${row.tempo} | ${row.division} | ${row.seconds} | ${row.interval} | ${row.overlap} |`),
    '',
  ];
  fs.writeFileSync(path.join(OUT, 'SOUND_ANALYSIS.md'), analysis.join('\n'));
  fs.writeFileSync(path.join(OUT, 'SOUND_CURATION.md'), curation.join('\n'));
  fs.writeFileSync(path.join(OUT, 'SOUND_MATRIX_V2.md'), matrixDoc.join('\n'));

  const list = [...new Set(keptIds)].sort();
  const ts = `/** Generated by scripts/run-sound-matrix-v2.js. User-facing metronome sounds. */\nexport const USER_FACING_SOUNDS = ${JSON.stringify(list, null, 2)} as const;\n\nconst FACING = new Set<string>(USER_FACING_SOUNDS);\n\nexport function isUserFacingSound(id: string): boolean {\n  return FACING.has(id);\n}\n`;
  fs.writeFileSync(path.join(ROOT, 'constants', 'curated-sounds.ts'), ts);
  console.log(`sound matrix v2 kept ${list.length} facing sounds, general overlaps ${generalOverlap}, measured ${rows.length} ids`);
  if (generalOverlap > 0) process.exit(1);
  if (list.length < 40 || list.length > 80) {
    console.error(`curated count ${list.length} is outside 40-80`);
    process.exit(1);
  }
}

main();

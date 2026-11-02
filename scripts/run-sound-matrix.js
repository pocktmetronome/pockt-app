/**
 * Offline click-length matrix. Duration versus musical interval.
 * This does not measure a speaker.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPOS = [20, 40, 60, 96, 120, 160, 200, 260, 320, 400];
const DIVISIONS = [
  { id: 'quarter', perBeat: 1 },
  { id: 'eighth', perBeat: 2 },
  { id: 'triplet', perBeat: 3 },
  { id: 'sixteenth', perBeat: 4 },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.toLowerCase().endsWith('.wav')) out.push(full);
  }
  return out;
}

function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let offset = 12;
  let rate = 0;
  let channels = 0;
  let bits = 16;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ' && size >= 16) {
      channels = buf.readUInt16LE(start + 2);
      rate = buf.readUInt32LE(start + 4);
      bits = buf.readUInt16LE(start + 14);
    } else if (id === 'data') {
      data = buf.subarray(start, Math.min(buf.length, start + size));
    }
    offset = start + size + (size % 2);
  }
  if (!rate || !channels || !data) return null;
  const bytesPer = Math.max(1, bits / 8);
  const frames = Math.floor(data.length / (channels * bytesPer));
  let peak = 0;
  const stride = Math.max(1, Math.floor(frames / 4000));
  for (let frame = 0; frame < frames; frame += stride) {
    const index = frame * channels * bytesPer;
    let sample = 0;
    if (bits === 16 && index + 2 <= data.length) sample = Math.abs(data.readInt16LE(index)) / 32768;
    else if (bits === 24 && index + 3 <= data.length) {
      const raw = data[index] | (data[index + 1] << 8) | (data[index + 2] << 16);
      const signed = raw & 0x800000 ? raw - 0x1000000 : raw;
      sample = Math.abs(signed) / 8388607;
    } else if (bits === 32 && index + 4 <= data.length) sample = Math.abs(data.readFloatLE(index));
    if (sample > peak) peak = sample;
  }
  return { rate, channels, bits, seconds: frames / rate, peak };
}

const files = [...walk(path.join(ROOT, 'assets', 'sounds')), ...walk(path.join(ROOT, 'assets', 'audio'))];
const rows = [];
let overlaps = 0;
for (const file of files) {
  const wav = readWav(file);
  if (!wav) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  for (const tempo of TEMPOS) {
    for (const division of DIVISIONS) {
      const interval = 60 / tempo / division.perBeat;
      const overlap = wav.seconds > interval;
      if (overlap) overlaps += 1;
      if (tempo === 120 && division.id === 'quarter' || tempo === 400 && division.id === 'sixteenth' || overlap && tempo >= 200) {
        rows.push({ sound: rel, tempo, division: division.id, seconds: Number(wav.seconds.toFixed(4)), interval: Number(interval.toFixed(4)), overlap, peak: Number(wav.peak.toFixed(3)) });
      }
    }
  }
}

const outDir = path.join(ROOT, 'artifacts', 'quality-9', 'core-research-pass');
fs.mkdirSync(outDir, { recursive: true });
const lines = [
  '# Sound matrix',
  '',
  'Offline WAV duration against the musical interval. A row marked overlap means the sample is longer than the gap before the next event at that tempo and subdivision. This is not a speaker measurement.',
  '',
  `Files read: ${files.length}`,
  `Overlap cases at or above 200 BPM, plus the 120 quarter and 400 sixteenth references: ${rows.filter((row) => row.overlap).length}`,
  '',
  '| sound | bpm | division | seconds | interval | overlap | peak |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| ${row.sound} | ${row.tempo} | ${row.division} | ${row.seconds} | ${row.interval} | ${row.overlap ? 'yes' : 'no'} | ${row.peak} |`),
  '',
];
fs.writeFileSync(path.join(outDir, 'SOUND_MATRIX.md'), lines.join('\n'));
console.log(`sound matrix wrote ${rows.length} rows from ${files.length} files, overlap flags ${overlaps}`);
if (!files.length) {
  console.error('no wav files found');
  process.exit(1);
}

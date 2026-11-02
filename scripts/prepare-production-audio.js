'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'POCKT_AUDIO_SOURCE');
const LIB_OUT = path.join(ROOT, 'assets', 'audio', 'library');
const CLICK_OUT = path.join(ROOT, 'modules', 'pockt-timing', 'ios', 'Clicks');
const IDENT_OUT = path.join(ROOT, 'assets', 'audio', 'pockt-ident-v94.wav');
const MAP_OUT = path.join(ROOT, 'docs', 'POCKT_SOUND_SOURCES.md');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__MACOSX' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.wav$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

function findByName(name) {
  const files = walk(SOURCE);
  const hit = files.find((file) => path.basename(file) === name);
  if (!hit) throw new Error(`Missing source WAV: ${name}`);
  return hit;
}

function decodeWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a WAVE file');
  }
  let offset = 12;
  let fmt;
  let data;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(start),
        channels: buf.readUInt16LE(start + 2),
        sampleRate: buf.readUInt32LE(start + 4),
        bits: buf.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('Incomplete WAVE');
  const samples = [];
  if (fmt.audioFormat === 1 && fmt.bits === 16) {
    for (let i = 0; i + 2 <= data.length; i += 2) samples.push(data.readInt16LE(i) / 32768);
  } else if (fmt.audioFormat === 1 && fmt.bits === 24) {
    for (let i = 0; i + 3 <= data.length; i += 3) {
      let v = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16);
      if (v & 0x800000) v |= ~0xffffff;
      samples.push(v / 8388608);
    }
  } else if (fmt.audioFormat === 3 && fmt.bits === 32) {
    for (let i = 0; i + 4 <= data.length; i += 4) samples.push(data.readFloatLE(i));
  } else {
    throw new Error(`Unsupported WAV format ${fmt.audioFormat}/${fmt.bits}`);
  }
  const frames = [];
  for (let i = 0; i < samples.length; i += fmt.channels) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) sum += samples[i + c] || 0;
    frames.push(sum / fmt.channels);
  }
  return { sampleRate: fmt.sampleRate, frames };
}

function resample(frames, fromRate, toRate) {
  if (fromRate === toRate) return frames;
  const ratio = fromRate / toRate;
  const out = new Array(Math.max(1, Math.round(frames.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const src = i * ratio;
    const lo = Math.floor(src);
    const hi = Math.min(frames.length - 1, lo + 1);
    const t = src - lo;
    out[i] = (frames[lo] ?? 0) * (1 - t) + (frames[hi] ?? 0) * t;
  }
  return out;
}

function encodeWav(frames, sampleRate = 48000) {
  const data = Buffer.alloc(frames.length * 2);
  for (let i = 0; i < frames.length; i++) {
    const s = Math.max(-1, Math.min(1, frames[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function peak(frames) {
  let max = 0;
  for (const s of frames) max = Math.max(max, Math.abs(s));
  return max;
}

function prepareOneShot(frames, sampleRate, maxMs = 280) {
  const thresh = 0.008;
  let start = 0;
  while (start < frames.length && Math.abs(frames[start]) < thresh) start += 1;
  start = Math.max(0, start - Math.round(sampleRate * 0.001));
  const maxFrames = Math.round((maxMs / 1000) * sampleRate);
  let sliced = frames.slice(start, start + maxFrames);
  const fade = Math.round(sampleRate * 0.008);
  for (let i = 0; i < fade && i < sliced.length; i++) {
    sliced[sliced.length - 1 - i] *= i / fade;
  }
  const p = peak(sliced);
  if (p > 0) sliced = sliced.map((s) => (s / p) * 0.84);
  return sliced;
}

const CATALOG = [
  { id: 'lib-wood', file: 'Wood_Block_Fienup_001.wav', maxMs: 220 },
  { id: 'lib-jam', file: 'JamBlock_Plastic_B_Fienup_001.wav', maxMs: 200 },
  { id: 'lib-kick-deep', file: 'Kick_Deep_Fienup_001.wav', maxMs: 180 },
  { id: 'lib-kick', file: 'Kick_Drum_Fienup_006.wav', maxMs: 220 },
  { id: 'lib-snare', file: 'Snare_EggCrack_Fienup_001.wav', maxMs: 180 },
  { id: 'lib-hat', file: 'Hi-Hat_Closed_Fienup_002.wav', maxMs: 160 },
  { id: 'lib-djembe', file: 'Djembe_Hit_Muted_Fienup_004.wav', maxMs: 240 },
  { id: 'lib-doumbek', file: 'Doumbek_Hit_Muted_Fienup_002.wav', maxMs: 220 },
  { id: 'lib-bell', file: 'Bell_Waiter_Fienup_001.wav', maxMs: 260 },
  { id: 'lib-tom', file: 'Tom_Drum_Fienup_001.wav', maxMs: 260 },
  { id: 'lib-timpani', file: 'Timpani_Hit_Fienup_001.wav', maxMs: 280 },
  { id: 'lib-click', file: 'BlipsandClicks_Synth_Click_01.wav', maxMs: 140 },
  { id: 'lib-click-tight', file: 'BlipsandClicks_Synth_Click_08.wav', maxMs: 120 },
  { id: 'lib-blip', file: 'BlipsandClicks_Synth_Percussive_Short_Hit_01.wav', maxMs: 160 },
  { id: 'lib-digital', file: 'BlipsandClicks_Synth_Short_Colorful_Blip_01.wav', maxMs: 140 },
  { id: 'lib-synth', file: 'Blasts_Synth_Drum_Resonant_Hit_01.wav', maxMs: 240 },
  { id: 'lib-vocal-hit', file: 'voice_female_a_attack_11.wav', maxMs: 220 },
  { id: 'lib-vocal-male', file: 'voice_male_c_attack_10.wav', maxMs: 220 },
  { id: 'lib-vocal-female', file: 'voice_female_c_attack_04.wav', maxMs: 220 },
  { id: 'lib-vocal-shout', file: 'voice_female_c_battle_shout_short_02.wav', maxMs: 240 },
  { id: 'lib-vocal-call', file: 'voice_male_b_battle_shout_short_02.wav', maxMs: 240 },
  { id: 'lib-vocal-ahh', file: 'Character_Sharon_Ahh_1.wav', maxMs: 220 },
  { id: 'lib-vocal-character', file: 'Character_Kimberly_AHH_1.wav', maxMs: 220 },
  { id: 'lib-vocal-chamber', file: 'DSGNVocl_Revereberant Designed Vocal 01_344 Audio_Reverb Chamber Vocals Vol 1.wav', maxMs: 280 },
  { id: 'lib-vocal-hit-b', file: 'voice_female_b_attack_set1_06.wav', maxMs: 220 },
  { id: 'lib-vocal-male-b', file: 'voice_male_b_attack_set2_08.wav', maxMs: 220 },
  { id: 'lib-vocal-effort', file: 'voice_female_a_effort_jump_action_08.wav', maxMs: 180 },
  { id: 'lib-vocal-effort-m', file: 'voice_male_b_effort_jump_05.wav', maxMs: 180 },
  { id: 'lib-vocal-emote', file: 'voice_female_a_expression_emote_10.wav', maxMs: 240 },
  { id: 'lib-vocal-emote-b', file: 'voice_female_a_expression_emote_11.wav', maxMs: 240 },
  { id: 'lib-vocal-ooh', file: 'Character_Sharon_Ooo_1.wav', maxMs: 240 },
  { id: 'lib-vocal-ahh-deep', file: 'Character_Kimberly_AHH_9.wav', maxMs: 220 },
  { id: 'lib-vocal-chorus', file: 'DSGNVocl_Reverberant Layered Vocal 08_344 Audio_Reverb Chamber Vocals Vol 1.wav', maxMs: 280 },
  { id: 'lib-vocal-chorus-b', file: 'DSGNVocl_Reverberant Layered Vocal 01_344 Audio_Reverb Chamber Vocals Vol 1.wav', maxMs: 280 },
  { id: 'lib-vocal-ensemble', file: 'DSGNVocl_Reverberant Layered Vocal 04_344 Audio_Reverb Chamber Vocals Vol 1.wav', maxMs: 280 },
  { id: 'lib-vocal-ensemble-b', file: 'DSGNVocl_Reverberant Layered Vocal 06_344 Audio_Reverb Chamber Vocals Vol 1.wav', maxMs: 280 },
];

fs.mkdirSync(LIB_OUT, { recursive: true });
fs.mkdirSync(CLICK_OUT, { recursive: true });

const used = [];
for (const item of CATALOG) {
  const src = findByName(item.file);
  const decoded = decodeWav(fs.readFileSync(src));
  const frames = prepareOneShot(resample(decoded.frames, decoded.sampleRate, 48000), 48000, item.maxMs);
  const wav = encodeWav(frames, 48000);
  const destName = `${item.id}.wav`;
  fs.writeFileSync(path.join(LIB_OUT, destName), wav);
  fs.writeFileSync(path.join(CLICK_OUT, destName), wav);
  used.push({ id: item.id, source: path.relative(SOURCE, src).replace(/\\/g, '/'), bytes: wav.length });
  console.log('prepared', item.id, `${wav.length} bytes`);
}

function adsr(i, n, sr, attack, release) {
  const a = Math.max(1, Math.round(attack * sr));
  const r = Math.max(1, Math.round(release * sr));
  if (i < a) {
    const x = i / a;
    return x * x;
  }
  if (i > n - r) {
    const x = (n - i) / r;
    return x * x;
  }
  return 1;
}

function addPartial(target, sr, freq, at, dur, gain, attack, release, harmonics) {
  const start = Math.round(at * sr);
  const n = Math.round(dur * sr);
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= target.length) continue;
    const t = i / sr;
    const env = adsr(i, n, sr, attack, release);
    let s = 0;
    for (let h = 0; h < harmonics.length; h++) {
      s += Math.sin(2 * Math.PI * freq * (h + 1) * t) * harmonics[h];
    }
    target[idx] += s * env * gain;
  }
}

/**
 * Original POCKT sonic logo. Additive D-major rise — no library collage,
 * no vocal, no percussion pileup, no metallic collisions.
 */
function composeMusicalIdent(sr = 48000) {
  const seconds = 2.2;
  const ident = new Array(Math.round(sr * seconds)).fill(0);
  const D2 = 73.42;
  const A2 = 110;
  const D3 = 146.83;
  const A3 = 220;
  const D4 = 293.66;
  const Fs4 = 369.99;
  const A4 = 440;
  const D5 = 587.33;
  const sine = [1, 0.11, 0.035];
  const warm = [1, 0.2, 0.07, 0.025];

  addPartial(ident, sr, D2, 0.0, 2.2, 0.22, 0.28, 0.55, warm);
  addPartial(ident, sr, A2, 0.1, 2.1, 0.14, 0.22, 0.5, sine);
  addPartial(ident, sr, D3, 0.22, 1.98, 0.16, 0.18, 0.48, sine);
  addPartial(ident, sr, A3, 0.48, 1.72, 0.13, 0.16, 0.42, sine);
  addPartial(ident, sr, D4, 0.62, 1.58, 0.11, 0.14, 0.4, sine);
  addPartial(ident, sr, Fs4, 0.78, 1.42, 0.1, 0.12, 0.38, sine);
  addPartial(ident, sr, D4, 0.7, 0.22, 0.09, 0.012, 0.18, sine);
  addPartial(ident, sr, A4, 1.05, 0.2, 0.08, 0.012, 0.16, sine);
  addPartial(ident, sr, D2, 1.52, 0.68, 0.28, 0.02, 0.52, warm);
  addPartial(ident, sr, D3, 1.52, 0.68, 0.22, 0.018, 0.5, sine);
  addPartial(ident, sr, A3, 1.52, 0.64, 0.18, 0.016, 0.48, sine);
  addPartial(ident, sr, D4, 1.52, 0.6, 0.16, 0.014, 0.46, sine);
  addPartial(ident, sr, Fs4, 1.52, 0.58, 0.14, 0.014, 0.44, sine);
  addPartial(ident, sr, A4, 1.52, 0.52, 0.1, 0.012, 0.4, sine);
  addPartial(ident, sr, D5, 1.52, 0.38, 0.055, 0.01, 0.32, sine);

  const peakAt = Math.round(sr * 1.52);
  for (let i = 0; i < ident.length; i++) {
    const t = i / sr;
    let shape = 0.52 + 0.48 * Math.min(1, t / 1.52);
    if (i > peakAt) {
      const rel = (i - peakAt) / Math.max(1, ident.length - peakAt);
      shape = 1 - 0.32 * rel;
    }
    ident[i] *= shape;
  }

  const fadeStart = Math.round(sr * 1.85);
  for (let i = fadeStart; i < ident.length; i++) {
    ident[i] *= 1 - (i - fadeStart) / Math.max(1, ident.length - fadeStart);
  }
  const p = peak(ident);
  return ident.map((s) => (s / (p || 1)) * 0.62);
}

function rms(frames) {
  if (!frames.length) return 0;
  let sum = 0;
  for (const s of frames) sum += s * s;
  return Math.sqrt(sum / frames.length);
}

function energyBand(frames, start, end) {
  let sum = 0;
  const lo = Math.max(0, start);
  const hi = Math.min(frames.length, end);
  for (let i = lo; i < hi; i++) sum += frames[i] * frames[i];
  return sum / Math.max(1, hi - lo);
}

function scoreIdent(frames, sr) {
  const p = peak(frames);
  const r = rms(frames);
  const rise = energyBand(frames, 0, Math.round(sr * 0.55));
  const hit = energyBand(frames, Math.round(sr * 0.75), Math.round(sr * 1.15));
  const tail = energyBand(frames, Math.round(sr * 1.25), frames.length);
  const duration = frames.length / sr;
  const crest = p / Math.max(0.0001, r);
  const hitRatio = hit / Math.max(0.0001, rise);
  let score = 0;
  if (duration >= 1.5 && duration <= 2.5) score += 10;
  if (p > 0.62 && p < 0.9) score += 8;
  if (r > 0.07 && r < 0.18) score += 8;
  if (hitRatio > 1.35 && hitRatio < 4.2) score += 10;
  if (crest > 4 && crest < 11) score += 6;
  if (tail < hit * 0.55) score += 4;
  if (p >= 0.98) score -= 12;
  if (r > 0.22) score -= 8;
  return { score, peak: p, rms: r, duration, crest, hitRatio };
}

const sr = 48000;
const identFrames = composeMusicalIdent(sr);
const identMetrics = scoreIdent(identFrames, sr);
fs.writeFileSync(IDENT_OUT, encodeWav(identFrames, sr));
fs.writeFileSync(path.join(CLICK_OUT, 'pockt-ident.wav'), encodeWav(identFrames, sr));
console.log('ident chosen', 'd-major-rise', IDENT_OUT, fs.statSync(IDENT_OUT).size, identMetrics);

const map = [
  '# POCKT derived production audio',
  '',
  'Originals in `POCKT_AUDIO_SOURCE/` were not modified.',
  '',
  '## Library copies',
  '',
  ...used.map((item) => `- \`${item.id}.wav\` ← \`${item.source}\``),
  '',
  '## Sonic logo `assets/audio/pockt-ident-v94.wav`',
  '',
  '- Candidate selected: `d-major-rise` (no vocal, no rumble, no spoken count; no dialogue, no cowbell pileup)',
  `- Duration: ${identMetrics.duration.toFixed(2)}s`,
  '- Architecture: additive D-major sine rise → short crescendo → warm low-mid resolution chord',
  '- Not a library collage. No percussion pileup. Peak-normalized to 0.62.',
  '- Native copy: `modules/pockt-timing/ios/Clicks/pockt-ident.wav`',
  '- UI may fade while the ident buffer finishes on the native preview node.',
  '',
].join('\n');
fs.writeFileSync(MAP_OUT, map);

const BUNDLE_COPIES = [
  ['mechanical', path.join(ROOT, 'assets/audio/tools/mechanical.wav')],
  ['woodblock', path.join(ROOT, 'assets/audio/tools/woodblock.wav')],
  ['rim', path.join(ROOT, 'assets/audio/tools/rim.wav')],
  ['cowbell', path.join(ROOT, 'assets/audio/tools/cowbell.wav')],
  ['beep', path.join(ROOT, 'assets/audio/tools/beep.wav')],
  ['hard-click', path.join(ROOT, 'assets/audio/tools/hard-click.wav')],
  ['high-click', path.join(ROOT, 'assets/audio/tools/high-click.wav')],
  ['low-click', path.join(ROOT, 'assets/audio/tools/low-click.wav')],
  ['studio-click', path.join(ROOT, 'assets/audio/tools/studio-click.wav')],
  ['plain-tick', path.join(ROOT, 'assets/sounds/tick.wav')],
  ['blend-tick', path.join(ROOT, 'assets/sounds/warm.wav')],
  ['bell', path.join(ROOT, 'assets/sounds/accent.wav')],
  ['snare', path.join(ROOT, 'assets/audio/tools/hard-click.wav')],
  ['kick', path.join(ROOT, 'assets/sounds/kick.wav')],
  ['hihat', path.join(ROOT, 'assets/sounds/soft.wav')],
  ['temple', path.join(ROOT, 'assets/audio/classic/wood.wav')],
  ['dry-stick', path.join(ROOT, 'assets/sounds/stick.wav')],
  ['soft-wood', path.join(ROOT, 'assets/sounds/soft.wav')],
  ['electronic-tick', path.join(ROOT, 'assets/audio/tools/beep.wav')],
];
for (const [key, src] of BUNDLE_COPIES) {
  if (!fs.existsSync(src)) {
    console.warn('missing bundle copy source', key, src);
    continue;
  }
  fs.copyFileSync(src, path.join(CLICK_OUT, `${key}.wav`));
}

console.log(JSON.stringify({ library: used.length, identBytes: fs.statSync(IDENT_OUT).size, ident: 'd-major-rise' }, null, 2));

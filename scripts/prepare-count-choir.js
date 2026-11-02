'use strict';

/**
 * Curate production count + choir one-shots from purchased SOURCE packs.
 * Never writes back into POCKT_AUDIO_SOURCE.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'POCKT_AUDIO_SOURCE');
const LIB_OUT = path.join(ROOT, 'assets', 'audio', 'library');
const CLICK_OUT = path.join(ROOT, 'modules', 'pockt-timing', 'ios', 'Clicks');
const REPORT = path.join(ROOT, 'docs', 'POCKT_COUNT_CHOIR_REPORT.md');
const MAP = path.join(ROOT, 'docs', 'POCKT_SOUND_SOURCES.md');

const COUNT_DIR = path.join(
  SOURCE,
  '08_NEW_VOCALS',
  '01_COUNTING_PURCHASED',
  'e39a154d152163e2d252d093e0ab690e',
  'NUMBERS AND LETTERS AND EVERYTHING THAT GOES WITH THEM',
  'numbers and letters no effect'
);

const CHOIR_DIR = path.join(
  SOURCE,
  '08_NEW_VOCALS',
  '02_CHOIR_PURCHASED',
  '37da9b8a79e2a775a2439536c6ae71e8'
);

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

function rms(frames) {
  if (!frames.length) return 0;
  let sum = 0;
  for (const s of frames) sum += s * s;
  return Math.sqrt(sum / frames.length);
}

function findSpeechOnset(frames, sampleRate) {
  const noiseN = Math.min(frames.length, Math.round(sampleRate * 0.04));
  let noise = 0;
  for (let i = 0; i < noiseN; i++) noise += frames[i] * frames[i];
  noise = Math.sqrt(noise / Math.max(1, noiseN));
  const thresh = Math.max(0.018, noise * 10);
  const win = Math.round(sampleRate * 0.004);
  for (let i = 0; i < frames.length; i++) {
    let e = 0;
    const hi = Math.min(frames.length, i + win);
    for (let j = i; j < hi; j++) e += frames[j] * frames[j];
    if (Math.sqrt(e / Math.max(1, hi - i)) > thresh) {
      return Math.max(0, i - Math.round(sampleRate * 0.004));
    }
  }
  return 0;
}

function findTail(frames, sampleRate, start) {
  const thresh = 0.006;
  let end = frames.length - 1;
  while (end > start && Math.abs(frames[end]) < thresh) end -= 1;
  end = Math.min(frames.length - 1, end + Math.round(sampleRate * 0.04));
  return end;
}

function fade(frames, sampleRate, attackMs, releaseMs) {
  const a = Math.max(1, Math.round((attackMs / 1000) * sampleRate));
  const r = Math.max(1, Math.round((releaseMs / 1000) * sampleRate));
  const out = frames.slice();
  for (let i = 0; i < a && i < out.length; i++) {
    const x = i / a;
    out[i] *= x * x;
  }
  for (let i = 0; i < r && i < out.length; i++) {
    const x = i / r;
    out[out.length - 1 - i] *= x * x;
  }
  return out;
}

function normalize(frames, target = 0.78) {
  const p = peak(frames);
  if (p <= 0) return frames;
  const g = Math.min(target / p, 4);
  return frames.map((s) => Math.max(-0.97, Math.min(0.97, s * g)));
}

function writeProd(id, frames, sampleRate = 48000) {
  const wav = encodeWav(frames, sampleRate);
  fs.mkdirSync(LIB_OUT, { recursive: true });
  fs.mkdirSync(CLICK_OUT, { recursive: true });
  fs.writeFileSync(path.join(LIB_OUT, `${id}.wav`), wav);
  fs.writeFileSync(path.join(CLICK_OUT, `${id}.wav`), wav);
  return wav.length;
}

function prepareCount() {
  const used = [];
  for (let n = 1; n <= 12; n++) {
    const src = path.join(COUNT_DIR, `${n}.wav`);
    if (!fs.existsSync(src)) throw new Error(`Missing count source ${src}`);
    const decoded = decodeWav(fs.readFileSync(src));
    const frames = resample(decoded.frames, decoded.sampleRate, 48000);
    const onset = findSpeechOnset(frames, 48000);
    const tail = findTail(frames, 48000, onset);
    const maxFrames = Math.round(0.52 * 48000);
    let sliced = frames.slice(onset, Math.min(tail + 1, onset + maxFrames));
    sliced = fade(sliced, 48000, 1.5, 55);
    sliced = normalize(sliced, 0.78);
    const bytes = writeProd(`count-${n}`, sliced);
    used.push({
      id: `count-${n}`,
      source: path.relative(SOURCE, src).replace(/\\/g, '/'),
      onsetMs: (onset / 48000) * 1000,
      durMs: (sliced.length / 48000) * 1000,
      bytes,
    });
    console.log('count', n, `onset=${used[used.length - 1].onsetMs.toFixed(1)}ms`, `dur=${used[used.length - 1].durMs.toFixed(0)}ms`);
  }
  const one = fs.readFileSync(path.join(LIB_OUT, 'count-1.wav'));
  fs.writeFileSync(path.join(LIB_OUT, 'count.wav'), one);
  fs.writeFileSync(path.join(CLICK_OUT, 'count.wav'), one);
  return used;
}

function envelope(frames, sampleRate, hopMs = 10) {
  const hop = Math.round((hopMs / 1000) * sampleRate);
  const win = hop * 2;
  const env = [];
  for (let i = 0; i < frames.length; i += hop) {
    let sum = 0;
    const hi = Math.min(frames.length, i + win);
    for (let j = i; j < hi; j++) sum += frames[j] * frames[j];
    env.push({ i, rms: Math.sqrt(sum / Math.max(1, hi - i)) });
  }
  return { env, hop };
}

function choirCandidates(frames, sampleRate) {
  const { env, hop } = envelope(frames, sampleRate, 12);
  const values = env.map((e) => e.rms).sort((a, b) => a - b);
  const p50 = values[Math.floor(values.length * 0.5)] || 0.001;
  const p80 = values[Math.floor(values.length * 0.8)] || p50;
  const candidates = [];
  for (let k = 6; k < env.length - 12; k++) {
    const prev = (env[k - 4].rms + env[k - 3].rms + env[k - 2].rms) / 3;
    const cur = env[k].rms;
    if (cur < p50 * 1.15) continue;
    if (cur < prev * 1.28) continue;
    const start = Math.max(0, env[k].i - Math.round(sampleRate * 0.04));
    const body = Math.min(frames.length, start + Math.round(sampleRate * 0.98));
    const dur = (body - start) / sampleRate;
    if (dur < 0.62) continue;
    const slice = frames.slice(start, body);
    const p = peak(slice);
    const r = rms(slice);
    const crest = p / Math.max(0.0001, r);
    if (p < 0.14 || r < 0.028) continue;
    if (crest < 1.8 || crest > 9.5) continue;
    const tail = rms(slice.slice(Math.round(slice.length * 0.7)));
    const head = rms(slice.slice(0, Math.round(slice.length * 0.16)));
    if (head > r * 1.28) continue;
    if (tail < r * 0.18) continue;
    candidates.push({
      start,
      end: body,
      score: (cur / Math.max(0.0001, prev)) + (cur / p80) + tail * 6 - Math.max(0, crest - 4) * 0.35,
      dur,
      crest,
    });
    k += Math.round(0.9 / (hop / sampleRate));
  }
  candidates.sort((a, b) => b.score - a.score);
  const picked = [];
  for (const c of candidates) {
    if (picked.some((p) => Math.abs(p.start - c.start) < sampleRate * 2.4)) continue;
    picked.push(c);
    if (picked.length >= 2) break;
  }
  return picked;
}

function prepareChoir() {
  const used = [];
  const names = [
    'Lyric Choir Theme #1.wav',
    'Lyric Choir Theme #2.wav',
    'Lyric Choir Theme #3.wav',
    'Lyric Choir Theme #4.wav',
    'Lyric Choir Theme #5.wav',
  ];
  const ids = ['lib-choir-a', 'lib-choir-b', 'lib-choir-c', 'lib-choir-d', 'lib-choir-e', 'lib-choir-f', 'lib-choir-g', 'lib-choir-h'];
  const pool = [];
  names.forEach((name, track) => {
    const src = path.join(CHOIR_DIR, name);
    if (!fs.existsSync(src)) throw new Error(`Missing choir source ${src}`);
    const decoded = decodeWav(fs.readFileSync(src));
    const frames = resample(decoded.frames, decoded.sampleRate, 48000);
    const clips = choirCandidates(frames, 48000);
    console.log('choir', name, `duration=${(frames.length / 48000).toFixed(1)}s`, `found=${clips.length}`);
    clips.forEach((clip, clipIndex) => {
      pool.push({ src, track: track + 1, clipIndex: clipIndex + 1, frames, clip });
    });
  });
  const firsts = [];
  const extras = [];
  const seenTrack = new Set();
  for (const item of pool) {
    if (!seenTrack.has(item.track)) {
      firsts.push(item);
      seenTrack.add(item.track);
    } else {
      extras.push(item);
    }
  }
  const chosen = [...firsts, ...extras].slice(0, ids.length);
  chosen.forEach((item, index) => {
    let sliced = item.frames.slice(item.clip.start, item.clip.end);
    sliced = fade(sliced, 48000, 18, 240);
    sliced = normalize(sliced, 0.74);
    const id = ids[index];
    const bytes = writeProd(id, sliced);
    used.push({
      id,
      source: path.relative(SOURCE, item.src).replace(/\\/g, '/'),
      track: item.track,
      clip: item.clipIndex,
      startMs: (item.clip.start / 48000) * 1000,
      durMs: (sliced.length / 48000) * 1000,
      bytes,
    });
    console.log(
      '  clip',
      id,
      `theme=${item.track}`,
      `start=${used[used.length - 1].startMs.toFixed(0)}ms`,
      `dur=${used[used.length - 1].durMs.toFixed(0)}ms`
    );
  });
  return used;
}

if (!fs.existsSync(COUNT_DIR)) throw new Error(`Count source missing: ${COUNT_DIR}`);
if (!fs.existsSync(CHOIR_DIR)) throw new Error(`Choir source missing: ${CHOIR_DIR}`);

const counts = prepareCount();
const choirs = prepareChoir();

const report = [
  '# Count + choir production report',
  '',
  'Purchased originals in `POCKT_AUDIO_SOURCE/08_NEW_VOCALS` were not modified.',
  'Only curated production WAVs were written to `assets/audio/library` and `modules/pockt-timing/ios/Clicks`.',
  '',
  '## COUNT',
  '',
  `${counts.length} spoken numbers (1–12) from clean/no-effect WAVs. Onset-trimmed, ~520ms max, 55ms fade.`,
  '',
  ...counts.map((item) => `- \`${item.id}.wav\` onset ${item.onsetMs.toFixed(1)}ms duration ${item.durMs.toFixed(0)}ms ← \`${item.source}\``),
  '',
  '## CHOIR',
  '',
  `${choirs.length} production clips from Lyric Choir Theme tracks. Long source tracks are not bundled.`,
  '',
  ...choirs.map(
    (item) =>
      `- \`${item.id}.wav\` theme #${item.track} clip ${item.clip} @ ${item.startMs.toFixed(0)}ms (${item.durMs.toFixed(0)}ms) ← \`${item.source}\``
  ),
  '',
].join('\n');
fs.writeFileSync(REPORT, report);

if (fs.existsSync(MAP)) {
  let map = fs.readFileSync(MAP, 'utf8');
  if (!map.includes('count-1.wav')) {
    map += [
      '',
      '## Count (clean / no-effect)',
      '',
      ...counts.map((item) => `- \`${item.id}.wav\` ← \`${item.source}\``),
      '',
      '## Choir derivatives',
      '',
      ...choirs.map((item) => `- \`${item.id}.wav\` ← \`${item.source}\` @ ${item.startMs.toFixed(0)}ms`),
      '',
    ].join('\n');
    fs.writeFileSync(MAP, map);
  }
}

console.log(JSON.stringify({ counts: counts.length, choirs: choirs.length }, null, 2));

#!/usr/bin/env node
/**
 * Generates POCKT V2 click samples and analog grain.
 * Run: node ./scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SAMPLE_RATE = 44100;
const ROOT = path.join(__dirname, '..');
const SOUND_DIR = path.join(ROOT, 'assets', 'sounds');
const IMAGE_DIR = path.join(ROOT, 'assets', 'images');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function synth(durationMs, fn) {
  const n = Math.max(1, Math.round((SAMPLE_RATE * durationMs) / 1000));
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SAMPLE_RATE;
    samples[i] = fn(t, i, n);
  }
  return samples;
}

function applyEdges(samples, fadeInMs, fadeOutMs) {
  const fadeIn = Math.round((SAMPLE_RATE * fadeInMs) / 1000);
  const fadeOut = Math.round((SAMPLE_RATE * fadeOutMs) / 1000);
  const n = samples.length;
  for (let i = 0; i < n; i += 1) {
    let gain = 1;
    if (i < fadeIn) gain *= i / Math.max(1, fadeIn);
    if (i > n - fadeOut) gain *= (n - i) / Math.max(1, fadeOut);
    samples[i] *= gain;
  }
}

function normalize(samples, peak = 0.89) {
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    max = Math.max(max, Math.abs(samples[i]));
  }
  if (max < 1e-6) return samples;
  const scale = peak / max;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = clamp(samples[i] * scale, -0.97, 0.97);
  }
  return samples;
}

function writeWav(filePath, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const s = clamp(samples[i], -1, 1);
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

function mixAt(target, source, offsetMs, gain = 1) {
  const offset = Math.round((SAMPLE_RATE * offsetMs) / 1000);
  for (let i = 0; i < source.length; i += 1) {
    const j = offset + i;
    if (j >= 0 && j < target.length) target[j] += source[i] * gain;
  }
}

function generateIdent() {
  const rand = mulberry32(0x90c7);
  const samples = synth(2000, () => 0);

  const thump = synth(280, (t) => {
    const pitch = 98 * Math.exp(-t * 18) + 52;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 13);
    const mid = Math.sin(2 * Math.PI * 236 * t) * Math.exp(-t * 15) * 0.62;
    const speaker = Math.sin(2 * Math.PI * 168 * t) * Math.exp(-t * 12) * 0.38;
    const click = Math.sin(2 * Math.PI * 1540 * t) * Math.exp(-t * 86) * 0.1;
    return body * 0.68 + mid + speaker + click;
  });
  applyEdges(thump, 0.28, 18);
  mixAt(samples, thump, 450, 0.78);

  const wood = synth(64, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 420) * 0.3;
    const body =
      Math.sin(2 * Math.PI * 980 * t) * Math.exp(-t * 78) * 0.5 +
      Math.sin(2 * Math.PI * 1720 * t) * Math.exp(-t * 120) * 0.24;
    const tip =
      Math.sin(2 * Math.PI * 3280 * t) * Math.exp(-t * 250) * 0.42 +
      Math.sin(2 * Math.PI * 4920 * t) * Math.exp(-t * 360) * 0.12;
    return noise + body + tip;
  });
  applyEdges(wood, 0.06, 4);
  mixAt(samples, wood, 1150, 0.58);

  const tape = synth(1400, (t) => {
    const hiss = (rand() * 2 - 1) * Math.exp(-t * 2.4) * 0.014;
    const warm =
      Math.sin(2 * Math.PI * 88 * t) * Math.exp(-t * 2.2) * 0.046 +
      Math.sin(2 * Math.PI * 164 * t) * Math.exp(-t * 3.1) * 0.02 +
      Math.sin(2 * Math.PI * 44 * t) * Math.exp(-t * 1.6) * 0.024;
    return hiss + warm;
  });
  applyEdges(tape, 12, 110);
  mixAt(samples, tape, 450, 1);

  applyEdges(samples, 2, 80);
  return normalize(samples, 0.6);
}

function generateClick() {
  const rand = mulberry32(0x51c4);
  const samples = synth(22, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 340);
    const body =
      Math.sin(2 * Math.PI * 1980 * t) * Math.exp(-t * 78) +
      Math.sin(2 * Math.PI * 2960 * t) * Math.exp(-t * 120) * 0.42 +
      Math.sin(2 * Math.PI * 1120 * t) * Math.exp(-t * 52) * 0.22;
    const edge = Math.sin(2 * Math.PI * 4680 * t) * Math.exp(-t * 310) * 0.28;
    return noise * 0.22 + body * 0.78 + edge;
  });
  applyEdges(samples, 0.12, 1.8);
  return normalize(samples, 0.9);
}

function generateClassic() {
  return generateClick();
}

function generateWood() {
  const rand = mulberry32(0x6b20);
  const samples = synth(28, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 280) * 0.22;
    const block =
      Math.sin(2 * Math.PI * 890 * t) * Math.exp(-t * 48) * 0.72 +
      Math.sin(2 * Math.PI * 1480 * t) * Math.exp(-t * 70) * 0.38 +
      Math.sin(2 * Math.PI * 2120 * t) * Math.exp(-t * 110) * 0.16;
    const tip = Math.sin(2 * Math.PI * 3260 * t) * Math.exp(-t * 220) * 0.18;
    return noise + block + tip;
  });
  applyEdges(samples, 0.1, 2.4);
  return normalize(samples, 0.86);
}

function generateStick() {
  const rand = mulberry32(0x7a11);
  const samples = synth(16, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 420);
    const wood =
      Math.sin(2 * Math.PI * 920 * t) * Math.exp(-t * 70) * 0.55 +
      Math.sin(2 * Math.PI * 1640 * t) * Math.exp(-t * 110) * 0.28;
    const tip =
      Math.sin(2 * Math.PI * 3320 * t) * Math.exp(-t * 240) * 0.48 +
      Math.sin(2 * Math.PI * 5100 * t) * Math.exp(-t * 380) * 0.16;
    return noise * 0.38 + wood + tip;
  });
  applyEdges(samples, 0.08, 1.4);
  return normalize(samples, 0.88);
}

function generateClave() {
  const rand = mulberry32(0x2c90);
  const samples = synth(12, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 500) * 0.16;
    const wood =
      Math.sin(2 * Math.PI * 2350 * t) * Math.exp(-t * 95) +
      Math.sin(2 * Math.PI * 1180 * t) * Math.exp(-t * 62) * 0.42 +
      Math.sin(2 * Math.PI * 3520 * t) * Math.exp(-t * 160) * 0.18;
    return noise + wood;
  });
  applyEdges(samples, 0.06, 1.1);
  return normalize(samples, 0.86);
}

function generateKick() {
  const samples = synth(78, (t) => {
    const pitch = 128 * Math.exp(-t * 26) + 52;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 16);
    const speaker = Math.sin(2 * Math.PI * 208 * t) * Math.exp(-t * 20) * 0.72;
    const mid = Math.sin(2 * Math.PI * 360 * t) * Math.exp(-t * 36) * 0.28;
    const click =
      Math.sin(2 * Math.PI * 2650 * t) * Math.exp(-t * 260) * 0.34 +
      Math.sin(2 * Math.PI * 4100 * t) * Math.exp(-t * 400) * 0.14;
    return body * 0.62 + speaker + mid + click;
  });
  applyEdges(samples, 0.35, 8);
  return normalize(samples, 0.91);
}

function generateWarm() {
  const rand = mulberry32(0x33e2);
  const samples = synth(52, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 70) * 0.08;
    const tone =
      Math.sin(2 * Math.PI * 680 * t) * Math.exp(-t * 28) * 0.7 +
      Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 20) * 0.38 +
      Math.sin(2 * Math.PI * 1020 * t) * Math.exp(-t * 48) * 0.12;
    return noise + tone;
  });
  applyEdges(samples, 1.1, 7);
  return normalize(samples, 0.78);
}

function generatePulse() {
  const samples = synth(18, (t) => {
    const tick =
      Math.sin(2 * Math.PI * 1860 * t) * Math.exp(-t * 92) * 0.7 +
      Math.sin(2 * Math.PI * 2740 * t) * Math.exp(-t * 140) * 0.28;
    const body = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 48) * 0.12;
    return tick + body;
  });
  applyEdges(samples, 0.08, 1.6);
  return normalize(samples, 0.88);
}

function generateSubkick() {
  const samples = synth(92, (t) => {
    const pitch = 118 * Math.exp(-t * 22) + 46;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 14);
    const speaker = Math.sin(2 * Math.PI * 196 * t) * Math.exp(-t * 18) * 0.78;
    const mid = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 32) * 0.42;
    const click =
      Math.sin(2 * Math.PI * 2450 * t) * Math.exp(-t * 210) * 0.42 +
      Math.sin(2 * Math.PI * 3900 * t) * Math.exp(-t * 340) * 0.16;
    return body * 0.7 + speaker + mid + click;
  });
  applyEdges(samples, 0.32, 10);
  return normalize(samples, 0.92);
}

function generatePocktStudio() {
  const rand = mulberry32(0x51d0);
  const samples = synth(14, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 480) * 0.12;
    const dry =
      Math.sin(2 * Math.PI * 2360 * t) * Math.exp(-t * 95) * 0.72 +
      Math.sin(2 * Math.PI * 1680 * t) * Math.exp(-t * 70) * 0.28 +
      Math.sin(2 * Math.PI * 4120 * t) * Math.exp(-t * 260) * 0.18;
    return noise + dry;
  });
  applyEdges(samples, 0.05, 1.1);
  return normalize(samples, 0.88);
}

function generatePocktAltered() {
  const rand = mulberry32(0xa11e);
  const samples = synth(36, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 160) * 0.18;
    const warp = 640 + Math.sin(2 * Math.PI * 18 * t) * 90;
    const body =
      Math.sin(2 * Math.PI * warp * t) * Math.exp(-t * 36) * 0.58 +
      Math.sin(2 * Math.PI * (warp * 1.47) * t) * Math.exp(-t * 52) * 0.28;
    const odd = Math.sin(2 * Math.PI * 1511 * t) * Math.exp(-t * 88) * 0.22;
    const tip = Math.sin(2 * Math.PI * 3180 * t) * Math.exp(-t * 210) * 0.26;
    return noise + body + odd + tip;
  });
  applyEdges(samples, 0.12, 3.2);
  return normalize(samples, 0.86);
}

function generatePocktAfterDark() {
  const samples = synth(110, (t) => {
    const pitch = 86 * Math.exp(-t * 16) + 38;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 11);
    const warmth =
      Math.sin(2 * Math.PI * 164 * t) * Math.exp(-t * 14) * 0.55 +
      Math.sin(2 * Math.PI * 246 * t) * Math.exp(-t * 18) * 0.28;
    const club = Math.sin(2 * Math.PI * 92 * t) * Math.exp(-t * 9) * 0.32;
    const tick = Math.sin(2 * Math.PI * 1680 * t) * Math.exp(-t * 150) * 0.2;
    return body * 0.62 + warmth + club + tick;
  });
  applyEdges(samples, 0.4, 14);
  return normalize(samples, 0.9);
}

function generatePocket() {
  const rand = mulberry32(0xc0c7);
  const samples = synth(48, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 220) * 0.1;
    const pitch = 148 * Math.exp(-t * 20) + 72;
    const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 18) * 0.55;
    const funk =
      Math.sin(2 * Math.PI * 540 * t) * Math.exp(-t * 28) * 0.32 +
      Math.sin(2 * Math.PI * 980 * t) * Math.exp(-t * 42) * 0.22;
    const tick =
      Math.sin(2 * Math.PI * 2140 * t) * Math.exp(-t * 120) * 0.38 +
      Math.sin(2 * Math.PI * 3360 * t) * Math.exp(-t * 210) * 0.14;
    return noise + body + funk + tick;
  });
  applyEdges(samples, 0.18, 5);
  return normalize(samples, 0.9);
}

function generateDigitalClick() {
  const samples = synth(10, (t) => {
    return (
      Math.sin(2 * Math.PI * 2850 * t) * Math.exp(-t * 180) * 0.82 +
      Math.sin(2 * Math.PI * 4280 * t) * Math.exp(-t * 260) * 0.22
    );
  });
  applyEdges(samples, 0.04, 0.8);
  return normalize(samples, 0.86);
}

function generateMechanical() {
  const rand = mulberry32(0x51c0);
  const samples = synth(18, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 360) * 0.28;
    const tick = Math.sin(2 * Math.PI * 1680 * t) * Math.exp(-t * 70) * 0.7;
    const metal = Math.sin(2 * Math.PI * 3120 * t) * Math.exp(-t * 210) * 0.2;
    return noise + tick + metal;
  });
  applyEdges(samples, 0.06, 1.4);
  return normalize(samples, 0.84);
}

function generateWoodblock() {
  const rand = mulberry32(0x70b1);
  const samples = synth(24, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 240) * 0.16;
    const body =
      Math.sin(2 * Math.PI * 740 * t) * Math.exp(-t * 42) * 0.7 +
      Math.sin(2 * Math.PI * 1480 * t) * Math.exp(-t * 68) * 0.32;
    return noise + body;
  });
  applyEdges(samples, 0.08, 2.2);
  return normalize(samples, 0.86);
}

function generateRim() {
  const rand = mulberry32(0x8142);
  const samples = synth(14, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 420) * 0.32;
    const snap =
      Math.sin(2 * Math.PI * 2100 * t) * Math.exp(-t * 110) * 0.55 +
      Math.sin(2 * Math.PI * 3650 * t) * Math.exp(-t * 240) * 0.28;
    return noise + snap;
  });
  applyEdges(samples, 0.05, 1.1);
  return normalize(samples, 0.88);
}

function generateCowbell() {
  const samples = synth(36, (t) => {
    const a = Math.sin(2 * Math.PI * 845 * t) * Math.exp(-t * 18);
    const b = Math.sin(2 * Math.PI * 1270 * t) * Math.exp(-t * 22) * 0.62;
    const c = Math.sin(2 * Math.PI * 2540 * t) * Math.exp(-t * 40) * 0.22;
    return a * 0.7 + b + c;
  });
  applyEdges(samples, 0.08, 3.4);
  return normalize(samples, 0.84);
}

function generateBeep() {
  const samples = synth(16, (t) => {
    const env = Math.exp(-t * 55);
    return Math.sin(2 * Math.PI * 1760 * t) * env * 0.86 + Math.sin(2 * Math.PI * 3520 * t) * env * 0.12;
  });
  applyEdges(samples, 0.2, 1.8);
  return normalize(samples, 0.82);
}

function generateSoftClick() {
  const samples = synth(22, (t) => {
    return (
      Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 48) * 0.62 +
      Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 36) * 0.28
    );
  });
  applyEdges(samples, 0.2, 2.4);
  return normalize(samples, 0.74);
}

function generateHardClick() {
  const rand = mulberry32(0x91aa);
  const samples = synth(12, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 520) * 0.22;
    const tick =
      Math.sin(2 * Math.PI * 2680 * t) * Math.exp(-t * 130) * 0.8 +
      Math.sin(2 * Math.PI * 4120 * t) * Math.exp(-t * 240) * 0.28;
    return noise + tick;
  });
  applyEdges(samples, 0.04, 0.9);
  return normalize(samples, 0.9);
}

function generateHighClick() {
  const samples = synth(9, (t) => {
    return (
      Math.sin(2 * Math.PI * 3450 * t) * Math.exp(-t * 200) * 0.78 +
      Math.sin(2 * Math.PI * 5180 * t) * Math.exp(-t * 320) * 0.22
    );
  });
  applyEdges(samples, 0.04, 0.7);
  return normalize(samples, 0.86);
}

function generateLowClick() {
  const samples = synth(28, (t) => {
    const body = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 22) * 0.42;
    const tick = Math.sin(2 * Math.PI * 980 * t) * Math.exp(-t * 48) * 0.62;
    return body + tick;
  });
  applyEdges(samples, 0.12, 2.8);
  return normalize(samples, 0.84);
}

function generateStudioClick() {
  const rand = mulberry32(0xa0c1);
  const samples = synth(13, (t) => {
    const noise = (rand() * 2 - 1) * Math.exp(-t * 460) * 0.1;
    const dry =
      Math.sin(2 * Math.PI * 1980 * t) * Math.exp(-t * 88) * 0.74 +
      Math.sin(2 * Math.PI * 2960 * t) * Math.exp(-t * 160) * 0.22;
    return noise + dry;
  });
  applyEdges(samples, 0.05, 1.1);
  return normalize(samples, 0.87);
}

function generateAccent() {
  const samples = synth(9, (t) => {
    return (
      Math.sin(2 * Math.PI * 2140 * t) * Math.exp(-t * 140) * 0.7 +
      Math.sin(2 * Math.PI * 3860 * t) * Math.exp(-t * 260) * 0.28
    );
  });
  applyEdges(samples, 0.05, 0.9);
  return normalize(samples, 0.72);
}

function generateGrain() {
  const width = 256;
  const height = 256;
  const rgba = Buffer.alloc(width * height * 4);
  const rand = mulberry32(0xc0ffee);
  for (let i = 0; i < width * height; i += 1) {
    const n = rand();
    const warm = 210 + Math.floor(n * 30);
    const alpha = n > 0.72 ? Math.floor((n - 0.72) * 48) : 0;
    const o = i * 4;
    rgba[o] = warm;
    rgba[o + 1] = warm - 12;
    rgba[o + 2] = warm - 28;
    rgba[o + 3] = alpha;
  }
  return { width, height, rgba };
}

function main() {
  ensureDir(SOUND_DIR);
  ensureDir(IMAGE_DIR);
  ensureDir(path.join(ROOT, 'assets', 'audio'));

  writeWav(path.join(SOUND_DIR, 'classic.wav'), generateClassic());
  writeWav(path.join(SOUND_DIR, 'click.wav'), generateClick());
  writeWav(path.join(SOUND_DIR, 'wood.wav'), generateWood());
  writeWav(path.join(SOUND_DIR, 'stick.wav'), generateStick());
  writeWav(path.join(SOUND_DIR, 'clave.wav'), generateClave());
  writeWav(path.join(SOUND_DIR, 'kick.wav'), generateKick());
  writeWav(path.join(SOUND_DIR, 'subkick.wav'), generateSubkick());
  writeWav(path.join(SOUND_DIR, 'warm.wav'), generateWarm());
  writeWav(path.join(SOUND_DIR, 'pulse.wav'), generatePulse());
  writeWav(path.join(SOUND_DIR, 'pockt-studio.wav'), generatePocktStudio());
  writeWav(path.join(SOUND_DIR, 'pockt-altered.wav'), generatePocktAltered());
  writeWav(path.join(SOUND_DIR, 'pockt-after-dark.wav'), generatePocktAfterDark());
  writeWav(path.join(SOUND_DIR, 'pocket.wav'), generatePocket());
  writeWav(path.join(SOUND_DIR, 'accent.wav'), generateAccent());
  writeWav(path.join(ROOT, 'assets', 'audio', 'pockt-ident.wav'), generateIdent());

  const toolsDir = path.join(ROOT, 'assets', 'audio', 'tools');
  ensureDir(toolsDir);
  writeWav(path.join(toolsDir, 'digital-click.wav'), generateDigitalClick());
  writeWav(path.join(toolsDir, 'mechanical.wav'), generateMechanical());
  writeWav(path.join(toolsDir, 'woodblock.wav'), generateWoodblock());
  writeWav(path.join(toolsDir, 'rim.wav'), generateRim());
  writeWav(path.join(toolsDir, 'cowbell.wav'), generateCowbell());
  writeWav(path.join(toolsDir, 'beep.wav'), generateBeep());
  writeWav(path.join(toolsDir, 'soft-click.wav'), generateSoftClick());
  writeWav(path.join(toolsDir, 'hard-click.wav'), generateHardClick());
  writeWav(path.join(toolsDir, 'high-click.wav'), generateHighClick());
  writeWav(path.join(toolsDir, 'low-click.wav'), generateLowClick());
  writeWav(path.join(toolsDir, 'studio-click.wav'), generateStudioClick());

  const grain = generateGrain();
  writePng(path.join(IMAGE_DIR, 'grain.png'), grain.width, grain.height, grain.rgba);

  console.log('Generated POCKT sounds and ident.');
}

main();

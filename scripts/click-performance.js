/**
 * Shared click-envelope math for the offline matrix.
 * The native bank applies the same hold, tau, and tail in PocktClickBank.shapeForMetronome.
 * Attack samples at and before the peak are kept. The tail is an exponential decay, not a hard cut.
 */
const HOLD_SEC = 0.008;
const TAU_GENERAL = 0.0065;
const TAIL_GENERAL = 0.034;
const TAU_SPECIAL = 0.04;
const TAIL_SPECIAL = 0.15;
const DENSE_SEC = 60 / 400 / 4;

function isSpecialKey(key) {
  return key.startsWith('count') || key.startsWith('lib-choir') || key.startsWith('lib-vocal');
}

function analyzePcm(samples, rate) {
  let peak = 0;
  let peakIndex = 0;
  let sum = 0;
  let crossings = 0;
  let prev = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i];
    sum += v;
    const a = Math.abs(v);
    if (a > peak) {
      peak = a;
      peakIndex = i;
    }
    if ((prev <= 0 && v > 0) || (prev >= 0 && v < 0)) crossings += 1;
    prev = v;
  }
  const mean = samples.length ? sum / samples.length : 0;
  let energy = 0;
  let tail = 0;
  const tailStart = peakIndex + Math.round(0.02 * rate);
  for (let i = 0; i < samples.length; i += 1) {
    const d = samples[i] - mean;
    energy += d * d;
    if (i >= tailStart) tail += d * d;
  }
  const rms = Math.sqrt(energy / Math.max(1, samples.length));
  const attackEnd = Math.min(samples.length, peakIndex + Math.round(HOLD_SEC * rate));
  let attackCross = 0;
  for (let i = peakIndex + 1; i < attackEnd; i += 1) {
    if ((samples[i - 1] <= 0 && samples[i] > 0) || (samples[i - 1] >= 0 && samples[i] < 0)) attackCross += 1;
  }
  const attackFrames = Math.max(1, attackEnd - peakIndex);
  const brightness = (attackCross / attackFrames) * rate * 0.5;
  let pre = 0;
  const floor = peak * 0.02;
  for (let i = 0; i < peakIndex; i += 1) {
    if (Math.abs(samples[i]) < floor) pre += 1;
    else break;
  }
  let last = 0;
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) >= floor) last = i;
  }
  let first = samples.length;
  for (let i = 0; i < samples.length; i += 1) {
    if (Math.abs(samples[i]) >= floor) {
      first = i;
      break;
    }
  }
  return {
    peak,
    peakIndex,
    rms,
    crest: rms > 0 ? peak / rms : 0,
    dc: mean,
    brightness,
    preRollSec: pre / rate,
    tailRatio: energy > 0 ? tail / energy : 0,
    effectiveSec: Math.max(0, (last - first) / rate),
    crossings,
  };
}

function shapeSamples(samples, rate, special) {
  let peak = 0;
  let peakIndex = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const a = Math.abs(samples[i]);
    if (a > peak) {
      peak = a;
      peakIndex = i;
    }
  }
  if (peak < 0.0001) return samples.slice();
  const hold = Math.round(HOLD_SEC * rate);
  const maxTail = Math.round((special ? TAIL_SPECIAL : TAIL_GENERAL) * rate);
  const tau = (special ? TAU_SPECIAL : TAU_GENERAL) * rate;
  const pre = Math.round(0.0015 * rate);
  const start = Math.max(0, peakIndex - pre);
  const end = Math.min(samples.length, peakIndex + maxTail);
  const out = new Float64Array(end - start);
  for (let i = 0; i < out.length; i += 1) {
    const sourceIndex = start + i;
    const fromPeak = sourceIndex - peakIndex;
    let gain = 1;
    if (fromPeak > hold) gain = Math.exp(-(fromPeak - hold) / tau);
    if (fromPeak >= maxTail - 1) gain = 0;
    let sample = samples[sourceIndex] * gain;
    if (sample > 0.98) sample = 0.98;
    if (sample < -0.98) sample = -0.98;
    out[i] = sample;
  }
  return out;
}

function readWav(file, fs) {
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
      data = buf.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (!data || !rate || !channels) return null;
  const bytes = bits === 24 ? 3 : bits === 32 ? 4 : 2;
  const frames = Math.floor(data.length / (bytes * channels));
  const samples = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let acc = 0;
    for (let c = 0; c < channels; c += 1) {
      const o = (i * channels + c) * bytes;
      let v = 0;
      if (bits === 16) v = data.readInt16LE(o) / 32768;
      else if (bits === 24) {
        const b0 = data[o];
        const b1 = data[o + 1];
        const b2 = data[o + 2];
        let n = b0 | (b1 << 8) | (b2 << 16);
        if (n & 0x800000) n |= ~0xffffff;
        v = n / 8388608;
      } else if (bits === 32) v = data.readFloatLE(o);
      acc += v;
    }
    samples[i] = acc / channels;
  }
  return { rate, samples };
}

module.exports = {
  HOLD_SEC,
  TAU_GENERAL,
  TAIL_GENERAL,
  DENSE_SEC,
  isSpecialKey,
  analyzePcm,
  shapeSamples,
  readWav,
};

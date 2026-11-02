#!/usr/bin/env node
'use strict';

/**
 * External acoustic validation for POCKT V8.6.
 *
 * This script does NOT invent speaker timestamps. It only analyzes a WAV
 * recording of the metronome output (line-out, meeting-record, or DAW capture).
 *
 * Method:
 * 1. Play POCKT on a physical iPhone at a known BPM/subdivision for >= 60 s.
 * 2. Record the analog/digital output to a mono or stereo WAV (44.1 or 48 kHz).
 * 3. Run:
 *      node scripts/validate-click-recording.js --file click-400q.wav --bpm 400 --subdivision quarter
 *
 * The detector finds onset peaks above a threshold and reports:
 *   average interval, min, max, stddev/jitter, cumulative phase error.
 *
 * These are physical-output measurements only if the WAV is a real capture.
 */

const fs = require('fs');
const path = require('path');
const { expectedIntervalSeconds } = require('./timing-math.cjs');

function parseArgs(argv) {
  const args = { file: null, bpm: 120, subdivision: 'quarter', threshold: 0.35 };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--file') args.file = value;
    if (key === '--bpm') args.bpm = Number(value);
    if (key === '--subdivision') args.subdivision = value;
    if (key === '--threshold') args.threshold = Number(value);
  }
  return args;
}

function readWavPcm(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === 'fmt ') {
      format = {
        audioFormat: buf.readUInt16LE(start),
        channels: buf.readUInt16LE(start + 2),
        sampleRate: buf.readUInt32LE(start + 4),
        bitsPerSample: buf.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(start, start + size);
    }
    offset = start + size + (size % 2);
  }
  if (!format || !data) throw new Error('WAV missing fmt or data chunk');
  if (format.audioFormat !== 1 || (format.bitsPerSample !== 16 && format.bitsPerSample !== 24)) {
    throw new Error('Only PCM 16/24-bit WAV is supported');
  }
  const bytes = format.bitsPerSample / 8;
  const frames = Math.floor(data.length / (bytes * format.channels));
  const samples = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let mix = 0;
    for (let ch = 0; ch < format.channels; ch += 1) {
      const pos = (i * format.channels + ch) * bytes;
      if (bytes === 2) mix += data.readInt16LE(pos) / 32768;
      else {
        const b0 = data[pos];
        const b1 = data[pos + 1];
        const b2 = data[pos + 2];
        let value = (b2 << 16) | (b1 << 8) | b0;
        if (value & 0x800000) value |= ~0xffffff;
        mix += value / 8388608;
      }
    }
    samples[i] = mix / format.channels;
  }
  return { sampleRate: format.sampleRate, samples };
}

function detectOnsets(samples, sampleRate, threshold) {
  const envelope = new Float64Array(samples.length);
  let env = 0;
  const attack = Math.exp(-1 / (sampleRate * 0.001));
  const release = Math.exp(-1 / (sampleRate * 0.012));
  for (let i = 0; i < samples.length; i += 1) {
    const abs = Math.abs(samples[i]);
    env = abs > env ? attack * env + (1 - attack) * abs : release * env + (1 - release) * abs;
    envelope[i] = env;
  }
  const cooldown = Math.floor(sampleRate * 0.012);
  const times = [];
  let last = -cooldown;
  for (let i = 1; i < envelope.length - 1; i += 1) {
    if (i - last < cooldown) continue;
    if (envelope[i] >= threshold && envelope[i] >= envelope[i - 1] && envelope[i] > envelope[i + 1]) {
      times.push(i / sampleRate);
      last = i;
    }
  }
  return times;
}

function stats(values) {
  if (!values.length) {
    return { avg: NaN, min: NaN, max: NaN, std: NaN };
  }
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((a, b) => a + (b - avg) * (b - avg), 0) / values.length;
  return { avg, min, max, std: Math.sqrt(variance) };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.log(`Usage:
  node scripts/validate-click-recording.js --file recording.wav --bpm 400 --subdivision quarter

Records a real WAV of POCKT output, detects click onsets, and compares them
to the theoretical interval. Do not treat these numbers as measured unless
the WAV is an actual device capture.`);
    process.exit(2);
  }

  const wavPath = path.resolve(args.file);
  const { sampleRate, samples } = readWavPcm(wavPath);
  const times = detectOnsets(samples, sampleRate, args.threshold);
  const expected = expectedIntervalSeconds(args.bpm, args.subdivision);
  const intervals = [];
  for (let i = 1; i < times.length; i += 1) intervals.push(times[i] - times[i - 1]);
  const intervalStats = stats(intervals);

  let phase = 0;
  let maxAbsPhase = 0;
  for (const interval of intervals) {
    phase += interval - expected;
    maxAbsPhase = Math.max(maxAbsPhase, Math.abs(phase));
  }

  const result = {
    file: wavPath,
    sampleRate,
    bpm: args.bpm,
    subdivision: args.subdivision,
    expectedIntervalSeconds: expected,
    expectedIntervalMs: expected * 1000,
    detectedOnsets: times.length,
    averageIntervalSeconds: intervalStats.avg,
    minIntervalSeconds: intervalStats.min,
    maxIntervalSeconds: intervalStats.max,
    jitterStdDevSeconds: intervalStats.std,
    cumulativePhaseErrorSeconds: phase,
    maxAbsCumulativePhaseErrorSeconds: maxAbsPhase,
    measurementKind: 'acoustic-wav-onset-detection',
    note: 'Valid only for an actual recording of device audio output.',
  };

  console.log(JSON.stringify(result, null, 2));
  if (times.length < 8) {
    console.error('Too few onsets detected. Adjust --threshold or check the recording.');
    process.exit(1);
  }
}

main();

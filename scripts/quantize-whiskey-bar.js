'use strict';

/**
 * Dev-only remapper. Never imported by the app. Never ships ffmpeg.
 *
 * Maps v2 perceptual cues onto 0.500 / 1.500 / 2.500 / 3.500 so uniform
 * playbackRate = BPM / 60 can follow the native clock.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CUES = [21 / 24, 37 / 24, 76 / 24, 90 / 24];
const LOOP = 4;

function ffmpegBin() {
  const fromEnv = process.env.FFMPEG_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const local = path.join(os.homedir(), 'AppData', 'Local', 'POCKT-dev', 'ffmpeg', 'ffmpeg.exe');
  if (fs.existsSync(local)) return local;
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], {
    encoding: 'utf8',
  });
  if (which.status === 0) {
    const hit = which.stdout.split(/\r?\n/)[0].trim();
    if (hit) return hit;
  }
  return null;
}

function wrapSegments() {
  const pairs = [];
  for (let i = 0; i < 4; i += 1) {
    const start = CUES[i];
    const rawEnd = CUES[(i + 1) % 4];
    const end = rawEnd > start ? rawEnd : rawEnd + LOOP;
    pairs.push({ start, end });
  }
  return pairs;
}

function segmentFilters() {
  const pairs = wrapSegments();
  const parts = [];
  const labels = [];
  let idx = 0;
  pairs.forEach((pair, i) => {
    const chunks = [];
    if (pair.end <= LOOP) {
      chunks.push({ start: pair.start, end: pair.end });
    } else {
      chunks.push({ start: pair.start, end: LOOP });
      chunks.push({ start: 0, end: pair.end - LOOP });
    }
    const sourceDelta = pair.end - pair.start;
    const stretch = 1 / sourceDelta;
    const chunkLabels = [];
    chunks.forEach((chunk) => {
      const label = `c${idx}`;
      idx += 1;
      parts.push(
        `[0:v]trim=start=${chunk.start}:end=${chunk.end},setpts=PTS-STARTPTS,setpts=PTS*${stretch}[${label}]`
      );
      chunkLabels.push(label);
    });
    if (chunkLabels.length === 1) {
      labels.push(chunkLabels[0]);
      return;
    }
    const joined = `w${i}`;
    parts.push(`${chunkLabels.map((l) => `[${l}]`).join('')}concat=n=${chunkLabels.length}:v=1:a=0[${joined}]`);
    labels.push(joined);
  });
  parts.push(`${labels.map((l) => `[${l}]`).join('')}concat=n=4:v=1:a=0,fps=24,trim=start=0:end=4,setpts=PTS-STARTPTS,format=yuv420p[outv]`);
  return parts.join(';');
}

function inspect(file) {
  const ffprobe = ffmpegBin() ? ffmpegBin().replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1') : null;
  if (!ffprobe || !fs.existsSync(ffprobe)) return null;
  const result = spawnSync(
    ffprobe,
    ['-v', 'error', '-show_entries', 'format=duration:stream=width,height,avg_frame_rate,nb_frames,codec_type', '-of', 'json', file],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

function main() {
  const ffmpeg = ffmpegBin();
  const root = path.join(__dirname, '..');
  const input = path.join(root, 'assets/skins/bar/whiskey-bar-living-v2.mp4');
  const output = path.join(root, 'assets/skins/bar/whiskey-bar-living-v3-quantized.mp4');
  if (!ffmpeg) {
    console.log('ffmpeg not available');
    process.exit(2);
  }
  if (!fs.existsSync(input)) {
    console.error('missing v2 source');
    process.exit(1);
  }
  console.log('ffmpeg', ffmpeg);
  console.log('filter', segmentFilters());
  const result = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i',
      input,
      '-filter_complex',
      segmentFilters(),
      '-map',
      '[outv]',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '24',
      '-frames:v',
      '96',
      '-movflags',
      '+faststart',
      output,
    ],
    { stdio: 'inherit' }
  );
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
  const info = inspect(output);
  if (info) console.log(JSON.stringify(info, null, 2));
  console.log('wrote', output, fs.statSync(output).size);
}

if (require.main === module) main();

module.exports = { ffmpegBin, segmentFilters, wrapSegments, CUES };

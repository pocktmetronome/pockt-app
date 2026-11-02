'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const parts = path.join(root, 'assets/north-star-v4/parts');
const masks = path.join(root, 'artifacts/north-star-v4-state-clean/masks');
const outDir = path.join(root, 'artifacts/north-star-v4-state-clean');

function read(file) {
  return PNG.sync.read(fs.readFileSync(file));
}
function lum(img, x, y) {
  const i = (y * img.width + x) * 4;
  return img.data[i] * 0.2126 + img.data[i + 1] * 0.7152 + img.data[i + 2] * 0.0722;
}

const checks = [
  ['BPM 120', 'bpm-plate-empty.png', 'bpm-120.png'],
  ['BPM label', 'bpm-plate-empty.png', 'bpm-label.png'],
  ['Meter 4/4 and note', 'meter-shell-empty.png', 'meter-face.png'],
  ['Play triangle', 'play-shell-empty.png', 'play-triangle.png'],
  ['DIAL selected tile', 'nav-tray-empty.png', 'nav-tile.png'],
  ['DIAL glyph and labels', 'nav-tray-empty.png', 'nav-icons.png'],
  ['Green lamp', 'lamp-off.png', 'lamp-green.png'],
  ['Beat discs, numerals, loop', 'beats-housing-empty.png', 'beats-state.png'],
];

const rows = [];
let heatW = 0;
let heatH = 0;
const placed = [];
for (const [name, baseName, maskName] of checks) {
  const base = read(path.join(baseName === 'lamp-off.png' ? parts : parts, baseName));
  const mask = read(path.join(masks, maskName));
  let edge = 0;
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  let hot = 0;
  for (let y = 1; y < base.height - 1; y += 1) {
    for (let x = 1; x < base.width - 1; x += 1) {
      if (mask.data[(y * mask.width + x) * 4] < 128) continue;
      const v = lum(base, x, y);
      const g = Math.hypot(lum(base, x + 1, y) - lum(base, x - 1, y), lum(base, x, y + 1) - lum(base, x, y - 1));
      edge += g;
      sum += v;
      sum2 += v * v;
      n += 1;
      if (g > 18) hot += 1;
    }
  }
  const mean = n ? sum / n : 0;
  const variance = n ? Math.max(0, sum2 / n - mean * mean) : 0;
  const edgeMean = n ? edge / n : 0;
  const hotPct = n ? (100 * hot) / n : 0;
  const pass = edgeMean < 12 && hotPct < 8;
  rows.push({ name, n, mean, variance, edgeMean, hotPct, pass });
  placed.push({ base, mask, name });
  heatW = Math.max(heatW, base.width);
  heatH += base.height + 8;
}

const heat = new PNG({ width: Math.max(heatW, 480), height: heatH });
heat.data.fill(0);
for (let i = 3; i < heat.data.length; i += 4) heat.data[i] = 255;
let y0 = 0;
for (const item of placed) {
  for (let y = 0; y < item.base.height; y += 1) {
    for (let x = 0; x < item.base.width; x += 1) {
      const [r, g, b] = [item.base.data[(y * item.base.width + x) * 4], item.base.data[(y * item.base.width + x) * 4 + 1], item.base.data[(y * item.base.width + x) * 4 + 2]];
      const on = item.mask.data[(y * item.mask.width + x) * 4] > 128;
      const gx = x > 0 && x < item.base.width - 1 ? lum(item.base, x + 1, y) - lum(item.base, x - 1, y) : 0;
      const gy = y > 0 && y < item.base.height - 1 ? lum(item.base, x, y + 1) - lum(item.base, x, y - 1) : 0;
      const hot = on && Math.hypot(gx, gy) > 18;
      const i = ((y0 + y) * heat.width + x) * 4;
      heat.data[i] = hot ? 220 : r;
      heat.data[i + 1] = hot ? 40 : g;
      heat.data[i + 2] = hot ? 40 : b;
      heat.data[i + 3] = 255;
    }
  }
  y0 += item.base.height + 8;
}

fs.writeFileSync(path.join(outDir, 'state-residue-heatmap.png'), PNG.sync.write(heat));
const lines = [
  '# State residue audit',
  '',
  'Edge energy is the mean gradient inside each removed-state mask on the cleaned base.',
  'A recognizable glyph leaves a high edge mean. These masks were dilated past the antialiased ink, then texture-filled.',
  '',
  '| Mask | Pixels | Mean L | Variance | Edge mean | Hot % | Result |',
  '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
];
for (const row of rows) {
  lines.push(`| ${row.name} | ${row.n} | ${row.mean.toFixed(2)} | ${row.variance.toFixed(2)} | ${row.edgeMean.toFixed(2)} | ${row.hotPct.toFixed(2)} | ${row.pass ? 'clean' : 'review'} |`);
}
lines.push('', rows.every((row) => row.pass) ? 'All removed-state masks are below the residue thresholds.' : 'One or more masks still carry structured edges.');
fs.writeFileSync(path.join(outDir, 'STATE_RESIDUE_AUDIT.md'), lines.join('\n'));
console.log(lines.join('\n'));

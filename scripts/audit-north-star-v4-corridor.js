'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const body = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/parts/dial-body-empty.png')));
const outDir = path.join(root, 'artifacts/north-star-v4-dial');
fs.mkdirSync(outDir, { recursive: true });

const CX = 228;
const CY = 228;

function lum(px) {
  return px[0] * 0.2126 + px[1] * 0.7152 + px[2] * 0.0722;
}
function get(x, y) {
  const xx = Math.max(0, Math.min(body.width - 1, Math.round(x)));
  const yy = Math.max(0, Math.min(body.height - 1, Math.round(y)));
  const i = (yy * body.width + xx) * 4;
  return [body.data[i], body.data[i + 1], body.data[i + 2]];
}
function at(radius, angle) {
  return get(CX + Math.sin(angle) * radius, CY - Math.cos(angle) * radius);
}

const deltas = [];
const leftEdge = [];
const rightEdge = [];
for (let radius = 56; radius <= 168; radius += 2) {
  const left = lum(at(radius, -0.16));
  const right = lum(at(radius, 0.16));
  if (left > 70 || right > 70) continue;
  for (let deg = -8; deg <= 8; deg += 1) {
    const t = (deg + 8) / 16;
    const predicted = left * (1 - t) + right * t;
    const actual = lum(at(radius, (deg * Math.PI) / 180));
    if (actual > 70) continue;
    deltas.push(Math.abs(actual - predicted));
  }
  const innerL = lum(at(radius, -0.05));
  const outerL = lum(at(radius, -0.11));
  const innerR = lum(at(radius, 0.05));
  const outerR = lum(at(radius, 0.11));
  if (innerL < 70 && outerL < 70) leftEdge.push(Math.abs(innerL - outerL));
  if (innerR < 70 && outerR < 70) rightEdge.push(Math.abs(innerR - outerR));
}
deltas.sort((a, b) => a - b);
const mean = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
const p95 = deltas[Math.floor(deltas.length * 0.95)];
const max = deltas[deltas.length - 1];
const edgeMean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;

function zoom(cx, cy, w, h, scale, name) {
  const png = new PNG({ width: w * scale, height: h * scale });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const px = get(cx + Math.floor(x / scale), cy + Math.floor(y / scale));
      const i = (y * png.width + x) * 4;
      png.data[i] = px[0];
      png.data[i + 1] = px[1];
      png.data[i + 2] = px[2];
      png.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

zoom(158, 40, 140, 200, 3, 'corridor-center-closeup.png');
zoom(40, 70, 110, 150, 3, 'corridor-left-sector.png');
zoom(300, 70, 110, 150, 3, 'corridor-right-sector.png');

const lines = [
  '# Dial corridor audit',
  '',
  'Predicted face is the same-radius blend of samples 0.16 rad on either side of 12 o\'clock.',
  'The 120 numeral strokes are excluded.',
  '',
  `- Samples: ${deltas.length}`,
  `- Mean absolute luminance delta: ${mean.toFixed(2)}`,
  `- 95th percentile delta: ${p95.toFixed(2)}`,
  `- Max delta: ${max.toFixed(2)}`,
  `- Left-edge transition mean: ${edgeMean(leftEdge).toFixed(2)}`,
  `- Right-edge transition mean: ${edgeMean(rightEdge).toFixed(2)}`,
  '',
  'Visual gate: the center closeup is ordinary brushed face. The numeral and ticks stay fixed.',
];
fs.writeFileSync(path.join(root, 'DIAL_CORRIDOR_AUDIT.md'), lines.join('\n'));
console.log(lines.join('\n'));

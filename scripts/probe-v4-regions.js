'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/north-star-v4/screen-reference.png')));
const W = src.width;
const H = src.height;
const out = path.join(root, 'artifacts/v4-probe');
fs.mkdirSync(out, { recursive: true });

function lum(x, y) {
  const i = (y * W + x) * 4;
  return src.data[i] * 0.2126 + src.data[i + 1] * 0.7152 + src.data[i + 2] * 0.0722;
}
function rgb(x, y) {
  const i = (y * W + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2]];
}

function crop(name, x, y, w, h) {
  const png = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const s = ((y + yy) * W + (x + xx)) * 4;
      const d = (yy * w + xx) * 4;
      png.data[d] = src.data[s];
      png.data[d + 1] = src.data[s + 1];
      png.data[d + 2] = src.data[s + 2];
      png.data[d + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(out, name), PNG.sync.write(png));
}

function rowRuns(y, minL) {
  const runs = [];
  let start = -1;
  for (let x = 0; x < W; x++) {
    const on = lum(x, y) >= minL;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, W - 1]);
  return runs.filter((r) => r[1] - r[0] > 8);
}

console.log('size', W, H);
for (const y of [20, 40, 55, 70, 90, 110, 130, 150, 200, 390, 640, 680, 760, 790, 850, 880]) {
  console.log('y', y, 'L40', JSON.stringify(rowRuns(y, 40)), 'L80', JSON.stringify(rowRuns(y, 80)));
}

// sample colors
for (const [x, y] of [[10, 400], [249, 250], [249, 300], [249, 390], [250, 115], [250, 145], [80, 140], [420, 140]]) {
  console.log('px', x, y, rgb(x, y).join(','), 'L', lum(x, y).toFixed(1));
}

crop('header.png', 0, 0, 492, 100);
crop('tempo.png', 0, 80, 492, 120);
crop('dial-center.png', 180, 300, 140, 180);
crop('beats.png', 0, 600, 492, 140);
crop('transport.png', 0, 720, 492, 120);
crop('nav.png', 0, 810, 492, 100);
crop('bpm-plate.png', 140, 85, 210, 90);

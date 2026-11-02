'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../assets/north-star-v4/screen-reference.png')));
const W = src.width;
function lum(x, y) {
  const i = (y * W + x) * 4;
  return src.data[i] * 0.2126 + src.data[i + 1] * 0.7152 + src.data[i + 2] * 0.0722;
}
function scan(y) {
  let s = '';
  for (let x = 0; x < W; x += 2) {
    const L = lum(x, y);
    s += L > 180 ? '#' : L > 80 ? '+' : L > 30 ? '.' : ' ';
  }
  console.log(String(y).padStart(3, ' '), s);
}
for (const y of [30, 50, 110, 140, 650, 670, 700, 750, 780, 845, 870]) scan(y);

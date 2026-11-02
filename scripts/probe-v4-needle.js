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
const cx = 249;
for (const y of [220, 250, 280, 310, 340, 370]) {
  const row = [];
  for (let x = cx - 20; x <= cx + 20; x++) row.push(Math.round(lum(x, y)).toString().padStart(3, ' '));
  console.log(y, row.join(' '));
}
console.log('--- plate well ---');
for (const y of [100, 110, 120, 130, 140, 150, 160]) {
  const row = [];
  for (let x = 160; x <= 340; x += 4) row.push(Math.round(lum(x, y)).toString().padStart(3, ' '));
  console.log(y, row.join(''));
}

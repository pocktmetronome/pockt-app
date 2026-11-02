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
function profile(y0, y1, minL) {
  const cols = [];
  for (let x = 0; x < W; x++) {
    let n = 0;
    let yFirst = -1;
    let yLast = -1;
    for (let y = y0; y < y1; y++) {
      if (lum(x, y) >= minL) {
        n++;
        if (yFirst < 0) yFirst = y;
        yLast = y;
      }
    }
    if (n > 4) cols.push({ x, n, yFirst, yLast });
  }
  // group consecutive
  const groups = [];
  for (const c of cols) {
    const prev = groups[groups.length - 1];
    if (!prev || c.x > prev.x1 + 3) groups.push({ x0: c.x, x1: c.x, y0: c.yFirst, y1: c.yLast, n: c.n });
    else {
      prev.x1 = c.x;
      prev.y0 = Math.min(prev.y0, c.yFirst);
      prev.y1 = Math.max(prev.y1, c.yLast);
      prev.n += c.n;
    }
  }
  return groups;
}
for (const [name, y0, y1, minL] of [
  ['header30', 0, 96, 30],
  ['tempo50', 88, 190, 50],
  ['beats30', 620, 735, 30],
  ['transport40', 730, 825, 40],
  ['nav30', 828, 905, 30],
]) {
  console.log('\n' + name);
  for (const g of profile(y0, y1, minL)) {
    if (g.n < 40) continue;
    console.log(`  x ${g.x0}-${g.x1} (${g.x1 - g.x0 + 1}) y ${g.y0}-${g.y1} n=${g.n}`);
  }
}

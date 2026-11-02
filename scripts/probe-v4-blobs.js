'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../assets/north-star-v4/screen-reference.png')));
const W = src.width;
const H = src.height;
function lum(x, y) {
  const i = (y * W + x) * 4;
  return src.data[i] * 0.2126 + src.data[i + 1] * 0.7152 + src.data[i + 2] * 0.0722;
}
function blobs(y0, y1, minL, minArea) {
  const seen = new Uint8Array(W * (y1 - y0));
  const out = [];
  const at = (x, y) => (y - y0) * W + x;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < W; x++) {
      if (seen[at(x, y)] || lum(x, y) < minL) continue;
      let x0 = x, x1 = x, yy0 = y, yy1 = y, n = 0;
      const stack = [[x, y]];
      seen[at(x, y)] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        n++;
        if (cx < x0) x0 = cx;
        if (cx > x1) x1 = cx;
        if (cy < yy0) yy0 = cy;
        if (cy > yy1) yy1 = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < y0 || nx >= W || ny >= y1) continue;
          if (seen[at(nx, ny)] || lum(nx, ny) < minL) continue;
          seen[at(nx, ny)] = 1;
          stack.push([nx, ny]);
        }
      }
      if (n >= minArea) out.push({ x: x0, y: yy0, w: x1 - x0 + 1, h: yy1 - yy0 + 1, n });
    }
  }
  out.sort((a, b) => a.x - b.x);
  return out;
}

for (const [name, y0, y1, minL, minA] of [
  ['header', 0, 100, 28, 200],
  ['tempo', 80, 200, 40, 300],
  ['beats', 600, 740, 28, 200],
  ['transport', 720, 840, 28, 200],
  ['nav', 820, 910, 22, 80],
]) {
  console.log('\n' + name);
  for (const b of blobs(y0, y1, minL, minA)) {
    console.log(`  ${b.x},${b.y} ${b.w}x${b.h} n=${b.n}`);
  }
}

// nav luminance profile
let navMax = 0;
let navY = 0;
for (let y = 800; y < 910; y++) {
  let s = 0;
  for (let x = 20; x < 470; x++) s += lum(x, y);
  if (s > navMax) {
    navMax = s;
    navY = y;
  }
}
console.log('nav brightest row', navY, (navMax / 450).toFixed(1));
for (const y of [830, 840, 850, 860, 870, 880, 890, 900]) {
  let mx = 0;
  for (let x = 0; x < W; x++) mx = Math.max(mx, lum(x, y));
  console.log('maxL', y, mx.toFixed(1));
}

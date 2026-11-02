'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const src = PNG.sync.read(fs.readFileSync(path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png')));
const W = src.width;
const H = src.height;

function pix(x, y) {
  const xx = Math.max(0, Math.min(W - 1, x | 0));
  const yy = Math.max(0, Math.min(H - 1, y | 0));
  const o = (yy * W + xx) * 4;
  return [src.data[o], src.data[o + 1], src.data[o + 2]];
}
function luma(x, y) {
  const c = pix(x, y);
  return (c[0] + c[1] + c[2]) / 3;
}
function gold(x, y) {
  const c = pix(x, y);
  return c[0] > 150 && c[0] > c[2] + 28 && c[1] > 70;
}

function fitCircle() {
  let best = { dev: 1e9 };
  for (let cy = 480; cy <= 680; cy += 2) {
    for (let cx = 400; cx <= 560; cx += 2) {
      const radii = [];
      for (let t = 0; t < 36; t += 1) {
        const a = ((t * 10 + 15) * Math.PI) / 180;
        let found = 0;
        for (let r = 70; r < 200; r += 1) {
          const x = Math.round(cx + Math.cos(a) * r);
          const y = Math.round(cy + Math.sin(a) * r);
          if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) break;
          if (luma(x, y) > 90 && luma(Math.round(x - Math.cos(a) * 6), Math.round(y - Math.sin(a) * 6)) < 35) {
            found = r;
            break;
          }
        }
        if (found > 80 && found < 180) radii.push(found);
      }
      if (radii.length < 24) continue;
      const mean = radii.reduce((s, v) => s + v, 0) / radii.length;
      const dev = Math.sqrt(radii.reduce((s, v) => s + (v - mean) ** 2, 0) / radii.length);
      if (dev < best.dev) best = { dev, mean, n: radii.length, cx, cy };
    }
  }
  return best;
}

function boundsOf(pred, x0, y0, x1, y1) {
  let minX = 1e9;
  let minY = 1e9;
  let maxX = 0;
  let maxY = 0;
  let n = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (!pred(x, y)) continue;
      n += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!n) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, n };
}

function rectOf(box) {
  const cx = box.x + (box.width - 1) / 2;
  const cy = box.y + (box.height - 1) / 2;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    centerX: Math.round(cx * 100) / 100,
    centerY: Math.round(cy * 100) / 100,
  };
}

const dial = fitCircle();
console.log('dial fit', dial);

const windows = {
  tuner: [40, 70, 280, 230],
  sound: [660, 70, 910, 230],
  wordmark: [300, 70, 640, 200],
  minus: [20, 620, 180, 860],
  plus: [760, 620, 930, 860],
  loop: [680, 900, 920, 1120],
  tap: [40, 1120, 460, 1320],
  play: [470, 1120, 900, 1320],
  meter: [40, 1280, 460, 1480],
  p: [470, 1280, 900, 1480],
  nav: [30, 1460, 910, 1660],
};

const objects = {};
objects.dialCenter = {
  x: Math.round(dial.cx - dial.mean),
  y: Math.round(dial.cy - dial.mean),
  width: Math.round(dial.mean * 2),
  height: Math.round(dial.mean * 2),
  centerX: dial.cx,
  centerY: dial.cy,
  radius: Math.round(dial.mean * 100) / 100,
};
objects.dialOuter = objects.dialCenter;

for (const [name, win] of Object.entries(windows)) {
  const box = boundsOf((x, y) => gold(x, y) && luma(x, y) > 80, win[0], win[1], win[2], win[3]);
  objects[name] = box ? rectOf(box) : null;
  console.log(name, objects[name]);
}

const lampCenters = [];
for (let x = 60; x < 700; x += 2) {
  for (let y = 900; y < 1100; y += 2) {
    if (luma(x, y) > 210 && pix(x, y)[0] > 200) lampCenters.push([x, y]);
  }
}
const groups = [];
for (const point of lampCenters) {
  const group = groups.find((item) => Math.hypot(item.x - point[0], item.y - point[1]) < 30);
  if (group) {
    group.xs.push(point[0]);
    group.ys.push(point[1]);
    group.x = group.xs.reduce((s, v) => s + v, 0) / group.xs.length;
    group.y = group.ys.reduce((s, v) => s + v, 0) / group.ys.length;
  } else groups.push({ x: point[0], y: point[1], xs: [point[0]], ys: [point[1]] });
}
groups.sort((a, b) => a.x - b.x);
groups.forEach((group, index) => {
  const r = 36;
  objects[`beat${index + 1}`] = rectOf({ x: Math.round(group.x - r), y: Math.round(group.y - r), width: r * 2, height: r * 2 });
  console.log('beat', index + 1, Math.round(group.x), Math.round(group.y));
});

const out = {
  source: { width: W, height: H },
  normalizedTo: 'original-master-pixels',
  objects,
};
const file = path.join(root, 'north-star-v4-geometry.json');
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log('wrote', file);

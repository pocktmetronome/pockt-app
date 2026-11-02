'use strict';
const fs = require('fs');
const { PNG } = require('pngjs');
const p = PNG.sync.read(fs.readFileSync('REFERENCE/POCKT_NORTH_STAR_MASTER.png'));
function px(x, y) {
  const i = (y * p.width + x) * 4;
  return `${p.data[i]},${p.data[i + 1]},${p.data[i + 2]}`;
}
console.log('header to dial');
for (let y = 150; y <= 230; y += 4) console.log(y, px(166, y), px(470, y), px(50, y));
console.log('dial bottom to beats');
for (let y = 780; y <= 940; y += 8) console.log(y, px(470, y), px(100, y), px(800, y));
console.log('beats to transport');
for (let y = 1000; y <= 1160; y += 8) console.log(y, px(200, y), px(666, y));
console.log('transport to nav');
for (let y = 1380; y <= 1520; y += 8) console.log(y, px(264, y), px(470, y));

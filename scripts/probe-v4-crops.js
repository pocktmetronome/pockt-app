'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../assets/north-star-v4/screen-reference.png')));
const W = src.width;
const out = path.join(__dirname, '../artifacts/v4-probe');
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
crop('tuner.png', 20, 4, 100, 92);
crop('sound.png', 370, 4, 110, 92);
crop('word.png', 130, 8, 230, 80);
crop('plus.png', 30, 80, 120, 120);
crop('minus.png', 350, 80, 130, 120);
crop('plate.png', 145, 85, 210, 85);
crop('beat-row.png', 10, 615, 472, 120);
crop('tap.png', 16, 728, 110, 90);
crop('play.png', 116, 728, 116, 90);
crop('meter.png', 220, 728, 160, 90);
crop('pmark.png', 375, 728, 110, 90);
crop('nav-tile.png', 8, 824, 90, 82);
crop('nav-rest.png', 90, 824, 390, 82);
crop('dial-top.png', 160, 155, 180, 80);
crop('needle-full.png', 220, 180, 60, 220);

'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const parts = path.join(root, 'assets', 'north-star-v4', 'parts');
const outDir = path.join(root, 'artifacts', 'rescue');
const finalDir = path.join(outDir, 'FINAL');
fs.mkdirSync(finalDir, { recursive: true });
const geometry = JSON.parse(fs.readFileSync(path.join(parts, 'geometry.json'), 'utf8'));
const target = PNG.sync.read(fs.readFileSync(path.join(root, 'artifacts', 'absolute-final-stage', 'LATEST_NORTH_STAR.png')));

function load(name) {
  return PNG.sync.read(fs.readFileSync(path.join(parts, name)));
}

function blend(dst, x, y, sr, sg, sb, sa) {
  if (x < 0 || y < 0 || x >= dst.width || y >= dst.height || sa <= 0) return;
  const i = (dst.width * y + x) << 2;
  const da = dst.data[i + 3] / 255;
  const a = sa / 255;
  const out = a + da * (1 - a);
  if (out <= 0) return;
  dst.data[i] = Math.round((sr * a + dst.data[i] * da * (1 - a)) / out);
  dst.data[i + 1] = Math.round((sg * a + dst.data[i + 1] * da * (1 - a)) / out);
  dst.data[i + 2] = Math.round((sb * a + dst.data[i + 2] * da * (1 - a)) / out);
  dst.data[i + 3] = Math.round(out * 255);
}

function blit(dst, src, x, y, w, h) {
  for (let py = 0; py < h; py += 1) {
    const sy = Math.min(src.height - 1, Math.floor((py / h) * src.height));
    for (let px = 0; px < w; px += 1) {
      const sx = Math.min(src.width - 1, Math.floor((px / w) * src.width));
      const i = (src.width * sy + sx) << 2;
      blend(dst, Math.round(x + px), Math.round(y + py), src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

function rotateBlit(dst, src, cx, cy, side, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const half = side / 2;
  for (let py = 0; py < side; py += 1) {
    for (let px = 0; px < side; px += 1) {
      const dx = px - half;
      const dy = py - half;
      const rx = dx * cos + dy * sin;
      const ry = -dx * sin + dy * cos;
      const sx = Math.floor(((rx + half) / side) * src.width);
      const sy = Math.floor(((ry + half) / side) * src.height);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = (src.width * sy + sx) << 2;
      blend(dst, Math.round(cx - half + px), Math.round(cy - half + py), src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]);
    }
  }
}

const marks = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];
function angleFor(bpm) {
  for (let index = 0; index < marks.length - 1; index += 1) {
    const a = marks[index];
    const b = marks[index + 1];
    if (bpm <= b || index === marks.length - 2) {
      const t = (Math.min(bpm, b) - a) / (b - a);
      return ((-135 + (index + t) * 27) * Math.PI) / 180;
    }
  }
  return 0;
}

function digitKit() {
  const y0 = 99;
  const y1 = 135;
  const runs = [];
  let start = -1;
  for (let x = 198; x <= 308; x += 1) {
    let ink = 0;
    for (let y = y0; y < y1; y += 1) {
      const i = (target.width * y + x) << 2;
      const lum = (target.data[i] + target.data[i + 1] + target.data[i + 2]) / 3;
      const chroma = Math.max(target.data[i], target.data[i + 1], target.data[i + 2]) - Math.min(target.data[i], target.data[i + 1], target.data[i + 2]);
      if (lum > 145 && chroma < 38) ink += 1;
    }
    if (ink > 2 && start < 0) start = x;
    if ((ink <= 2 || x === 308) && start >= 0) {
      runs.push({ x: start, w: x - start });
      start = -1;
    }
  }
  const names = ['1', '2', '0'];
  const glyphs = {};
  runs.slice(0, 3).forEach((run, index) => {
    const png = new PNG({ width: run.w, height: y1 - y0 });
    for (let y = 0; y < png.height; y += 1) {
      for (let x = 0; x < png.width; x += 1) {
        const si = (target.width * (y0 + y) + (run.x + x)) << 2;
        const di = (png.width * y + x) << 2;
        const lum = (target.data[si] + target.data[si + 1] + target.data[si + 2]) / 3;
        const chroma = Math.max(target.data[si], target.data[si + 1], target.data[si + 2]) - Math.min(target.data[si], target.data[si + 1], target.data[si + 2]);
        const keep = lum > 130 && chroma < 42;
        png.data[di] = keep ? target.data[si] : 0;
        png.data[di + 1] = keep ? target.data[si + 1] : 0;
        png.data[di + 2] = keep ? target.data[si + 2] : 0;
        png.data[di + 3] = keep ? 255 : 0;
      }
    }
    glyphs[names[index]] = png;
  });
  return glyphs;
}

const glyphs = digitKit();

function stampBpm(dst, bpm) {
  if (bpm === 120) {
    for (let y = 99; y < 135; y += 1) {
      for (let x = 204; x < 300; x += 1) {
        const i = (target.width * y + x) << 2;
        const lum = (target.data[i] + target.data[i + 1] + target.data[i + 2]) / 3;
        const chroma = Math.max(target.data[i], target.data[i + 1], target.data[i + 2]) - Math.min(target.data[i], target.data[i + 1], target.data[i + 2]);
        if (lum > 150 && chroma < 40) blend(dst, x, y, target.data[i], target.data[i + 1], target.data[i + 2], 255);
      }
    }
    return;
  }
  const text = String(bpm);
  const gap = 9;
  const width = text.split('').reduce((sum, ch, index) => sum + (glyphs[ch] ? glyphs[ch].width : 0) + (index ? gap : 0), 0);
  let x = 251.5 - width / 2;
  const y = 99;
  for (const ch of text) {
    const glyph = glyphs[ch];
    if (!glyph) continue;
    blit(dst, glyph, Math.round(x), y, glyph.width, glyph.height);
    x += glyph.width + gap;
  }
}

function radial(dst, cx, cy, radius, red, green, blue, peak) {
  const rad = Math.ceil(radius);
  for (let y = -rad; y <= rad; y += 1) {
    for (let x = -rad; x <= rad; x += 1) {
      const d = Math.hypot(x, y) / radius;
      if (d >= 1) continue;
      blend(dst, Math.round(cx + x), Math.round(cy + y), red, green, blue, Math.round(255 * peak * (1 - d) ** 1.7));
    }
  }
}

function scene(bpm, options = {}) {
  const png = new PNG({ width: 492, height: 910 });
  blit(png, load('chassis.png'), 0, 0, 492, 910);
  const place = (file, rect) => blit(png, load(file), rect.x, rect.y, rect.w, rect.h);
  place('tuner-shell.png', geometry.header.tuner);
  place('tuner-glyph.png', geometry.header.tuner);
  place('wordmark.png', geometry.header.wordmark);
  place('sound-shell.png', geometry.header.sound);
  place('sound-glyph.png', geometry.header.sound);
  place('minus-shell.png', geometry.tempo.minus);
  place('minus-mark.png', geometry.tempo.minus);
  place('plus-shell.png', geometry.tempo.plus);
  place('plus-mark.png', geometry.tempo.plus);
  place('bpm-plate.png', geometry.plate);
  place('bpm-label.png', geometry.plate);
  stampBpm(png, bpm);
  const dial = geometry.dialRect;
  place('dial-body-empty.png', dial);
  place('dial-scale-clean.png', dial);
  const angle = angleFor(bpm);
  rotateBlit(png, load('needle-shadow.png'), dial.x + dial.w / 2, dial.y + dial.h / 2, dial.w, angle);
  rotateBlit(png, load('needle-shaft.png'), dial.x + dial.w / 2, dial.y + dial.h / 2, dial.w, angle);
  blit(png, load('boss.png'), dial.x + (dial.w - 92) / 2, dial.y + (dial.h - 92) / 2, 92, 92);
  place('beats-housing.png', geometry.beats);
  place('lamp-on.png', geometry.lamp);
  ['beat-disc-0.png', 'beat-disc-1.png', 'beat-disc-2.png', 'beat-disc-3.png'].forEach((file, index) => {
    const cx = geometry.beatCenters[index];
    const cy = geometry.beatCy;
    blit(png, load(file), cx - geometry.discR, cy - geometry.discR, geometry.discR * 2, geometry.discR * 2);
    if (options.beat && options.beat.index === index) {
      const disc = geometry.discR;
      const halo = disc * (options.beat.accent === 'strong' ? 1.32 : options.beat.accent === 'soft' ? 1.12 : 1.2);
      radial(png, cx, cy, halo, 255, 170, 70, options.beat.peak ? (options.beat.accent === 'strong' ? 0.28 : 0.12) : 0);
      radial(png, cx, cy, disc * 0.55, 255, 236, 190, options.beat.peak ? (options.beat.accent === 'strong' ? 0.85 : 0.45) : options.beat.accent === 'strong' ? 0.08 : 0.04);
    }
    blit(png, load(`beat-numeral-${index}.png`), cx - 14, cy + geometry.numeral.dy, 28, 28);
  });
  place('loop.png', geometry.loop);
  place('tap.png', geometry.transport.tap);
  const play = geometry.transport.play;
  const playShift = options.playDown ? 3 : options.playing ? 1 : 0;
  blit(png, load('play-shell.png'), play.x, play.y + playShift, play.w, play.h);
  blit(png, load(options.playing ? 'play-pause.png' : 'play-icon.png'), play.x, play.y + playShift, play.w, play.h);
  place('meter-shell.png', geometry.transport.meter);
  place('meter-ink.png', geometry.transport.meter);
  place('pockt.png', geometry.transport.pockt);
  place('nav-tray-empty.png', geometry.nav);
  place('nav-slot-0-on.png', { x: geometry.nav.x, y: geometry.nav.y, w: geometry.slotW, h: geometry.nav.h });
  for (let index = 1; index < 6; index += 1) {
    place(`nav-slot-${index}.png`, { x: geometry.nav.x + index * geometry.slotW, y: geometry.nav.y, w: geometry.slotW, h: geometry.nav.h });
  }
  return png;
}

function write(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function crop(src, rect) {
  const png = new PNG({ width: rect.w, height: rect.h });
  for (let y = 0; y < rect.h; y += 1) {
    for (let x = 0; x < rect.w; x += 1) {
      const si = (src.width * (rect.y + y) + (rect.x + x)) << 2;
      const di = (rect.w * y + x) << 2;
      png.data[di] = src.data[si];
      png.data[di + 1] = src.data[si + 1];
      png.data[di + 2] = src.data[si + 2];
      png.data[di + 3] = 255;
    }
  }
  return png;
}

const rest = scene(120);
write(path.join(outDir, 'target.png'), target);
write(path.join(outDir, 'current.png'), rest);
write(path.join(finalDir, '01-target.png'), target);
write(path.join(finalDir, '02-production-120-rest.png'), rest);

const overlay = new PNG({ width: 492, height: 910 });
const diff = new PNG({ width: 492, height: 910 });
const skip = [geometry.tempo.minus, geometry.tempo.plus];
let sum = 0;
let count = 0;
let dialBright = 0;
let targetBright = 0;
const dial = geometry.dialRect;
const cx = dial.x + dial.w / 2;
const cy = dial.y + dial.h / 2;
for (let y = 0; y < 910; y += 1) {
  for (let x = 0; x < 492; x += 1) {
    const i = (492 * y + x) << 2;
    const insideSwap = skip.some((rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h);
    overlay.data[i] = Math.round(target.data[i] * 0.5 + rest.data[i] * 0.5);
    overlay.data[i + 1] = Math.round(target.data[i + 1] * 0.5 + rest.data[i + 1] * 0.5);
    overlay.data[i + 2] = Math.round(target.data[i + 2] * 0.5 + rest.data[i + 2] * 0.5);
    overlay.data[i + 3] = 255;
    const d = insideSwap ? 0 : (Math.abs(target.data[i] - rest.data[i]) + Math.abs(target.data[i + 1] - rest.data[i + 1]) + Math.abs(target.data[i + 2] - rest.data[i + 2])) / 3;
    if (!insideSwap) {
      sum += d;
      count += 1;
    }
    diff.data[i] = Math.min(255, d * 3);
    diff.data[i + 1] = diff.data[i];
    diff.data[i + 2] = diff.data[i];
    diff.data[i + 3] = 255;
    const r = Math.hypot(x - cx, y - cy);
    if (r > 150 && r < 210) {
      const lum = rest.data[i] + rest.data[i + 1] + rest.data[i + 2];
      const tLum = target.data[i] + target.data[i + 1] + target.data[i + 2];
      if (lum > 280) dialBright += 1;
      if (tLum > 280) targetBright += 1;
    }
  }
}
write(path.join(outDir, 'overlay-50.png'), overlay);
write(path.join(outDir, 'difference.png'), diff);
write(path.join(finalDir, '03-overlay.png'), overlay);
write(path.join(finalDir, '04-difference.png'), diff);

const regions = {
  header: { x: 0, y: 0, w: 492, h: 100 },
  tempo: { x: 0, y: 70, w: 492, h: 130 },
  dial: geometry.dialRect,
  beats: geometry.beats,
  transport: { x: 0, y: 710, w: 492, h: 120 },
  nav: geometry.nav,
};
for (const [name, rect] of Object.entries(regions)) {
  write(path.join(outDir, `crop-${name}-target.png`), crop(target, rect));
  write(path.join(outDir, `crop-${name}-current.png`), crop(rest, rect));
}

for (const bpm of [20, 60, 120, 160, 240, 400]) {
  const name = bpm === 120 ? '07-production-120.png' : bpm === 20 ? '05-production-20.png' : bpm === 60 ? '06-production-60.png' : bpm === 160 ? '08-production-160.png' : bpm === 240 ? '09-production-240.png' : '10-production-400.png';
  write(path.join(finalDir, name), scene(bpm));
}
write(path.join(finalDir, '18-fullscreen.png'), rest);
write(path.join(finalDir, '11-play-rest.png'), crop(rest, geometry.transport.play));
const playDown = scene(120, { playDown: true });
const running = scene(120, { playing: true });
write(path.join(finalDir, '12-play-down.png'), crop(playDown, geometry.transport.play));
write(path.join(finalDir, '13-running.png'), crop(running, geometry.transport.play));
const beatRect = geometry.beats;
write(path.join(finalDir, '14-beat-soft-rest.png'), crop(scene(120, { beat: { index: 0, accent: 'soft', peak: false } }), beatRect));
write(path.join(finalDir, '15-beat-soft-peak.png'), crop(scene(120, { beat: { index: 0, accent: 'soft', peak: true } }), beatRect));
write(path.join(finalDir, '16-beat-strong-rest.png'), crop(scene(120, { beat: { index: 0, accent: 'strong', peak: false } }), beatRect));
write(path.join(finalDir, '17-beat-strong-peak.png'), crop(scene(120, { beat: { index: 0, accent: 'strong', peak: true } }), beatRect));

const mae = sum / count;
const scaleRatio = targetBright === 0 ? 0 : dialBright / targetBright;
const report = { mae: Number(mae.toFixed(2)), dialBright, targetBright, scaleRatio: Number(scaleRatio.toFixed(3)) };
fs.writeFileSync(path.join(outDir, 'compare.json'), JSON.stringify(report, null, 2));
console.log(report);
if (scaleRatio < 0.45) {
  console.error('scale ring is missing from the production composite');
  process.exit(1);
}

'use strict';

/**
 * Cuts the approved Phrase transport reference into photographic layers.
 * Runtime code positions these pixels. It does not redraw the hardware.
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const srcPath =
  process.env.PHRASE_REFERENCE ||
  'C:/Users/gregg/.cursor/projects/c-Apps-POCKT/assets/c__Users_gregg_AppData_Roaming_Cursor_User_workspaceStorage_0ff45f9ecb0208d3dca7ac57898db205_images_POCKT_PHRASE_TRANSPORT_REFERENCE__1_-9aeca0e8-1efc-490b-903f-543757ecc31e.png';
const outDir = path.join(root, 'assets', 'phrase-transport');
const ART_H = 216;

function luma(r, g, b) {
  return (r + g + b) / 3;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function readSrc() {
  const full = PNG.sync.read(fs.readFileSync(srcPath));
  const png = new PNG({ width: full.width, height: ART_H });
  PNG.bitblt(full, png, 0, 0, full.width, ART_H, 0, 0);
  return png;
}

function idx(png, x, y) {
  return (y * png.width + x) * 4;
}

function get(png, x, y) {
  const i = idx(png, x, y);
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

function set(png, x, y, r, g, b, a = 255) {
  const i = idx(png, x, y);
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function ringStats(png, cx, cy, r) {
  const steps = Math.max(16, Math.round(r * 10));
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sl = 0;
  let n = 0;
  for (let k = 0; k < steps; k += 1) {
    const a = (k / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
    const c = get(png, x, y);
    sr += c[0];
    sg += c[1];
    sb += c[2];
    sl += luma(c[0], c[1], c[2]);
    n += 1;
  }
  return { l: n ? sl / n : 255, r: sr / n, g: sg / n, b: sb / n };
}

function refineCenter(png, cx, cy, radius) {
  let best = { cx, cy, score: Infinity };
  for (let dy = -8; dy <= 8; dy += 1) {
    for (let dx = -8; dx <= 8; dx += 1) {
      const stats = ringStats(png, cx + dx, cy + dy, radius);
      const outer = ringStats(png, cx + dx, cy + dy, radius + 6);
      const score = stats.l - outer.l * 0.15;
      if (score < best.score) best = { cx: cx + dx, cy: cy + dy, score, l: stats.l };
    }
  }
  return best;
}

function blank(w, h) {
  return new PNG({ width: w, height: h });
}

function extractCircle(src, cx, cy, r, pad = 3) {
  const size = Math.ceil((r + pad) * 2);
  const png = blank(size, size);
  const ox = Math.round(cx - r - pad);
  const oy = Math.round(cy - r - pad);
  const mid = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = ox + x;
      const sy = oy + y;
      const d = Math.hypot(x + 0.5 - mid, y + 0.5 - mid);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const c = get(src, sx, sy);
      let a = 0;
      if (d <= r) a = 255;
      else if (d < r + 1.15) a = Math.round(255 * (1 - (d - r) / 1.15));
      if (a > 0) set(png, x, y, c[0], c[1], c[2], a);
    }
  }
  return { png, ox, oy, size, r, pad };
}

function fillHole(plate, cx, cy, r) {
  const moat = ringStats(plate, cx, cy, r + 2);
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(plate.height - 1, Math.ceil(cy + r)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(plate.width - 1, Math.ceil(cx + r)); x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r - 1) continue;
      const edge = clamp((d - (r - 8)) / 8, 0, 1);
      const shade = cy + 0.5 > y ? 0.55 : 0.85;
      set(
        plate,
        x,
        y,
        Math.round(moat.r * 0.22 * shade * (0.45 + edge)),
        Math.round(moat.g * 0.2 * shade * (0.45 + edge)),
        Math.round(moat.b * 0.18 * shade * (0.45 + edge)),
        255
      );
    }
  }
}

function darken(src, amount) {
  const png = blank(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const a = src.data[i + 3];
    const k = 1 - amount;
    png.data[i] = Math.round(src.data[i] * k);
    png.data[i + 1] = Math.round(src.data[i + 1] * k);
    png.data[i + 2] = Math.round(src.data[i + 2] * k);
    png.data[i + 3] = a;
  }
  return png;
}

function paintPause(button, r) {
  const png = blank(button.width, button.height);
  png.data.set(button.data);
  const mid = button.width / 2;
  const face = [];
  for (let y = 0; y < button.height; y += 1) {
    for (let x = 0; x < button.width; x += 1) {
      const d = Math.hypot(x + 0.5 - mid, y + 0.5 - mid);
      const c = get(png, x, y);
      if (c[3] < 220 || d < r * 0.42 || d > r * 0.78) continue;
      face.push({ x, y, c, d });
    }
  }
  const avg = face.reduce((acc, item) => [acc[0] + item.c[0], acc[1] + item.c[1], acc[2] + item.c[2]], [0, 0, 0]);
  const n = Math.max(1, face.length);
  const metal = [avg[0] / n, avg[1] / n, avg[2] / n];
  const faceL = luma(metal[0], metal[1], metal[2]);
  for (let y = 0; y < button.height; y += 1) {
    for (let x = 0; x < button.width; x += 1) {
      const dx = x + 0.5 - mid;
      const dy = y + 0.5 - mid;
      const d = Math.hypot(dx, dy);
      const c = get(png, x, y);
      if (c[3] < 200 || d > 16) continue;
      if (luma(c[0], c[1], c[2]) < faceL + 28 && d > 8) continue;
      const ang = Math.atan2(dy, dx);
      const sx = Math.round(mid + Math.cos(ang) * 24);
      const sy = Math.round(mid + Math.sin(ang) * 24);
      const sample = get(png, clamp(sx, 0, button.width - 1), clamp(sy, 0, button.height - 1));
      set(png, x, y, sample[0], sample[1], sample[2], c[3]);
    }
  }
  const bars = [
    { x: mid - 6.4, y: mid - 8.2 },
    { x: mid + 1.8, y: mid - 8.2 },
  ];
  const bw = 4.4;
  const bh = 16.2;
  for (const bar of bars) {
    for (let y = 0; y < button.height; y += 1) {
      for (let x = 0; x < button.width; x += 1) {
        const u = x + 0.5 - bar.x;
        const v = y + 0.5 - bar.y;
        if (u < -0.2 || v < -0.2 || u > bw || v > bh) continue;
        const c = get(png, x, y);
        if (c[3] < 180) continue;
        const edge = u < 1.1 ? 1.35 : u > bw - 1.3 ? 0.62 : 1;
        const top = v < 1.5 ? 1.22 : v > bh - 1.8 ? 0.74 : 1;
        set(
          png,
          x,
          y,
          clamp(Math.round(168 * edge * top), 0, 255),
          clamp(Math.round(132 * edge * top), 0, 255),
          clamp(Math.round(78 * edge * top), 0, 255),
          255
        );
      }
    }
  }
  return png;
}

function paintStop(button) {
  const png = blank(button.width, button.height);
  png.data.set(button.data);
  const mid = button.width / 2;
  const reds = [];
  for (let y = 0; y < button.height; y += 1) {
    for (let x = 0; x < button.width; x += 1) {
      const c = get(png, x, y);
      const d = Math.hypot(x + 0.5 - mid, y + 0.5 - mid);
      if (c[3] > 200 && d < 8 && c[0] > 180 && c[1] < 90) reds.push(c);
    }
  }
  const n = Math.max(1, reds.length);
  const red = reds.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]);
  const lamp = [red[0] / n, red[1] / n, red[2] / n];
  const side = 11;
  for (let y = 0; y < button.height; y += 1) {
    for (let x = 0; x < button.width; x += 1) {
      const d = Math.hypot(x + 0.5 - mid, y + 0.5 - mid);
      const c = get(png, x, y);
      if (c[3] < 180 || d > 12) continue;
      const dx = Math.abs(x + 0.5 - mid);
      const dy = Math.abs(y + 0.5 - mid);
      const inside = dx < side / 2 && dy < side / 2;
      if (d < 9.2 && !inside) {
        set(png, x, y, 58, 24, 20, 255);
        continue;
      }
      if (!inside) continue;
      const top = y + 0.5 < mid ? 1.12 : 0.9;
      set(
        png,
        x,
        y,
        clamp(Math.round(lamp[0] * top), 0, 255),
        clamp(Math.round(lamp[1] * top * 0.85), 0, 255),
        clamp(Math.round(lamp[2] * top * 0.8), 0, 255),
        255
      );
    }
  }
  return png;
}

function dimLoop(button) {
  const png = blank(button.width, button.height);
  for (let y = 0; y < button.height; y += 1) {
    for (let x = 0; x < button.width; x += 1) {
      const c = get(button, x, y);
      const teal = c[1] > c[0] + 28 && c[2] > c[0] + 24 && c[1] > 70;
      if (!teal) {
        set(png, x, y, c[0], c[1], c[2], c[3]);
        continue;
      }
      const peak = clamp((luma(c[0], c[1], c[2]) - 40) / 120, 0, 1);
      set(
        png,
        x,
        y,
        Math.round(28 + peak * 46),
        Math.round(34 + peak * 48),
        Math.round(38 + peak * 46),
        c[3]
      );
    }
  }
  return png;
}

function buildWaves(src, plate) {
  const x0 = 44;
  const y0 = 141;
  const w = 184;
  const h = 32;
  const playheadX = 133;
  const masks = {
    gold: blank(w, h),
    cyan: blank(w, h),
    red: blank(w, h),
  };
  const glass = [];
  for (let y = 130; y <= 136; y += 1) {
    for (let x = 50; x <= 220; x += 1) {
      const c = get(src, x, y);
      if (luma(c[0], c[1], c[2]) < 22) glass.push(c);
    }
  }
  const gavg = glass.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]);
  const gn = Math.max(1, glass.length);
  const well = [gavg[0] / gn, gavg[1] / gn, gavg[2] / gn];
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const c = get(src, x, y);
      const l = luma(c[0], c[1], c[2]);
      const sat = Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
      const nearHead = Math.abs(x - playheadX) <= 2;
      const signal = l > 44 && sat > 16 && !nearHead;
      const lx = x - x0;
      const ly = y - y0;
      if (signal) {
        const peak = clamp((l - 36) / 140, 0, 1);
        const alpha = Math.round(clamp((l - 30) / 80, 0.15, 1) * 255);
        set(masks.cyan, lx, ly, Math.round(36 + peak * 70), Math.round(168 + peak * 74), Math.round(186 + peak * 60), alpha);
        set(masks.gold, lx, ly, Math.round(132 + peak * 86), Math.round(104 + peak * 58), Math.round(64 + peak * 24), alpha);
        set(masks.red, lx, ly, Math.round(168 + peak * 70), Math.round(48 + peak * 20), Math.round(40 + peak * 16), alpha);
      }
    }
  }
  const glassAt = (x, y) => {
    const c = get(src, x, y);
    if (c[2] > c[0] + 6) return get(src, Math.max(0, x - 10), y);
    return c;
  };
  for (let y = 130; y <= 176; y += 1) {
    const t = (y - 130) / 46;
    for (let x = 34; x <= 238; x += 1) {
      const top = glassAt(x, 132);
      const bot = glassAt(x, 176);
      set(
        plate,
        x,
        y,
        Math.round(top[0] * (1 - t) + bot[0] * t),
        Math.round(top[1] * (1 - t) + bot[1] * t),
        Math.round(top[2] * (1 - t) + bot[2] * t),
        255
      );
    }
  }
  return {
    masks,
    x: x0,
    y: y0,
    w,
    h,
    playheadX,
    trough: { x: 28, y: 124, w: 216, h: 56 },
  };
}

function clearClocks(src, plate) {
  for (let y = 182; y <= 202; y += 1) {
    const donor = get(src, 136, y);
    for (const [x0, x1] of [
      [28, 96],
      [184, 246],
    ]) {
      for (let x = x0; x <= x1; x += 1) {
        const here = get(src, x, y);
        const bright = luma(here[0], here[1], here[2]) > 60;
        if (!bright) continue;
        set(plate, x, y, donor[0], donor[1], donor[2], 255);
        if (x + 1 <= x1) set(plate, x + 1, y, donor[0], donor[1], donor[2], 255);
        if (x - 1 >= x0) set(plate, x - 1, y, donor[0], donor[1], donor[2], 255);
      }
    }
  }
  return { y: 184, h: 16, left: 36, right: 236 };
}

function findSelector(plate) {
  let best = null;
  for (let y = 4; y < 40; y += 1) {
    let run = 0;
    let start = 0;
    for (let x = 40; x < plate.width - 20; x += 1) {
      const c = get(plate, x, y);
      const l = luma(c[0], c[1], c[2]);
      const lit = l > 90;
      if (lit) {
        if (run === 0) start = x;
        run += 1;
      } else if (run > 90) {
        const box = { x: start, y, w: run };
        if (!best || box.w > best.w) best = { ...box, y0: y, y1: y };
        else if (best && Math.abs(start - best.x) < 20) best.y1 = y;
        run = 0;
      } else run = 0;
    }
  }
  if (!best) return { x: 72, y: 6, w: 150, h: 26 };
  return { x: best.x, y: best.y0, w: best.w, h: best.y1 - best.y0 + 1 };
}

function extractRect(src, box, radius) {
  const png = blank(box.w, box.h);
  for (let y = 0; y < box.h; y += 1) {
    for (let x = 0; x < box.w; x += 1) {
      const sx = box.x + x;
      const sy = box.y + y;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const c = get(src, sx, sy);
      const rx = x < radius ? radius - x : x > box.w - radius ? x - (box.w - radius) : 0;
      const ry = y < radius ? radius - y : y > box.h - radius ? y - (box.h - radius) : 0;
      const d = Math.hypot(rx, ry);
      const a = d <= radius ? 255 : 0;
      if (a) set(png, x, y, c[0], c[1], c[2], a);
    }
  }
  return png;
}

function findClear(src) {
  let minx = src.width;
  let miny = src.height;
  let maxx = 0;
  let maxy = 0;
  let n = 0;
  for (let y = 52; y < 120; y += 1) {
    for (let x = 200; x < src.width - 4; x += 1) {
      const c = get(src, x, y);
      if (luma(c[0], c[1], c[2]) > 168 && c[2] > 150) {
        n += 1;
        if (x < minx) minx = x;
        if (y < miny) miny = y;
        if (x > maxx) maxx = x;
        if (y > maxy) maxy = y;
      }
    }
  }
  const cx = (minx + maxx) / 2;
  const cy = (miny + maxy) / 2;
  return {
    x: Math.round(cx - 24),
    y: Math.round(cy - 22),
    w: 48,
    h: 44,
    n,
  };
}

function glow(size) {
  const png = blank(size, size);
  const mid = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x + 0.5 - mid, y + 0.5 - mid) / (size / 2);
      const a = Math.round(clamp(1 - d, 0, 1) * 90);
      if (a > 0) set(png, x, y, 196, 36, 32, a);
    }
  }
  return png;
}

function playheadSprite(h) {
  const png = blank(5, h);
  for (let y = 0; y < h; y += 1) {
    const edge = y < 2 || y > h - 3 ? 0.4 : 1;
    set(png, 0, y, 80, 220, 230, Math.round(40 * edge));
    set(png, 1, y, 120, 236, 242, Math.round(120 * edge));
    set(png, 2, y, 186, 250, 255, Math.round(230 * edge));
    set(png, 3, y, 120, 236, 242, Math.round(120 * edge));
    set(png, 4, y, 80, 220, 230, Math.round(40 * edge));
  }
  return png;
}

function write(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

function compositePreview(plate, layers) {
  const png = blank(plate.width, plate.height);
  png.data.set(plate.data);
  for (const layer of layers) {
    for (let y = 0; y < layer.png.height; y += 1) {
      for (let x = 0; x < layer.png.width; x += 1) {
        const c = get(layer.png, x, y);
        if (c[3] < 8) continue;
        const dx = layer.x + x;
        const dy = layer.y + y;
        if (dx < 0 || dy < 0 || dx >= png.width || dy >= png.height) continue;
        const under = get(png, dx, dy);
        const a = c[3] / 255;
        set(
          png,
          dx,
          dy,
          Math.round(under[0] * (1 - a) + c[0] * a),
          Math.round(under[1] * (1 - a) + c[1] * a),
          Math.round(under[2] * (1 - a) + c[2] * a),
          255
        );
      }
    }
  }
  return png;
}

function main() {
  const src = readSrc();
  const plate = blank(src.width, src.height);
  plate.data.set(src.data);

  const playC = refineCenter(src, 115, 82, 36);
  const recC = refineCenter(src, 46, 82, 26);
  const loopC = refineCenter(src, 183, 86, 29);
  const play = extractCircle(src, playC.cx, playC.cy, 35, 3);
  const rec = extractCircle(src, recC.cx, recC.cy, 24, 3);
  const loop = extractCircle(src, loopC.cx, loopC.cy, 28, 3);
  fillHole(plate, playC.cx, playC.cy, 35);
  fillHole(plate, recC.cx, recC.cy, 24);
  fillHole(plate, loopC.cx, loopC.cy, 28);

  const clearBox = findClear(src);
  const clear = extractRect(src, clearBox, 8);
  for (let y = clearBox.y; y < clearBox.y + clearBox.h; y += 1) {
    for (let x = clearBox.x; x < clearBox.x + clearBox.w; x += 1) {
      const rx = x < clearBox.x + 8 ? 8 - (x - clearBox.x) : x > clearBox.x + clearBox.w - 8 ? x - (clearBox.x + clearBox.w - 8) : 0;
      const ry = y < clearBox.y + 8 ? 8 - (y - clearBox.y) : y > clearBox.y + clearBox.h - 8 ? y - (clearBox.y + clearBox.h - 8) : 0;
      if (Math.hypot(rx, ry) > 8) continue;
      const c = get(plate, x, y);
      set(plate, x, y, Math.round(c[0] * 0.35), Math.round(c[1] * 0.35), Math.round(c[2] * 0.35), 255);
    }
  }

  const waves = buildWaves(src, plate);
  const clocks = clearClocks(src, plate);
  const trough = waves.trough;
  const selector = findSelector(src);
  const selectorPng = extractRect(src, selector, 6);

  fs.mkdirSync(outDir, { recursive: true });
  write('plate.png', plate);
  write('record-rest.png', rec.png);
  write('record-stop.png', paintStop(rec.png));
  write('record-glow.png', glow(36));
  write('play-rest.png', play.png);
  write('play-pause.png', paintPause(play.png, 35));
  write('play-pressed.png', darken(play.png, 0.22));
  write('loop-on.png', loop.png);
  write('loop-off.png', dimLoop(loop.png));
  write('clear.png', clear);
  write('selector.png', selectorPng);
  write('wave-cyan.png', waves.masks.cyan);
  write('wave-gold.png', waves.masks.gold);
  write('wave-red.png', waves.masks.red);
  write('playhead.png', playheadSprite(waves.h));
  const troughPng = extractRect(src, trough, 12);
  write('trough.png', troughPng);

  const preview = compositePreview(plate, [
    { png: rec.png, x: rec.ox, y: rec.oy },
    { png: play.png, x: play.ox, y: play.oy },
    { png: loop.png, x: loop.ox, y: loop.oy },
    { png: clear, x: clearBox.x, y: clearBox.y },
    { png: waves.masks.gold, x: waves.x, y: waves.y },
    { png: waves.masks.cyan, x: waves.x, y: waves.y },
  ]);
  const debugDir = path.join(root, 'artifacts', '_ref-inspect');
  fs.mkdirSync(debugDir, { recursive: true });
  fs.writeFileSync(path.join(debugDir, 'rebuild.png'), PNG.sync.write(preview));
  fs.writeFileSync(path.join(debugDir, 'plate.png'), PNG.sync.write(plate));
  const zoom = (name, box, scale) => {
    const z = blank(box.w * scale, box.h * scale);
    for (let y = 0; y < box.h; y += 1) {
      for (let x = 0; x < box.w; x += 1) {
        const c = get(plate, box.x + x, box.y + y);
        for (let sy = 0; sy < scale; sy += 1) {
          for (let sx = 0; sx < scale; sx += 1) set(z, x * scale + sx, y * scale + sy, c[0], c[1], c[2], 255);
        }
      }
    }
    fs.writeFileSync(path.join(debugDir, name), PNG.sync.write(z));
  };
  zoom('plate-trough.png', { x: 16, y: 118, w: 240, h: 90 }, 3);

  const layout = {
    width: src.width,
    height: ART_H,
    record: { cx: recC.cx, cy: recC.cy, r: 24, pad: 3 },
    play: { cx: playC.cx, cy: playC.cy, r: 35, pad: 3 },
    loop: { cx: loopC.cx, cy: loopC.cy, r: 28, pad: 3 },
    clear: clearBox,
    selector,
    beats: { x: selector.x, y: selector.y, w: Math.round(selector.w / 2), h: selector.h },
    phrase: {
      x: selector.x + Math.round(selector.w / 2),
      y: selector.y,
      w: selector.w - Math.round(selector.w / 2),
      h: selector.h,
    },
    shutter: { x: 8, y: 6, w: 28, h: 28 },
    trough,
    wave: { x: waves.x, y: waves.y, w: waves.w, h: waves.h },
    playheadX: waves.playheadX,
    clocks,
  };
  const ts = `/** Photographic Phrase transport geometry, in reference pixels. Generated by scripts/bake-phrase-transport-art.js */\nexport const PHRASE_ART = ${JSON.stringify(layout, null, 2)} as const;\n`;
  fs.writeFileSync(path.join(root, 'lib', 'phrase-transport-art.ts'), ts);
  console.log(JSON.stringify(layout, null, 2));
}

main();

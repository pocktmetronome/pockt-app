'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');
const puppeteer = require('puppeteer-core');
const { rigidFrame, FACEPLATE_FRAMES, NORTH_STAR_ART } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'north-star-build');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const spec = FACEPLATE_FRAMES['390x844'];
const frame = rigidFrame(spec.w, spec.h, spec.insets);

function box(key) {
  const art = NORTH_STAR_ART[key];
  return {
    x: Math.round(frame.mapX(art.x)),
    y: Math.round(frame.mapY(art.y)),
    w: Math.max(1, Math.round(art.w * frame.s)),
    h: Math.max(1, Math.round(art.h * frame.s)),
  };
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      res.writeHead(200, { 'Content-Type': file.endsWith('.png') ? 'image/png' : 'text/html' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function screenHtml(base, mode) {
  const caps = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'pockt'];
  const glassX = Math.round(frame.mapX(469));
  const glassY = Math.round(frame.mapY(501));
  const play = box('play');
  const bpm = mode.bpm ?? '120';
  const glyph = mode.running
    ? `<div style="position:absolute;left:${play.x + play.w / 2 - 10}px;top:${play.y + play.h / 2 - 9}px;width:7px;height:18px;background:#F0B85A;border-radius:1px;box-shadow:0 0 8px rgba(240,160,60,.7)"></div>
       <div style="position:absolute;left:${play.x + play.w / 2 + 4}px;top:${play.y + play.h / 2 - 9}px;width:7px;height:18px;background:#F0B85A;border-radius:1px;box-shadow:0 0 8px rgba(240,160,60,.7)"></div>`
    : '';
  const beat = box('beat1');
  const glow = mode.running
    ? `<div style="position:absolute;left:${beat.x + beat.w * 0.22}px;top:${beat.y + beat.h * 0.22}px;width:${beat.w * 0.56}px;height:${beat.h * 0.56}px;border-radius:99px;background:radial-gradient(circle, rgba(255,210,120,.95) 0%, rgba(255,140,40,.35) 55%, transparent 72%)"></div>`
    : '';
  const capHtml = caps.map((key) => {
    const b = box(key);
    const file = key === 'play' && mode.running ? 'play-running.png' : `${key}.png`;
    return `<img src="${base}/assets/north-star-v6/${file}" style="position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px">`;
  }).join('');
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#000}
    .screen{width:390px;height:844px;position:relative;overflow:hidden}
    .bpm{position:absolute;left:${glassX}px;top:${glassY}px;transform:translate(-50%,-50%);text-align:center;color:#F6C98A;font-family:Arial,sans-serif;font-variant-numeric:tabular-nums}
    .digits{font-size:46px;font-weight:500;letter-spacing:1px;line-height:0.9;text-shadow:0 0 10px rgba(246,180,80,.55)}
    .unit{margin-top:6px;font-size:11px;letter-spacing:0.42em;font-weight:600;color:#E8A85A;text-indent:0.42em}
  </style></head><body><div class="screen" id="screen">
    <img src="${base}/assets/north-star-face/faceplate-390x844.png" style="position:absolute;inset:0;width:390px;height:844px">
    ${capHtml}
    ${glyph}
    ${glow}
    <div class="bpm"><div class="digits">${bpm}</div><div class="unit">BPM</div></div>
  </div></body></html>`;
}

async function shot(page, html, file, width, height) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load', timeout: 120000 });
  const el = await page.$('#screen');
  await el.screenshot({ path: file });
  console.log(file);
}

function containMaster() {
  const src = PNG.sync.read(fs.readFileSync(path.join(root, 'REFERENCE', 'POCKT_NORTH_STAR_MASTER.png')));
  const s = 390 / src.width;
  const h = Math.round(src.height * s);
  const scaled = new PNG({ width: 390, height: h });
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < 390; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor(x / s));
      const sy = Math.min(src.height - 1, Math.floor(y / s));
      const i = (sy * src.width + sx) * 4;
      const d = (y * 390 + x) * 4;
      let r = src.data[i];
      let g = src.data[i + 1];
      let b = src.data[i + 2];
      if (g > r + 8 && g > b + 4 && g > 45) {
        r = 28;
        g = 24;
        b = 20;
      }
      scaled.data[d] = r;
      scaled.data[d + 1] = g;
      scaled.data[d + 2] = b;
      scaled.data[d + 3] = 255;
    }
  }
  const canvas = new PNG({ width: 390, height: 844 });
  const y0 = Math.round((844 - h) / 2);
  for (let y = 0; y < 844; y += 1) {
    for (let x = 0; x < 390; x += 1) {
      const d = (y * 390 + x) * 4;
      if (y < y0 || y >= y0 + h) {
        canvas.data[d] = 22;
        canvas.data[d + 1] = 18;
        canvas.data[d + 2] = 15;
      } else {
        const sIdx = ((y - y0) * 390 + x) * 4;
        canvas.data[d] = scaled.data[sIdx];
        canvas.data[d + 1] = scaled.data[sIdx + 1];
        canvas.data[d + 2] = scaled.data[sIdx + 2];
      }
      canvas.data[d + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, '_master-contain.png'), PNG.sync.write(canvas));
}

function crop(src, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = 0; xx < w; xx += 1) {
      const sx = Math.max(0, Math.min(src.width - 1, x + xx));
      const sy = Math.max(0, Math.min(src.height - 1, y + yy));
      const i = (sy * src.width + sx) * 4;
      const d = (yy * w + xx) * 4;
      out.data[d] = src.data[i];
      out.data[d + 1] = src.data[i + 1];
      out.data[d + 2] = src.data[i + 2];
      out.data[d + 3] = 255;
    }
  }
  return out;
}

function boards() {
  const face = PNG.sync.read(fs.readFileSync(path.join(outDir, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V7.png')));
  const plate = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'north-star-face', 'faceplate-390x844.png')));
  const keys = ['tuner', 'sound', 'minus', 'plus', 'loop', 'tap', 'play', 'meter', 'pockt'];
  const cells = keys.map((key) => {
    const b = box(key);
    const rest = crop(face, b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    const down = crop(plate, b.x - 8, b.y - 6, b.w + 16, b.h + 16);
    const cap = PNG.sync.read(fs.readFileSync(path.join(root, 'assets', 'north-star-v6', `${key}.png`)));
    for (let y = 0; y < cap.height; y += 1) {
      const dy = y + 8 + 2;
      if (dy < 0 || dy >= down.height) continue;
      for (let x = 0; x < cap.width; x += 1) {
        const dx = x + 8;
        if (dx < 0 || dx >= down.width) continue;
        const s = (y * cap.width + x) * 4;
        const d = (dy * down.width + dx) * 4;
        const shade = 0.86;
        const squash = y / Math.max(1, cap.height - 1);
        const srcY = Math.min(cap.height - 1, Math.round(y / 0.975));
        const ss = (srcY * cap.width + x) * 4;
        down.data[d] = Math.min(255, cap.data[ss] * shade);
        down.data[d + 1] = Math.min(255, cap.data[ss + 1] * shade);
        down.data[d + 2] = Math.min(255, cap.data[ss + 2] * shade);
        void squash;
      }
    }
    return { rest, down, w: rest.width, h: rest.height };
  });
  const gap = 18;
  const labelH = 22;
  const cellW = Math.max(...cells.map((cell) => cell.w));
  const cellH = Math.max(...cells.map((cell) => cell.h));
  const width = keys.length * (cellW + gap) + gap;
  const height = labelH + cellH * 2 + gap * 3;
  const sheet = new PNG({ width, height });
  sheet.data.fill(18);
  for (let i = 0; i < sheet.data.length; i += 4) sheet.data[i + 3] = 255;
  cells.forEach((cell, index) => {
    const x = gap + index * (cellW + gap);
    blit(sheet, cell.rest, x, labelH + gap);
    blit(sheet, cell.down, x, labelH + gap + cellH + gap);
  });
  fs.writeFileSync(path.join(outDir, 'BUTTON_PRESS_V7.png'), PNG.sync.write(sheet));

  const seams = [];
  for (let index = 0; index < frame.bands.length - 1; index += 1) {
    const above = frame.bands[index];
    const below = frame.bands[index + 1];
    const y = Math.max(0, Math.floor(above.y + above.h) - 18);
    const h = Math.min(face.height - y, Math.ceil(below.y - (above.y + above.h)) + 36);
    seams.push(crop(face, 0, y, 390, h));
  }
  const seamH = seams.reduce((sum, item) => sum + item.height * 2, 0);
  const seam = new PNG({ width: 780, height: seamH });
  seam.data.fill(12);
  for (let i = 3; i < seam.data.length; i += 4) seam.data[i] = 255;
  let cursor = 0;
  for (const item of seams) {
    const big = new PNG({ width: item.width * 2, height: item.height * 2 });
    for (let y = 0; y < item.height; y += 1) {
      for (let x = 0; x < item.width; x += 1) {
        const s = (y * item.width + x) * 4;
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            const d = ((y * 2 + dy) * big.width + (x * 2 + dx)) * 4;
            big.data[d] = item.data[s];
            big.data[d + 1] = item.data[s + 1];
            big.data[d + 2] = item.data[s + 2];
            big.data[d + 3] = 255;
          }
        }
      }
    }
    blit(seam, big, 0, cursor);
    cursor += big.height;
  }
  fs.writeFileSync(path.join(outDir, 'SEAM_INSPECTION_V7.png'), PNG.sync.write(seam));

  const lamp = box('beat1');
  const levels = [0, 0.28, 0.5, 0.74, 1];
  const lampSheet = new PNG({ width: lamp.w * levels.length + 40, height: lamp.h + 20 });
  lampSheet.data.fill(16);
  for (let i = 0; i < lampSheet.data.length; i += 4) lampSheet.data[i + 3] = 255;
  levels.forEach((level, index) => {
    const cell = crop(plate, lamp.x, lamp.y, lamp.w, lamp.h);
    const cx = lamp.w / 2;
    const cy = lamp.h / 2;
    const radius = lamp.w * 0.22;
    for (let y = 0; y < cell.height; y += 1) {
      for (let x = 0; x < cell.width; x += 1) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > radius) continue;
        const i = (y * cell.width + x) * 4;
        const glow = Math.max(0, 1 - d / radius) * level;
        if (level === 0) {
          cell.data[i] = Math.round(cell.data[i] * 0.35);
          cell.data[i + 1] = Math.round(cell.data[i + 1] * 0.3);
          cell.data[i + 2] = Math.round(cell.data[i + 2] * 0.25);
        } else {
          cell.data[i] = Math.min(255, cell.data[i] + 180 * glow);
          cell.data[i + 1] = Math.min(255, cell.data[i + 1] + 110 * glow);
          cell.data[i + 2] = Math.min(255, cell.data[i + 2] + 30 * glow);
        }
      }
    }
    blit(lampSheet, cell, 10 + index * (lamp.w + 6), 10);
  });
  fs.writeFileSync(path.join(outDir, 'BEAT_LIGHT_LEVELS_V7.png'), PNG.sync.write(lampSheet));
  console.log('boards written');
}

function blit(dst, src, x, y) {
  for (let yy = 0; yy < src.height; yy += 1) {
    for (let xx = 0; xx < src.width; xx += 1) {
      if (x + xx < 0 || y + yy < 0 || x + xx >= dst.width || y + yy >= dst.height) continue;
      const s = (yy * src.width + xx) * 4;
      const d = ((y + yy) * dst.width + (x + xx)) * 4;
      dst.data[d] = src.data[s];
      dst.data[d + 1] = src.data[s + 1];
      dst.data[d + 2] = src.data[s + 2];
      dst.data[d + 3] = 255;
    }
  }
}

async function main() {
  containMaster();
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage();
  await shot(page, screenHtml(base, {}), path.join(outDir, 'CURRENT_FACE_FOR_GREGG_NORTH_STAR_V7.png'), 390, 844);
  if (process.env.FACE_ONLY === '1') {
    await browser.close();
    server.close();
    return;
  }
  await shot(page, screenHtml(base, { running: true }), path.join(outDir, 'CURRENT_RUNNING_FOR_GREGG_NORTH_STAR_V7.png'), 390, 844);
  const compare = `<!doctype html><html><body style="margin:0"><div id="screen" style="width:780px;height:844px;display:flex">
    <img src="${base}/artifacts/north-star-build/_master-contain.png" width="390" height="844">
    <img src="${base}/artifacts/north-star-build/CURRENT_FACE_FOR_GREGG_NORTH_STAR_V7.png" width="390" height="844">
  </div></body></html>`;
  await shot(page, compare, path.join(outDir, 'NORTH_STAR_VS_PRODUCTION_V7.png'), 780, 844);

  const values = [20, 60, 99, 100, 120, 240, 399, 400];
  const dial = box('play');
  void dial;
  const glassX = Math.round(frame.mapX(469));
  const glassY = Math.round(frame.mapY(501));
  const tile = 150;
  const bpmHtml = `<!doctype html><html><head><style>
    html,body{margin:0;background:#111}
    #screen{width:${tile * 4}px;height:${tile * 2}px;position:relative}
    .cell{position:absolute;width:${tile}px;height:${tile}px;overflow:hidden}
    .bpm{position:absolute;left:${glassX}px;top:${glassY}px;transform:translate(-50%,-54%);text-align:center;color:#F6C98A;font-family:Arial,sans-serif;font-variant-numeric:tabular-nums}
    .digits{font-size:46px;font-weight:500;line-height:0.9;text-shadow:0 0 10px rgba(246,180,80,.55)}
    .unit{margin-top:6px;font-size:11px;letter-spacing:0.42em;font-weight:600;color:#E8A85A;text-indent:0.42em}
  </style></head><body><div id="screen">${values.map((value, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const left = tile / 2 - glassX;
    const top = tile / 2 - glassY;
    return `<div class="cell" style="left:${col * tile}px;top:${row * tile}px">
      <img src="${base}/assets/north-star-face/faceplate-390x844.png" style="position:absolute;left:${left}px;top:${top}px;width:390px;height:844px">
      <div class="bpm" style="left:${glassX + left}px;top:${glassY + top}px"><div class="digits">${value}</div><div class="unit">BPM</div></div>
    </div>`;
  }).join('')}</div></body></html>`;
  await shot(page, bpmHtml, path.join(outDir, 'BPM_CENTER_V7.png'), tile * 4, tile * 2);
  await browser.close();
  server.close();
  boards();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

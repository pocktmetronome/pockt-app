'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', process.env.POCKT_PROOF_OUT || 'north-star-home-final2');
const northStar = process.env.POCKT_PROOF_FAITHFUL
  ? path.join(root, 'artifacts', 'north-star-faithful-v3', '_pack', 'references', 'POCKT_NORTH_STAR_DIAL.png')
  : path.join(root, 'artifacts', 'north-star-home', '_pack', 'references', 'POCKT_NORTH_STAR_DIAL.png');
const port = Number(process.env.POCKT_PROOF_PORT || 8081);
const base = `http://127.0.0.1:${port}`;

function proofInsets(height) {
  if (height < 700) return { top: 20, bottom: 0, left: 0, right: 0 };
  return { top: 47, bottom: 34, left: 0, right: 0 };
}

function browserPath() {
  const candidates = [
    process.env.POCKT_PROOF_BROWSER,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base);
      if (response.ok || response.status < 500) return;
    } catch {
      /* booting */
    }
    await sleep(1000);
  }
  throw new Error('Expo web did not become reachable');
}

const shot = (name, extra, width = 390, height = 844, id = '01_DIAL_STOPPED') => [name, id, width, height, extra];

const SHOTS = process.env.POCKT_PROOF_FAITHFUL || process.env.POCKT_PROOF_CLEAN
  ? [
      shot('production-320.png', 'bpm=120&accents=strong,normal,normal,normal', 320, 568),
      shot('production-390.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844),
      shot('production-430.png', 'bpm=120&accents=strong,normal,normal,normal', 430, 932),
      shot('beat-off.png', 'bpm=120&accents=mute,mute,mute,mute'),
      shot('beat-soft.png', 'bpm=120&accents=soft,soft,soft,soft'),
      shot('beat-normal.png', 'bpm=120&accents=normal,normal,normal,normal'),
      shot('beat-strong.png', 'bpm=120&accents=strong,strong,strong,strong'),
      shot('beat-current.png', 'bpm=120&beat=1&accents=strong,normal,soft,mute', 390, 844, '02_DIAL_PLAYING'),
      shot('beat-cover-mid.png', 'bpm=120&beatCover=mid'),
      shot('beat-visibility-off.png', 'bpm=120&beatCover=off'),
      shot('playing.png', 'bpm=120', 390, 844, '02_DIAL_PLAYING'),
    ]
  : process.env.POCKT_PROOF_STATES
  ? [
      shot('production-reference-390.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844),
      shot('dial-20-bpm.png', 'bpm=20&accents=strong,normal,normal,normal', 390, 844),
      shot('state-60-bpm.png', 'bpm=60&accents=strong,normal,normal,normal', 390, 844),
      shot('dial-120-bpm.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844),
      shot('state-160-bpm.png', 'bpm=160&accents=strong,normal,normal,normal', 390, 844),
      shot('dial-200-bpm.png', 'bpm=200&accents=strong,normal,normal,normal', 390, 844),
      shot('state-240-bpm.png', 'bpm=240&accents=strong,normal,normal,normal', 390, 844),
      shot('dial-260-bpm.png', 'bpm=260&accents=strong,normal,normal,normal', 390, 844),
      shot('dial-320-bpm.png', 'bpm=320&accents=strong,normal,normal,normal', 390, 844),
      shot('state-400-bpm.png', 'bpm=400&accents=strong,normal,normal,normal', 390, 844),
      shot('state-160-320.png', 'bpm=160&accents=strong,normal,normal,normal', 320, 568),
      shot('state-160-430.png', 'bpm=160&accents=strong,normal,normal,normal', 430, 932),
      shot('state-playing.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '02_DIAL_PLAYING'),
      shot('state-3-4.png', 'bpm=120&meter=3/4&accents=strong,normal,normal', 390, 844),
      shot('state-6-8.png', 'bpm=120&meter=6/8&accents=strong,normal,normal,normal,normal,normal', 390, 844),
      shot('state-7-8.png', 'bpm=120&meter=7/8&accents=strong,normal,normal,normal,normal,normal,normal', 390, 844),
      shot('state-12-8.png', 'bpm=120&meter=12/8&accents=strong,normal,normal,normal,normal,normal,normal,normal,normal,normal,normal,normal', 390, 844),
      shot('state-lamp-on.png', 'bpm=120&accents=strong,normal,normal,normal&beatCover=on', 390, 844),
      shot('state-lamp-off.png', 'bpm=120&accents=strong,normal,normal,normal&beatCover=off', 390, 844),
      shot('state-alt-accents.png', 'bpm=120&accents=normal,strong,mute,soft', 390, 844),
      shot('state-all-mute.png', 'bpm=120&accents=mute,mute,mute,mute', 390, 844),
      shot('nav-dial-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '01_DIAL_STOPPED'),
      shot('nav-rhythm-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '03_RHYTHM_STOPPED_4-4'),
      shot('nav-pulse-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '08_PULSE_STOPPED'),
      shot('nav-pendulum-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '14_PENDULUM_CENTER'),
      shot('nav-pro-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '18_PRO_STOPPED_4-4'),
      shot('nav-beatline-selected.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844, '22_BEATLINE_STOPPED_4-4'),
      shot('production-320.png', 'bpm=120&accents=strong,normal,normal,normal', 320, 568),
      shot('production-390.png', 'bpm=120&accents=strong,normal,normal,normal', 390, 844),
      shot('production-430.png', 'bpm=120&accents=strong,normal,normal,normal', 430, 932),
    ]
  : process.env.POCKT_PROOF_FAST
  ? [
      shot('production-320.png', 'bpm=120', 320, 568),
      shot('production-390.png', 'bpm=120', 390, 844),
      shot('production-430.png', 'bpm=120', 430, 932),
    ]
  : [
  shot('production-320.png', 'bpm=120', 320, 568),
  shot('production-375.png', 'bpm=120', 375, 812),
  shot('production-390.png', 'bpm=120', 390, 844),
  shot('production-430.png', 'bpm=120', 430, 932),
  shot('beat-off.png', 'bpm=120&accents=mute,mute,mute,mute'),
  shot('beat-soft.png', 'bpm=120&accents=soft,soft,soft,soft'),
  shot('beat-normal.png', 'bpm=120&accents=normal,normal,normal,normal'),
  shot('beat-strong.png', 'bpm=120&accents=strong,strong,strong,strong'),
  shot('beat-current.png', 'bpm=120&beat=1&accents=strong,normal,soft,mute', 390, 844, '02_DIAL_PLAYING'),
  shot('beat-cover-mid.png', 'bpm=120&beatCover=mid'),
  shot('beat-visibility-off.png', 'bpm=120&beatCover=off'),
  shot('loop-button-down.png', 'bpm=120&loopDown=1'),
  shot('tap-down.png', 'bpm=120&tapDown=1'),
  shot('play-down.png', 'bpm=120&playDown=1'),
  shot('playing.png', 'bpm=120', 390, 844, '02_DIAL_PLAYING'),
  shot('meter-down.png', 'bpm=120&meterDown=1'),
  shot('options-down.png', 'bpm=120&pDown=1'),
  shot('loop-main-face.png', 'bpm=120&railMode=deck'),
  shot('loop-recording.png', 'bpm=120&railMode=deck&phrase=recording'),
  shot('loop-ready.png', 'bpm=120&railMode=deck&phrase=ready'),
  shot('loop-playing.png', 'bpm=120&railMode=deck&phrase=playing'),
  shot('nav-pendulum.png', 'bpm=120', 390, 844, '14_PENDULUM_CENTER'),
];

if (process.env.POCKT_PROOF_ONLY) {
  const only = process.env.POCKT_PROOF_ONLY.split(',');
  const picked = SHOTS.filter((entry) => only.includes(entry[0]));
  SHOTS.length = 0;
  picked.forEach((entry) => SHOTS.push(entry));
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function crop(src, x, y, w, h) {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const width = Math.max(1, Math.min(src.width - left, Math.round(w)));
  const height = Math.max(1, Math.min(src.height - top, Math.round(h)));
  const out = new PNG({ width, height });
  for (let row = 0; row < height; row += 1) {
    src.data.copy(out.data, row * width * 4, ((top + row) * src.width + left) * 4, ((top + row) * src.width + left) * 4 + width * 4);
  }
  return out;
}

function resize(src, width, height) {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(src.height - 1, Math.floor(((y + 0.5) * src.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor(((x + 0.5) * src.width) / width));
      const s = (sy * src.width + sx) * 4;
      const d = (y * width + x) * 4;
      out.data[d] = src.data[s];
      out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = 255;
    }
  }
  return out;
}

function sideBySide(left, right) {
  const height = Math.max(left.height, right.height);
  const gap = 16;
  const out = new PNG({ width: left.width + gap + right.width, height });
  out.data.fill(12);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  const blit = (src, ox, oy) => {
    for (let y = 0; y < src.height; y += 1) {
      for (let x = 0; x < src.width; x += 1) {
        const s = (y * src.width + x) * 4;
        const d = ((oy + y) * out.width + ox + x) * 4;
        out.data[d] = src.data[s];
        out.data[d + 1] = src.data[s + 1];
        out.data[d + 2] = src.data[s + 2];
      }
    }
  };
  blit(left, 0, Math.round((height - left.height) / 2));
  blit(right, left.width + gap, Math.round((height - right.height) / 2));
  return out;
}

function screenOf(file) {
  const src = readPng(file);
  // Inner display of the North Star render, inside the metal bezel.
  // Measured so the status bar and home indicator stay in frame.
  return crop(src, 140, 28, 746, 1442);
}

function blend(base, over, alpha) {
  const out = new PNG({ width: base.width, height: base.height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = Math.round(base.data[i] * (1 - alpha) + over.data[i] * alpha);
    out.data[i + 1] = Math.round(base.data[i + 1] * (1 - alpha) + over.data[i + 1] * alpha);
    out.data[i + 2] = Math.round(base.data[i + 2] * (1 - alpha) + over.data[i + 2] * alpha);
    out.data[i + 3] = 255;
  }
  return out;
}

function stroke(png, box, rgb) {
  const x0 = Math.max(0, Math.round(box.x));
  const y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(png.width - 1, Math.round(box.x + box.w));
  const y1 = Math.min(png.height - 1, Math.round(box.y + box.h));
  const plot = (x, y) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const d = (y * png.width + x) * 4;
    png.data[d] = rgb[0];
    png.data[d + 1] = rgb[1];
    png.data[d + 2] = rgb[2];
    png.data[d + 3] = 255;
  };
  for (let x = x0; x <= x1; x += 1) {
    plot(x, y0);
    plot(x, y1);
    plot(x, y0 + 1);
    plot(x, y1 - 1);
  }
  for (let y = y0; y <= y1; y += 1) {
    plot(x0, y);
    plot(x1, y);
    plot(x0 + 1, y);
    plot(x1 - 1, y);
  }
}

function fillBlock(png, box, rgb) {
  const x0 = Math.max(0, Math.round(box.x));
  const y0 = Math.max(0, Math.round(box.y));
  const x1 = Math.min(png.width, Math.round(box.x + box.w));
  const y1 = Math.min(png.height, Math.round(box.y + box.h));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const d = (y * png.width + x) * 4;
      png.data[d] = rgb[0];
      png.data[d + 1] = rgb[1];
      png.data[d + 2] = rgb[2];
      png.data[d + 3] = 255;
    }
  }
}

function blank(width, height) {
  const png = new PNG({ width, height });
  png.data.fill(8);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
  return png;
}

function grayBlur(src, radius) {
  const W = src.width;
  const H = src.height;
  const gray = new Float32Array(W * H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      gray[y * W + x] = src.data[i] * 0.2126 + src.data[i + 1] * 0.7152 + src.data[i + 2] * 0.0722;
    }
  }
  const out = new PNG({ width: W, height: H });
  const r = Math.max(1, radius);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          sum += gray[yy * W + xx];
          n += 1;
        }
      }
      const v = Math.round(sum / n);
      const d = (y * W + x) * 4;
      out.data[d] = v;
      out.data[d + 1] = v;
      out.data[d + 2] = v;
      out.data[d + 3] = 255;
    }
  }
  return out;
}

function writePng(file, png) {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function writeSheet(images, file) {
  const columns = 2;
  const thumbW = 390;
  const thumbs = images.map((image) => resize(image, thumbW, Math.round((thumbW * image.height) / image.width)));
  const rowH = Math.max(...thumbs.map((thumb) => thumb.height)) + 24;
  const rows = Math.ceil(thumbs.length / columns);
  const sheet = new PNG({ width: columns * (thumbW + 16), height: rows * rowH });
  sheet.data.fill(16);
  for (let i = 3; i < sheet.data.length; i += 4) sheet.data[i] = 255;
  thumbs.forEach((thumb, index) => {
    const ox = (index % columns) * (thumbW + 16) + 8;
    const oy = Math.floor(index / columns) * rowH + 8;
    for (let y = 0; y < thumb.height; y += 1) {
      for (let x = 0; x < thumb.width; x += 1) {
        const s = (y * thumb.width + x) * 4;
        const d = ((oy + y) * sheet.width + ox + x) * 4;
        sheet.data[d] = thumb.data[s];
        sheet.data[d + 1] = thumb.data[s + 1];
        sheet.data[d + 2] = thumb.data[s + 2];
      }
    }
  });
  writePng(file, sheet);
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const expo = spawn('npx', ['expo', 'start', '--web', '--offline', '--port', String(port)], {
    cwd: root,
    shell: true,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  expo.stdout.on('data', (chunk) => process.stdout.write(chunk));
  expo.stderr.on('data', (chunk) => process.stderr.write(chunk));
  let browser;
  try {
    await waitForServer();
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);
    for (const [name, id, width, height, extra] of SHOTS) {
      await page.setViewport({ width: width + 8, height: height + 8, deviceScaleFactor: 1 });
      const url = `${base}/visual-proof?shot=${id}&width=${width}&height=${height}&${extra}&cb=${Date.now()}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('[data-testid="pockt-3-foundation"]', { timeout: 60000 });
      await sleep(900);
      const foundation = await page.$('[data-testid="pockt-3-foundation"]');
      const file = path.join(outDir, name);
      await foundation.screenshot({ path: file });
      console.log(file);
    }
    const live = readPng(path.join(outDir, 'production-390.png'));
    const layout = computeFoundationLayout(390, 844, proofInsets(844), { dialChrome: true, presentation: 'beats', beatRows: 1 });
    writePng(path.join(outDir, 'header.png'), crop(live, 0, layout.header.y - 4, 390, layout.header.h + 8));
    writePng(path.join(outDir, 'tempo-controls.png'), crop(live, 0, layout.bpmPlus.y - 4, 390, layout.bpmPlus.h + 8));
    writePng(path.join(outDir, 'dial.png'), crop(live, layout.dial.x, layout.dial.y, layout.dial.w, layout.dial.h));
    writePng(path.join(outDir, 'beat-strip.png'), crop(live, 0, layout.beats.y - 6, 390, layout.beats.h + 12));
    writePng(path.join(outDir, 'beat-visibility-on.png'), crop(live, 0, layout.beats.y - 6, 390, layout.beats.h + 12));
    writePng(path.join(outDir, 'transport.png'), crop(live, 0, layout.transport.y - 6, 390, layout.transport.h + 12));
    writePng(path.join(outDir, 'nav.png'), crop(live, 0, layout.navBar.y, 390, layout.faceRail.h + 8));
    writePng(path.join(outDir, 'loop-button.png'), crop(live, layout.beats.x + layout.beats.w - 96, layout.beats.y, 96, layout.beats.h));
    const slot = layout.faceRail.w / 6;
    const pendulum = crop(live, layout.faceRail.x + slot * 3, layout.faceRail.y, slot, layout.faceRail.h);
    writePng(path.join(outDir, 'pendulum-icon-detail.png'), resize(pendulum, pendulum.width * 4, pendulum.height * 4));
    fs.copyFileSync(path.join(outDir, 'production-390.png'), path.join(outDir, 'loop-return.png'));
    const target = screenOf(northStar);
    writePng(path.join(outDir, 'target.png'), target);
    if (!process.env.POCKT_PROOF_FAST && !process.env.POCKT_PROOF_CLEAN && !process.env.POCKT_PROOF_STATES) {
    for (const [fileName, liveShot] of [
      ['target-vs-320.png', 'production-320.png'],
      ['target-vs-375.png', 'production-375.png'],
      ['target-vs-390.png', 'production-390.png'],
      ['target-vs-430.png', 'production-430.png'],
    ]) {
      const shotPng = readPng(path.join(outDir, liveShot));
      writePng(path.join(outDir, fileName), sideBySide(resize(target, shotPng.width, shotPng.height), shotPng));
    }
    }
    const aligned = resize(target, live.width, live.height);
    writePng(path.join(outDir, 'target-aligned-390.png'), aligned);
    const over = blend(aligned, live, 0.5);
    const targetZones = [
      { x: 18, y: 52, w: 354, h: 60 },
      { x: 22, y: 114, w: 346, h: 82 },
      { x: 14, y: 204, w: 362, h: 362 },
      { x: 10, y: 574, w: 370, h: 100 },
      { x: 12, y: 682, w: 366, h: 74 },
      { x: 8, y: 764, w: 374, h: 70 },
    ];
    const productionZones = [layout.header, { x: layout.bpmPlus.x, y: layout.bpmPlus.y, w: layout.bpmMinus.x + layout.bpmMinus.w - layout.bpmPlus.x, h: layout.bpmPlus.h }, layout.dial, layout.beats, layout.transport, layout.faceRail];
    const boxPng = new PNG({ width: live.width, height: live.height });
    boxPng.data.fill(0);
    for (let i = 3; i < boxPng.data.length; i += 4) boxPng.data[i] = 255;
    for (let y = 0; y < live.height; y += 1) {
      for (let x = 0; x < live.width; x += 1) {
        const s = (y * live.width + x) * 4;
        const d = s;
        const v = Math.round(live.data[s] * 0.35 + live.data[s + 1] * 0.35 + live.data[s + 2] * 0.35);
        boxPng.data[d] = v;
        boxPng.data[d + 1] = v;
        boxPng.data[d + 2] = v;
      }
    }
    targetZones.forEach((zone) => stroke(boxPng, zone, [255, 64, 64]));
    productionZones.forEach((zone) => stroke(boxPng, zone, [64, 196, 255]));
    writePng(path.join(outDir, 'bbox-overlay-390.png'), boxPng);
    writePng(path.join(outDir, 'weight-comparison-390.png'), sideBySide(grayBlur(aligned, 2), grayBlur(live, 2)));
    for (const width of [320, 430]) {
      const shotPng = readPng(path.join(outDir, `production-${width}.png`));
      const alignedWidth = resize(target, shotPng.width, shotPng.height);
      writePng(path.join(outDir, `target-aligned-${width}.png`), alignedWidth);
      writePng(path.join(outDir, `target-vs-production-${width}.png`), sideBySide(alignedWidth, shotPng));
    }
    let fastDone = false;
    writePng(path.join(outDir, 'target-vs-production-390.png'), sideBySide(aligned, live));
    if (process.env.POCKT_PROOF_CLEAN || process.env.POCKT_PROOF_FAITHFUL) {
      const zoom = (src, box, name, scale = 3) => {
        const piece = crop(src, box.x, box.y, box.w, box.h);
        writePng(path.join(outDir, name), resize(piece, Math.max(1, piece.width * scale), Math.max(1, piece.height * scale)));
      };
      const beatShot = (file) => readPng(path.join(outDir, file));
      const cell = { x: layout.beats.x + 34, y: layout.beats.y - 4, w: 72, h: layout.beats.h };
      const tempo = {
        x: layout.bpmPlus.x,
        y: layout.bpmPlus.y,
        w: layout.bpmMinus.x + layout.bpmMinus.w - layout.bpmPlus.x,
        h: layout.bpmPlus.h,
      };
      const slot = layout.faceRail.w / 6;
      zoom(live, layout.header, 'header-detail.png', 2);
      if (process.env.POCKT_PROOF_FAITHFUL) {
        zoom(live, layout.identity, 'wordmark-detail.png', 2);
        zoom(live, tempo, 'tempo-detail.png', 2);
      } else {
        zoom(live, layout.bpmPlus, 'tempo-plus-detail.png', 3);
        zoom(live, layout.bpmMinus, 'tempo-minus-detail.png', 3);
      }
      zoom(live, { x: layout.readout.x, y: layout.readout.y, w: layout.readout.w, h: layout.readout.h + layout.bpmLabel.h }, 'bpm-detail.png', 2);
      if (process.env.POCKT_PROOF_FAITHFUL) {
        zoom(live, layout.beats, 'beat-strip-detail.png', 2);
      } else {
        zoom(live, { x: layout.beats.x, y: layout.beats.y, w: 72, h: layout.beats.h }, 'beat-visibility-detail.png', 3);
      }
      zoom(beatShot('beat-off.png'), cell, 'beat-off-detail.png', 3);
      zoom(beatShot('beat-soft.png'), cell, 'beat-soft-detail.png', 3);
      zoom(beatShot('beat-normal.png'), cell, 'beat-normal-detail.png', 3);
      zoom(beatShot('beat-strong.png'), cell, 'beat-strong-detail.png', 3);
      zoom(beatShot('beat-current.png'), cell, 'beat-current-detail.png', 3);
      zoom(live, { x: layout.beats.x + layout.beats.w - 96, y: layout.beats.y, w: 96, h: layout.beats.h }, 'loop-detail.png', 3);
      zoom(live, layout.tap, 'tap-detail.png', 3);
      zoom(live, layout.play, 'play-detail.png', 3);
      zoom(beatShot('playing.png'), layout.play, 'stop-detail.png', 3);
      zoom(live, layout.meter, 'meter-detail.png', 3);
      zoom(live, layout.pockt, process.env.POCKT_PROOF_FAITHFUL ? 'options-detail.png' : 'options-p-detail.png', 3);
      zoom(live, layout.faceRail, 'nav-detail.png', 2);
      if (process.env.POCKT_PROOF_FAITHFUL) {
        zoom(live, { x: layout.faceRail.x, y: layout.faceRail.y, w: slot, h: layout.faceRail.h }, 'nav-selected-detail.png', 3);
        zoom(live, { x: layout.faceRail.x + slot * 3, y: layout.faceRail.y, w: slot, h: layout.faceRail.h }, 'pendulum-detail.png', 3);
        zoom(live, layout.beats, 'cover-open.png', 2);
        zoom(beatShot('beat-cover-mid.png'), layout.beats, 'cover-mid.png', 2);
        zoom(beatShot('beat-visibility-off.png'), layout.beats, 'cover-closed.png', 2);
      } else {
        zoom(live, layout.beats, 'beat-cover-open-detail.png', 2);
        zoom(beatShot('beat-cover-mid.png'), layout.beats, 'beat-cover-mid-detail.png', 2);
        zoom(beatShot('beat-visibility-off.png'), layout.beats, 'beat-cover-closed-detail.png', 2);
      }
    }
    if (process.env.POCKT_PROOF_FAST || process.env.POCKT_PROOF_CLEAN || process.env.POCKT_PROOF_FAITHFUL || process.env.POCKT_PROOF_STATES) fastDone = true;
    if (!fastDone) {
    const colors = [[90, 190, 255], [255, 196, 80], [120, 220, 140], [255, 120, 160], [180, 140, 255], [255, 230, 120]];
    productionZones.forEach((zone, index) => stroke(over, zone, colors[index]));
    targetZones.forEach((zone, index) => stroke(over, zone, colors[index].map((channel) => Math.round(channel * 0.55))));
    writePng(path.join(outDir, 'geometry-overlay-390.png'), over);
    const silLeft = blank(390, 844);
    const silRight = blank(390, 844);
    targetZones.forEach((zone) => fillBlock(silLeft, zone, [212, 168, 92]));
    productionZones.forEach((zone) => fillBlock(silRight, zone, [212, 168, 92]));
    writePng(path.join(outDir, 'layout-silhouette-390.png'), sideBySide(silLeft, silRight));
    writeSheet(
      ['production-320.png', 'production-375.png', 'production-390.png', 'production-430.png', 'target-vs-390.png'].map((name) => readPng(path.join(outDir, name))),
      path.join(outDir, 'CONTACT-SHEET-MAIN.png')
    );
    writeSheet(
      ['beat-off.png', 'beat-soft.png', 'beat-normal.png', 'beat-strong.png', 'beat-current.png', 'beat-cover-mid.png', 'beat-visibility-off.png', 'playing.png', 'play-down.png', 'tap-down.png', 'meter-down.png', 'options-down.png'].map((name) => readPng(path.join(outDir, name))),
      path.join(outDir, 'CONTACT-SHEET-STATES.png')
    );
    writeSheet(
      ['loop-main-face.png', 'loop-recording.png', 'loop-ready.png', 'loop-playing.png', 'loop-return.png', 'loop-button-down.png'].map((name) => readPng(path.join(outDir, name))),
      path.join(outDir, 'CONTACT-SHEET-LOOP.png')
    );
    }
  } finally {
    if (browser) await browser.close();
    expo.kill();
  }
  console.log('north-star-proofs-complete');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'device152-correction');
const refDir = path.join(root, 'artifacts', '_visual-contract-refs');
const port = Number(process.env.POCKT_PROOF_PORT || 8098);
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

const W = 390;
const H = 844;
const shot = (name, extra, width = W, height = H, id = '01_DIAL_STOPPED') => [name, id, width, height, extra];

const SHOTS = [
  shot('DIAL-320.png', 'bpm=120', 320, 568),
  shot('DIAL-375.png', 'bpm=120', 375, 812),
  shot('DIAL-390.png', 'bpm=120', 390, 844),
  shot('DIAL-430.png', 'bpm=120', 430, 932),
  shot('DIAL-20.png', 'bpm=20'),
  shot('DIAL-40.png', 'bpm=40'),
  shot('DIAL-104.png', 'bpm=104'),
  shot('DIAL-105.png', 'bpm=105'),
  shot('DIAL-106.png', 'bpm=106'),
  shot('DIAL-120.png', 'bpm=120'),
  shot('DIAL-155.png', 'bpm=155'),
  shot('DIAL-160.png', 'bpm=160'),
  shot('DIAL-165.png', 'bpm=165'),
  shot('DIAL-200.png', 'bpm=200'),
  shot('DIAL-260.png', 'bpm=260'),
  shot('DIAL-300.png', 'bpm=300'),
  shot('DIAL-400.png', 'bpm=400'),
  shot('header-rest.png', 'bpm=120'),
  shot('tuner-rest.png', 'bpm=120'),
  shot('tuner-down.png', 'bpm=120&tunerDown=1'),
  shot('sound-rest.png', 'bpm=120'),
  shot('sound-down.png', 'bpm=120&soundDown=1'),
  shot('plus-rest.png', 'bpm=120'),
  shot('plus-down.png', 'bpm=120&plusDown=1'),
  shot('minus-rest.png', 'bpm=120'),
  shot('minus-down.png', 'bpm=120&minusDown=1'),
  shot('beat-off.png', 'bpm=120&accents=mute,mute,mute,mute'),
  shot('beat-soft.png', 'bpm=120&accents=soft,soft,soft,soft'),
  shot('beat-normal.png', 'bpm=120&accents=normal,normal,normal,normal'),
  shot('beat-strong.png', 'bpm=120&accents=strong,strong,strong,strong'),
  shot('beat-current.png', 'bpm=120&beat=1&accents=strong,normal,soft,mute'),
  shot('beat-2-4.png', 'bpm=120&meter=2/4'),
  shot('beat-3-4.png', 'bpm=120&meter=3/4'),
  shot('beat-4-4.png', 'bpm=120&meter=4/4'),
  shot('beat-5-4.png', 'bpm=120&meter=5/4'),
  shot('beat-6-8.png', 'bpm=120&meter=6/8'),
  shot('beat-7-8.png', 'bpm=120&meter=7/8'),
  shot('beat-9-8.png', 'bpm=120&meter=9/8'),
  shot('beat-12-8.png', 'bpm=120&meter=12/8'),
  shot('transport-rest.png', 'bpm=120'),
  shot('tap-down.png', 'bpm=120&tapDown=1'),
  shot('play-rest.png', 'bpm=120'),
  shot('play-down.png', 'bpm=120&playDown=1'),
  shot('playing.png', 'bpm=120', W, H, '02_DIAL_PLAYING'),
  shot('stop-down.png', 'bpm=120&playDown=1', W, H, '02_DIAL_PLAYING'),
  shot('meter-rest.png', 'bpm=120'),
  shot('meter-down.png', 'bpm=120&meterDown=1'),
  shot('meter-pending.png', 'bpm=120&pendingMeter=7/8', W, H, '02_DIAL_PLAYING'),
  shot('p-rest.png', 'bpm=120'),
  shot('p-down.png', 'bpm=120&pDown=1'),
  shot('phrase-empty.png', 'bpm=120&railMode=deck'),
  shot('phrase-recording.png', 'bpm=120&railMode=deck&phrase=recording'),
  shot('phrase-ready.png', 'bpm=120&railMode=deck&phrase=ready'),
  shot('phrase-playing.png', 'bpm=120&railMode=deck&phrase=playing'),
  shot('phrase-paused.png', 'bpm=120&railMode=deck&phrase=paused'),
  shot('phrase-beats-return.png', 'bpm=120'),
  shot('phrase-320.png', 'bpm=120&railMode=deck', 320, 568),
  shot('phrase-390.png', 'bpm=120&railMode=deck', 390, 844),
  shot('phrase-430.png', 'bpm=120&railMode=deck', 430, 932),
  shot('nav-dial.png', 'bpm=120'),
  shot('nav-rhythm.png', 'bpm=120', W, H, '03_RHYTHM_STOPPED_4-4'),
  shot('nav-pulse.png', 'bpm=120', W, H, '08_PULSE_STOPPED'),
  shot('nav-pendulum.png', 'bpm=120', W, H, '14_PENDULUM_CENTER'),
  shot('nav-pro.png', 'bpm=120', W, H, '19_PRO_PLAYING_4-4'),
  shot('nav-beatline.png', 'bpm=120', W, H, '23_BEATLINE_BEAT1_4-4'),
];

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
  let minX = src.width;
  let minY = src.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < src.height; y += 2) {
    for (let x = 0; x < src.width; x += 2) {
      const i = (y * src.width + x) * 4;
      if (src.data[i] + src.data[i + 1] + src.data[i + 2] > 40) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const insetX = Math.round((maxX - minX) * 0.045);
  const insetY = Math.round((maxY - minY) * 0.028);
  return crop(src, minX + insetX, minY + insetY, maxX - minX - insetX * 2, maxY - minY - insetY * 2);
}

function band(src, top, bottom) {
  return crop(src, 0, src.height * top, src.width, src.height * (bottom - top));
}

function writeSheet(images, file) {
  const columns = 2;
  const thumbW = 360;
  const rows = Math.ceil(images.length / columns);
  const thumbs = images.map((image) => resize(image.png, thumbW, Math.round((thumbW * image.png.height) / image.png.width)));
  const rowH = Math.max(...thumbs.map((thumb) => thumb.height)) + 28;
  const sheet = new PNG({ width: columns * (thumbW + 16), height: rows * rowH });
  sheet.data.fill(18);
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
  fs.writeFileSync(file, PNG.sync.write(sheet));
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const expo = spawn('npx', ['expo', 'start', '--web', '--port', String(port)], {
    cwd: root,
    shell: true,
    env: { ...process.env, CI: '1', BROWSER: 'none' },
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
      await sleep(700);
      const foundation = await page.$('[data-testid="pockt-3-foundation"]');
      const file = path.join(outDir, name);
      await foundation.screenshot({ path: file });
      console.log(file);
    }
    const dialRef = screenOf(path.join(refDir, '01_Dial.png'));
    const phraseRef = screenOf(path.join(refDir, '07_Phrase.png'));
    const live390 = readPng(path.join(outDir, 'DIAL-390.png'));
    const live320 = readPng(path.join(outDir, 'DIAL-320.png'));
    const phrase390 = readPng(path.join(outDir, 'phrase-390.png'));
    fs.writeFileSync(path.join(outDir, 'TARGET-vs-NEW-390.png'), PNG.sync.write(sideBySide(resize(dialRef, live390.width, live390.height), live390)));
    fs.writeFileSync(path.join(outDir, 'TARGET-vs-NEW-320.png'), PNG.sync.write(sideBySide(resize(dialRef, live320.width, live320.height), live320)));
    const layout = computeFoundationLayout(390, 844, proofInsets(844), { dialChrome: true, presentation: 'beats', beatRows: 1 });
    const pairs = [
      ['header-target-vs-new.png', band(dialRef, 0.06, 0.16), crop(live390, 0, layout.header.y, 390, layout.header.h)],
      ['tempo-controls-target-vs-new.png', band(dialRef, 0.14, 0.26), crop(live390, 0, layout.bpmPlus.y, 390, layout.bpmPlus.h)],
      ['dial-target-vs-new.png', band(dialRef, 0.24, 0.72), crop(live390, layout.dial.x, layout.dial.y, layout.dial.w, layout.dial.h)],
      ['beat-strip-target-vs-new.png', band(dialRef, 0.68, 0.78), crop(live390, layout.beats.x, layout.beats.y, layout.beats.w, layout.beats.h)],
      ['transport-target-vs-new.png', band(dialRef, 0.74, 0.88), crop(live390, 0, layout.transport.y, 390, layout.transport.h)],
      ['nav-target-vs-new.png', band(dialRef, 0.86, 0.99), crop(live390, 0, layout.navBar.y, 390, layout.navBar.h)],
      ['phrase-target-vs-new.png', phraseRef, phrase390],
    ];
    for (const [name, left, right] of pairs) {
      const height = Math.max(80, right.height || left.height);
      const width = Math.max(80, right.width || left.width);
      fs.writeFileSync(
        path.join(outDir, name),
        PNG.sync.write(sideBySide(resize(left, width, height), resize(right, width, height)))
      );
    }
    const groups = [
      ['DEVICE152-CORRECTION-CONTACT-SHEET.png', SHOTS.slice(0, 8)],
      ['DEVICE152-CORRECTION-CONTACT-SHEET-2.png', SHOTS.slice(8, 16)],
      ['DEVICE152-CORRECTION-CONTACT-SHEET-3.png', SHOTS.slice(16, 28)],
      ['DEVICE152-CORRECTION-CONTACT-SHEET-4.png', SHOTS.slice(28, 40)],
      ['DEVICE152-CORRECTION-CONTACT-SHEET-5.png', SHOTS.slice(40, 52)],
      ['DEVICE152-CORRECTION-CONTACT-SHEET-6.png', SHOTS.slice(52)],
    ];
    for (const [name, rows] of groups) {
      writeSheet(
        rows.map(([file]) => ({ png: readPng(path.join(outDir, file)) })),
        path.join(outDir, name)
      );
    }
  } finally {
    if (browser) await browser.close();
    expo.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

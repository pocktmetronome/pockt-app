'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PNG } = require('pngjs');
const { computeFoundationLayout } = require('../lib/compute-foundation-layout.ts');
const { dialInstrumentFrame } = require('../lib/dial-frame.ts');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'universal-shell-final');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
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

const SHOTS = [
  ['MASTER-320.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120'],
  ['MASTER-390.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['MASTER-430.png', '01_DIAL_STOPPED', 430, 932, 'bpm=120'],
  ['320-stopped.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120'],
  ['320-playing.png', '02_DIAL_PLAYING', 320, 568, 'bpm=120'],
  ['320-play-down.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120&playDown=1'],
  ['320-tap-down.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120&tapDown=1'],
  ['320-meter-down.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120&meterDown=1'],
  ['320-p-down.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120&pDown=1'],
  ['390-stopped.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['390-playing.png', '02_DIAL_PLAYING', 390, 844, 'bpm=120'],
  ['dial-20.png', '01_DIAL_STOPPED', 390, 844, 'bpm=20'],
  ['dial-40.png', '01_DIAL_STOPPED', 390, 844, 'bpm=40'],
  ['dial-120.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['dial-260.png', '01_DIAL_STOPPED', 390, 844, 'bpm=260'],
  ['dial-400.png', '01_DIAL_STOPPED', 390, 844, 'bpm=400'],
  ['nav-dial.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['nav-rhythm.png', '03_RHYTHM_STOPPED_4-4', 390, 844, 'bpm=120'],
  ['nav-pulse.png', '08_PULSE_STOPPED', 390, 844, 'bpm=120'],
  ['nav-pendulum.png', '14_PENDULUM_CENTER', 390, 844, 'bpm=120'],
  ['nav-pro.png', '18_PRO_STOPPED_4-4', 390, 844, 'bpm=120'],
  ['nav-beatline.png', '22_BEATLINE_STOPPED_4-4', 390, 844, 'bpm=120'],
  ['header-normal.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['header-tuner-down.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120&tunerDown=1'],
  ['header-sound-down.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120&soundDown=1'],
  ['transport-normal.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120'],
  ['transport-play-down.png', '01_DIAL_STOPPED', 390, 844, 'bpm=120&playDown=1'],
  ['transport-playing.png', '02_DIAL_PLAYING', 390, 844, 'bpm=120'],
  ['transport-meter-pending.png', '02_DIAL_PLAYING', 390, 844, 'bpm=120&pendingMeter=7/8'],
  ['safe-area-small.png', '01_DIAL_STOPPED', 320, 568, 'bpm=120'],
  ['safe-area-large.png', '01_DIAL_STOPPED', 430, 932, 'bpm=120'],
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
  const gap = 12;
  const out = new PNG({ width: left.width + gap + right.width, height: Math.max(left.height, right.height) });
  out.data.fill(0);
  for (let i = 3; i < out.data.length; i += 4) out.data[i] = 255;
  const blit = (src, ox) => {
    for (let y = 0; y < src.height; y += 1) {
      for (let x = 0; x < src.width; x += 1) {
        const s = (y * src.width + x) * 4;
        const d = (y * out.width + ox + x) * 4;
        out.data[d] = src.data[s];
        out.data[d + 1] = src.data[s + 1];
        out.data[d + 2] = src.data[s + 2];
      }
    }
  };
  blit(left, 0);
  blit(right, left.width + gap);
  return out;
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
    for (const [name, shot, width, height, extra] of SHOTS) {
      await page.setViewport({ width: width + 8, height: height + 8, deviceScaleFactor: 1 });
      const url = `${base}/visual-proof?shot=${shot}&width=${width}&height=${height}&${extra}&cb=${Date.now()}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('[data-testid="pockt-3-foundation"]', { timeout: 60000 });
      await sleep(900);
      const foundation = await page.$('[data-testid="pockt-3-foundation"]');
      const file = path.join(outDir, name);
      await foundation.screenshot({ path: file });
      console.log(file);
    }
    const approved = readPng(path.join(root, 'artifacts', 'dial-photo-v3-final3', 'proof-dial-320.png'));
    for (const [file, width, height, outName] of [
      ['MASTER-320.png', 320, 568, 'reference-vs-production-320.png'],
      ['MASTER-390.png', 390, 844, 'reference-vs-production-390.png'],
    ]) {
      const live = readPng(path.join(outDir, file));
      const frame = dialInstrumentFrame(width, computeFoundationLayout(width, height, proofInsets(height), { dialChrome: true }));
      const dial = resize(crop(live, frame.x, frame.y, frame.w, frame.h), 320, 320);
      fs.writeFileSync(path.join(outDir, outName), PNG.sync.write(sideBySide(approved, dial)));
    }
    const thumbs = SHOTS.slice(0, 12).map(([name]) => resize(readPng(path.join(outDir, name)), 140, 300));
    const columns = 6;
    const sheet = new PNG({ width: columns * 148, height: Math.ceil(thumbs.length / columns) * 308 });
    sheet.data.fill(12);
    for (let i = 3; i < sheet.data.length; i += 4) sheet.data[i] = 255;
    thumbs.forEach((thumb, index) => {
      const ox = (index % columns) * 148 + 4;
      const oy = Math.floor(index / columns) * 308 + 4;
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
    fs.writeFileSync(path.join(outDir, 'UNIVERSAL-CONTACT-SHEET.png'), PNG.sync.write(sheet));
    console.log('contact sheet written');
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    expo.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-device-correction');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;

function browserPath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((file) => fs.existsSync(file));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function crop(src, x, y, w, h, name) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(out));
  return out;
}

function warm(px, i) {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  return r > 150 && g > 120 && b > 80 && r > b + 18 && g > b;
}

function pointerPeak(png) {
  const cx = 195;
  const cy = 375;
  let north = 0;
  let other = 0;
  for (let y = cy - 150; y < cy - 20; y += 1) {
    for (let x = cx - 150; x < cx + 150; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const radius = Math.hypot(dx, dy);
      if (radius < 28 || radius > 130) continue;
      const i = (y * png.width + x) * 4;
      if (!warm(png.data, i)) continue;
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (Math.abs(deg) <= 12) north += 1;
      else other += 1;
    }
  }
  return { north, other };
}

async function shot(page, file, query, wait) {
  await page.goto(`${base}/visual-proof?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
  await sleep(wait);
  const dest = path.join(outDir, file);
  await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: 390, height: 844 } });
  return readPng(dest);
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.setCacheEnabled(false);
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    const home = await shot(page, '_119.png', 'shot=01_DIAL_STOPPED&bpm=119&accents=default', 1600);
    const lower = await shot(page, '_60.png', 'shot=01_DIAL_STOPPED&bpm=60&accents=default', 1600);
    const higher = await shot(page, '_200.png', 'shot=01_DIAL_STOPPED&bpm=200&accents=default', 1600);
    crop(home, 4, 78, 110, 120, '01-sound-tuner-labels.png');
    const tuner = new PNG({ width: 110, height: 120 });
    PNG.bitblt(home, tuner, 276, 78, 110, 120, 0, 0);
    const labels = new PNG({ width: 232, height: 120 });
    PNG.bitblt(readPng(path.join(outDir, '01-sound-tuner-labels.png')), labels, 0, 0, 110, 120, 0, 0);
    PNG.bitblt(tuner, labels, 0, 0, 110, 120, 122, 0);
    fs.writeFileSync(path.join(outDir, '01-sound-tuner-labels.png'), PNG.sync.write(labels));
    crop(home, 40, 180, 310, 390, '02-fixed-pointer-119.png');
    crop(lower, 40, 180, 310, 390, '03-scale-rotated-lower.png');
    crop(higher, 40, 180, 310, 390, '04-scale-rotated-higher.png');
    const compare = new PNG({ width: 310 * 3 + 16, height: 390 });
    PNG.bitblt(readPng(path.join(outDir, '03-scale-rotated-lower.png')), compare, 0, 0, 310, 390, 0, 0);
    PNG.bitblt(readPng(path.join(outDir, '02-fixed-pointer-119.png')), compare, 0, 0, 310, 390, 318, 0);
    PNG.bitblt(readPng(path.join(outDir, '04-scale-rotated-higher.png')), compare, 0, 0, 310, 390, 636, 0);
    fs.writeFileSync(path.join(outDir, '05-fixed-pointer-comparison.png'), PNG.sync.write(compare));
    const plain = await shot(page, '_plain.png', 'shot=01_DIAL_STOPPED&bpm=119&accents=default', 800);
    crop(plain, 8, 530, 374, 90, '06-beat-rail-idle.png');
    const idle = await shot(page, '_idle.png', 'shot=01_DIAL_STOPPED&bpm=119&accents=strong,normal,soft,mute', 800);
    crop(idle, 8, 530, 374, 90, '07-beat-rail-accent-states.png');
    const beat1 = await shot(page, '_beat1.png', 'shot=02_DIAL_PLAYING&bpm=119&accents=default&beat=0', 70);
    crop(beat1, 8, 530, 374, 90, '08-beat-rail-beat1-active.png');
    const beat2 = await shot(page, '_beat2.png', 'shot=02_DIAL_PLAYING&bpm=119&accents=default&beat=1', 70);
    crop(beat2, 8, 530, 374, 90, '09-beat-rail-beat2-active.png');
    const deck = await shot(page, '_deck.png', 'shot=01_DIAL_STOPPED&bpm=119&accents=default&railMode=deck', 800);
    crop(deck, 8, 530, 374, 90, '10-beat-rail-toggle.png');
    fs.copyFileSync(path.join(outDir, '_119.png'), path.join(outDir, '11-full-dial-final.png'));
    for (const [name, png] of [['119', home], ['60', lower], ['200', higher]]) {
      const peak = pointerPeak(png);
      console.log('pointer-north', name, peak.north, peak.other);
      if (peak.north < 80) throw new Error(`${name} pointer left 12 o'clock`);
    }
    console.log('proofs', outDir);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

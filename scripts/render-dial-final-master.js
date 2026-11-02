'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-final-master');
const refPath = path.join(root, 'artifacts', 'dial-reference-match', '01-reference.png');
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

function pair(name, ref, live, x, y, w, h) {
  const a = new PNG({ width: w, height: h });
  const b = new PNG({ width: w, height: h });
  PNG.bitblt(ref, a, x, y, w, h, 0, 0);
  PNG.bitblt(live, b, x, y, w, h, 0, 0);
  const out = new PNG({ width: w * 2 + 12, height: h });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 8;
    out.data[i + 1] = 8;
    out.data[i + 2] = 8;
    out.data[i + 3] = 255;
  }
  PNG.bitblt(a, out, 0, 0, w, h, 0, 0);
  PNG.bitblt(b, out, 0, 0, w, h, w + 12, 0);
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(out));
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
    const livePath = path.join(outDir, '_live.png');
    await page.goto(`${base}/visual-proof?shot=01_DIAL_STOPPED&bpm=119&accents=default`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
    await sleep(2400);
    await page.screenshot({ path: livePath, clip: { x: 0, y: 0, width: 390, height: 844 } });
    const ref = readPng(refPath);
    const live = readPng(livePath);
    const crops = [
      ['01-outer-brass-reference-vs-live.png', 20, 200, 350, 80],
      ['02-scale-reference-vs-live.png', 15, 190, 360, 360],
      ['03-scale-120-reference-vs-live.png', 140, 190, 110, 100],
      ['04-black-dial-reference-vs-live.png', 70, 250, 250, 220],
      ['05-bearing-pointer-reference-vs-live.png', 155, 250, 80, 210],
      ['06-sound-reference-vs-live.png', 4, 78, 86, 110],
      ['07-tuner-reference-vs-live.png', 300, 78, 86, 110],
      ['08-beat-rail-reference-vs-live.png', 8, 538, 374, 84],
      ['09-beat-containment-reference-vs-live.png', 70, 545, 250, 72],
      ['10-beat-buttons-reference-vs-live.png', 90, 548, 220, 68],
      ['11-tap-reference-vs-live.png', 8, 618, 74, 72],
      ['12-play-reference-vs-live.png', 70, 618, 175, 72],
      ['13-p-reference-vs-live.png', 300, 616, 82, 74],
      ['14-right-toggle-reference-vs-live.png', 316, 546, 66, 72],
    ];
    for (const [name, x, y, w, h] of crops) pair(name, ref, live, x, y, w, h);
    const full = new PNG({ width: 780, height: 844 });
    PNG.bitblt(ref, full, 0, 0, 390, 844, 0, 0);
    PNG.bitblt(live, full, 0, 0, 390, 844, 390, 0);
    fs.writeFileSync(path.join(outDir, '15-full-reference-vs-live.png'), PNG.sync.write(full));
    fs.writeFileSync(path.join(outDir, '16-full-reference-vs-live-phone-size.png'), PNG.sync.write(full));
    console.log('proofs', livePath);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

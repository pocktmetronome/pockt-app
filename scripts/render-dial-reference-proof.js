'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-reference-match');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const pass = process.argv[2] || 'pass1';

const SHOTS = [
  ['live', 'shot=01_DIAL_STOPPED&bpm=119&accents=default', 1600],
  ['playing', 'shot=02_DIAL_PLAYING&bpm=119&accents=default', 900],
  ['alt-bpm', 'shot=01_DIAL_STOPPED&bpm=72&accents=default', 700],
  ['alt-meter', 'shot=01_DIAL_STOPPED&bpm=119&meter=7/8&accents=default', 700],
];

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

function writeOverlay(liveFile, overlayFile, diffFile) {
  const reference = path.join(outDir, '01-reference.png');
  if (!fs.existsSync(reference) || !fs.existsSync(liveFile)) return;
  const a = readPng(reference);
  const b = readPng(liveFile);
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const overlay = new PNG({ width, height });
  const diff = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const ai = (y * a.width + x) * 4;
      const bi = (y * b.width + x) * 4;
      overlay.data[i] = (a.data[ai] + b.data[bi]) >> 1;
      overlay.data[i + 1] = (a.data[ai + 1] + b.data[bi + 1]) >> 1;
      overlay.data[i + 2] = (a.data[ai + 2] + b.data[bi + 2]) >> 1;
      overlay.data[i + 3] = 255;
      diff.data[i] = Math.abs(a.data[ai] - b.data[bi]);
      diff.data[i + 1] = Math.abs(a.data[ai + 1] - b.data[bi + 1]);
      diff.data[i + 2] = Math.abs(a.data[ai + 2] - b.data[bi + 2]);
      diff.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(overlayFile, PNG.sync.write(overlay));
  fs.writeFileSync(diffFile, PNG.sync.write(diff));
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
    for (const [name, query, wait] of SHOTS) {
      await page.goto(`${base}/visual-proof?${query}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(wait);
      const target = path.join(outDir, `${pass}-${name}.png`);
      await page.screenshot({ path: target, clip: { x: 0, y: 0, width: 390, height: 844 } });
      console.log(target);
    }
    writeOverlay(
      path.join(outDir, `${pass}-live.png`),
      path.join(outDir, `${pass}-overlay.png`),
      path.join(outDir, `${pass}-diff.png`)
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

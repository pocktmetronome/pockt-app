'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'dial-hyper-polish');
const refPath = path.join(root, 'artifacts', 'dial-reference-match', '01-reference.png');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const marks = [20, 40, 60, 80, 100, 120, 160, 200, 260, 320, 400];

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
    out.data[i] = 10;
    out.data[i + 1] = 10;
    out.data[i + 2] = 10;
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
    await sleep(2200);
    await page.screenshot({ path: livePath, clip: { x: 0, y: 0, width: 390, height: 844 } });
    console.log(livePath);
    if (process.env.HYPER_LIVE_ONLY !== '1') for (const bpm of marks) {
      await page.goto(`${base}/visual-proof?shot=01_DIAL_STOPPED&bpm=${bpm}&accents=default`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(700);
      const file = path.join(outDir, `scale-${String(bpm).padStart(3, '0')}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 844 } });
      console.log(file);
    }
    const ref = readPng(refPath);
    const live = readPng(livePath);
    pair('01-scale-reference-vs-live.png', ref, live, 15, 190, 360, 360);
    pair('02-scale-top-120-reference-vs-live.png', ref, live, 145, 195, 100, 90);
    pair('03-black-metal-reference-vs-live.png', ref, live, 70, 250, 250, 230);
    pair('04-bearing-pointer-reference-vs-live.png', ref, live, 155, 250, 80, 200);
    pair('05-sound-reference-vs-live.png', ref, live, 4, 78, 86, 100);
    pair('06-tuner-reference-vs-live.png', ref, live, 300, 78, 86, 100);
    pair('07-play-reference-vs-live.png', ref, live, 70, 620, 170, 70);
    pair('08-p-reference-vs-live.png', ref, live, 300, 618, 80, 74);
    pair('09-right-toggle-reference-vs-live.png', ref, live, 318, 548, 64, 72);
    pair('10-beat-rail-reference-vs-live.png', ref, live, 8, 540, 374, 82);
    const full = new PNG({ width: 780, height: 844 });
    PNG.bitblt(ref, full, 0, 0, 390, 844, 0, 0);
    PNG.bitblt(live, full, 0, 0, 390, 844, 390, 0);
    fs.writeFileSync(path.join(outDir, '11-full-reference-vs-live.png'), PNG.sync.write(full));
    fs.writeFileSync(path.join(outDir, '12-full-reference-vs-live-phone-size.png'), PNG.sync.write(full));
    console.log('pairs');
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

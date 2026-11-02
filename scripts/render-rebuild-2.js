'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'full-product-rebuild-2');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const only = new Set((process.env.POCKT_PROOF_ONLY || '').split(',').map((item) => item.trim()).filter(Boolean));

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

const SHOTS = [
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568', 'dial-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96', 'dial-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96', 'play-rest.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&playDown=1', 'play-pressed.png', 390, 844],
  ['shot=02_DIAL_PLAYING&bpm=96', 'play-stop.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568', 'shell-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96', 'shell-390.png', 390, 844],
  ['shot=03_RHYTHM_STOPPED_4-4&bpm=96&width=320&height=568', 'rhythm-320.png', 320, 568],
  ['shot=04_RHYTHM_BEAT1_4-4&bpm=96', 'rhythm-active.png', 390, 844],
  ['shot=09_PULSE_ORIGIN&bpm=96&waves=first', 'pulse-first.png', 390, 844],
  ['shot=13_PULSE_MULTIPLE_WAVES&bpm=120&waves=aged', 'pulse-multi.png', 390, 844],
  ['shot=13_PULSE_MULTIPLE_WAVES&bpm=40&waves=aged', 'pulse-40.png', 390, 844],
  ['shot=13_PULSE_MULTIPLE_WAVES&bpm=120&waves=mid', 'pulse-120.png', 390, 844],
  ['shot=09_PULSE_ORIGIN&bpm=300&waves=young', 'pulse-300.png', 390, 844],
  ['shot=19_PRO_PLAYING_4-4&bpm=96&meter=4/4&beat=1', 'pro-4.png', 390, 844],
  ['shot=20_PRO_7-8&bpm=96&meter=7/8&beat=2', 'pro-7.png', 390, 844],
  ['shot=21_PRO_12-8&bpm=96&meter=12/8&beat=4', 'pro-12.png', 390, 844],
  ['shot=23_BEATLINE_BEAT1_4-4&bpm=96&meter=4/4&beat=1', 'beatline-4.png', 390, 844],
  ['shot=25_BEATLINE_7-8&bpm=96&meter=7/8&beat=3', 'beatline-7.png', 390, 844],
  ['shot=26_BEATLINE_12-8&bpm=96&meter=12/8&beat=5', 'beatline-12.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&railMode=deck', 'phrase-empty.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=recording', 'phrase-recording.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=ready', 'phrase-ready.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=playing', 'phrase-playing.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=sound&width=320&height=568', 'sound-browser-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter&meter=4/4&width=320&height=568', 'meter-subdivision-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&meter=12/8&width=320&height=568', 'beat12-320.png', 320, 568],
];

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
    await page.setCacheEnabled(false);
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    for (const [query, file, width, height] of SHOTS) {
      if (only.size && !only.has(file)) continue;
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(500);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width, height } });
      console.log('shot', file);
    }
    const faces = ['dial-320.png', 'rhythm-320.png', 'pulse-120.png', 'pro-4.png', 'beatline-4.png', 'shell-320.png'];
    if (faces.some((file) => !fs.existsSync(path.join(outDir, file)))) {
      console.log('partial');
      return;
    }
    const cells = faces.map((file) => PNG.sync.read(fs.readFileSync(path.join(outDir, file))));
    const cellW = 320;
    const cellH = 568;
    const sheet = new PNG({ width: cellW * 3, height: cellH * 2 });
    cells.forEach((image, index) => {
      PNG.bitblt(image, sheet, 0, 0, Math.min(cellW, image.width), Math.min(cellH, image.height), (index % 3) * cellW, Math.floor(index / 3) * cellH);
    });
    fs.writeFileSync(path.join(outDir, 'six-face-contact-sheet-320.png'), PNG.sync.write(sheet));
    const wide = ['dial-390.png', 'rhythm-active.png', 'pulse-multi.png', 'pro-7.png', 'beatline-7.png', 'shell-390.png'];
    if (wide.some((file) => !fs.existsSync(path.join(outDir, file)))) {
      console.log('partial wide');
      return;
    }
    const wideCells = wide.map((file) => PNG.sync.read(fs.readFileSync(path.join(outDir, file))));
    const board = new PNG({ width: 390 * 3, height: 844 * 2 });
    wideCells.forEach((image, index) => {
      PNG.bitblt(image, board, 0, 0, Math.min(390, image.width), Math.min(844, image.height), (index % 3) * 390, Math.floor(index / 3) * 844);
    });
    fs.writeFileSync(path.join(outDir, 'six-face-contact-sheet-390.png'), PNG.sync.write(board));
    console.log('sheets');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'device-universal-controls');
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
}

async function shot(page, query) {
  await page.goto(`${base}/visual-proof?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
  await sleep(900);
  const file = path.join(outDir, '_frame.png');
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 844 } });
  return readPng(file);
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
    const home = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=default');
    crop(home, 0, 40, 390, 130, '01-header-sound-tuner.png');
    crop(home, 70, 40, 250, 150, '02-header-simplified.png');
    const off = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=mute,mute,mute,mute');
    crop(off, 8, 520, 374, 100, '03-accent-off.png');
    const soft = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=soft,soft,soft,soft');
    crop(soft, 8, 520, 374, 100, '04-accent-soft.png');
    const normal = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=normal,normal,normal,normal');
    crop(normal, 8, 520, 374, 100, '05-accent-normal.png');
    const strong = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=strong,strong,strong,strong');
    crop(strong, 8, 520, 374, 100, '06-accent-strong.png');
    crop(home, 30, 170, 330, 400, '07-dial-stopped.png');
    const turned = await shot(page, 'shot=01_DIAL_STOPPED&bpm=60&accents=default');
    crop(turned, 30, 170, 330, 400, '08-dial-rotated.png');
    crop(home, 8, 600, 374, 80, '09-transport-new-layout.png');
    crop(home, 70, 600, 250, 80, '10-play-hardware.png');
    const playing = await shot(page, 'shot=02_DIAL_PLAYING&bpm=119&accents=default');
    crop(playing, 70, 600, 250, 80, '11-play-pressed.png');
    crop(home, 8, 520, 374, 100, '12-beat-toggle-beats.png');
    const mid = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=default&railMode=flip');
    crop(mid, 8, 520, 374, 100, '13-beat-toggle-transition.png');
    const deck = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=default&railMode=deck');
    crop(deck, 8, 520, 374, 100, '14-beat-toggle-deck.png');
    crop(home, 8, 520, 374, 100, '15-shutter-open.png');
    const closing = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=default&railMode=flip');
    crop(closing, 8, 520, 374, 100, '16-shutter-closing.png');
    const closed = await shot(page, 'shot=01_DIAL_STOPPED&bpm=119&accents=default&railMode=closed');
    crop(closed, 8, 520, 374, 100, '17-shutter-closed.png');
    crop(home, 8, 520, 374, 100, '18-shutter-opening.png');
    const rooms = [
      ['19-dial-room.png', home],
      ['20-rhythm-room.png', await shot(page, 'shot=03_RHYTHM_STOPPED_4-4&bpm=119&accents=default')],
      ['21-pulse-room.png', await shot(page, 'shot=08_PULSE_STOPPED&bpm=119&accents=default')],
      ['22-pendulum-room.png', await shot(page, 'shot=14_PENDULUM_CENTER&bpm=119&accents=default')],
      ['23-pro-room.png', await shot(page, 'shot=18_PRO_STOPPED_4-4&bpm=119&accents=default')],
      ['24-beatline-room.png', await shot(page, 'shot=22_BEATLINE_STOPPED_4-4&bpm=119&accents=default')],
    ];
    for (const [name, png] of rooms) {
      fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
    }
    const sheet = new PNG({ width: 390 * 3, height: 844 * 2 });
    rooms.forEach(([, png], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      PNG.bitblt(png, sheet, 0, 0, 390, 844, col * 390, row * 844);
    });
    fs.writeFileSync(path.join(outDir, '25-six-room-shell-contact-sheet.png'), PNG.sync.write(sheet));
    console.log('proofs', outDir);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

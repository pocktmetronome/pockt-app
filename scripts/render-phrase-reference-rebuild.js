'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'phrase-reference-rebuild');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const referencePath = path.join(
  process.env.USERPROFILE || '',
  '.cursor',
  'projects',
  'c-Apps-POCKT-tmp-pockt-3',
  'assets',
  'c__Users_gregg_AppData_Roaming_Cursor_User_workspaceStorage_191fda465cd67d88a207d37a904fe867_images_POCKT_PHRASE_TRANSPORT_REFERENCE-80b19479-9b7f-429f-b397-cdce6ae047cf.png'
);

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
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck', 'phrase-empty-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=recording', 'phrase-recording-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready', 'phrase-ready-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=playing', 'phrase-playing-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=paused', 'phrase-paused-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=390&height=844&railMode=deck&phrase=playing', 'phrase-playing-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready&playDown=1', '_play-pressed.png', 320, 568],
];

function crop(file, x, y, w, h, dest) {
  const image = PNG.sync.read(fs.readFileSync(path.join(outDir, file)));
  const png = new PNG({ width: w, height: h });
  PNG.bitblt(image, png, x, y, w, h, 0, 0);
  fs.writeFileSync(path.join(outDir, dest), PNG.sync.write(png));
  return png;
}

function scaleNearest(image, width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(image.height - 1, Math.floor((y * image.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(image.width - 1, Math.floor((x * image.width) / width));
      const si = (sy * image.width + sx) * 4;
      const di = (y * width + x) * 4;
      png.data[di] = image.data[si];
      png.data[di + 1] = image.data[si + 1];
      png.data[di + 2] = image.data[si + 2];
      png.data[di + 3] = 255;
    }
  }
  return png;
}

async function main() {
  if (process.env.POCKT_CROP_ONLY === '1') {
    pack();
    return;
  }
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
    for (const [query, file, width, height] of SHOTS) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(700);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width, height } });
      console.log('shot', file);
    }
  } finally {
    await browser.close();
  }
  pack();
}

function pack() {
  const ready = PNG.sync.read(fs.readFileSync(path.join(outDir, 'phrase-ready-320.png')));
  let play = null;
  let count = 0;
  for (let y = 300; y < 385; y += 1) {
    for (let x = 70; x < 190; x += 1) {
      const i = (y * ready.width + x) * 4;
      const r = ready.data[i];
      const g = ready.data[i + 1];
      const b = ready.data[i + 2];
      if (!(r > 160 && g > 110 && b < 180 && r > b + 20)) continue;
      count += 1;
      if (!play) play = { x, y, x1: x, y1: y };
      else {
        play.x = Math.min(play.x, x);
        play.x1 = Math.max(play.x1, x);
        play.y = Math.min(play.y, y);
        play.y1 = Math.max(play.y1, y);
      }
    }
  }
  if (!play || count < 40) throw new Error('play knob not found');
  const playBox = {
    x: Math.max(0, play.x - 12),
    y: Math.max(0, play.y - 8),
    w: play.x1 - play.x + 24,
    h: play.y1 - play.y + 18,
  };
  const moduleY = 268;
  const moduleH = 156;
  crop('phrase-playing-320.png', 12, Math.max(0, play.y1 - 4), 296, Math.min(78, 568 - play.y1), 'phrase-timeline-detail.png');
  crop('phrase-ready-320.png', playBox.x, playBox.y, playBox.w, playBox.h, 'phrase-play-rest-detail.png');
  crop('_play-pressed.png', playBox.x, playBox.y, playBox.w, playBox.h, 'phrase-play-pressed-detail.png');
  crop('phrase-recording-320.png', Math.max(0, play.x - 78), playBox.y, 78, playBox.h, 'phrase-record-detail.png');
  crop('phrase-playing-320.png', Math.min(250, play.x1 + 6), playBox.y, 64, playBox.h, 'phrase-loop-detail.png');
  crop('phrase-ready-320.png', Math.min(240, play.x1 + 62), playBox.y, 64, playBox.h, 'phrase-clear-detail.png');
  fs.copyFileSync(path.join(outDir, 'phrase-playing-320.png'), path.join(outDir, 'phrase-full-shell-320.png'));
  fs.copyFileSync(path.join(outDir, 'phrase-playing-390.png'), path.join(outDir, 'phrase-full-shell-390.png'));
  fs.unlinkSync(path.join(outDir, '_play-pressed.png'));

  const reference = PNG.sync.read(fs.readFileSync(referencePath));
  const phrase = crop('phrase-playing-320.png', 8, moduleY, 304, Math.min(moduleH, 180), '_module.png');
  const refH = phrase.height;
  const refW = Math.round((reference.width / reference.height) * refH);
  const scaled = scaleNearest(reference, refW, refH);
  const sheet = new PNG({ width: refW + phrase.width + 8, height: refH });
  PNG.bitblt(scaled, sheet, 0, 0, refW, refH, 0, 0);
  PNG.bitblt(phrase, sheet, 0, 0, phrase.width, phrase.height, refW + 8, 0);
  fs.writeFileSync(path.join(outDir, 'reference-vs-final-320.png'), PNG.sync.write(sheet));
  fs.unlinkSync(path.join(outDir, '_module.png'));
  console.log('pack', moduleY, moduleH, JSON.stringify(play));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

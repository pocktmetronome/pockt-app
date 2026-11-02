'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'phrase-final-real');
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

const SHOTS = [
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck', 'phrase-empty-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=recording', 'phrase-recording-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready', 'phrase-ready-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=playing', 'phrase-playing-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=paused', 'phrase-paused-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=390&height=844&railMode=deck', 'phrase-empty-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&width=390&height=844&railMode=deck&phrase=playing', 'phrase-playing-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568', 'phrase-transition-beats.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=flip', 'phrase-transition-mid.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready', 'phrase-transition-phrase.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready&playDown=1', '_play-pressed.png', 320, 568],
];

function crop(file, x, y, w, h, dest) {
  const image = PNG.sync.read(fs.readFileSync(path.join(outDir, file)));
  const png = new PNG({ width: w, height: h });
  PNG.bitblt(image, png, x, y, w, h, 0, 0);
  fs.writeFileSync(path.join(outDir, dest), PNG.sync.write(png));
}

function load(file) {
  return PNG.sync.read(fs.readFileSync(path.join(outDir, file)));
}

function clusters(image, pred, minCount) {
  const groups = [];
  let cur = null;
  for (let y = 0; y < image.height; y += 1) {
    let n = 0;
    let minX = image.width;
    let maxX = 0;
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      if (!pred([image.data[i], image.data[i + 1], image.data[i + 2]], x, y)) continue;
      n += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
    if (n >= minCount) {
      if (!cur) cur = { y0: y, y1: y, minX, maxX };
      else {
        cur.y1 = y;
        if (minX < cur.minX) cur.minX = minX;
        if (maxX > cur.maxX) cur.maxX = maxX;
      }
    } else if (cur) {
      groups.push(cur);
      cur = null;
    }
  }
  if (cur) groups.push(cur);
  return groups.map((group) => ({
    x: group.minX,
    y: group.y0,
    w: group.maxX - group.minX + 1,
    h: group.y1 - group.y0 + 1,
  }));
}

function cropBox(file, box, dest) {
  crop(file, box.x, box.y, box.w, box.h, dest);
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
    await page.setCacheEnabled(false);
    for (const [query, file, width, height] of SHOTS) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(500);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width, height } });
      console.log('shot', file);
    }
  } finally {
    await browser.close();
  }
  const ready = load('phrase-ready-320.png');
  const playCaps = clusters(
    ready,
    (c, _x, y) => y > 330 && c[0] > 185 && c[1] > 198 && c[2] > 205 && c[0] < 235 && c[2] > c[0],
    28
  ).filter((box) => box.h > 18);
  const play = playCaps.sort((a, b) => b.h - a.h)[0];
  const records = clusters(
    ready,
    (c, _x, y) => y > 340 && c[0] > 200 && c[1] < 90 && c[2] < 100,
    6
  );
  const record = records.sort((a, b) => a.x - b.x)[0];
  if (!play || !record) throw new Error(`could not locate phrase controls ${JSON.stringify({ playCaps, records })}`);
  const playBox = {
    x: Math.max(0, play.x - 16),
    y: Math.max(0, play.y - 14),
    w: Math.min(ready.width - Math.max(0, play.x - 16), play.w + 32),
    h: Math.min(ready.height - Math.max(0, play.y - 14), play.h + 26),
  };
  const recordBox = {
    x: Math.max(0, record.x - 24),
    y: playBox.y,
    w: Math.max(72, record.w + 48),
    h: playBox.h,
  };
  const loopBox = {
    x: Math.min(ready.width - 108, play.x + play.w + 4),
    y: playBox.y,
    w: 108,
    h: playBox.h,
  };
  const timelineBox = {
    x: 14,
    y: Math.max(0, play.y - 64),
    w: 292,
    h: 58,
  };
  cropBox('phrase-playing-320.png', timelineBox, 'phrase-timeline-detail.png');
  cropBox('phrase-ready-320.png', playBox, 'phrase-play-rest-detail.png');
  cropBox('_play-pressed.png', playBox, 'phrase-play-pressed-detail.png');
  cropBox('phrase-recording-320.png', recordBox, 'phrase-record-detail.png');
  cropBox('phrase-playing-320.png', loopBox, 'phrase-loop-detail.png');
  fs.copyFileSync(path.join(outDir, 'phrase-playing-320.png'), path.join(outDir, 'phrase-full-shell-320.png'));
  fs.copyFileSync(path.join(outDir, 'phrase-playing-390.png'), path.join(outDir, 'phrase-full-shell-390.png'));
  fs.unlinkSync(path.join(outDir, '_play-pressed.png'));
  console.log('pack', JSON.stringify({ play, record, playBox, recordBox, loopBox, timelineBox }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

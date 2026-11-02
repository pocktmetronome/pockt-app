'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'full-product-recovery');
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

function writePng(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

function crop(src, x, y, w, h, name) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  writePng(name, out);
  return out;
}

function sheet(images, columns, cellW, cellH, name) {
  const rows = Math.ceil(images.length / columns);
  const out = new PNG({ width: columns * cellW, height: rows * cellH });
  images.forEach((image, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    PNG.bitblt(image, out, 0, 0, Math.min(cellW, image.width), Math.min(cellH, image.height), col * cellW, row * cellH);
  });
  writePng(name, out);
}

async function shot(page, query, file, width = 390, height = 844) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${base}/visual-proof?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
  await sleep(1100);
  const target = path.join(outDir, file);
  await page.screenshot({ path: target, clip: { x: 0, y: 0, width, height } });
  return readPng(target);
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

    const dial = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default', '01-dial-full.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&width=320&height=568', '02-dial-phone-size.png', 320, 568);

    crop(dial, 40, 180, 150, 180, '03-dial-scale-20-80.png');
    crop(dial, 200, 180, 150, 180, '04-dial-scale-100-200.png');
    crop(dial, 40, 360, 310, 160, '05-dial-scale-260-400.png');
    crop(dial, 20, 280, 140, 160, '06-dial-40-detail.png');

    await shot(page, 'shot=03_RHYTHM_STOPPED_4-4&bpm=96&accents=default', '07-rhythm-full.png');
    await shot(page, 'shot=03_RHYTHM_STOPPED_4-4&bpm=96&accents=default&width=320&height=568', '08-rhythm-phone-size.png', 320, 568);

    await shot(page, 'shot=08_PULSE_STOPPED&bpm=96&closeup=1', '09-pulse-stopped.png');
    await shot(page, 'shot=09_PULSE_ORIGIN&bpm=96&closeup=1&wave=0.46', '10-pulse-first-beat.png');
    await shot(page, 'shot=13_PULSE_MULTIPLE_WAVES&bpm=96&closeup=1', '11-pulse-overlapping-rings.png');
    await shot(page, 'shot=15_PENDULUM_LEFT&bpm=96&closeup=1', '12-pendulum-left-extreme.png');
    await shot(page, 'shot=14_PENDULUM_CENTER&bpm=96&closeup=1', '13-pendulum-center.png');
    await shot(page, 'shot=16_PENDULUM_RIGHT&bpm=96&closeup=1', '14-pendulum-right-extreme.png');
    for (const name of [
      '09-pulse-stopped.png',
      '10-pulse-first-beat.png',
      '11-pulse-overlapping-rings.png',
      '12-pendulum-left-extreme.png',
      '13-pendulum-center.png',
      '14-pendulum-right-extreme.png',
    ]) {
      crop(readPng(path.join(outDir, name)), 0, 0, 320, 320, name);
    }
    await shot(page, 'shot=18_PRO_STOPPED_4-4&bpm=96&meter=4/4', '15-pro-4-4.png');
    await shot(page, 'shot=20_PRO_7-8&bpm=96&meter=7/8', '16-pro-7-8.png');
    await shot(page, 'shot=21_PRO_12-8&bpm=96&meter=12/8', '17-pro-12-8.png');
    await shot(page, 'shot=22_BEATLINE_STOPPED_4-4&bpm=96&meter=4/4', '18-beatline-4.png');
    await shot(page, 'shot=25_BEATLINE_7-8&bpm=96&meter=7/8', '19-beatline-7.png');
    await shot(page, 'shot=26_BEATLINE_12-8&bpm=96&meter=12/8', '20-beatline-12.png');

    const off = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=mute,mute,mute,mute', '_accent-off.png');
    crop(off, 8, 500, 374, 120, '21-universal-beat-state-0.png');
    const soft = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=soft,soft,soft,soft', '_accent-soft.png');
    crop(soft, 8, 500, 374, 120, '22-universal-beat-state-1.png');
    const normal = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=normal,normal,normal,normal', '_accent-normal.png');
    crop(normal, 8, 500, 374, 120, '23-universal-beat-state-2.png');
    const strong = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=strong,strong,strong,strong', '_accent-strong.png');
    crop(strong, 8, 500, 374, 120, '24-universal-beat-state-3.png');

    crop(dial, 8, 500, 374, 120, '25-shutter-open.png');
    const closed = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=closed', '_shutter-closed.png');
    crop(closed, 8, 500, 374, 120, '26-shutter-closed.png');
    const empty = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=deck', '_deck-empty.png');
    crop(empty, 8, 500, 374, 150, '27-phrase-empty.png');
    const recording = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=deck&phrase=recording', '_deck-rec.png');
    crop(recording, 8, 500, 374, 150, '28-phrase-recording.png');
    const recorded = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=deck&phrase=ready', '_deck-ready.png');
    crop(recorded, 8, 500, 374, 150, '29-phrase-recorded.png');
    const playingDeck = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=deck&phrase=playing', '_deck-play.png');
    crop(playingDeck, 8, 500, 374, 150, '30-phrase-playing.png');
    const paused = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&railMode=deck&phrase=paused', '_deck-pause.png');
    crop(paused, 8, 500, 374, 150, '31-phrase-paused-scrubbed.png');

    await shot(page, 'shot=27_TUNER_NO_PITCH&bpm=96', '32-tuner-no-signal.png');
    await shot(page, 'shot=28_TUNER_E3_MINUS25&bpm=96', '33-tuner-flat.png');
    await shot(page, 'shot=30_TUNER_E3_IN_TUNE&bpm=96', '34-tuner-in-tune.png');
    await shot(page, 'shot=32_TUNER_E3_PLUS25&bpm=96', '35-tuner-sharp.png');

    const rooms = [];
    for (const id of ['01_DIAL_STOPPED', '03_RHYTHM_STOPPED_4-4', '08_PULSE_STOPPED', '14_PENDULUM_CENTER', '18_PRO_STOPPED_4-4', '22_BEATLINE_STOPPED_4-4']) {
      const file = `_room-${id}.png`;
      rooms.push(await shot(page, `shot=${id}&bpm=96&accents=default`, file));
    }
    const thumbs = rooms.map((image) => {
      const thumb = new PNG({ width: 195, height: 422 });
      for (let y = 0; y < 422; y += 1) {
        for (let x = 0; x < 195; x += 1) {
          const sx = x * 2;
          const sy = y * 2;
          const si = (sy * image.width + sx) << 2;
          const di = (y * 195 + x) << 2;
          thumb.data[di] = image.data[si];
          thumb.data[di + 1] = image.data[si + 1];
          thumb.data[di + 2] = image.data[si + 2];
          thumb.data[di + 3] = 255;
        }
      }
      return thumb;
    });
    sheet(thumbs, 3, 195, 422, '36-six-face-contact-sheet.png');
    await reviewSheets(page);
    for (const name of fs.readdirSync(outDir)) {
      if (name.startsWith('_')) fs.unlinkSync(path.join(outDir, name));
    }
    console.log('proof pack written');
  } finally {
    await browser.close();
  }
}

function saveReview(name, png) {
  const dir = path.join(root, 'artifacts', 'full-product-recovery-review');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), PNG.sync.write(png));
}

function beside(files, name) {
  const images = files.map((file) => readPng(path.join(outDir, file)));
  const width = images.reduce((sum, image) => sum + image.width, 0);
  const height = Math.max(...images.map((image) => image.height));
  const out = new PNG({ width, height });
  let x = 0;
  for (const image of images) {
    PNG.bitblt(image, out, 0, 0, image.width, image.height, x, Math.floor((height - image.height) / 2));
    x += image.width;
  }
  saveReview(name, out);
}

async function reviewSheets(page) {
  const faces = ['01_DIAL_STOPPED', '03_RHYTHM_STOPPED_4-4', '08_PULSE_STOPPED', '14_PENDULUM_CENTER', '18_PRO_STOPPED_4-4', '22_BEATLINE_STOPPED_4-4'];
  const phones = [];
  for (const id of faces) {
    phones.push(await shot(page, `shot=${id}&bpm=96&accents=default&width=320&height=568`, `_review-${id}.png`, 320, 568));
  }
  const board = new PNG({ width: 960, height: 1136 });
  phones.forEach((image, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    PNG.bitblt(image, board, 0, 0, 320, 568, col * 320, row * 568);
  });
  saveReview('01-all-six-phone-size.png', board);

  const dial = readPng(path.join(outDir, '01-dial-full.png'));
  const details = new PNG({ width: 780, height: 360 });
  const parts = [
    crop(dial, 20, 250, 180, 180, '_d40.png'),
    crop(dial, 150, 160, 200, 180, '_d120.png'),
    crop(dial, 70, 40, 250, 180, '_dbpm.png'),
    crop(dial, 110, 280, 170, 180, '_dptr.png'),
  ];
  parts.forEach((image, index) => PNG.bitblt(image, details, 0, 0, image.width, image.height, index * 195, 40));
  saveReview('02-dial-critical-details.png', details);
  beside(['21-universal-beat-state-0.png', '22-universal-beat-state-1.png', '23-universal-beat-state-2.png', '24-universal-beat-state-3.png'], '03-four-accent-states.png');
  beside(['25-shutter-open.png', '27-phrase-empty.png'], '04-beat-vs-phrase.png');
  beside(['27-phrase-empty.png', '28-phrase-recording.png', '29-phrase-recorded.png', '30-phrase-playing.png', '31-phrase-paused-scrubbed.png'], '05-phrase-five-states.png');
  beside(['32-tuner-no-signal.png', '33-tuner-flat.png', '34-tuner-in-tune.png', '35-tuner-sharp.png'], '06-tuner-four-states.png');
  beside(['15-pro-4-4.png', '16-pro-7-8.png', '17-pro-12-8.png'], '07-meter-layouts.png');
  beside(['18-beatline-4.png', '19-beatline-7.png', '20-beatline-12.png'], '08-beatline-4-7-12.png');
  saveReview('09-play-button-detail.png', crop(dial, 90, 620, 210, 120, '_play.png'));
  saveReview('10-small-phone-critical-layout.png', readPng(path.join(outDir, '02-dial-phone-size.png')));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

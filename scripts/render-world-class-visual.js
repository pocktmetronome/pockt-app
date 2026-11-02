'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'world-class-visual-pass');
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
  return PNG.sync.read(fs.readFileSync(path.join(outDir, file)));
}

function writePng(name, png) {
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

function crop(src, x, y, w, h, name) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, Math.max(0, x), Math.max(0, y), w, h, 0, 0);
  writePng(name, out);
  return out;
}

function beside(files, name) {
  const images = files.map((file) => readPng(file));
  const width = images.reduce((sum, image) => sum + image.width, 0);
  const height = Math.max(...images.map((image) => image.height));
  const out = new PNG({ width, height });
  let x = 0;
  for (const image of images) {
    PNG.bitblt(image, out, 0, 0, image.width, image.height, x, Math.floor((height - image.height) / 2));
    x += image.width;
  }
  writePng(name, out);
}

async function shot(page, query, file, width = 390, height = 844) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
  await sleep(900);
  const target = path.join(outDir, file);
  await page.screenshot({ path: target, clip: { x: 0, y: 0, width, height } });
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
    await page.setCacheEnabled(false);
    page.on('pageerror', (error) => console.error('PAGE', error.message));

    const faces = [
      '01_DIAL_STOPPED',
      '03_RHYTHM_STOPPED_4-4',
      '08_PULSE_STOPPED',
      '14_PENDULUM_CENTER',
      '18_PRO_STOPPED_4-4',
      '22_BEATLINE_STOPPED_4-4',
    ];
    const phones = [];
    for (const id of faces) {
      phones.push(await shot(page, `shot=${id}&bpm=96&accents=default`, `_face-${id}.png`));
    }
    const board = new PNG({ width: 1170, height: 1688 });
    phones.forEach((image, index) => {
      PNG.bitblt(image, board, 0, 0, 390, 844, (index % 3) * 390, Math.floor(index / 3) * 844);
    });
    writePng('01-six-face-contact-sheet.png', board);

    const dial = await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default', '02-dial-phone.png');
    const details = new PNG({ width: 780, height: 200 });
    [crop(dial, 30, 250, 180, 180, '_a.png'), crop(dial, 150, 170, 200, 180, '_b.png'), crop(dial, 40, 430, 200, 160, '_c.png'), crop(dial, 160, 300, 160, 180, '_d.png')].forEach(
      (image, index) => PNG.bitblt(image, details, 0, 0, Math.min(195, image.width), Math.min(180, image.height), index * 195, 10)
    );
    writePng('03-dial-scale-details.png', details);

    await shot(page, 'shot=03_RHYTHM_STOPPED_4-4&bpm=96&accents=default', '04-rhythm-phone.png');
    await shot(page, 'shot=08_PULSE_STOPPED&bpm=96', '05-pulse-stopped.png');
    await shot(page, 'shot=08_PULSE_STOPPED&bpm=96&waves=first', '06-pulse-first-beat.png');
    await shot(page, 'shot=08_PULSE_STOPPED&bpm=96&waves=1', '07-pulse-active-waves.png');
    await shot(page, 'shot=15_PENDULUM_LEFT&bpm=96', '08-pendulum-left.png');
    await shot(page, 'shot=14_PENDULUM_CENTER&bpm=96', '09-pendulum-center.png');
    await shot(page, 'shot=16_PENDULUM_RIGHT&bpm=96', '10-pendulum-right.png');
    await shot(page, 'shot=18_PRO_STOPPED_4-4&bpm=96&meter=4/4', '11-pro-4.png');
    await shot(page, 'shot=20_PRO_7-8&bpm=96&meter=7/8', '12-pro-7.png');
    await shot(page, 'shot=21_PRO_12-8&bpm=96&meter=12/8', '13-pro-12.png');
    await shot(page, 'shot=22_BEATLINE_STOPPED_4-4&bpm=96&meter=4/4', '14-beatline-4.png');
    await shot(page, 'shot=25_BEATLINE_7-8&bpm=96&meter=7/8', '15-beatline-7.png');
    await shot(page, 'shot=26_BEATLINE_12-8&bpm=96&meter=12/8', '16-beatline-12.png');

    const accentNames = ['mute', 'soft', 'normal', 'strong'];
    for (const name of accentNames) {
      await shot(page, `shot=01_DIAL_STOPPED&bpm=96&accents=${name},${name},${name},${name}`, `_accent-${name}.png`);
      crop(readPng(`_accent-${name}.png`), 8, 520, 374, 130, `_accent-crop-${name}.png`);
    }
    beside(
      accentNames.map((name) => `_accent-crop-${name}.png`),
      '17-accent-four-states.png'
    );

    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default', '_open.png');
    crop(readPng('_open.png'), 8, 500, 374, 150, '_shutter-open.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=closed', '_closed.png');
    crop(readPng('_closed.png'), 8, 500, 374, 150, '_shutter-closed.png');
    beside(['_shutter-open.png', '_shutter-closed.png'], '18-shutter-open-closed.png');

    crop(readPng('_open.png'), 250, 500, 130, 140, '_switch-beats.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck', '_deck.png');
    crop(readPng('_deck.png'), 250, 500, 130, 140, '_switch-phrase.png');
    beside(['_switch-beats.png', '_switch-phrase.png'], '19-beats-phrase-switch.png');

    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck', '20-phrase-empty.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=recording', '21-phrase-recording.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=ready', '22-phrase-ready.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=playing', '23-phrase-playing.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&railMode=deck&phrase=paused', '24-phrase-paused.png');

    for (const [id, name] of [
      ['27_TUNER_NO_PITCH', 'none'],
      ['28_TUNER_E3_MINUS25', 'flat'],
      ['30_TUNER_E3_IN_TUNE', 'tune'],
      ['32_TUNER_E3_PLUS25', 'sharp'],
    ]) {
      await shot(page, `shot=${id}&bpm=96`, `_tuner-${name}.png`);
    }
    beside(['_tuner-none.png', '_tuner-flat.png', '_tuner-tune.png', '_tuner-sharp.png'], '25-tuner-four-states.png');

    crop(dial, 70, 620, 250, 130, '26-play-detail.png');
    crop(dial, 8, 600, 374, 150, '27-tap-play-p-family.png');
    await shot(page, 'shot=01_DIAL_STOPPED&bpm=96&accents=default&width=320&height=568', '28-small-phone.png', 320, 568);

    for (const name of fs.readdirSync(outDir)) {
      if (name.startsWith('_')) fs.unlinkSync(path.join(outDir, name));
    }
    console.log('world-class visual pack written');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

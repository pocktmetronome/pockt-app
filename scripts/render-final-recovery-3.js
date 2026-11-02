'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'final-recovery-3');
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
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568', 'dial-final-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96', 'dial-final-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck', 'phrase-empty-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=recording', 'phrase-recording-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=ready', 'phrase-ready-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=playing', 'phrase-playing-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&width=320&height=568&railMode=deck&phrase=paused', 'phrase-paused-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter&meter=4/4&width=320&height=568', 'meter-subdivision-320.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter&meter=4/4', 'meter-subdivision-390.png', 390, 844],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter54&width=320&height=568', 'meter-5-4.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter&meter=7/8&width=320&height=568', 'meter-7-8.png', 320, 568],
  ['shot=01_DIAL_STOPPED&bpm=96&panel=meter&meter=12/8&width=320&height=568', 'meter-12-8.png', 320, 568],
  ['shot=03_RHYTHM_STOPPED_4-4&bpm=96&width=320&height=568', '_rhythm-320.png', 320, 568],
  ['shot=13_PULSE_MULTIPLE_WAVES&bpm=120&waves=aged&width=320&height=568', '_pulse-320.png', 320, 568],
  ['shot=14_PENDULUM_CENTER&bpm=96&width=320&height=568', '_pendulum-320.png', 320, 568],
  ['shot=19_PRO_PLAYING_4-4&bpm=96&meter=4/4&width=320&height=568', '_pro-320.png', 320, 568],
  ['shot=23_BEATLINE_BEAT1_4-4&bpm=96&meter=4/4&width=320&height=568', '_beatline-320.png', 320, 568],
  ['shot=03_RHYTHM_STOPPED_4-4&bpm=96', '_rhythm-390.png', 390, 844],
  ['shot=13_PULSE_MULTIPLE_WAVES&bpm=120&waves=aged', '_pulse-390.png', 390, 844],
  ['shot=14_PENDULUM_CENTER&bpm=96', '_pendulum-390.png', 390, 844],
  ['shot=19_PRO_PLAYING_4-4&bpm=96&meter=4/4', '_pro-390.png', 390, 844],
  ['shot=23_BEATLINE_BEAT1_4-4&bpm=96&meter=4/4', '_beatline-390.png', 390, 844],
];

function sheet(files, cellW, cellH, name) {
  const cells = files.map((file) => PNG.sync.read(fs.readFileSync(path.join(outDir, file))));
  const board = new PNG({ width: cellW * 3, height: cellH * 2 });
  cells.forEach((image, index) => {
    PNG.bitblt(image, board, 0, 0, Math.min(cellW, image.width), Math.min(cellH, image.height), (index % 3) * cellW, Math.floor(index / 3) * cellH);
  });
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(board));
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
    for (const [query, file, width, height] of SHOTS) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(400);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width, height } });
      console.log('shot', file);
    }
  } finally {
    await browser.close();
  }
  const playing = PNG.sync.read(fs.readFileSync(path.join(outDir, 'phrase-playing-320.png')));
  const detail = new PNG({ width: 320, height: 160 });
  PNG.bitblt(playing, detail, 0, 300, 320, 160, 0, 0);
  fs.writeFileSync(path.join(outDir, 'phrase-timeline-detail.png'), PNG.sync.write(detail));
  sheet(
    ['dial-final-320.png', '_rhythm-320.png', '_pulse-320.png', '_pendulum-320.png', '_pro-320.png', '_beatline-320.png'],
    320,
    568,
    'six-face-contact-sheet-320.png'
  );
  sheet(
    ['dial-final-390.png', '_rhythm-390.png', '_pulse-390.png', '_pendulum-390.png', '_pro-390.png', '_beatline-390.png'],
    390,
    844,
    'six-face-contact-sheet-390.png'
  );
  for (const file of fs.readdirSync(outDir)) {
    if (file.startsWith('_')) fs.unlinkSync(path.join(outDir, file));
  }
  console.log('pack');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

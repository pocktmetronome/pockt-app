'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'phrase-approved-art');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const referencePath =
  process.env.PHRASE_REFERENCE ||
  'C:/Users/gregg/.cursor/projects/c-Apps-POCKT/assets/c__Users_gregg_AppData_Roaming_Cursor_User_workspaceStorage_0ff45f9ecb0208d3dca7ac57898db205_images_POCKT_PHRASE_TRANSPORT_REFERENCE__1_-9aeca0e8-1efc-490b-903f-543757ecc31e.png';

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
  ['shot=01_DIAL_STOPPED&bpm=96&width=390&height=844&railMode=deck&phrase=playing', 'full-shell-390.png', 390, 844],
];

function crop(file, x, y, w, h, dest) {
  const image = PNG.sync.read(fs.readFileSync(path.join(outDir, file)));
  const png = new PNG({ width: w, height: h });
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.min(w, image.width - sx);
  const sh = Math.min(h, image.height - sy);
  PNG.bitblt(image, png, sx, sy, sw, sh, 0, 0);
  fs.writeFileSync(path.join(outDir, dest), PNG.sync.write(png));
}

function sideBySide(leftPath, rightFile, dest) {
  const left = PNG.sync.read(fs.readFileSync(leftPath));
  const right = PNG.sync.read(fs.readFileSync(path.join(outDir, rightFile)));
  const h = Math.max(left.height, right.height);
  const gap = 12;
  const png = new PNG({ width: left.width + gap + right.width, height: h });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 12;
    png.data[i + 1] = 10;
    png.data[i + 2] = 8;
    png.data[i + 3] = 255;
  }
  PNG.bitblt(left, png, 0, 0, left.width, left.height, 0, Math.round((h - left.height) / 2));
  PNG.bitblt(right, png, 0, 0, right.width, right.height, left.width + gap, Math.round((h - right.height) / 2));
  fs.writeFileSync(path.join(outDir, dest), PNG.sync.write(png));
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const reference = PNG.sync.read(fs.readFileSync(referencePath));
  const panel = new PNG({ width: reference.width, height: 216 });
  PNG.bitblt(reference, panel, 0, 0, reference.width, 216, 0, 0);
  fs.writeFileSync(path.join(outDir, 'source-reference.png'), PNG.sync.write(panel));

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
      await page.goto(`${base}/visual-proof?${query}&cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('[data-testid="proof-ready"]', { timeout: 90000 });
      await sleep(700);
      await page.screenshot({ path: path.join(outDir, file), clip: { x: 0, y: 0, width, height } });
      console.log('shot', file);
    }
  } finally {
    await browser.close();
  }

  const frame = { x: 14, y: 196, w: 292, h: 232 };
  const scale = frame.w / 272;
  const box = (cx, cy, r) => ({
    x: Math.round(frame.x + (cx - r) * scale - 6),
    y: Math.round(frame.y + (cy - r) * scale - 6),
    w: Math.round(r * 2 * scale + 12),
    h: Math.round(r * 2 * scale + 12),
  });
  const record = box(47, 83, 28);
  const play = box(115, 82, 40);
  const loop = box(182, 84, 34);
  const clear = {
    x: Math.round(frame.x + 200 * scale),
    y: Math.round(frame.y + 48 * scale),
    w: Math.round(64 * scale),
    h: Math.round(58 * scale),
  };
  const timeline = {
    x: Math.round(frame.x + 16 * scale),
    y: Math.round(frame.y + 118 * scale),
    w: Math.round(240 * scale),
    h: Math.round(90 * scale),
  };
  crop('phrase-recording-320.png', record.x, record.y, record.w, record.h, 'record-detail.png');
  crop('phrase-ready-320.png', play.x, play.y, play.w, play.h, 'play-rest-detail.png');
  crop('_play-pressed.png', play.x, play.y, play.w, play.h, 'play-pressed-detail.png');
  crop('phrase-playing-320.png', loop.x, loop.y, loop.w, loop.h, 'loop-detail.png');
  crop('phrase-ready-320.png', clear.x, clear.y, clear.w, clear.h, 'clear-detail.png');
  crop('phrase-playing-320.png', timeline.x, timeline.y, timeline.w, timeline.h, 'timeline-detail.png');
  crop('phrase-playing-320.png', frame.x, frame.y, frame.w, frame.h, '_phrase-panel.png');
  fs.copyFileSync(path.join(outDir, 'phrase-playing-320.png'), path.join(outDir, 'full-shell-320.png'));
  sideBySide(path.join(outDir, 'source-reference.png'), '_phrase-panel.png', 'reference-vs-implementation-320.png');
  fs.unlinkSync(path.join(outDir, '_play-pressed.png'));
  fs.unlinkSync(path.join(outDir, '_phrase-panel.png'));
  console.log('proofs', outDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

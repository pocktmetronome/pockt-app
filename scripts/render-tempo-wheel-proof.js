'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'tempo-wheel-proof');
const port = Number(process.env.POCKT_PROOF_PORT || 8096);
const base = `http://127.0.0.1:${port}`;
const SHOTS = [20, 60, 120, 120.25, 120.5, 120.75, 121, 122, 123, 124, 128, 200, 300, 400];

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

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 420, height: 320, deviceScaleFactor: 2 });
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    for (const bpm of SHOTS) {
      const label = Number.isInteger(bpm) ? bpm.toFixed(2) : bpm.toFixed(2);
      await page.goto(`${base}/tempo-wheel-proof?bpm=${encodeURIComponent(String(bpm))}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(`[data-testid="tempo-wheel-ready-${label}"]`, { timeout: 90000 });
      await sleep(500);
      const name = Number.isInteger(bpm) ? String(bpm).padStart(3, '0') : bpm.toFixed(2).replace('.', '-');
      const target = path.join(outDir, `${name}.png`);
      const clip = await page.evaluate((ready) => {
        const node = document.querySelector(`[data-testid="${ready}"]`);
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }, `tempo-wheel-ready-${label}`);
      await page.screenshot({ path: target, clip });
      console.log(target);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

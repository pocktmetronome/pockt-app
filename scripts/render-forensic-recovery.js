'use strict';

/**
 * Capture the forensic historical route against an already running Expo web server.
 * Does not start a second bundler and does not build a native binary.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'forensic-recovery');
const port = Number(process.env.POCKT_PROOF_PORT || 8094);
const base = `http://127.0.0.1:${port}`;

const SHOTS = [
  ['rhythm', 'RHYTHM_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['pulse', 'PULSE_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['pendulum', 'PENDULUM_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['pro', 'PRO_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['beatline', 'BEATLINE_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['tuner', 'TUNER_HISTORICAL.png', { width: 390, height: 844, deviceScaleFactor: 2 }],
  ['sheet', 'POCKT_HISTORICAL_FACE_SHEET.png', { width: 1120, height: 900, deviceScaleFactor: 1, fullPage: true }],
  ['compare', 'POCKT_CURRENT_VS_HISTORICAL.png', { width: 1120, height: 900, deviceScaleFactor: 1, fullPage: true }],
];

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
    args: ['--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
  });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('PAGE', error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error('BROWSER', message.text());
    });
    page.setDefaultNavigationTimeout(120000);
    for (const [face, name, viewport] of SHOTS) {
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      await page.goto(`${base}/forensic-historical?face=${face}&v=recover3`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="forensic-ready"]', { timeout: 90000 });
      await sleep(280);
      const file = path.join(outDir, name);
      await page.screenshot({ path: file, fullPage: Boolean(viewport.fullPage) });
      console.log(file);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

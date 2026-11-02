'use strict';

/**
 * Capture the restoration visual gate against an already running Expo web server.
 * Does not start a bundler and does not build a native binary.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'artifacts', 'restoration-visual-gate');
const rawDir = path.join(outDir, 'raw');
const port = Number(process.env.POCKT_PROOF_PORT || 8094);
const base = `http://127.0.0.1:${port}`;

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const RHYTHM = { width: 980, height: 640, deviceScaleFactor: 2 };

const SHOTS = [
  { file: 'rhythm-both.png', query: 'shot=rhythm', view: RHYTHM },
  ...['ignition', 'early', 'mid', 'edge', 'multi'].flatMap((state) => [
    { file: `pulse-historical-${state}.png`, query: `shot=pulse&side=historical&state=${state}`, view: PHONE },
    { file: `pulse-current-${state}.png`, query: `shot=pulse&side=current&state=${state}`, view: PHONE },
  ]),
  ...['left', 'center', 'right'].flatMap((state) => [
    { file: `pendulum-historical-${state}.png`, query: `shot=pendulum&side=historical&state=${state}`, view: PHONE, drag: state === 'center' ? null : state },
    { file: `pendulum-current-${state}.png`, query: `shot=pendulum&side=current&state=${state}`, view: PHONE },
  ]),
  ...['stopped44', 'active44', 'm78', 'm128'].flatMap((state) => [
    { file: `pro-historical-${state}.png`, query: `shot=pro&side=historical&state=${state}`, view: PHONE },
    { file: `pro-current-${state}.png`, query: `shot=pro&side=current&state=${state}`, view: PHONE },
  ]),
  ...['stopped44', 'active44', 'm78', 'm128'].flatMap((state) => [
    { file: `beatline-historical-${state}.png`, query: `shot=beatline&side=historical&state=${state}`, view: PHONE },
    { file: `beatline-current-${state}.png`, query: `shot=beatline&side=current&state=${state}`, view: PHONE },
  ]),
  { file: 'tuner-historical.png', query: 'shot=tuner&side=historical&state=shot', view: PHONE },
  ...[
    ['noinput', 'noinput'],
    ['-25', '-25'],
    ['-5', '-5'],
    ['0', '0'],
    ['5', '5'],
    ['25', '25'],
    ['trail', 'trail'],
    ['decay', 'decay'],
  ].map(([file, state]) => ({
    file: `tuner-current-${file}.png`,
    query: `shot=tuner&side=current&state=${encodeURIComponent(state)}`,
    view: PHONE,
  })),
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

function cell(file, label) {
  return `<figure><figcaption>${label}</figcaption><img src="${file}" /></figure>`;
}

function sheet(title, columns, rows) {
  const body = rows
    .map(
      (row) =>
        `<section><h2>${row.label}</h2><div class="row">${row.cells.map((item) => cell(item.file, item.caption)).join('')}</div></section>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #07080B; color: #E7D7B8; font: 16px/1.3 sans-serif; }
    h1 { margin: 0; padding: 18px 20px 8px; font-size: 22px; letter-spacing: 0.4px; }
    h2 { margin: 0; padding: 8px 20px; font-size: 14px; color: #F4FFFD; }
    .row { display: flex; gap: 12px; padding: 0 16px 16px; align-items: flex-start; }
    figure { margin: 0; width: ${columns === 1 ? 780 : 390}px; }
    figcaption { padding: 4px 2px 8px; font-size: 13px; font-weight: 700; }
    img { width: 100%; height: auto; display: block; background: #111; }
  </style></head><body><h1>${title}</h1>${body}</body></html>`;
}

const SHEETS = [
  {
    file: 'PULSE_HISTORICAL_VS_CURRENT.png',
    title: 'PULSE — HISTORICAL SOURCE ebaec60 PulseRoom / CURRENT PRODUCTION PulseInstrumentFace',
    rows: ['ignition', 'early', 'mid', 'edge', 'multi'].map((state) => ({
      label: state.toUpperCase(),
      cells: [
        { file: `pulse-historical-${state}.png`, caption: 'HISTORICAL SOURCE' },
        { file: `pulse-current-${state}.png`, caption: 'CURRENT PRODUCTION' },
      ],
    })),
  },
  {
    file: 'PENDULUM_HISTORICAL_VS_CURRENT.png',
    title: 'PENDULUM — HISTORICAL SOURCE ca6b267 PendulaClassicRoom / CURRENT PRODUCTION PendulumInstrumentFace',
    rows: ['left', 'center', 'right'].map((state) => ({
      label: state.toUpperCase(),
      cells: [
        { file: `pendulum-historical-${state}.png`, caption: 'HISTORICAL SOURCE' },
        { file: `pendulum-current-${state}.png`, caption: 'CURRENT PRODUCTION' },
      ],
    })),
  },
  {
    file: 'PRO_HISTORICAL_VS_CURRENT.png',
    title: 'PRO — HISTORICAL SOURCE 21469e5 ProBeatCells / CURRENT PRODUCTION ProInstrumentFace',
    rows: [
      ['stopped44', '4/4 STOPPED'],
      ['active44', '4/4 ACTIVE'],
      ['m78', '7/8'],
      ['m128', '12/8'],
    ].map(([state, label]) => ({
      label,
      cells: [
        { file: `pro-historical-${state}.png`, caption: 'HISTORICAL SOURCE' },
        { file: `pro-current-${state}.png`, caption: 'CURRENT PRODUCTION' },
      ],
    })),
  },
  {
    file: 'BEATLINE_HISTORICAL_VS_CURRENT.png',
    title: 'BEATLINE — HISTORICAL SOURCE 32b8c8e BeatlineFace / CURRENT PRODUCTION BeatlineInstrumentFace',
    rows: [
      ['stopped44', '4/4 STOPPED'],
      ['active44', '4/4 ACTIVE'],
      ['m78', '7/8'],
      ['m128', '12/8'],
    ].map(([state, label]) => ({
      label,
      cells: [
        { file: `beatline-historical-${state}.png`, caption: 'HISTORICAL SOURCE' },
        { file: `beatline-current-${state}.png`, caption: 'CURRENT PRODUCTION' },
      ],
    })),
  },
  {
    file: 'TUNER_CURRENT_STATES_AND_TRAIL.png',
    title: 'TUNER — historical chromatic screenshot / current VinylTunerFace',
    rows: [
      {
        label: 'HISTORICAL SOURCE',
        cells: [{ file: 'tuner-historical.png', caption: 'HISTORICAL SOURCE — App Store 04_Tuner.png' }],
      },
      ...[
        ['noinput', 'NO INPUT'],
        ['-25', 'E3 -25¢'],
        ['-5', 'E3 -5¢'],
        ['0', 'E3 0¢'],
        ['5', 'E3 +5¢'],
        ['25', 'E3 +25¢'],
        ['trail', 'PITCH HISTORY'],
        ['decay', 'AFTER DECAY'],
      ].map(([state, label]) => ({
        label,
        cells: [{ file: `tuner-current-${state}.png`, caption: `CURRENT PRODUCTION — ${label}` }],
      })),
    ],
  },
];

async function capture(page, shot) {
  await page.setViewport(shot.view);
  await page.goto(`${base}/restoration-visual-gate?${shot.query}&v=gate1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="gate-ready"]', { timeout: 90000 });
  await sleep(180);
  if (shot.drag) {
    const body = await page.$('[data-testid="gate-body"]');
    const box = await body.boundingBox();
    const x = box.x + box.width * 0.5;
    const y = box.y + box.height * 0.62;
    const dx = shot.drag === 'left' ? -150 : 150;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y, { steps: 16 });
    await sleep(240);
  }
  const file = path.join(rawDir, shot.file);
  await page.screenshot({ path: file });
  if (shot.drag) await page.mouse.up();
  console.log(file);
}

async function compose(page, spec) {
  const htmlPath = path.join(rawDir, `${spec.file}.html`);
  fs.writeFileSync(htmlPath, sheet(spec.title, spec.file.startsWith('TUNER') ? 1 : 2, spec.rows));
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  const height = await page.evaluate(() => document.body.scrollHeight);
  const width = spec.file.startsWith('TUNER') ? 860 : 860;
  await page.setViewport({ width, height: Math.min(height, 16000), deviceScaleFactor: 1 });
  await sleep(150);
  const file = path.join(outDir, spec.file);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function master(page) {
  const files = [
    'RHYTHM_HISTORICAL_VS_CURRENT.png',
    'PULSE_HISTORICAL_VS_CURRENT.png',
    'PENDULUM_HISTORICAL_VS_CURRENT.png',
    'PRO_HISTORICAL_VS_CURRENT.png',
    'BEATLINE_HISTORICAL_VS_CURRENT.png',
    'TUNER_CURRENT_STATES_AND_TRAIL.png',
  ];
  const body = files
    .map((file) => `<section><h2>${file}</h2><img src="../${file}" /></section>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #07080B; color: #E7D7B8; font: 18px sans-serif; }
    h1 { padding: 20px; margin: 0; }
    h2 { padding: 12px 20px 0; margin: 0; font-size: 16px; }
    img { width: 860px; height: auto; display: block; margin: 8px 20px 28px; }
  </style></head><body><h1>POCKT RESTORATION VISUAL GATE — 0539b0a</h1>${body}</body></html>`;
  const htmlPath = path.join(rawDir, 'master.html');
  fs.writeFileSync(htmlPath, html);
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.setViewport({ width: 920, height: 900, deviceScaleFactor: 1 });
  await sleep(200);
  const file = path.join(outDir, 'POCKT_RESTORATION_VISUAL_GATE.png');
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function main() {
  const executablePath = browserPath();
  if (!executablePath) throw new Error('No Edge or Chrome binary found');
  const puppeteer = require('puppeteer-core');
  fs.mkdirSync(rawDir, { recursive: true });
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
    for (const shot of SHOTS) await capture(page, shot);
    fs.copyFileSync(path.join(rawDir, 'rhythm-both.png'), path.join(outDir, 'RHYTHM_HISTORICAL_VS_CURRENT.png'));
    for (const spec of SHEETS) await compose(page, spec);
    await master(page);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE = process.env.EXP004_URL ?? 'http://127.0.0.1:4173/experiments/EXP-004-salas-irregulares/';
const OUT = resolve('artifacts/TASK-0040/attempt-2');
const SHOTS = resolve(OUT, 'screenshots');
const SEED = 279837264;
const VARIANTS = ['growth', 'bsp', 'templates'];

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function openPage(deviceScaleFactor) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`${BASE}?test=1&seed=${SEED}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
  return { page, context };
}

async function select(page, variant, debug) {
  await page.evaluate(
    ({ variant, debug }) => {
      window.__experiment.setParams({
        variant,
        showDebug: debug,
        showDoors: true,
        showSpawn: true,
        showEnemies: true,
      });
      window.__experiment.setSeed(279837264);
    },
    { variant, debug },
  );
  await page.waitForFunction(
    () => document.querySelectorAll('canvas[data-rendered="true"]').length >= 3,
  );
  await page.waitForTimeout(120);
  await page.evaluate((variant) => {
    document
      .querySelector(`[data-testid="stage-${variant}"]`)
      ?.scrollIntoView({ block: 'center' });
  }, variant);
  await page.waitForTimeout(80);
}

const main = await openPage(1);
for (const variant of VARIANTS) {
  for (const debug of [false, true]) {
    await select(main.page, variant, debug);
    const suffix = debug ? 'debug' : 'normal';
    await main.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${SEED}-${suffix}-page.png`),
    });
  }
}
await main.page.evaluate(() => window.scrollTo(0, 0));
await select(main.page, 'growth', false);
await main.page.evaluate(() => window.scrollTo(0, 0));
await main.page.screenshot({ path: resolve(SHOTS, 'overview-reference.png') });
const decision = await main.page.evaluate(() => window.__experiment.getExportData());
await writeFile(resolve(OUT, 'decision-example.json'), `${JSON.stringify(decision, null, 2)}\n`);
await main.context.close();

const zoom = await openPage(2);
for (const variant of VARIANTS) {
  await select(zoom.page, variant, true);
  const canvas = zoom.page.locator(`[data-testid="canvas-${variant}"]`);
  const box = await canvas.boundingBox();
  if (!box) {
    errors.push(`sin caja para ${variant}`);
    continue;
  }
  const split = box.height * 0.68;
  await zoom.page.screenshot({
    path: resolve(SHOTS, `${variant}-fullmap-zoom.png`),
    clip: { x: box.x, y: box.y, width: box.width, height: split },
  });
  await zoom.page.screenshot({
    path: resolve(SHOTS, `${variant}-13x13-zoom.png`),
    clip: { x: box.x, y: box.y + split, width: box.width, height: box.height - split },
  });
}
await zoom.context.close();
await browser.close();

await writeFile(
  resolve(OUT, 'capture-log.txt'),
  `${JSON.stringify({ base: BASE, seed: SEED, errors }, null, 2)}\n`,
);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Capturas de puertas 13×13 y mapa completo en ${SHOTS}`);
}

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE =
  process.env.EXP004_URL ??
  'http://127.0.0.1:4173/experiments/EXP-004-salas-irregulares/';
const OUT = resolve('artifacts/TASK-0041/attempt-2');
const SHOTS = resolve(OUT, 'screenshots');
const SEEDS = [2, 4, 5, 6, 7];
const VARIANTS = ['growth', 'bsp', 'templates'];

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const datasets = [];

async function openPage() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`${BASE}?test=1&seed=${SEEDS[0]}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
  return { page, context };
}

async function select(page, variant, seed, debug) {
  await page.evaluate(
    ({ variant, seed, debug }) => {
      window.__experiment.setParams({
        variant,
        showDebug: debug,
        showDoors: true,
        showSpawn: true,
        showEnemies: true,
      });
      window.__experiment.setSeed(seed);
    },
    { variant, seed, debug },
  );
  await page.waitForFunction(
    ({ variant, seed }) => {
      const canvas = document.querySelector(`[data-testid="canvas-${variant}"]`);
      return (
        canvas?.dataset.rendered === 'true' &&
        canvas?.dataset.variant === variant &&
        canvas?.dataset.seed === String(seed)
      );
    },
    { variant, seed },
  );
  await page.waitForTimeout(160);
  await page.evaluate((variant) => {
    document
      .querySelector(`[data-testid="stage-${variant}"]`)
      ?.scrollIntoView({ block: 'center' });
  }, variant);
  await page.waitForTimeout(80);
}

async function datasetFor(page, variant) {
  return page.evaluate((variant) => {
    const canvas = document.querySelector(`[data-testid="canvas-${variant}"]`);
    return canvas ? { ...canvas.dataset } : null;
  }, variant);
}

const main = await openPage();
for (const seed of SEEDS) {
  for (const variant of VARIANTS) {
    await select(main.page, variant, seed, false);
    datasets.push({ seed, variant, debug: false, dataset: await datasetFor(main.page, variant) });
    await main.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${seed}-normal.png`),
    });

    await select(main.page, variant, seed, true);
    datasets.push({ seed, variant, debug: true, dataset: await datasetFor(main.page, variant) });
    await main.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${seed}-debug.png`),
    });
  }
}

const decision = await main.page.evaluate(() => window.__experiment.getExportData());
await writeFile(resolve(OUT, 'decision-example.json'), `${JSON.stringify(decision, null, 2)}\n`);
await main.context.close();

const zoom = await openPage();
for (const seed of SEEDS) {
  for (const variant of VARIANTS) {
    await select(zoom.page, variant, seed, true);
    const rendered = await zoom.page.evaluate((variant) => {
      const canvas = document.querySelector(`[data-testid="canvas-${variant}"]`);
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const holder = document.createElement('div');
      holder.style.cssText =
        'position:fixed;inset:0;overflow:hidden;background:#080b10;z-index:9999;';
      document.body.append(holder);
      holder.append(canvas);
      const scale = 720 / (rect.height * 0.32);
      const offsetY = -(rect.height * 0.68) * scale;
      const offsetX = (1280 - rect.width * scale) / 2;
      canvas.style.position = 'absolute';
      canvas.style.margin = '0';
      canvas.style.transformOrigin = 'top left';
      canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
      return true;
    }, variant);
    if (!rendered) {
      errors.push(`no se pudo aislar la vista 13x13 de ${variant} · ${seed}`);
      continue;
    }
    await zoom.page.waitForTimeout(80);
    await zoom.page.screenshot({
      path: resolve(SHOTS, `${variant}-seed-${seed}-13x13.png`),
    });
    // Restaura la página para la siguiente captura.
    await zoom.page.reload({ waitUntil: 'networkidle' });
    await zoom.page.waitForFunction(() => Boolean(window.__experiment?.getMaps));
  }
}
await zoom.context.close();
await browser.close();

await writeFile(
  resolve(OUT, 'capture-log.txt'),
  `${JSON.stringify({ base: BASE, seeds: SEEDS, variants: VARIANTS, errors, datasets }, null, 2)}\n`,
);

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Capturas A/B/C normal/debug/13x13 en ${SHOTS}`);
}

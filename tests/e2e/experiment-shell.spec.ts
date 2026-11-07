import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';

test('el shell renderiza, ajusta parámetros y exporta una decisión', async ({ page }, testInfo) => {
  await page.goto('/experiments/EXP-000-shell-demo/?test=1&seed=123');
  await page.waitForFunction(() => Boolean(window.__experiment));

  await expect(page.getByTestId('experiment-title')).toHaveText('Shell de experimentos');
  await expect(page.getByTestId('canvas-random')).toBeVisible();
  await expect(page.getByTestId('canvas-mirror')).toBeVisible();

  const initial = await page.evaluate(() => window.__experiment?.snapshot());
  expect(initial?.seed).toBe(123);
  expect(initial?.variants).toHaveLength(2);

  const paintedPixels = await page.getByTestId('canvas-random').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] + data[index + 1] + data[index + 2] > 80) count += 1;
    }
    return count;
  });
  expect(paintedPixels).toBeGreaterThan(100);

  await page.getByTestId('param-gridSize').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '12';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const updated = await page.evaluate(() => window.__experiment?.snapshot());
  expect(updated?.params.gridSize).toBe(12);
  await expect(page.getByTestId('metrics-random')).toContainText('Celdas');

  await page.getByTestId('decision-select').selectOption('random');
  await page.getByTestId('decision-notes').fill('Prueba de humo del shell');
  const decision = await page.evaluate(() => window.__experiment?.getDecision());
  expect(decision?.decision).toBe('random');
  expect(decision?.notes).toBe('Prueba de humo del shell');

  const screenshotPath = 'artifacts/EXP-000-shell-demo/shell-smoke.png';
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach('shell-smoke', { path: screenshotPath, contentType: 'image/png' });
});

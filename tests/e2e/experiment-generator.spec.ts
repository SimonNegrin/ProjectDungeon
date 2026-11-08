import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { artifactPath } from './artifacts';

const VARIANT_IDS = ['bsp', 'random', 'hybrid'] as const;

test.use({ viewport: { width: 1600, height: 1200 } });

type MetricSnapshot = { label: string; value: string | number };

function fingerprintOf(
  snapshot: { variants: Array<{ id: string; metrics: MetricSnapshot[] }> } | undefined,
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const variant of snapshot?.variants ?? []) {
    result[variant.id] = variant.metrics.find((metric) => metric.label === 'Huella')?.value ?? '';
  }
  return result;
}

async function setRange(page: Page, testId: string, value: number): Promise<void> {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

test('EXP-001 compara A/B/C, cambia semilla, alterna huecos y exporta decisión', async ({ page }, testInfo) => {
  await page.goto('/experiments/EXP-001-generador-mazmorra/?test=1&seed=20261107');
  await page.waitForFunction(() => Boolean(window.__experiment));

  await expect(page.getByTestId('experiment-title')).toHaveText('Comparador de generadores de mazmorra');

  for (const id of VARIANT_IDS) {
    await expect(page.getByTestId(`canvas-${id}`)).toBeVisible();
    await expect(page.getByTestId(`metrics-${id}`)).toBeVisible();
  }

  await expect(page.getByTestId('metrics-bsp')).toContainText('Salas');
  await expect(page.getByTestId('metrics-bsp')).toContainText('Conectividad');
  await expect(page.getByTestId('metrics-bsp')).toContainText('Huella');
  await expect(page.getByTestId('metrics-bsp')).toContainText('Ajuste');
  await expect(page.getByTestId('metrics-random')).toContainText('Salas');
  await expect(page.getByTestId('metrics-hybrid')).toContainText('Salas');

  for (const id of VARIANT_IDS) {
    await expect(page.getByTestId(`metrics-${id}`)).toContainText('Grandes');
    await expect(page.getByTestId(`metrics-${id}`)).toContainText('Pequeñas');
  }

  const initial = await page.evaluate(() => window.__experiment?.snapshot());
  expect(initial?.seed).toBe(20261107);
  expect(initial?.variants).toHaveLength(3);
  expect(initial?.params).toMatchObject({
    roomTarget: 10,
    roomMin: 3,
    roomMax: 11,
    loopRatio: 20,
    showDoors: true,
  });
  expect(initial?.variants.map((variant) => variant.id)).toEqual(
    expect.arrayContaining([...VARIANT_IDS]),
  );
  const initialFingerprints = fingerprintOf(initial);
  expectObjectValues(initialFingerprints, 3);

  for (const variant of initial?.variants ?? []) {
    const large = variant.metrics.find((metric) => metric.label === 'Grandes');
    const small = variant.metrics.find((metric) => metric.label === 'Pequeñas');
    expect(large, `${variant.id} debe mostrar Grandes`).toBeDefined();
    expect(small, `${variant.id} debe mostrar Pequeñas`).toBeDefined();
    expect(Number(large?.value), `${variant.id} debe tener 2+ grandes`).toBeGreaterThanOrEqual(2);
    expect(Number(small?.value), `${variant.id} debe tener 3+ pequeñas`).toBeGreaterThanOrEqual(3);
  }

  const paintedPixels = await page.getByTestId('canvas-bsp').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] + data[index + 1] + data[index + 2] > 90) count += 1;
    }
    return count;
  });
  expect(paintedPixels).toBeGreaterThan(1000);

  const variantShots: Array<[string, string]> = [
    ['bsp', 'variant-a-seed-20261107'],
    ['random', 'variant-b-seed-20261107'],
    ['hybrid', 'variant-c-seed-20261107'],
  ];
  for (const [id, name] of variantShots) {
    const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
    await mkdir(dirname(path), { recursive: true });
    await page.getByTestId(`stage-${id}`).screenshot({ path });
    await testInfo.attach(name, { path, contentType: 'image/png' });
  }

  await page.getByTestId('seed-input').fill('12345');
  await page.getByTestId('seed-input').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__experiment?.getSeed())).toBe(12345);

  const changed = await page.evaluate(() => window.__experiment?.snapshot());
  expect(changed?.seed).toBe(12345);
  const changedFingerprints = fingerprintOf(changed);
  expectObjectValues(changedFingerprints, 3);
  for (const id of VARIANT_IDS) {
    expect(changedFingerprints[id]).not.toBe(initialFingerprints[id]);
  }
  await expect(page.getByTestId('metrics-bsp')).not.toContainText(String(initialFingerprints.bsp));

  const alternativeSeedPath = artifactPath(testInfo, 'screenshots', 'alternative-seed.png');
  await mkdir(dirname(alternativeSeedPath), { recursive: true });
  await page.screenshot({ path: alternativeSeedPath, fullPage: true });
  await testInfo.attach('alternative-seed', {
    path: alternativeSeedPath,
    contentType: 'image/png',
  });

  const doorsBefore = await page.getByTestId('canvas-bsp').getAttribute('data-show-doors');
  expect(doorsBefore).toBe('true');
  await page.getByTestId('param-showDoors').uncheck();
  await expect.poll(() => page.getByTestId('canvas-bsp').getAttribute('data-show-doors')).toBe('false');
  await expect.poll(() => page.getByTestId('canvas-hybrid').getAttribute('data-show-doors')).toBe('false');
  await expect(page.getByTestId('metrics-bsp')).toContainText('Huecos');

  const doorsOffPath = artifactPath(testInfo, 'screenshots', 'doors-off.png');
  await mkdir(dirname(doorsOffPath), { recursive: true });
  await page.screenshot({ path: doorsOffPath, fullPage: true });
  await testInfo.attach('doors-off', {
    path: doorsOffPath,
    contentType: 'image/png',
  });

  await page.getByTestId('decision-select').selectOption('variant-a');
  await page.getByTestId('decision-notes').fill('BSP se lee mejor en esta semilla; revisar callejones del híbrido.');
  const decision = await page.evaluate(() => window.__experiment?.getDecision());
  expect(decision?.experiment).toBe('EXP-001');
  expect(decision?.seed).toBe(12345);
  expect(decision?.decision).toBe('variant-a');
  expect(decision?.notes).toBe('BSP se lee mejor en esta semilla; revisar callejones del híbrido.');
  expect(decision?.parameters).toMatchObject({
    roomTarget: 10,
    roomMin: 3,
    roomMax: 11,
    loopRatio: 20,
    showDoors: false,
  });
  expect(typeof decision?.decidedAt).toBe('string');

  await setRange(page, 'param-roomTarget', 12);
  await setRange(page, 'param-roomMin', 6);
  await setRange(page, 'param-roomMax', 8);
  await setRange(page, 'param-loopRatio', 40);

  await expect(page.getByTestId('experiment-title')).toBeVisible();
  for (const id of VARIANT_IDS) {
    await expect(page.getByTestId(`canvas-${id}`)).toBeVisible();
    await expect(page.getByTestId(`metrics-${id}`)).toContainText('Salas');
  }

  const extreme = await page.evaluate(() => window.__experiment?.snapshot());
  expect(extreme?.params).toMatchObject({
    roomTarget: 12,
    roomMin: 6,
    roomMax: 8,
    loopRatio: 40,
  });
  expect(extreme?.variants).toHaveLength(3);

  for (const variant of extreme?.variants ?? []) {
    const adjustment = variant.metrics.find((metric) => metric.label === 'Ajuste');
    expect(adjustment).toBeDefined();
    const value = String(adjustment?.value ?? '');
    expect(value.length).toBeGreaterThan(0);
    if (value !== 'Sin ajustes') {
      expect(value).toMatch(/ajust|normaliz|descart/i);
      await expect(page.getByTestId(`metrics-${variant.id}`)).toContainText('Ajuste');
    }
  }

  await page.getByTestId('reset').click();
  await expect.poll(() => page.evaluate(() => window.__experiment?.getSeed())).toBe(20261107);
  const reset = await page.evaluate(() => window.__experiment?.snapshot());
  expect(reset?.seed).toBe(20261107);
  expect(reset?.params).toMatchObject({
    roomTarget: 10,
    roomMin: 3,
    roomMax: 11,
    loopRatio: 20,
    showDoors: true,
  });
});

function expectObjectValues(record: Record<string, string | number>, count: number): void {
  expect(Object.keys(record)).toHaveLength(count);
  for (const value of Object.values(record)) {
    expect(String(value).length).toBeGreaterThan(0);
  }
}

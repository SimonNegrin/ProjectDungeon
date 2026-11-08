import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { MotionExperimentApi } from '../../experiments/EXP-002-ritmo-movimiento/src/motion';

const SEED = 279837264;
const ARTIFACTS = 'artifacts/TASK-0017/attempt-1';
const SCREENSHOTS = `${ARTIFACTS}/screenshots`;

test.use({ viewport: { width: 1600, height: 1200 } });

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openExperiment(page: Page): Promise<void> {
  await page.goto(`/experiments/EXP-002-ritmo-movimiento/?test=1&seed=${SEED}`);
  await page.waitForFunction(() => Boolean(window.__experiment));
  await page.waitForFunction(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    return api.isAssetsReady();
  });
}

type ExperimentState = {
  status: string;
  step: number;
  mp: number;
  position: { x: number; y: number; tileX: number; tileY: number };
  camera: { x: number; y: number };
  timeline: { totalMs: number; elapsedMs: number; steps: number; diagonal: string };
  params: {
    preset: string;
    scenario: string;
    stepMs: number;
    pauseMs: number;
    diagonal: string;
  };
  scenario: string;
};

async function readState(page: Page): Promise<ExperimentState> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    return {
      status: api.getState(),
      step: api.getStep(),
      mp: api.getMpLeft(),
      position: api.getVisualPosition(),
      camera: api.getCamera(),
      timeline: api.getTimeline(),
      params: api.getParams(),
      scenario: api.getScenario(),
    };
  });
}

async function advanceToReady(page: Page): Promise<void> {
  await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    api.play();
    let guard = 0;
    while (api.getState() === 'playing' && guard < 200) {
      api.step(50);
      guard += 1;
    }
  });
}

async function setRange(page: Page, testId: string, value: number): Promise<void> {
  await page.getByTestId(testId).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = `${SCREENSHOTS}/${name}.png`;
  await mkdir(dirname(path), { recursive: true });
  await page.getByTestId('stage-motion').screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('el índice lista EXP-002 y los presets A/B/C cambian el ritmo', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/experiments/?test=1');
  await expect(
    page.locator('a[href="/experiments/EXP-002-ritmo-movimiento/"]'),
  ).toBeVisible();
  await expect(
    page.locator('.experiment-card').filter({ hasText: 'Ritmo del movimiento animado' }),
  ).toBeVisible();

  await openExperiment(page);
  await expect(page.getByTestId('experiment-title')).toHaveText(
    'Ritmo del movimiento animado',
  );

  const initial = await readState(page);
  expect(initial.params).toMatchObject({
    preset: 'B',
    scenario: 'short',
    stepMs: 125,
    pauseMs: 50,
    diagonal: 'constant-speed',
  });
  expect(await page.getByTestId('decision-select').inputValue()).toBe('');

  const expected = {
    A: { stepMs: 90, pauseMs: 30, total: 390 },
    B: { stepMs: 125, pauseMs: 50, total: 575 },
    C: { stepMs: 160, pauseMs: 75, total: 780 },
  } as const;

  for (const presetId of ['A', 'B', 'C'] as const) {
    await page.getByTestId('param-preset').selectOption(presetId);
    await advanceToReady(page);
    const state = await readState(page);
    expect(state.params).toMatchObject({
      preset: presetId,
      stepMs: expected[presetId].stepMs,
      pauseMs: expected[presetId].pauseMs,
    });
    expect(state.status).toBe('ready');
    expect(state.step).toBe(3);
    expect(state.mp).toBe(3);
    expect(state.timeline.totalMs).toBeCloseTo(expected[presetId].total, 3);
    await expect(page.getByTestId('hud-total')).toHaveText(
      `${expected[presetId].total} ms`,
    );
    await expect(page.getByTestId('hud-ready')).toBeVisible();
    await screenshot(page, `preset-${presetId.toLowerCase()}`, testInfo);
  }

  await setRange(page, 'param-stepMs', 150);
  await setRange(page, 'param-pauseMs', 60);
  const custom = await readState(page);
  expect(custom.params).toMatchObject({
    preset: 'personalizado',
    stepMs: 150,
    pauseMs: 60,
  });
  expect(await page.getByTestId('param-preset').inputValue()).toBe('personalizado');
  expect(await page.getByTestId('decision-select').inputValue()).toBe('');

  await setRange(page, 'param-stepMs', 999);
  expect((await readState(page)).params.stepMs).toBe(250);

  await page.getByTestId('seed-input').fill('12345');
  await page.getByTestId('seed-input').dispatchEvent('change');
  await expect
    .poll(async () => page.evaluate(() => window.__experiment!.getSeed()))
    .toBe(12345);
  const seeded = await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    return api.getDecision();
  });
  expect(seeded.seed).toBe(12345);

  expect(errors).toEqual([]);
});

test('escenario corto: 3 pasos, MP progresivo, cámara centrada e input ignorado', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  const start = await readState(page);
  expect(start.status).toBe('idle');
  expect(start.step).toBe(0);
  expect(start.mp).toBe(6);
  expect(start.position).toEqual({ x: 208, y: 208, tileX: 6, tileY: 6 });
  expect(start.camera).toEqual({ x: 0, y: 0 });
  await expect(page.getByTestId('canvas-motion')).toHaveAttribute(
    'data-cursor-visible',
    'true',
  );

  await page.getByTestId('play').click();
  await expect.poll(async () => (await readState(page)).status).toBe('playing');
  const playing = await readState(page);
  await expect(page.getByTestId('canvas-motion')).toHaveAttribute(
    'data-cursor-visible',
    'false',
  );

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  const ignored = await readState(page);
  expect(ignored.status).toBe('playing');
  expect(ignored.step).toBe(0);
  expect(ignored.timeline.elapsedMs).toBe(playing.timeline.elapsedMs);

  await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    let guard = 0;
    while (api.getState() === 'playing' && guard < 100) {
      api.step(50);
      guard += 1;
    }
  });

  const ready = await readState(page);
  expect(ready.status).toBe('ready');
  expect(ready.step).toBe(3);
  expect(ready.mp).toBe(3);
  expect(ready.position).toEqual({ x: 304, y: 208, tileX: 9, tileY: 6 });
  expect(ready.camera).toEqual({ x: 96, y: 0 });
  expect(ready.position.x - ready.camera.x).toBe(208);
  expect(ready.position.y - ready.camera.y).toBe(208);
  await expect(page.getByTestId('hud-step')).toHaveText('3/3');
  await expect(page.getByTestId('hud-mp')).toHaveText('3/6');
  await expect(page.getByTestId('hud-ready')).toBeVisible();
  await expect(page.getByTestId('canvas-motion')).toHaveAttribute(
    'data-cursor-visible',
    'true',
  );

  await page.keyboard.press('Space');
  await expect.poll(async () => (await readState(page)).status).toBe('playing');
  await page.evaluate(() => window.__experiment!.reset());
  const reset = await readState(page);
  expect(reset.status).toBe('idle');
  expect(reset.step).toBe(0);
  expect(reset.mp).toBe(6);

  expect(errors).toEqual([]);
});

test('escenario largo: diagonal, cámara clampada y decisión exportada', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page.getByTestId('param-scenario').selectOption('long');
  const path = await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    return api.getPath();
  });
  expect(path).toHaveLength(7);
  const diagonals = path
    .slice(1)
    .filter((tile, index) => tile.x !== path[index].x && tile.y !== path[index].y);
  expect(diagonals.length).toBeGreaterThanOrEqual(1);

  const base = await readState(page);
  expect(base.params.scenario).toBe('long');
  expect(base.timeline.steps).toBe(6);

  await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    api.play();
    api.step(300);
  });

  const mid = await readState(page);
  expect(mid.status).toBe('playing');
  expect(mid.timeline.elapsedMs).toBe(300);
  expect(Number.isInteger(mid.position.x)).toBe(true);
  expect(Number.isInteger(mid.position.y)).toBe(true);
  expect((mid.position.x - 16) % 32).not.toBe(0);
  expect((mid.position.y - 16) % 32).not.toBe(0);
  expect(Number.isInteger(mid.camera.x)).toBe(true);
  expect(Number.isInteger(mid.camera.y)).toBe(true);
  await screenshot(page, 'long-mid', testInfo);

  await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    let guard = 0;
    while (api.getState() === 'playing' && guard < 100) {
      api.step(50);
      guard += 1;
    }
  });

  const ready = await readState(page);
  expect(ready.status).toBe('ready');
  expect(ready.step).toBe(6);
  expect(ready.mp).toBe(0);
  expect(ready.position).toEqual({ x: 464, y: 304, tileX: 14, tileY: 9 });
  expect(ready.camera).toEqual({ x: 224, y: 96 });
  expect(ready.position.x - ready.camera.x).toBeGreaterThan(208);
  await expect(page.getByTestId('hud-step')).toHaveText('6/6');
  await expect(page.getByTestId('hud-mp')).toHaveText('0/6');
  await screenshot(page, 'long-ready', testInfo);

  const speedTotal = ready.timeline.totalMs;
  await page.getByTestId('param-diagonal').selectOption('constant-duration');
  const durationTotal = (await readState(page)).timeline.totalMs;
  expect(durationTotal).toBeLessThan(speedTotal);

  await page.getByTestId('param-diagonal').selectOption('constant-speed');
  await page.getByTestId('param-preset').selectOption('B');
  await page.getByTestId('decision-select').selectOption('B');
  await page.getByTestId('decision-notes').fill(
    'Medio se siente equilibrado; la diagonal a velocidad constante se lee mejor.',
  );

  const decision = await page.evaluate(() => {
    const api = window.__experiment as unknown as MotionExperimentApi;
    return api.getDecision();
  });
  expect(decision).toMatchObject({
    experiment: 'EXP-002',
    decision: 'B',
    preset: 'B',
    scenario: 'long',
    stepMs: 125,
    pauseMs: 50,
    diagonal: 'constant-speed',
    seed: SEED,
  });
  expect(decision.parameters).toMatchObject({
    preset: 'B',
    scenario: 'long',
    stepMs: 125,
    pauseMs: 50,
    diagonal: 'constant-speed',
    seed: SEED,
  });
  expect(decision.notes).toContain('equilibrado');
  expect(Number.isNaN(Date.parse(decision.decidedAt))).toBe(false);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('decision-download').click();
  const download = await downloadPromise;
  const decisionPath = `${ARTIFACTS}/decision-example.json`;
  await mkdir(dirname(decisionPath), { recursive: true });
  await download.saveAs(decisionPath);

  const written = JSON.parse(await readFile(decisionPath, 'utf8')) as {
    experiment: string;
    decision: string;
    preset: string;
    stepMs: number;
    pauseMs: number;
    diagonal: string;
    scenario: string;
    seed: number;
    notes: string;
    decidedAt: string;
    parameters: Record<string, unknown>;
  };
  expect(written).toMatchObject({
    experiment: 'EXP-002',
    decision: 'B',
    preset: 'B',
    stepMs: 125,
    pauseMs: 50,
    diagonal: 'constant-speed',
    scenario: 'long',
    seed: SEED,
  });
  expect(written.notes).toContain('equilibrado');
  expect(written.parameters).toMatchObject({
    stepMs: 125,
    pauseMs: 50,
    diagonal: 'constant-speed',
    scenario: 'long',
  });
  expect(Number.isNaN(Date.parse(written.decidedAt))).toBe(false);

  expect(errors).toEqual([]);
});

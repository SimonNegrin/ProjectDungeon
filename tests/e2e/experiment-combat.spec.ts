import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type {
  MatchupResult,
  MeasurementPayload,
} from '../../experiments/EXP-003-mesa-combate/src/v2/measure';
import type { V2ExperimentApi } from '../../experiments/EXP-003-mesa-combate/src/ui';
import { artifactPath } from './artifacts';

const SEED = 1017;

test.use({ viewport: { width: 1600, height: 1200 } });

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openExperiment(page: Page, extra = ''): Promise<void> {
  await page.goto(
    `/experiments/EXP-003-mesa-combate/?test=1&seed=${SEED}${extra}`,
  );
  await page.waitForFunction(() => Boolean(window.__experiment));
}

async function readResults(page: Page): Promise<MeasurementPayload> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getResults();
  });
}

async function setNumber(page: Page, testId: string, value: number): Promise<void> {
  await page.getByTestId(testId).fill(String(value));
  await page.getByTestId(testId).evaluate((element) => {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function rates(matchups: ReadonlyArray<MatchupResult>): number[] {
  return matchups.map((matchup) => matchup.heroWinRate);
}

test('el índice lista EXP-003 y la cabecera anuncia balance pendiente', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/experiments/?test=1');
  await expect(
    page.locator('a[href="/experiments/EXP-003-mesa-combate/"]'),
  ).toBeVisible();
  await expect(
    page.locator('.experiment-card').filter({ hasText: 'EXP-003' }),
  ).toBeVisible();

  await openExperiment(page);
  await expect(page.getByTestId('experiment-id')).toContainText('EXP-003');
  await expect(page.getByTestId('experiment-title')).toHaveText(
    'Mesa de combate v2.0',
  );
  await expect(page.getByTestId('experiment-question')).toContainText(
    'acciones, magia y réplica',
  );

  const warning = page.getByTestId('balance-warning');
  await expect(warning).toContainText('pendientes de aprobación del usuario');
  await expect(warning).toContainText('96,3–100 %');
  await expect(warning).toContainText('banda 40–60 %');
  await expect(warning).toContainText('12 de 12');

  await expect(page.getByTestId('seed-input')).toHaveValue(String(SEED));
  await expect(page.getByTestId('duel-count')).toHaveValue('1000');
  await expect(page.getByTestId('combats-rows').locator('tr')).toHaveCount(12);
  await expect(page.getByTestId('detail-result')).toContainText(
    'fuera +40,0 pp',
  );
  await expect(page.getByTestId('combats-row-picaro-bruto')).toBeVisible();

  await screenshot(page, 'tabla-12-emparejamientos', testInfo);
  expect(errors).toEqual([]);
});

test('cambiar semilla y duelos recalcula sin recargar', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page.evaluate(() => {
    (window as Window & { __pageMarker?: string }).__pageMarker = 'vivo';
  });

  await setNumber(page, 'duel-count', 200);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__experiment as unknown as V2ExperimentApi).getDuels(),
      ),
    )
    .toBe(200);
  const afterDuels = await readResults(page);
  expect(afterDuels.duels).toBe(200);
  for (const matchup of afterDuels.matchups) {
    expect(matchup.heroWins + matchup.enemyWins + matchup.draws).toBe(200);
  }
  expect(
    await page.evaluate(
      () => (window as Window & { __pageMarker?: string }).__pageMarker,
    ),
  ).toBe('vivo');

  await setNumber(page, 'seed-input', 1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__experiment as unknown as V2ExperimentApi).getSeed(),
      ),
    )
    .toBe(1);
  const afterSeed = await readResults(page);
  expect(afterSeed.seed).toBe(1);
  expect(rates(afterSeed.matchups)).not.toEqual(rates(afterDuels.matchups));

  await page.getByTestId('run-button').click();
  await expect(page.getByTestId('controls-status')).toContainText('Semilla 1');

  await page.getByTestId('controls-reset').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__experiment as unknown as V2ExperimentApi).getSeed(),
      ),
    )
    .toBe(SEED);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__experiment as unknown as V2ExperimentApi).getDuels(),
      ),
    )
    .toBe(1000);
  await expect(page.getByTestId('seed-input')).toHaveValue('1017');
  await expect(page.getByTestId('duel-count')).toHaveValue('1000');

  await screenshot(page, 'controles-recalculados', testInfo);
  expect(errors).toEqual([]);
});

test('misma semilla y duelos producen el mismo resultado y snapshot', async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  const first = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.runAll();
  });
  const second = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.runAll();
  });
  expect(first).toEqual(second);

  const snapshot = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  const snapshotAgain = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(snapshotAgain).toEqual(snapshot);
  expect(snapshot.params).toEqual({
    seed: SEED,
    duels: 1000,
    matchup: 'guerrero:centinela',
  });
  expect(snapshot.matchups).toHaveLength(12);
  expect(snapshot.catalogVersion).toBe('EXP-003-v2.0.0');
  expect(snapshot.variants[0].id).toBe('matchups');
  expect(snapshot.variants[0].metrics).toContainEqual({
    label: 'Rango victorias héroe',
    value: '96,3–100 %',
  });

  expect(first.seed).toBe(SEED);
  expect(first.duels).toBe(1000);
  expect(first.matchups).toHaveLength(12);
  expect(first.matchups.every((matchup) => !matchup.insideBand)).toBe(true);
  expect(Math.min(...rates(first.matchups))).toBeCloseTo(96.3, 3);
  expect(Math.max(...rates(first.matchups))).toBe(100);

  const stored = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getResults();
  });
  expect(stored).toEqual(first);

  await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    api.setSeed(1);
  });
  const changed = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(changed).not.toEqual(snapshot);

  await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    api.setSeed(1017);
  });
  const restored = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(restored).toEqual(snapshot);

  const missing = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    const required = [
      'getSeed',
      'setSeed',
      'getDuels',
      'setDuels',
      'runAll',
      'getResults',
      'snapshot',
      'getDecision',
      'reset',
    ] as const;
    return required.filter(
      (name) => typeof (api as unknown as Record<string, unknown>)[name] !== 'function',
    );
  });
  expect(missing).toEqual([]);

  expect(errors).toEqual([]);
});

test('el detalle, el export y la descarga no llevan marca de tiempo', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  await page
    .getByTestId('combats-row-picaro-bruto')
    .locator('td')
    .first()
    .click();
  await expect(page.getByTestId('detail-title')).toHaveText('Pícaro vs Bruto');
  await expect(page.getByTestId('detail-actions')).toContainText('Atacar');
  await expect(page.getByTestId('detail-actions')).toContainText('Esperar');
  await expect(page.getByTestId('detail-spells')).toContainText(
    'Sin hechizos lanzados.',
  );
  await expect(page.getByTestId('detail-mana')).toContainText('No gastado');
  await expect(page.getByTestId('detail-hp')).toContainText('PV medios del héroe');
  await expect(page.getByTestId('detail-replicas')).toContainText('Disparadas');
  await expect(page.getByTestId('detail-duration')).toContainText('Rondas media');
  await screenshot(page, 'detalle-picaro-bruto', testInfo);

  const decision = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  expect(decision).toMatchObject({
    experiment: 'EXP-003',
    engine: 'v2.0',
    catalogVersion: 'EXP-003-v2.0.0',
    seed: SEED,
    duels: 1000,
    scenario: { id: 'v2-corridor-8', initiative: 'hero' },
  });
  expect(decision.catalog.version).toBe('EXP-003-v2.0.0');
  expect(decision.catalog.roster).toHaveLength(4);
  expect(decision.matchups).toHaveLength(12);
  expect(decision).not.toHaveProperty('decidedAt');
  expect(decision).not.toHaveProperty('decided_at');

  const decisionAgain = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  expect(decisionAgain).toEqual(decision);

  await expect(page.getByTestId('export-summary')).toContainText(
    'catálogo EXP-003-v2.0.0',
  );
  await expect(page.getByTestId('export-summary')).toContainText('semilla 1017');
  await expect(page.getByTestId('export-copy')).toBeEnabled();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );
  const exportPath = artifactPath(
    testInfo,
    'exports',
    'v2-seed-1017-duels-1000.json',
  );
  await mkdir(dirname(exportPath), { recursive: true });
  await download.saveAs(exportPath);
  const written = JSON.parse(await readFile(exportPath, 'utf8')) as {
    engine: string;
    catalogVersion: string;
    seed: number;
    duels: number;
    scenario: { id: string };
    catalog: { version: string; roster: unknown[] };
    matchups: unknown[];
    decidedAt?: string;
  };
  expect(written.engine).toBe('v2.0');
  expect(written.catalogVersion).toBe('EXP-003-v2.0.0');
  expect(written.seed).toBe(SEED);
  expect(written.duels).toBe(1000);
  expect(written.scenario.id).toBe('v2-corridor-8');
  expect(written.catalog.version).toBe('EXP-003-v2.0.0');
  expect(written.catalog.roster).toHaveLength(4);
  expect(written.matchups).toHaveLength(12);
  expect(written.decidedAt).toBeUndefined();

  await expect(page.getByTestId('export-status')).toContainText(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );
  await screenshot(page, 'export-reproducible', testInfo);
  expect(errors).toEqual([]);
});

import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import type {
  BenchOverrides,
  EnemyDiagnosis,
} from '../../experiments/EXP-003-mesa-combate/src/v2/bench';
import type {
  MatchupResult,
  MeasurementPayload,
} from '../../experiments/EXP-003-mesa-combate/src/v2/measure';
import type { Catalog } from '../../experiments/EXP-003-mesa-combate/src/v2/types';
import type { V2ExperimentApi } from '../../experiments/EXP-003-mesa-combate/src/ui';
import { artifactPath } from './artifacts';

/**
 * E2E del banco de ajuste de EXP-003 (REQ-028, TASK-0068).
 *
 * Todo el estado se lee de `window.__experiment` y del DOM de la página real.
 * El recálculo del banco es diferido: se espera al texto de `bench-status` o al
 * propio estado, nunca con esperas de reloj real.
 */

const SEED = 1017;
const DUELS = 1000;
const MARGIN_PP = 5;
const HEROES = ['guerrero', 'picaro', 'mago', 'clerigo'] as const;
const ENEMIES = ['centinela', 'bruto', 'cobarde'] as const;
const GUIDE_TARGETS = { centinela: 75, cobarde: 85, bruto: 30 } as const;

const VIEWPORTS = [
  { label: '1280x720', width: 1280, height: 720 },
  { label: '900x700', width: 900, height: 700 },
] as const;

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
  await page.goto(`/experiments/EXP-003-mesa-combate/?test=1&seed=${SEED}`);
  await page.waitForFunction(() => Boolean(window.__experiment));
}

async function readResults(page: Page): Promise<MeasurementPayload> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getResults();
  });
}

async function readDiagnosis(
  page: Page,
): Promise<ReadonlyArray<EnemyDiagnosis>> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDiagnosis();
  });
}

async function readTargets(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return { ...api.getTargets() };
  });
}

async function readOverrides(page: Page): Promise<BenchOverrides> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getOverrides();
  });
}

async function readOverridesId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getOverridesId();
  });
}

async function readWorkingCatalog(page: Page): Promise<Catalog> {
  return page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getWorkingCatalog();
  });
}

function benchStatus(page: Page): Promise<string> {
  return page
    .getByTestId('bench-status')
    .textContent()
    .then((text) => text ?? '');
}

async function waitForBenchStatus(page: Page, expected: string): Promise<void> {
  await expect.poll(() => benchStatus(page), { timeout: 10_000 }).toContain(
    expected,
  );
}

function byKey(
  matchups: ReadonlyArray<MatchupResult>,
): Map<string, MatchupResult> {
  return new Map(
    matchups.map((matchup) => [
      `${matchup.heroId}:${matchup.enemyId}`,
      matchup,
    ]),
  );
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const node of document.querySelectorAll<HTMLElement>('.table-scroll')) {
      node.scrollLeft = 0;
    }
  });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function viewportScreenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function screenshotElement(
  locator: Locator,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await locator.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
}

async function saveDownload(
  download: Download,
  testInfo: TestInfo,
  name: string,
): Promise<string> {
  const path = artifactPath(testInfo, 'exports', name);
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);
  return path;
}

/** Tabula hasta que el foco caiga en el campo pedido, sin esperas de reloj. */
async function tabToTestId(
  page: Page,
  testId: string,
  maxTabs = 80,
): Promise<void> {
  await page.getByTestId('experiment-title').click();
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.dataset.testid ?? '',
    );
    if (active === testId) return;
  }
  throw new Error(`No se alcanzó «${testId}» tabulando ${maxTabs} veces.`);
}

test('editar el PV de un enemigo recalcula solo sus cuatro filas', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const before = await readResults(page);
  const beforeByKey = byKey(before.matchups);
  expect(before.matchups).toHaveLength(12);

  await page.getByTestId('bench-adjust-guerrero-centinela').click();
  await expect(page.getByTestId('bench-editor-row-centinela')).toBeVisible();
  await expect(page.getByTestId('bench-editor-shared-centinela')).toContainText(
    'Guerrero, Pícaro, Mago, Clérigo',
  );

  const hpInput = page.getByTestId('bench-field-centinela-maxHp');
  await expect(hpInput).toHaveValue('6');
  await hpInput.fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');

  const after = await readResults(page);
  const afterByKey = byKey(after.matchups);
  const affected = HEROES.map((heroId) => `${heroId}:centinela`);
  const unaffected = HEROES.flatMap((heroId) =>
    ENEMIES.filter((enemyId) => enemyId !== 'centinela').map(
      (enemyId) => `${heroId}:${enemyId}`,
    ),
  );

  for (const key of affected) {
    expect(afterByKey.get(key), `fila ${key}`).not.toEqual(beforeByKey.get(key));
  }
  for (const key of unaffected) {
    expect(afterByKey.get(key), `fila ${key}`).toEqual(beforeByKey.get(key));
  }

  // El editor sigue abierto, conserva el valor y el foco no se ha perdido.
  await expect(page.getByTestId('bench-editor-row-centinela')).toBeVisible();
  await expect(page.getByTestId('bench-adjust-guerrero-centinela')).toHaveText(
    'Cerrar',
  );
  await expect(
    page.getByTestId('bench-adjust-guerrero-centinela'),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(hpInput).toHaveValue('30');
  expect(
    await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.dataset.testid ?? '',
    ),
  ).toBe('bench-field-centinela-maxHp');

  const catalog = await readWorkingCatalog(page);
  expect(catalog.bestiary.find((enemy) => enemy.id === 'centinela')?.maxHp).toBe(
    30,
  );
  const centinelaRate = after.matchups.find(
    (matchup) => matchup.heroId === 'guerrero' && matchup.enemyId === 'centinela',
  )?.heroWinRate;
  expect(centinelaRate).toBeDefined();
  const formattedRate = `${(centinelaRate ?? 0).toFixed(1).replace('.', ',')} %`;
  await expect(
    page.getByTestId('bench-diagnosis-row-guerrero-centinela'),
  ).toContainText(`real ${formattedRate}`);
  await expect(page.getByTestId('bench-row-real-guerrero-centinela')).toHaveText(
    formattedRate,
  );
  // El objetivo sigue en la guía 75 y el diagnóstico no se inventa un 4-de-4.
  await expect(page.getByTestId('bench-four-of-four-centinela')).not.toHaveText(
    '4/4 dentro',
  );

  await screenshot(page, 'enemigo-pv-editor-abierto', testInfo);
  expect(errors).toEqual([]);
});

test('cambiar el objetivo actualiza delta y 4-de-4 y se restaura a la guía', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);

  const targetInput = page.getByTestId('bench-target-centinela');
  const four = page.getByTestId('bench-four-of-four-centinela');
  const delta = page.getByTestId('bench-row-delta-guerrero-centinela');

  await expect(targetInput).toHaveValue(String(GUIDE_TARGETS.centinela));
  await expect(four).not.toHaveText('4/4 dentro');
  const beforeDelta = ((await delta.textContent()) ?? '').trim();
  expect(beforeDelta).toMatch(/pp$/);

  await targetInput.fill('100');
  await expect(four).toHaveText('4/4 dentro');
  await expect(delta).not.toHaveText(beforeDelta);
  await expect(
    page.getByTestId('bench-row-state-guerrero-centinela'),
  ).toHaveText('dentro');
  for (const heroId of HEROES) {
    await expect(
      page.getByTestId(`bench-diagnosis-row-${heroId}-centinela`),
    ).toContainText('dentro');
  }

  const diagnosis = await readDiagnosis(page);
  const centinela = diagnosis.find((entry) => entry.enemyId === 'centinela');
  expect(centinela?.target).toBe(100);
  expect(centinela?.fourOfFour).toBe(true);
  expect(centinela?.rows).toHaveLength(4);
  expect(
    centinela?.rows.every((row) => Math.abs(row.delta) <= MARGIN_PP),
  ).toBe(true);
  expect(await readTargets(page)).toEqual({ ...GUIDE_TARGETS, centinela: 100 });
  await expect(page.getByTestId('export-summary')).toContainText(
    'Centinela 100 %',
  );

  await page.getByTestId('bench-target-reset-centinela').click();
  await expect(targetInput).toHaveValue(String(GUIDE_TARGETS.centinela));
  await expect(page.getByTestId('bench-guide-centinela')).toHaveText(
    'guía 75 %',
  );
  await expect(four).not.toHaveText('4/4 dentro');
  await expect(delta).toHaveText(beforeDelta);
  expect(await readTargets(page)).toEqual(GUIDE_TARGETS);
  const restored = (await readDiagnosis(page)).find(
    (entry) => entry.enemyId === 'centinela',
  );
  expect(restored?.target).toBe(GUIDE_TARGETS.centinela);
  expect(restored?.fourOfFour).toBe(false);

  await screenshot(page, 'objetivo-4-de-4-restaurado', testInfo);
  expect(errors).toEqual([]);
});

test('editar el daño de un arma recalcula solo las filas de sus portadores', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const before = await readResults(page);
  const beforeByKey = byKey(before.matchups);

  await expect(page.getByTestId('bench-weapon-users-espada')).toHaveText(
    'Guerrero, Centinela',
  );
  await expect(page.getByTestId('bench-weapon-users-hacha')).toHaveText('Bruto');

  const damage = page.getByTestId('bench-weapon-espada-damage');
  await expect(damage).toHaveValue('3');
  await damage.fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');

  const after = await readResults(page);
  const afterByKey = byKey(after.matchups);
  const affected = [
    'guerrero:centinela',
    'guerrero:bruto',
    'guerrero:cobarde',
    'picaro:centinela',
    'mago:centinela',
    'clerigo:centinela',
  ];
  const unaffected = [
    'picaro:bruto',
    'picaro:cobarde',
    'mago:bruto',
    'mago:cobarde',
    'clerigo:bruto',
    'clerigo:cobarde',
  ];

  for (const key of affected) {
    expect(afterByKey.get(key), `fila ${key}`).not.toEqual(beforeByKey.get(key));
  }
  for (const key of unaffected) {
    expect(afterByKey.get(key), `fila ${key}`).toEqual(beforeByKey.get(key));
  }
  expect(after.seed).toBe(SEED);
  expect(after.duels).toBe(DUELS);

  await screenshotElement(
    page.locator('.weapons-block'),
    'armas-espada-editada',
    testInfo,
  );

  await page.getByTestId('bench-weapon-reset-espada').click();
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  expect(await readResults(page)).toEqual(before);
  await expect(damage).toHaveValue('3');
  expect(await readOverrides(page)).toEqual({ enemies: {}, weapons: {} });

  expect(errors).toEqual([]);
});

test('reset por enemigo y global devuelven la base y quitan los overrides del export', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  const base = await readResults(page);
  const emptyId = await readOverridesId(page);

  // Reset por enemigo tras editar su PV.
  await page.getByTestId('bench-adjust-guerrero-centinela').click();
  const hpInput = page.getByTestId('bench-field-centinela-maxHp');
  await hpInput.fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  const editedId = await readOverridesId(page);
  expect(editedId).not.toBe(emptyId);
  await expect(page.getByTestId('export-summary')).toContainText(
    `overridesId ${editedId}`,
  );

  await page.getByTestId('bench-enemy-reset-centinela').click();
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  expect(await readResults(page)).toEqual(base);
  expect(await readOverrides(page)).toEqual({ enemies: {}, weapons: {} });
  expect(await readOverridesId(page)).toBe(emptyId);
  await expect(page.getByTestId('export-summary')).toContainText(
    `overridesId ${emptyId}`,
  );
  await expect(page.getByTestId('bench-target-centinela')).toHaveValue('75');
  await expect(hpInput).toHaveValue('6');

  // Ensuciar enemigo, arma y objetivo, y restablecer todo el banco.
  await hpInput.fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');
  await page.getByTestId('bench-weapon-espada-damage').fill('8');
  await waitForBenchStatus(page, 'Recalculado: 6 filas afectadas.');
  await page.getByTestId('bench-target-cobarde').fill('60');
  await expect(page.getByTestId('export-summary')).toContainText(
    'Cobarde 60 %',
  );
  const dirty = await readOverrides(page);
  expect(Object.keys(dirty.enemies)).toContain('centinela');
  expect(Object.keys(dirty.weapons)).toContain('espada');

  await page.getByTestId('bench-reset-all').click();
  await waitForBenchStatus(page, 'Banco restablecido');
  expect(await readResults(page)).toEqual(base);
  expect(await readOverrides(page)).toEqual({ enemies: {}, weapons: {} });
  expect(await readTargets(page)).toEqual(GUIDE_TARGETS);
  await expect(page.getByTestId('bench-target-cobarde')).toHaveValue('85');
  await expect(page.getByTestId('bench-four-of-four-cobarde')).not.toHaveText(
    '4/4 dentro',
  );

  const resetDecision = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  expect(resetDecision.overridesId).toBe(emptyId);
  expect(resetDecision.targets).toEqual(GUIDE_TARGETS);
  expect(
    resetDecision.catalog.bestiary.find((enemy) => enemy.id === 'centinela')
      ?.maxHp,
  ).toBe(6);

  // La descarga base conserva el nombre histórico y no anuncia overrides.
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'EXP-003-v2.0-seed-1017-duels-1000.json',
  );
  const path = await saveDownload(download, testInfo, 'bench-base.json');
  const written = JSON.parse(await readFile(path, 'utf8')) as {
    overrides: unknown;
    targets: unknown;
    catalog: { bestiary: ReadonlyArray<{ id: string; maxHp: number }> };
    matchups: unknown;
  };
  expect(written.overrides).toEqual({ enemies: {}, weapons: {} });
  expect(written.targets).toEqual(GUIDE_TARGETS);
  expect(
    written.catalog.bestiary.find((enemy) => enemy.id === 'centinela')?.maxHp,
  ).toBe(6);
  expect(written.matchups).toEqual(base.matchups);

  await screenshot(page, 'reset-global-base', testInfo);
  expect(errors).toEqual([]);
});

test('el export incluye catálogo ajustado, objetivos, diagnóstico y overridesId deterministas', async ({
  page,
}, testInfo) => {
  const errors = trackConsoleErrors(page);
  await openExperiment(page);
  await expect(page.locator('.test-badge')).toHaveText('modo test determinista');

  await page.getByTestId('bench-adjust-guerrero-centinela').click();
  await page.getByTestId('bench-field-centinela-maxHp').fill('30');
  await waitForBenchStatus(page, 'Recalculado: 4 filas afectadas.');

  const first = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  const second = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  expect(JSON.stringify(second)).toBe(JSON.stringify(first));

  const id = await readOverridesId(page);
  expect(first.overridesId).toBe(id);
  expect(id).toMatch(/^[0-9a-f]{8}$/);
  expect(first.overrides).toEqual({
    enemies: { centinela: { maxHp: 30 } },
    weapons: {},
  });
  expect(first.targets).toEqual(GUIDE_TARGETS);
  expect(first.seed).toBe(SEED);
  expect(first.duels).toBe(DUELS);
  expect(first.engine).toBe('v2.0');
  expect(first).not.toHaveProperty('decidedAt');

  expect(first.catalog.version).toBe('EXP-003-v2.0.0');
  expect(
    first.catalog.bestiary.find((enemy) => enemy.id === 'centinela')?.maxHp,
  ).toBe(30);

  expect(first.diagnosis).toHaveLength(3);
  for (const entry of first.diagnosis) {
    expect(entry.rows).toHaveLength(4);
    expect(entry.total).toBe(4);
    expect(entry.margin).toBe(MARGIN_PP);
    expect(entry.target).toBe(
      GUIDE_TARGETS[entry.enemyId as keyof typeof GUIDE_TARGETS],
    );
  }
  expect(first.matchups).toHaveLength(12);

  const snapshot = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.snapshot();
  });
  expect(snapshot.overridesId).toBe(id);
  expect(snapshot.targets).toEqual(first.targets);
  expect(snapshot.diagnosis).toEqual(first.diagnosis);

  // Determinismo: la misma semilla y catálogo reproducen el mismo estado.
  const rerun = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.runAll();
  });
  const stored = await readResults(page);
  expect(rerun).toEqual(stored);
  expect(rerun.seed).toBe(SEED);
  expect(rerun.matchups).toEqual(first.matchups);
  const again = await page.evaluate(() => {
    const api = window.__experiment as unknown as V2ExperimentApi;
    return api.getDecision();
  });
  expect(JSON.stringify(again)).toBe(JSON.stringify(first));

  // Descarga ajustada: nombre con overridesId y JSON idéntico al de la API.
  const fileName = `EXP-003-v2.0-seed-1017-duels-1000-bench-overrides-${id}.json`;
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
  const path = await saveDownload(
    download,
    testInfo,
    `bench-overrides-${id}.json`,
  );
  const written = JSON.parse(await readFile(path, 'utf8')) as Record<
    string,
    unknown
  >;
  expect(written).toEqual(first);
  expect(written).not.toHaveProperty('decidedAt');
  await expect(page.getByTestId('export-status')).toContainText(fileName);
  await expect(page.getByTestId('export-summary')).toContainText(
    `overridesId ${id}`,
  );
  await expect(page.getByTestId('export-summary')).toContainText(
    'objetivos: Centinela 75 % · Bruto 30 % · Cobarde 85 %',
  );

  await screenshot(page, 'export-ajustado', testInfo);
  expect(errors).toEqual([]);
});

for (const viewport of VIEWPORTS) {
  test(`QA visual ${viewport.label}: editor, armas, sin desbordamiento y foco visible`, async ({
    page,
  }, testInfo) => {
    const errors = trackConsoleErrors(page);
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await openExperiment(page);

    await page.getByTestId('bench-adjust-guerrero-centinela').click();
    await expect(page.getByTestId('bench-editor-centinela')).toBeVisible();
    // Objetivo 100 deja las filas del Centinela dentro y las de Bruto fuera:
    // así la captura muestra ambos estados.
    await page.getByTestId('bench-target-centinela').fill('100');
    await expect(page.getByTestId('bench-four-of-four-centinela')).toHaveText(
      '4/4 dentro',
    );

    // Dentro/fuera se distingue por texto, no solo por color.
    await expect(
      page.getByTestId('bench-row-state-guerrero-centinela'),
    ).toHaveText('dentro');
    await expect(
      page.getByTestId('bench-row-state-guerrero-bruto'),
    ).toHaveText('fuera');
    await expect(
      page.getByTestId('bench-diagnosis-row-guerrero-centinela'),
    ).toContainText('dentro');
    await expect(
      page.getByTestId('bench-diagnosis-row-guerrero-bruto'),
    ).toContainText('fuera');
    await expect(page.getByTestId('bench-four-of-four-centinela')).toContainText(
      '/4',
    );
    await expect(page.getByTestId('bench-four-of-four-bruto')).toContainText(
      '/4',
    );

    const layout = await page.evaluate(() => {
      const innerWidth = window.innerWidth;
      const panels = [...document.querySelectorAll<HTMLElement>('.panel')].map(
        (panel) => {
          const rect = panel.getBoundingClientRect();
          return {
            id: panel.dataset.testid ?? panel.className,
            left: rect.left,
            right: rect.right,
          };
        },
      );
      const scroll = (selector: string) => {
        const node = document.querySelector<HTMLElement>(selector);
        return node
          ? { scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
          : null;
      };
      return {
        innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        panels,
        tableScroll: scroll('.matchup-panel .table-scroll'),
        weaponScroll: scroll('.weapons-block .table-scroll'),
      };
    });

    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    for (const panel of layout.panels) {
      expect(panel.left, `panel ${panel.id}`).toBeGreaterThanOrEqual(-1);
      expect(panel.right, `panel ${panel.id}`).toBeLessThanOrEqual(
        layout.innerWidth + 1,
      );
    }
    expect(layout.tableScroll).not.toBeNull();
    expect(layout.weaponScroll).not.toBeNull();
    if (viewport.width < 1180) {
      // La tabla de 18 columnas desborda por dentro de su propio scroll.
      expect(layout.tableScroll?.scrollWidth).toBeGreaterThan(
        layout.tableScroll?.clientWidth ?? 0,
      );
    }

    await screenshot(page, `qa-${viewport.label}-editor`, testInfo);
    await page.getByTestId('bench-editor-row-centinela').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      for (const node of document.querySelectorAll<HTMLElement>(
        '.matchup-panel .table-scroll',
      )) {
        node.scrollLeft = 0;
      }
    });
    await viewportScreenshot(
      page,
      `qa-${viewport.label}-editor-campo`,
      testInfo,
    );
    await screenshotElement(
      page.locator('.weapons-block'),
      `qa-${viewport.label}-armas`,
      testInfo,
    );

    // Foco visible al llegar con teclado a un campo del editor.
    await tabToTestId(page, 'bench-field-centinela-maxHp');
    const focusStyle = await page
      .getByTestId('bench-field-centinela-maxHp')
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
        };
      });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);
    await expect(page.getByTestId('bench-field-centinela-maxHp')).toBeFocused();
    await viewportScreenshot(page, `qa-${viewport.label}-foco`, testInfo);

    expect(errors).toEqual([]);
  });
}

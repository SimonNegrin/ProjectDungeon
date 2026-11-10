import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BESTIARY } from '../../src/game/bestiary';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  settle,
  snapshot as readSnapshot,
} from './support';
import {
  TEST_SEED_URL,
  detectionState,
  loadState,
  openGame,
} from './perception-fixtures';

test.use({ viewport: { width: 1280, height: 720 } });

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
}

test('TASK-0038: "!", aviso de alarma, radios F1 y snapshot de percepción', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await openGame(page, TEST_SEED_URL);
  const initial = await loadState(page, detectionState());

  // Sin F1 no hay radios ni overlay de percepción.
  await expect(page.getByTestId('perception-overlay')).toBeHidden();
  expect(await page.locator('[data-testid="debug-perception-radius"]').count()).toBe(0);
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(0);
  expect(initial.enemies.map((enemy) => enemy.id)).toEqual([
    'enemy-1',
    'enemy-2',
    'enemy-3',
    'enemy-4',
  ]);
  for (const enemy of initial.enemies) {
    expect(enemy).toEqual(
      expect.objectContaining({
        awareness: expect.stringMatching(/^(dormant|alert|returning)$/),
        fleeing: expect.any(Boolean),
        home: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        alertTurns: expect.any(Number),
        hasShouted: expect.any(Boolean),
      }),
    );
    expect(enemy.lastKnown === null || typeof enemy.lastKnown === 'object').toBe(true);
  }

  // Ruta determinista del fixture: el `MoveTo` a (4,2) cruza la visión del bruto
  // en el paso (3,2) y termina fuera de su línea de visión.
  const detection = await page.evaluate(() => {
    const result = window.__game!.dispatch({
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 4, y: 2 },
    });
    const message = document.querySelector<HTMLElement>('[data-testid="hud-message"]');
    return {
      events: result.events.map((event) => event.type),
      markersBeforeSettle: document.querySelectorAll('[data-testid="spot-marker"]').length,
      message: message?.textContent ?? '',
      messageHidden: message?.hidden ?? true,
    };
  });

  expect(detection.events).toContain('EnemySpotted');
  expect(detection.events).toContain('AlarmRaised');
  // El "!" no se adelanta al paso: aparece al llegar el evento en la animación.
  expect(detection.markersBeforeSettle).toBe(0);
  // El aviso de alarma se muestra al llegar su cue, no al despachar.
  expect(detection.message).toBe('');
  expect(detection.messageHidden).toBe(true);
  await advanceToCue(page, 'alarm');
  const alarmNotice = await page.evaluate(() => {
    const message = document.querySelector<HTMLElement>('[data-testid="hud-message"]');
    return {
      message: message?.textContent ?? '',
      messageHidden: message?.hidden ?? true,
    };
  });
  expect(alarmNotice.message).toBe('¡Alarma! Te han visto');
  expect(alarmNotice.messageHidden).toBe(false);

  await settle(page);

  const marker = page.locator('[data-testid="spot-marker"][data-unit-id="enemy-3"]');
  await expect(marker).toBeVisible();
  await expect(marker).toHaveText('!');
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(1);

  const afterDetection = await readSnapshot(page);
  expect(afterDetection.enemies.find((enemy) => enemy.id === 'enemy-3')).toMatchObject({
    awareness: 'alert',
    hasShouted: true,
  });
  expect(await page.locator('[data-testid="debug-perception-radius"]').count()).toBe(0);
  await screenshot(page, 'normal', testInfo);

  // F1: radios de visión y alarma del bestiario, estado por enemigo en el overlay.
  await page.keyboard.press('F1');
  await expect(page.getByTestId('debug-overlay')).toBeVisible();
  await expect(page.getByTestId('perception-overlay')).toBeVisible();

  const radii = await page
    .locator('[data-testid="debug-perception-radius"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        unitId: (node as HTMLElement).dataset.unitId,
        kind: (node as HTMLElement).dataset.kind,
        radius: Number((node as HTMLElement).dataset.radius),
      })),
    );
  expect(radii).toHaveLength(initial.enemies.length * 2);
  expect(radii.filter((entry) => entry.kind === 'vision')).toEqual(
    initial.enemies.map((enemy) => ({
      unitId: enemy.id,
      kind: 'vision',
      radius: BESTIARY[enemy.enemyType!].vision,
    })),
  );
  expect(radii.filter((entry) => entry.kind === 'alarm')).toEqual(
    initial.enemies.map((enemy) => ({
      unitId: enemy.id,
      kind: 'alarm',
      radius: BESTIARY[enemy.enemyType!].alarm,
    })),
  );
  await expect(page.getByTestId('debug-content')).toContainText('Percepción enemy-3');
  await screenshot(page, 'debug-f1', testInfo);

  await page.keyboard.press('F1');
  await expect(page.getByTestId('perception-overlay')).toBeHidden();
  expect(await page.locator('[data-testid="debug-perception-radius"]').count()).toBe(0);

  // Snapshot profundo y de solo lectura: mutar home/lastKnown no altera lo vivo.
  const readonly = await page.evaluate(() => {
    const api = window.__game!;
    const fresh = api.snapshot();
    const enemy = fresh.enemies.find((candidate) => candidate.id === 'enemy-3')!;
    const home = { ...enemy.home };
    const lastKnown = enemy.lastKnown ? { ...enemy.lastKnown } : null;
    (enemy.home as { x: number }).x = 9999;
    if (enemy.lastKnown) (enemy.lastKnown as { x: number }).x = 9999;
    const after = api.snapshot().enemies.find((candidate) => candidate.id === 'enemy-3')!;
    return {
      keys: Object.keys(api).sort(),
      home,
      lastKnown,
      afterHome: after.home,
      afterLastKnown: after.lastKnown,
    };
  });
  expect(readonly.keys).toEqual(['advance', 'dispatch', 'setup', 'snapshot']);
  expect(readonly.afterHome).toEqual(readonly.home);
  expect(readonly.afterLastKnown).toEqual(readonly.lastKnown);

  // Reiniciar y cambiar semilla ocultan el "!" y vacían la memoria del host.
  await page.keyboard.press('r');
  await settle(page);
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(0);
  const afterRestart = await readSnapshot(page);
  expect(afterRestart.seed).toBe(279837264);
  expect(afterRestart.enemies.every((enemy) => enemy.awareness === 'dormant')).toBe(true);

  await page.keyboard.press('F2');
  await settle(page);
  expect(await page.locator('[data-testid="spot-marker"]').count()).toBe(0);
  const afterNewSeed = await readSnapshot(page);
  expect(afterNewSeed.seed).not.toBe(279837264);
  expect(consoleErrors).toEqual([]);
});

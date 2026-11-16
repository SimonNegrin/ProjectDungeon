import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { buildSaveFiles } from '../../src/game/save';
import type { PlayerConfig } from '../../src/game/config';
import { artifactPath } from './artifacts';
import {
  defeatAllEnemies,
  openState,
  settle,
  snapshot,
  WIN_GAME_SEED,
} from './support';

/**
 * QA E2E de la pantalla de resultado (REQ-031 R-020, T-015): Victoria o
 * Derrota con ronda, party y semilla; «Nueva partida» abre el paso 1; «Cargar
 * partida» reutiliza el cargador sin confirmación; ni pausa, ni guardado, ni
 * reinicio rápido. Deriva las aserciones del criterio, no de la vista.
 */

const SEED = 4242;
const LOAD_SEED = 271828182;

test.use({ viewport: { width: 1280, height: 720 } });

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeArtifact(
  testInfo: TestInfo,
  name: string,
  bytes: Uint8Array,
): Promise<string> {
  const path = artifactPath(testInfo, 'saves', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  return path;
}

function ended(status: 'victory' | 'defeat', players?: readonly PlayerConfig[]) {
  return {
    ...createInitialState({ seed: SEED, ...(players === undefined ? {} : { players }) }),
    status,
    round: 4,
  };
}

/** Abre el resultado y comprueba que no hay pausa ni atajos de juego vivos. */
async function expectResultOnly(page: Page): Promise<void> {
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-screen')).toHaveAttribute('role', 'dialog');
  await expect(page.getByTestId('result-screen')).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('result-new')).toBeFocused();
  await expect(page.getByTestId('result-new')).toHaveText('Nueva partida');
  await expect(page.getByTestId('result-load')).toHaveText('Cargar partida');
  await expect(page.getByRole('button', { name: /reiniciar/i })).toHaveCount(0);
  await expect(page.locator('[data-action="restart"]')).toHaveCount(0);
  await expect(page.getByTestId('result-screen').getByTestId('pause-save')).toHaveCount(0);
  await expect(page.getByTestId('result-screen').getByTestId('pause-load')).toHaveCount(0);
}

test('victoria: ronda, party, semilla y solo Nueva/Cargar', async ({ page }, testInfo) => {
  await openState(
    page,
    ended('victory', [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'mage', variant: 2, name: 'Bru' },
      { archetypeId: 'rogue', variant: 1, name: 'Cid' },
    ]),
    SEED,
  );

  await expectResultOnly(page);
  await expect(page.getByTestId('result-title')).toHaveText('Victoria');
  await expect(page.getByTestId('result-round')).toHaveText('Ronda 4');
  await expect(page.getByTestId('result-seed')).toHaveText(`Semilla ${SEED}`);
  await expect(page.getByTestId('result-players').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('result-player-1')).toContainText('Ana');
  await expect(page.getByTestId('result-player-1')).toContainText('Guerrero');
  await expect(page.getByTestId('result-player-2')).toContainText('Bru');
  await expect(page.getByTestId('result-player-2')).toContainText('Mago');
  await expect(page.getByTestId('result-player-3')).toContainText('Cid');
  await expect(page.getByTestId('result-player-3')).toContainText('Pícaro');
  await expect(page.getByTestId('result-announcement')).toContainText(
    `Victoria. Ronda 4. Semilla ${SEED}. Party: Ana (Guerrero), Bru (Mago), Cid (Pícaro).`,
  );
  await screenshot(page, testInfo, 'resultado-victoria');

  // Ni pausa, ni panel, ni reinicio: las teclas de juego no hacen nada.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await page.keyboard.press('r');
  await page.keyboard.press('n');
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  const after = await snapshot(page);
  expect(after.status).toBe('victory');
  expect(after.lastEvents.some((event) => event.type === 'GameRestarted')).toBe(false);

  await screenshot(page, testInfo, 'resultado-victoria-tras-teclas');
});

test('derrota: foco atrapado, anuncio y sin avance automático', async ({ page }, testInfo) => {
  await openState(page, ended('defeat'), SEED);

  await expectResultOnly(page);
  await expect(page.getByTestId('result-title')).toHaveText('Derrota');
  await expect(page.getByTestId('result-round')).toHaveText('Ronda 4');
  await expect(page.getByTestId('result-announcement')).toContainText('Derrota. Ronda 4.');
  await screenshot(page, testInfo, 'resultado-derrota');

  // `Tab` recorre las dos acciones y no se escapa del diálogo.
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('result-load')).toBeFocused();
  const outline = await page.getByTestId('result-load').evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe('none');
  expect(Number.parseFloat(outline.width)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('result-new')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('result-load')).toBeFocused();

  // La pantalla no avanza sola: sigue igual tras dejar pasar el reloj.
  await page.waitForTimeout(500);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  expect((await snapshot(page)).status).toBe('defeat');
});

test('Nueva partida abre el paso 1 en flujo normal sin reiniciar', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption('1');
  await page.getByTestId('step1-seed').fill(String(WIN_GAME_SEED));
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await page.getByTestId('player-next').click();
  await page.getByTestId('summary-start').click();
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.getByTestId('result-screen')).toBeHidden();

  await defeatAllEnemies(page);
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-title')).toHaveText('Victoria');
  await expect(page.getByTestId('result-seed')).toHaveText(`Semilla ${WIN_GAME_SEED}`);
  await screenshot(page, testInfo, 'victoria-flujo-normal');

  await page.getByTestId('result-new').click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeHidden();
  await expect(page.getByTestId('result-screen')).toBeHidden();
  // Abrir el paso 1 no reinicia ni rearma la partida anterior.
  expect((await snapshot(page)).status).toBe('victory');
  await screenshot(page, testInfo, 'nueva-desde-resultado');
});

test('seis jugadores: la party y la semilla se leen sin scroll', async ({ page }, testInfo) => {
  await openState(
    page,
    ended('victory', [
      { archetypeId: 'warrior', variant: 1, name: 'Ana' },
      { archetypeId: 'mage', variant: 2, name: 'Bru' },
      { archetypeId: 'rogue', variant: 1, name: 'Cid' },
      { archetypeId: 'cleric', variant: 2, name: 'Dee' },
      { archetypeId: 'archer', variant: 1, name: 'Eli' },
      { archetypeId: 'cook', variant: 2, name: 'Fay' },
    ]),
    SEED,
  );

  await expect(page.getByTestId('result-players').locator('li')).toHaveCount(6);
  await expect(page.getByTestId('result-player-6')).toContainText('Fay');
  await expect(page.getByTestId('result-player-6')).toContainText('Cocinero');
  const overflow = await page.getByTestId('result-screen').evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight + 1);
  const screen = await page.getByTestId('result-screen').boundingBox();
  const seed = await page.getByTestId('result-seed').boundingBox();
  expect(seed!.y + seed!.height).toBeLessThanOrEqual(screen!.y + screen!.height);
  await screenshot(page, testInfo, 'resultado-seis-jugadores');
});

test('Cargar partida reutiliza el cargador sin confirmación', async ({ page }, testInfo) => {
  await openState(page, ended('victory'), SEED);
  await expect(page.getByTestId('result-screen')).toBeVisible();

  const invalidPath = await writeArtifact(
    testInfo,
    'resultado-invalido.json',
    new TextEncoder().encode('{}'),
  );
  let chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('result-load').click();
  await (await chooserPromise).setFiles(invalidPath);
  const message = page.getByTestId('result-load-message');
  await expect(message).toBeVisible();
  await expect(message).toContainText('no es válida');
  await expect(page.getByTestId('result-screen')).toBeVisible();
  await expect(page.getByTestId('result-load')).toBeFocused();
  expect((await snapshot(page)).status).toBe('victory');
  await screenshot(page, testInfo, 'carga-invalida');

  const saveState = createInitialState({
    seed: LOAD_SEED,
    players: [{ archetypeId: 'mage', variant: 1, name: 'Bru' }],
  });
  const files = buildSaveFiles(saveState, {
    gameVersion: '0.1.0',
    createdAt: '2026-11-15T20:00:00Z',
  });
  const validPath = await writeArtifact(
    testInfo,
    'resultado-valida.json',
    new TextEncoder().encode(files.save),
  );
  chooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('result-load').click();
  await (await chooserPromise).setFiles(validPath);
  await expect(page.getByTestId('result-screen')).toBeHidden();
  await settle(page);
  const loaded = await snapshot(page);
  expect(loaded.status).toBe('playing');
  expect(loaded.rng.seed).toBe(LOAD_SEED);
  await expect(page.getByTestId('hud-player-name')).toHaveText('Bru');
  await screenshot(page, testInfo, 'carga-valida');
});

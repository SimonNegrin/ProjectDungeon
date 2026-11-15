import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  dispatchFrozen,
  openBspState,
  openState,
  snapshot,
} from './support';

const SEED = 279837264;

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function openPause(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-root')).toBeVisible();
}

test('TASK-0139: Esc abre la pausa con cinco acciones en orden, foco y ayuda derivada', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, SEED);

  // `R` ya no reinicia: el snapshot no cambia ni aparece `GameRestarted`.
  await page.keyboard.press('r');
  const afterR = await snapshot(page);
  expect(afterR.lastEvents.some((event) => event.type === 'GameRestarted')).toBe(
    false,
  );
  expect(afterR.players).toEqual(before.players);

  await openPause(page);
  const buttons = page.locator('[data-testid="pause-root"] .pause-button');
  await expect(buttons).toHaveCount(5);
  expect(
    await buttons.evaluateAll((elements) =>
      elements.map((element) => (element.textContent ?? '').trim()),
    ),
  ).toEqual([
    'Reanudar',
    'Nueva partida',
    'Cargar partida',
    'Guardar partida',
    'Controles',
  ]);
  await expect(page.getByTestId('pause-title')).toHaveText('Pausa');
  await expect(page.getByTestId('pause-menu')).toHaveAttribute(
    'aria-modal',
    'true',
  );
  await expect(page.getByTestId('pause-resume')).toBeFocused();
  await expect(page.getByTestId('pause-resume')).toHaveAttribute(
    'data-selected',
    'true',
  );

  // Guardar está disponible en la fase de personajes.
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  await expect(page.getByTestId('pause-save-reason')).toBeHidden();
  await screenshot(page, 'pause-root', testInfo);

  // Flechas y W/S mueven la selección y el foco; Tab recorre los botones.
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-new')).toBeFocused();
  await expect(page.getByTestId('pause-new')).toHaveAttribute(
    'data-selected',
    'true',
  );
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('pause-resume')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('pause-new')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('pause-resume')).toBeFocused();

  // Controles: filas desde el mapa único, sin inputs ni remapeo.
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-controls')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-controls-screen')).toBeVisible();
  await expect(page.getByTestId('pause-control-pause')).toContainText('Esc');
  await expect(page.getByTestId('pause-control-cursor-up')).toContainText('W/↑');
  await expect(page.getByTestId('pause-control-end-turn')).toContainText(
    'terminar turno',
  );
  await expect(page.locator('[data-testid="pause-menu"] input')).toHaveCount(0);
  await expect(page.locator('[data-testid="pause-remap"]')).toHaveCount(0);
  await screenshot(page, 'pause-controls', testInfo);

  // Esc vuelve a la raíz y devuelve el foco a la acción de origen.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-root')).toBeVisible();
  await expect(page.getByTestId('pause-controls')).toBeFocused();

  // Esc en la raíz reanuda sin tocar la partida.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await expect(page.getByTestId('frame')).toBeFocused();
  const resumed = await snapshot(page);
  expect(resumed.phase).toBe(before.phase);
  expect(resumed.turn).toBe(before.turn);
  expect(resumed.rng).toEqual(before.rng);
  expect(resumed.players).toEqual(before.players);
  expect(errors).toEqual([]);
});

test('TASK-0139: Nueva y Cargar piden confirmación y Esc vuelve a la raíz', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, SEED);
  await openPause(page);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-confirm-block')).toBeVisible();
  await expect(page.getByTestId('pause-confirm-text')).toContainText(
    'partida nueva',
  );
  await expect(page.getByTestId('pause-confirm-text')).toContainText(
    'progreso no guardado',
  );
  await screenshot(page, 'pause-confirm-new', testInfo);

  // Esc en el aviso vuelve a la raíz; la selección de origen se conserva.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-root')).toBeVisible();
  await expect(page.getByTestId('pause-new')).toBeFocused();

  // Confirmar Nueva cierra la pausa; en `?test=1` no hay pantalla de inicio.
  await page.keyboard.press('Enter');
  await page.getByTestId('pause-confirm').click();
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await expect(page.getByTestId('start-screen')).toBeHidden();
  const afterNew = await snapshot(page);
  expect(afterNew.status).toBe(before.status);
  expect(afterNew.turn).toBe(before.turn);
  expect(afterNew.players).toEqual(before.players);

  // Cargar: el aviso es distinto y confirmar solo cierra el aviso.
  await openPause(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-confirm-text')).toContainText(
    'Cargar una partida',
  );
  await expect(page.getByTestId('pause-confirm-text')).toContainText(
    'reemplazará',
  );
  await screenshot(page, 'pause-confirm-load', testInfo);
  await page.getByTestId('pause-confirm').click();
  await expect(page.getByTestId('pause-root')).toBeVisible();
  await expect(page.getByTestId('pause-load')).toBeFocused();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
});

test('TASK-0139: en fase enemiga Guardar está desactivado con motivo', async ({
  page,
}, testInfo) => {
  const base = createInitialState({ seed: SEED });
  const enemyPhase: GameState = { ...base, phase: 'enemy' };
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, enemyPhase, SEED);
  expect((await snapshot(page)).phase).toBe('enemy');

  await openPause(page);
  await expect(page.getByTestId('pause-save')).toBeDisabled();
  await expect(page.getByTestId('pause-save')).toHaveAttribute(
    'data-enabled',
    'false',
  );
  await expect(page.getByTestId('pause-save-reason')).toBeVisible();
  await expect(page.getByTestId('pause-save-reason')).toHaveText(
    'Solo se puede guardar en la fase de personajes.',
  );
  await screenshot(page, 'pause-save-disabled-enemy', testInfo);

  // Al seleccionar Guardar el foco va al motivo; Enter no activa otra acción.
  for (let step = 0; step < 3; step += 1) await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('pause-save')).toHaveAttribute(
    'data-selected',
    'true',
  );
  await expect(page.getByTestId('pause-save-reason')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pause-root')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
});

test('TASK-0139: la pausa congela animación y feedback e ignora el input de juego', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openBspState(page, SEED);
  // Congela el reloj en el mismo instante del dispatch y deja una animación
  // pendiente; `advance` manual permite medir sin esperas frágiles.
  await dispatchFrozen(page, { type: 'EndTurn' });
  const moving = await snapshot(page);
  expect(moving.animation.animating).toBe(true);

  await openPause(page);
  const paused = await snapshot(page);
  await expect(page.getByTestId('pause-save')).toBeDisabled();
  await expect(page.getByTestId('pause-save-reason')).toHaveText(
    'Espera a que termine la animación para guardar.',
  );
  await screenshot(page, 'pause-animation', testInfo);

  // Ni el reloj manual ni las teclas de juego alteran estado o presentación.
  await page.keyboard.press('d');
  await page.keyboard.press('f');
  await page.keyboard.press('e');
  const frozen = await page.evaluate(() => window.__game!.advance(5_000));
  expect(frozen.animation.step).toBe(paused.animation.step);
  expect(frozen.animation.position).toEqual(paused.animation.position);
  expect(frozen.players).toEqual(paused.players);
  expect(frozen.cursor).toEqual(paused.cursor);
  expect(frozen.animation.cues).toEqual(paused.animation.cues);

  // Reanudar continúa el mismo reloj y la animación termina.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  const finished = await page.evaluate(() => window.__game!.advance(1_000_000));
  expect(finished.animation.animating).toBe(false);
  expect(finished.players[0].mp).toBe(moving.players[0].mp);
});

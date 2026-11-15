import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { artifactPath } from './artifacts';

test.use({ viewport: { width: 1280, height: 720 } });

async function save(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  // Sin puntero sobre un control: la captura no mezcla hover con el estado real.
  await page.mouse.move(0, 0);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function openStart(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeVisible();
}

async function openTwoPlayers(page: Page, seed = '4242'): Promise<void> {
  await openStart(page);
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption('2');
  await page.getByTestId('step1-seed').fill(seed);
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('start-screen')).toBeHidden();
}

test('dos jugadores: roster, variante, nombre y aviso de party', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTwoPlayers(page);

  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 2');
  await expect(page.getByTestId('player-status')).toContainText('Jugador 1 de 2');
  await expect(
    page.getByTestId('player-archetypes').getByRole('button'),
  ).toHaveCount(9);
  await expect(page.getByTestId('player-variant-1')).toBeVisible();
  await expect(page.getByTestId('player-variant-2')).toBeVisible();
  await expect(page.getByTestId('player-archetype-warrior')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-variant-1')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-back')).toBeDisabled();
  await expect(page.getByTestId('player-archetype-warrior')).toBeFocused();
  await save(page, testInfo, 'jugador-1-1280x720');

  await page.getByTestId('player-archetype-mage').click();
  await expect(page.getByTestId('player-archetype-mage')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-archetype-warrior')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  // Cambiar de arquetipo devuelve la variante a 1.
  await expect(page.getByTestId('player-variant-1')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByTestId('player-variant-2').click();
  await expect(page.getByTestId('player-variant-2')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByTestId('player-name').fill('  Ana María ');
  await expect(page.getByTestId('player-name')).toHaveValue('  Ana María ');
  await save(page, testInfo, 'jugador-1-mago-1280x720');

  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 2 de 2');
  await expect(page.getByTestId('player-archetype-warrior')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-variant-1')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-name')).toHaveValue('');
  await expect(page.getByTestId('player-back')).toBeEnabled();
  await save(page, testInfo, 'jugador-2-1280x720');

  await page.getByTestId('player-back').click();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 2');
  await expect(page.getByTestId('player-archetype-mage')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-variant-2')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  // El nombre escrito se conserva y ya viene recortado al haber aceptado.
  await expect(page.getByTestId('player-name')).toHaveValue('Ana María');
  await expect(page.getByTestId('player-back')).toBeDisabled();

  await page.getByTestId('player-next').click();
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('player-status')).toContainText(
    'Party lista: 2 jugadores, semilla 4242.',
  );
  // El último «Siguiente» solo anuncia: no hay resumen, sesión ni mapa.
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 2 de 2');
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.getByTestId('player-cancel-dialog')).toBeHidden();
  await save(page, testInfo, 'party-lista-1280x720');

  expect(errors).toEqual([]);
});

test('reentrada tras cancelar no duplica los arquetipos', async ({ page }) => {
  await openTwoPlayers(page);

  await page.getByTestId('player-cancel').click();
  await page.getByTestId('player-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();

  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption('2');
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();

  const buttons = page.getByTestId('player-archetypes').getByRole('button');
  await expect(buttons).toHaveCount(9);
  const ids = await buttons.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-testid') ?? ''),
  );
  expect(new Set(ids).size).toBe(9);

  // El botón del nuevo montaje responde al modelo activo, no a uno destruido.
  await page.getByTestId('player-archetype-mage').click();
  await expect(page.getByTestId('player-archetype-mage')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-archetype-warrior')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 2');
});

test('recorrido solo con teclado y cancelación confirmada', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openStart(page);
  await expect(page.getByTestId('start-new')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('step1-players')).toBeFocused();
  await page.keyboard.press('2');
  await page.keyboard.press('Tab');
  await page.getByTestId('step1-seed').fill('777');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 2');
  await expect(page.getByTestId('player-archetype-warrior')).toBeFocused();
  await save(page, testInfo, 'jugador-1-900x700');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('player-cancel-dialog')).toBeVisible();
  await expect(page.getByTestId('player-cancel-dismiss')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('player-cancel-confirm')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('player-cancel-dismiss')).toBeFocused();
  await save(page, testInfo, 'confirmacion-900x700');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('player-cancel-dialog')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-archetype-warrior')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('player-cancel-dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('player-cancel-confirm')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();
  await save(page, testInfo, 'menu-tras-cancelar-900x700');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('step1-players')).toHaveValue('1');
  await expect(page.getByTestId('step1-seed')).not.toHaveValue('777');
  await save(page, testInfo, 'paso1-tras-cancelar-900x700');
});

test('?test=1 no monta las pantallas de inicio', async ({ page }) => {
  await page.goto('/?seed=1&test=1');
  await page.waitForFunction(() => Boolean(window.__game));
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
});

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';

test.use({ viewport: { width: 1280, height: 720 } });

async function save(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.mouse.move(0, 0);
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function openStart(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game!.snapshot().assetsLoaded,
  );
}

async function openPlayerScreen(
  page: Page,
  playerCount: number,
  seed = '4242',
): Promise<void> {
  await openStart(page);
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption(String(playerCount));
  await page.getByTestId('step1-seed').fill(seed);
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('start-screen')).toBeHidden();
}

async function openSummary(
  page: Page,
  playerCount: number,
  seed = '4242',
): Promise<void> {
  await openPlayerScreen(page, playerCount, seed);
  for (let index = 0; index < playerCount; index += 1) {
    await page.getByTestId('player-next').click();
  }
  await expect(page.getByTestId('party-summary')).toBeVisible();
}

async function snapshot(page: Page): Promise<GameSnapshot> {
  return page.evaluate(() => window.__game!.snapshot());
}

test('un jugador: fila, semilla de solo lectura y foco en Empezar', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openSummary(page, 1);

  const summary = page.getByTestId('party-summary');
  await expect(summary).toBeVisible();
  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.getByTestId('start-screen')).toBeHidden();

  const row = page.getByTestId('summary-player-1');
  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(
    1,
  );
  await expect(row.getByTestId('summary-player-number')).toHaveText('1');
  await expect(row.getByTestId('summary-player-archetype')).toHaveText('Guerrero');
  await expect(row.getByTestId('summary-player-variant')).toHaveText('Variante 1');
  await expect(row.getByTestId('summary-player-name')).toHaveText('Guerrero');

  const seed = page.getByTestId('summary-seed');
  await expect(seed).toContainText('4242');
  await expect(seed.locator('input')).toHaveCount(0);
  await expect(summary.locator('input, select, textarea')).toHaveCount(0);
  await expect(page.getByTestId('summary-start')).toBeFocused();
  await save(page, testInfo, 'resumen-1-jugador-1280x720');

  expect(errors).toEqual([]);
});

test('«Atrás» conserva valores y «Siguiente» vuelve sin duplicar filas', async ({
  page,
}) => {
  await openPlayerScreen(page, 1);
  await page.getByTestId('player-archetype-mage').click();
  await page.getByTestId('player-variant-2').click();
  await page.getByTestId('player-name').fill('Ana');
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();

  const row = page.getByTestId('summary-player-1');
  await expect(row.getByTestId('summary-player-archetype')).toHaveText('Mago');
  await expect(row.getByTestId('summary-player-variant')).toHaveText('Variante 2');
  await expect(row.getByTestId('summary-player-name')).toHaveText('Ana');

  await page.getByTestId('summary-back').click();
  await expect(page.getByTestId('party-summary')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 1');
  await expect(page.getByTestId('player-archetype-mage')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-variant-2')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-name')).toHaveValue('Ana');

  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(
    1,
  );
  await expect(page.getByTestId('summary-player-1')).toHaveCount(1);
  await expect(
    page.getByTestId('summary-player-1').getByTestId('summary-player-name'),
  ).toHaveText('Ana');
});

test('cancelación: aviso, desistimiento, Esc y vuelta al menú', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openSummary(page, 1);

  await page.getByTestId('summary-cancel').click();
  await expect(page.getByTestId('summary-cancel-dialog')).toBeVisible();
  await expect(page.getByTestId('summary-cancel-dismiss')).toBeFocused();
  await save(page, testInfo, 'confirmacion-900x700');

  await page.getByTestId('summary-cancel-dismiss').click();
  await expect(page.getByTestId('summary-cancel-dialog')).toBeHidden();
  await expect(page.getByTestId('party-summary')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('summary-cancel-dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('summary-cancel-confirm')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('summary-cancel-dialog')).toBeHidden();
  await expect(page.getByTestId('party-summary')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('summary-cancel-dialog')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('party-summary')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();
});

test('dos jugadores: Empezar arranca con la party y la semilla mostradas', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openPlayerScreen(page, 2);

  await page.getByTestId('player-archetype-mage').click();
  await page.getByTestId('player-variant-2').click();
  await page.getByTestId('player-name').fill('Ana');
  await page.getByTestId('player-next').click();
  await page.getByTestId('player-name').fill('Boro');
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();

  const first = page.getByTestId('summary-player-1');
  const second = page.getByTestId('summary-player-2');
  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(
    2,
  );
  await expect(first.getByTestId('summary-player-number')).toHaveText('1');
  await expect(first.getByTestId('summary-player-archetype')).toHaveText('Mago');
  await expect(first.getByTestId('summary-player-variant')).toHaveText('Variante 2');
  await expect(first.getByTestId('summary-player-name')).toHaveText('Ana');
  await expect(second.getByTestId('summary-player-number')).toHaveText('2');
  await expect(second.getByTestId('summary-player-archetype')).toHaveText('Guerrero');
  await expect(second.getByTestId('summary-player-variant')).toHaveText('Variante 1');
  await expect(second.getByTestId('summary-player-name')).toHaveText('Boro');
  await expect(page.getByTestId('summary-seed')).toContainText('4242');
  await save(page, testInfo, 'resumen-2-jugadores-1280x720');

  await page.getByTestId('summary-start').click();
  await expect(page.getByTestId('party-summary')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(
    () => window.__game!.snapshot().config?.players.length === 2,
  );

  const state = await snapshot(page);
  expect(state.config).toEqual({
    seed: 4242,
    players: [
      { archetypeId: 'mage', variant: 2, name: 'Ana' },
      { archetypeId: 'warrior', variant: 1, name: 'Boro' },
    ],
  });
  expect(state.seed).toBe(4242);
  expect(state.phase).toBe('player');
  expect(state.status).toBe('playing');
  expect(state.turn).toBe(1);
  expect(
    state.players.map((player) => ({
      archetypeId: player.archetypeId,
      variant: player.variant,
      name: player.nombre,
    })),
  ).toEqual([
    { archetypeId: 'mage', variant: 2, name: 'Ana' },
    { archetypeId: 'warrior', variant: 1, name: 'Boro' },
  ]);
  await save(page, testInfo, 'partida-2-jugadores-1280x720');

  expect(errors).toEqual([]);
});

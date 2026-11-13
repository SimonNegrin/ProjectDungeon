import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { ROSTER } from '../../src/game/roster';
import { artifactPath } from './artifacts';
import { openBspState, snapshot } from './support';

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('smoke: el personaje por defecto es el Guerrero y el HUD muestra nombre y arquetipo', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 1280, height: 720 });
  const start = await openBspState(page, 279837264);
  const player = start.players[0];
  const spawn = start.spawns?.party?.[0] ?? start.spawns?.player;

  expect(player.id).toBe('player-1');
  expect(player.nombre).toBe(ROSTER.warrior.name);
  expect(player.archetypeId).toBe('warrior');
  expect(player.stats).toEqual(ROSTER.warrior.stats);
  expect(player.stats.resistencia).toEqual({});
  expect(player.equipment).toEqual(ROSTER.warrior.equipment);
  expect(player.weapons).toEqual(['sword']);
  expect({ x: player.x, y: player.y }).toEqual(spawn);
  expect({ x: player.x, y: player.y }).not.toEqual({ x: 0, y: 0 });
  for (const enemy of start.enemies) {
    expect(enemy.archetypeId).toBeNull();
  }

  await expect(page.getByTestId('hud-player-name')).toHaveText(
    ROSTER.warrior.name,
  );
  await expect(page.getByTestId('hud-archetype')).toHaveText(
    ROSTER.warrior.name,
  );
  await expect(page.getByTestId('hud-stats')).toHaveText(
    '+1 habilidad · +1 fuerza · +1 defensa',
  );
  await expect(page.getByTestId('hud')).toBeVisible();

  // La captura conserva el HUD con nombre y arquetipo para la evidencia.
  expect(await snapshot(page)).toEqual(start);
  await screenshot(page, 'default-character-hud', testInfo);

  expect(consoleErrors).toEqual([]);
});

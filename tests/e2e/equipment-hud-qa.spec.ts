import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { artifactPath } from './artifacts';
import {
  approachEnemy,
  dispatchCommand,
  ensureMp,
  moveCursorTo,
  snapshot,
  walkTo,
} from './support';

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
}

async function openGame(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?seed=7');
  await page.waitForFunction(() => Boolean(window.__game));
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('arma en el mapa, pista de G y HUD de equipo', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);

  const initial = await snapshot(page);
  expect(initial.weapons).toHaveLength(2);
  const weapon = initial.weapons[0];

  await expect(page.getByTestId('hud-weapon')).toHaveText('Espada +3/+4');
  await expect(page.getByTestId('hud-shield')).toHaveText('Escudo +1');
  await expect(page.getByTestId('hud-armor')).toHaveText('Armadura +1');
  await expect(page.getByTestId('hud-modifiers')).toHaveText(
    '+1 acierto · +1 daño · +1 defensa',
  );
  await expect(page.getByTestId('weapon-hint')).toBeHidden();

  // Primero una casilla adyacente para que el arma se vea sin el jugador encima.
  const neighbor = [
    { x: weapon.x, y: weapon.y - 1 },
    { x: weapon.x + 1, y: weapon.y },
    { x: weapon.x, y: weapon.y + 1 },
    { x: weapon.x - 1, y: weapon.y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= initial.grid.width || cell.y >= initial.grid.height) return false;
    return initial.grid.tiles[cell.y * initial.grid.width + cell.x] === 'floor';
  });
  if (neighbor) {
    await walkTo(page, neighbor.x, neighbor.y);
    await screenshot(page, 'weapon-in-map', testInfo);
  }

  await walkTo(page, weapon.x, weapon.y);
  // La recogida cuesta 1 MP: si la caminata terminó sin MP, se espera al
  // siguiente turno sin moverse del tile del arma.
  await ensureMp(page, 1);
  await expect(page.getByTestId('weapon-hint')).toBeVisible();
  await expect(page.getByTestId('weapon-hint')).toContainText('G recoger');
  await screenshot(page, 'weapon-map-hint', testInfo);

  await page.keyboard.press('g');
  await page.evaluate(() => window.__game!.advance(1_000_000));
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  await expect(page.getByTestId('hud-weapon')).toHaveText('Hacha +2/+6');
  expect((await snapshot(page)).weapons).toHaveLength(1);
  await screenshot(page, 'weapon-picked', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('impacto, fallo y F1 con tiradas y vida', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);
  await approachEnemy(page);

  let hitCaptured = false;
  let missCaptured = false;
  let debugCaptured = false;

  for (let attackIndex = 0; attackIndex < 8; attackIndex += 1) {
    const before = await snapshot(page);
    if (before.status !== 'playing') break;
    const target = before.enemies[0];
    if (Math.max(
      Math.abs(before.players[0].x - target.x),
      Math.abs(before.players[0].y - target.y),
    ) > 1) {
      await approachEnemy(page);
    }

    const result = await dispatchCommand(page, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: target.id,
    });
    const attack = result.events.find((event) => event.type === 'AttackPerformed');
    if (!attack || attack.type !== 'AttackPerformed') break;

    await page.evaluate(() => window.__game!.advance(600));
    await expect(page.getByTestId('damage-feedback')).toHaveText(
      attack.hit ? `-${attack.damage}` : 'Fallo',
    );
    await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
      'data-result',
      attack.hit ? 'hit' : 'miss',
    );
    await expect(page.getByTestId('damage-feedback')).toBeVisible();
    await page.waitForTimeout(80);

    if (attack.hit && !hitCaptured) {
      await screenshot(page, 'attack-hit', testInfo);
      hitCaptured = true;
    }
    if (!attack.hit && !missCaptured) {
      await screenshot(page, 'attack-miss', testInfo);
      missCaptured = true;
    }

    if (attack.targetHp > 0 && !debugCaptured) {
      await moveCursorTo(page, target.x, target.y);
      await page.keyboard.press('F1');
      await expect(page.getByTestId('debug-overlay')).toBeVisible();
      const debugText =
        (await page.getByTestId('debug-content').textContent()) ?? '';
      expect(debugText).toContain('Equipo:');
      expect(debugText).toContain('Vida:');
      expect(debugText).toContain('Último ataque:');
      expect(debugText).toContain(`Enemigo bajo cursor: ${target.id}`);
      await screenshot(page, 'debug-f1', testInfo);
      await page.keyboard.press('F1');
      debugCaptured = true;
    }

    if (hitCaptured && missCaptured) break;
    if (attack.targetHp === 0) break;

    // Fase enemiga real: consume RNG y devuelve el turno al jugador.
    await dispatchCommand(page, { type: 'EndTurn' });
    await page.evaluate(() => window.__game!.advance(1_000_000));
  }

  expect(hitCaptured).toBe(true);
  expect(missCaptured).toBe(true);
  expect(debugCaptured).toBe(true);
  expect(consoleErrors).toEqual([]);
});

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { ARMORS, SHIELDS, WEAPONS, weaponDamage } from '../../src/game/equipment';
import type { Unit } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  approachEnemy,
  dispatchCommand,
  dispatchFrozen,
  ensureMp,
  moveCursorTo,
  openBspState,
  panelActionTestId,
  pressPanelAction,
  settle,
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
  await openBspState(page, 1);
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Zona de arma del HUD: nombre y stats separados con signo. */
async function expectHudWeapon(page: Page, unit: Unit): Promise<void> {
  const weaponId = unit.equipment.weapon?.itemId;
  if (weaponId === undefined) {
    await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();
    return;
  }
  const weapon = WEAPONS[weaponId as keyof typeof WEAPONS];
  await expect(page.getByTestId('hud-zone-weapon')).toBeVisible();
  await expect(page.getByTestId('hud-weapon')).toHaveText(weapon.name);
  await expect(page.getByTestId('hud-weapon-stats')).toHaveText(
    `${signed(weapon.accuracy)} acierto · ${signed(weaponDamage(weapon))} daño`,
  );
}

function shieldLabel(unit: Unit): string {
  const shieldId = unit.equipment.shield?.itemId;
  if (shieldId === undefined) return 'Sin escudo';
  const shield = SHIELDS[shieldId as keyof typeof SHIELDS];
  return `${shield.name} ${signed(shield.defense)}`;
}

function armorLabel(unit: Unit): string {
  const armorId = unit.equipment.armor?.itemId;
  if (armorId === undefined) return 'Sin armadura';
  const armor = ARMORS[armorId as keyof typeof ARMORS];
  return `${armor.name} ${signed(armor.armor)}`;
}

function statsLabel(unit: Unit): string {
  const { habilidad, fuerza, defensa } = unit.stats;
  return `${signed(habilidad)} habilidad · ${signed(fuerza)} fuerza · ${signed(defensa)} defensa`;
}

function floorNeighbor(
  snap: { readonly grid: { readonly width: number; readonly height: number; readonly tiles: readonly string[] } },
  x: number,
  y: number,
): { x: number; y: number } | undefined {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= snap.grid.width || cell.y >= snap.grid.height) return false;
    return snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor';
  });
}

/**
 * Prepara un centinela adyacente con el RNG de combate fijado: el primer ataque
 * falla y el segundo impacta, de modo que el test captura ambos feedbacks antes
 * de que el objetivo muera.
 */
async function openAdjacentSentinel(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  const base = await openBspState(page, 1);
  const sentinel = base.enemies.find((enemy) => enemy.enemyType === 'sentinel');
  if (!sentinel) throw new Error('La semilla debe colocar un centinela');
  const beside = floorNeighbor(base, sentinel.x, sentinel.y);
  if (!beside) throw new Error('El centinela debe tener una casilla libre al lado');
  await openBspState(page, 1, undefined, {
    player: beside,
    enemies: [sentinel],
    rng: { seed: 15, state: 0 },
  });
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('arma en el mapa, pista del panel y HUD de equipo', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openGame(page);

  const initial = await snapshot(page);
  expect(initial.weapons).toHaveLength(3);
  const weapon = initial.weapons[0];

  await expectHudWeapon(page, initial.players[0]);
  // Escudo y armadura ya no viven en la ficha izquierda (REQ-022 R-004); el
  // detalle del aliado bajo el cursor conserva la misma cobertura.
  const detail = page.getByTestId('hud-cursor-detail');
  await expect(detail).toContainText(shieldLabel(initial.players[0]));
  await expect(detail).toContainText(armorLabel(initial.players[0]));
  await expect(page.getByTestId('hud-stats')).toHaveText(
    statsLabel(initial.players[0]),
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
  await expect(page.getByTestId('weapon-hint')).toContainText('I panel');
  await expect(page.getByTestId('weapon-hint')).toContainText('en el suelo');
  await screenshot(page, 'weapon-map-hint', testInfo);

  const groundWeapon = initial.groundItems.find((item) => item.id === weapon.id);
  if (!groundWeapon) throw new Error('El arma debe existir como instancia del suelo');

  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await expect(
    page.locator('.inventory-column-right .inventory-section-title'),
  ).toHaveText('Suelo');
  await pressPanelAction(
    page,
    panelActionTestId('pickup', `ground:${groundWeapon.id}`),
  );
  await settle(page);
  await expect(
    page.locator('.inventory-column-right .inventory-section-title'),
  ).toHaveText('Suelo');
  await expect(page.locator('.inventory-ground-row')).toHaveCount(0);
  await expect(page.getByTestId('inventory-panel')).not.toContainText('No hay objetos');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await expect(page.getByTestId('weapon-hint')).toBeHidden();
  const afterPickup = await snapshot(page);
  // Recoger ya no auto-equipa: el arma queda en la mochila y el HUD no cambia.
  await expectHudWeapon(page, afterPickup.players[0]);
  expect(afterPickup.players[0].equipment.weapon?.itemId).toBe(
    initial.players[0].equipment.weapon?.itemId,
  );
  expect(afterPickup.weapons).toHaveLength(2);
  await screenshot(page, 'weapon-picked', testInfo);

  expect(consoleErrors).toEqual([]);
});

test('impacto, fallo y F1 con tiradas y vida', async ({ page }, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openAdjacentSentinel(page);

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

    const result = await dispatchFrozen(page, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: target.id,
    });
    const attack = result.events.find((event) => event.type === 'AttackPerformed');
    if (!attack || attack.type !== 'AttackPerformed') break;

    await advanceToCue(page, 'attack');
    await page.evaluate(() => window.__game!.advance(60));
    await expect(page.getByTestId('damage-feedback')).toHaveText(
      attack.hit ? `-${attack.damage}` : 'Fallo',
    );
    await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
      'data-result',
      attack.hit ? 'hit' : 'miss',
    );
    await expect(page.getByTestId('damage-feedback')).toBeVisible();

    if (attack.hit && !hitCaptured) {
      await screenshot(page, 'attack-hit', testInfo);
      hitCaptured = true;
    }
    if (!attack.hit && !missCaptured) {
      await screenshot(page, 'attack-miss', testInfo);
      missCaptured = true;
    }

    // Completa la presentación antes de mover el cursor con teclado.
    await page.evaluate(() => window.__game!.advance(1_000_000));

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

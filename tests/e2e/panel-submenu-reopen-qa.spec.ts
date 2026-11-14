import { expect, test, type Page } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { openState, selectPanelRow, snapshot } from './support';

const SEED = 279837264;

/**
 * Guerrero con espada, dos objetos en la mochila y un martillo en el suelo.
 * Sin enemigos: el caso de cambio de turno solo mide presentación del panel.
 */
function keyboardScenario(
  options: { readonly mp?: number } = {},
): GameState {
  const base = createInitialState({
    seed: SEED,
    generator: new BspMapGenerator(),
  });
  const template = base.players[0];
  const at = { x: template.x, y: template.y };
  return {
    ...base,
    players: [
      {
        ...template,
        mp: options.mp ?? template.maxMp,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: 'sword',
          armorId: null,
          shieldId: null,
        }),
        inventory: inventoryFromIds(template.id, ['axe', 'dagger']),
      },
    ],
    groundItems: [
      { id: 'item-test-ground-0', itemId: 'hammer', x: at.x, y: at.y },
    ],
    enemies: [],
  };
}

const menu = (page: Page) => page.getByTestId('inventory-submenu');

function menuOption(page: Page, kind: 'equip' | 'unequip' | 'pickup' | 'drop') {
  return page.locator(
    `[data-testid="inventory-submenu"] [data-kind="${kind}"][data-active="true"]`,
  );
}

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

/** Espera real a que la animación de presentación termine. No usa `settle()`. */
async function waitRealTime(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !window.__game!.snapshot().animation.animating,
    undefined,
    { timeout: 10_000 },
  );
}

async function selectedKey(page: Page): Promise<string> {
  return page
    .getByTestId('inventory-panel')
    .evaluate((panel) => (panel as HTMLElement).dataset.selectedKey ?? '');
}

async function activeKey(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    return active.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null;
  });
}

/**
 * Abre el submenú con `Enter`, comprueba que sigue visible en el instante y
 * vuelve a comprobarlo 150 ms después, con el bucle de feedback del host vivo.
 */
async function expectMenuPersists(page: Page): Promise<void> {
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
  await page.waitForTimeout(150);
  await expect(
    menu(page),
    'El submenú se cerró en un refresco posterior a su apertura',
  ).toBeVisible();
}

test('Enter reabre y mantiene el submenú tras recoger, equipar, desequipar y soltar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, keyboardScenario());
  await openPanel(page);

  // Recoger el martillo del suelo: la selección sigue a la instancia.
  await selectPanelRow(page, 'ground:item-test-ground-0');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
  await expect(menuOption(page, 'pickup')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await waitRealTime(page);
  const picked = await snapshot(page);
  expect(picked.groundItems).toHaveLength(0);
  expect(await selectedKey(page)).toBe('backpack:2');
  expect(await activeKey(page)).toBe('backpack:2');
  await expectMenuPersists(page);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();

  // Equipar desde la mochila.
  await page.keyboard.press('Enter');
  await expect(menuOption(page, 'equip')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await waitRealTime(page);
  const equipped = await snapshot(page);
  expect(equipped.players[0].equipment.weapon?.itemId).toBe('hammer');
  expect(await selectedKey(page)).toBe('slot:weapon');
  expect(await activeKey(page)).toBe('slot:weapon');
  await expectMenuPersists(page);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();

  // Desequipar: el martillo vuelve a la mochila.
  await page.keyboard.press('Enter');
  await expect(menuOption(page, 'unequip')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await waitRealTime(page);
  const unequipped = await snapshot(page);
  expect(unequipped.players[0].equipment.weapon).toBeNull();
  const backpackKey = await selectedKey(page);
  expect(backpackKey.startsWith('backpack:')).toBe(true);
  expect(await activeKey(page)).toBe(backpackKey);
  await expectMenuPersists(page);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();

  // Soltar desde la mochila: la fila reaparece en el suelo.
  await page.keyboard.press('Enter');
  await expect(menuOption(page, 'equip')).toHaveCount(1);
  await page.keyboard.press('ArrowDown');
  await expect(menuOption(page, 'drop')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await waitRealTime(page);
  const dropped = await snapshot(page);
  expect(dropped.groundItems.map((item) => item.id)).toEqual([
    'item-test-ground-0',
  ]);
  expect(await selectedKey(page)).toBe('ground:item-test-ground-0');
  expect(await activeKey(page)).toBe('ground:item-test-ground-0');
  await expectMenuPersists(page);
});

test('un estado nuevo sin cambios de selección ni opciones conserva el submenú', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, keyboardScenario());
  await openPanel(page);

  await selectPanelRow(page, 'ground:item-test-ground-0');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
  const before = await snapshot(page);
  const key = await selectedKey(page);
  expect(key).toBe('ground:item-test-ground-0');

  // Update real: nuevo estado por un comando legítimo, misma selección y
  // mismas opciones (con MP de sobra antes y después del refresco).
  await page.evaluate(() =>
    window.__game!.dispatch({ type: 'EndTurn' }),
  );
  await waitRealTime(page);

  const after = await snapshot(page);
  expect(after.players[0].mp).toBe(before.players[0].mp);
  expect(await selectedKey(page)).toBe(key);
  expect(await activeKey(page)).toBe(key);
  await expect(menuOption(page, 'pickup')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="inventory-submenu"] [data-kind="equip"]'),
  ).toHaveCount(1);
  await expect(
    menu(page),
    'Un update con estado nuevo cerró el submenú sin cambiar la selección',
  ).toBeVisible();
  await page.waitForTimeout(150);
  await expect(menu(page)).toBeVisible();

  // El teclado sigue operativo sobre el menú conservado.
  await page.keyboard.press('ArrowDown');
  await expect(menuOption(page, 'equip')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();
  expect(await activeKey(page)).toBe(key);
});

test('si cambia la disponibilidad de las opciones, el submenú se cierra', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, keyboardScenario({ mp: 0 }));
  await openPanel(page);

  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toBeVisible();
  await expect(menuOption(page, 'equip')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="inventory-submenu"] [data-kind="equip"]'),
  ).toHaveAttribute('aria-disabled', 'true');

  // El refresco de turno devuelve MP: las mismas acciones pasan a estar
  // disponibles, así que el menú abierto ya no representa lo que se puede
  // confirmar y debe cerrarse.
  await page.evaluate(() => window.__game!.dispatch({ type: 'EndTurn' }));
  await waitRealTime(page);
  await expect(menu(page)).toBeHidden();
  expect(await selectedKey(page)).toBe('backpack:0');
  expect(await activeKey(page)).toBe('backpack:0');
});

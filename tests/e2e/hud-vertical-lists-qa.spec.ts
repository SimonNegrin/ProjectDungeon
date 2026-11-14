import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  ITEMS,
  WEAPONS,
  weaponDamage,
  type ItemId,
  type WeaponId,
} from '../../src/game/equipment';
import { inventoryFromIds } from '../../src/game/inventory';
import {
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type GameState,
  type Unit,
} from '../../src/game/index';
import { itemStats } from '../../src/host/hud-detail';
import { artifactPath } from './artifacts';
import { moveCursorTo, openState, selectPanelRow, settle } from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;

const SWORD_TRAITS = [
  { id: 'filoso', description: 'Corta más' },
  { id: 'equilibrado', description: 'No pesa' },
] as const;
const AXE_TRAITS = [
  { id: 'brutal', description: 'Golpea fuerte' },
  { id: 'lento', description: 'Tarda más' },
] as const;

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function statLines(unit: Unit): string[] {
  const { habilidad, fuerza, defensa } = unit.stats;
  return [
    `${signed(habilidad)} habilidad`,
    `${signed(fuerza)} fuerza`,
    `${signed(defensa)} defensa`,
  ];
}

function itemLines(itemId: ItemId): string[] {
  return itemStats(ITEMS[itemId]).map((stat) => `${stat.value} ${stat.label}`);
}

function weaponLines(itemId: WeaponId): string[] {
  const item = WEAPONS[itemId];
  return [
    `${signed(item.accuracy ?? 0)} acierto`,
    `${signed(weaponDamage(item))} daño`,
  ];
}

function roomState(players: readonly Unit[]): GameState {
  return {
    grid: createRoomGrid(20, 20),
    players,
    enemies: [],
    groundItems: [],
    containers: [],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: createRng(SEED),
  };
}

function scenario(): { readonly state: GameState; readonly ally: Unit } {
  const warrior = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Ada',
  });
  const ally = createPlayerFromArchetype('rogue', {
    id: 'player-2',
    position: { x: 7, y: 5 },
    name: 'Boric',
  });
  const player: Unit = {
    ...warrior,
    inventory: inventoryFromIds(warrior.id, ['axe']),
  };
  return { state: roomState([player, ally]), ally };
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function injectTraits(
  page: Page,
  itemId: ItemId,
  traits: readonly { readonly id: string; readonly description: string }[],
): Promise<void> {
  await page.evaluate(
    async ({ id, next }) => {
      const moduleUrl = '/src/game/equipment.ts';
      const module = (await import(/* @vite-ignore */ moduleUrl)) as {
        ITEMS: Record<string, { traits: { id: string; description: string }[] }>;
      };
      module.ITEMS[id].traits = next.map((trait) => ({ ...trait }));
    },
    { id: itemId, next: traits },
  );
  await settle(page);
}

async function listTexts(page: Page, testId: string): Promise<string[]> {
  return page.getByTestId(testId).locator('li').allTextContents();
}

async function expectVerticalList(page: Page, testId: string): Promise<void> {
  const boxes = await page
    .getByTestId(testId)
    .locator('li')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }),
    );
  expect(boxes.length, `${testId} debe tener entradas`).toBeGreaterThan(0);
  boxes.forEach((box, index) => {
    if (index === 0) return;
    expect(
      box.top,
      `${testId}: cada entrada debe ocupar su línea`,
    ).toBeGreaterThanOrEqual(boxes[index - 1].bottom - 1);
  });
}

test('stats y traits de ambos HUD son listas verticales sin separadores', async ({
  page,
}, testInfo) => {
  const log: unknown[] = [];
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    const { state, ally } = scenario();
    await page.setViewportSize(viewport);
    await openState(page, state);
    await injectTraits(page, 'sword', SWORD_TRAITS);
    await injectTraits(page, 'axe', AXE_TRAITS);

    // HUD izquierdo: atributos, arma y traits, cada entrada en su línea.
    await expect(
      page.getByTestId('hud-stats').locator('li'),
    ).toHaveText(statLines(state.players[0]));
    await expect(page.getByTestId('hud-weapon-stats').locator('li')).toHaveText(
      weaponLines('sword'),
    );
    const swordTraits = SWORD_TRAITS.map(
      (trait) => `${trait.id}: ${trait.description}`,
    );
    await expect(page.getByTestId('hud-traits').locator('li')).toHaveText(
      swordTraits,
    );
    await expect(page.getByTestId('hud-player-hp')).toHaveText('20/20');
    await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
    await expect(page.getByTestId('hud-action')).toHaveText('2/2');
    for (const testId of ['hud-stats', 'hud-weapon-stats', 'hud-traits']) {
      for (const text of await listTexts(page, testId)) {
        expect(text).not.toContain('·');
      }
      await expectVerticalList(page, testId);
    }
    await screenshot(page, `hud-listas-${suffix}`, testInfo);
    log.push({
      scene: 'hud',
      viewport: suffix,
      stats: await listTexts(page, 'hud-stats'),
      weapon: await listTexts(page, 'hud-weapon-stats'),
      traits: await listTexts(page, 'hud-traits'),
    });

    // Ficha derecha con el panel abierto: seleccionado y equipado.
    await page.keyboard.press('i');
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    await selectPanelRow(page, 'backpack:0');
    await settle(page);
    await expect(
      page.getByTestId('hud-panel-selected-stats').locator('li'),
    ).toHaveText(itemLines('axe'));
    await expect(
      page.getByTestId('hud-panel-equipped-stats').locator('li'),
    ).toHaveText(itemLines('sword'));
    const axeTraits = AXE_TRAITS.map(
      (trait) => `${trait.id}: ${trait.description}`,
    );
    await expect(
      page.getByTestId('hud-panel-selected-traits').locator('li'),
    ).toHaveText(axeTraits);
    await expect(
      page.getByTestId('hud-panel-equipped-traits').locator('li'),
    ).toHaveText(swordTraits);
    for (const testId of [
      'hud-panel-selected-stats',
      'hud-panel-selected-traits',
      'hud-panel-equipped-stats',
      'hud-panel-equipped-traits',
    ]) {
      for (const text of await listTexts(page, testId)) {
        expect(text).not.toContain('·');
      }
      await expectVerticalList(page, testId);
    }
    await screenshot(page, `ficha-listas-${suffix}`, testInfo);
    log.push({
      scene: 'ficha',
      viewport: suffix,
      selected: await listTexts(page, 'hud-panel-selected-stats'),
      traits: await listTexts(page, 'hud-panel-selected-traits'),
      equipped: await listTexts(page, 'hud-panel-equipped-stats'),
      equippedTraits: await listTexts(page, 'hud-panel-equipped-traits'),
    });

    // Atributos del aliado en la ficha bajo el cursor.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();
    await moveCursorTo(page, ally.x, ally.y);
    await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
      'data-kind',
      'ally',
    );
    await expect(page.getByTestId('hud-cursor-title')).toHaveText(ally.nombre);
    await expect(
      page.getByTestId('hud-cursor-stats').locator('li'),
    ).toHaveText(statLines(ally));
    await expect(page.getByTestId('hud-cursor-rows')).not.toContainText(
      'Atributos',
    );
    for (const text of await listTexts(page, 'hud-cursor-stats')) {
      expect(text).not.toContain('·');
    }
    await expectVerticalList(page, 'hud-cursor-stats');
    await screenshot(page, `aliado-listas-${suffix}`, testInfo);
    log.push({
      scene: 'aliado',
      viewport: suffix,
      stats: await listTexts(page, 'hud-cursor-stats'),
    });
  }
  await writeLog(testInfo, 'listas-verticales.json', log);
});

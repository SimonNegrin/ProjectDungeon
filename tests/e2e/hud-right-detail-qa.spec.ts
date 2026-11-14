import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { ITEMS, type ItemId } from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  selectPanelRow,
  settle,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;

interface ScenarioOptions {
  readonly inventory?: readonly ItemId[];
  readonly weaponId?: ItemId | null;
}

/**
 * Estado de presentación con el equipo y la mochila pedidos. El objeto del
 * suelo queda bajo el jugador para poder comprobar el detalle del cursor.
 */
function scenario(options: ScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  return {
    ...base,
    players: [
      {
        ...template,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: options.weaponId === undefined ? 'sword' : options.weaponId,
          armorId: null,
          shieldId: null,
        }),
        inventory: inventoryFromIds(template.id, options.inventory ?? []),
      },
    ],
  };
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

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

function statTexts(page: Page, testId: string) {
  return page
    .getByTestId(testId)
    .locator('li')
    .evaluateAll((elements) => elements.map((element) => element.textContent ?? ''));
}

test('ficha de objeto: sprite, stats en vertical y dos secciones sin textos redundantes', async ({
  page,
}, testInfo) => {
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await openState(page, scenario({ inventory: ['axe'] }));
    await openPanel(page);
    await selectPanelRow(page, 'backpack:0');
    await settle(page);

    await expect(page.getByTestId('hud-panel-detail')).toBeVisible();
    const selected = page.getByTestId('hud-panel-selected');
    const equipped = page.getByTestId('hud-panel-equipped');
    await expect(selected).toBeVisible();
    await expect(equipped).toBeVisible();
    await expect(page.getByTestId('hud-panel-selected-label')).toBeHidden();
    await expect(page.getByTestId('hud-panel-equipped-label')).toHaveText(
      'Equipado',
    );
    await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
      ITEMS.axe.name,
    );
    await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText(
      ITEMS.sword.name,
    );

    // Una fila por stat, valor delante y sin rótulo «Stats».
    expect(await statTexts(page, 'hud-panel-selected-stats')).toEqual([
      '+2 Acierto',
      '+5 Daño',
    ]);
    expect(await statTexts(page, 'hud-panel-equipped-stats')).toEqual([
      '+3 Acierto',
      '+3 Daño',
    ]);
    const detailText = (await page.getByTestId('hud-panel-detail').innerText()) ?? '';
    expect(detailText).not.toMatch(/Stats|Seleccionado|Sin traits activos/);
    expect(detailText).not.toContain(ITEMS.axe.description);
    expect(detailText).not.toContain(ITEMS.sword.description);

    // Sin traits no queda texto ni hueco visible.
    await expect(page.getByTestId('hud-panel-selected-traits')).toBeHidden();
    await expect(page.getByTestId('hud-panel-equipped-traits')).toBeHidden();

    // Sprites del catálogo sobre items.png, a píxel entero escalado.
    for (const id of ['hud-panel-selected-sprite', 'hud-panel-equipped-sprite']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    const styles = await page.evaluate(() => {
      const read = (testId: string) => {
        const element = document.querySelector<HTMLElement>(
          `[data-testid="${testId}"]`,
        );
        if (!element) return null;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          backgroundImage: style.backgroundImage,
          backgroundPosition: style.backgroundPosition,
          imageRendering: style.imageRendering,
          width: box.width,
          height: box.height,
        };
      };
      const block = (testId: string) => {
        const element = document.querySelector<HTMLElement>(
          `[data-testid="${testId}"]`,
        );
        if (!element) return null;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderTopStyle: style.borderTopStyle,
          borderTopWidth: style.borderTopWidth,
          left: box.left,
          right: box.right,
        };
      };
      const right = document.querySelector<HTMLElement>(
        '[data-testid="hud-right"]',
      );
      const rightStyle = right ? getComputedStyle(right) : null;
      const rightBox = right?.getBoundingClientRect() ?? null;
      return {
        selectedSprite: read('hud-panel-selected-sprite'),
        equippedSprite: read('hud-panel-equipped-sprite'),
        selectedBlock: block('hud-panel-selected'),
        equippedBlock: block('hud-panel-equipped'),
        right: {
          backgroundColor: rightStyle?.backgroundColor ?? '',
          left: rightBox?.left ?? 0,
          right: rightBox?.right ?? 0,
        },
      };
    });

    for (const sprite of [styles.selectedSprite, styles.equippedSprite]) {
      expect(sprite).not.toBeNull();
      expect(sprite!.backgroundImage).toContain('/assets/32rogues/items.png');
      expect(sprite!.backgroundPosition).not.toBe('0% 0%');
      expect(sprite!.imageRendering).toBe('pixelated');
      expect(sprite!.width).toBeGreaterThan(0);
      expect(sprite!.width).toBeCloseTo(sprite!.height, 1);
    }

    // Dos secciones enmarcadas y con fondo elevado, distinto del HUD.
    for (const block of [styles.selectedBlock, styles.equippedBlock]) {
      expect(block).not.toBeNull();
      expect(block!.borderTopStyle).toBe('solid');
      expect(parseFloat(block!.borderTopWidth)).toBeGreaterThan(0);
      expect(block!.backgroundColor).not.toBe(styles.right.backgroundColor);
      expect(block!.left).toBeGreaterThanOrEqual(styles.right.left - 1);
      expect(block!.right).toBeLessThanOrEqual(styles.right.right + 1);
    }

    await screenshot(page, `ficha-dos-secciones-${suffix}`, testInfo);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();
  }
});

test('sin traits no queda texto y con traits se leen bajo los stats', async ({
  page,
}, testInfo) => {
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await openState(page, scenario({ inventory: ['axe'] }));
    await openPanel(page);
    await selectPanelRow(page, 'backpack:0');
    await settle(page);

    await expect(page.getByTestId('hud-panel-selected-traits')).toBeHidden();
    await expect(page.getByTestId('hud-panel-detail')).not.toContainText(
      'Sin traits activos',
    );
    await screenshot(page, `ficha-objeto-sin-traits-${suffix}`, testInfo);

    // Fixture de presentación: el catálogo de este corte no declara traits.
    await page.evaluate(async () => {
      const moduleUrl = '/src/game/equipment.ts';
      const module = (await import(/* @vite-ignore */ moduleUrl)) as {
        ITEMS: Record<string, unknown>;
      };
      const definition = module.ITEMS.axe as {
        traits: { id: string; description: string }[];
      };
      definition.traits = [{ id: 'filoso', description: 'Corta más' }];
    });
    // Reabrir la ficha fuerza a leer de nuevo el catálogo.
    await page.keyboard.press('Escape');
    await openPanel(page);
    await selectPanelRow(page, 'backpack:0');
    await settle(page);

    await expect(page.getByTestId('hud-panel-selected-traits')).toBeVisible();
    await expect(page.getByTestId('hud-panel-selected-traits')).toHaveText(
      'filoso: Corta más',
    );
    expect(await statTexts(page, 'hud-panel-selected-stats')).toEqual([
      '+2 Acierto',
      '+5 Daño',
    ]);
    await screenshot(page, `ficha-objeto-con-traits-${suffix}`, testInfo);
    await page.keyboard.press('Escape');
  }
});

test('el bloque vacío dice «Vacío» y no inventa sprite, stats ni traits', async ({
  page,
}, testInfo) => {
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await page.setViewportSize(viewport);
    await openState(page, scenario({ inventory: ['axe'], weaponId: null }));
    await openPanel(page);
    await selectPanelRow(page, 'backpack:0');
    await settle(page);

    await expect(page.getByTestId('hud-panel-selected-title')).toHaveText(
      ITEMS.axe.name,
    );
    await expect(page.getByTestId('hud-panel-equipped-title')).toHaveText(
      'Vacío',
    );
    await expect(page.getByTestId('hud-panel-equipped-label')).toHaveText(
      'Equipado',
    );
    await expect(page.getByTestId('hud-panel-equipped-sprite')).toBeHidden();
    await expect(page.getByTestId('hud-panel-equipped-stats')).toBeHidden();
    await expect(page.getByTestId('hud-panel-equipped-traits')).toBeHidden();
    expect(await statTexts(page, 'hud-panel-selected-stats')).toEqual([
      '+2 Acierto',
      '+5 Daño',
    ]);
    await screenshot(page, `ficha-hueco-vacio-${suffix}`, testInfo);
    await page.keyboard.press('Escape');
  }
});

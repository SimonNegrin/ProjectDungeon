import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import {
  EQUIPMENT_SILHOUETTES,
  EQUIPMENT_SLOTS,
  type ItemId,
} from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  panelActionTestId,
  pressPanelAction,
  settle,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;

interface ScenarioOptions {
  readonly inventory?: readonly ItemId[];
  readonly weaponId?: ItemId | null;
  readonly armorId?: ItemId | null;
  readonly shieldId?: ItemId | null;
}

/**
 * Guerrero con el equipo indicado. Sin armas ni armaduras los ocho huecos
 * quedan vacíos; con `weaponId` solo el arma está llena. El estado es
 * serializable y las operaciones siguen pasando por el motor.
 */
function warriorScenario(options: ScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  return {
    ...base,
    players: [
      {
        ...template,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: options.weaponId === undefined ? null : options.weaponId,
          armorId: options.armorId === undefined ? null : options.armorId,
          shieldId: options.shieldId === undefined ? null : options.shieldId,
        }),
        inventory: inventoryFromIds(template.id, options.inventory ?? []),
      },
    ],
    groundItems: [],
  };
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
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

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openScenario(
  page: Page,
  options: ScenarioOptions,
  viewport: { width: number; height: number } = VIEWPORTS[0],
): Promise<void> {
  await page.setViewportSize(viewport);
  await openState(page, warriorScenario(options));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settle(page);
}

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

interface SilhouetteSnapshot {
  readonly hidden: boolean;
  readonly ariaHidden: string | null;
  readonly pointerEvents: string;
  readonly display: string;
  readonly backgroundColor: string;
  readonly maskImage: string;
  readonly maskPosition: string;
  readonly rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

interface SlotSnapshot {
  readonly key: string;
  readonly empty: boolean;
  readonly rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly border: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly silhouette: SilhouetteSnapshot | null;
  readonly icon: { readonly hidden: boolean } | null;
}

function equipmentSlots(page: Page): Promise<SlotSnapshot[]> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!panel) throw new Error('Falta el panel de inventario');
    const rect = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
    };
    return [
      ...panel.querySelectorAll<HTMLElement>(
        '.inventory-column-equipment .inventory-slot',
      ),
    ].map((slot) => {
      const silhouette = slot.querySelector<HTMLElement>(
        '.inventory-slot-silhouette',
      );
      const icon = slot.querySelector<HTMLElement>('.inventory-slot-icon');
      const computed = silhouette ? getComputedStyle(silhouette) : null;
      const border = getComputedStyle(slot);
      return {
        key: slot.dataset.rowKey ?? '',
        empty: slot.dataset.empty === 'true',
        rect: rect(slot),
        border: {
          top: Number.parseFloat(border.borderTopWidth),
          right: Number.parseFloat(border.borderRightWidth),
          bottom: Number.parseFloat(border.borderBottomWidth),
          left: Number.parseFloat(border.borderLeftWidth),
        },
        silhouette:
          silhouette && computed
            ? {
                hidden: silhouette.hidden,
                ariaHidden: silhouette.getAttribute('aria-hidden'),
                pointerEvents: computed.pointerEvents,
                display: computed.display,
                backgroundColor: computed.backgroundColor,
                maskImage: computed.maskImage,
                maskPosition: silhouette.style.maskPosition,
                rect: rect(silhouette),
              }
            : null,
        icon: icon ? { hidden: icon.hidden } : null,
      };
    });
  });
}

function expectedMaskPosition(rect: { readonly x: number; readonly y: number }): string {
  // El navegador normaliza `-0` a `0` al devolver el estilo inline.
  const x = rect.x === 0 ? '0' : `-${rect.x}`;
  const y = rect.y === 0 ? '0' : `-${rect.y}`;
  return `calc(var(--ui-unit) * ${x}) calc(var(--ui-unit) * ${y})`;
}

function expectSameSlotGeometry(
  before: readonly SlotSnapshot[],
  after: readonly SlotSnapshot[],
  label: string,
): void {
  expect(after.map((slot) => slot.key), label).toEqual(
    before.map((slot) => slot.key),
  );
  for (const [index, slot] of after.entries()) {
    const previous = before[index];
    for (const key of ['left', 'top', 'width', 'height'] as const) {
      expect(
        Math.abs(slot.rect[key] - previous.rect[key]),
        `${label}: ${slot.key} ${key}`,
      ).toBeLessThanOrEqual(0.5);
    }
    expect(slot.border, `${label}: ${slot.key} bisel`).toEqual(previous.border);
  }
}

test('los ocho slots de Equipo vacíos muestran la silueta de su tabla y ninguna otra zona la pinta', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openScenario(page, {}, VIEWPORTS[0]);
  await openPanel(page);

  const slots = await equipmentSlots(page);
  expect(slots).toHaveLength(EQUIPMENT_SLOTS.length);
  expect(slots.map((slot) => slot.key)).toEqual(
    EQUIPMENT_SLOTS.map((slot) => `slot:${slot}`),
  );
  expect(slots.every((slot) => slot.empty)).toBe(true);

  for (const [index, slot] of slots.entries()) {
    const equipmentSlot = EQUIPMENT_SLOTS[index];
    const silhouette = slot.silhouette;
    expect(silhouette, `${equipmentSlot} sin capa de silueta`).not.toBeNull();
    expect(silhouette!.hidden, `${equipmentSlot} oculta`).toBe(false);
    expect(silhouette!.ariaHidden, equipmentSlot).toBe('true');
    expect(silhouette!.pointerEvents, equipmentSlot).toBe('none');
    expect(silhouette!.display, equipmentSlot).not.toBe('none');
    expect(silhouette!.backgroundColor, equipmentSlot).toBe(
      'rgb(110, 184, 168)',
    );
    expect(silhouette!.maskImage, equipmentSlot).toContain('items.png');
    expect(silhouette!.maskPosition, equipmentSlot).toBe(
      expectedMaskPosition(EQUIPMENT_SILHOUETTES[equipmentSlot].rect),
    );
    expect(silhouette!.rect.width, `${equipmentSlot} ancho`).toBeGreaterThan(0);
    expect(silhouette!.rect.height, `${equipmentSlot} alto`).toBeGreaterThan(0);
    // La capa cubre el área interior, no el bisel.
    expect(silhouette!.rect.left, `${equipmentSlot} borde izquierdo`).toBeCloseTo(
      slot.rect.left + slot.border.left,
      1,
    );
    expect(silhouette!.rect.top, `${equipmentSlot} borde superior`).toBeCloseTo(
      slot.rect.top + slot.border.top,
      1,
    );
    expect(silhouette!.rect.width, `${equipmentSlot} área interior`).toBeCloseTo(
      slot.rect.width - slot.border.left - slot.border.right,
      1,
    );
    expect(silhouette!.rect.height, `${equipmentSlot} área interior`).toBeCloseTo(
      slot.rect.height - slot.border.top - slot.border.bottom,
      1,
    );
  }

  // Bolsa y Suelo usan el mismo componente de slot, pero nunca la silueta.
  await expect(
    page.locator('.inventory-column-backpack .inventory-slot-silhouette'),
  ).toHaveCount(0);
  await expect(
    page.locator('.inventory-ground .inventory-slot-silhouette'),
  ).toHaveCount(0);
  expect(
    await page.locator('.inventory-slot-silhouette').count(),
  ).toBe(EQUIPMENT_SLOTS.length);

  await writeLog(testInfo, 'ocho-slots-vacios.json', {
    slots,
  });
  expect(consoleErrors).toEqual([]);
});

test('el slot lleno oculta la silueta, conserva el bisel y la silueta reaparece al desequipar', async ({
  page,
}, testInfo) => {
  const consoleErrors = watchConsole(page);
  await openScenario(
    page,
    { weaponId: 'sword', inventory: ['axe'] },
    VIEWPORTS[0],
  );
  await openPanel(page);

  const initial = await equipmentSlots(page);
  const weaponBefore = initial.find((slot) => slot.key === 'slot:weapon');
  expect(weaponBefore?.empty).toBe(false);
  expect(weaponBefore?.silhouette?.hidden, 'arma llena sin silueta').toBe(true);
  expect(weaponBefore?.icon?.hidden, 'arma llena con sprite').toBe(false);
  for (const slot of initial.filter((entry) => entry.key !== 'slot:weapon')) {
    expect(slot.silhouette?.hidden, `${slot.key} vacío con silueta`).toBe(false);
  }
  await screenshot(page, 'slot-lleno-equipado-1280x720', testInfo);

  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const equipped = await equipmentSlots(page);
  const weaponEquipped = equipped.find((slot) => slot.key === 'slot:weapon');
  expect(weaponEquipped?.empty).toBe(false);
  expect(weaponEquipped?.silhouette?.hidden, 'tras equipar no queda máscara').toBe(
    true,
  );
  expect(weaponEquipped?.icon?.hidden, 'tras equipar solo el sprite').toBe(false);
  expectSameSlotGeometry(initial, equipped, 'equipar');

  await pressPanelAction(page, panelActionTestId('unequip', 'slot:weapon'));
  await settle(page);
  const unequipped = await equipmentSlots(page);
  const weaponEmpty = unequipped.find((slot) => slot.key === 'slot:weapon');
  expect(weaponEmpty?.empty).toBe(true);
  expect(weaponEmpty?.silhouette?.hidden, 'al desequipar reaparece').toBe(false);
  expect(weaponEmpty?.icon?.hidden, 'hueco vacío sin sprite').toBe(true);
  expect(weaponEmpty?.silhouette?.maskPosition).toBe(
    expectedMaskPosition(EQUIPMENT_SILHOUETTES.weapon.rect),
  );
  expectSameSlotGeometry(initial, unequipped, 'desequipar');
  await screenshot(page, 'silueta-reaparece-1280x720', testInfo);

  await writeLog(testInfo, 'slot-lleno.json', {
    initial,
    equipped,
    unequipped,
  });
  expect(consoleErrors).toEqual([]);
});

test('capturas de los ocho slots vacíos y de un slot lleno a 900×700 y 1280×720', async ({
  page,
}, testInfo) => {
  const metrics: Array<Record<string, unknown>> = [];
  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;

    await openScenario(page, {}, viewport);
    await openPanel(page);
    const empty = await equipmentSlots(page);
    expect(empty).toHaveLength(EQUIPMENT_SLOTS.length);
    expect(empty.every((slot) => slot.silhouette?.hidden === false)).toBe(true);
    await screenshot(page, `ocho-slots-vacios-${suffix}`, testInfo);
    metrics.push({ viewport: suffix, state: 'ocho-slots-vacios', slots: empty });
    await page.keyboard.press('Escape');

    await openScenario(page, { weaponId: 'sword' }, viewport);
    await openPanel(page);
    const filled = await equipmentSlots(page);
    expect(
      filled.find((slot) => slot.key === 'slot:weapon')?.silhouette?.hidden,
    ).toBe(true);
    expect(
      filled
        .filter((slot) => slot.key !== 'slot:weapon')
        .every((slot) => slot.silhouette?.hidden === false),
    ).toBe(true);
    await screenshot(page, `un-slot-lleno-${suffix}`, testInfo);
    metrics.push({ viewport: suffix, state: 'un-slot-lleno', slots: filled });
    await page.keyboard.press('Escape');
  }
  await writeLog(testInfo, 'silhouettes-metrics.json', metrics);
});

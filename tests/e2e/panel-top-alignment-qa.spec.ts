import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { type ItemId } from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import {
  openState,
  panelActionTestId,
  pressPanelAction,
  selectPanelRow,
  settle,
} from './support';

const SEED = 279837264;
const FULL_BACKPACK: readonly ItemId[] = [
  'axe',
  'dagger',
  'knife',
  'hammer',
  'electric-sword',
  'arcane-dagger',
  'plate',
  'shield',
];
const FOUR_GROUND: readonly ItemId[] = ['axe', 'dagger', 'knife', 'hammer'];

function warriorScenario(
  inventory: readonly ItemId[] = FULL_BACKPACK,
): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  const at = { x: template.x, y: template.y };
  return {
    ...base,
    players: [
      {
        ...template,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: 'sword',
          armorId: 'armor',
          shieldId: 'shield',
        }),
        inventory: inventoryFromIds(template.id, inventory),
      },
    ],
    groundItems: FOUR_GROUND.map((itemId, index) => ({
      id: `item-test-ground-${index}`,
      itemId,
      x: at.x,
      y: at.y,
    })),
  };
}

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
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

async function openScenario(
  page: Page,
  viewport: { width: number; height: number },
  inventory: readonly ItemId[] = FULL_BACKPACK,
): Promise<void> {
  await page.setViewportSize(viewport);
  await openState(page, warriorScenario(inventory));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settle(page);
}

async function openPanel(page: Page): Promise<void> {
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface SlotRect {
  readonly key: string;
  readonly rect: Rect;
}

interface PanelLayout {
  readonly frame: Rect;
  readonly panel: Rect;
  readonly body: Rect;
  readonly columns: readonly Rect[];
  readonly columnRowGaps: readonly number[];
  readonly titles: readonly Rect[];
  readonly titleFontSizes: readonly number[];
  readonly equipmentFigure: Rect;
  readonly equipmentList: Rect;
  readonly backpackList: Rect;
  readonly groundList: Rect;
  readonly equipment: readonly SlotRect[];
  readonly backpack: readonly SlotRect[];
  readonly ground: readonly SlotRect[];
  readonly figure: {
    readonly rect: Rect;
    readonly ariaHidden: string | null;
    readonly tabIndex: string | null;
    readonly pointerEvents: string;
    readonly blocks: ReadonlyArray<{ readonly className: string; readonly rect: Rect }>;
  };
}

async function panelLayout(page: Page): Promise<PanelLayout> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    const frame = document.querySelector<HTMLElement>('[data-testid="frame"]');
    if (!panel || !frame) throw new Error('Falta el marco o el panel');
    const body = panel.querySelector<HTMLElement>('.inventory-panel-body');
    const figure = panel.querySelector<HTMLElement>('[data-testid="inventory-figure"]');
    if (!body || !figure) throw new Error('Falta el cuerpo o la figura');
    const rect = (element: Element): Rect => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const slots = (selector: string): SlotRect[] =>
      [...panel.querySelectorAll<HTMLElement>(`${selector} .inventory-slot`)].map(
        (slot) => ({ key: slot.dataset.rowKey ?? '', rect: rect(slot) }),
      );
    const columns = [...panel.querySelectorAll<HTMLElement>('.inventory-column')];
    return {
      frame: rect(frame),
      panel: rect(panel),
      body: rect(body),
      columns: columns.map(rect),
      columnRowGaps: columns.map((column) =>
        Number.parseFloat(getComputedStyle(column).rowGap),
      ),
      titles: [
        ...panel.querySelectorAll<HTMLElement>('.inventory-section-title'),
      ].map((title) => rect(title)),
      titleFontSizes: [
        ...panel.querySelectorAll<HTMLElement>('.inventory-section-title'),
      ].map((title) => Number.parseFloat(getComputedStyle(title).fontSize)),
      equipmentFigure: rect(
        panel.querySelector<HTMLElement>('.inventory-equipment-figure')!,
      ),
      equipmentList: rect(
        panel.querySelector<HTMLElement>('.inventory-equipment')!,
      ),
      backpackList: rect(panel.querySelector<HTMLElement>('.inventory-backpack')!),
      groundList: rect(panel.querySelector<HTMLElement>('.inventory-ground')!),
      equipment: slots('.inventory-equipment'),
      backpack: slots('.inventory-backpack'),
      ground: slots('.inventory-ground'),
      figure: {
        rect: rect(figure),
        ariaHidden: figure.getAttribute('aria-hidden'),
        tabIndex: figure.getAttribute('tabindex'),
        pointerEvents: getComputedStyle(figure).pointerEvents,
        blocks: [...figure.querySelectorAll<HTMLElement>('.inventory-figure-block')].map(
          (block) => ({
            className: block.className,
            rect: rect(block),
          }),
        ),
      },
    };
  });
}

function expectRectEqual(actual: Rect, expected: Rect, label: string): void {
  for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
    expect(
      Math.abs(actual[edge] - expected[edge]),
      `${label}: ${edge} cambió (${actual[edge]} vs ${expected[edge]})`,
    ).toBeLessThanOrEqual(0.6);
  }
}

function expectTopAligned(layout: PanelLayout, label: string): void {
  expect(layout.columns, `${label}: columnas`).toHaveLength(3);
  expect(layout.titles, `${label}: títulos`).toHaveLength(3);

  const titleTop = layout.titles[0].top;
  const titleBottom = layout.titles[0].bottom;
  for (const [index, title] of layout.titles.entries()) {
    expect(
      Math.abs(title.top - titleTop),
      `${label}: título ${index + 1} desalineado arriba`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(title.bottom - titleBottom),
      `${label}: título ${index + 1} de otra altura`,
    ).toBeLessThanOrEqual(1);
    expect(
      layout.columns[index].top,
      `${label}: columna ${index + 1} no arranca en el mismo borde`,
    ).toBeLessThanOrEqual(title.top + 1);
    expect(
      Math.abs(
        layout.titleFontSizes[index] - layout.titleFontSizes[0],
      ),
      `${label}: título ${index + 1} cambia de tamaño`,
    ).toBeLessThanOrEqual(0.1);
  }

  const head = layout.equipment.find((slot) => slot.key === 'slot:head');
  const firstBackpack = layout.backpack[0];
  const firstGround = layout.ground[0];
  expect(head, `${label}: falta el casco`).toBeDefined();
  expect(firstBackpack, `${label}: falta la primera fila de Bolsa`).toBeDefined();
  expect(firstGround, `${label}: falta la primera fila de Suelo`).toBeDefined();

  // Sin centrado vertical: la primera fila cae justo tras el hueco del título.
  const firstRows: ReadonlyArray<{ readonly rect: Rect; readonly column: number }> = [
    { rect: head!.rect, column: 0 },
    { rect: firstBackpack!.rect, column: 1 },
    { rect: firstGround!.rect, column: 2 },
  ];
  for (const row of firstRows) {
    expect(
      Math.abs(row.rect.top - (titleBottom + layout.columnRowGaps[row.column])),
      `${label}: columna ${row.column + 1} no arranca arriba`,
    ).toBeLessThanOrEqual(1);
    expect(
      row.rect.top,
      `${label}: columna ${row.column + 1} se solapa con el título`,
    ).toBeGreaterThanOrEqual(titleBottom - 1);
  }

  // El casco abre la primera fila de la rejilla de Equipo.
  expect(
    Math.abs(head!.rect.top - layout.equipmentFigure.top),
    `${label}: el casco no abre el área de contenido`,
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(head!.rect.top - layout.equipmentList.top),
    `${label}: el casco no abre la rejilla`,
  ).toBeLessThanOrEqual(1);

  // Torso, brazos y piernas: cinco bloques, ninguno por encima del casco.
  expect(layout.figure.ariaHidden, `${label}: figura sin aria-hidden`).toBe('true');
  expect(layout.figure.tabIndex, `${label}: figura tabulable`).toBeNull();
  expect(layout.figure.pointerEvents, `${label}: figura con puntero`).toBe('none');
  expect(layout.figure.blocks, `${label}: bloques de figura`).toHaveLength(5);
  for (const block of layout.figure.blocks) {
    expect(block.className, `${label}: queda la cabeza`).not.toContain(
      'inventory-figure-head',
    );
    expect(
      block.rect.top,
      `${label}: ${block.className} queda por encima del casco`,
    ).toBeGreaterThanOrEqual(head!.rect.top - 1);
  }
  for (const part of ['torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right']) {
    expect(
      layout.figure.blocks.some((block) =>
        block.className.includes(`inventory-figure-${part}`),
      ),
      `${label}: falta ${part}`,
    ).toBe(true);
  }

  // Las tres rejillas comparten tamaño de slot.
  const allSlots = [
    ...layout.equipment,
    ...layout.backpack,
    ...layout.ground,
  ];
  const side = allSlots[0].rect.width;
  for (const slot of allSlots) {
    expect(
      Math.abs(slot.rect.width - side),
      `${label}: ${slot.key} con otro ancho de slot`,
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(slot.rect.width - slot.rect.height),
      `${label}: ${slot.key} no es cuadrado`,
    ).toBeLessThanOrEqual(0.5);
  }
}

function expectStable(before: PanelLayout, after: PanelLayout, label: string): void {
  expectRectEqual(after.frame, before.frame, `${label}: marco`);
  expectRectEqual(after.panel, before.panel, `${label}: panel`);
  expectRectEqual(after.body, before.body, `${label}: cuerpo`);
  before.columns.forEach((rect, index) => {
    expectRectEqual(after.columns[index], rect, `${label}: columna ${index + 1}`);
  });
  before.titles.forEach((rect, index) => {
    expectRectEqual(after.titles[index], rect, `${label}: título ${index + 1}`);
  });
  expectRectEqual(after.figure.rect, before.figure.rect, `${label}: figura`);
  before.figure.blocks.forEach((block, index) => {
    expectRectEqual(after.figure.blocks[index].rect, block.rect, `${label}: figura`);
  });
  expect(after.equipment.map((slot) => slot.key)).toEqual(
    before.equipment.map((slot) => slot.key),
  );
  before.equipment.forEach((slot, index) => {
    expectRectEqual(after.equipment[index].rect, slot.rect, `${label}: ${slot.key}`);
  });
  expect(after.backpack.map((slot) => slot.key)).toEqual(
    before.backpack.map((slot) => slot.key),
  );
  before.backpack.forEach((slot, index) => {
    expectRectEqual(after.backpack[index].rect, slot.rect, `${label}: ${slot.key}`);
  });
  expectRectEqual(after.ground[0].rect, before.ground[0].rect, `${label}: suelo`);
}

interface LayoutShiftRecord {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly forbidden: boolean;
  readonly sources: readonly string[];
}

async function startLayoutShiftAudit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shifts: LayoutShiftRecord[] = [];
    (window as unknown as { __layoutShifts: LayoutShiftRecord[] }).__layoutShifts =
      shifts;
    if (typeof PerformanceObserver === 'undefined') return;
    const observer = new PerformanceObserver((list) => {
      for (const raw of list.getEntries()) {
        const entry = raw as PerformanceEntry & {
          value?: number;
          hadRecentInput?: boolean;
          sources?: ReadonlyArray<{ node?: Node | null }>;
        };
        const sources = (entry.sources ?? []).map((source) => {
          const node = source.node;
          if (!(node instanceof Element)) return 'unknown';
          const testId = node.getAttribute('data-testid');
          return `${node.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}`;
        });
        const forbidden = (entry.sources ?? []).some((source) => {
          const node = source.node;
          if (!(node instanceof Element)) return false;
          // Solo el armazón y las cajas estables del panel; el Suelo gestiona
          // su propia reordenación al recoger o soltar (P-006).
          return (
            node.matches(
              '[data-testid="frame"], [data-testid="inventory-panel"], .inventory-panel-body, .inventory-columns, .inventory-column, .inventory-section-title, .inventory-column-equipment .inventory-slot, .inventory-column-backpack .inventory-slot',
            ) ||
            Boolean(
              node.closest(
                '.inventory-section-title, .inventory-column-equipment .inventory-slot, .inventory-column-backpack .inventory-slot',
              ),
            )
          );
        });
        shifts.push({
          value: entry.value ?? 0,
          hadRecentInput: entry.hadRecentInput ?? false,
          forbidden,
          sources,
        });
      }
    });
    observer.observe({ type: 'layout-shift', buffered: false });
  });
}

async function expectNoForbiddenShifts(
  page: Page,
  label: string,
): Promise<LayoutShiftRecord[]> {
  const shifts = await page.evaluate(
    () =>
      (window as unknown as { __layoutShifts: LayoutShiftRecord[] })
        .__layoutShifts,
  );
  expect(
    shifts.filter((shift) => shift.forbidden),
    `${label}: layout shifts de marco, panel o columnas`,
  ).toEqual([]);
  return shifts;
}

async function resetLayoutShifts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shifts = (window as unknown as { __layoutShifts: LayoutShiftRecord[] })
      .__layoutShifts;
    if (shifts) shifts.length = 0;
  });
}

test('panel arriba: títulos, rejillas y casco en la primera fila', async ({
  page,
}, testInfo) => {
  const log: unknown[] = [];

  await openScenario(page, { width: 900, height: 700 });
  await openPanel(page);
  const compact = await panelLayout(page);
  expectTopAligned(compact, '900x700');
  log.push({ viewport: '900x700', layout: compact });
  await screenshot(page, 'panel-arriba-900x700', testInfo);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await openScenario(page, { width: 1280, height: 720 });
  await openPanel(page);
  const wide = await panelLayout(page);
  expectTopAligned(wide, '1280x720');
  log.push({ viewport: '1280x720', layout: wide });
  await screenshot(page, 'panel-arriba-1280x720', testInfo);
  await screenshot(page, 'panel-sin-cabeza-1280x720', testInfo);

  await writeLog(testInfo, 'panel-top-alignment.json', log);
});

test('al abrir, navegar y cambiar contenido no se desplaza el panel', async ({
  page,
}, testInfo) => {
  await openScenario(page, { width: 1280, height: 720 }, ['axe', 'dagger']);
  await startLayoutShiftAudit(page);
  await openPanel(page);
  const baseline = await panelLayout(page);
  expectTopAligned(baseline, 'apertura');
  const log: unknown[] = [
    { phase: 'open', shifts: await expectNoForbiddenShifts(page, 'apertura') },
  ];

  await resetLayoutShifts(page);
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const afterNavigate = await panelLayout(page);
  expectStable(baseline, afterNavigate, 'navegación');
  expectTopAligned(afterNavigate, 'navegación');
  log.push({
    phase: 'navigate',
    shifts: await expectNoForbiddenShifts(page, 'navegación'),
  });

  await resetLayoutShifts(page);
  await selectPanelRow(page, 'backpack:0');
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const afterEquip = await panelLayout(page);
  expectStable(baseline, afterEquip, 'equipar');
  expectTopAligned(afterEquip, 'equipar');
  log.push({
    phase: 'equip',
    shifts: await expectNoForbiddenShifts(page, 'equipar'),
  });

  await resetLayoutShifts(page);
  await pressPanelAction(
    page,
    panelActionTestId('pickup', 'ground:item-test-ground-0'),
  );
  await settle(page);
  const afterPickup = await panelLayout(page);
  expectStable(baseline, afterPickup, 'recoger');
  expectTopAligned(afterPickup, 'recoger');
  log.push({
    phase: 'pickup',
    shifts: await expectNoForbiddenShifts(page, 'recoger'),
  });

  await resetLayoutShifts(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  const reopened = await panelLayout(page);
  expectStable(afterPickup, reopened, 'reapertura');
  expectTopAligned(reopened, 'reapertura');
  log.push({
    phase: 'reopen',
    shifts: await expectNoForbiddenShifts(page, 'reapertura'),
  });
  await screenshot(page, 'panel-cls-1280x720', testInfo);

  await writeLog(testInfo, 'panel-top-cls.json', log);
});

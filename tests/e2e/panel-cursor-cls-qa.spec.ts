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
  reachableVisibleTiles,
  selectPanelRow,
  settle,
  snapshot,
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

interface ScenarioOptions {
  readonly inventory?: readonly ItemId[];
  readonly ground?: readonly ItemId[];
  readonly deadPlayer?: boolean;
  readonly deadEnemies?: readonly ('sentinel' | 'brute' | 'coward')[];
  readonly position?: { readonly x: number; readonly y: number };
}

function warriorScenario(options: ScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  const at = options.position ?? { x: template.x, y: template.y };
  const players = [
    {
      ...template,
      x: at.x,
      y: at.y,
      home: { x: at.x, y: at.y },
      equipment: equipmentFromLegacy(template.id, {
        weaponId: 'sword',
        armorId: 'armor',
        shieldId: 'shield',
      }),
      inventory: inventoryFromIds(template.id, options.inventory ?? []),
    },
  ];
  if (options.deadPlayer) {
    players.push({
      ...template,
      id: 'player-corpse',
      nombre: 'Bruja',
      hp: 0,
      x: at.x,
      y: at.y,
      equipment: equipmentFromLegacy('player-corpse', {
        weaponId: null,
        armorId: null,
        shieldId: null,
      }),
      inventory: inventoryFromIds('player-corpse', []),
    });
  }
  const enemyTemplate = base.enemies[0];
  const enemies = options.deadEnemies
    ? options.deadEnemies.map((enemyType, index) => ({
        ...enemyTemplate,
        id: `enemy-corpse-${index}`,
        nombre: enemyType,
        enemyType,
        hp: 0,
        x: at.x,
        y: at.y,
      }))
    : base.enemies;
  return {
    ...base,
    players,
    enemies,
    groundItems: (options.ground ?? []).map((itemId, index) => ({
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
  options: ScenarioOptions,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  const snap = await openState(page, warriorScenario(options));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settle(page);
  return snap;
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

interface CursorSnapshot {
  readonly selectedKey: string;
  readonly activeKey: string | null;
  readonly line: number;
  readonly cursor: Rect;
  readonly slot: Rect | null;
  readonly cursorHidden: boolean;
  readonly ariaHidden: string | null;
  readonly cursorTabIndex: string | null;
  readonly pointerEvents: string;
  readonly background: string;
  readonly backgroundImage: string;
  readonly borderTopWidth: number;
  readonly borderTopColor: string;
  readonly transitionProperty: string;
  readonly transitionDuration: string;
  readonly transform: string;
  readonly slotAriaCurrent: string | null;
  readonly slotTabIndex: string | null;
  readonly rowAtCenter: string | null;
}

async function cursorSnapshot(page: Page): Promise<CursorSnapshot> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    );
    if (!panel || !cursor) throw new Error('Falta el panel o el cursor');
    const key = panel.dataset.selectedKey ?? '';
    const slot = panel.querySelector<HTMLElement>(
      `[data-row-key="${CSS.escape(key)}"]`,
    );
    const box = (element: Element): Rect => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const style = getComputedStyle(cursor);
    const line = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--ui-line'),
    );
    const centerX = cursor.getBoundingClientRect().left + cursor.getBoundingClientRect().width / 2;
    const centerY = cursor.getBoundingClientRect().top + cursor.getBoundingClientRect().height / 2;
    const atCenter = document.elementFromPoint(centerX, centerY);
    const active = document.activeElement;
    return {
      selectedKey: key,
      activeKey:
        active instanceof HTMLElement
          ? (active.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null)
          : null,
      line,
      cursor: box(cursor),
      slot: slot ? box(slot) : null,
      cursorHidden: cursor.hidden,
      ariaHidden: cursor.getAttribute('aria-hidden'),
      cursorTabIndex: cursor.getAttribute('tabindex'),
      pointerEvents: style.pointerEvents,
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderTopWidth: Number.parseFloat(style.borderTopWidth),
      borderTopColor: style.borderTopColor,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      transform: style.transform,
      slotAriaCurrent: slot?.getAttribute('aria-current') ?? null,
      slotTabIndex: slot?.getAttribute('tabindex') ?? null,
      rowAtCenter:
        atCenter instanceof Element
          ? (atCenter.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null)
          : null,
    };
  });
}

interface CursorAudit {
  readonly runs: number;
  readonly properties: readonly string[];
  readonly elapsed: readonly number[];
}

function resetCursorAudit(page: Page): Promise<void> {
  return page.evaluate(() => {
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    ) as (HTMLElement & { __audit?: { runs: number; properties: string[]; elapsed: number[] } }) | null;
    if (!cursor) throw new Error('Falta el cursor');
    const audit = { runs: 0, properties: [] as string[], elapsed: [] as number[] };
    cursor.__audit = audit;
    if (cursor.dataset.auditAttached === 'true') return;
    cursor.dataset.auditAttached = 'true';
    cursor.addEventListener('transitionrun', (event) => {
      const current = (event.currentTarget as HTMLElement & {
        __audit?: { runs: number; properties: string[]; elapsed: number[] };
      }).__audit;
      if (!current) return;
      current.runs += 1;
      current.properties.push(event.propertyName);
    });
    cursor.addEventListener('transitionend', (event) => {
      const current = (event.currentTarget as HTMLElement & {
        __audit?: { runs: number; properties: string[]; elapsed: number[] };
      }).__audit;
      if (!current) return;
      current.elapsed.push(event.elapsedTime);
    });
  });
}

async function readCursorAudit(page: Page): Promise<CursorAudit> {
  return page.evaluate(() => {
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    ) as (HTMLElement & { __audit?: { runs: number; properties: string[]; elapsed: number[] } }) | null;
    const audit = cursor?.__audit;
    return {
      runs: audit?.runs ?? 0,
      properties: audit?.properties ?? [],
      elapsed: audit?.elapsed ?? [],
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

function expectCursorAroundSlot(
  snapshotCursor: CursorSnapshot,
  label: string,
): void {
  expect(snapshotCursor.slot, `${label}: falta el slot`).not.toBeNull();
  const slot = snapshotCursor.slot!;
  const cursor = snapshotCursor.cursor;
  const line = snapshotCursor.line;
  expect(Math.abs(cursor.left - (slot.left - line)), `${label}: borde izquierdo`).toBeLessThanOrEqual(
    0.6,
  );
  expect(Math.abs(cursor.top - (slot.top - line)), `${label}: borde superior`).toBeLessThanOrEqual(
    0.6,
  );
  expect(Math.abs(cursor.right - (slot.right + line)), `${label}: borde derecho`).toBeLessThanOrEqual(
    0.6,
  );
  expect(Math.abs(cursor.bottom - (slot.bottom + line)), `${label}: borde inferior`).toBeLessThanOrEqual(
    0.6,
  );
  expect(Math.abs(cursor.width - (slot.width + line * 2)), `${label}: ancho`).toBeLessThanOrEqual(
    0.6,
  );
  expect(Math.abs(cursor.height - (slot.height + line * 2)), `${label}: alto`).toBeLessThanOrEqual(
    0.6,
  );
}

function expectCursorTransitions(
  snapshotCursor: CursorSnapshot,
  label: string,
): void {
  expect(snapshotCursor.cursorHidden, `${label}: cursor oculto`).toBe(false);
  expect(snapshotCursor.ariaHidden, `${label}: aria-hidden`).toBe('true');
  expect(snapshotCursor.cursorTabIndex, `${label}: no debe ser tabulable`).toBeNull();
  expect(snapshotCursor.pointerEvents, `${label}: pointer-events`).toBe('none');
  expect(snapshotCursor.background, `${label}: centro opaco`).toBe(
    'rgba(0, 0, 0, 0)',
  );
  expect(snapshotCursor.backgroundImage, `${label}: fondo con imagen`).toBe('none');
  expect(snapshotCursor.transitionProperty, `${label}: propiedad`).toContain(
    'transform',
  );
  const duration = Number.parseFloat(snapshotCursor.transitionDuration) * 1000;
  expect(duration, `${label}: duración fuera de 80-120 ms`).toBeGreaterThanOrEqual(80);
  expect(duration, `${label}: duración fuera de 80-120 ms`).toBeLessThanOrEqual(120);
  expect(snapshotCursor.transform, `${label}: sin transform`).not.toBe('none');
  expect(snapshotCursor.activeKey, `${label}: foco DOM fuera del slot`).toBe(
    snapshotCursor.selectedKey,
  );
  expect(snapshotCursor.slotAriaCurrent, `${label}: aria-current`).toBe('true');
  expect(snapshotCursor.slotTabIndex, `${label}: tabindex del slot`).toBe('0');
  expect(snapshotCursor.rowAtCenter, `${label}: el cursor tapa el slot`).toBe(
    snapshotCursor.selectedKey,
  );
}

interface Geometry {
  readonly frame: Rect;
  readonly panel: Rect;
  readonly body: Rect;
  readonly columns: readonly Rect[];
  readonly titles: readonly Rect[];
  readonly equipment: ReadonlyArray<{ readonly key: string; readonly rect: Rect }>;
  readonly backpack: ReadonlyArray<{ readonly key: string; readonly rect: Rect }>;
}

async function panelGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('[data-testid="frame"]');
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!frame || !panel) throw new Error('Falta el marco o el panel');
    const body = panel.querySelector<HTMLElement>('.inventory-panel-body');
    if (!body) throw new Error('Falta el cuerpo del panel');
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
    const slots = (selector: string) =>
      [...panel.querySelectorAll<HTMLElement>(selector)].map((slot) => ({
        key: slot.dataset.rowKey ?? '',
        rect: rect(slot),
      }));
    return {
      frame: rect(frame),
      panel: rect(panel),
      body: rect(body),
      columns: [...panel.querySelectorAll<HTMLElement>('.inventory-column')].map(
        rect,
      ),
      titles: [
        ...panel.querySelectorAll<HTMLElement>('.inventory-section-title'),
      ].map(rect),
      equipment: slots('.inventory-column-equipment .inventory-slot'),
      backpack: slots('.inventory-column-backpack .inventory-slot'),
    };
  });
}

function expectPanelStable(before: Geometry, after: Geometry, label: string): void {
  expectRectEqual(after.frame, before.frame, `${label}: marco`);
  expectRectEqual(after.panel, before.panel, `${label}: panel`);
  expectRectEqual(after.body, before.body, `${label}: cuerpo`);
  expect(after.columns).toHaveLength(before.columns.length);
  before.columns.forEach((rect, index) => {
    expectRectEqual(after.columns[index], rect, `${label}: columna ${index + 1}`);
  });
  expect(after.titles).toHaveLength(before.titles.length);
  before.titles.forEach((rect, index) => {
    expectRectEqual(after.titles[index], rect, `${label}: título ${index + 1}`);
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
}

interface LayoutShiftSource {
  readonly label: string;
  readonly forbidden: boolean;
}

interface LayoutShiftRecord {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly forbidden: boolean;
  readonly sources: readonly LayoutShiftSource[];
}

async function startLayoutShiftAudit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shifts: LayoutShiftRecord[] = [];
    (window as unknown as { __layoutShifts: LayoutShiftRecord[] }).__layoutShifts =
      shifts;
    const describe = (node: Element): string => {
      const testId = node.getAttribute('data-testid');
      return `${node.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}${
        node.classList.length > 0 ? `.${[...node.classList].join('.')}` : ''
      }`;
    };
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
          if (!(node instanceof Element)) {
            return { label: 'unknown', forbidden: false };
          }
          // El presupuesto es 0 para el marco, el panel, sus columnas,
          // títulos y slots de equipo/bolsa. Los cambios dentro de la ficha
          // del HUD o del Suelo pertenecen a su propia zona (P-006).
          const forbidden =
            node.getAttribute('data-testid') === 'frame' ||
            Boolean(
              node.closest(
                '[data-testid="inventory-panel"], .inventory-panel-body, .inventory-columns, .inventory-column, .inventory-section-title, .inventory-column-equipment .inventory-slot, .inventory-column-backpack .inventory-slot',
              ),
            );
          return { label: describe(node), forbidden };
        });
        shifts.push({
          value: entry.value ?? 0,
          hadRecentInput: entry.hadRecentInput ?? false,
          forbidden: sources.some((source) => source.forbidden),
          sources,
        });
      }
    });
    observer.observe({ type: 'layout-shift', buffered: false });
    (window as unknown as { __layoutObserver?: PerformanceObserver })
      .__layoutObserver = observer;
  });
}

async function readLayoutShifts(page: Page): Promise<LayoutShiftRecord[]> {
  return page.evaluate(
    () =>
      (window as unknown as { __layoutShifts: LayoutShiftRecord[] })
        .__layoutShifts,
  );
}

async function expectNoForbiddenShifts(
  page: Page,
  label: string,
): Promise<LayoutShiftRecord[]> {
  const shifts = await readLayoutShifts(page);
  const forbidden = shifts.filter((shift) => shift.forbidden);
  expect(forbidden, `${label}: layout shifts de marco/panel/slots`).toEqual([]);
  return shifts;
}

async function resetLayoutShifts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shifts = (window as unknown as { __layoutShifts: LayoutShiftRecord[] })
      .__layoutShifts;
    if (shifts) shifts.length = 0;
  });
}

test('cursor superpuesto: marco, transición y foco real en el slot', async ({
  page,
}, testInfo) => {
  await openScenario(
    page,
    { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
    { width: 900, height: 700 },
  );
  await openPanel(page);
  await resetCursorAudit(page);

  const initial = await cursorSnapshot(page);
  expectCursorTransitions(initial, '900x700 apertura');
  expectCursorAroundSlot(initial, '900x700 apertura');
  await screenshot(page, 'cursor-900x700', testInfo);

  // Vecino horizontal: una única transición de transform.
  await selectPanelRow(page, 'backpack:0');
  await resetCursorAudit(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(160);
  const horizontalAudit = await readCursorAudit(page);
  expect(horizontalAudit.runs, 'vecino horizontal debe animar').toBeGreaterThan(0);
  expect(horizontalAudit.properties).toContain('transform');
  const horizontal = await cursorSnapshot(page);
  expect(horizontal.selectedKey).toBe('backpack:1');
  expectCursorTransitions(horizontal, 'vecino horizontal');
  expectCursorAroundSlot(horizontal, 'vecino horizontal');

  // Cambio de fila: sin transición, posición final correcta.
  await resetCursorAudit(page);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(160);
  const verticalAudit = await readCursorAudit(page);
  expect(verticalAudit.runs, 'cambio de fila debe ser instantáneo').toBe(0);
  const vertical = await cursorSnapshot(page);
  expect(vertical.selectedKey).toBe('backpack:3');
  expectCursorAroundSlot(vertical, 'cambio de fila');

  // Cambio de zona con Tab: instantáneo y foco intacto.
  await resetCursorAudit(page);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(160);
  const zoneAudit = await readCursorAudit(page);
  expect(zoneAudit.runs, 'cambio de zona debe ser instantáneo').toBe(0);
  const zone = await cursorSnapshot(page);
  expect(zone.selectedKey.startsWith('ground:')).toBe(true);
  expectCursorTransitions(zone, 'cambio de zona');
  expectCursorAroundSlot(zone, 'cambio de zona');
  await screenshot(page, 'cursor-zona-suelo-900x700', testInfo);

  // El foco en «Cerrar» oculta el cursor sin mover el foco del panel.
  for (let presses = 0; presses < 6; presses += 1) {
    await page.keyboard.press('Tab');
    const focusedClose = await page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') === 'inventory-close',
    );
    if (focusedClose) break;
  }
  const onClose = await page.evaluate(() => {
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    );
    return {
      hidden: cursor?.hidden ?? false,
      active: document.activeElement?.getAttribute('data-testid') ?? null,
    };
  });
  expect(onClose.active).toBe('inventory-close');
  expect(onClose.hidden).toBe(true);

  // Segunda resolución: el cursor sigue al slot y la transición se mantiene.
  await openScenario(
    page,
    { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
    { width: 1280, height: 720 },
  );
  await openPanel(page);
  await resetCursorAudit(page);
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(160);
  const wideAudit = await readCursorAudit(page);
  expect(wideAudit.runs).toBeGreaterThan(0);
  const wide = await cursorSnapshot(page);
  expectCursorTransitions(wide, '1280x720');
  expectCursorAroundSlot(wide, '1280x720');
  await screenshot(page, 'cursor-1280x720', testInfo);
  await writeLog(testInfo, 'cursor-transitions.json', {
    initial,
    horizontal,
    vertical,
    zone,
    wide,
    audits: { horizontalAudit, verticalAudit, zoneAudit, wideAudit },
  });
});

test('cursor: scroll instantáneo, pulsaciones rápidas y movimiento reducido', async ({
  page,
}, testInfo) => {
  await openScenario(
    page,
    { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
    { width: 900, height: 700 },
  );
  await openPanel(page);
  await selectPanelRow(page, 'backpack:0');
  await resetCursorAudit(page);

  // Pulsaciones rápidas: el cursor termina exactamente sobre el foco.
  for (const key of [
    'ArrowDown',
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
  ] as const) {
    await page.keyboard.press(key);
  }
  await page.waitForTimeout(200);
  const rapid = await cursorSnapshot(page);
  expect(rapid.activeKey).toBe(rapid.selectedKey);
  expectCursorAroundSlot(rapid, 'pulsaciones rápidas');

  // Scroll del Suelo: el cursor se recoloca sin transición.
  await openScenario(
    page,
    { inventory: FULL_BACKPACK, ground: Array.from({ length: 40 }, (_v, i) => FOUR_GROUND[i % 4]) },
    { width: 900, height: 700 },
  );
  await openPanel(page);
  await selectPanelRow(page, 'ground:item-test-ground-39');
  await page.waitForTimeout(200);
  const scrollTop = await page.getByTestId('inventory-ground-scroll').evaluate(
    (element) => (element as HTMLElement).scrollTop,
  );
  expect(scrollTop).toBeGreaterThan(0);
  await resetCursorAudit(page);
  await page.getByTestId('inventory-ground-scroll').evaluate((element) => {
    const scroll = element as HTMLElement;
    scroll.scrollTop = Math.max(0, scroll.scrollTop - 2);
  });
  await page.waitForTimeout(160);
  const scrollAudit = await readCursorAudit(page);
  expect(scrollAudit.runs, 'el scroll debe ser instantáneo').toBe(0);
  const scrolled = await cursorSnapshot(page);
  expectCursorAroundSlot(scrolled, 'scroll');
  const scrolledTop = await page.getByTestId('inventory-ground-scroll').evaluate(
    (element) => (element as HTMLElement).scrollTop,
  );
  expect(scrolledTop).toBeLessThan(scrollTop);

  // Movimiento reducido: ni la preferencia del host ni la media query animan.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openScenario(
    page,
    { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
    { width: 900, height: 700 },
  );
  await openPanel(page);
  await selectPanelRow(page, 'backpack:0');
  await resetCursorAudit(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(160);
  const reducedAudit = await readCursorAudit(page);
  expect(reducedAudit.runs, 'reduced motion no debe animar').toBe(0);
  const reduced = await cursorSnapshot(page);
  expect(reduced.selectedKey).toBe('backpack:1');
  expect(Number.parseFloat(reduced.transitionDuration)).toBe(0);
  expectCursorAroundSlot(reduced, 'reduced motion');
  await screenshot(page, 'cursor-reduced-motion-900x700', testInfo);
  await writeLog(testInfo, 'cursor-scroll-reduced.json', {
    rapid,
    scrolled,
    scrollTop,
    reduced,
    audits: { scrollAudit, reducedAudit },
  });
});

test('CLS: marco, panel, columnas, títulos y slots estables', async ({
  page,
}, testInfo) => {
  await openScenario(
    page,
    { inventory: ['axe', 'dagger'], ground: ['hammer'] },
    { width: 1280, height: 720 },
  );
  const frameBefore = await panelGeometry(page).then((geometry) => geometry.frame);
  await startLayoutShiftAudit(page);
  await openPanel(page);
  const baseline = await panelGeometry(page);
  expectRectEqual(baseline.frame, frameBefore, 'apertura: marco');
  const openShifts = await expectNoForbiddenShifts(page, 'apertura');

  const log: unknown[] = [{ phase: 'open', shifts: openShifts }];

  // Navegar en el panel.
  await resetLayoutShifts(page);
  await selectPanelRow(page, 'backpack:0');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const afterNavigate = await panelGeometry(page);
  expectPanelStable(baseline, afterNavigate, 'navegación');
  log.push({ phase: 'navigate', shifts: await expectNoForbiddenShifts(page, 'navegación') });

  // Equipar: cambia el sprite del hueco, nunca su caja.
  await resetLayoutShifts(page);
  await selectPanelRow(page, 'backpack:0');
  await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
  await settle(page);
  const afterEquip = await panelGeometry(page);
  expectPanelStable(baseline, afterEquip, 'equipar');
  log.push({ phase: 'equip', shifts: await expectNoForbiddenShifts(page, 'equipar') });

  // Recoger y soltar: el Suelo gestiona su propio scroll.
  await resetLayoutShifts(page);
  await pressPanelAction(
    page,
    panelActionTestId('pickup', 'ground:item-test-ground-0'),
  );
  await settle(page);
  const afterPickup = await panelGeometry(page);
  expectPanelStable(baseline, afterPickup, 'recoger');
  log.push({ phase: 'pickup', shifts: await expectNoForbiddenShifts(page, 'recoger') });

  const pickedKey = await page.getByTestId('inventory-panel').evaluate(
    (panel) => (panel as HTMLElement).dataset.selectedKey ?? '',
  );
  await resetLayoutShifts(page);
  await pressPanelAction(page, panelActionTestId('drop', pickedKey));
  await settle(page);
  const afterDrop = await panelGeometry(page);
  expectPanelStable(baseline, afterDrop, 'soltar');
  log.push({ phase: 'drop', shifts: await expectNoForbiddenShifts(page, 'soltar') });

  // Cerrar: el marco vuelve exactamente a su caja previa.
  await resetLayoutShifts(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inventory-panel')).toBeHidden();
  await page.waitForTimeout(100);
  const frameAfterClose = await panelGeometry(page).then((geometry) => geometry.frame);
  expectRectEqual(frameAfterClose, frameBefore, 'cierre: marco');
  log.push({ phase: 'close', shifts: await expectNoForbiddenShifts(page, 'cierre') });

  // Reabrir: mismas columnas, títulos y slots.
  await resetLayoutShifts(page);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  const reopened = await panelGeometry(page);
  expectPanelStable(baseline, reopened, 'reapertura');
  log.push({ phase: 'reopen', shifts: await expectNoForbiddenShifts(page, 'reapertura') });
  await screenshot(page, 'cls-panel-1280x720', testInfo);

  // Cadáveres: aparecen y desaparecen sin mover el panel.
  await openScenario(
    page,
    {
      inventory: ['axe', 'dagger'],
      ground: ['hammer'],
      deadPlayer: true,
      deadEnemies: ['sentinel', 'brute'],
    },
    { width: 1280, height: 720 },
  );
  await startLayoutShiftAudit(page);
  await openPanel(page);
  await expect(page.locator('.inventory-corpse')).toHaveCount(3);
  const withCorpses = await panelGeometry(page);
  expectPanelStable(baseline, withCorpses, 'cadáveres');
  log.push({
    phase: 'corpses',
    shifts: await expectNoForbiddenShifts(page, 'cadáveres'),
  });

  await openScenario(
    page,
    { inventory: ['axe', 'dagger'], ground: ['hammer'] },
    { width: 1280, height: 720 },
  );
  await startLayoutShiftAudit(page);
  await openPanel(page);
  await expect(page.locator('.inventory-corpse')).toHaveCount(0);
  const withoutCorpses = await panelGeometry(page);
  expectPanelStable(baseline, withoutCorpses, 'sin cadáveres');
  log.push({
    phase: 'no-corpses',
    shifts: await expectNoForbiddenShifts(page, 'sin cadáveres'),
  });

  // Cambiar de tile no cambia la caja del panel.
  const snap = await snapshot(page);
  const tile = reachableVisibleTiles(snap, { minDistance: 1, maxDistance: 3 })[0];
  expect(tile, 'falta un tile alcanzable').toBeDefined();
  await openScenario(
    page,
    {
      inventory: ['axe', 'dagger'],
      ground: ['hammer'],
      position: { x: tile!.x, y: tile!.y },
    },
    { width: 1280, height: 720 },
  );
  await startLayoutShiftAudit(page);
  await openPanel(page);
  const otherTile = await panelGeometry(page);
  expectPanelStable(baseline, otherTile, 'cambio de tile');
  log.push({
    phase: 'tile',
    shifts: await expectNoForbiddenShifts(page, 'cambio de tile'),
  });
  await writeLog(testInfo, 'cls-geometry.json', log);
});

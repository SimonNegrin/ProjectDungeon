import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { ITEMS, type ItemId } from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import {
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type GameState,
  type Unit,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import {
  expectDebug,
  openState,
  panelActionTestId,
  pressPanelAction,
  reachableVisibleTiles,
  selectPanelRow,
  settle,
  snapshot,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;
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
const PALETTE = [
  '#2f142f',
  '#2a584f',
  '#774448',
  '#6eb8a8',
  '#fcffc0',
  '#ee9c5d',
  '#c6505a',
  '#74a33f',
] as const;

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
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
  scope?: string,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', ...(scope ? [scope, name] : [name]));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function nextFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let seen = 0;
        const step = (): void => {
          seen += 1;
          if (seen >= frames) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    count,
  );
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

interface WarriorOptions {
  readonly name?: string;
  readonly weapon?: boolean;
  readonly hp?: number;
}

function warrior(options: WarriorOptions = {}): Unit {
  const unit = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: options.name ?? 'Ada',
  });
  return {
    ...unit,
    hp: options.hp ?? unit.hp,
    equipment:
      options.weapon === false
        ? { ...unit.equipment, weapon: null }
        : unit.equipment,
  };
}

function mage(): Unit {
  return createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Mira',
  });
}

function rogue(): Unit {
  return createPlayerFromArchetype('rogue', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Boric',
  });
}

interface PanelOptions {
  readonly inventory?: readonly ItemId[];
  readonly ground?: readonly ItemId[];
  readonly deadPlayer?: boolean;
  readonly deadEnemies?: readonly ('sentinel' | 'brute')[];
  readonly position?: { readonly x: number; readonly y: number };
}

function panelState(options: PanelOptions = {}): GameState {
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

async function openHud(
  page: Page,
  state: GameState,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await openState(page, state);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await settle(page);
}

async function openPanelScenario(
  page: Page,
  options: PanelOptions,
  viewport: { width: number; height: number },
): Promise<void> {
  await openHud(page, panelState(options), viewport);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
}

async function injectTrait(
  page: Page,
  itemId: ItemId,
  trait: { readonly id: string; readonly description: string },
): Promise<void> {
  await page.evaluate(
    async ({ id, next }) => {
      const moduleUrl = '/src/game/equipment.ts';
      const module = (await import(/* @vite-ignore */ moduleUrl)) as {
        ITEMS: Record<string, { traits: { id: string; description: string }[] }>;
      };
      module.ITEMS[id].traits = [{ ...next }];
    },
    { id: itemId, next: trait },
  );
}

/* ------------------------------- HUD ---------------------------------- */

interface ZoneStyle {
  readonly background: string;
  readonly borderTopWidth: string;
  readonly borderTopColor: string;
  readonly borderBottomColor: string;
  readonly borderStyle: string;
}

async function hudGeometry(page: Page) {
  return page.evaluate(() => {
    const element = (testId: string): HTMLElement => {
      const found = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!found) throw new Error(`Falta [data-testid="${testId}"]`);
      return found;
    };
    const box = (testId: string): Rect => {
      const rect = element(testId).getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const style = (testId: string): ZoneStyle => {
      const computed = getComputedStyle(element(testId));
      return {
        background: computed.backgroundColor,
        borderTopWidth: computed.borderTopWidth,
        borderTopColor: computed.borderTopColor,
        borderBottomColor: computed.borderBottomColor,
        borderStyle: computed.borderTopStyle,
      };
    };
    const keys = element('hud-keys');
    const suggestion = element('hud-suggestion');
    const magic = element('hud-magic-row');
    const mana = element('hud-mana-row');
    const traits = element('hud-traits');
    return {
      left: box('hud-left'),
      character: box('hud-zone-character'),
      weapon: box('hud-zone-weapon'),
      stats: box('hud-zone-stats'),
      portrait: box('hud-portrait'),
      name: box('hud-player-name'),
      keys: box('hud-keys'),
      suggestion: box('hud-suggestion'),
      leftStyle: style('hud-left'),
      characterStyle: style('hud-zone-character'),
      weaponStyle: style('hud-zone-weapon'),
      statsStyle: style('hud-zone-stats'),
      keysStyle: {
        background: getComputedStyle(keys).backgroundColor,
        borderTopWidth: getComputedStyle(keys).borderTopWidth,
        borderBottomWidth: getComputedStyle(keys).borderBottomWidth,
      },
      hiddenRows: {
        magic: {
          hidden: magic.hidden,
          height: magic.getBoundingClientRect().height,
        },
        mana: { hidden: mana.hidden, height: mana.getBoundingClientRect().height },
        traits: {
          hidden: traits.hidden,
          height: traits.getBoundingClientRect().height,
        },
      },
      footerOutsideZones: !keys.closest('.hud-zone'),
      suggestionOutsideZones: !suggestion.closest('.hud-zone'),
      overflow: {
        scrollHeight: element('hud-left').scrollHeight,
        clientHeight: element('hud-left').clientHeight,
      },
      hudText: (element('hud-left').textContent ?? '').replace(/\s+/g, ' '),
    };
  });
}

function expectOutset(style: ZoneStyle, label: string): void {
  expect(style.borderTopWidth, `${label} sin bisel`).not.toBe('0px');
  expect(style.borderStyle, `${label} sin borde sólido`).toBe('solid');
  expect(style.borderTopColor, `${label} bisel claro`).toBe(
    'rgb(110, 184, 168)',
  );
  expect(style.borderBottomColor, `${label} bisel oscuro`).toBe(
    'rgb(47, 20, 47)',
  );
}

function expectZoneFrame(style: ZoneStyle, label: string): void {
  expectOutset(style, label);
  expect(style.background, `${label} fondo propio`).toBe('rgb(119, 68, 72)');
}

function expectHudBase(area: Awaited<ReturnType<typeof hudGeometry>>): void {
  expect(area.hudText).not.toContain('Fase');
  expect(area.hudText).not.toContain('Turno');
  expect(area.hudText).not.toContain('En juego');
  expect(area.hudText).not.toContain('PV enemigo');
  expect(area.footerOutsideZones).toBe(true);
  expect(area.suggestionOutsideZones).toBe(true);
  expect(area.keysStyle.background).toBe('rgba(0, 0, 0, 0)');
  expect(area.keysStyle.borderTopWidth).toBe('0px');
  expect(area.keysStyle.borderBottomWidth).toBe('0px');
  expect(area.keys.top).toBeGreaterThanOrEqual(area.stats.bottom - 1);
  expect(area.overflow.scrollHeight).toBeLessThanOrEqual(
    area.overflow.clientHeight + 1,
  );
  expectOutset(area.leftStyle, 'HUD izquierdo');
  expect(area.leftStyle.background).toBe('rgb(42, 88, 79)');
  expectZoneFrame(area.characterStyle, 'Personaje');
  expectZoneFrame(area.statsStyle, 'Stats');
}

interface PortraitStyle {
  readonly backgroundImage: string;
  readonly backgroundPosition: string;
  readonly backgroundSize: string;
  readonly width: number;
  readonly height: number;
}

async function portraitStyle(page: Page): Promise<PortraitStyle> {
  return page.getByTestId('hud-portrait').evaluate((element) => {
    const node = element as HTMLElement;
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return {
      backgroundImage: style.backgroundImage,
      backgroundPosition: style.backgroundPosition,
      backgroundSize: style.backgroundSize,
      width: box.width,
      height: box.height,
    };
  });
}

/* ------------------------------ PANEL --------------------------------- */

interface SlotMetrics {
  readonly key: string;
  readonly column: string;
  readonly rect: Rect;
  readonly inner: Rect;
  readonly border: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly sprite: Rect | null;
}

interface PanelMetrics {
  readonly frame: Rect;
  readonly panel: Rect;
  readonly body: Rect;
  readonly columns: ReadonlyArray<{ readonly name: string; readonly rect: Rect }>;
  readonly titles: ReadonlyArray<{ readonly text: string; readonly rect: Rect }>;
  readonly slots: readonly SlotMetrics[];
  readonly scroll: {
    readonly panel: {
      scrollWidth: number;
      clientWidth: number;
      scrollHeight: number;
      clientHeight: number;
    };
    readonly body: {
      scrollWidth: number;
      clientWidth: number;
      scrollHeight: number;
      clientHeight: number;
    };
    readonly columns: ReadonlyArray<{
      scrollWidth: number;
      clientWidth: number;
      scrollHeight: number;
      clientHeight: number;
    }>;
    readonly ground: {
      scrollWidth: number;
      clientWidth: number;
      scrollHeight: number;
      clientHeight: number;
      scrollTop: number;
    } | null;
  };
}

async function panelMetrics(page: Page): Promise<PanelMetrics> {
  return page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('[data-testid="frame"]');
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!frame || !panel) throw new Error('Falta el marco o el panel');
    const body = panel.querySelector<HTMLElement>('.inventory-panel-body');
    if (!body) throw new Error('Falta el cuerpo del panel');
    const rect = (node: Element): Rect => {
      const box = node.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const scrollBox = (node: HTMLElement) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
    });
    const columnName = (node: Element | null): string =>
      node === null
        ? ''
        : ([...node.classList].find((name) =>
            name.startsWith('inventory-column-'),
          ) ?? '');
    const columns = [...panel.querySelectorAll<HTMLElement>('.inventory-column')];
    const slots = [...panel.querySelectorAll<HTMLElement>('.inventory-slot')];
    const ground = panel.querySelector<HTMLElement>(
      '[data-testid="inventory-ground-scroll"]',
    );
    return {
      frame: rect(frame),
      panel: rect(panel),
      body: rect(body),
      columns: columns.map((column) => ({
        name: columnName(column),
        rect: rect(column),
      })),
      titles: [
        ...panel.querySelectorAll<HTMLElement>('.inventory-section-title'),
      ].map((title) => ({ text: title.textContent?.trim() ?? '', rect: rect(title) })),
      slots: slots.map((slot) => {
        const box = rect(slot);
        const computed = getComputedStyle(slot);
        const border = {
          top: Number.parseFloat(computed.borderTopWidth),
          right: Number.parseFloat(computed.borderRightWidth),
          bottom: Number.parseFloat(computed.borderBottomWidth),
          left: Number.parseFloat(computed.borderLeftWidth),
        };
        const icon = slot.querySelector<HTMLElement>('.inventory-slot-icon');
        return {
          key: slot.dataset.rowKey ?? '',
          column: columnName(slot.closest('.inventory-column')),
          rect: box,
          inner: {
            left: box.left + border.left,
            top: box.top + border.top,
            right: box.right - border.right,
            bottom: box.bottom - border.bottom,
            width: box.width - border.left - border.right,
            height: box.height - border.top - border.bottom,
          },
          border,
          sprite: icon && !icon.hidden ? rect(icon) : null,
        };
      }),
      scroll: {
        panel: scrollBox(panel),
        body: scrollBox(body),
        columns: columns.map(scrollBox),
        ground: ground ? { ...scrollBox(ground), scrollTop: ground.scrollTop } : null,
      },
    };
  });
}

function expectInside(inner: Rect, outer: Rect, label: string): void {
  expect(inner.left, `${label}: borde izquierdo fuera`).toBeGreaterThanOrEqual(
    outer.left - 0.5,
  );
  expect(inner.top, `${label}: borde superior fuera`).toBeGreaterThanOrEqual(
    outer.top - 0.5,
  );
  expect(inner.right, `${label}: borde derecho fuera`).toBeLessThanOrEqual(
    outer.right + 0.5,
  );
  expect(inner.bottom, `${label}: borde inferior fuera`).toBeLessThanOrEqual(
    outer.bottom + 0.5,
  );
}

function expectPanelFit(metrics: PanelMetrics, label: string): void {
  expectInside(metrics.panel, metrics.frame, `${label} panel en el marco`);
  expectInside(metrics.body, metrics.panel, `${label} cuerpo en el panel`);
  expect(metrics.columns).toHaveLength(3);
  expect(metrics.titles).toHaveLength(3);
  expect(metrics.titles.map((title) => title.text.split(/\s+/)[0])).toEqual([
    'Equipo',
    'Bolsa',
    'Suelo',
  ]);

  const ordered = [...metrics.columns].sort((a, b) => a.rect.left - b.rect.left);
  for (let index = 0; index < ordered.length; index += 1) {
    expectInside(ordered[index].rect, metrics.panel, `${label} ${ordered[index].name}`);
    const next = ordered[index + 1];
    if (next) {
      expect(
        next.rect.left,
        `${label} ${ordered[index].name} y ${next.name} se solapan`,
      ).toBeGreaterThanOrEqual(ordered[index].rect.right - 0.5);
    }
  }

  const titleTop = metrics.titles[0].rect.top;
  metrics.titles.forEach((title, index) => {
    expectInside(title.rect, metrics.columns[index].rect, `${label} título ${title.text}`);
    expect(
      Math.abs(title.rect.top - titleTop),
      `${label} títulos desalineados`,
    ).toBeLessThanOrEqual(1);
  });

  expect(metrics.slots.length).toBeGreaterThan(0);
  const sides = metrics.slots.map((slot) => slot.rect.width);
  const minSide = Math.min(...sides);
  const maxSide = Math.max(...sides);
  expect(maxSide - minSide, `${label} slots desiguales`).toBeLessThanOrEqual(0.5);

  for (const slot of metrics.slots) {
    const column = metrics.columns.find((entry) =>
      slot.column === '' ? entry.name === 'inventory-column' : entry.name === slot.column,
    );
    expect(column, `${label} ${slot.key} sin columna`).toBeDefined();
    expectInside(slot.rect, column!.rect, `${label} ${slot.key}`);
    expect(
      Math.abs(slot.rect.width - slot.rect.height),
      `${label} ${slot.key} no es cuadrado`,
    ).toBeLessThanOrEqual(0.5);
    if (slot.sprite === null) continue;
    expectInside(slot.sprite, slot.inner, `${label} sprite ${slot.key}`);
    expect(
      slot.sprite.width,
      `${label} sprite ${slot.key} desborda en ancho`,
    ).toBeLessThanOrEqual(slot.inner.width + 0.5);
    expect(
      slot.sprite.height,
      `${label} sprite ${slot.key} desborda en alto`,
    ).toBeLessThanOrEqual(slot.inner.height + 0.5);
    expect(
      Math.abs(
        slot.sprite.left + slot.sprite.width / 2 -
          (slot.inner.left + slot.inner.width / 2),
      ),
      `${label} sprite ${slot.key} descentrado en X`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        slot.sprite.top + slot.sprite.height / 2 -
          (slot.inner.top + slot.inner.height / 2),
      ),
      `${label} sprite ${slot.key} descentrado en Y`,
    ).toBeLessThanOrEqual(1);
  }

  for (const [name, box] of [
    ['panel', metrics.scroll.panel],
    ['cuerpo', metrics.scroll.body],
  ] as const) {
    expect(box.scrollWidth, `${label} ${name} scroll horizontal`).toBeLessThanOrEqual(
      box.clientWidth + 1,
    );
    expect(box.scrollHeight, `${label} ${name} recorta en vertical`).toBeLessThanOrEqual(
      box.clientHeight + 1,
    );
  }
  for (const [index, box] of metrics.scroll.columns.entries()) {
    expect(
      box.scrollWidth,
      `${label} columna ${index + 1} scroll horizontal`,
    ).toBeLessThanOrEqual(box.clientWidth + 1);
    expect(
      box.scrollHeight,
      `${label} columna ${index + 1} recorta en vertical`,
    ).toBeLessThanOrEqual(box.clientHeight + 1);
  }
  if (metrics.scroll.ground) {
    expect(
      metrics.scroll.ground.scrollWidth,
      `${label} suelo scroll horizontal`,
    ).toBeLessThanOrEqual(metrics.scroll.ground.clientWidth + 1);
  }
}

/* ------------------------------ CURSOR -------------------------------- */

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
    const centerX =
      cursor.getBoundingClientRect().left + cursor.getBoundingClientRect().width / 2;
    const centerY =
      cursor.getBoundingClientRect().top + cursor.getBoundingClientRect().height / 2;
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
    ) as
      | (HTMLElement & {
          __audit?: { runs: number; properties: string[]; elapsed: number[] };
        })
      | null;
    if (!cursor) throw new Error('Falta el cursor');
    const audit = { runs: 0, properties: [] as string[], elapsed: [] as number[] };
    cursor.__audit = audit;
    if (cursor.dataset.auditAttached === 'true') return;
    cursor.dataset.auditAttached = 'true';
    cursor.addEventListener('transitionrun', (event) => {
      const current = (
        event.currentTarget as HTMLElement & {
          __audit?: { runs: number; properties: string[]; elapsed: number[] };
        }
      ).__audit;
      if (!current) return;
      current.runs += 1;
      current.properties.push(event.propertyName);
    });
    cursor.addEventListener('transitionend', (event) => {
      const current = (
        event.currentTarget as HTMLElement & {
          __audit?: { runs: number; properties: string[]; elapsed: number[] };
        }
      ).__audit;
      if (!current) return;
      current.elapsed.push(event.elapsedTime);
    });
  });
}

async function readCursorAudit(page: Page): Promise<CursorAudit> {
  return page.evaluate(() => {
    const cursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    ) as
      | (HTMLElement & {
          __audit?: { runs: number; properties: string[]; elapsed: number[] };
        })
      | null;
    const audit = cursor?.__audit;
    return {
      runs: audit?.runs ?? 0,
      properties: audit?.properties ?? [],
      elapsed: audit?.elapsed ?? [],
    };
  });
}

function cursorSlotDelta(snapshot: CursorSnapshot): number {
  if (snapshot.slot === null) return Number.POSITIVE_INFINITY;
  const slot = snapshot.slot;
  const cursor = snapshot.cursor;
  const line = snapshot.line;
  return Math.max(
    Math.abs(cursor.left - (slot.left - line)),
    Math.abs(cursor.top - (slot.top - line)),
    Math.abs(cursor.right - (slot.right + line)),
    Math.abs(cursor.bottom - (slot.bottom + line)),
    Math.abs(cursor.width - (slot.width + line * 2)),
    Math.abs(cursor.height - (slot.height + line * 2)),
  );
}

async function waitForCursorOnSlot(page: Page): Promise<void> {
  await expect
    .poll(async () => cursorSlotDelta(await cursorSnapshot(page)), {
      timeout: 2_000,
    })
    .toBeLessThanOrEqual(0.6);
}

function expectCursorAroundSlot(
  snapshotCursor: CursorSnapshot,
  label: string,
): void {
  expect(snapshotCursor.slot, `${label}: falta el slot`).not.toBeNull();
  expect(cursorSlotDelta(snapshotCursor), `${label}: caja del cursor`).toBeLessThanOrEqual(
    0.6,
  );
}

function expectCursorTransitions(
  snapshotCursor: CursorSnapshot,
  label: string,
): void {
  expect(snapshotCursor.cursorHidden, `${label}: cursor oculto`).toBe(false);
  expect(snapshotCursor.ariaHidden, `${label}: aria-hidden`).toBe('true');
  expect(
    snapshotCursor.cursorTabIndex,
    `${label}: no debe ser tabulable`,
  ).toBeNull();
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
  expect(
    snapshotCursor.borderTopWidth,
    `${label}: bisel del cursor`,
  ).toBeGreaterThan(0);
  expect(snapshotCursor.borderTopColor, `${label}: color del cursor`).toBe(
    'rgb(116, 163, 63)',
  );
}

/* -------------------------------- CLS --------------------------------- */

async function startLayoutShiftAudit(page: Page): Promise<void> {
  await page.evaluate(() => {
    interface ShiftSource {
      label: string;
      forbidden: boolean;
    }
    interface ShiftRecord {
      value: number;
      hadRecentInput: boolean;
      forbidden: boolean;
      sources: ShiftSource[];
    }
    const shifts: ShiftRecord[] = [];
    (window as unknown as { __layoutShifts: ShiftRecord[] }).__layoutShifts = shifts;
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
    (window as unknown as { __layoutObserver?: PerformanceObserver }).__layoutObserver =
      observer;
  });
}

async function readLayoutShifts(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __layoutShifts: Array<{
            value: number;
            hadRecentInput: boolean;
            forbidden: boolean;
            sources: Array<{ label: string; forbidden: boolean }>;
          }>;
        }
      ).__layoutShifts,
  );
}

async function resetLayoutShifts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const shifts = (
      window as unknown as {
        __layoutShifts: Array<unknown>;
      }
    ).__layoutShifts;
    if (shifts) shifts.length = 0;
  });
}

async function expectNoForbiddenShifts(
  page: Page,
  label: string,
): Promise<Awaited<ReturnType<typeof readLayoutShifts>>> {
  await nextFrames(page);
  const shifts = await readLayoutShifts(page);
  const forbidden = shifts.filter((shift) => shift.forbidden);
  expect(
    forbidden,
    `${label}: layout shifts de marco/panel/slots: ${JSON.stringify(forbidden)}`,
  ).toEqual([]);
  return shifts;
}

function expectRectEqual(actual: Rect, expected: Rect, label: string): void {
  for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
    expect(
      Math.abs(actual[edge] - expected[edge]),
      `${label}: ${edge} cambió (${actual[edge]} vs ${expected[edge]})`,
    ).toBeLessThanOrEqual(0.6);
  }
}

function expectPanelStable(
  before: PanelMetrics,
  after: PanelMetrics,
  label: string,
): void {
  expectRectEqual(after.frame, before.frame, `${label}: marco`);
  expectRectEqual(after.panel, before.panel, `${label}: panel`);
  expectRectEqual(after.body, before.body, `${label}: cuerpo`);
  expect(after.columns).toHaveLength(before.columns.length);
  before.columns.forEach((column, index) => {
    expectRectEqual(after.columns[index].rect, column.rect, `${label}: columna ${index + 1}`);
  });
  expect(after.titles).toHaveLength(before.titles.length);
  before.titles.forEach((title, index) => {
    expectRectEqual(after.titles[index].rect, title.rect, `${label}: título ${index + 1}`);
  });
  const slotRects = (metrics: PanelMetrics, column: string) =>
    metrics.slots
      .filter((slot) => slot.column === column)
      .map((slot) => ({ key: slot.key, rect: slot.rect }));
  for (const column of ['inventory-column-equipment', 'inventory-column-backpack']) {
    const beforeSlots = slotRects(before, column);
    const afterSlots = slotRects(after, column);
    expect(afterSlots.map((slot) => slot.key)).toEqual(
      beforeSlots.map((slot) => slot.key),
    );
    beforeSlots.forEach((slot, index) => {
      expectRectEqual(afterSlots[index].rect, slot.rect, `${label}: ${slot.key}`);
    });
  }
}

/* -------------------------------- TESTS ------------------------------- */

for (const viewport of VIEWPORTS) {
  const suffix = `${viewport.width}x${viewport.height}`;

  test.describe(`REQ-033 QA visual a ${suffix}`, () => {
    test('HUD: tres zonas, variantes condicionales y pie', async ({
      page,
    }, testInfo) => {
      const log: unknown[] = [];

      await openHud(page, roomState([warrior()]), viewport);
      for (const zone of [
        'hud-zone-character',
        'hud-zone-weapon',
        'hud-zone-stats',
      ]) {
        await expect(page.getByTestId(zone)).toBeVisible();
      }
      await expect(page.getByTestId('hud-player-name')).toHaveText('Ada');
      await expect(page.getByTestId('hud-archetype')).toHaveText('Guerrero');
      await expect(page.getByTestId('hud-player-hp')).toHaveText('20/20');
      await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
      await expect(page.getByTestId('hud-action')).toHaveText('2/2');
      await expect(page.getByTestId('hud-weapon')).toHaveText(ITEMS.sword.name);
      await expect(page.getByTestId('hud-weapon-sprite')).toBeVisible();
      await expect(page.getByTestId('hud-magic-row')).toBeHidden();
      await expect(page.getByTestId('hud-mana-row')).toBeHidden();
      await expect(page.getByTestId('hud-traits')).toBeHidden();

      const area = await hudGeometry(page);
      expectHudBase(area);
      expectZoneFrame(area.weaponStyle, 'Arma');
      expect(area.portrait.right).toBeLessThanOrEqual(area.name.left + 1);
      expect(Math.abs(area.portrait.top - area.name.top)).toBeLessThanOrEqual(2);
      expect(area.character.top).toBeGreaterThanOrEqual(area.left.top - 0.5);
      expect(area.weapon.top).toBeGreaterThanOrEqual(area.character.bottom - 1);
      expect(area.stats.top).toBeGreaterThanOrEqual(area.weapon.bottom - 1);
      expect(area.character.right).toBeLessThanOrEqual(area.left.right + 1);
      await expectDebug(page, [
        'Fase: Jugador · Turno 1',
        'Estado: En juego',
        'Enemigo:',
      ]);
      await screenshot(page, `tres-zonas-${suffix}`, testInfo);
      log.push({ scene: 'tres-zonas', viewport: suffix, ...area });
      await writeLog(testInfo, 'hud-geometry.json', log, suffix);

      // Sin maná ni traits las filas no existen ni dejan hueco.
      expect(area.hiddenRows.magic.hidden).toBe(true);
      expect(area.hiddenRows.mana.hidden).toBe(true);
      expect(area.hiddenRows.traits.hidden).toBe(true);
      expect(area.hiddenRows.magic.height).toBe(0);
      expect(area.hiddenRows.mana.height).toBe(0);
      expect(area.hiddenRows.traits.height).toBe(0);
      await screenshot(page, `hud-sin-mana-sin-traits-${suffix}`, testInfo);
      log.push({ scene: 'sin-mana-sin-traits', viewport: suffix, ...area });
      await writeLog(testInfo, 'hud-geometry.json', log, suffix);

      // Con maná (mago) se ven magia y maná; sin arma se oculta la zona.
      await openHud(page, roomState([mage()]), viewport);
      await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();
      await expect(page.getByTestId('hud-magic-row')).toBeVisible();
      await expect(page.getByTestId('hud-mana-row')).toBeVisible();
      await expect(page.getByTestId('hud-player-magic')).toHaveText('4');
      await expect(page.getByTestId('hud-player-mana')).toHaveText('16/16');
      await expect(page.getByTestId('hud-traits')).toBeHidden();
      const manaArea = await hudGeometry(page);
      expectHudBase(manaArea);
      expect(manaArea.hudText).not.toContain('Sin arma');
      expect(manaArea.hudText).not.toContain('Sin traits activos');
      expect(manaArea.weapon.height).toBe(0);
      await screenshot(page, `hud-con-mana-${suffix}`, testInfo);
      log.push({ scene: 'con-mana', viewport: suffix, ...manaArea });
      await writeLog(testInfo, 'hud-geometry.json', log, suffix);

      // Con traits se lee el texto del trait inyectado en el arma equipada.
      await openHud(page, roomState([warrior()]), viewport);
      await injectTrait(page, 'sword', { id: 'filoso', description: 'Corta más' });
      await settle(page);
      await expect(page.getByTestId('hud-traits')).toBeVisible();
      await expect(page.getByTestId('hud-traits')).toHaveText('filoso: Corta más');
      const traitArea = await hudGeometry(page);
      expectHudBase(traitArea);
      expect(traitArea.hudText).toContain('filoso: Corta más');
      await screenshot(page, `hud-con-traits-${suffix}`, testInfo);
      log.push({ scene: 'con-traits', viewport: suffix, ...traitArea });
      await writeLog(testInfo, 'hud-geometry.json', log, suffix);

      // Retrato: observación no bloqueante, solo a 900×700.
      if (viewport.width === 900) {
        const samples: Record<string, PortraitStyle> = {
          warrior: await portraitStyle(page),
        };
        await openHud(page, roomState([mage()]), viewport);
        samples.mage = await portraitStyle(page);
        await openHud(page, roomState([rogue()]), viewport);
        samples.rogue = await portraitStyle(page);
        const identical = Object.values(samples).every(
          (sample) =>
            sample.backgroundImage === samples.warrior.backgroundImage &&
            sample.backgroundPosition === samples.warrior.backgroundPosition,
        );
        await writeLog(testInfo, 'portrait-audit.json', {
          viewport: suffix,
          samples,
          identical,
          blocking: false,
          note: identical
            ? 'La miniatura no cambia entre arquetipos: mismo background-image y background-position. Es una carencia previa que podría afectar a REQ-022 R-002 (la miniatura debe cambiar al cambiar de jugador activo), pero queda fuera del alcance de REQ-033 y no bloquea esta tarea de QA.'
            : 'El retrato varía entre arquetipos.',
        });
      }
    });

    test('ficha: sprite, stats verticales y dos secciones sin rótulos', async ({
      page,
    }, testInfo) => {
      const log: unknown[] = [];
      await openPanelScenario(page, { inventory: ['axe'] }, viewport);
      await selectPanelRow(page, 'backpack:0');
      await settle(page);

      await expect(page.getByTestId('hud-panel-detail')).toBeVisible();
      await expect(page.getByTestId('hud-panel-selected')).toBeVisible();
      await expect(page.getByTestId('hud-panel-equipped')).toBeVisible();
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

      const selectedStats = await page
        .getByTestId('hud-panel-selected-stats')
        .locator('li')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect();
            return {
              text: element.textContent ?? '',
              top: box.top,
              bottom: box.bottom,
            };
          }),
        );
      expect(selectedStats.map((stat) => stat.text)).toEqual([
        '+2 Acierto',
        '+5 Daño',
      ]);
      for (const stat of selectedStats) {
        expect(stat.text, 'el valor va delante').toMatch(/^\+\d+ \S/);
      }
      selectedStats.forEach((stat, index) => {
        if (index === 0) return;
        expect(stat.top, 'stats no verticales').toBeGreaterThanOrEqual(
          selectedStats[index - 1].bottom - 1,
        );
      });

      const detailText = (await page.getByTestId('hud-panel-detail').innerText()) ?? '';
      expect(detailText).not.toMatch(/Stats|Seleccionado|Sin traits activos/);
      expect(
        detailText.split(ITEMS.axe.name).length - 1,
        'el tipo o el título se duplica',
      ).toBe(1);
      expect(detailText).not.toContain(ITEMS.axe.description);
      expect(detailText).not.toContain(ITEMS.sword.description);
      expect(await page.getByTestId('hud-panel-selected-traits').isHidden()).toBe(
        true,
      );
      expect(await page.getByTestId('hud-panel-equipped-traits').isHidden()).toBe(
        true,
      );

      const ficha = await page.evaluate(() => {
        const readSprite = (testId: string) => {
          const node = document.querySelector<HTMLElement>(
            `[data-testid="${testId}"]`,
          );
          if (!node) throw new Error(`Falta ${testId}`);
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return {
            backgroundImage: style.backgroundImage,
            backgroundPosition: style.backgroundPosition,
            imageRendering: style.imageRendering,
            width: box.width,
            height: box.height,
          };
        };
        const readBlock = (testId: string) => {
          const node = document.querySelector<HTMLElement>(
            `[data-testid="${testId}"]`,
          );
          if (!node) throw new Error(`Falta ${testId}`);
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return {
            backgroundColor: style.backgroundColor,
            borderTopStyle: style.borderTopStyle,
            borderTopWidth: style.borderTopWidth,
            borderTopColor: style.borderTopColor,
            borderBottomColor: style.borderBottomColor,
            left: box.left,
            right: box.right,
          };
        };
        const right = document.querySelector<HTMLElement>('[data-testid="hud-right"]');
        if (!right) throw new Error('Falta el HUD derecho');
        const rightStyle = getComputedStyle(right);
        const rightBox = right.getBoundingClientRect();
        return {
          selectedSprite: readSprite('hud-panel-selected-sprite'),
          equippedSprite: readSprite('hud-panel-equipped-sprite'),
          selectedBlock: readBlock('hud-panel-selected'),
          equippedBlock: readBlock('hud-panel-equipped'),
          right: {
            backgroundColor: rightStyle.backgroundColor,
            left: rightBox.left,
            right: rightBox.right,
          },
        };
      });

      for (const sprite of [ficha.selectedSprite, ficha.equippedSprite]) {
        expect(sprite.backgroundImage).toContain('/assets/32rogues/items.png');
        expect(sprite.backgroundPosition).not.toBe('0% 0%');
        expect(sprite.imageRendering).toBe('pixelated');
        expect(sprite.width).toBeGreaterThan(0);
        expect(sprite.width).toBeCloseTo(sprite.height, 1);
      }
      for (const block of [ficha.selectedBlock, ficha.equippedBlock]) {
        expect(block.borderTopStyle).toBe('solid');
        expect(Number.parseFloat(block.borderTopWidth)).toBeGreaterThan(0);
        expect(block.borderTopColor).toBe('rgb(110, 184, 168)');
        expect(block.borderBottomColor).toBe('rgb(47, 20, 47)');
        expect(block.backgroundColor).not.toBe(ficha.right.backgroundColor);
        expect(block.left).toBeGreaterThanOrEqual(ficha.right.left - 1);
        expect(block.right).toBeLessThanOrEqual(ficha.right.right + 1);
      }
      await screenshot(page, `ficha-sin-traits-${suffix}`, testInfo);
      log.push({ scene: 'sin-traits', viewport: suffix, stats: selectedStats, ficha });
      await writeLog(testInfo, 'ficha.json', log, suffix);

      // Con traits: el mismo recurso de TASK-0106 y relectura al reabrir.
      await injectTrait(page, 'axe', { id: 'filoso', description: 'Corta más' });
      await page.keyboard.press('Escape');
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await selectPanelRow(page, 'backpack:0');
      await settle(page);
      await expect(page.getByTestId('hud-panel-selected-traits')).toBeVisible();
      await expect(page.getByTestId('hud-panel-selected-traits')).toHaveText(
        'filoso: Corta más',
      );
      expect(
        await page
          .getByTestId('hud-panel-selected-stats')
          .locator('li')
          .allTextContents(),
      ).toEqual(['+2 Acierto', '+5 Daño']);
      await screenshot(page, `ficha-con-traits-${suffix}`, testInfo);
      log.push({
        scene: 'con-traits',
        viewport: suffix,
        trait: await page.getByTestId('hud-panel-selected-traits').innerText(),
      });
      await writeLog(testInfo, 'ficha.json', log, suffix);
    });

    test('panel: mochila llena, cadáveres, suelo y encaje de tres columnas', async ({
      page,
    }, testInfo) => {
      const log: unknown[] = [];

      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      await expect(page.locator('.inventory-column-equipment .inventory-slot')).toHaveCount(8);
      await expect(page.locator('.inventory-column-backpack .inventory-slot')).toHaveCount(8);
      await expect(page.locator('.inventory-ground .inventory-slot')).toHaveCount(4);
      await expect(page.getByTestId('inventory-backpack-count')).toHaveText('8/8');
      const full = await panelMetrics(page);
      expectPanelFit(full, `${suffix} mochila llena`);
      await screenshot(page, `panel-mochila-llena-${suffix}`, testInfo);
      log.push({ scene: 'mochila-llena', viewport: suffix, metrics: full });
      await writeLog(testInfo, 'panel-geometry.json', log, suffix);

      // Sin cadáveres no hay sección ni hueco.
      await openPanelScenario(page, { inventory: ['axe'], ground: ['dagger'] }, viewport);
      await expect(page.getByTestId('inventory-cadavers')).toBeHidden();
      await expect(page.getByTestId('inventory-cadavers-empty')).toHaveCount(0);
      await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
      const noCorpses = await panelMetrics(page);
      expectPanelFit(noCorpses, `${suffix} sin cadáveres`);
      const noCorpseLayout = await page.getByTestId('inventory-panel').evaluate((panel) => {
        const cadavers = panel.querySelector<HTMLElement>(
          '[data-testid="inventory-cadavers"]',
        );
        const ground = panel.querySelector<HTMLElement>(
          '[data-testid="inventory-ground-section"]',
        );
        if (!cadavers || !ground) throw new Error('Falta la zona de cadáveres o suelo');
        return {
          cadaversHeight: cadavers.getBoundingClientRect().height,
          cadaversText: cadavers.textContent ?? '',
          groundTop: ground.getBoundingClientRect().top,
          panelText: panel.textContent ?? '',
        };
      });
      expect(noCorpseLayout.cadaversHeight).toBe(0);
      expect(noCorpseLayout.cadaversText.trim()).toBe('');
      expect(noCorpseLayout.panelText).not.toContain('Cadáveres');
      await screenshot(page, `panel-sin-cadavers-${suffix}`, testInfo);
      log.push({ scene: 'sin-cadavers', viewport: suffix, metrics: noCorpses, ...noCorpseLayout });
      await writeLog(testInfo, 'panel-geometry.json', log, suffix);

      // Con cadáveres: tres celdas con sprite y nombre/tipo antes del Suelo.
      await openPanelScenario(
        page,
        {
          inventory: FULL_BACKPACK,
          ground: ['axe', 'dagger'],
          deadPlayer: true,
          deadEnemies: ['sentinel', 'brute'],
        },
        viewport,
      );
      await expect(page.getByTestId('inventory-cadavers')).toBeVisible();
      await expect(page.locator('.inventory-corpse')).toHaveCount(3);
      await expect(page.locator('.inventory-corpse-name')).toHaveText([
        'Bruja',
        'Centinela',
        'Bruto',
      ]);
      await expect(
        page.locator('.inventory-corpse-sprite[data-sheet="rogues"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('.inventory-corpse-sprite[data-sheet="monsters"]'),
      ).toHaveCount(2);
      const corpses = await page.getByTestId('inventory-panel').evaluate((panel) => {
        const column = panel.querySelector<HTMLElement>('.inventory-column-right');
        const title = column?.querySelector<HTMLElement>('.inventory-section-title');
        const ground = panel.querySelector<HTMLElement>('.inventory-ground');
        const rows = [...panel.querySelectorAll<HTMLElement>('.inventory-corpse')];
        if (!column || !title || !ground) throw new Error('Falta la columna derecha');
        const box = (node: Element) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, height: rect.height };
        };
        return {
          title: box(title),
          rows: rows.map(box),
          ground: box(ground),
          rowKeys: rows.filter((row) => row.hasAttribute('data-row-key')).length,
          tabbables: rows.filter((node) => node.getAttribute('tabindex') !== null)
            .length,
        };
      });
      expect(corpses.rowKeys).toBe(0);
      expect(corpses.tabbables).toBe(0);
      expect(corpses.rows[0].top).toBeGreaterThanOrEqual(corpses.title.bottom - 1);
      expect(corpses.rows[2].bottom).toBeLessThanOrEqual(corpses.ground.top + 1);
      const withCorpses = await panelMetrics(page);
      expectPanelFit(withCorpses, `${suffix} con cadáveres`);
      await screenshot(page, `panel-con-cadavers-${suffix}`, testInfo);
      log.push({ scene: 'con-cadavers', viewport: suffix, metrics: withCorpses, corpses });
      await writeLog(testInfo, 'panel-geometry.json', log, suffix);

      // Suelo con cuatro objetos.
      await openPanelScenario(page, { inventory: ['axe'], ground: FOUR_GROUND }, viewport);
      await expect(page.locator('.inventory-ground-row')).toHaveCount(4);
      const ground = await panelMetrics(page);
      expectPanelFit(ground, `${suffix} suelo con objetos`);
      await screenshot(page, `panel-suelo-objetos-${suffix}`, testInfo);
      log.push({ scene: 'suelo-objetos', viewport: suffix, metrics: ground });
      await writeLog(testInfo, 'panel-geometry.json', log, suffix);

      // Tres columnas y encaje con 8 + 8 + 4: cifras para el informe.
      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      const fit = await panelMetrics(page);
      expectPanelFit(fit, `${suffix} tres columnas`);
      const fitSummary = {
        viewport: suffix,
        panel: fit.panel,
        frame: fit.frame,
        columns: fit.columns.map((column) => ({ name: column.name, width: column.rect.width })),
        titles: fit.titles.map((title) => ({ text: title.text, top: title.rect.top })),
        slotSide: fit.slots[0]?.rect.width ?? 0,
        columnsGap:
          fit.columns.length > 1 ? fit.columns[1].rect.left - fit.columns[0].rect.right : 0,
      };
      await screenshot(page, `tres-columnas-${suffix}`, testInfo);
      log.push({ scene: 'tres-columnas', viewport: suffix, fitSummary, metrics: fit });
      await writeLog(testInfo, 'panel-geometry.json', log, suffix);
    });

    test('cursor superpuesto: transición, salto y movimiento reducido', async ({
      page,
    }, testInfo) => {
      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      await selectPanelRow(page, 'backpack:0');
      await waitForCursorOnSlot(page);
      await resetCursorAudit(page);

      const initial = await cursorSnapshot(page);
      expectCursorTransitions(initial, `${suffix} apertura`);
      expectCursorAroundSlot(initial, `${suffix} apertura`);
      await screenshot(page, `cursor-${suffix}`, testInfo);

      // Vecino horizontal: una transición de transform y caja final correcta.
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowRight');
      await waitForCursorOnSlot(page);
      const horizontalAudit = await readCursorAudit(page);
      expect(horizontalAudit.runs, 'vecino horizontal debe animar').toBeGreaterThan(0);
      expect(horizontalAudit.properties).toContain('transform');
      const horizontal = await cursorSnapshot(page);
      expect(horizontal.selectedKey).toBe('backpack:1');
      expectCursorTransitions(horizontal, `${suffix} vecino horizontal`);
      expectCursorAroundSlot(horizontal, `${suffix} vecino horizontal`);

      // Cambio de fila: sin transición y posición final correcta.
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowDown');
      await nextFrames(page);
      const verticalAudit = await readCursorAudit(page);
      expect(verticalAudit.runs, 'cambio de fila debe ser instantáneo').toBe(0);
      const vertical = await cursorSnapshot(page);
      expect(vertical.selectedKey).toBe('backpack:3');
      expectCursorAroundSlot(vertical, `${suffix} cambio de fila`);
      await screenshot(page, `cursor-salto-${suffix}`, testInfo);

      // Cambio de zona con Tab: instantáneo.
      await resetCursorAudit(page);
      await page.keyboard.press('Tab');
      await nextFrames(page);
      const zoneAudit = await readCursorAudit(page);
      expect(zoneAudit.runs, 'cambio de zona debe ser instantáneo').toBe(0);
      const zone = await cursorSnapshot(page);
      expect(zone.selectedKey.startsWith('ground:')).toBe(true);
      expectCursorAroundSlot(zone, `${suffix} cambio de zona`);

      await writeLog(testInfo, 'cursor.json', {
        viewport: suffix,
        initial,
        horizontal,
        vertical,
        zone,
        audits: { horizontalAudit, verticalAudit, zoneAudit },
      }, suffix);

      // Movimiento reducido: sin transición ni animación.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      await selectPanelRow(page, 'backpack:0');
      await waitForCursorOnSlot(page);
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowRight');
      await nextFrames(page);
      const reducedAudit = await readCursorAudit(page);
      expect(reducedAudit.runs, 'reduced motion no debe animar').toBe(0);
      const reduced = await cursorSnapshot(page);
      expect(reduced.selectedKey).toBe('backpack:1');
      expect(Number.parseFloat(reduced.transitionDuration)).toBe(0);
      expectCursorAroundSlot(reduced, `${suffix} reduced motion`);
      await screenshot(page, `cursor-reduced-motion-${suffix}`, testInfo);
      await writeLog(testInfo, 'cursor.json', {
        viewport: suffix,
        initial,
        horizontal,
        vertical,
        zone,
        reduced,
        audits: { horizontalAudit, verticalAudit, zoneAudit, reducedAudit },
      }, suffix);
    });

    test('CLS: marco, panel, columnas, títulos y slots sin desplazamiento', async ({
      page,
    }, testInfo) => {
      await openHud(
        page,
        panelState({ inventory: ['axe', 'dagger'], ground: ['hammer'] }),
        viewport,
      );
      const frameBefore = (await panelMetrics(page)).frame;
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      const baseline = await panelMetrics(page);
      expectRectEqual(baseline.frame, frameBefore, 'apertura: marco');
      const log: unknown[] = [
        { phase: 'open', shifts: await expectNoForbiddenShifts(page, 'apertura') },
      ];

      // Navegar.
      await resetLayoutShifts(page);
      await selectPanelRow(page, 'backpack:0');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      const afterNavigate = await panelMetrics(page);
      expectPanelStable(baseline, afterNavigate, 'navegación');
      log.push({
        phase: 'navigate',
        shifts: await expectNoForbiddenShifts(page, 'navegación'),
      });

      // Equipar.
      await resetLayoutShifts(page);
      await selectPanelRow(page, 'backpack:0');
      await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
      await settle(page);
      const afterEquip = await panelMetrics(page);
      expectPanelStable(baseline, afterEquip, 'equipar');
      log.push({
        phase: 'equip',
        shifts: await expectNoForbiddenShifts(page, 'equipar'),
      });

      // Recoger y soltar.
      await resetLayoutShifts(page);
      await pressPanelAction(
        page,
        panelActionTestId('pickup', 'ground:item-test-ground-0'),
      );
      await settle(page);
      const afterPickup = await panelMetrics(page);
      expectPanelStable(baseline, afterPickup, 'recoger');
      log.push({
        phase: 'pickup',
        shifts: await expectNoForbiddenShifts(page, 'recoger'),
      });

      const pickedKey = await page
        .getByTestId('inventory-panel')
        .evaluate((panel) => (panel as HTMLElement).dataset.selectedKey ?? '');
      await resetLayoutShifts(page);
      await pressPanelAction(page, panelActionTestId('drop', pickedKey));
      await settle(page);
      const afterDrop = await panelMetrics(page);
      expectPanelStable(baseline, afterDrop, 'soltar');
      log.push({
        phase: 'drop',
        shifts: await expectNoForbiddenShifts(page, 'soltar'),
      });

      // Cerrar y reabrir.
      await resetLayoutShifts(page);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-panel')).toBeHidden();
      await nextFrames(page);
      const frameAfterClose = (await panelMetrics(page)).frame;
      expectRectEqual(frameAfterClose, frameBefore, 'cierre: marco');
      log.push({
        phase: 'close',
        shifts: await expectNoForbiddenShifts(page, 'cierre'),
      });

      await resetLayoutShifts(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      const reopened = await panelMetrics(page);
      expectPanelStable(baseline, reopened, 'reapertura');
      log.push({
        phase: 'reopen',
        shifts: await expectNoForbiddenShifts(page, 'reapertura'),
      });
      await screenshot(page, `cls-${suffix}`, testInfo);

      // Cadáveres: aparecen y desaparecen sin mover el panel.
      await openHud(
        page,
        panelState({
          inventory: ['axe', 'dagger'],
          ground: ['hammer'],
          deadPlayer: true,
          deadEnemies: ['sentinel', 'brute'],
        }),
        viewport,
      );
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await expect(page.locator('.inventory-corpse')).toHaveCount(3);
      const withCorpses = await panelMetrics(page);
      expectPanelStable(baseline, withCorpses, 'cadáveres');
      log.push({
        phase: 'corpses',
        shifts: await expectNoForbiddenShifts(page, 'cadáveres'),
      });

      await openHud(
        page,
        panelState({ inventory: ['axe', 'dagger'], ground: ['hammer'] }),
        viewport,
      );
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await expect(page.locator('.inventory-corpse')).toHaveCount(0);
      const withoutCorpses = await panelMetrics(page);
      expectPanelStable(baseline, withoutCorpses, 'sin cadáveres');
      log.push({
        phase: 'no-corpses',
        shifts: await expectNoForbiddenShifts(page, 'sin cadáveres'),
      });

      // Cambiar de tile: misma caja de panel.
      const tile = reachableVisibleTiles(await snapshot(page), {
        minDistance: 1,
        maxDistance: 3,
      })[0];
      expect(tile, 'falta un tile alcanzable').toBeDefined();
      await openHud(
        page,
        panelState({
          inventory: ['axe', 'dagger'],
          ground: ['hammer'],
          position: { x: tile!.x, y: tile!.y },
        }),
        viewport,
      );
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      const otherTile = await panelMetrics(page);
      expectPanelStable(baseline, otherTile, 'cambio de tile');
      log.push({
        phase: 'tile',
        shifts: await expectNoForbiddenShifts(page, 'cambio de tile'),
      });
      await writeLog(testInfo, 'cls.json', log, suffix);
    });

    test('paleta y relieve: ocho colores, outset/inset y sin adornos modernos', async ({
      page,
    }, testInfo) => {
      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      await selectPanelRow(page, 'backpack:0');
      await settle(page);

      const tokens = await page.evaluate((wanted) => {
        const style = getComputedStyle(document.documentElement);
        return wanted.map((token) => style.getPropertyValue(token).trim());
      }, [
        '--ui-bg',
        '--ui-panel',
        '--ui-raised',
        '--ui-line-color',
        '--ui-text',
        '--ui-accent',
        '--ui-danger',
        '--ui-focus',
      ]);
      expect(tokens).toEqual([...PALETTE]);
      expect(new Set(tokens).size).toBe(8);

      const selectors = [
        '.hud-left',
        '.hud-right',
        '.hud-detail-block',
        '.inventory-panel-body',
        '.inventory-column',
        '.inventory-slot',
        '.inventory-submenu',
      ];
      const entries = await page.evaluate((list) => {
        const alpha = (color: string): number => {
          const match = /rgba?\(([^)]+)\)/.exec(color);
          if (!match) return 1;
          const parts = match[1].split(',').map((part) => Number.parseFloat(part));
          return parts.length === 4 ? parts[3] : 1;
        };
        return list.map((selector) => {
          const node = document.querySelector<HTMLElement>(selector);
          if (!node) throw new Error(`Falta ${selector}`);
          const style = getComputedStyle(node);
          return {
            selector,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            textShadow: style.textShadow,
            backdropFilter: style.backdropFilter,
            filter: style.filter,
            backgroundImage: style.backgroundImage,
            backgroundColor: style.backgroundColor,
            backgroundAlpha: alpha(style.backgroundColor),
            borderTopWidth: style.borderTopWidth,
            borderBottomWidth: style.borderBottomWidth,
            borderTopColor: style.borderTopColor,
            borderBottomColor: style.borderBottomColor,
          };
        });
      }, selectors);

      for (const entry of entries) {
        expect(entry.borderRadius, `${entry.selector} usa radio`).toBe('0px');
        expect(entry.boxShadow, `${entry.selector} usa sombra`).toBe('none');
        expect(entry.textShadow, `${entry.selector} usa text-shadow`).toBe('none');
        expect(entry.backdropFilter, `${entry.selector} usa backdrop-filter`).toBe(
          'none',
        );
        expect(entry.filter, `${entry.selector} usa filter`).toBe('none');
        expect(entry.backgroundImage, `${entry.selector} usa degradado`).toBe('none');
      }
      for (const selector of [
        '.hud-left',
        '.hud-right',
        '.hud-detail-block',
        '.inventory-panel-body',
        '.inventory-column',
        '.inventory-slot',
      ]) {
        const entry = entries.find((candidate) => candidate.selector === selector)!;
        expect(entry.backgroundAlpha, `${selector} translúcido`).toBe(1);
      }

      const bevels = entries.reduce<Record<string, (typeof entries)[number]>>(
        (result, entry) => {
          result[entry.selector] = entry;
          return result;
        },
        {},
      );
      for (const selector of [
        '.hud-left',
        '.hud-right',
        '.hud-detail-block',
        '.inventory-column',
      ]) {
        expect(bevels[selector].borderTopColor, `${selector} bisel claro`).toBe(
          'rgb(110, 184, 168)',
        );
        expect(bevels[selector].borderBottomColor, `${selector} bisel oscuro`).toBe(
          'rgb(47, 20, 47)',
        );
      }
      expect(bevels['.inventory-slot'].borderTopColor, 'slot bisel oscuro').toBe(
        'rgb(47, 20, 47)',
      );
      expect(bevels['.inventory-slot'].borderBottomColor, 'slot bisel claro').toBe(
        'rgb(110, 184, 168)',
      );

      const slotText = await page
        .locator('.inventory-slot')
        .evaluateAll((slots) => slots.map((slot) => (slot.textContent ?? '').trim()));
      expect(slotText.every((text) => text === '')).toBe(true);

      await writeLog(testInfo, 'palette-styles.json', {
        viewport: suffix,
        tokens,
        entries,
      }, suffix);
    });
  });
}

test.describe('REQ-033 escala continua', () => {
  const SIZES = [
    { width: 900, height: 700 },
    { width: 901, height: 700 },
    { width: 1024, height: 720 },
    { width: 1100, height: 720 },
    { width: 1280, height: 720 },
  ] as const;

  test('--ui-scale y --ui-line se derivan del marco sin saltos', async ({
    page,
  }, testInfo) => {
    const measurements: Array<{
      viewport: string;
      frame: { width: number; height: number };
      scale: number;
      line: number;
      hudFont: number;
      slot: { width: number; height: number };
      columnsGap: number;
    }> = [];

    for (const size of SIZES) {
      const suffix = `${size.width}x${size.height}`;
      await openHud(page, roomState([warrior()]), size);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      const measured = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const frame = document
          .querySelector<HTMLElement>('[data-testid="frame"]')!
          .getBoundingClientRect();
        const hud = document.querySelector<HTMLElement>('[data-testid="hud"]')!;
        const slot = document.querySelector<HTMLElement>('.inventory-slot')!;
        const columns = document.querySelector<HTMLElement>('.inventory-columns')!;
        const slotBox = slot.getBoundingClientRect();
        return {
          frame: { width: frame.width, height: frame.height },
          scale: Number.parseFloat(root.getPropertyValue('--ui-scale')),
          line: Number.parseFloat(root.getPropertyValue('--ui-line')),
          hudFont: Number.parseFloat(getComputedStyle(hud).fontSize),
          slot: { width: slotBox.width, height: slotBox.height },
          columnsGap: Number.parseFloat(getComputedStyle(columns).columnGap),
        };
      });
      measurements.push({ viewport: suffix, ...measured });

      expect(measured.scale).toBeGreaterThan(0);
      expect(measured.scale).toBeCloseTo(measured.frame.height / 416, 6);
      expect(measured.line).toBeCloseTo(measured.scale, 6);
      expect(measured.hudFont).toBeCloseTo(measured.scale * 11.2, 3);
      expect(measured.slot.width).toBeCloseTo(34 * measured.scale, 1);
      expect(measured.slot.height).toBeCloseTo(34 * measured.scale, 1);
      expect(measured.columnsGap).toBeCloseTo(8 * measured.scale, 1);
      expect(measured.frame.width / measured.scale).toBeCloseTo(739.5556, 1);

      if (size.width === 1280) {
        expect(measured.hudFont).toBeGreaterThanOrEqual(17.8);
        expect(measured.hudFont).toBeLessThanOrEqual(19.8);
      }
      if (size.width === 900) {
        expect(measured.hudFont).toBeGreaterThanOrEqual(11.8);
        expect(measured.hudFont).toBeLessThanOrEqual(13.8);
      }

      await screenshot(page, `escala-${suffix}`, testInfo);
    }

    // Proporción constante: la misma relación a cualquier ancho.
    const ratios = measurements.map((entry) => entry.slot.width / entry.scale);
    for (const ratio of ratios) expect(ratio).toBeCloseTo(34, 1);
    const fontRatios = measurements.map((entry) => entry.hudFont / entry.frame.height);
    for (const ratio of fontRatios) expect(ratio).toBeCloseTo(fontRatios[0], 6);

    // 900 → 901: cambio continuo de línea, sin salto discreto.
    const compact = measurements.find((entry) => entry.viewport === '900x700')!;
    const onePixel = measurements.find((entry) => entry.viewport === '901x700')!;
    expect(onePixel.line).toBeGreaterThan(compact.line);
    expect(onePixel.line - compact.line).toBeLessThan(0.01);

    await writeLog(testInfo, 'scale-continuity.json', measurements);
  });
});

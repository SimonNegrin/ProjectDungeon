import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import {
  EQUIPMENT_SILHOUETTES,
  EQUIPMENT_SLOTS,
  ITEMS,
  WEAPONS,
  weaponDamage,
  type ItemId,
  type WeaponId,
} from '../../src/game/equipment';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import {
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type GameState,
  type Unit,
} from '../../src/game/index';
import { itemStats } from '../../src/host/hud-detail';
import { artifactPath } from './artifacts';
import {
  expectNoForbiddenShifts,
  focusPanelAction,
  openState,
  panelActionTestId,
  pressPanelAction,
  resetLayoutShifts,
  selectPanelRow,
  settle,
  startLayoutShiftAudit,
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
const SWORD_TRAITS = [
  { id: 'filoso', description: 'Corta más' },
  { id: 'equilibrado', description: 'No pesa' },
] as const;
const AXE_TRAITS = [
  { id: 'brutal', description: 'Golpea fuerte' },
  { id: 'lento', description: 'Tarda más' },
] as const;

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface PanelScenarioOptions {
  readonly inventory?: readonly ItemId[];
  readonly ground?: readonly ItemId[];
  readonly weaponId?: ItemId | null;
  readonly armorId?: ItemId | null;
  readonly shieldId?: ItemId | null;
  readonly deadPlayer?: boolean;
  readonly deadEnemies?: readonly ('sentinel' | 'brute')[];
  readonly position?: { readonly x: number; readonly y: number };
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

function warrior(): Unit {
  const unit = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Ada',
  });
  return {
    ...unit,
    inventory: inventoryFromIds(unit.id, ['axe']),
  };
}

function mage(): Unit {
  return createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Mira',
  });
}

/**
 * Estado BSP con el equipo y el contenido pedidos. Las piezas se construyen con
 * las fábricas del juego; el test no fija coordenadas ni sprites de la UI.
 */
function panelState(options: PanelScenarioOptions = {}): GameState {
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
        weaponId: options.weaponId === undefined ? 'sword' : options.weaponId,
        armorId: options.armorId === undefined ? 'armor' : options.armorId,
        shieldId: options.shieldId === undefined ? 'shield' : options.shieldId,
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
      lootable: true,
      x: at.x,
      y: at.y,
    })),
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

async function writeLog(
  testInfo: TestInfo,
  name: string,
  value: unknown,
  scope: string,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', scope, name);
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
  options: PanelScenarioOptions,
  viewport: { width: number; height: number },
): Promise<void> {
  await openHud(page, panelState(options), viewport);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();
  await nextFrames(page);
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

/* ------------------------------- listas -------------------------------- */

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function unitLines(unit: Unit): string[] {
  const { habilidad, fuerza, defensa } = unit.stats;
  return [
    `${signed(habilidad)} habilidad`,
    `${signed(fuerza)} fuerza`,
    `${signed(defensa)} defensa`,
  ];
}

function weaponLines(itemId: WeaponId): string[] {
  const item = WEAPONS[itemId];
  return [
    `${signed(item.accuracy ?? 0)} acierto`,
    `${signed(weaponDamage(item))} daño`,
  ];
}

function itemLines(itemId: ItemId): string[] {
  return itemStats(ITEMS[itemId]).map((stat) => `${stat.value} ${stat.label}`);
}

async function listText(page: Page, testId: string): Promise<string[]> {
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
  expect(boxes.length, `${testId} sin entradas`).toBeGreaterThan(0);
  boxes.forEach((box, index) => {
    if (index === 0) return;
    expect(
      box.top,
      `${testId}: las entradas no ocupan líneas distintas`,
    ).toBeGreaterThanOrEqual(boxes[index - 1].bottom - 1);
  });
  for (const text of await listText(page, testId)) {
    expect(text, `${testId} contiene separador ·`).not.toContain('·');
  }
}

/* -------------------------------- bisel -------------------------------- */

interface BoxMetrics {
  readonly name: string;
  readonly outer: Rect;
  readonly inner: Rect;
  readonly border: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number };
  readonly padding: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number };
  readonly bevelWidth: number;
  readonly pseudoActive: boolean;
  readonly paintedLeft: number;
  readonly paintedTop: number;
}

async function measureBoxes(
  page: Page,
  selectors: ReadonlyArray<readonly [string, string]>,
): Promise<BoxMetrics[]> {
  return page.evaluate((entries) => {
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
    return entries.map(([name, selector]) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Falta ${selector}`);
      const style = getComputedStyle(element);
      const pseudo = getComputedStyle(element, '::before');
      const outer = rect(element);
      const border = {
        top: Number.parseFloat(style.borderTopWidth),
        left: Number.parseFloat(style.borderLeftWidth),
        right: Number.parseFloat(style.borderRightWidth),
        bottom: Number.parseFloat(style.borderBottomWidth),
      };
      const padding = {
        top: Number.parseFloat(style.paddingTop),
        left: Number.parseFloat(style.paddingLeft),
        right: Number.parseFloat(style.paddingRight),
        bottom: Number.parseFloat(style.paddingBottom),
      };
      const bevelWidth = Number.parseFloat(pseudo.outlineWidth);
      const pseudoActive = pseudo.content !== 'none' && pseudo.content !== 'normal';
      return {
        name,
        outer,
        inner: {
          left: outer.left + border.left + padding.left,
          top: outer.top + border.top + padding.top,
          right: outer.right - border.right - padding.right,
          bottom: outer.bottom - border.bottom - padding.bottom,
          width:
            outer.width - border.left - border.right - padding.left - padding.right,
          height:
            outer.height - border.top - border.bottom - padding.top - padding.bottom,
        },
        border,
        padding,
        bevelWidth,
        pseudoActive,
        paintedLeft: outer.left + border.left - bevelWidth,
        paintedTop: outer.top + border.top - bevelWidth,
      };
    });
  }, selectors);
}

interface BevelTokens {
  readonly line: number;
  readonly bevelToken: string;
  readonly bevel: number;
}

async function bevelTokens(page: Page): Promise<BevelTokens> {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.querySelector<HTMLElement>('[data-testid="hud-left"]');
    if (!probe) throw new Error('Falta la sonda del HUD');
    return {
      line: Number.parseFloat(root.getPropertyValue('--ui-line')),
      bevelToken: root.getPropertyValue('--ui-bevel').trim(),
      bevel: Number.parseFloat(getComputedStyle(probe, '::before').outlineWidth),
    };
  });
}

interface PixelProbe {
  readonly id: string;
  readonly side: 'left' | 'right';
  readonly rect: Rect;
}

interface PaintedBevel {
  readonly id: string;
  readonly side: 'left' | 'right';
  readonly edge: number;
  readonly y: number;
  readonly background: string;
  readonly insideBackground: string;
  readonly fullPixels: number;
  readonly weightedWidth: number;
  readonly pixels: ReadonlyArray<{
    readonly offset: number;
    readonly color: string;
    readonly coverage: number;
  }>;
}

async function probeRects(page: Page): Promise<PixelProbe[]> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!panel) throw new Error('Falta el panel');
    const rect = (selector: string): Rect => {
      const element = panel.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Falta ${selector}`);
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
    return [
      { id: 'columna-equipo', side: 'left' as const, rect: rect('.inventory-column-equipment') },
      { id: 'slot-bolsa-1', side: 'right' as const, rect: rect('[data-row-key="backpack:1"]') },
    ];
  });
}

/**
 * Mide el bisel realmente pintado a partir de una captura de la página. Cuenta
 * píxeles completos (cuantización de Chromium) y cobertura ponderada (token
 * continuo). No mueve el ratón ni altera el estado de la UI.
 */
async function samplePaintedBevel(
  page: Page,
  probes: readonly PixelProbe[],
): Promise<PaintedBevel[]> {
  const shot = await page.screenshot({ animations: 'disabled' });
  const data = shot.toString('base64');
  return page.evaluate(async ({ imageData, entries }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${imageData}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Sin contexto 2D');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const scaleX = image.width / window.innerWidth;
    const scaleY = image.height / window.innerHeight;
    const bevel = [110, 184, 168] as const;

    const colorAt = (x: number, y: number): [number, number, number] => {
      const index = (y * image.width + x) * 4;
      return [pixels[index], pixels[index + 1], pixels[index + 2]];
    };
    const text = (color: readonly [number, number, number]): string =>
      `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    const distance = (
      a: readonly [number, number, number],
      b: readonly [number, number, number],
    ): number =>
      Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

    return entries.map((probe) => {
      const y = Math.round((probe.rect.top + probe.rect.height / 2) * scaleY);
      // Ventana de ±4 px alrededor del borde: dentro queda el borde base y
      // fuera el crecimiento del pseudo-elemento.
      const edge =
        probe.side === 'left'
          ? Math.floor(probe.rect.left * scaleX)
          : Math.floor(probe.rect.right * scaleX);
      const first = edge - 4;
      const samples: Array<{
        offset: number;
        color: string;
        coverage: number;
      }> = [];
      for (let index = 0; index < 12; index += 1) {
        const x = first + index;
        const color = colorAt(Math.max(0, Math.min(image.width - 1, x)), y);
        samples.push({ offset: x - edge, color: text(color), coverage: 0 });
      }
      const parse = (value: string): [number, number, number] => {
        const match = /rgb\((\d+), (\d+), (\d+)\)/.exec(value);
        if (!match) return [0, 0, 0];
        return [Number(match[1]), Number(match[2]), Number(match[3])];
      };
      const insideBackground =
        probe.side === 'left' ? samples[10].color : samples[1].color;
      const background =
        probe.side === 'left' ? samples[1].color : samples[10].color;
      const inside = parse(insideBackground);
      const outside = parse(background);
      const coverageAgainst = (
        color: readonly [number, number, number],
        bg: readonly [number, number, number],
      ): number => {
        const dx = bevel[0] - bg[0];
        const dy = bevel[1] - bg[1];
        const dz = bevel[2] - bg[2];
        const denominator = dx * dx + dy * dy + dz * dz;
        if (denominator === 0) return 0;
        const t =
          ((color[0] - bg[0]) * dx +
            (color[1] - bg[1]) * dy +
            (color[2] - bg[2]) * dz) /
          denominator;
        const projected: [number, number, number] = [
          bg[0] + t * dx,
          bg[1] + t * dy,
          bg[2] + t * dz,
        ];
        return distance(color, projected) <= 12
          ? Math.min(1, Math.max(0, t))
          : 0;
      };
      let fullPixels = 0;
      let weightedWidth = 0;
      for (const sample of samples) {
        const color = parse(sample.color);
        const coverage = Math.max(
          coverageAgainst(color, inside),
          coverageAgainst(color, outside),
        );
        sample.coverage = coverage;
        if (coverage >= 0.9) fullPixels += 1;
        weightedWidth += coverage;
      }
      return {
        id: probe.id,
        side: probe.side,
        edge,
        y,
        background,
        insideBackground,
        fullPixels,
        weightedWidth,
        pixels: samples,
      };
    });
  }, { imageData: data, entries: probes });
}

/* ------------------------------ panel/figura --------------------------- */

interface PanelLayout {
  readonly frame: Rect;
  readonly panel: Rect;
  readonly body: Rect;
  readonly columns: readonly Rect[];
  readonly rowGaps: readonly number[];
  readonly titles: ReadonlyArray<{ readonly text: string; readonly rect: Rect }>;
  readonly equipmentFigure: Rect;
  readonly equipmentList: Rect;
  readonly head: Rect;
  readonly backpack: ReadonlyArray<{ readonly key: string; readonly rect: Rect }>;
  readonly ground: ReadonlyArray<{ readonly key: string; readonly rect: Rect }>;
  readonly equipment: ReadonlyArray<{ readonly key: string; readonly rect: Rect }>;
  readonly figure: {
    readonly rect: Rect;
    readonly ariaHidden: string | null;
    readonly tabIndex: string | null;
    readonly pointerEvents: string;
    readonly hasHeadNode: boolean;
    readonly hitAtTorsoInside: boolean;
    readonly blocks: ReadonlyArray<{
      readonly className: string;
      readonly rect: Rect;
      readonly hasTabIndex: boolean;
    }>;
  };
  readonly overflow: {
    readonly figure: string;
    readonly figureContainer: string;
    readonly list: string;
    readonly column: string;
    readonly body: string;
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
    const head = panel.querySelector<HTMLElement>('[data-row-key="slot:head"]');
    const equipmentList = panel.querySelector<HTMLElement>('[data-testid="inventory-equipment"]');
    const equipmentFigure =
      panel.querySelector<HTMLElement>('.inventory-equipment-figure');
    const equipmentColumn =
      panel.querySelector<HTMLElement>('.inventory-column-equipment');
    if (
      !body ||
      !figure ||
      !head ||
      !equipmentList ||
      !equipmentFigure ||
      !equipmentColumn
    ) {
      throw new Error('Falta el cuerpo, la figura, el casco o la rejilla');
    }
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
    const columns = [...panel.querySelectorAll<HTMLElement>('.inventory-column')];
    const torso = figure.querySelector<HTMLElement>('.inventory-figure-torso');
    const torsoCenter = torso ? rect(torso) : null;
    const hit = torsoCenter
      ? document.elementFromPoint(
          torsoCenter.left + torsoCenter.width / 2,
          torsoCenter.top + torsoCenter.height / 2,
        )
      : null;
    return {
      frame: rect(frame),
      panel: rect(panel),
      body: rect(body),
      columns: columns.map(rect),
      rowGaps: columns.map((column) =>
        Number.parseFloat(getComputedStyle(column).rowGap),
      ),
      titles: [...panel.querySelectorAll<HTMLElement>('.inventory-section-title')].map(
        (title) => ({ text: title.textContent?.trim() ?? '', rect: rect(title) }),
      ),
      equipmentFigure: rect(equipmentFigure),
      equipmentList: rect(equipmentList),
      head: rect(head),
      backpack: slots('.inventory-backpack .inventory-slot'),
      ground: slots('.inventory-ground .inventory-slot'),
      equipment: slots('.inventory-equipment .inventory-slot'),
      figure: {
        rect: rect(figure),
        ariaHidden: figure.getAttribute('aria-hidden'),
        tabIndex: figure.getAttribute('tabindex'),
        pointerEvents: getComputedStyle(figure).pointerEvents,
        hasHeadNode: panel.querySelector('.inventory-figure-head') !== null,
        hitAtTorsoInside: hit !== null && figure.contains(hit),
        blocks: [...figure.querySelectorAll<HTMLElement>('.inventory-figure-block')].map(
          (block) => ({
            className: block.className,
            rect: rect(block),
            hasTabIndex: block.hasAttribute('tabindex'),
          }),
        ),
      },
      overflow: {
        figure: getComputedStyle(figure).overflow,
        figureContainer: getComputedStyle(equipmentFigure).overflow,
        list: getComputedStyle(equipmentList).overflow,
        column: getComputedStyle(equipmentColumn).overflow,
        body: getComputedStyle(body).overflow,
      },
    };
  });
}

function expectRectClose(actual: Rect, expected: Rect, label: string): void {
  for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
    expect(
      Math.abs(actual[edge] - expected[edge]),
      `${label}: ${edge} (${actual[edge]} vs ${expected[edge]})`,
    ).toBeLessThanOrEqual(1);
  }
}

function expectContained(inner: Rect, outer: Rect, label: string): void {
  expect(inner.left, `${label}: izquierda`).toBeGreaterThanOrEqual(outer.left - 0.5);
  expect(inner.top, `${label}: arriba`).toBeGreaterThanOrEqual(outer.top - 0.5);
  expect(inner.right, `${label}: derecha`).toBeLessThanOrEqual(outer.right + 0.5);
  expect(inner.bottom, `${label}: abajo`).toBeLessThanOrEqual(outer.bottom + 0.5);
}

/* ------------------------------ siluetas ------------------------------- */

interface SlotSnapshot {
  readonly key: string;
  readonly empty: boolean;
  readonly rect: Rect;
  readonly inner: Rect;
  readonly border: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly silhouette: {
    readonly hidden: boolean;
    readonly ariaHidden: string | null;
    readonly pointerEvents: string;
    readonly backgroundColor: string;
    readonly maskImage: string;
    readonly maskPosition: string;
    readonly rect: Rect;
  } | null;
  readonly icon: { readonly hidden: boolean; readonly rect: Rect | null } | null;
}

async function equipmentSlots(page: Page): Promise<SlotSnapshot[]> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!panel) throw new Error('Falta el panel');
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
    return [...panel.querySelectorAll<HTMLElement>(
      '.inventory-column-equipment .inventory-slot',
    )].map((slot) => {
      const style = getComputedStyle(slot);
      const border = {
        top: Number.parseFloat(style.borderTopWidth),
        right: Number.parseFloat(style.borderRightWidth),
        bottom: Number.parseFloat(style.borderBottomWidth),
        left: Number.parseFloat(style.borderLeftWidth),
      };
      const outer = rect(slot);
      const silhouette = slot.querySelector<HTMLElement>('.inventory-slot-silhouette');
      const icon = slot.querySelector<HTMLElement>('.inventory-slot-icon');
      const silhouetteStyle = silhouette ? getComputedStyle(silhouette) : null;
      return {
        key: slot.dataset.rowKey ?? '',
        empty: slot.dataset.empty === 'true',
        rect: outer,
        inner: {
          left: outer.left + border.left,
          top: outer.top + border.top,
          right: outer.right - border.right,
          bottom: outer.bottom - border.bottom,
          width: outer.width - border.left - border.right,
          height: outer.height - border.top - border.bottom,
        },
        border,
        silhouette:
          silhouette && silhouetteStyle
            ? {
                hidden: silhouette.hidden,
                ariaHidden: silhouette.getAttribute('aria-hidden'),
                pointerEvents: silhouetteStyle.pointerEvents,
                backgroundColor: silhouetteStyle.backgroundColor,
                maskImage: silhouetteStyle.maskImage,
                maskPosition: silhouette.style.maskPosition,
                rect: rect(silhouette),
              }
            : null,
        icon: icon ? { hidden: icon.hidden, rect: rect(icon) } : null,
      };
    });
  });
}

function expectedMaskPosition(rect: { readonly x: number; readonly y: number }): string {
  const x = rect.x === 0 ? '0' : `-${rect.x}`;
  const y = rect.y === 0 ? '0' : `-${rect.y}`;
  return `calc(var(--ui-unit) * ${x}) calc(var(--ui-unit) * ${y})`;
}

function expectSameGeometry(
  before: readonly SlotSnapshot[],
  after: readonly SlotSnapshot[],
  label: string,
): void {
  expect(after.map((slot) => slot.key), `${label}: claves`).toEqual(
    before.map((slot) => slot.key),
  );
  for (const [index, slot] of after.entries()) {
    expectRectClose(slot.rect, before[index].rect, `${label}: ${slot.key}`);
    expect(slot.border, `${label}: ${slot.key} bisel`).toEqual(before[index].border);
  }
}

/* -------------------------------- cursor ------------------------------- */

interface CursorSnapshot {
  readonly selectedKey: string;
  readonly activeKey: string | null;
  readonly line: number;
  readonly bevel: number;
  readonly cursor: Rect;
  readonly slot: Rect | null;
  readonly cursorHidden: boolean;
  readonly ariaHidden: string | null;
  readonly tabIndex: string | null;
  readonly pointerEvents: string;
  readonly backgroundColor: string;
  readonly backgroundImage: string;
  readonly borderTopWidth: number;
  readonly borderTopColor: string;
  readonly transitionProperty: string;
  readonly transitionDuration: string;
  readonly transform: string;
  readonly rowAtCenter: string | null;
  readonly slotAriaCurrent: string | null;
  readonly slotTabIndex: string | null;
  readonly cursorZ: number | null;
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
    const slot = panel.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(key)}"]`);
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
    const style = getComputedStyle(cursor);
    const box = rect(cursor);
    const atCenter = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    const active = document.activeElement;
    return {
      selectedKey: key,
      activeKey:
        active instanceof HTMLElement
          ? (active.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null)
          : null,
      line: Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ui-line'),
      ),
      bevel: slot
        ? Number.parseFloat(getComputedStyle(slot, '::before').outlineWidth)
        : 0,
      cursor: box,
      slot: slot ? rect(slot) : null,
      cursorHidden: cursor.hidden,
      ariaHidden: cursor.getAttribute('aria-hidden'),
      tabIndex: cursor.getAttribute('tabindex'),
      pointerEvents: style.pointerEvents,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderTopWidth: Number.parseFloat(style.borderTopWidth),
      borderTopColor: style.borderTopColor,
      transitionProperty: style.transitionProperty,
      transitionDuration: style.transitionDuration,
      transform: style.transform,
      rowAtCenter:
        atCenter instanceof Element
          ? (atCenter.closest<HTMLElement>('[data-row-key]')?.dataset.rowKey ?? null)
          : null,
      slotAriaCurrent: slot?.getAttribute('aria-current') ?? null,
      slotTabIndex: slot?.getAttribute('tabindex') ?? null,
      cursorZ:
        style.zIndex === 'auto' ? null : Number.parseInt(style.zIndex, 10),
    };
  });
}

interface Layers {
  readonly cursor: { readonly zIndex: number | null; readonly position: string };
  readonly submenu: { readonly zIndex: number | null; readonly position: string };
  readonly content: ReadonlyArray<{ readonly selector: string; readonly zIndex: number | null }>;
}

async function cursorLayers(page: Page): Promise<Layers> {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    if (!panel) throw new Error('Falta el panel');
    const info = (selector: string) => {
      const element = panel.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Falta ${selector}`);
      const style = getComputedStyle(element);
      return {
        selector,
        zIndex:
          style.zIndex === 'auto' ? null : Number.parseInt(style.zIndex, 10),
        position: style.position,
      };
    };
    return {
      cursor: info('[data-testid="inventory-cursor"]'),
      submenu: info('[data-testid="inventory-submenu"]'),
      content: [
        '.inventory-column-equipment',
        '.inventory-column-backpack',
        '.inventory-column-right',
        '.inventory-section-title',
        '.inventory-slot',
        '.inventory-figure',
      ].map(info),
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
    cursor.__audit = { runs: 0, properties: [], elapsed: [] };
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

function expectCursorAroundSlot(snapshot: CursorSnapshot, label: string): void {
  expect(snapshot.slot, `${label}: falta el slot`).not.toBeNull();
  const slot = snapshot.slot!;
  const cursor = snapshot.cursor;
  const grow = Math.max(0, snapshot.bevel - snapshot.line);
  const outset = grow + snapshot.borderTopWidth;
  expect(Math.abs(cursor.left - (slot.left - outset)), `${label}: borde izquierdo`).toBeLessThanOrEqual(0.7);
  expect(Math.abs(cursor.top - (slot.top - outset)), `${label}: borde superior`).toBeLessThanOrEqual(0.7);
  expect(Math.abs(cursor.right - (slot.right + outset)), `${label}: borde derecho`).toBeLessThanOrEqual(0.7);
  expect(Math.abs(cursor.bottom - (slot.bottom + outset)), `${label}: borde inferior`).toBeLessThanOrEqual(0.7);
  expect(Math.abs(cursor.width - (slot.width + outset * 2)), `${label}: ancho`).toBeLessThanOrEqual(0.7);
  expect(Math.abs(cursor.height - (slot.height + outset * 2)), `${label}: alto`).toBeLessThanOrEqual(0.7);
}

function expectCursorStyle(snapshot: CursorSnapshot, label: string): void {
  expect(snapshot.cursorHidden, `${label}: cursor oculto`).toBe(false);
  expect(snapshot.ariaHidden, `${label}: aria-hidden`).toBe('true');
  expect(snapshot.tabIndex, `${label}: cursor tabulable`).toBeNull();
  expect(snapshot.pointerEvents, `${label}: pointer-events`).toBe('none');
  expect(snapshot.backgroundColor, `${label}: centro opaco`).toBe('rgba(0, 0, 0, 0)');
  expect(snapshot.backgroundImage, `${label}: fondo con imagen`).toBe('none');
  expect(snapshot.borderTopColor, `${label}: color`).toBe('rgb(252, 255, 192)');
  expect(
    Math.abs(snapshot.borderTopWidth - snapshot.line * 4),
    `${label}: borde fuera de 4× línea`,
  ).toBeLessThanOrEqual(1);
  const duration = Number.parseFloat(snapshot.transitionDuration) * 1000;
  expect(duration, `${label}: duración`).toBeGreaterThanOrEqual(140);
  expect(duration, `${label}: duración`).toBeLessThanOrEqual(160);
  expect(snapshot.transitionProperty, `${label}: propiedad`).toContain('transform');
  expect(snapshot.transform, `${label}: sin transform`).not.toBe('none');
  expect(snapshot.activeKey, `${label}: foco DOM fuera del slot`).toBe(
    snapshot.selectedKey,
  );
  expect(snapshot.slotAriaCurrent, `${label}: aria-current`).toBe('true');
  expect(snapshot.slotTabIndex, `${label}: tabindex`).toBe('0');
}

interface MapCursor {
  readonly borderTopWidth: number;
  readonly color: string;
  readonly rect: Rect;
  readonly hidden: boolean;
}

async function mapCursor(page: Page): Promise<MapCursor> {
  return page.evaluate(() => {
    const cursor = document.querySelector<HTMLElement>('[data-testid="cursor"]');
    if (!cursor) throw new Error('Falta el cursor del mapa');
    const style = getComputedStyle(cursor);
    const box = cursor.getBoundingClientRect();
    return {
      borderTopWidth: Number.parseFloat(style.borderTopWidth),
      color: style.borderTopColor,
      hidden: cursor.hidden,
      rect: {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      },
    };
  });
}

/* -------------------------------- TESTS -------------------------------- */

for (const viewport of VIEWPORTS) {
  const suffix = `${viewport.width}x${viewport.height}`;

  test.describe(`REQ-033 v7 QA visual a ${suffix}`, () => {
    test('bisel: token, peso pintado, interior y relieve sin solapes', async ({
      page,
    }, testInfo) => {
      const scenario: PanelScenarioOptions = {
        inventory: ['axe', 'dagger'],
        ground: FOUR_GROUND,
      };
      await openHud(page, panelState(scenario), viewport);
      const mapBefore = await mapCursor(page);
      const tokensBefore = await bevelTokens(page);
      const frameBefore = (await panelLayout(page)).frame;
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await nextFrames(page);
      const tokens = await bevelTokens(page);
      const panelBefore = await panelLayout(page);
      expectRectClose(panelBefore.frame, frameBefore, 'apertura: marco');

      await resetLayoutShifts(page);
      await selectPanelRow(page, 'backpack:0');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      const shifts = await expectNoForbiddenShifts(page, 'navegación');

      const boxes = await measureBoxes(page, [
        ['hud', '[data-testid="hud-left"]'],
        ['zona', '[data-testid="hud-zone-character"]'],
        ['columna', '.inventory-column-equipment'],
        ['slot', '[data-row-key="slot:head"]'],
        ['boton', '[data-testid="inventory-close"]'],
      ]);

      await page.evaluate(() =>
        document.documentElement.style.setProperty(
          '--ui-bevel',
          'var(--ui-line)',
        ),
      );
      await nextFrames(page);
      const oneX = await measureBoxes(page, [
        ['hud', '[data-testid="hud-left"]'],
        ['zona', '[data-testid="hud-zone-character"]'],
        ['columna', '.inventory-column-equipment'],
        ['slot', '[data-row-key="slot:head"]'],
        ['boton', '[data-testid="inventory-close"]'],
      ]);
      await page.evaluate(() =>
        document.documentElement.style.removeProperty('--ui-bevel'),
      );
      await nextFrames(page);
      const twoX = await measureBoxes(page, [
        ['hud', '[data-testid="hud-left"]'],
        ['zona', '[data-testid="hud-zone-character"]'],
        ['columna', '.inventory-column-equipment'],
        ['slot', '[data-row-key="slot:head"]'],
        ['boton', '[data-testid="inventory-close"]'],
      ]);

      const probes = await probeRects(page);
      const painted = await samplePaintedBevel(page, probes);

      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-panel')).toBeHidden();
      const mapAfter = await mapCursor(page);

      await writeLog(
        testInfo,
        'bisel.json',
        {
          viewport: suffix,
          tokensBefore,
          tokens,
          boxes,
          oneX,
          twoX,
          painted,
          shifts,
          panel: {
            frame: panelBefore.frame,
            panel: panelBefore.panel,
            body: panelBefore.body,
            columns: panelBefore.columns,
            titles: panelBefore.titles,
          },
          mapCursor: { before: mapBefore, after: mapAfter },
        },
        suffix,
      );
      await screenshot(page, `bisel-hud-${suffix}`, testInfo);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await screenshot(page, `bisel-panel-${suffix}`, testInfo);

      expect(tokens.line).toBeGreaterThan(0);
      expect(tokens.bevelToken, 'token de bisel').toMatch(/\*\s*2\)/);
      expect(Math.abs(tokens.bevel - tokens.line * 2)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(tokensBefore.line - tokens.line),
        'la escala cambia al abrir el panel',
      ).toBeLessThanOrEqual(0.001);

      expect(boxes).toHaveLength(oneX.length);
      oneX.forEach((before, index) => {
        const after = twoX[index];
        expect(after.pseudoActive, `${after.name}: sin pseudo de bisel`).toBe(true);
        expectRectClose(after.outer, before.outer, `${after.name}: caja`);
        for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
          expect(
            Math.abs(after.inner[edge] - before.inner[edge]),
            `${after.name}: interior ${edge}`,
          ).toBeLessThanOrEqual(1.5);
        }
        expect(
          after.paintedLeft,
          `${after.name}: el bisel no crece hacia fuera`,
        ).toBeLessThan(after.outer.left + 0.01);
        expect(
          after.bevelWidth,
          `${after.name}: bisel menor que la línea`,
        ).toBeGreaterThan(tokens.line - 0.5);
      });

      expect(painted).toHaveLength(2);
      for (const probe of painted) {
        const expectedFull = Math.floor(tokens.line * 2);
        expect(
          probe.fullPixels,
          `${probe.id}: píxeles completos de bisel`,
        ).toBeGreaterThanOrEqual(expectedFull);
        expect(
          Math.abs(probe.weightedWidth - tokens.line * 2),
          `${probe.id}: cobertura ponderada frente al token`,
        ).toBeLessThanOrEqual(0.8);
      }

      const ordered = [...panelBefore.columns].sort((a, b) => a.left - b.left);
      for (let index = 0; index + 1 < ordered.length; index += 1) {
        expect(
          ordered[index + 1].left,
          'columnas del panel solapadas',
        ).toBeGreaterThanOrEqual(ordered[index].right - 0.5);
      }
      expectContained(panelBefore.body, panelBefore.panel, 'cuerpo dentro del panel');
      for (const column of panelBefore.columns) {
        expectContained(column, panelBefore.body, 'columna dentro del cuerpo');
      }
      expect(
        Math.abs(mapAfter.borderTopWidth - mapBefore.borderTopWidth),
        'el ancho del cursor del mapa cambió',
      ).toBeLessThanOrEqual(0.01);
      expect(mapAfter.color).toBe('rgb(252, 255, 192)');
      expect(mapBefore.color).toBe('rgb(252, 255, 192)');
      expect(mapAfter.rect).toEqual(mapBefore.rect);
    });

    test('listas verticales en ambos HUD con y sin maná o traits', async ({
      page,
    }, testInfo) => {
      const log: unknown[] = [];

      const state = roomState([warrior()]);
      await openHud(page, state, viewport);
      const player = state.players[0];
      await expect(page.getByTestId('hud-stats').locator('li')).toHaveText(
        unitLines(player),
      );
      await expect(
        page.getByTestId('hud-weapon-stats').locator('li'),
      ).toHaveText(weaponLines('sword'));
      await expect(page.getByTestId('hud-magic-row')).toBeHidden();
      await expect(page.getByTestId('hud-mana-row')).toBeHidden();
      await expect(page.getByTestId('hud-traits')).toBeHidden();
      for (const testId of ['hud-stats', 'hud-weapon-stats']) {
        await expectVerticalList(page, testId);
      }
      await screenshot(page, `listas-hud-sin-${suffix}`, testInfo);
      log.push({
        scene: 'hud-sin-mana-ni-traits',
        viewport: suffix,
        stats: await listText(page, 'hud-stats'),
        weapon: await listText(page, 'hud-weapon-stats'),
      });

      await injectTraits(page, 'sword', SWORD_TRAITS);
      await expect(page.getByTestId('hud-traits')).toBeVisible();
      const swordTraits = SWORD_TRAITS.map(
        (trait) => `${trait.id}: ${trait.description}`,
      );
      await expect(page.getByTestId('hud-traits').locator('li')).toHaveText(
        swordTraits,
      );
      await expectVerticalList(page, 'hud-traits');
      await screenshot(page, `listas-hud-con-${suffix}`, testInfo);
      log.push({
        scene: 'hud-con-traits',
        viewport: suffix,
        traits: await listText(page, 'hud-traits'),
      });

      await openPanelScenario(
        page,
        { inventory: ['axe'] },
        viewport,
      );
      await injectTraits(page, 'sword', SWORD_TRAITS);
      await injectTraits(page, 'axe', AXE_TRAITS);
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
        await expectVerticalList(page, testId);
      }
      await screenshot(page, `listas-ficha-${suffix}`, testInfo);
      log.push({
        scene: 'ficha',
        viewport: suffix,
        selected: await listText(page, 'hud-panel-selected-stats'),
        selectedTraits: await listText(page, 'hud-panel-selected-traits'),
        equipped: await listText(page, 'hud-panel-equipped-stats'),
        equippedTraits: await listText(page, 'hud-panel-equipped-traits'),
      });

      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-panel')).toBeHidden();
      await openHud(page, roomState([mage()]), viewport);
      await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();
      await expect(page.getByTestId('hud-magic-row')).toBeVisible();
      await expect(page.getByTestId('hud-mana-row')).toBeVisible();
      await expect(page.getByTestId('hud-traits')).toBeHidden();
      await expect(page.getByTestId('hud-player-magic')).toHaveText('4');
      await expect(page.getByTestId('hud-player-mana')).toHaveText('16/16');
      await screenshot(page, `listas-hud-maga-${suffix}`, testInfo);
      log.push({
        scene: 'hud-maga',
        viewport: suffix,
        magic: await page.getByTestId('hud-magic-row').innerText(),
        mana: await page.getByTestId('hud-mana-row').innerText(),
      });

      await writeLog(testInfo, 'listas.json', log, suffix);
    });

    test('panel: columnas arriba, casco primero y figura sin cabeza', async ({
      page,
    }, testInfo) => {
      await openPanelScenario(
        page,
        { inventory: FULL_BACKPACK, ground: FOUR_GROUND },
        viewport,
      );
      const layout = await panelLayout(page);
      const legs = layout.figure.blocks.filter((block) =>
        block.className.includes('inventory-figure-leg'),
      );
      const legBottom = Math.max(...legs.map((leg) => leg.rect.bottom));
      const legOverhang = legBottom - layout.figure.rect.bottom;
      await writeLog(
        testInfo,
        'panel.json',
        {
          viewport: suffix,
          layout,
          legOverhang,
          legs,
        },
        suffix,
      );
      await screenshot(page, `panel-arriba-${suffix}`, testInfo);

      expect(layout.columns).toHaveLength(3);
      expect(layout.titles).toHaveLength(3);
      expect(layout.titles.map((title) => title.text.split(/\s+/)[0])).toEqual([
        'Equipo',
        'Bolsa',
        'Suelo',
      ]);
      const titleTop = layout.titles[0].rect.top;
      const titleBottom = layout.titles[0].rect.bottom;
      layout.titles.forEach((title, index) => {
        expect(
          Math.abs(title.rect.top - titleTop),
          `título ${index + 1} desalineado`,
        ).toBeLessThanOrEqual(1);
        expect(
          layout.columns[index].top,
          `columna ${index + 1} no arranca arriba`,
        ).toBeLessThanOrEqual(title.rect.top + 1);
      });

      const firstRows = [
        { rect: layout.head, column: 0 },
        { rect: layout.backpack[0].rect, column: 1 },
        { rect: layout.ground[0].rect, column: 2 },
      ];
      for (const row of firstRows) {
        expect(
          Math.abs(row.rect.top - (titleBottom + layout.rowGaps[row.column])),
          `columna ${row.column + 1} centrada o con hueco extra`,
        ).toBeLessThanOrEqual(1);
        expect(
          row.rect.top,
          `columna ${row.column + 1} solapa el título`,
        ).toBeGreaterThanOrEqual(titleBottom - 1);
      }
      expect(
        Math.abs(layout.head.top - layout.equipmentFigure.top),
        'el casco no abre la figura',
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(layout.head.top - layout.equipmentList.top),
        'el casco no abre la rejilla',
      ).toBeLessThanOrEqual(1);

      expect(layout.figure.hasHeadNode, 'queda el nodo de cabeza').toBe(false);
      expect(layout.figure.ariaHidden, 'figura sin aria-hidden').toBe('true');
      expect(layout.figure.tabIndex, 'figura tabulable').toBeNull();
      expect(layout.figure.pointerEvents, 'figura con puntero').toBe('none');
      expect(layout.figure.hitAtTorsoInside, 'la figura captura el puntero').toBe(
        false,
      );
      expect(layout.figure.blocks).toHaveLength(5);
      for (const part of ['torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right']) {
        expect(
          layout.figure.blocks.some((block) =>
            block.className.includes(`inventory-figure-${part}`),
          ),
          `falta ${part}`,
        ).toBe(true);
      }
      for (const block of layout.figure.blocks) {
        expect(block.className, 'queda la cabeza').not.toContain(
          'inventory-figure-head',
        );
        expect(block.rect.top, 'bloque por encima del casco').toBeGreaterThanOrEqual(
          layout.head.top - 1,
        );
        expect(block.hasTabIndex, 'bloque de figura con tabindex').toBe(false);
      }

      // Las piernas deben verse por debajo de la caja de cinco filas. No basta
      // con registrar el desborde: una regresión que las recorte debe fallar.
      expect(legs, 'faltan las dos piernas').toHaveLength(2);
      for (const leg of legs) {
        expect(
          leg.rect.bottom - layout.figure.rect.bottom,
          'la pierna queda dentro de la caja de cinco filas',
        ).toBeGreaterThan(2);
      }
      expect(legOverhang, 'las piernas no desbordan la caja').toBeGreaterThan(2);
      for (const key of [
        'figure',
        'figureContainer',
        'list',
        'column',
      ] as const) {
        expect(
          layout.overflow[key],
          `${key} recorta las piernas (${layout.overflow[key]})`,
        ).not.toMatch(/hidden|clip/);
      }
      expect(
        legBottom,
        'el cuerpo del panel recorta las piernas',
      ).toBeLessThanOrEqual(layout.body.bottom);

      const allSlots = [...layout.equipment, ...layout.backpack, ...layout.ground];
      const side = allSlots[0].rect.width;
      for (const slot of allSlots) {
        expect(
          Math.abs(slot.rect.width - side),
          `${slot.key} con otro tamaño`,
        ).toBeLessThanOrEqual(0.5);
        expect(
          Math.abs(slot.rect.width - slot.rect.height),
          `${slot.key} no es cuadrado`,
        ).toBeLessThanOrEqual(0.5);
      }
    });

    test('siluetas: ocho vacíos, lleno y reaparición sin mover la rejilla', async ({
      page,
    }, testInfo) => {
      await openPanelScenario(
        page,
        {
          inventory: ['axe'],
          weaponId: null,
          armorId: null,
          shieldId: null,
        },
        viewport,
      );

      const empty = await equipmentSlots(page);
      await screenshot(page, `siluetas-vacias-${suffix}`, testInfo);

      expect(empty).toHaveLength(EQUIPMENT_SLOTS.length);
      expect(empty.map((slot) => slot.key)).toEqual(
        EQUIPMENT_SLOTS.map((slot) => `slot:${slot}`),
      );
      expect(empty.every((slot) => slot.empty)).toBe(true);
      for (const slot of empty) {
        const equipmentSlot = slot.key.slice('slot:'.length) as keyof typeof EQUIPMENT_SILHOUETTES;
        const silhouette = slot.silhouette;
        expect(silhouette, `${slot.key} sin silueta`).not.toBeNull();
        expect(silhouette!.hidden, `${slot.key} oculta`).toBe(false);
        expect(silhouette!.ariaHidden, `${slot.key} aria-hidden`).toBe('true');
        expect(silhouette!.pointerEvents, `${slot.key} puntero`).toBe('none');
        expect(silhouette!.backgroundColor, `${slot.key} color`).toBe(
          'rgb(110, 184, 168)',
        );
        expect(silhouette!.maskImage, `${slot.key} máscara`).toContain('items.png');
        expect(silhouette!.maskPosition, `${slot.key} recorte`).toBe(
          expectedMaskPosition(EQUIPMENT_SILHOUETTES[equipmentSlot].rect),
        );
        expectRectClose(silhouette!.rect, slot.inner, `${slot.key} área interior`);
      }
      await expect(
        page.locator('.inventory-column-backpack .inventory-slot-silhouette'),
      ).toHaveCount(0);
      await expect(
        page.locator('.inventory-ground .inventory-slot-silhouette'),
      ).toHaveCount(0);
      expect(await page.locator('.inventory-slot-silhouette').count()).toBe(
        EQUIPMENT_SLOTS.length,
      );

      await pressPanelAction(page, panelActionTestId('equip', 'backpack:0'));
      await settle(page);
      const filled = await equipmentSlots(page);
      const weapon = filled.find((slot) => slot.key === 'slot:weapon');
      expect(weapon?.empty, 'arma sin equipar').toBe(false);
      expect(weapon?.silhouette?.hidden, 'silueta en slot lleno').toBe(true);
      expect(weapon?.icon?.hidden, 'slot lleno sin sprite').toBe(false);
      expect(
        filled
          .filter((slot) => slot.key !== 'slot:weapon')
          .every((slot) => slot.silhouette?.hidden === false),
        'otra silueta desapareció',
      ).toBe(true);
      expectSameGeometry(empty, filled, 'equipar');
      await screenshot(page, `silueta-llena-${suffix}`, testInfo);

      await pressPanelAction(page, panelActionTestId('unequip', 'slot:weapon'));
      await settle(page);
      const unequipped = await equipmentSlots(page);
      const emptyWeapon = unequipped.find((slot) => slot.key === 'slot:weapon');
      expect(emptyWeapon?.empty, 'arma no desequipada').toBe(true);
      expect(emptyWeapon?.silhouette?.hidden, 'la silueta no reaparece').toBe(false);
      expect(emptyWeapon?.icon?.hidden, 'hueco vacío con sprite').toBe(true);
      expect(emptyWeapon?.silhouette?.maskPosition).toBe(
        expectedMaskPosition(EQUIPMENT_SILHOUETTES.weapon.rect),
      );
      expectSameGeometry(empty, unequipped, 'desequipar');
      await screenshot(page, `silueta-reaparece-${suffix}`, testInfo);

      await writeLog(
        testInfo,
        'siluetas.json',
        { viewport: suffix, empty, filled, unequipped },
        suffix,
      );
    });

    test('cursor: color, capas y transición en todas las direcciones', async ({
      page,
    }, testInfo) => {
      await openHud(
        page,
        panelState({ inventory: FULL_BACKPACK, ground: FOUR_GROUND }),
        viewport,
      );
      const mapBeforePanel = await mapCursor(page);
      await startLayoutShiftAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await nextFrames(page);

      const initial = await cursorSnapshot(page);
      expectCursorStyle(initial, `${suffix} apertura`);
      expectCursorAroundSlot(initial, `${suffix} apertura`);
      expect(initial.rowAtCenter, 'el cursor tapa el slot').toBe(initial.selectedKey);

      await selectPanelRow(page, 'backpack:0');
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      const horizontalAudit = await readCursorAudit(page);
      const horizontal = await cursorSnapshot(page);
      expect(horizontalAudit.runs, 'horizontal sin transición').toBeGreaterThan(0);
      expect(horizontalAudit.properties).toContain('transform');
      expect(horizontal.selectedKey).toBe('backpack:1');
      expectCursorStyle(horizontal, `${suffix} horizontal`);
      expectCursorAroundSlot(horizontal, `${suffix} horizontal`);

      await resetCursorAudit(page);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      const verticalAudit = await readCursorAudit(page);
      const vertical = await cursorSnapshot(page);
      expect(verticalAudit.runs, 'vertical sin transición').toBeGreaterThan(0);
      expect(verticalAudit.properties).toContain('transform');
      expect(vertical.selectedKey).toBe('backpack:3');
      expectCursorStyle(vertical, `${suffix} vertical`);
      expectCursorAroundSlot(vertical, `${suffix} vertical`);

      await selectPanelRow(page, 'backpack:0');
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);
      const crossAudit = await readCursorAudit(page);
      const cross = await cursorSnapshot(page);
      expect(crossAudit.runs, 'cambio de columna sin transición').toBeGreaterThan(
        0,
      );
      expect(crossAudit.properties).toContain('transform');
      expect(cross.selectedKey.startsWith('slot:')).toBe(true);
      expectCursorStyle(cross, `${suffix} columna`);
      expectCursorAroundSlot(cross, `${suffix} columna`);
      await screenshot(page, `cursor-panel-${suffix}`, testInfo);

      await selectPanelRow(page, 'backpack:0');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('inventory-submenu')).toBeVisible();
      const layers = await cursorLayers(page);
      const submenuCursor = await cursorSnapshot(page);
      expectCursorAroundSlot(submenuCursor, `${suffix} submenú`);
      await screenshot(page, `cursor-submenu-${suffix}`, testInfo);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-submenu')).toBeHidden();

      const shifts = await expectNoForbiddenShifts(page, 'navegación');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('inventory-panel')).toBeHidden();
      const mapAfterPanel = await mapCursor(page);
      await screenshot(page, `cursor-mapa-${suffix}`, testInfo);

      await writeLog(
        testInfo,
        'cursor-movimiento.json',
        {
          viewport: suffix,
          initial,
          horizontal,
          vertical,
          cross,
          submenuCursor,
          layers,
          screenshots: {
            panelCursor: `cursor-panel-${suffix}.png`,
            submenu: `cursor-submenu-${suffix}.png`,
            mapCursor: `cursor-mapa-${suffix}.png`,
          },
          audits: { horizontalAudit, verticalAudit, crossAudit },
          shifts,
          mapCursor: { before: mapBeforePanel, after: mapAfterPanel },
        },
        suffix,
      );

      expect(layers.cursor.zIndex).not.toBeNull();
      expect(layers.submenu.zIndex).not.toBeNull();
      expect(layers.submenu.zIndex!).toBeGreaterThan(layers.cursor.zIndex!);
      for (const content of layers.content) {
        expect(
          content.zIndex,
          `${content.selector} queda por encima del cursor`,
        ).toBeNull();
      }
      expect(
        Math.abs(mapAfterPanel.borderTopWidth - mapBeforePanel.borderTopWidth),
        'el cursor del mapa cambió de grosor',
      ).toBeLessThanOrEqual(0.01);
      expect(mapAfterPanel.color).toBe('rgb(252, 255, 192)');
      expect(mapAfterPanel.rect).toEqual(mapBeforePanel.rect);
    });

    test('cursor: instantáneo al abrir, resize, scroll, modelo y reducido', async ({
      page,
    }, testInfo) => {
      const panelOptions: PanelScenarioOptions = {
        inventory: FULL_BACKPACK,
        ground: FOUR_GROUND,
      };
      await openHud(page, panelState(panelOptions), viewport);
      await resetCursorAudit(page);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await page.waitForTimeout(200);
      const openAudit = await readCursorAudit(page);
      const opened = await cursorSnapshot(page);
      expect(openAudit.runs, 'abrir el panel no debe animar').toBe(0);
      expectCursorAroundSlot(opened, `${suffix} apertura instantánea`);

      await selectPanelRow(page, 'backpack:0');
      await page.waitForTimeout(200);
      await resetCursorAudit(page);
      await page.setViewportSize(
        viewport.width === 900
          ? { width: 1000, height: 720 }
          : { width: 1100, height: 720 },
      );
      await page.waitForTimeout(200);
      const resizeAudit = await readCursorAudit(page);
      const resized = await cursorSnapshot(page);
      expect(resizeAudit.runs, 'resize debe ser instantáneo').toBe(0);
      expectCursorAroundSlot(resized, `${suffix} resize`);

      await page.setViewportSize(viewport);
      await nextFrames(page);
      await selectPanelRow(page, 'backpack:0');
      await page.waitForTimeout(200);
      await focusPanelAction(page, panelActionTestId('equip', 'backpack:0'));
      await resetCursorAudit(page);
      await page.keyboard.press('Enter');
      await settle(page);
      const modelAudit = await readCursorAudit(page);
      const updated = await cursorSnapshot(page);
      expect(modelAudit.runs, 'actualizar el modelo debe ser instantáneo').toBe(0);
      expect(updated.selectedKey).toBe('slot:weapon');
      expect(updated.activeKey).toBe('slot:weapon');
      expectCursorAroundSlot(updated, `${suffix} modelo`);

      await openHud(
        page,
        panelState({
          inventory: FULL_BACKPACK,
          ground: Array.from({ length: 40 }, (_value, index) => FOUR_GROUND[index % 4]),
        }),
        viewport,
      );
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
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
      const scrolled = await cursorSnapshot(page);
      expect(scrollAudit.runs, 'el scroll debe ser instantáneo').toBe(0);
      expectCursorAroundSlot(scrolled, `${suffix} scroll`);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openHud(page, panelState(panelOptions), viewport);
      await page.keyboard.press('i');
      await expect(page.getByTestId('inventory-panel')).toBeVisible();
      await selectPanelRow(page, 'backpack:0');
      await resetCursorAudit(page);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(160);
      const reducedAudit = await readCursorAudit(page);
      const reduced = await cursorSnapshot(page);
      expect(reducedAudit.runs, 'movimiento reducido no debe animar').toBe(0);
      expect(reduced.selectedKey).toBe('backpack:1');
      expect(Number.parseFloat(reduced.transitionDuration)).toBe(0);
      expectCursorAroundSlot(reduced, `${suffix} reducido`);
      await screenshot(page, `cursor-reducido-${suffix}`, testInfo);

      await writeLog(
        testInfo,
        'cursor-instantaneo.json',
        {
          viewport: suffix,
          opened,
          resized,
          updated,
          scrolled,
          scrollTop,
          reduced,
          audits: { openAudit, resizeAudit, modelAudit, scrollAudit, reducedAudit },
        },
        suffix,
      );
    });
  });
}

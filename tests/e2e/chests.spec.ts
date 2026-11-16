import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bestPowerBySlot, TRAIT_PIECE_IDS } from '../../src/game/chests';
import { createInitialState } from '../../src/game/engine';
import { ITEMS, powerScore, type ItemId } from '../../src/game/equipment';
import { roomAt } from '../../src/game/map';
import type { Container } from '../../src/game/inventory';
import type { PlayerConfig } from '../../src/game/config';
import { readSaveFiles } from '../../src/game/save';
import type { GameSnapshot } from '../../src/host/debug';
import { readSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import {
  expectNoForbiddenShifts,
  moveCursorTo,
  panelActionTestId,
  pressPanelAction,
  resetLayoutShifts,
  selectPanelRow,
  settle,
  snapshot,
  startLayoutShiftAudit,
  walkTo,
} from './support';

/**
 * TASK-0171: ciclo completo de cofres generados en una partida nueva real
 * (REQ-020 R-001/R-003/R-004/R-005/R-010/R-011/R-012 y T-007/T-008).
 *
 * La semilla 295 genera, con el generador por defecto, un cofre en la sala
 * contigua al spawn: el jugador arranca en (13,5) y el cofre está en (13,9),
 * con (13,8) como casilla adyacente. Las capturas van a `<spec>/screenshots/`
 * con `E2E_ARTIFACTS_DIR`.
 */
const SEED = 295;
const ARCHETYPES: readonly PlayerConfig['archetypeId'][] = [
  'warrior',
  'barbarian',
  'rogue',
  'archer',
  'mage',
  'cleric',
];

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<string> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
  return path;
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

/** Arranca una partida nueva desde el menú con una semilla fija y un jugador. */
async function startNewGame(page: Page, seed: number): Promise<GameSnapshot> {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await page.getByTestId('step1-players').selectOption('1');
  await page.getByTestId('step1-seed').fill(String(seed));
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.getByTestId('summary-start').click();
  await page.waitForFunction(
    (expected) => {
      const current = window.__game?.snapshot();
      return Boolean(
        current?.assetsLoaded &&
          current.config?.seed === expected &&
          current.config.players.length === 1,
      );
    },
    seed,
  );
  const started = await settle(page);
  // El aviso de ronda no debe tapar la captura del HUD del cofre.
  await expect(page.getByTestId('feedback-banner')).toBeHidden();
  return started;
}

/** Casilla de suelo adyacente al cofre, preferentemente al norte. */
function approachTile(
  snap: GameSnapshot,
  chest: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    const x = chest.x + dx;
    const y = chest.y + dy;
    if (x < 0 || y < 0 || x >= snap.grid.width || y >= snap.grid.height) continue;
    if (snap.grid.tiles[y * snap.grid.width + x] !== 'floor') continue;
    return { x, y };
  }
  throw new Error(`El cofre (${chest.x},${chest.y}) no tiene casilla de suelo adyacente`);
}

interface ReachedChest {
  readonly chest: GameSnapshot['containers'][number];
  readonly approach: { x: number; y: number };
}

/**
 * Lleva al jugador a una casilla adyacente al primer cofre cerrado con
 * comandos reales y deja el cursor sobre el cofre. No inyecta estado ni
 * teletransporta.
 */
async function reachChest(page: Page): Promise<ReachedChest> {
  const before = await snapshot(page);
  const chest = before.containers.find(
    (container) => container.kind === 'chest' && container.opened === false,
  );
  if (!chest) throw new Error('La partida nueva no generó ningún cofre cerrado');
  const approach = approachTile(before, chest);
  await walkTo(page, approach.x, approach.y);
  await moveCursorTo(page, chest.x, chest.y);
  return { chest, approach };
}

function chestOf(
  snap: GameSnapshot,
  id = 'chest-1',
): GameSnapshot['containers'][number] | undefined {
  return snap.containers.find((container) => container.id === id);
}

interface ContainerView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly capacity: number;
  readonly kind: string | null;
  readonly opened: boolean;
  readonly items: ReadonlyArray<{ readonly id: string; readonly itemId: string } | null>;
}

/** Vista comparable de contenedores: sin `lootPolicy`, que es del snapshot. */
function containerView(
  containers: readonly Pick<
    Container,
    'id' | 'x' | 'y' | 'capacity' | 'kind' | 'opened' | 'items'
  >[],
): ContainerView[] {
  return containers.map((container) => ({
    id: container.id,
    x: container.x,
    y: container.y,
    capacity: container.capacity,
    kind: container.kind ?? null,
    opened: container.opened ?? false,
    items: container.items.map((item) =>
      item === null ? null : { id: item.id, itemId: item.itemId },
    ),
  }));
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function rectOf(page: Page, selector: string): Promise<Rect> {
  return page.evaluate((target) => {
    const element = document.querySelector<HTMLElement>(target);
    if (!element) throw new Error(`Falta ${target}`);
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
}

async function nextFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

function expectRectEqual(actual: Rect, expected: Rect, label: string): void {
  expect(actual, label).toEqual(expected);
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

interface BannerStack {
  readonly visible: boolean;
  readonly banner: Rect;
  readonly titles: readonly Rect[];
  readonly bannerZ: number;
  readonly panelZ: number;
  readonly submenuZ: number;
  readonly pointerEvents: string;
}

/**
 * Comprueba que el banner se pinta por encima del panel abierto (20), por
 * debajo del submenú (30), sin cubrir los títulos y sin capturar el input.
 * La geometría y las capas se leen del DOM real, no de la implementación.
 */
async function expectBannerAbovePanel(page: Page, label: string): Promise<void> {
  const stack = await page.evaluate((): BannerStack => {
    const banner = document.querySelector<HTMLElement>(
      '[data-testid="feedback-banner"]',
    );
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    const submenu = document.querySelector<HTMLElement>(
      '[data-testid="inventory-submenu"]',
    );
    if (!banner || !panel || !submenu) throw new Error('Falta banner o panel');
    const rect = (element: HTMLElement): Rect => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return {
      visible: !banner.hidden,
      banner: rect(banner),
      titles: [...panel.querySelectorAll<HTMLElement>('.inventory-section-title')].map(
        rect,
      ),
      bannerZ: Number(getComputedStyle(banner).zIndex),
      panelZ: Number(getComputedStyle(panel).zIndex),
      submenuZ: Number(getComputedStyle(submenu).zIndex),
      pointerEvents: getComputedStyle(banner).pointerEvents,
    };
  });
  expect(stack.visible, `${label}: banner visible`).toBe(true);
  expect(stack.bannerZ, `${label}: banner sobre panel`).toBeGreaterThan(
    stack.panelZ,
  );
  expect(stack.submenuZ, `${label}: submenú sobre banner`).toBeGreaterThan(
    stack.bannerZ,
  );
  expect(stack.pointerEvents, `${label}: banner no bloquea input`).toBe('none');
  for (const [index, title] of stack.titles.entries()) {
    expect(
      rectsOverlap(stack.banner, title),
      `${label}: el banner no tapa el título ${index + 1}`,
    ).toBe(false);
  }
}

/** Con el submenú abierto, el banner vuelve detrás del panel (contexto 20). */
async function expectBannerBehindPanelOnSubmenu(
  page: Page,
  label: string,
): Promise<void> {
  const stack = await page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>(
      '[data-testid="feedback-banner"]',
    );
    const panel = document.querySelector<HTMLElement>(
      '[data-testid="inventory-panel"]',
    );
    const submenu = document.querySelector<HTMLElement>(
      '[data-testid="inventory-submenu"]',
    );
    if (!banner || !panel || !submenu) throw new Error('Falta banner o panel');
    return {
      bannerVisible: !banner.hidden,
      submenuVisible: !submenu.hidden,
      bannerZ: Number(getComputedStyle(banner).zIndex),
      panelZ: Number(getComputedStyle(panel).zIndex),
    };
  });
  expect(stack.bannerVisible, `${label}: banner visible`).toBe(true);
  expect(stack.submenuVisible, `${label}: submenú visible`).toBe(true);
  expect(
    stack.bannerZ,
    `${label}: banner detrás del panel con submenú`,
  ).toBeLessThan(stack.panelZ);
}

function playerConfigs(count: number): PlayerConfig[] {
  return ARCHETYPES.slice(0, count).map((archetypeId, index) => ({
    archetypeId,
    variant: index % 2 === 0 ? 1 : 2,
    name: '',
  }));
}

function firstChestItemKey(
  snap: GameSnapshot,
  containerId = 'chest-1',
): string {
  const chest = chestOf(snap, containerId);
  const item = chest?.items.find((candidate) => candidate !== null);
  if (!chest || !item) throw new Error(`El cofre ${containerId} no tiene objetos`);
  return `chest:${chest.id}:${item.id}`;
}

test.describe('cofres generados: E2E y QA visual', () => {
  test('partida nueva: abre con Espacio, coge todo, deposita y alterna Cofre/Suelo', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 720 });

    const initial = await startNewGame(page, SEED);

    // Coincide con la generación en Node para la misma semilla y el grupo por
    // defecto: el cofre de la partida no está inyectado.
    const generated = createInitialState({ seed: SEED });
    expect(containerView(initial.containers)).toEqual(
      containerView(generated.containers ?? []),
    );
    expect(initial.containers).toHaveLength(1);
    expect(initial.spawns?.roomId).toBeDefined();
    for (const chest of initial.containers) {
      expect(chest.kind).toBe('chest');
      expect(chest.capacity).toBe(4);
      expect(chest.opened).toBe(false);
      expect(chest.items.filter((item) => item !== null)).toHaveLength(2);
      expect(
        initial.grid.tiles[chest.y * initial.grid.width + chest.x],
      ).toBe('floor');
      const room = roomAt(initial.rooms, chest.x, chest.y);
      expect(room).toBeDefined();
      expect(room?.id).not.toBe(initial.spawns?.roomId);
    }

    const { chest, approach } = await reachChest(page);
    const reached = await snapshot(page);
    expect(reached.players[0].x).toBe(approach.x);
    expect(reached.players[0].y).toBe(approach.y);
    await writeLog(testInfo, 'generacion-y-posicion.json', {
      seed: SEED,
      generated: containerView(initial.containers),
      spawnRoom: initial.spawns?.roomId,
      chestRoom: roomAt(initial.rooms, chest.x, chest.y)?.id,
      approach,
    });

    // Cofre cerrado en el HUD: estado y tipo, sin revelar contenido.
    const hudRows = page.getByTestId('hud-cursor-rows');
    await expect(page.getByTestId('hud-cursor-title')).toHaveText('Cofre');
    await expect(hudRows).toContainText('Cerrado');
    await expect(hudRows).not.toContainText('Daga arcana');
    await expect(hudRows).not.toContainText('Maza circular');
    await screenshot(page, 'hud-cofre-cerrado-1280x720', testInfo);

    const beforeOpen = await snapshot(page);
    expect(beforeOpen.players[0].actions.remaining).toBe(
      beforeOpen.players[0].actions.max,
    );

    // Apertura con Espacio: 1 acción, panel en «Cofre» y feedback visible
    // con el panel abierto (sin cerrarlo ni adelantar el reloj).
    const frameBefore = await rectOf(page, '[data-testid="frame"]');
    await startLayoutShiftAudit(page);
    await page.keyboard.press(' ');
    const panel = page.getByTestId('inventory-panel');
    await expect(panel).toBeVisible();
    const banner = page.getByTestId('feedback-banner');
    await expect(banner).toHaveText('Cofre abierto');
    await settle(page);
    await expect(banner).toBeVisible();
    await expectBannerAbovePanel(page, 'apertura 1280');
    const opened = await snapshot(page);
    expect(opened.players[0].actions.remaining).toBe(
      beforeOpen.players[0].actions.remaining - 1,
    );
    expect(chestOf(opened)?.opened).toBe(true);
    expect(opened.lastEvents.some((event) => event.type === 'AlarmRaised')).toBe(
      false,
    );
    expect(opened.players[0].x).toBe(approach.x);
    expect(opened.players[0].y).toBe(approach.y);
    await screenshot(page, 'cofre-apertura-feedback-1280x720', testInfo);
    const openShifts = await expectNoForbiddenShifts(page, 'apertura');
    expectRectEqual(
      await rectOf(page, '[data-testid="frame"]'),
      frameBefore,
      'apertura: marco',
    );
    await expect(page.getByTestId('inventory-right-title')).toHaveText('Cofre');
    await expect(page.getByTestId('inventory-chest-count')).toHaveText('2/4');
    await expect(page.locator('.inventory-chest-item-row')).toHaveCount(2);
    await expect(page.getByTestId('inventory-chest-items')).toBeVisible();
    await expect(page.getByTestId('inventory-ground-section')).toBeHidden();
    await expect(page.getByTestId('inventory-cadavers')).toBeHidden();
    const cofreRect1280 = await rectOf(page, '[data-testid="inventory-panel"]');
    await screenshot(page, 'panel-cofre-1280x720', testInfo);

    // El submenú contextual (dentro del panel) sigue por encima: al abrirlo,
    // el banner vuelve detrás del panel y no lo tapa.
    const takeAllKey = firstChestItemKey(opened);
    await selectPanelRow(page, takeAllKey);
    await page.keyboard.press('Enter');
    const submenu = page.getByTestId('inventory-submenu');
    await expect(submenu).toBeVisible();
    await expectBannerBehindPanelOnSubmenu(page, 'submenú 1280');
    await page.keyboard.press('Escape');
    await expect(submenu).toBeHidden();
    await expectBannerAbovePanel(page, 'submenú cerrado 1280');

    await page.setViewportSize({ width: 900, height: 700 });
    await nextFrame(page);
    await expect(panel).toBeVisible();
    await expect(banner).toBeVisible();
    await expectBannerAbovePanel(page, 'apertura 900');
    await expect(page.getByTestId('inventory-chest-count')).toHaveText('2/4');
    const cofreRect900 = await rectOf(page, '[data-testid="inventory-panel"]');
    await screenshot(page, 'cofre-apertura-feedback-900x700', testInfo);
    await screenshot(page, 'panel-cofre-900x700', testInfo);

    // Coger todo en 900×700 con el banner visible: el input del panel sigue
    // operativo (pointer-events: none) y el banner se pinta sobre el panel.
    await resetLayoutShifts(page);
    await pressPanelAction(page, panelActionTestId('take-all', takeAllKey));
    await expect(banner).toHaveText('+ 2 objetos');
    await settle(page);
    await expect(banner).toBeVisible();
    await expectBannerAbovePanel(page, 'coger todo 900');
    await screenshot(page, 'transferencia-take-all-900x700', testInfo);
    const emptied = await snapshot(page);
    const emptiedChest = chestOf(emptied);
    expect(emptiedChest?.opened).toBe(true);
    expect(emptiedChest?.x).toBe(chest.x);
    expect(emptiedChest?.y).toBe(chest.y);
    expect(emptiedChest?.capacity).toBe(4);
    expect(emptiedChest?.items.every((item) => item === null)).toBe(true);
    expect(emptied.players[0].actions.remaining).toBe(
      opened.players[0].actions.remaining,
    );
    expect(emptied.players[0].mp).toBe(opened.players[0].mp);
    expect(
      emptied.lastEvents.some((event) => event.type === 'AlarmRaised'),
    ).toBe(false);
    await expect(page.locator('.inventory-chest-item-row')).toHaveCount(0);
    await expect(page.getByTestId('inventory-chest-empty')).toHaveText(
      'Cofre vacío',
    );
    await expect(page.getByTestId('inventory-chest-count')).toHaveText('0/4');
    const takeAllShifts = await expectNoForbiddenShifts(page, 'coger todo');
    // Consumir el banner ya capturado antes de la siguiente vista.
    await settle(page);
    await expect(banner).toBeHidden();

    await page.setViewportSize({ width: 1280, height: 720 });
    await nextFrame(page);
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('inventory-chest-empty')).toHaveText(
      'Cofre vacío',
    );
    await screenshot(page, 'cofre-vacio-1280x720', testInfo);

    // Depositar sigue siendo gratis: no gasta acción ni MP.
    const beforeDeposit = await snapshot(page);
    await resetLayoutShifts(page);
    await selectPanelRow(page, 'backpack:0');
    await page.keyboard.press('Enter');
    const depositOption = page.locator(
      '[data-testid="inventory-submenu"] [data-kind="deposit"]',
    );
    await expect(depositOption).toBeVisible();
    await expect(depositOption.locator('.inventory-submenu-cost')).toHaveText(
      'sin coste',
    );
    await page.keyboard.press('Escape');
    await pressPanelAction(page, panelActionTestId('deposit', 'backpack:0'));
    await expect(banner).toContainText('→ Cofre');
    await settle(page);
    await expect(banner).toBeVisible();
    await expectBannerAbovePanel(page, 'depósito 1280');
    await screenshot(page, 'transferencia-deposito-1280x720', testInfo);
    const afterDeposit = await snapshot(page);
    expect(afterDeposit.players[0].actions.remaining).toBe(
      beforeDeposit.players[0].actions.remaining,
    );
    expect(afterDeposit.players[0].mp).toBe(beforeDeposit.players[0].mp);
    expect(
      afterDeposit.lastEvents.some((event) => event.type === 'AlarmRaised'),
    ).toBe(false);
    expect(chestOf(afterDeposit)?.items.filter((item) => item !== null)).toHaveLength(
      1,
    );
    await expect(page.locator('.inventory-chest-item-row')).toHaveCount(1);
    await expect(page.getByTestId('inventory-chest-count')).toHaveText('1/4');
    const depositShifts = await expectNoForbiddenShifts(page, 'depositar');
    await settle(page);
    await expect(banner).toBeHidden();

    // Cerrar el panel: el HUD del cursor muestra el contenido real.
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(hudRows).toContainText('Abierto');
    await expect(hudRows).toContainText('Daga arcana');
    await screenshot(page, 'hud-cofre-abierto-1280x720', testInfo);

    // «Suelo» no mezcla la fuente del cofre.
    await resetLayoutShifts(page);
    await page.keyboard.press('i');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('inventory-right-title')).toHaveText('Suelo');
    await expect(page.getByTestId('inventory-ground-section')).toBeVisible();
    await expect(page.getByTestId('inventory-chest-items')).toBeHidden();
    await expect(page.getByTestId('inventory-chest-empty')).toBeHidden();
    await expect(page.getByTestId('inventory-chest-count')).toBeHidden();
    const sueloRect1280 = await rectOf(page, '[data-testid="inventory-panel"]');
    expectRectEqual(sueloRect1280, cofreRect1280, 'Cofre → Suelo 1280');
    await screenshot(page, 'panel-suelo-1280x720', testInfo);
    const sueloShifts = await expectNoForbiddenShifts(page, 'suelo');

    await page.setViewportSize({ width: 900, height: 700 });
    await nextFrame(page);
    await expect(page.getByTestId('inventory-right-title')).toHaveText('Suelo');
    const sueloRect900 = await rectOf(page, '[data-testid="inventory-panel"]');
    expectRectEqual(sueloRect900, cofreRect900, 'Cofre → Suelo 900');
    await screenshot(page, 'panel-suelo-900x700', testInfo);

    // Volver a «Cofre» sin mover al jugador y sin coste (reabrir es gratis).
    await page.setViewportSize({ width: 1280, height: 720 });
    await nextFrame(page);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await resetLayoutShifts(page);
    await page.keyboard.press(' ');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('inventory-right-title')).toHaveText('Cofre');
    await expect(page.locator('.inventory-chest-item-row')).toHaveCount(1);
    const reopenedRect = await rectOf(page, '[data-testid="inventory-panel"]');
    expectRectEqual(reopenedRect, cofreRect1280, 'Suelo → Cofre 1280');
    const reopenShifts = await expectNoForbiddenShifts(page, 'reabrir cofre');
    const reopened = await snapshot(page);
    expect(reopened.players[0].actions.remaining).toBe(
      afterDeposit.players[0].actions.remaining,
    );

    await writeLog(testInfo, 'ciclo-cofre.json', {
      seed: SEED,
      chest: containerView(initial.containers),
      approach,
      costs: {
        beforeOpen: beforeOpen.players[0].actions,
        opened: opened.players[0].actions,
        emptied: emptied.players[0].actions,
        deposited: afterDeposit.players[0].actions,
        reopened: reopened.players[0].actions,
        mpBeforeDeposit: beforeDeposit.players[0].mp,
        mpAfterDeposit: afterDeposit.players[0].mp,
      },
      shifts: {
        open: openShifts,
        takeAll: takeAllShifts,
        deposit: depositShifts,
        ground: sueloShifts,
        reopen: reopenShifts,
      },
    });

    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });

  test('guardado y carga conservan cofres, contenido y estado sin repetir tiradas', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 720 });

    const initial = await startNewGame(page, SEED);
    const { chest } = await reachChest(page);
    await page.keyboard.press(' ');
    const panel = page.getByTestId('inventory-panel');
    await expect(panel).toBeVisible();
    await settle(page);
    await pressPanelAction(
      page,
      panelActionTestId('take-all', firstChestItemKey(await snapshot(page))),
    );
    await settle(page);
    await pressPanelAction(page, panelActionTestId('deposit', 'backpack:0'));
    await settle(page);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    const beforeSave = await snapshot(page);
    expect(chestOf(beforeSave)?.opened).toBe(true);
    expect(chestOf(beforeSave)?.items.filter((item) => item !== null)).toHaveLength(
      1,
    );
    const deposited = chestOf(beforeSave)?.items.find((item) => item !== null);
    expect(deposited?.id).toBe('item-chest-1-0');
    expect(deposited?.itemId).toBe('arcane-dagger');

    // Guardado real desde la pausa: el .zip debe llevar el cofre abierto.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pause-menu')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('pause-save').click();
    const download = await downloadPromise;
    const zipPath = artifactPath(
      testInfo,
      'saves',
      download.suggestedFilename(),
    );
    await mkdir(dirname(zipPath), { recursive: true });
    await download.saveAs(zipPath);

    const files = await readSaveZip(new Uint8Array(await readFile(zipPath)));
    const loaded = readSaveFiles(files);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const savedView = containerView(loaded.value.state.containers ?? []);
    expect(savedView).toEqual(containerView(beforeSave.containers));
    expect(savedView[0]?.x).toBe(chest.x);
    expect(savedView[0]?.y).toBe(chest.y);
    expect(savedView[0]?.opened).toBe(true);

    // Cargar desde el menú la misma partida: ni se regenera ni se retira.
    await page.goto('/');
    await page.waitForFunction(() => Boolean(window.__game));
    await expect(page.getByTestId('start-screen')).toBeVisible();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('start-load').click();
    await (await chooserPromise).setFiles(zipPath);
    await expect(page.getByTestId('start-screen')).toBeHidden();
    await page.waitForFunction(() => Boolean(window.__game?.snapshot().assetsLoaded));
    const afterLoad = await snapshot(page);
    expect(containerView(afterLoad.containers)).toEqual(
      containerView(beforeSave.containers),
    );
    expect(afterLoad.players[0].x).toBe(beforeSave.players[0].x);
    expect(afterLoad.players[0].y).toBe(beforeSave.players[0].y);
    expect(afterLoad.players[0].actions).toEqual(
      beforeSave.players[0].actions,
    );
    expect(afterLoad.rng).toEqual(beforeSave.rng);

    // El cofre cargado sigue abierto con su contenido y se puede reabrir.
    await moveCursorTo(page, chest.x, chest.y);
    await page.keyboard.press(' ');
    await expect(panel).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('inventory-right-title')).toHaveText('Cofre');
    await expect(page.locator('.inventory-chest-item-row')).toHaveCount(1);
    await expect(page.locator('.inventory-chest-item-row')).toHaveAttribute(
      'aria-label',
      /Daga arcana/,
    );
    await screenshot(page, 'cofre-cargado-1280x720', testInfo);

    // Vaciar el cofre cargado: sigue en el mundo, abierto y vacío.
    await pressPanelAction(
      page,
      panelActionTestId('take-all', firstChestItemKey(await snapshot(page))),
    );
    await settle(page);
    const afterLoadEmpty = await snapshot(page);
    const emptyChest = chestOf(afterLoadEmpty);
    expect(emptyChest).toBeDefined();
    expect(emptyChest?.opened).toBe(true);
    expect(emptyChest?.x).toBe(chest.x);
    expect(emptyChest?.y).toBe(chest.y);
    expect(emptyChest?.items.every((item) => item === null)).toBe(true);
    // El primer `settle` cierra el beat; el segundo consume el banner.
    await settle(page);
    await expect(page.getByTestId('feedback-banner')).toBeHidden();
    await screenshot(page, 'cofre-vacio-cargado-1280x720', testInfo);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByTestId('hud-cursor-rows')).toContainText('Abierto');
    await expect(page.getByTestId('hud-cursor-rows')).toContainText('Vacío');
    await screenshot(page, 'hud-cofre-vacio-cargado-1280x720', testInfo);

    await writeLog(testInfo, 'guardado-carga.json', {
      seed: SEED,
      generated: containerView(initial.containers),
      beforeSave: containerView(beforeSave.containers),
      saved: savedView,
      afterLoad: containerView(afterLoad.containers),
      afterLoadEmpty: containerView(afterLoadEmpty.containers),
      zip: zipPath,
    });
    expect(errors).toEqual([]);
  });

  test('curva: mejora por nivel y las cuatro piezas de traits con semillas fijas', () => {
    // Integración 1 y 6 jugadores con dos semillas fijas.
    for (const seed of [SEED, 9270170]) {
      for (const count of [1, 6]) {
        const state = createInitialState({ seed, players: playerConfigs(count) });
        const chests = state.containers ?? [];
        expect(chests.length, `semilla ${seed} con ${count} jugadores`).toBeGreaterThan(0);
        const best = bestPowerBySlot(state.players.map((player) => player.equipment));
        for (const chest of chests) {
          const upgrades = chest.items.filter(
            (item): item is NonNullable<typeof item> =>
              item !== null &&
              powerScore(ITEMS[item.itemId]) > best[ITEMS[item.itemId].slot],
          );
          expect(
            upgrades.length,
            `semilla ${seed} ${count}p ${chest.id}: al menos una mejora`,
          ).toBeGreaterThanOrEqual(1);
        }
      }
    }

    // Cuatro semillas fijas entregan las cuatro piezas de traits de REQ-019.
    const seedByPiece = new Map<ItemId, number>();
    for (const seed of [1, 2, 3, 4]) {
      const state = createInitialState({ seed });
      const piece = (state.containers ?? [])
        .flatMap((chest) => chest.items)
        .find(
          (item): item is NonNullable<typeof item> =>
            item !== null && TRAIT_PIECE_IDS.includes(item.itemId),
        );
      expect(piece, `semilla ${seed}`).toBeDefined();
      if (piece) seedByPiece.set(piece.itemId, seed);
    }
    expect([...seedByPiece.keys()].sort()).toEqual([...TRAIT_PIECE_IDS].sort());
  });
});

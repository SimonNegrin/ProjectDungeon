import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BspMapGenerator,
  createInitialState,
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  ITEMS,
  type GameState,
  type Grid,
  type Position,
  type Unit,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import { moveCursorTo, openBspState, openState, settle, snapshot } from './support';

const TILES_PER_AXIS = 13;
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;

const reference = createInitialState({
  seed: 279837264,
  generator: new BspMapGenerator(),
});

async function screenshot(page: Page, name: string, testInfo: TestInfo): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

function withPlayerPosition(state: GameState, position: Position): GameState {
  const player = state.players[0];
  return {
    ...state,
    players: [
      { ...player, x: position.x, y: position.y, home: { ...position } },
      ...state.players.slice(1),
    ],
  };
}

function roomState(options: {
  readonly players: readonly Unit[];
  readonly enemies?: readonly Unit[];
  readonly grid?: Grid;
  readonly groundItems?: GameState['groundItems'];
}): GameState {
  return {
    grid: options.grid ?? createRoomGrid(20, 20),
    players: options.players,
    enemies: options.enemies ?? [],
    groundItems: options.groundItems ?? [],
    containers: [],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: createRng(279837264),
  };
}

function enemyAt(id: string, x: number, y: number): Unit {
  const template = reference.enemies[0];
  return {
    ...template,
    id,
    x,
    y,
    home: { x, y },
    hp: template.maxHp,
    awareness: 'dormant',
    fleeing: false,
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };
}

async function boxes(page: Page) {
  return page.evaluate(() => {
    const rectOf = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const box = (testId: string) => {
      const element = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!element) throw new Error(`Falta [data-testid="${testId}"]`);
      return rectOf(element);
    };
    const clipping = (testId: string) => {
      const element = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!element) throw new Error(`Falta [data-testid="${testId}"]`);
      return {
        id: testId,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    };
    return {
      frame: box('frame'),
      hud: box('hud'),
      left: box('hud-left'),
      right: box('hud-right'),
      map: rectOf(document.querySelector('.map-overlay')!),
      clipping: [
        'hud',
        'hud-left',
        'hud-right',
        'hud-keys',
        'hud-stats',
        'hud-cursor-detail',
        'hud-cursor-title',
      ].map(clipping),
    };
  });
}

/** Rango inclusivo de tiles visibles; mismo cálculo que el render del host. */
function visibleRange(snap: Awaited<ReturnType<typeof snapshot>>) {
  const minX = Math.floor(snap.camera.x / snap.tileSize);
  const minY = Math.floor(snap.camera.y / snap.tileSize);
  const maxX = Math.ceil((snap.camera.x + snap.viewport.width) / snap.tileSize) - 1;
  const maxY = Math.ceil((snap.camera.y + snap.viewport.height) / snap.tileSize) - 1;
  return { minX, minY, maxX, maxY };
}

test.describe('pantalla en tres zonas', () => {
  for (const viewport of VIEWPORTS) {
    test(`ficha, mapa y detalle caben sin recorte a ${viewport.width}×${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openBspState(page, 279837264);
      await settle(page);
      const area = await boxes(page);
      const snap = await snapshot(page);

      // El HUD es una capa interior al marco: no queda nada de juego fuera.
      expect(area.hud.x).toBeGreaterThanOrEqual(area.frame.x - 1);
      expect(area.hud.y).toBeGreaterThanOrEqual(area.frame.y - 1);
      expect(area.hud.right).toBeLessThanOrEqual(area.frame.right + 1);
      expect(area.hud.bottom).toBeLessThanOrEqual(area.frame.bottom + 1);

      // Las columnas laterales no invaden el mapa de 13×13.
      expect(area.left.x).toBeGreaterThanOrEqual(area.frame.x - 1);
      expect(area.left.right).toBeLessThanOrEqual(area.map.x + 1);
      expect(area.right.x).toBeGreaterThanOrEqual(area.map.right - 1);
      expect(area.right.right).toBeLessThanOrEqual(area.frame.right + 1);
      expect(Math.abs(area.map.width - area.map.height)).toBeLessThanOrEqual(0.5);

      // El mapa conserva el viewport de 13×13 y no cambia de escala.
      expect(snap.viewport).toEqual({ width: 416, height: 416 });
      expect(snap.viewport.width / snap.tileSize).toBe(TILES_PER_AXIS);
      expect(snap.viewport.height / snap.tileSize).toBe(TILES_PER_AXIS);
      const range = visibleRange(snap);
      expect(range.maxX - range.minX + 1).toBe(TILES_PER_AXIS);
      expect(range.maxY - range.minY + 1).toBe(TILES_PER_AXIS);

      // Texto legible y sin recortes en los nodos medidos.
      for (const item of area.clipping) {
        expect(item.scrollWidth, `${item.id} recorta en horizontal`).toBeLessThanOrEqual(
          item.clientWidth + 1,
        );
        expect(item.scrollHeight, `${item.id} recorta en vertical`).toBeLessThanOrEqual(
          item.clientHeight + 1,
        );
      }

      await expect(page.getByTestId('hud-left')).toBeVisible();
      await expect(page.getByTestId('hud-right')).toBeVisible();
      await screenshot(
        page,
        `tres-zonas-${viewport.width}x${viewport.height}`,
        testInfo,
      );
    });
  }
});

test.describe('panel de inventario sobre el mapa', () => {
  for (const viewport of VIEWPORTS) {
    test(`cubre solo el mapa y deja ambos HUD visibles a ${viewport.width}×${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openBspState(page, 279837264);
      await settle(page);

      const before = await snapshot(page);
      const leftBefore = await page.getByTestId('hud-left').boundingBox();
      const rightBefore = await page.getByTestId('hud-right').boundingBox();
      await expect(page.getByTestId('hud-left')).toBeVisible();
      await expect(page.getByTestId('hud-right')).toBeVisible();

      await page.keyboard.press('i');
      const panel = page.getByTestId('inventory-panel');
      await expect(panel).toBeVisible();

      const frame = await page.getByTestId('frame').boundingBox();
      const left = await page.getByTestId('hud-left').boundingBox();
      const right = await page.getByTestId('hud-right').boundingBox();
      const panelBox = await panel.boundingBox();
      const mapBox = await page.evaluate(() => {
        const element = document.querySelector<HTMLElement>('.map-overlay');
        if (!element) throw new Error('Falta .map-overlay');
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        };
      });
      expect(frame).not.toBeNull();
      expect(left).not.toBeNull();
      expect(right).not.toBeNull();
      expect(panelBox).not.toBeNull();

      // El modal ocupa la franja central del mapa, no el marco completo.
      expect(panelBox!.x).toBeGreaterThanOrEqual(mapBox.x - 1);
      expect(panelBox!.y).toBeGreaterThanOrEqual(frame!.y - 1);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(
        mapBox.right + 1,
      );
      expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(
        frame!.y + frame!.height + 1,
      );

      // Las columnas quedan fuera de la capa modal y siguen visibles.
      expect(panelBox!.x).toBeGreaterThanOrEqual(left!.x + left!.width - 1);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(right!.x + 1);
      await expect(page.getByTestId('hud-left')).toBeVisible();
      await expect(page.getByTestId('hud-right')).toBeVisible();
      expect(left).toEqual(leftBefore);
      expect(right).toEqual(rightBefore);

      // El panel sigue bloqueando el mapa mientras está abierto.
      for (const key of ['w', 'ArrowUp', 'f', 'g']) {
        await page.keyboard.press(key);
      }
      await settle(page);
      const blocked = await snapshot(page);
      expect(blocked.players[0]).toMatchObject({
        x: before.players[0].x,
        y: before.players[0].y,
        mp: before.players[0].mp,
        actions: before.players[0].actions,
      });
      expect(blocked.cursor).toMatchObject({
        x: before.cursor.x,
        y: before.cursor.y,
      });
      expect(blocked.turn).toBe(before.turn);
      expect(blocked.lastEvents).toEqual(before.lastEvents);

      // El panel no tiene scroll global: cabecera, columnas y cierre caben en
      // ambos viewports; solo el contenedor del suelo puede desplazarse.
      const body = page.locator('.inventory-panel-body');
      await expect(body).toBeVisible();
      const scroll = await panel.evaluate((element) => {
        const panelElement = element as HTMLElement;
        const bodyElement = panelElement.querySelector<HTMLElement>(
          '.inventory-panel-body',
        );
        const columns = [
          ...panelElement.querySelectorAll<HTMLElement>('.inventory-column'),
        ];
        return {
          panel: {
            scrollHeight: panelElement.scrollHeight,
            clientHeight: panelElement.clientHeight,
          },
          body: bodyElement
            ? {
                scrollHeight: bodyElement.scrollHeight,
                clientHeight: bodyElement.clientHeight,
              }
            : null,
          columns: columns.map((column) => ({
            scrollHeight: column.scrollHeight,
            clientHeight: column.clientHeight,
          })),
        };
      });
      expect(scroll.panel.scrollHeight).toBeLessThanOrEqual(
        scroll.panel.clientHeight + 1,
      );
      expect(scroll.body).not.toBeNull();
      expect(scroll.body!.scrollHeight).toBeLessThanOrEqual(
        scroll.body!.clientHeight + 1,
      );
      for (const column of scroll.columns) {
        expect(column.scrollHeight).toBeLessThanOrEqual(column.clientHeight + 1);
      }
      const columnTitle = await page
        .locator('.inventory-section-title')
        .first()
        .boundingBox();
      expect(columnTitle).not.toBeNull();
      expect(columnTitle!.y).toBeGreaterThanOrEqual(panelBox!.y - 1);
      expect(columnTitle!.y).toBeLessThan(panelBox!.y + panelBox!.height);

      await screenshot(
        page,
        `panel-abierto-${viewport.width}x${viewport.height}`,
        testInfo,
      );

      const close = await page.getByTestId('inventory-close').boundingBox();
      expect(close).not.toBeNull();
      expect(close!.x).toBeGreaterThanOrEqual(panelBox!.x - 1);
      expect(close!.x + close!.width).toBeLessThanOrEqual(
        panelBox!.x + panelBox!.width + 1,
      );
      expect(close!.y).toBeGreaterThanOrEqual(panelBox!.y - 1);
      expect(close!.y + close!.height).toBeLessThanOrEqual(
        panelBox!.y + panelBox!.height + 1,
      );

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await page.keyboard.press('i');
      await expect(panel).toBeVisible();
      await page.keyboard.press('i');
      await expect(panel).toBeHidden();
    });
  }
});

test('el detalle cambia por tile sin tocar el estado del motor', async ({ page }, testInfo) => {
  const player = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  const enemy = enemyAt('enemy-1', 6, 5);
  await openState(page, roomState({ players: [player], enemies: [enemy] }));
  const before = await snapshot(page);

  await moveCursorTo(page, 6, 5);
  const after = await snapshot(page);
  expect({ ...after, cursor: before.cursor }).toEqual(before);

  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'enemy',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText(enemy.nombre);
  await expect(page.getByTestId('hud-cursor-kind')).toHaveText('Enemigo');
  await expect(page.getByTestId('hud-cursor-sprite')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-stats')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-vitals')).toBeVisible();
  await expect(page.getByTestId('hud-cursor-enemy-hp')).toHaveText(
    `${enemy.hp}/${enemy.maxHp}`,
  );
  await expect(page.getByTestId('hud-cursor-enemy-hp')).toBeVisible();
  const rows = page.getByTestId('hud-cursor-rows');
  await expect(rows).toContainText('Arma');
  await expect(rows).toContainText('Escudo');
  await expect(rows).toContainText('Armadura');
  await expect(rows).toContainText('Acciones');
  await expect(page.getByTestId('hud-cursor-bands')).toBeVisible();
  await screenshot(page, 'detalle-enemigo', testInfo);
});

test('describe aliado, objeto, puerta, terreno, entrada/salida y desconocido', async ({
  page,
}, testInfo) => {
  const warrior = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Ada',
  });
  const rogue = createPlayerFromArchetype('rogue', {
    id: 'player-2',
    position: { x: 7, y: 5 },
    name: 'Boric',
  });

  await openState(page, roomState({ players: [warrior, rogue] }));
  await moveCursorTo(page, 7, 5);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'ally',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Boric');
  const allyRows = page.getByTestId('hud-cursor-rows');
  await expect(allyRows).toContainText('Arquetipo');
  await expect(allyRows).toContainText('PV');
  await expect(allyRows).toContainText('MP');
  await expect(allyRows).toContainText('Acciones');
  await expect(allyRows).toContainText('Atributos');
  await expect(allyRows).toContainText('Arma');
  await expect(allyRows).toContainText('Escudo');
  await expect(allyRows).toContainText('Armadura');
  await expect(page.getByTestId('hud-cursor-detail')).not.toContainText(
    /mochila|inventario/i,
  );
  await screenshot(page, 'detalle-aliado', testInfo);

  const itemState = roomState({
    players: [warrior],
    groundItems: [{ id: 'item-1', itemId: 'axe', x: 6, y: 5 }],
  });
  await openState(page, itemState);
  await moveCursorTo(page, 6, 5);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'item',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Hacha');
  await expect(page.getByTestId('hud-cursor-sprite')).toBeVisible();
  await expect(page.getByTestId('hud-cursor-stats')).toContainText('+2 Acierto');
  await expect(page.getByTestId('hud-cursor-stats')).toContainText('+5 Daño');
  await expect(page.getByTestId('hud-cursor-traits')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-detail')).not.toContainText(
    ITEMS.axe.description,
  );
  await expect(page.getByTestId('hud-cursor-rows')).not.toContainText(
    /cantidad|x1|×1/i,
  );
  await screenshot(page, 'detalle-objeto', testInfo);

  // Growth de referencia: entrada en (3,7), puerta en (3,8), suelo (5,7) y
  // muro (4,8). El jugador se aparta de la entrada para poder mirarla.
  const growth = withPlayerPosition(createInitialState({ seed: 279837264 }), {
    x: 4,
    y: 7,
  });
  await openState(page, growth);
  await moveCursorTo(page, 3, 7);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'terrain',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Entrada');
  await expect(page.getByTestId('hud-cursor-kind')).toHaveText('Terreno');
  await expect(page.getByTestId('hud-cursor-rows')).toBeHidden();
  await screenshot(page, 'detalle-entrada', testInfo);

  await moveCursorTo(page, 3, 8);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'door',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Puerta');
  await expect(page.getByTestId('hud-cursor-kind')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Rejilla');
  await expect(page.getByTestId('hud-cursor-detail')).not.toContainText(
    /abre|cerrada|llave/i,
  );
  await screenshot(page, 'detalle-puerta', testInfo);

  await moveCursorTo(page, 5, 7);
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Suelo');
  await expect(page.getByTestId('hud-cursor-kind')).toHaveText('Terreno');
  // El tipo de terreno no se repite en una fila que copie el título.
  await expect(page.getByTestId('hud-cursor-rows')).toBeHidden();
  await screenshot(page, 'detalle-terreno-suelo', testInfo);

  await moveCursorTo(page, 4, 8);
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Muro');
  await screenshot(page, 'detalle-terreno-muro', testInfo);

  const atExit = withPlayerPosition(createInitialState({ seed: 279837264 }), {
    x: 20,
    y: 2,
  });
  await openState(page, atExit);
  await moveCursorTo(page, 21, 2);
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Salida');
  await screenshot(page, 'detalle-salida', testInfo);

  // Muro intermedio: el cursor ve la casilla, pero ningún jugador vivo tiene
  // línea de visión; el panel no revela la unidad oculta.
  const baseGrid = createRoomGrid(20, 20);
  const blockedGrid: Grid = {
    ...baseGrid,
    tiles: baseGrid.tiles.map((tile, index) =>
      index === 5 * baseGrid.width + 6 ? 'wall' : tile,
    ),
  };
  const hidden = enemyAt('enemy-1', 7, 5);
  await openState(
    page,
    roomState({ players: [warrior], enemies: [hidden], grid: blockedGrid }),
  );
  await moveCursorTo(page, 7, 5);
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'unknown',
  );
  await expect(page.getByTestId('hud-cursor-title')).toHaveText('Desconocido');
  await expect(page.getByTestId('hud-cursor-kind')).toBeHidden();
  await expect(page.getByTestId('hud-cursor-detail')).not.toContainText(
    hidden.nombre,
  );
  await expect(page.getByTestId('hud-cursor-bands')).toBeHidden();
  await screenshot(page, 'detalle-desconocido', testInfo);
});

test('la ficha muestra al fantasma y sigue al jugador activo en hotseat', async ({
  page,
}, testInfo) => {
  const ghost = {
    ...createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
      name: 'Ada',
    }),
    hp: 0,
    mp: 2,
    maxMp: 6,
  };
  const observer = createPlayerFromArchetype('rogue', {
    id: 'player-2',
    position: { x: 5, y: 4 },
    name: 'Boric',
  });
  await openState(page, roomState({ players: [ghost, observer] }));

  await expect(page.getByTestId('hud-player-name')).toHaveText('Ada');
  await expect(page.getByTestId('hud-player-hp')).toHaveText(`0/${ghost.maxHp}`);
  await expect(page.getByTestId('hud-player-mp')).toHaveText('2/6');
  await expect(page.getByTestId('hud-condition')).toBeVisible();
  await expect(page.getByTestId('hud-condition')).toHaveText('Fantasma');
  await expect(page.getByTestId('hud-cursor-detail')).toHaveAttribute(
    'data-kind',
    'ally',
  );
  await expect(page.getByTestId('hud-cursor-rows')).toContainText('Fantasma');
  await screenshot(page, 'ficha-fantasma', testInfo);

  // El hotseat se representa por el primer jugador de la lista; la ficha no
  // guarda estado propio y cambia con el snapshot.
  await openState(page, roomState({ players: [observer, ghost] }));
  await expect(page.getByTestId('hud-player-name')).toHaveText('Boric');
  await expect(page.getByTestId('hud-condition')).toBeHidden();
});

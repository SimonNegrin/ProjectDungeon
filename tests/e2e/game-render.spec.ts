import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { artifactPath } from './artifacts';
import { openBspState } from './support';

const CANVAS_ID = '#game-canvas';

async function settleLayout(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function expectCanvasAspect(page: Page, viewportWidth: number, viewportHeight: number) {
  await page.setViewportSize({ width: viewportWidth, height: viewportHeight });
  await settleLayout(page);

  const canvas = page.locator(CANVAS_ID);
  const box = await canvas.boundingBox();

  expect(box).not.toBeNull();
  if (!box) return;

  expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
  expect(box.width).toBeLessThanOrEqual(viewportWidth);
  expect(box.height).toBeLessThanOrEqual(viewportHeight);
}

test('la página de juego renderiza el mapa generado, expone el snapshot y limita la cámara', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const snapshot = await openBspState(page, 279837264);

  expect(snapshot.grid.width).toBe(32);
  expect(snapshot.grid.height).toBe(32);
  expect(snapshot.grid.tiles).toHaveLength(32 * 32);
  expect(snapshot.seed).toBe(279837264);
  expect(snapshot.rooms).toHaveLength(9);
  expect(snapshot.corridors).toHaveLength(10);
  expect(snapshot.doors).toHaveLength(18);
  expect(snapshot.spawns).toMatchObject({
    player: { x: 9, y: 27 },
    enemy: { x: 28, y: 5 },
    distance: 59,
  });
  expect(typeof snapshot.spawns?.roomId).toBe('number');
  expect(snapshot.spawns?.party).toHaveLength(6);
  expect(snapshot.spawns?.party?.[0]).toEqual(snapshot.spawns?.player);
  expect(snapshot.tileSize).toBe(32);
  expect(snapshot.players.map((unit) => unit.id)).toEqual(['player-1']);
  expect(snapshot.enemies.map((unit) => unit.id)).toEqual([
    'enemy-1',
    'enemy-2',
    'enemy-3',
    'enemy-4',
  ]);
  expect(snapshot.players[0]).toMatchObject({ x: 9, y: 27 });
  expect(snapshot.enemies[0]).toMatchObject({ x: 28, y: 5 });
  expect(snapshot.phase).toBe('player');
  expect(snapshot.status).toBe('playing');
  expect(snapshot.turn).toBe(1);
  expect(snapshot.assetsLoaded).toBe(true);

  expect(snapshot.viewport).toEqual({ width: 416, height: 416 });
  expect(snapshot.viewport.width / snapshot.tileSize).toBe(13);
  expect(snapshot.viewport.height / snapshot.tileSize).toBe(13);
  expect(snapshot.camera).toEqual({ x: 96, y: 608, maxX: 608, maxY: 608 });
  expect(snapshot.camera.x).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.x).toBeLessThanOrEqual(snapshot.camera.maxX);
  expect(snapshot.camera.y).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.y).toBeLessThanOrEqual(snapshot.camera.maxY);
  expect(() => JSON.stringify(snapshot)).not.toThrow();
  expect(JSON.parse(JSON.stringify(snapshot)).spawns).toEqual(snapshot.spawns);

  // El enemigo en (28,5) empieza fuera del viewport de 416 px.
  const enemy = snapshot.enemies[0];
  const outside =
    enemy.x * snapshot.tileSize > snapshot.camera.x + snapshot.viewport.width ||
    enemy.y * snapshot.tileSize > snapshot.camera.y + snapshot.viewport.height ||
    (enemy.x + 1) * snapshot.tileSize < snapshot.camera.x ||
    (enemy.y + 1) * snapshot.tileSize < snapshot.camera.y;
  expect(outside).toBe(true);

  const canvas = page.locator(CANVAS_ID);
  await expect(canvas).toBeVisible();

  const internalSize = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return {
      width: canvasElement.width,
      height: canvasElement.height,
      imageRendering: getComputedStyle(canvasElement).imageRendering,
    };
  });
  expect(internalSize).toEqual({
    width: 2218,
    height: 1248,
    imageRendering: 'pixelated',
  });

  // Sub-rectángulo del mapa: cuadrado de 1248×1248 de respaldo centrado en el
  // marco de 2218×1248; cada lateral mide 485 px.
  const mapWidth = snapshot.viewport.width * 3;
  const mapHeight = snapshot.viewport.height * 3;
  const mapLeft = (internalSize.width - mapWidth) / 2;
  expect(mapWidth).toBe(1248);
  expect(mapHeight).toBe(1248);
  expect(mapLeft).toBe(485);
  expect(mapLeft + mapWidth + mapLeft).toBe(internalSize.width);
  expect(mapHeight).toBe(internalSize.height);

  const pixels = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const context = canvasElement.getContext('2d');
    if (!context) return { painted: 0, colors: 0 };

    const data = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
    const colors = new Set<number>();
    let painted = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      colors.add((red << 16) | (green << 8) | blue);
      if (red + green + blue > 90) painted += 1;
    }

    return { painted, colors: colors.size };
  });

  expect(pixels.painted).toBeGreaterThan(5000);
  expect(pixels.colors).toBeGreaterThan(10);

  await expectCanvasAspect(page, 1280, 720);
  await expectCanvasAspect(page, 800, 600);

  await page.setViewportSize({ width: 1280, height: 720 });
  await settleLayout(page);

  const screenshotPath = artifactPath(testInfo, 'screenshots', 'frame.png');
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('frame', { path: screenshotPath, contentType: 'image/png' });

  expect(consoleErrors).toEqual([]);
});

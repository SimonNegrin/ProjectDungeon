import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

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

test('la página de juego renderiza la sala, expone el snapshot y limita la cámara', async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__game));

  const snapshot = await page.evaluate(() => window.__game!.snapshot());

  expect(snapshot.grid.width).toBe(20);
  expect(snapshot.grid.height).toBe(20);
  expect(snapshot.grid.tiles).toHaveLength(20 * 20);
  expect(snapshot.tileSize).toBe(32);
  expect(snapshot.players.map((unit) => unit.id)).toEqual(['player-1']);
  expect(snapshot.enemies.map((unit) => unit.id)).toEqual(['enemy-1']);
  expect(snapshot.phase).toBe('player');
  expect(snapshot.status).toBe('playing');
  expect(snapshot.turn).toBe(1);
  expect(snapshot.assetsLoaded).toBe(true);

  expect(snapshot.viewport).toEqual({ width: 384, height: 384 });
  expect(snapshot.viewport.width / snapshot.tileSize).toBe(12);
  expect(snapshot.viewport.height / snapshot.tileSize).toBe(12);
  expect(snapshot.camera).toEqual({ x: 0, y: 0, maxX: 256, maxY: 256 });
  expect(snapshot.camera.x).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.x).toBeLessThanOrEqual(snapshot.camera.maxX);
  expect(snapshot.camera.y).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.y).toBeLessThanOrEqual(snapshot.camera.maxY);
  expect(() => JSON.stringify(snapshot)).not.toThrow();

  // El enemigo en (15,15) empieza fuera del viewport de 384 px.
  expect(snapshot.enemies[0].x * snapshot.tileSize).toBeGreaterThan(snapshot.viewport.width);
  expect(snapshot.enemies[0].y * snapshot.tileSize).toBeGreaterThan(snapshot.viewport.height);

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
    width: 2048,
    height: 1152,
    imageRendering: 'pixelated',
  });

  // Sub-rectángulo del mapa: cuadrado de 1152×1152 de respaldo centrado en el
  // marco de 2048×1152; cada lateral mide 448 px.
  const mapWidth = snapshot.viewport.width * 3;
  const mapHeight = snapshot.viewport.height * 3;
  const mapLeft = (internalSize.width - mapWidth) / 2;
  expect(mapWidth).toBe(1152);
  expect(mapHeight).toBe(1152);
  expect(mapLeft).toBe(448);
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

  const screenshotPath = 'artifacts/TASK-0005/attempt-1/screenshots/frame.png';
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('frame', { path: screenshotPath, contentType: 'image/png' });

  expect(consoleErrors).toEqual([]);
});

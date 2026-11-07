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

  expect(box.width / box.height).toBeCloseTo(960 / 600, 1);
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

  expect(snapshot.camera).toEqual({ x: 0, y: 0, maxX: 0, maxY: 40 });
  expect(snapshot.camera.x).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.x).toBeLessThanOrEqual(snapshot.camera.maxX);
  expect(snapshot.camera.y).toBeGreaterThanOrEqual(0);
  expect(snapshot.camera.y).toBeLessThanOrEqual(snapshot.camera.maxY);
  expect(() => JSON.stringify(snapshot)).not.toThrow();

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
    width: 960,
    height: 600,
    imageRendering: 'pixelated',
  });

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

  const screenshotPath = 'artifacts/TASK-0002/attempt-1/screenshots/room.png';
  await mkdir(dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach('room', { path: screenshotPath, contentType: 'image/png' });

  expect(consoleErrors).toEqual([]);
});

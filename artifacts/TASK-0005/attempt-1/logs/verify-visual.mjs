import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { port: 4174, host: '127.0.0.1', strictPort: true },
});
const browser = await chromium.launch();

async function measure(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.evaluate(
    () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  return page.evaluate(() => {
    const frameEl = document.querySelector('[data-testid="frame"]');
    const hudEl = document.querySelector('[data-testid="hud"]');
    const canvas = document.querySelector('#game-canvas');
    const active = document.querySelector('[data-testid="active-tile"]');
    const frame = frameEl.getBoundingClientRect();
    const hud = hudEl.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const snapshot = window.__game.snapshot();
    const player = snapshot.players[0];
    const ctx = canvas.getContext('2d');
    const pixel = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const mapLeft = frame.left + (frame.width * 448) / 2048;
    const mapTop = frame.top;
    const mapWidth = (frame.width * 1152) / 2048;
    const mapHeight = frame.height;
    const expectedActiveLeft = mapLeft + ((player.x * 32 - snapshot.camera.x) / 384) * mapWidth;
    const expectedActiveTop = mapTop + ((player.y * 32 - snapshot.camera.y) / 384) * mapHeight;
    const expectedActiveSize = (mapWidth * 32) / 384;

    return {
      viewport: snapshot.viewport,
      camera: snapshot.camera,
      internal: { width: canvas.width, height: canvas.height },
      smoothing: ctx.imageSmoothingEnabled,
      imageRendering: getComputedStyle(canvas).imageRendering,
      frame: { left: frame.left, top: frame.top, width: frame.width, height: frame.height },
      frameAspect: frame.width / frame.height,
      hud: { left: hud.left, top: hud.top, width: hud.width, height: hud.height, bottom: hud.bottom },
      hudOutsideFrame: hud.bottom <= frame.top,
      map: { left: mapLeft, top: mapTop, width: mapWidth, height: mapHeight },
      mapAspect: mapWidth / mapHeight,
      mapCentered: Math.abs(mapLeft - frame.left - (frame.width - mapWidth) / 2) < 0.01,
      active: {
        left: activeRect.left,
        top: activeRect.top,
        width: activeRect.width,
        height: activeRect.height,
      },
      expectedActive: {
        left: expectedActiveLeft,
        top: expectedActiveTop,
        size: expectedActiveSize,
      },
      pixels: {
        leftSide: pixel(100, 576),
        rightSide: pixel(1948, 576),
        mapCenter: pixel(1024, 576),
      },
      enemyOutsideViewport:
        snapshot.enemies[0].x * snapshot.tileSize >= snapshot.viewport.width &&
        snapshot.enemies[0].y * snapshot.tileSize >= snapshot.viewport.height,
    };
  });
}

try {
  await server.listen();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:4174/');
  await page.waitForFunction(() => Boolean(window.__game) && window.__game.snapshot().assetsLoaded);

  const at1280 = await measure(page, 1280, 720);
  const at800 = await measure(page, 800, 600);
  const at1920 = await measure(page, 1920, 1080);

  console.log(JSON.stringify({ at1280, at800, at1920 }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

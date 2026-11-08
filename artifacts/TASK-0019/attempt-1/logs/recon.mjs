import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

await page.goto('http://127.0.0.1:5173/?seed=279837264');
await page.waitForFunction(() => Boolean(window.__game) && window.__game.snapshot().assetsLoaded);

const snap = await page.evaluate(() => window.__game.snapshot());
console.log('player', snap.players[0], 'enemy', snap.enemies[0], 'camera', snap.camera, 'viewport', snap.viewport);
for (let y = 4; y <= 12; y += 1) {
  let row = '';
  for (let x = 0; x <= 20; x += 1) row += snap.grid.tiles[y * snap.grid.width + x] === 'floor' ? '.' : '#';
  console.log(String(y).padStart(2), row);
}

for (let i = 1; i <= 6; i += 1) {
  await page.keyboard.press('ArrowRight');
  const s = await page.evaluate(() => window.__game.snapshot());
  console.log('cursor right', i, s.cursor.x, s.cursor.y, 'kind', s.cursor.kind, 'path', s.cursor.path.length, 'state', s.cursor.state);
}

await page.evaluate(() => {
  window.addEventListener('keydown', () => window.__game.advance(0), { once: true });
});
await page.keyboard.press('Space');
let s = await page.evaluate(() => window.__game.snapshot());
console.log('after freeze', JSON.stringify(s.animation), 'hud', await page.getByTestId('hud-player-mp').textContent());
for (const ms of [132, 195, 460]) {
  s = await page.evaluate((m) => window.__game.advance(m), ms === 132 ? 132 : ms === 195 ? 63 : 265);
  console.log('advance', ms, JSON.stringify(s.animation), 'hud', await page.getByTestId('hud-player-mp').textContent());
}

await page.keyboard.press('r');
await page.evaluate(() => {
  window.addEventListener('keydown', () => window.__game.advance(0), { once: true });
});
await page.keyboard.press('e');
s = await page.evaluate(() => window.__game.snapshot());
console.log('enemy freeze', JSON.stringify(s.animation), 'phase', s.phase, 'turn', s.turn, 'cursor', JSON.stringify(s.cursor), 'hudphase', await page.getByTestId('hud-phase').textContent());
console.log('events', s.lastEvents.map((e) => e.type));
const enemyBefore = s.enemies[0];
await page.evaluate(() => window.__game.advance(1000000));
s = await page.evaluate(() => window.__game.snapshot());
console.log('enemy end', JSON.stringify(s.animation), 'phase', s.phase, 'turn', s.turn, 'enemy', enemyBefore.x, enemyBefore.y, '->', s.enemies[0].x, s.enemies[0].y, 'cursor', JSON.stringify(s.cursor));

console.log('errors', errors);
await browser.close();

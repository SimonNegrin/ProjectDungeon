import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:5173/?seed=279837264');
await page.waitForFunction(() => Boolean(window.__game) && window.__game.snapshot().assetsLoaded);

const results = await page.evaluate(() => {
  const game = window.__game;
  const snap = game.snapshot();
  const start = { x: snap.players[0].x, y: snap.players[0].y };
  const found = [];
  for (let y = 0; y < snap.grid.height; y += 1) {
    for (let x = 0; x < snap.grid.width; x += 1) {
      if (snap.grid.tiles[y * snap.grid.width + x] !== 'floor') continue;
      const res = game.dispatch({ type: 'MoveTo', unitId: 'player-1', target: { x, y } });
      const rejected = res.events.some((e) => e.type === 'CommandRejected');
      const moves = res.events.filter((e) => e.type === 'UnitMoved');
      const attacks = res.events.filter((e) => e.type === 'AttackPerformed');
      const final = res.snapshot.players[0];
      if (!rejected && moves.length >= 4 && moves.length <= 6 && attacks.length === 0) {
        found.push({
          target: { x, y },
          moves: moves.length,
          from: moves[0].from,
          to: moves.at(-1).to,
          mp: final.mp,
          display: Math.abs(x - start.x) + Math.abs(y - start.y),
        });
      }
      game.dispatch({ type: 'Restart' });
    }
  }
  return found;
});
console.log('found', results.length);
console.log(results.slice(0, 40));
await browser.close();

import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
page.on('console', (message) => console.log('[console]', message.text()));

async function reset(options) {
  await page.goto('http://127.0.0.1:4173/?seed=279837264&test=1');
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game.snapshot().assetsLoaded,
  );
  await page.evaluate(async (opts) => {
    const [{ createInitialState }, { BspMapGenerator }, inventory] =
      await Promise.all([
        import('/src/game/engine.ts'),
        import('/src/game/bsp.ts'),
        import('/src/game/inventory.ts'),
      ]);
    const base = createInitialState({ seed: 279837264, generator: new BspMapGenerator() });
    const template = base.players[0];
    const state = {
      ...base,
      players: [
        {
          ...template,
          equipment: inventory.equipmentFromLegacy(template.id, {
            weaponId: 'sword',
            armorId: 'armor',
            shieldId: 'shield',
          }),
          inventory: inventory.inventoryFromIds(template.id, ['axe', 'dagger']),
        },
      ],
      groundItems: (opts.ground ?? []).map((itemId, index) => ({
        id: `item-test-ground-${index}`,
        itemId,
        x: template.x,
        y: template.y,
      })),
    };
    window.__game.setup(JSON.parse(JSON.stringify(state)));
  }, options);
  await page.evaluate(() => window.__game.advance(1_000_000));
  await page.keyboard.press('i');
  await page.waitForSelector('[data-testid="inventory-panel"]:not([hidden])');
}

const info = () =>
  page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inventory-panel"]');
    const active = document.activeElement;
    const menu = document.querySelector('[data-testid="inventory-submenu"]');
    return {
      t: Math.round(performance.now()),
      selected: panel?.dataset?.selectedKey ?? null,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      menu: menu ? !menu.hidden : false,
    };
  });

const sleep = (ms) => page.waitForTimeout(ms);

await reset({ ground: ['hammer'] });
for (let step = 0; step < 10; step += 1) {
  const now = await info();
  if (now.activeRow === 'ground:item-test-ground-0') break;
  const zone = await page.evaluate(
    () => document.activeElement?.closest?.('[data-zone]')?.dataset?.zone ?? null,
  );
  if (zone !== 'right') await page.keyboard.press('Tab');
  else await page.keyboard.press('ArrowDown');
}
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await sleep(1500);

await page.evaluate(() => {
  window.__obs = [];
  const menu = document.querySelector('[data-testid="inventory-submenu"]');
  const panel = document.querySelector('[data-testid="inventory-panel"]');
  const push = (kind, detail) =>
    window.__obs.push({ t: Math.round(performance.now()), kind, detail });
  new MutationObserver(() => {
    push('menu-hidden', { hidden: menu.hidden });
  }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(() => {
    push('selected', { value: panel.dataset.selectedKey });
  }).observe(panel, { attributes: true, attributeFilter: ['data-selected-key'] });
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    push('raf', {});
    return originalRaf(callback);
  };
});

console.log('BEFORE ENTER', JSON.stringify(await info()));
await page.keyboard.press('Enter');
for (const delay of [10, 20, 50, 100, 200, 400]) {
  await sleep(delay);
  console.log('AFTER +', delay, JSON.stringify(await info()));
}
const log = await page.evaluate(() => window.__obs);
console.log('OBSERVATIONS', JSON.stringify(log.slice(0, 80), null, 2));

await browser.close();

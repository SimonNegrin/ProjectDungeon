import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.log('[pageerror]', error.message));

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
    const banner = document.querySelector('[data-testid="feedback-banner"]');
    const marks = document.querySelector('[data-testid="unit-marks"]');
    return {
      t: Math.round(performance.now()),
      selected: panel?.dataset?.selectedKey ?? null,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      menu: menu ? !menu.hidden : false,
      banner: banner ? { hidden: banner.hidden, text: banner.textContent } : null,
      marks: marks ? marks.children.length : null,
      damageTexts: document.querySelectorAll('[data-testid="damage-text"]').length,
    };
  });

const sleep = (ms) => page.waitForTimeout(ms);

await reset({ ground: ['hammer'] });

await page.evaluate(() => {
  window.__renders = 0;
  const panel = document.querySelector('[data-testid="inventory-panel"]');
  new MutationObserver(() => {
    window.__renders += 1;
  }).observe(panel, { attributes: true, attributeFilter: ['data-selected-key'] });
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    window.__renders += 1;
    return originalRaf(callback);
  };
});

console.log('OPEN, no action', JSON.stringify(await info()));
await sleep(500);
console.log('renders in 500ms', await page.evaluate(() => window.__renders), JSON.stringify(await info()));
await page.keyboard.press('Enter');
await sleep(150);
console.log('menu after Enter (no action yet)', JSON.stringify(await info()));
await page.keyboard.press('Escape');

await page.evaluate(() => {
  window.__renders = 0;
});
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
console.log('AFTER PICKUP anim end', JSON.stringify(await info()));
for (const wait of [500, 1000, 2000, 3000]) {
  await sleep(wait);
  console.log(
    'after',
    wait,
    'renders since reset',
    await page.evaluate(() => window.__renders),
    JSON.stringify(await info()),
  );
}
await page.keyboard.press('Enter');
await sleep(120);
console.log('ENTER at ~6.5s', JSON.stringify(await info()));

await browser.close();

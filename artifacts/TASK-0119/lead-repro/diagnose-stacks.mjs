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
    const active = document.activeElement;
    const menu = document.querySelector('[data-testid="inventory-submenu"]');
    return {
      selected: document.querySelector('[data-testid="inventory-panel"]')?.dataset
        ?.selectedKey,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      menu: menu ? !menu.hidden : false,
    };
  });

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

await page.evaluate(() => {
  window.__stacks = [];
  const originalRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    const stack = new Error().stack ?? '';
    const frames = stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim().replace(/\?t=\d+/, ''))
      .filter((line) => line.includes('src/host') || line.includes('main.ts'));
    window.__stacks.push(frames.slice(0, 4));
    return originalRaf(callback);
  };
});

await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await page.waitForTimeout(1500);
const stacks = await page.evaluate(() => window.__stacks.slice(-40));
console.log('STACKS', JSON.stringify(stacks, null, 2));
console.log('STATE', JSON.stringify(await info()));
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
console.log('AFTER ENTER', JSON.stringify(await info()));

await browser.close();

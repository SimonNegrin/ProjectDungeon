import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (message) => console.log('[console]', message.type(), message.text()));
page.on('pageerror', (error) => console.log('[pageerror]', error.message));

await page.goto('http://127.0.0.1:4173/?seed=279837264&test=1');
await page.waitForFunction(
  () => Boolean(window.__game) && window.__game.snapshot().assetsLoaded,
);

await page.evaluate(async () => {
  const [{ createInitialState }, { BspMapGenerator }, inventory, equipment] =
    await Promise.all([
      import('/src/game/engine.ts'),
      import('/src/game/bsp.ts'),
      import('/src/game/inventory.ts'),
      import('/src/game/equipment.ts'),
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
          armorId: null,
          shieldId: null,
        }),
        inventory: inventory.inventoryFromIds(template.id, ['axe', 'dagger']),
      },
    ],
    groundItems: [
      { id: 'item-test-ground-0', itemId: 'hammer', x: template.x, y: template.y },
    ],
  };
  window.__game.setup(JSON.parse(JSON.stringify(state)));
});
await page.evaluate(() => window.__game.advance(1_000_000));

await page.keyboard.press('i');
await page.waitForSelector('[data-testid="inventory-panel"]:not([hidden])');

const info = () =>
  page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inventory-panel"]');
    const active = document.activeElement;
    return {
      selectedKey: panel?.dataset?.selectedKey ?? null,
      activeTestId: active?.dataset?.testid ?? null,
      activeRowKey: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      activeZone: active?.closest?.('[data-zone]')?.dataset?.zone ?? null,
      visibleRows: [
        ...document.querySelectorAll('[data-row-key][data-empty="false"]'),
      ].map((row) => row.dataset.rowKey),
      menuVisible: !document.querySelector('[data-testid="inventory-submenu"]')?.hidden,
    };
  });

// Tab hasta la zona del suelo.
for (let step = 0; step < 6; step += 1) {
  const current = await info();
  if (current.activeZone === 'right') break;
  await page.keyboard.press('Tab');
}

// Flechas hasta la fila del martillo.
for (let step = 0; step < 20; step += 1) {
  const current = await info();
  if (current.activeRowKey === 'ground:item-test-ground-0') break;
  await page.keyboard.press('ArrowDown');
}
console.log('BEFORE MENU', JSON.stringify(await info()));

await page.keyboard.press('Enter');
console.log('MENU AFTER FIRST ENTER', JSON.stringify(await info()));
await page.keyboard.press('Enter'); // Recoger (primera opción)
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
);
console.log('AFTER PICKUP (realtime)', JSON.stringify(await info()));

await page.keyboard.press('Enter');
console.log('AFTER SECOND ENTER', JSON.stringify(await info()));

await page.keyboard.press('Escape');
const mp = await page.evaluate(() => window.__game.snapshot().players[0].mp);
console.log('MP', mp);

await browser.close();

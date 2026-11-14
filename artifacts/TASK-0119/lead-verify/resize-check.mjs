import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.log('[pageerror]', error.message));

await page.goto('http://127.0.0.1:4173/?seed=279837264&test=1');
await page.waitForFunction(
  () => Boolean(window.__game) && window.__game.snapshot().assetsLoaded,
);
await page.evaluate(async () => {
  const [{ createInitialState }, { BspMapGenerator }, inventory] = await Promise.all([
    import('/src/game/engine.ts'),
    import('/src/game/bsp.ts'),
    import('/src/game/inventory.ts'),
  ]);
  const base = createInitialState({ seed: 279837264, generator: new BspMapGenerator() });
  const template = base.players[0];
  window.__game.setup({
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
    enemies: [],
  });
});
await page.evaluate(() => window.__game.advance(1_000_000));
await page.keyboard.press('i');
await page.waitForSelector('[data-testid="inventory-panel"]:not([hidden])');

const info = () =>
  page.evaluate(() => {
    const panel = document.querySelector('[data-testid="inventory-panel"]');
    const active = document.activeElement;
    const menu = document.querySelector('[data-testid="inventory-submenu"]');
    return {
      selected: panel?.dataset?.selectedKey ?? null,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      menu: menu ? !menu.hidden : false,
      mp: window.__game.snapshot().players[0].mp,
    };
  });

async function selectGround() {
  for (let step = 0; step < 10; step += 1) {
    const now = await info();
    if (now.activeRow === 'ground:item-test-ground-0') return;
    const zone = await page.evaluate(
      () => document.activeElement?.closest?.('[data-zone]')?.dataset?.zone ?? null,
    );
    if (zone !== 'right') await page.keyboard.press('Tab');
    else await page.keyboard.press('ArrowDown');
  }
  throw new Error('No se alcanzó el arma del suelo');
}

await selectGround();
const before = await info();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const opened = await info();

// 1) Resize con el menú abierto: no debe cerrarlo.
await page.setViewportSize({ width: 900, height: 700 });
await page.waitForTimeout(200);
const afterResize = await info();
await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(200);
const afterResizeBack = await info();

// 2) Render con el mismo estado (advance(0)): no debe cerrarlo.
await page.evaluate(() => window.__game.advance(0));
await page.waitForTimeout(200);
const afterRefresh = await info();

// 3) Update real con estado nuevo y mismas opciones (EndTurn sin enemigos).
await page.evaluate(() => window.__game.dispatch({ type: 'EndTurn' }));
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 10_000 },
);
await page.waitForTimeout(200);
const afterTurn = await info();

// 4) El teclado sigue operativo: flechas y Escape.
await page.keyboard.press('ArrowDown');
const activeKind = await page.evaluate(
  () =>
    document.querySelector('[data-testid="inventory-submenu"] [data-active="true"]')
      ?.dataset.kind ?? null,
);
await page.keyboard.press('Escape');
const afterEscape = await info();

console.log(
  JSON.stringify(
    {
      before,
      opened,
      afterResize,
      afterResizeBack,
      afterRefresh,
      afterTurn,
      activeKind,
      afterEscape,
    },
    null,
    2,
  ),
);

await browser.close();

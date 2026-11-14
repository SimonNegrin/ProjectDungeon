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
            weaponId: opts.weaponId ?? null,
            armorId: null,
            shieldId: null,
          }),
          inventory: inventory.inventoryFromIds(template.id, opts.inventory ?? []),
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
      selected: panel?.dataset?.selectedKey ?? null,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      activeTestId: active?.dataset?.testid ?? null,
      activeTag: active?.tagName ?? null,
      menu: menu ? !menu.hidden : false,
      rows: [...document.querySelectorAll('[data-row-key][data-empty="false"]')].map(
        (row) => row.dataset.rowKey,
      ),
    };
  });

async function selectRow(key) {
  const current = await info();
  if (current.activeRow === key) return true;
  // Con filas solo en el suelo, Tab una vez basta para llegar a la zona.
  for (let step = 0; step < 10; step += 1) {
    const now = await info();
    if (now.activeRow === key) return true;
    await page.keyboard.press('ArrowDown');
  }
  return false;
}

async function run(name, options) {
  await reset(options);
  console.log(name, 'OPEN', JSON.stringify(await info()));
  await selectRow('ground:item-test-ground-0');
  console.log(name, 'SELECTED', JSON.stringify(await info()));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => !window.__game.snapshot().animation.animating,
    undefined,
    { timeout: 5000 },
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
  console.log(name, 'AFTER PICKUP', JSON.stringify(await info()));
  await page.keyboard.press('Enter');
  console.log(name, 'AFTER ENTER', JSON.stringify(await info()));
}

await run('bare-pickup', { ground: ['hammer'] });
await run('bare-equip', { ground: ['hammer'] });

// Equipar desde el suelo con personaje desnudo (segunda opción del menú).
await reset({ ground: ['hammer'] });
await selectRow('ground:item-test-ground-0');
await page.keyboard.press('Enter');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
);
console.log('bare-equip-from-ground AFTER', JSON.stringify(await info()));
await page.keyboard.press('Enter');
console.log('bare-equip-from-ground AFTER ENTER', JSON.stringify(await info()));

// Desequipar el único objeto equipado y mochila vacía: filas equipadas vacías.
await reset({ weaponId: 'sword' });
await selectRow('slot:weapon');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
);
console.log('unequip-only AFTER', JSON.stringify(await info()));
await page.keyboard.press('Enter');
console.log('unequip-only AFTER ENTER', JSON.stringify(await info()));

// Soltar el único objeto equipado con mochila vacía.
await reset({ weaponId: 'sword' });
await selectRow('slot:weapon');
await page.keyboard.press('Enter');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForFunction(
  () => !window.__game.snapshot().animation.animating,
  undefined,
  { timeout: 5000 },
);
await page.evaluate(
  () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
);
console.log('drop-only AFTER', JSON.stringify(await info()));
await page.keyboard.press('Enter');
console.log('drop-only AFTER ENTER', JSON.stringify(await info()));

await browser.close();

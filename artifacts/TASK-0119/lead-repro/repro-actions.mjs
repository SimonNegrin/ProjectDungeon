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
          mp: opts.mp ?? template.mp,
          equipment: inventory.equipmentFromLegacy(template.id, {
            weaponId: opts.weaponId === undefined ? 'sword' : opts.weaponId,
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
      activeZone: active?.closest?.('[data-zone]')?.dataset?.zone ?? null,
      menu: menu ? !menu.hidden : false,
      rows: [...document.querySelectorAll('[data-row-key][data-empty="false"]')].map(
        (row) => row.dataset.rowKey,
      ),
    };
  });

async function selectRow(key) {
  for (let step = 0; step < 10; step += 1) {
    const current = await info();
    if (current.activeRow === key) return true;
    if (current.activeZone !== 'right' && key.startsWith('ground:')) {
      await page.keyboard.press('Tab');
      continue;
    }
    if (current.activeZone !== 'backpack' && key.startsWith('backpack:')) {
      await page.keyboard.press('Tab');
      continue;
    }
    await page.keyboard.press('ArrowDown');
  }
  return false;
}

async function waitRealTime() {
  await page.waitForFunction(
    () => !window.__game.snapshot().animation.animating,
    undefined,
    { timeout: 5000 },
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
}

async function scenario(name, options, rowKey, menuSteps) {
  await reset(options);
  const selected = await selectRow(rowKey);
  await page.keyboard.press('Enter');
  const opened = (await info()).menu;
  for (const step of menuSteps) await page.keyboard.press(step);
  await page.keyboard.press('Enter');
  await waitRealTime();
  const after = await info();
  await page.keyboard.press('Enter');
  const afterEnter = await info();
  const snapshot = await page.evaluate(() => {
    const snap = window.__game.snapshot();
    return {
      mp: snap.players[0].mp,
      ground: snap.groundItems.map((item) => item.id),
      lastEvents: snap.lastEvents.map((event) => event.type),
    };
  });
  console.log(
    JSON.stringify({ name, selectOk: selected, opened, after, afterEnter, snapshot }),
  );
}

const axeDagger = ['axe', 'dagger'];

await scenario('pickup-single', { inventory: axeDagger, ground: ['hammer'] }, 'ground:item-test-ground-0', []);
await scenario(
  'equip-from-ground',
  { inventory: axeDagger, ground: ['hammer'] },
  'ground:item-test-ground-0',
  ['ArrowDown'],
);
await scenario('pickup-two-ground-selected-second', {
  inventory: axeDagger,
  ground: ['hammer', 'knife'],
}, 'ground:item-test-ground-1', []);
await scenario('equip-backpack', { inventory: axeDagger, ground: [] }, 'backpack:0', []);
await scenario('unequip-slot', { inventory: [], ground: [] }, 'slot:weapon', []);
await scenario('drop-slot', { inventory: [], ground: [] }, 'slot:weapon', ['ArrowDown']);

// Cambio de turno tras recoger: cierra, termina turno, reabre y Enter.
await reset({ inventory: axeDagger, ground: ['hammer'] });
await selectRow('ground:item-test-ground-0');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await waitRealTime();
const beforeTurn = await info();
await page.keyboard.press('Escape');
await page.evaluate(() => window.__game.dispatch({ type: 'EndTurn' }));
await waitRealTime();
await page.keyboard.press('i');
await page.waitForSelector('[data-testid="inventory-panel"]:not([hidden])');
const reopened = await info();
await page.keyboard.press('Enter');
console.log(JSON.stringify({ name: 'turn-change', beforeTurn, reopened, afterEnter: await info() }));

await browser.close();

import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.log('[pageerror]', error.message));

const ROW_QUERY = '[data-row-key][data-empty="false"]';

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

const state = () =>
  page.evaluate((query) => {
    const panel = document.querySelector('[data-testid="inventory-panel"]');
    const active = document.activeElement;
    const menu = document.querySelector('[data-testid="inventory-submenu"]');
    const snap = window.__game.snapshot();
    return {
      selected: panel?.dataset?.selectedKey ?? null,
      activeRow: active?.closest?.('[data-row-key]')?.dataset?.rowKey ?? null,
      activeTag: active?.tagName ?? null,
      activeZone: active?.closest?.('[data-zone]')?.dataset?.zone ?? null,
      menu: menu ? !menu.hidden : false,
      mp: snap.players[0].mp,
      animating: snap.animation.animating,
      ground: snap.groundItems.map((item) => item.id),
      inventory: snap.players[0].inventory.items.map((item) => item?.id ?? null),
      equipment: Object.fromEntries(
        Object.entries(snap.players[0].equipment).map(([slot, item]) => [
          slot,
          item?.id ?? null,
        ]),
      ),
      rows: [...document.querySelectorAll(query)].map((row) => {
        const rect = row.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
          key: row.dataset.rowKey,
          zone: row.closest('[data-zone]')?.dataset?.zone ?? '',
          x: rect.left + rect.width / 2 - panelRect.left,
          y: rect.top + rect.height / 2 - panelRect.top,
        };
      }),
    };
  }, ROW_QUERY);

function readingOrder(a, b) {
  return a.y - b.y || a.x - b.x || a.key.localeCompare(b.key);
}

function findNeighbor(cells, currentKey, direction) {
  const current = cells.find((cell) => cell.key === currentKey);
  if (!current) return null;
  let best = null;
  let bestDistance = Infinity;
  let bestDeviation = Infinity;
  for (const candidate of cells) {
    if (candidate.key === current.key) continue;
    const dx = candidate.x - current.x;
    const dy = candidate.y - current.y;
    const ahead =
      direction === 'up'
        ? dy < 0
        : direction === 'down'
          ? dy > 0
          : direction === 'left'
            ? dx < 0
            : dx > 0;
    if (!ahead) continue;
    const distance = dx * dx + dy * dy;
    const deviation = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy);
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        (deviation < bestDeviation ||
          (deviation === bestDeviation && readingOrder(candidate, best) < 0)))
    ) {
      best = candidate;
      bestDistance = distance;
      bestDeviation = deviation;
    }
  }
  return best;
}

function pathTo(rows, fromKey, toKey) {
  const queue = [{ key: fromKey, path: [] }];
  const seen = new Set([fromKey]);
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current.key === toKey) return current.path;
    for (const direction of ['up', 'down', 'left', 'right']) {
      const next = findNeighbor(rows, current.key, direction);
      if (!next || seen.has(next.key)) continue;
      seen.add(next.key);
      queue.push({ key: next.key, path: [...current.path, direction] });
    }
  }
  return null;
}

const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

async function selectRow(key) {
  const current = await state();
  if (current.activeRow === key) return;
  const target = current.rows.find((row) => row.key === key);
  if (!target) throw new Error(`fila ${key} inexistente`);
  for (let press = 0; press < 12; press += 1) {
    const now = await state();
    if (now.activeZone === target.zone && now.activeRow !== null) break;
    await page.keyboard.press('Tab');
  }
  let now = await state();
  if (now.activeRow === key) return;
  if (!now.rows.some((row) => row.key === now.activeRow)) {
    // El foco puede caer en «Cerrar»: volver a entrar por Tab.
    await page.keyboard.press('Tab');
    now = await state();
  }
  const path = pathTo(now.rows, now.activeRow, key);
  if (!path) throw new Error(`sin ruta de ${now.activeRow} a ${key}`);
  for (const direction of path) await page.keyboard.press(KEYS[direction]);
  now = await state();
  if (now.activeRow !== key) throw new Error(`foco en ${now.activeRow}, no en ${key}`);
}

async function waitAnimation() {
  await page.waitForFunction(
    () => !window.__game.snapshot().animation.animating,
    undefined,
    { timeout: 5000 },
  );
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
}

// PRNG determinista.
let seed = 123456789;
function random() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

await reset({
  inventory: ['axe', 'dagger', 'knife'],
  ground: ['hammer', 'electric-sword', 'plate', 'shield'],
});

const trace = [];
for (let step = 0; step < 120; step += 1) {
  const before = await state();
  const rows = before.rows;
  if (rows.length === 0) break;
  const target = rows[Math.floor(random() * rows.length)];
  await selectRow(target.key);

  // Enter debe abrir siempre el submenú sobre una fila con acciones.
  await page.keyboard.press('Enter');
  const opened = await state();
  if (!opened.menu) {
    console.log('FAIL: Enter no abrió tras seleccionar', JSON.stringify({ step, before, opened }, null, 2));
    trace.push({ step, action: 'open-failed', before, opened });
    break;
  }
  const optionCount = await page
    .locator('[data-testid="inventory-submenu"] [role="menuitem"]')
    .count();
  const choice = Math.floor(random() * optionCount);
  for (let index = 0; index < choice; index += 1) await page.keyboard.press('ArrowDown');
  const chosen = await page.evaluate(() => {
    const option = document.querySelector(
      '[data-testid="inventory-submenu"] [data-active="true"]',
    );
    return {
      kind: option?.dataset?.kind ?? null,
      disabled: option?.getAttribute('aria-disabled') === 'true',
    };
  });
  await page.keyboard.press('Enter');
  await waitAnimation();
  const after = await state();
  trace.push({ step, target: target.key, chosen, before: { selected: before.selected, mp: before.mp }, after });

  // Tras la acción, Enter debe reabrir el submenú.
  await page.keyboard.press('Enter');
  const reopened = await state();
  if (!reopened.menu) {
    console.log(
      'FAIL: Enter no reabrió tras ejecutar',
      JSON.stringify({ step, target: target.key, chosen, after, reopened }, null, 2),
    );
    break;
  }
  await page.keyboard.press('Escape');
  const closed = await state();
  if (closed.menu) {
    console.log('FAIL: Escape no cerró el submenú', JSON.stringify({ step, after }, null, 2));
    break;
  }
  if (step % 20 === 0) {
    console.log('OK step', step, JSON.stringify({ after: { selected: after.selected, mp: after.mp, rows: after.rows.length } }));
  }
}

console.log('TRACE_LENGTH', trace.length);
await browser.close();

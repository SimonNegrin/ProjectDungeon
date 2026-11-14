import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { WEAPONS } from '../../src/game/equipment';
import { FEEDBACK_CONFIG } from '../../src/host/feedback-config';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import { openBspState } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

const EQUIPMENT_SEED = 279837264;
const HIT_SEED = 1;
const MISS_SEED = 13;

interface Probe {
  raf: number;
  mutations: number;
}

interface HudSnapshot {
  readonly banner: { hidden: boolean; text: string | null } | null;
  readonly damage: {
    hidden: boolean;
    text: string | null;
    opacity: string;
    transform: string;
  } | null;
  readonly animating: boolean;
}

function floorNeighbor(snap: GameSnapshot, x: number, y: number) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= snap.grid.width || cell.y >= snap.grid.height) return false;
    return snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor';
  });
}

/**
 * Cuenta `requestAnimationFrame` y las mutaciones de `debug-content` (el host
 * reescribe su texto en cada `render()`). Se instala antes de la acción para
 * medir el reposo sin depender de hooks internos del host.
 */
async function installRenderProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="debug-content"]');
    if (!target) throw new Error('Falta el overlay de debug');
    const probe = { raf: 0, mutations: 0 };
    (window as unknown as { __feedbackProbe: Probe }).__feedbackProbe = probe;
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      probe.raf += 1;
      return original(callback);
    };
    new MutationObserver(() => {
      probe.mutations += 1;
    }).observe(target, { childList: true, subtree: true, characterData: true });
  });
}

/** Reposo real: reinicia contadores y los lee tras `duration` ms. */
async function measureIdle(page: Page, duration: number): Promise<Probe> {
  return page.evaluate(async (ms) => {
    const probe = (window as unknown as { __feedbackProbe: Probe })
      .__feedbackProbe;
    probe.raf = 0;
    probe.mutations = 0;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
    return { raf: probe.raf, mutations: probe.mutations };
  }, duration);
}

async function hudSnapshot(page: Page): Promise<HudSnapshot> {
  return page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>(
      '[data-testid="feedback-banner"]',
    );
    const damage = document.querySelector<HTMLElement>(
      '[data-testid="damage-feedback"]',
    );
    return {
      banner: banner
        ? { hidden: banner.hidden, text: banner.textContent }
        : null,
      damage: damage
        ? {
            hidden: damage.hidden,
            text: damage.textContent,
            opacity: damage.style.opacity,
            transform: damage.style.transform,
          }
        : null,
      animating: window.__game!.snapshot().animation.animating,
    };
  });
}

async function waitForAnimationEnd(page: Page): Promise<void> {
  await page.waitForFunction(
    () => !window.__game!.snapshot().animation.animating,
    undefined,
    { timeout: 5_000 },
  );
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function saveEvidence(
  testInfo: TestInfo,
  name: string,
  data: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'runtime', `${name}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

test('TASK-0120: el banner de recogida caduca en tiempo real y el render se detiene', async ({
  page,
}, testInfo) => {
  const base = await openBspState(page, EQUIPMENT_SEED);
  const weapon = base.weapons[0];
  expect(weapon).toBeDefined();
  await openBspState(page, EQUIPMENT_SEED, undefined, {
    player: { x: weapon.x, y: weapon.y },
  });

  await installRenderProbe(page);
  await page.evaluate(() =>
    window.__game!.dispatch({ type: 'PickUp', unitId: 'player-1' }),
  );

  const banner = page.getByTestId('feedback-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveText(`+ ${WEAPONS[weapon.weaponId].name}`);
  await waitForAnimationEnd(page);
  const atAnimationEnd = await hudSnapshot(page);

  // La persistencia del banner (800 ms) corre con el reloj real, sin settle().
  await page.waitForTimeout(FEEDBACK_CONFIG.texts.bannerMs);
  const idle = await measureIdle(page, 1_000);
  const atTwoSeconds = await hudSnapshot(page);
  await screenshot(page, 'pickup-banner-reposo', testInfo);
  await saveEvidence(testInfo, 'pickup-clock', {
    atAnimationEnd,
    idle,
    atTwoSeconds,
  });

  expect(
    atTwoSeconds.banner?.hidden,
    'el banner debe haberse consumido con el reloj real',
  ).toBe(true);
  expect(idle, 'en reposo no debe quedar ningún frame de feedback').toEqual({
    raf: 0,
    mutations: 0,
  });
});

for (const scenario of [
  { name: 'impacto', seed: HIT_SEED, expected: /^-\d+$/ },
  { name: 'fallo', seed: MISS_SEED, expected: 'Fallo' },
] as const) {
  test(`TASK-0120: el texto de ${scenario.name} caduca sin reiniciar su animación`, async ({
    page,
  }, testInfo) => {
    const base = await openBspState(page, scenario.seed);
    const enemy = base.enemies[0];
    const west = floorNeighbor(base, enemy.x, enemy.y);
    expect(west).toBeDefined();
    await openBspState(page, scenario.seed, undefined, {
      player: west!,
      enemies: [{ ...enemy, hp: 300 }],
    });

    await installRenderProbe(page);
    await page.evaluate(
      ({ targetId }) =>
        window.__game!.dispatch({
          type: 'Attack',
          unitId: 'player-1',
          targetId,
        }),
      { targetId: enemy.id },
    );

    const damage = page.getByTestId('damage-feedback');
    await expect(damage).toBeVisible();
    await expect(damage).toHaveText(scenario.expected);
    await waitForAnimationEnd(page);
    const atAnimationEnd = await hudSnapshot(page);

    // El texto dura 1000 ms desde su cue; la animación ya consumió su beat.
    await page.waitForTimeout(400);
    const fading = await hudSnapshot(page);
    await page.waitForTimeout(FEEDBACK_CONFIG.texts.damageMs);
    const idle = await measureIdle(page, 1_000);
    const atTwoSeconds = await hudSnapshot(page);
    await screenshot(page, `damage-${scenario.name}-reposo`, testInfo);
    await saveEvidence(testInfo, `damage-${scenario.name}-clock`, {
      atAnimationEnd,
      fading,
      idle,
      atTwoSeconds,
    });

    expect(
      fading.damage?.transform,
      'el texto debe seguir avanzando y no reiniciar su animación',
    ).not.toBe(atAnimationEnd.damage?.transform);
    expect(
      atTwoSeconds.damage?.hidden,
      'el texto debe haberse consumido con el reloj real',
    ).toBe(true);
    expect(idle, 'en reposo no debe quedar ningún frame de feedback').toEqual({
      raf: 0,
      mutations: 0,
    });
  });
}

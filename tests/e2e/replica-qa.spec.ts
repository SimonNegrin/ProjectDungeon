import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameEvent } from '../../src/game/types';
import type { GameSnapshot } from '../../src/host/debug';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  dispatchFrozen,
  openBspState,
  settle,
} from './support';

/**
 * QA visual de la réplica (REQ-027 T-006): fallo cuerpo a cuerpo, giro del
 * defensor hacia el atacante original y ausencia de texto e indicador propios.
 * La semilla 13 hace fallar el primer ataque del jugador; el enemigo se marca
 * alerta en el setup para que sea elegible y el cue de réplica exista.
 */
const MISS_SEED = 13;

function floorNeighbor(
  snap: GameSnapshot,
  x: number,
  y: number,
): { x: number; y: number } | undefined {
  // Se prefiere una adyacencia horizontal para que el giro y la embestida se
  // lean en el eje X y el texto `Fallo` no tape al defensor.
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y - 1 },
    { x, y: y + 1 },
  ].find((cell) => {
    if (cell.x < 0 || cell.y < 0) return false;
    if (cell.x >= snap.grid.width || cell.y >= snap.grid.height) return false;
    return snap.grid.tiles[cell.y * snap.grid.width + cell.x] === 'floor';
  });
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

async function advance(page: Page, ms: number): Promise<GameSnapshot> {
  return page.evaluate((delta) => window.__game!.advance(delta), ms);
}

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`réplica: fallo, giro y secuencia sin texto (${viewport.width}×${viewport.height})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const base = await openBspState(page, MISS_SEED);
    const enemy = base.enemies[0];
    const beside = floorNeighbor(base, enemy.x, enemy.y);
    expect(beside, 'El enemigo debe tener una casilla libre al lado').toBeDefined();
    await openBspState(page, MISS_SEED, undefined, {
      player: beside!,
      enemies: [
        {
          ...enemy,
          awareness: 'alert',
          lastKnown: { x: beside!.x, y: beside!.y },
          hasShouted: true,
        },
      ],
      rng: { seed: MISS_SEED, state: 0 },
    });

    const result = await dispatchFrozen(page, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: enemy.id,
    });
    const events = result.events.map((event: GameEvent) => event.type);
    expect(events).toEqual(['AttackPerformed', 'ReplicaPerformed']);
    const attack = result.events.find(
      (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
        event.type === 'AttackPerformed',
    );
    expect(attack).toBeDefined();
    expect(attack!.hit).toBe(false);

    // Fallo: el atacante embiste y el defensor esquiva. Sin texto de réplica.
    await advanceToCue(page, 'attack');
    await advance(page, 90);
    await expect(page.getByTestId('damage-feedback')).toHaveText('Fallo');
    await expect(page.getByTestId('damage-feedback-2')).toBeHidden();
    await screenshot(
      page,
      `replica-fallo-${viewport.width}x${viewport.height}`,
      testInfo,
    );

    // Réplica: el defensor gira y embiste hacia el atacante original. El cue es
    // propio, conserva `hit` para el debug y no añade texto ni banner.
    const atReplica = await advanceToCue(page, 'replica');
    const replicaCue = atReplica.animation.cues.find(
      (cue) => cue.kind === 'replica',
    );
    expect(replicaCue).toMatchObject({
      kind: 'replica',
      unitId: attack!.attackerId,
    });
    expect(typeof replicaCue!.hit).toBe('boolean');
    await advance(page, 90);
    await expect(page.getByTestId('feedback-banner')).toBeHidden();
    const visibleTexts = await page
      .locator('[data-damage-text]:visible')
      .allTextContents();
    expect(visibleTexts.every((text) => text === 'Fallo')).toBe(true);
    await expect(page.getByTestId('damage-feedback-2')).toBeHidden();
    await expect(page.getByTestId('hud')).not.toContainText(/réplica|replica/i);
    await screenshot(
      page,
      `replica-giro-${viewport.width}x${viewport.height}`,
      testInfo,
    );

    await settle(page);
    expect((await page.evaluate(() => window.__game!.snapshot())).status).toBe(
      'playing',
    );
  });
}

import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../../src/game/engine';
import { parseManifest, readSaveFiles } from '../../src/game/save';
import type { GameState } from '../../src/game/types';
import { readSaveZip } from '../../src/host/save-zip';
import { artifactPath } from './artifacts';
import { openBspState, openState, snapshot } from './support';

const SEED = 279837264;

async function openPause(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-root')).toBeVisible();
}

test('TASK-0140: Guardar descarga un único .zip real con manifiesto y partida', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  const before = await openBspState(page, SEED);

  await openPause(page);
  // Guardar ya está disponible en fase de personajes y sin animación.
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  await expect(page.getByTestId('pause-save-reason')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('pause-save').click();
  const download = await downloadPromise;

  const expected = new RegExp(
    `^proyectdungeon-${before.rng.seed}-\\d{8}-\\d{6}\\.zip$`,
  );
  expect(download.suggestedFilename()).toMatch(expected);

  const path = artifactPath(
    testInfo,
    'downloads',
    download.suggestedFilename(),
  );
  await mkdir(dirname(path), { recursive: true });
  await download.saveAs(path);

  const files = await readSaveZip(new Uint8Array(await readFile(path)));

  const manifest = parseManifest(files.manifest);
  expect(manifest.ok).toBe(true);
  if (!manifest.ok) return;
  expect(manifest.value.format_version).toBe(1);
  expect(manifest.value.game_version).toBe('0.1.0');
  expect(manifest.value.seed).toBe(before.rng.seed);
  expect(manifest.value.created_at).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  );
  expect(Number.isFinite(Date.parse(manifest.value.created_at))).toBe(true);
  expect(manifest.value.summary.turn).toBe(before.round);
  expect(manifest.value.summary.round).toBe(before.round);
  expect(manifest.value.summary.phase).toBe('player');
  expect(manifest.value.summary.players.map((entry) => entry.name)).toEqual(
    before.players.map((player) => player.nombre),
  );
  expect(
    manifest.value.summary.players.map((entry) => entry.archetype),
  ).toEqual(before.players.map((player) => player.archetypeId));

  const loaded = readSaveFiles(files);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) return;
  expect(loaded.value.state.rng.seed).toBe(before.rng.seed);
  expect(loaded.value.state.round).toBe(before.round);
  expect(loaded.value.state.phase).toBe(before.phase);
  expect(loaded.value.state.activePlayerId).toBe(before.activePlayerId);
  expect(loaded.value.state.players.map((player) => player.id)).toEqual(
    before.players.map((player) => player.id),
  );

  // El `.zip` transporta solo el estado del motor, sin presentación del host.
  expect(files.save).not.toMatch(/timeline|camera|cursor|damageTexts/);
  expect(files.manifest).not.toMatch(/timeline|camera|cursor|panel/);

  // La pausa sigue abierta, el foco no se mueve y no se anuncia error.
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await expect(page.getByTestId('pause-save')).toBeFocused();
  await expect(page.getByTestId('pause-save-message')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
  expect(errors).toEqual([]);
});

test('TASK-0140: un error de serialización se anuncia y no descarga nada', async ({
  page,
}) => {
  const base = createInitialState({ seed: SEED });
  const withoutMap: GameState = { ...base, map: undefined };
  await page.setViewportSize({ width: 1280, height: 720 });
  await openState(page, withoutMap, SEED);
  const current = await snapshot(page);
  expect(current.seed).toBeNull();

  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });

  await openPause(page);
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  await page.getByTestId('pause-save').click();

  const message = page.getByTestId('pause-save-message');
  await expect(message).toBeVisible();
  await expect(message).toContainText('No se pudo guardar la partida');
  expect(downloads).toBe(0);

  // El error no rompe las cinco acciones ni el foco de la selección actual.
  await expect(page.getByTestId('pause-root').locator('.pause-button')).toHaveCount(5);
  await expect(page.getByTestId('pause-save')).toBeEnabled();
  await expect(page.getByTestId('pause-save')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeHidden();
});

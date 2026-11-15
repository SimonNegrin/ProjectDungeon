/**
 * Probe E2E de TASK-0144 para el criterio 7 (resultado).
 *
 * Vive fuera de `tests/e2e/` a propósito: confirma un defecto abierto y no debe
 * dejar la suite roja mientras TASK-0153 es propietaria del arreglo. Mide:
 * - botones que ofrece el overlay de victoria/derrota (REQ-024 R-012/T-013),
 * - si `R` reinicia desde el resultado,
 * - si `Esc` abre la pausa tras el resultado,
 * - si el botón «Reiniciar» reinicia de verdad con la misma party y semilla.
 *
 * Uso: `node artifacts/TASK-0144/attempt-1/probe/probe.mjs`
 * Requiere el servidor de desarrollo en PROBE_URL (por defecto 4174).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.PROBE_URL ?? 'http://127.0.0.1:4174';
const probeDir = dirname(fileURLToPath(import.meta.url));
const seed = 279837264;

const findings = {};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${baseUrl}/?seed=${seed}&test=1`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game.snapshot().assetsLoaded,
  );

  const openResult = async (status) => {
    return page.evaluate(async (wanted) => {
      const module = await import('/src/game/engine.ts');
      const state = { ...module.createInitialState({ seed: 279837264 }), status: wanted };
      return window.__game.setup(state);
    }, status);
  };

  const overlayButtons = (testId) =>
    page.evaluate(
      (id) =>
        [...document.querySelectorAll(`[data-testid="${id}"] button`)].map(
          (button) => (button.textContent ?? '').trim(),
        ),
      testId,
    );

  /* ------------------------------- victoria ------------------------------- */
  const victory = await openResult('victory');
  findings.victory = {
    status: victory.status,
    overlayVisible: await page.getByTestId('overlay-victory').isVisible(),
    buttons: await overlayButtons('overlay-victory'),
    rRestarts: null,
    escOpensPause: null,
    pauseSaveEnabled: null,
    pauseSaveReason: null,
    restartClickRestarts: null,
  };
  await page.screenshot({
    path: resolve(probeDir, 'resultado-victoria.png'),
    animations: 'disabled',
  });

  // `R` en el resultado: variante que sí cumple el criterio.
  await page.keyboard.press('r');
  const afterR = await page.evaluate(() => window.__game.snapshot());
  findings.victory.rRestarts = afterR.lastEvents.some(
    (event) => event.type === 'GameRestarted',
  );

  // `Esc` en el resultado: ¿sigue habiendo pausa?
  await page.keyboard.press('Escape');
  findings.victory.escOpensPause = await page
    .getByTestId('pause-menu')
    .isVisible();
  if (findings.victory.escOpensPause) {
    findings.victory.pauseSaveEnabled = await page
      .getByTestId('pause-save')
      .isEnabled();
    findings.victory.pauseSaveReason = (
      await page.getByTestId('pause-save-reason').textContent()
    )?.trim();
    await page.screenshot({
      path: resolve(probeDir, 'resultado-pausa.png'),
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
  }

  // El botón «Reiniciar» del overlay, si existe, ¿reinicia de verdad?
  const restartButton = page
    .getByTestId('overlay-victory')
    .getByRole('button', { name: 'Reiniciar' });
  if ((await restartButton.count()) > 0) {
    const before = await page.evaluate(() => window.__game.snapshot());
    await restartButton.click();
    const after = await page.evaluate(() => window.__game.snapshot());
    findings.victory.restartClickRestarts = {
      event: after.lastEvents.some((event) => event.type === 'GameRestarted'),
      sameSeed: after.rng.seed === before.rng.seed,
      sameParty: after.players.map((player) => player.id).join(',') ===
        before.players.map((player) => player.id).join(','),
      status: after.status,
    };
  }

  /* -------------------------------- derrota ------------------------------- */
  const defeat = await openResult('defeat');
  findings.defeat = {
    status: defeat.status,
    overlayVisible: await page.getByTestId('overlay-defeat').isVisible(),
    buttons: await overlayButtons('overlay-defeat'),
  };
  await page.screenshot({
    path: resolve(probeDir, 'resultado-derrota.png'),
    animations: 'disabled',
  });

  findings.pageErrors = errors;

  const victoryButtons = findings.victory.buttons;
  const restartOffered =
    victoryButtons.includes('Reiniciar') || victoryButtons.includes('Nueva partida');
  const restartIsQuick =
    victoryButtons.includes('Reiniciar') && !victoryButtons.includes('Nueva partida');
  const defect =
    restartIsQuick ||
    findings.victory.escOpensPause === true ||
    findings.victory.restartClickRestarts?.event === true;

  await mkdir(probeDir, { recursive: true });
  await writeFile(
    resolve(probeDir, 'output.json'),
    `${JSON.stringify({ baseUrl, seed, defect, ...findings }, null, 2)}\n`,
  );

  console.log(JSON.stringify({ baseUrl, seed, defect, ...findings }, null, 2));
  if (defect) {
    console.log(
      'DEFECTO CONFIRMADO: el resultado ofrece reinicio rápido y/o pausa (REQ-024 R-012/T-013). Propietario: TASK-0153.',
    );
  } else {
    console.log('Sin defecto: el resultado no ofrece reinicio ni pausa.');
  }
} finally {
  await browser.close();
}

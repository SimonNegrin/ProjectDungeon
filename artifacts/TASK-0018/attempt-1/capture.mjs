import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:4173';
const OUT = 'artifacts/TASK-0018/attempt-1';
const SHOTS = `${OUT}/screenshots`;
const log = [];

function note(label, value) {
  log.push(`${label}: ${JSON.stringify(value)}`);
  console.log(label, value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function open(page, query = '') {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${BASE}/${query}`);
  await page.waitForFunction(
    () => Boolean(window.__game) && window.__game.snapshot().assetsLoaded,
  );
}

const snapshot = (page) => page.evaluate(() => window.__game.snapshot());

await mkdir(SHOTS, { recursive: true });
await mkdir(`${OUT}/logs`, { recursive: true });
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await open(page, '?seed=279837264');

  const start = await snapshot(page);
  note('start.player', start.players[0]);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const planned = await snapshot(page);
  assert(planned.cursor.path.length === 2, 'El plan debe tener dos pasos');

  await page.keyboard.press('Space');
  // Detiene el reloj automático para que el muestreo sea determinista.
  await page.evaluate(() => window.__game.advance(0));
  const active = await snapshot(page);
  assert(active.animation.animating, 'El movimiento debe animarse');
  note('animation.start', active.animation);
  note('hud.inicial', await page.getByTestId('hud-player-mp').textContent());

  const cursorHidden = await page
    .locator('[data-testid="cursor"]')
    .evaluate((element) => element.hidden);
  const dotsAtStart = await page.locator('[data-testid="cursor-path-point"]').count();
  note('anim.cursorHidden', cursorHidden);
  note('anim.pathDots', dotsAtStart);
  assert(cursorHidden, 'El cursor debe estar oculto durante la animación');
  assert(dotsAtStart === 2, 'Los dos puntos del camino deben seguir visibles');

  // Input de juego descartado: ni cursor ni jugador cambian.
  const beforeGate = await snapshot(page);
  await page.keyboard.press('ArrowRight');
  const afterGate = await snapshot(page);
  note('gate.cursorIgual', afterGate.cursor.x === beforeGate.cursor.x);
  note('gate.playerIgual', afterGate.players[0].x === beforeGate.players[0].x);
  assert(afterGate.cursor.x === beforeGate.cursor.x, 'La flecha debe descartarse');

  // F1 sigue activo durante la animación.
  await page.keyboard.press('F1');
  const debugOpen = await page.getByTestId('debug-overlay').isVisible();
  await page.keyboard.press('F1');
  note('gate.f1AbrioDebug', debugOpen);
  assert(debugOpen, 'F1 debe abrir el debug durante la animación');

  // Mitad de la primera transición (70 ms de pausa + 62 ms).
  await page.evaluate(() => window.__game.advance(132));
  const middle = await snapshot(page);
  note('animation.middle', middle.animation);
  note('hud.middle.mp', await page.getByTestId('hud-player-mp').textContent());
  const dotsMiddle = await page.locator('[data-testid="cursor-path-point"]').count();
  note('anim.pathDotsMiddle', dotsMiddle);
  await page.screenshot({ path: `${SHOTS}/step-intermediate.png` });

  await page.evaluate(() => window.__game.advance(1_000_000));
  const arrival = await snapshot(page);
  note('arrival.animation', arrival.animation);
  note('arrival.player', arrival.players[0]);
  note('arrival.cursor', arrival.cursor);
  note('arrival.camera', arrival.camera);
  note('hud.arrival.mp', await page.getByTestId('hud-player-mp').textContent());
  assert(!arrival.animation.animating, 'La animación debe haber terminado');
  assert(arrival.players[0].mp === planned.players[0].mp - 2, 'El MP final debe coincidir');
  await page.screenshot({ path: `${SHOTS}/arrival.png` });

  // R durante una animación cancela y reinicia.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  const beforeRestart = await snapshot(page);
  assert(beforeRestart.animation.animating, 'Debe haber animación antes de R');
  await page.keyboard.press('r');
  const restarted = await snapshot(page);
  note('restart.animation', restarted.animation);
  note('restart.player', restarted.players[0]);
  assert(!restarted.animation.animating, 'R debe cancelar la animación');
  assert(restarted.turn === 1, 'R debe reiniciar la partida');

  // dispatch completa la animación pendiente antes de aplicar el comando.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  const pending = await snapshot(page);
  assert(pending.animation.animating, 'Debe haber animación pendiente');
  const dispatched = await page.evaluate(() =>
    window.__game.dispatch({ type: 'EndTurn' }),
  );
  note('dispatch.animation', dispatched.snapshot.animation);
  note('dispatch.turn', dispatched.snapshot.turn);
  assert(dispatched.snapshot.turn === 2, 'dispatch debe aplicar EndTurn sobre el movimiento completado');
  await page.evaluate(() => window.__game.advance(1_000_000));

  // Fase enemiga: se anima el enemigo y el HUD sigue en fase enemiga.
  await page.keyboard.press('r');
  await page.keyboard.press('e');
  await page.evaluate(() => window.__game.advance(0));
  const enemyActive = await snapshot(page);
  note('enemy.animation.start', enemyActive.animation);
  if (enemyActive.animation.animating) {
    await page.evaluate(() => window.__game.advance(132));
    const enemyMiddle = await snapshot(page);
    note('enemy.animation.middle', enemyMiddle.animation);
    note('enemy.hud.phase', await page.getByTestId('hud-phase').textContent());
    const enemyCursorHidden = await page
      .locator('[data-testid="cursor"]')
      .evaluate((element) => element.hidden);
    note('enemy.cursorHidden', enemyCursorHidden);
    await page.screenshot({ path: `${SHOTS}/enemy-phase.png` });
    await page.evaluate(() => window.__game.advance(1_000_000));
    const enemyEnd = await snapshot(page);
    note('enemy.after', { phase: enemyEnd.phase, turn: enemyEnd.turn, animation: enemyEnd.animation });
    assert(enemyEnd.phase === 'player', 'La fase enemiga debe terminar en el turno del jugador');
  } else {
    await page.screenshot({ path: `${SHOTS}/enemy-phase.png` });
  }

  await context.close();

  // Reduced motion: mismo estado final, sin animación ni pausa.
  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    reducedMotion: 'reduce',
  });
  const reducedPage = await reducedContext.newPage();
  await open(reducedPage, '?seed=279837264');
  const reducedStart = await snapshot(reducedPage);
  await reducedPage.keyboard.press('ArrowRight');
  await reducedPage.keyboard.press('ArrowRight');
  await reducedPage.keyboard.press('Space');
  const reduced = await snapshot(reducedPage);
  note('reduced.animation', reduced.animation);
  note('reduced.player', reduced.players[0]);
  note('hud.reduced.mp', await reducedPage.getByTestId('hud-player-mp').textContent());
  assert(!reduced.animation.animating, 'reduced motion no debe animar');
  assert(
    reduced.players[0].mp === reducedStart.players[0].mp - 2,
    'reduced motion debe aplicar el mismo coste',
  );
  await reducedPage.screenshot({ path: `${SHOTS}/reduced-motion.png` });
  await reducedContext.close();

  await writeFile(`${OUT}/logs/visual-evidence.log`, `${log.join('\n')}\n`, 'utf8');
  console.log(`\nOK: ${log.length} comprobaciones de evidencia visual`);
} finally {
  await browser.close();
}

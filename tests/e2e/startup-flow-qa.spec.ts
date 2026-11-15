import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { MAP_OFFSET_BACKING } from '../../src/host/layout';
import { artifactPath } from './artifacts';
import { waitForCanvasStable } from './support';

/**
 * QA E2E del arranque de REQ-016 (TASK-0129): menú, paso 1, jugador a jugador,
 * resumen, cancelación y partida. Usa la URL normal (sin `?test=1`) y recorre el
 * flujo tal y como lo ve el jugador; no inyecta estado ni cambia producto.
 */

test.use({ viewport: { width: 1280, height: 720 } });

/** Celda de `rogues.png` del Guerrero variante 2 (REQ-016, tabla de sprites). */
const WARRIOR_VARIANT_2_CELL = { sx: 64, sy: 32 } as const;

async function save(
  page: Page,
  testInfo: TestInfo,
  name: string,
  target?: Locator,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  // Sin puntero sobre un control: la captura no mezcla hover con el estado real.
  await page.mouse.move(0, 0);
  if (target) {
    await target.screenshot({ path, animations: 'disabled' });
  } else {
    await page.screenshot({ path, animations: 'disabled' });
  }
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await testInfo.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

async function openMenu(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-step1')).toBeHidden();
}

/** Abre paso 1 con N jugadores y una semilla escrita. */
async function openStepOne(
  page: Page,
  playerCount: number,
  seed: string,
): Promise<void> {
  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await page.getByTestId('step1-players').selectOption(String(playerCount));
  await page.getByTestId('step1-seed').fill(seed);
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('start-screen')).toBeHidden();
}

/** Avanza por los N jugadores con los valores por defecto. */
async function completePlayers(page: Page, playerCount: number): Promise<void> {
  for (let index = 0; index < playerCount; index += 1) {
    await page.getByTestId('player-next').click();
  }
  await expect(page.getByTestId('party-summary')).toBeVisible();
}

/** Avanza con Tab hasta que el control pedido tenga el foco (sin clics). */
async function tabToTestId(page: Page, testId: string, maxSteps = 24): Promise<void> {
  for (let step = 0; step < maxSteps; step += 1) {
    const focused = await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.dataset.testid ??
        document.activeElement?.tagName ??
        '',
    );
    if (focused === testId) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`No se alcanzó ${testId} con Tab en ${maxSteps} pasos`);
}

async function expectFocusOutline(page: Page, testId: string): Promise<void> {
  const style = await page.getByTestId(testId).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
    };
  });
  expect(style.outlineStyle, `${testId}: estilo de foco`).not.toBe('none');
  expect(
    Number.parseFloat(style.outlineWidth),
    `${testId}: ancho de foco`,
  ).toBeGreaterThan(0);
}

async function readScale(page: Page): Promise<number> {
  return page.evaluate(() => {
    return (
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),
      ) || 1
    );
  });
}

/** Posición del recorte de la miniatura del HUD sin la escala publicada. */
async function hudPortraitOffset(page: Page): Promise<{ x: number; y: number }> {
  const scale = await readScale(page);
  return page.evaluate((currentScale) => {
    const portrait = document.querySelector<HTMLElement>(
      '[data-testid="hud-portrait"]',
    );
    if (!portrait) throw new Error('Falta [data-testid="hud-portrait"]');
    const [x, y] = getComputedStyle(portrait).backgroundPosition
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));
    return { x: x / currentScale, y: y / currentScale };
  }, scale);
}

/**
 * Colores distintos del bloque del tile del jugador en el canvas de respaldo.
 * No decide qué sprite es, solo que el mapa lo dibuja (no queda un tile plano).
 */
async function playerTileColors(page: Page): Promise<number> {
  return page.evaluate(
    ({ offset, blockSize }) => {
      const snapshot = window.__game!.snapshot();
      const player = snapshot.players[0];
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
      const context = canvas?.getContext('2d');
      if (!canvas || !context) throw new Error('Falta #game-canvas o su contexto 2D');
      const x = offset + (player.x * 32 - snapshot.camera.x) * 3;
      const y = (player.y * 32 - snapshot.camera.y) * 3;
      if (x < 0 || y < 0 || x + blockSize > canvas.width || y + blockSize > canvas.height) {
        throw new Error(`El tile del jugador (${player.x},${player.y}) queda fuera del canvas`);
      }
      const data = context.getImageData(x, y, blockSize, blockSize).data;
      const colors = new Set<string>();
      for (let index = 0; index < data.length; index += 4) {
        colors.add(
          `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`,
        );
      }
      return colors.size;
    },
    { offset: MAP_OFFSET_BACKING, blockSize: 32 * 3 },
  );
}

async function scrollMetrics(
  page: Page,
  selector: string,
): Promise<{
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  overflowX: string;
  overflowY: string;
}> {
  return page.locator(selector).evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      overflowX: computed.overflowX,
      overflowY: computed.overflowY,
    };
  });
}

test('dos jugadores solo con teclado: variante en mapa y miniatura del HUD', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await openMenu(page);
  // URL normal: el arranque no depende de `?test=1`.
  expect(new URL(page.url()).search, 'el E2E usa la URL normal').toBe('');
  await expect(page.getByTestId('start-new')).toBeFocused();

  // `Esc` no abandona el menú principal.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-step1')).toBeHidden();

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('start-load')).toBeFocused();
  await expectFocusOutline(page, 'start-load');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('start-new')).toBeFocused();
  await save(page, testInfo, 'menu-1280x720');

  // «Nueva» abre el paso 1 con el foco en jugadores.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('step1-players')).toBeFocused();
  await page.keyboard.press('2');
  await expect(page.getByTestId('step1-players')).toHaveValue('2');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('step1-seed')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('4242');
  await expect(page.getByTestId('step1-seed')).toHaveValue('4242');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('step1-continue')).toBeFocused();
  await expectFocusOutline(page, 'step1-continue');
  await save(page, testInfo, 'paso1-2-jugadores-1280x720');
  await page.keyboard.press('Enter');

  // Jugador 1: Guerrero variante 2 y nombre con acentos, todo con teclado.
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 2');
  await expect(page.getByTestId('player-archetype-warrior')).toBeFocused();
  // De Guerrero a «Variante 2»: nueve arquetipos y la variante 1.
  for (let step = 0; step < 10; step += 1) await page.keyboard.press('Tab');
  await expect(page.getByTestId('player-variant-2')).toBeFocused();
  await expectFocusOutline(page, 'player-variant-2');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('player-variant-2')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('player-variant-selected-2')).toBeVisible();
  await expect(page.getByTestId('player-variant-selected-2')).toHaveText(
    'Seleccionada',
  );

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('player-name')).toBeFocused();
  await page.keyboard.type('Ñandú Pérez');
  await expect(page.getByTestId('player-name')).toHaveValue('Ñandú Pérez');
  await save(page, testInfo, 'jugador-1-guerrero-v2-1280x720');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('player-next')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 2 de 2');

  // Jugador 2: valores por defecto; se avanza con teclado hasta «Siguiente».
  await expect(page.getByTestId('player-archetype-warrior')).toBeFocused();
  await tabToTestId(page, 'player-next');
  await expect(page.getByTestId('player-next')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('party-summary')).toBeVisible();
  await expect(page.getByTestId('summary-start')).toBeFocused();
  await expect(page.getByTestId('summary-seed')).toContainText('4242');
  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(2);
  const first = page.getByTestId('summary-player-1');
  const second = page.getByTestId('summary-player-2');
  await expect(first.getByTestId('summary-player-number')).toHaveText('1');
  await expect(first.getByTestId('summary-player-archetype')).toHaveText('Guerrero');
  await expect(first.getByTestId('summary-player-variant')).toHaveText('Variante 2');
  await expect(first.getByTestId('summary-player-name')).toHaveText('Ñandú Pérez');
  await expect(second.getByTestId('summary-player-number')).toHaveText('2');
  await expect(second.getByTestId('summary-player-name')).toHaveText('Guerrero');
  await expect(page.getByTestId('party-summary').locator('input, select')).toHaveCount(0);
  await save(page, testInfo, 'resumen-2-jugadores-1280x720');

  // «Empezar» desde el teclado arranca la partida con la party del resumen.
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('party-summary')).toBeHidden();
  await expect(page.getByTestId('player-screen')).toBeHidden();
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(
    () => {
      const snapshot = window.__game?.snapshot();
      return Boolean(snapshot?.assetsLoaded && snapshot.config?.players.length === 2);
    },
  );
  await waitForCanvasStable(page);

  const state = await page.evaluate(() => {
    const snapshot = window.__game!.snapshot();
    return {
      seed: snapshot.seed,
      config: snapshot.config,
      players: snapshot.players.map((player) => ({
        archetypeId: player.archetypeId,
        variant: player.variant,
        nombre: player.nombre,
      })),
    };
  });
  expect(state.seed).toBe(4242);
  expect(state.config?.seed).toBe(4242);
  expect(state.config?.players).toEqual([
    { archetypeId: 'warrior', variant: 2, name: 'Ñandú Pérez' },
    { archetypeId: 'warrior', variant: 1, name: '' },
  ]);
  expect(state.players).toEqual([
    { archetypeId: 'warrior', variant: 2, nombre: 'Ñandú Pérez' },
    { archetypeId: 'warrior', variant: 1, nombre: 'Guerrero' },
  ]);

  // Miniatura del HUD: recorte de la variante 2, no el sprite fijo del arquetipo.
  const offset = await hudPortraitOffset(page);
  expect(offset.x, 'miniatura: columna de la variante 2').toBeCloseTo(
    -WARRIOR_VARIANT_2_CELL.sx * 2,
    0,
  );
  expect(offset.y, 'miniatura: fila de la variante 2').toBeCloseTo(
    -WARRIOR_VARIANT_2_CELL.sy * 2,
    0,
  );
  // Mapa: el tile del jugador no es un bloque plano.
  expect(await playerTileColors(page), 'mapa: sprite dibujado').toBeGreaterThan(2);

  await save(page, testInfo, 'partida-2-jugadores-1280x720');
  await save(page, testInfo, 'mapa-variante-2-1280x720', page.locator('#game-canvas'));
  await save(page, testInfo, 'hud-variante-2-1280x720', page.getByTestId('hud-left'));

  expect(errors, 'errores de página durante el recorrido').toEqual([]);
});

test('un jugador: resumen y partida con la semilla mostrada', async ({
  page,
}, testInfo) => {
  await openMenu(page);
  await openStepOne(page, 1, '4242');
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 1');
  await completePlayers(page, 1);

  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(1);
  await expect(page.getByTestId('summary-seed')).toContainText('4242');
  await save(page, testInfo, 'resumen-1-jugador-1280x720');

  await page.getByTestId('summary-start').click();
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(() => {
    const snapshot = window.__game?.snapshot();
    return Boolean(snapshot?.assetsLoaded && snapshot.config?.players.length === 1);
  });
  const state = await page.evaluate(() => {
    const snapshot = window.__game!.snapshot();
    return {
      seed: snapshot.seed,
      config: snapshot.config,
      phase: snapshot.phase,
      status: snapshot.status,
    };
  });
  expect(state.seed).toBe(4242);
  expect(state.config).toEqual({
    seed: 4242,
    players: [{ archetypeId: 'warrior', variant: 1, name: '' }],
  });
  expect(state.phase).toBe('player');
  expect(state.status).toBe('playing');
  await save(page, testInfo, 'partida-1-jugador-1280x720');
});

test('seis jugadores a 900x700: party, semilla de solo lectura y scroll interno', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openMenu(page);
  await save(page, testInfo, 'menu-900x700');

  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await save(page, testInfo, 'paso1-900x700');
  await page.getByTestId('step1-players').selectOption('6');
  await page.getByTestId('step1-seed').fill('777');
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 6');

  const playerScroll = await scrollMetrics(page, '[data-testid="player-screen"]');
  const playerPanelScroll = await scrollMetrics(page, '.player-screen-panel');
  const playerLayout = await page.evaluate(() => {
    const screen = document.querySelector<HTMLElement>('[data-testid="player-screen"]');
    const panel = screen?.querySelector<HTMLElement>('.player-screen-panel');
    if (!screen || !panel) throw new Error('Falta la pantalla de jugador o su panel');
    const screenRect = screen.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      scrollTop: screen.scrollTop,
      screenTop: screenRect.top,
      screenBottom: screenRect.bottom,
      panelTop: panelRect.top,
      panelBottom: panelRect.bottom,
      panelHeight: panelRect.height,
    };
  });
  await save(page, testInfo, 'jugador-1-de-6-900x700');

  // Evidencia del scroll interno: al final se ven las acciones completas.
  await page
    .locator('[data-testid="player-screen"]')
    .evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await save(page, testInfo, 'jugador-1-de-6-scroll-900x700');

  await completePlayers(page, 6);

  await expect(page.getByTestId('summary-players').getByRole('listitem')).toHaveCount(6);
  for (let number = 1; number <= 6; number += 1) {
    const row = page.getByTestId(`summary-player-${number}`);
    await expect(row.getByTestId('summary-player-number')).toHaveText(String(number));
    await expect(row.getByTestId('summary-player-archetype')).toHaveText('Guerrero');
    await expect(row.getByTestId('summary-player-variant')).toHaveText('Variante 1');
    await expect(row.getByTestId('summary-player-name')).toHaveText('Guerrero');
  }
  await expect(page.getByTestId('summary-seed')).toHaveText('Semilla 777');
  await expect(page.getByTestId('party-summary').locator('input, select, textarea')).toHaveCount(
    0,
  );

  const summaryScroll = await scrollMetrics(page, '[data-testid="party-summary"]');
  const summaryPanelScroll = await scrollMetrics(page, '.party-summary-panel');
  await save(page, testInfo, 'resumen-6-jugadores-900x700');
  await save(
    page,
    testInfo,
    'resumen-6-jugadores-panel-900x700',
    page.locator('.party-summary-panel'),
  );

  await writeLog(testInfo, 'scroll-900x700.json', {
    viewport: '900x700',
    player: { screen: playerScroll, panel: playerPanelScroll, layout: playerLayout },
    summary: { screen: summaryScroll, panel: summaryPanelScroll },
  });
});

test('semilla: ?seed=, inválida bloquea y vacía genera otra', async ({
  page,
}, testInfo) => {
  await page.goto('/?seed=42');
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await page.getByTestId('start-new').click();

  const seed = page.getByTestId('step1-seed');
  const error = page.getByTestId('step1-error');
  await expect(seed).toHaveValue('42');
  await seed.fill('123');
  await expect(seed).toHaveValue('123');

  await seed.fill('abc');
  await page.getByTestId('step1-continue').click();
  await expect(error).toBeVisible();
  await expect(error).toContainText('inválida');
  await expect(seed).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await save(page, testInfo, 'paso1-semilla-invalida-1280x720');

  await seed.fill('');
  await page.getByTestId('step1-continue').click();
  await expect(error).toBeHidden();
  const generated = await seed.inputValue();
  expect(generated, 'vacía genera otra semilla').not.toBe('');
  expect(generated).not.toBe('abc');
  await expect(page.getByTestId('player-screen')).toBeVisible();

  // `?seed=` precarga una sola vez: la siguiente entrada genera otra semilla.
  await page.getByTestId('player-cancel').click();
  await page.getByTestId('player-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await page.getByTestId('start-new').click();
  await expect(seed).not.toHaveValue('42');
  await expect(seed).not.toHaveValue('');

  // `?seed=` inválido se ignora con aviso y se genera una aleatoria.
  await page.goto('/?seed=abc');
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-status')).toContainText('inválida');
  await page.getByTestId('start-new').click();
  await expect(seed).not.toHaveValue('');
  await expect(seed).not.toHaveValue('abc');
});

test('nombre: acentos, truncado a 12, vacío y duplicados', async ({
  page,
}, testInfo) => {
  await openMenu(page);
  await openStepOne(page, 3, '4242');
  const name = page.getByTestId('player-name');

  await name.fill('Ñandú Pérez Sol');
  const truncated = await name.inputValue();
  expect(Array.from(truncated), 'el nombre se trunca a 12 code points').toHaveLength(12);
  expect(truncated.startsWith('Ñandú Pérez'), 'los acentos se conservan').toBe(true);
  await name.fill('Ñandú Pérez');
  await expect(name).toHaveValue('Ñandú Pérez');
  await page.getByTestId('player-next').click();

  // Duplicado permitido: mismo nombre que el jugador 1.
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 2 de 3');
  await name.fill('Ñandú Pérez');
  await expect(name).toHaveValue('Ñandú Pérez');

  // «Atrás» conserva los valores de ambos jugadores y «Siguiente» vuelve.
  await page.getByTestId('player-back').click();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 1 de 3');
  await expect(name).toHaveValue('Ñandú Pérez');
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 2 de 3');
  await expect(name).toHaveValue('Ñandú Pérez');
  await page.getByTestId('player-next').click();

  // Vacío: el resumen usa el nombre del arquetipo.
  await expect(page.getByTestId('player-position')).toHaveText('Jugador 3 de 3');
  await expect(name).toHaveValue('');
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();

  const names = await page
    .locator('[data-testid^="summary-player-name"]')
    .allTextContents();
  expect(names, 'nombres en orden, duplicado y vacío resuelto').toEqual([
    'Ñandú Pérez',
    'Ñandú Pérez',
    'Guerrero',
  ]);
  await expect(page.getByTestId('summary-error')).toBeHidden();
  await save(page, testInfo, 'resumen-nombres-1280x720');
});

test('cancelar o Esc en paso 1, jugador y resumen confirman la vuelta al menú', async ({
  page,
}, testInfo) => {
  await openMenu(page);

  // Paso 1: desistir conserva la semilla; confirmar descarta y vuelve al menú.
  await page.getByTestId('start-new').click();
  const seed = page.getByTestId('step1-seed');
  const kept = await seed.inputValue();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-cancel-dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByTestId('start-cancel-dismiss')).toBeFocused();
  await save(page, testInfo, 'confirmacion-paso1-1280x720');
  await page.getByTestId('start-cancel-dismiss').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(seed).toHaveValue(kept);
  await page.keyboard.press('Escape');
  await page.getByTestId('start-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();

  // Jugador: desistir conserva arquetipo; confirmar descarta y vuelve al menú.
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption('2');
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await page.getByTestId('player-archetype-mage').click();
  await page.getByTestId('player-cancel').click();
  await expect(page.getByTestId('player-cancel-dialog')).toBeVisible();
  await page.getByTestId('player-cancel-dismiss').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await expect(page.getByTestId('player-archetype-mage')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await page.getByTestId('player-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();

  // Resumen: `Esc` abre el aviso y confirmar vuelve al menú principal.
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-continue').click();
  await completePlayers(page, 1);
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('summary-cancel-dialog')).toBeVisible();
  await expect(page.getByTestId('summary-cancel-dismiss')).toBeFocused();
  await save(page, testInfo, 'confirmacion-resumen-1280x720');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('party-summary')).toBeHidden();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();
});

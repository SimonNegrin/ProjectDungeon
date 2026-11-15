import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { MAP_OFFSET_BACKING } from '../../src/host/layout';
import { artifactPath } from './artifacts';
import { waitForCanvasStable } from './support';

test.use({ viewport: { width: 1280, height: 720 } });

/** Celda de `rogues.png` de REQ-016 para el Guerrero en cada variante. */
const WARRIOR_CELLS = {
  1: { sx: 0, sy: 32 },
  2: { sx: 64, sy: 32 },
} as const;

interface VariantSample {
  readonly variant: number | null;
  readonly archetypeId: string | null;
  readonly tile: { readonly x: number; readonly y: number };
  readonly camera: { readonly x: number; readonly y: number };
  /** Hash FNV-1a del bloque RGB del tile del jugador en el canvas. */
  readonly canvasHash: string;
  /** Colores distintos del bloque: descarta un tile vacío o plano. */
  readonly distinctColors: number;
  /** Posición lógica del recorte en la miniatura, sin la escala del HUD. */
  readonly hudPosition: { readonly x: number; readonly y: number };
}

async function saveScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  target?: Locator,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.mouse.move(0, 0);
  if (target) {
    await target.screenshot({ path, animations: 'disabled' });
  } else {
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  }
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  data: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** Arranque real desde el menú: un Guerrero con la variante pedida. */
async function startWarriorGame(page: Page, variant: 1 | 2): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-players').selectOption('1');
  await page.getByTestId('step1-seed').fill('4242');
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();

  await page.getByTestId('player-archetype-warrior').click();
  await page.getByTestId(`player-variant-${variant}`).click();
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.getByTestId('summary-start').click();

  await expect(page.locator('#game-canvas')).toBeVisible();
  await expect(page.getByTestId('start-screen')).toBeHidden();
  await page.waitForFunction(
    (expected) => {
      const snapshot = window.__game?.snapshot();
      return Boolean(
        snapshot?.assetsLoaded &&
          snapshot.players.length === 1 &&
          snapshot.players[0].archetypeId === 'warrior' &&
          snapshot.players[0].variant === expected,
      );
    },
    variant,
  );
  await waitForCanvasStable(page);

  expect(errors, 'errores de página durante el arranque').toEqual([]);
}

/**
 * Lee en una sola tarea el estado del jugador, el bloque 96×96 de su tile en el
 * canvas de respaldo y la posición del recorte de la miniatura del HUD.
 */
async function measure(page: Page): Promise<VariantSample> {
  return page.evaluate(({ offset, blockSize, scale }) => {
    const snapshot = window.__game!.snapshot();
    const player = snapshot.players[0];
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) throw new Error('Falta #game-canvas o su contexto 2D');

    const backingX = offset + (player.x * 32 - snapshot.camera.x) * 3;
    const backingY = (player.y * 32 - snapshot.camera.y) * 3;
    if (
      backingX < 0 ||
      backingY < 0 ||
      backingX + blockSize > canvas.width ||
      backingY + blockSize > canvas.height
    ) {
      throw new Error(
        `El tile del jugador (${player.x},${player.y}) queda fuera del canvas`,
      );
    }

    const data = context.getImageData(
      backingX,
      backingY,
      blockSize,
      blockSize,
    ).data;
    let hash = 2166136261;
    const colors = new Set<string>();
    for (let index = 0; index < data.length; index += 4) {
      hash ^= (data[index] << 16) ^ (data[index + 1] << 8) ^ data[index + 2];
      hash = Math.imul(hash, 16777619) >>> 0;
      colors.add(
        `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`,
      );
    }

    const portrait = document.querySelector<HTMLElement>(
      '[data-testid="hud-portrait"]',
    );
    if (!portrait) throw new Error('Falta [data-testid="hud-portrait"]');
    const position = getComputedStyle(portrait).backgroundPosition
      .split(/\s+/)
      .map((part) => Number.parseFloat(part));

    return {
      variant: player.variant,
      archetypeId: player.archetypeId,
      tile: { x: player.x, y: player.y },
      camera: { ...snapshot.camera },
      canvasHash: hash.toString(16),
      distinctColors: colors.size,
      hudPosition: {
        x: position[0] / scale,
        y: position[1] / scale,
      },
    };
  }, { offset: MAP_OFFSET_BACKING, blockSize: 32 * 3, scale: await readScale(page) });
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

function expectSample(
  sample: VariantSample,
  variant: 1 | 2,
  label: string,
): void {
  const cell = WARRIOR_CELLS[variant];
  expect(sample.variant, `${label}: variante en el estado`).toBe(variant);
  expect(sample.archetypeId, `${label}: arquetipo`).toBe('warrior');
  expect(sample.distinctColors, `${label}: sprite no vacío`).toBeGreaterThan(2);
  expect(
    Math.abs(sample.hudPosition.x - -cell.sx * 2),
    `${label}: columna ×2 de la miniatura (${sample.hudPosition.x} ≈ ${-cell.sx * 2})`,
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(sample.hudPosition.y - -cell.sy * 2),
    `${label}: fila ×2 de la miniatura (${sample.hudPosition.y} ≈ ${-cell.sy * 2})`,
  ).toBeLessThanOrEqual(1);
}

test('el mapa y la miniatura cambian con la variante del mismo arquetipo', async ({
  page,
}, testInfo) => {
  await startWarriorGame(page, 1);
  const first = await measure(page);
  expectSample(first, 1, 'variante 1');
  await saveScreenshot(page, testInfo, 'partida-variante-1-1280x720');
  await saveScreenshot(page, testInfo, 'mapa-variante-1-1280x720', page.locator('#game-canvas'));
  await saveScreenshot(
    page,
    testInfo,
    'hud-variante-1-1280x720',
    page.getByTestId('hud'),
  );

  // Mismo arranque, misma semilla y mismo arquetipo: solo cambia la variante.
  await startWarriorGame(page, 2);
  const second = await measure(page);
  expectSample(second, 2, 'variante 2');
  await saveScreenshot(page, testInfo, 'partida-variante-2-1280x720');
  await saveScreenshot(page, testInfo, 'mapa-variante-2-1280x720', page.locator('#game-canvas'));
  await saveScreenshot(
    page,
    testInfo,
    'hud-variante-2-1280x720',
    page.getByTestId('hud'),
  );

  // El mapa es idéntico salvo el sprite: mismo tile y misma cámara.
  expect(second.tile, 'el jugador arranca en el mismo tile').toEqual(first.tile);
  expect(second.camera, 'la cámara es la misma').toEqual(first.camera);
  expect(
    second.canvasHash,
    'el bloque del tile del jugador cambia con la variante',
  ).not.toBe(first.canvasHash);

  await writeLog(testInfo, 'variant-map-hud.json', {
    viewport: '1280x720',
    seed: 4242,
    expected: WARRIOR_CELLS,
    first,
    second,
  });
});

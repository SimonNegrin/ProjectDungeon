import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { artifactPath } from './artifacts';
import { openBspState, settle } from './support';

const ORIGIN = 'http://127.0.0.1:4173';
const FONT_URL = '/fonts/pixelify-sans/PixelifySans-VariableFont_wght.ttf';
const SAMPLE_TEXT = 'ñ á é í ó ú ü ¿ ¡ « »';
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;

interface NetworkAudit {
  readonly external: string[];
  readonly fontResponses: Array<{ url: string; status: number }>;
}

function auditNetwork(page: Page): NetworkAudit {
  const external: string[] = [];
  const fontResponses: Array<{ url: string; status: number }> = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) {
      return;
    }
    try {
      if (new URL(url).origin !== ORIGIN) external.push(url);
    } catch {
      external.push(url);
    }
  });
  page.on('response', (response) => {
    if (response.url().includes(FONT_URL)) {
      fontResponses.push({ url: response.url(), status: response.status() });
    }
  });

  return { external, fontResponses };
}

async function openGame(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await openBspState(page, 279837264);
  await page.evaluate(async () => {
    await document.fonts.load('16px "Pixelify Sans"', 'ñ á é í ó ú ü ¿ ¡ « »');
    await document.fonts.ready;
  });
  await settle(page);
}

async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function writeLog(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  const path = artifactPath(testInfo, 'logs', name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** Lee la familia y el tamaño efectivos de un selector visible. */
async function computed(
  page: Page,
  selector: string,
): Promise<{ family: string; size: string }> {
  return page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { family: style.fontFamily, size: style.fontSize };
  });
}

function uiLine(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--ui-line').trim(),
  );
}

test('sirve Pixelify Sans y la aplica a cuerpo, HUD y panel sin peticiones externas', async ({
  page,
}, testInfo) => {
  const audit = auditNetwork(page);
  await openGame(page, 1280, 720);

  const fontCheck = await page.evaluate(
    (text) => document.fonts.check('16px "Pixelify Sans"', text),
    SAMPLE_TEXT,
  );
  const glyphChecks = await page.evaluate(
    ({ text, sizes }) =>
      sizes.map((size) => ({
        size,
        ok: document.fonts.check(`${size}px "Pixelify Sans"`, text),
      })),
    { text: SAMPLE_TEXT, sizes: [16, 12.8, 12.48, 11.52] },
  );
  expect(fontCheck).toBe(true);
  expect(glyphChecks.every((check) => check.ok)).toBe(true);

  const body = await computed(page, 'body');
  const hud = await computed(page, '[data-testid="hud"]');
  const hudData = await computed(page, '[data-testid="hud-player-hp"]');
  const hudHelp = await computed(page, '[data-testid="hud-keys"]');
  expect(body.family).toContain('Pixelify Sans');
  expect(hud.family).toContain('Pixelify Sans');
  expect(hudData.family).toContain('Pixelify Sans');
  expect(hudHelp.family).toContain('Pixelify Sans');

  await page.keyboard.press('i');
  const panel = page.getByTestId('inventory-panel');
  await expect(panel).toBeVisible();

  const panelTitle = await computed(page, '.inventory-panel-title');
  const panelHelp = await computed(page, '.inventory-panel-help');
  expect(panelTitle.family).toContain('Pixelify Sans');
  expect(panelHelp.family).toContain('Pixelify Sans');

  expect(audit.fontResponses.length).toBeGreaterThan(0);
  expect(audit.fontResponses.every((response) => response.status === 200)).toBe(true);
  expect(audit.external, `Peticiones fuera del origen: ${audit.external.join(', ')}`).toEqual(
    [],
  );

  await writeLog(testInfo, 'ui-foundations-font.json', {
    fontCheck,
    glyphChecks,
    fontResponses: audit.fontResponses,
    external: audit.external,
    families: { body, hud, hudData, hudHelp, panelTitle, panelHelp },
    uiLine: await uiLine(page),
  });
});

test.describe('grosor de línea derivado del marco', () => {
  // A dpr 1 las escalas 1,17 y 1,44 se redondean ambas a 1 px de dispositivo;
  // con dpr 2 el redondeo deja valores distintos y demuestra que se recalcula.
  test.use({ deviceScaleFactor: 2 });

  test('--ui-line cambia entre 1280×720 y 900×700 sin mover el canvas', async ({
    page,
  }, testInfo) => {
    await openGame(page, 1280, 720);
    const first = await page.evaluate(() => {
      const frame = document
        .querySelector<HTMLElement>('[data-testid="frame"]')!
        .getBoundingClientRect();
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
      const canvasBox = canvas.getBoundingClientRect();
      return {
        line: getComputedStyle(document.documentElement)
          .getPropertyValue('--ui-line')
          .trim(),
        dpr: window.devicePixelRatio,
        frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
        canvas: {
          x: canvasBox.x,
          y: canvasBox.y,
          width: canvasBox.width,
          height: canvasBox.height,
        },
        internal: { width: canvas.width, height: canvas.height },
      };
    });

    expect(first.dpr).toBe(2);
    expect(first.line).toMatch(/^\d+(\.\d+)?px$/);
    expect(first.internal).toEqual({ width: 2218, height: 1248 });

    await page.setViewportSize({ width: 900, height: 700 });
    await expect.poll(async () => uiLine(page)).not.toBe(first.line);

    const second = await page.evaluate(() => {
      const frame = document
        .querySelector<HTMLElement>('[data-testid="frame"]')!
        .getBoundingClientRect();
      const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
      const canvasBox = canvas.getBoundingClientRect();
      return {
        line: getComputedStyle(document.documentElement)
          .getPropertyValue('--ui-line')
          .trim(),
        dpr: window.devicePixelRatio,
        frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
        canvas: {
          x: canvasBox.x,
          y: canvasBox.y,
          width: canvasBox.width,
          height: canvasBox.height,
        },
        internal: { width: canvas.width, height: canvas.height },
      };
    });

    expect(second.line).toMatch(/^\d+(\.\d+)?px$/);
    expect(second.internal).toEqual(first.internal);

    for (const measurement of [first, second]) {
      const line = Number.parseFloat(measurement.line);
      expect(Number.isInteger(line * measurement.dpr)).toBe(true);
      expect(line).toBeGreaterThanOrEqual(1 / measurement.dpr);
      // El canvas ocupa el marco sin desplazamiento ni deformación.
      expect(Math.abs(measurement.canvas.x - measurement.frame.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(measurement.canvas.y - measurement.frame.y)).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(measurement.canvas.width - measurement.frame.width),
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(measurement.canvas.height - measurement.frame.height),
      ).toBeLessThanOrEqual(0.5);
    }

    expect(first.line).not.toBe(second.line);

    await writeLog(testInfo, 'ui-foundations-line.json', {
      first: { line: first.line, dpr: first.dpr, frame: first.frame },
      second: { line: second.line, dpr: second.dpr, frame: second.frame },
    });
  });
});

test('capturas de HUD, panel y tabla de caracteres a 1280×720 y 900×700', async ({
  page,
}, testInfo) => {
  const measurements: unknown[] = [];

  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await openGame(page, viewport.width, viewport.height);

    await screenshot(page, testInfo, `hud-${suffix}`);

    await page.keyboard.press('i');
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    await screenshot(page, testInfo, `panel-${suffix}`);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();

    await page.evaluate(() => {
      const sample = document.createElement('aside');
      sample.dataset.testid = 'ui-font-sample';
      sample.style.cssText = [
        'position:fixed',
        'left:12px',
        'right:12px',
        'bottom:12px',
        'z-index:9999',
        'padding:8px 10px',
        'background:var(--ui-panel)',
        'color:var(--ui-text)',
        'border:var(--ui-line) solid var(--ui-line-color)',
        'line-height:1.4',
      ].join(';');
      const rows: Array<[string, string]> = [
        ['Título', '--ui-title'],
        ['Cuerpo', '--ui-body'],
        ['Dato 0123456789', '--ui-data'],
        ['Ayuda', '--ui-help'],
      ];
      sample.innerHTML = rows
        .map(
          ([label, token]) =>
            `<div style="font-family:var(--ui-font);font-size:var(${token})">` +
            `${label} · ñ á é í ó ú ü ¿ ¡ « »</div>`,
        )
        .join('');
      document.body.append(sample);
    });
    const fits = await page.locator('[data-testid="ui-font-sample"]').evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(fits.scrollWidth).toBeLessThanOrEqual(fits.clientWidth + 1);
    expect(fits.scrollHeight).toBeLessThanOrEqual(fits.clientHeight + 1);
    await screenshot(page, testInfo, `characters-${suffix}`);
    await page.evaluate(() =>
      document.querySelector('[data-testid="ui-font-sample"]')?.remove(),
    );

    measurements.push({
      viewport: suffix,
      uiLine: await uiLine(page),
      fontReady: await page.evaluate(() => document.fonts.check('16px "Pixelify Sans"')),
      fits,
    });
  }

  await writeLog(testInfo, 'ui-foundations.json', measurements);
});

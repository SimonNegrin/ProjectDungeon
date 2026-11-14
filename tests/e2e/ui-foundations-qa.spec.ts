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
const FRAME_LOGICAL_HEIGHT = 416;

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

function uiScale(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
  );
}

interface FrameMeasurement {
  line: string;
  scale: string;
  dpr: number;
  frame: { x: number; y: number; width: number; height: number };
  canvas: { x: number; y: number; width: number; height: number };
  internal: { width: number; height: number };
  hudFont: string;
}

async function measureFrame(page: Page): Promise<FrameMeasurement> {
  return page.evaluate(() => {
    const frame = document
      .querySelector<HTMLElement>('[data-testid="frame"]')!
      .getBoundingClientRect();
    const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
    const canvasBox = canvas.getBoundingClientRect();
    const hud = document.querySelector<HTMLElement>('[data-testid="hud"]')!;
    return {
      line: getComputedStyle(document.documentElement)
        .getPropertyValue('--ui-line')
        .trim(),
      scale: getComputedStyle(document.documentElement)
        .getPropertyValue('--ui-scale')
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
      hudFont: getComputedStyle(hud).fontSize,
    };
  });
}

interface StyleAuditEntry {
  selector: string;
  borderRadius: string;
  boxShadow: string;
  textShadow: string;
  backdropFilter: string;
  filter: string;
  backgroundImage: string;
  backgroundColor: string;
  borderTopColor: string;
  borderBottomColor: string;
}

async function auditStyles(page: Page, selectors: string[]): Promise<StyleAuditEntry[]> {
  return page.evaluate((list) => {
    return list.map((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Falta ${selector} para la auditoría de estilos`);
      const style = getComputedStyle(element);
      return {
        selector,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        textShadow: style.textShadow,
        backdropFilter: style.backdropFilter,
        filter: style.filter,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        borderTopColor: style.borderTopColor,
        borderBottomColor: style.borderBottomColor,
      };
    });
  }, selectors);
}

function alpha(backgroundColor: string): number {
  const match = /rgba?\(([^)]+)\)/.exec(backgroundColor);
  if (!match) return 1;
  const parts = match[1].split(',').map((part) => Number.parseFloat(part));
  return parts.length === 4 ? parts[3] : 1;
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
  const sectionTitle = await computed(page, '.inventory-section-title');
  expect(panelTitle.family).toContain('Pixelify Sans');
  expect(sectionTitle.family).toContain('Pixelify Sans');

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
    families: { body, hud, hudData, hudHelp, panelTitle, sectionTitle },
    uiLine: await uiLine(page),
    uiScale: await uiScale(page),
  });
});

test.describe('línea y escala continuas derivadas del marco', () => {
  test.use({ deviceScaleFactor: 2 });

  test('--ui-line es frame.height / 416 y no se cuantiza al redimensionar', async ({
    page,
  }, testInfo) => {
    await openGame(page, 1280, 720);
    const first = await measureFrame(page);

    expect(first.dpr).toBe(2);
    expect(first.line).toMatch(/^\d+(\.\d+)?px$/);
    expect(first.internal).toEqual({ width: 2218, height: 1248 });
    const firstLine = Number.parseFloat(first.line);
    expect(firstLine).toBeCloseTo(first.frame.height / FRAME_LOGICAL_HEIGHT, 6);
    expect(Math.abs(firstLine * first.dpr - Math.round(firstLine * first.dpr))).toBeGreaterThan(
      1e-6,
    );

    await page.setViewportSize({ width: 900, height: 700 });
    await expect.poll(async () => uiLine(page)).not.toBe(first.line);
    const second = await measureFrame(page);

    await page.setViewportSize({ width: 901, height: 700 });
    await expect.poll(async () => uiLine(page)).not.toBe(second.line);
    const third = await measureFrame(page);

    for (const measurement of [first, second, third]) {
      const line = Number.parseFloat(measurement.line);
      expect(line).toBeCloseTo(measurement.frame.height / FRAME_LOGICAL_HEIGHT, 6);
      expect(Math.abs(line * measurement.dpr - Math.round(line * measurement.dpr))).toBeGreaterThan(
        1e-6,
      );
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

    // Un píxel de ventana mueve la línea de forma continua, sin saltos de 1 px.
    const secondLine = Number.parseFloat(second.line);
    const thirdLine = Number.parseFloat(third.line);
    expect(thirdLine).toBeGreaterThan(secondLine);
    expect(thirdLine - secondLine).toBeLessThan(0.01);

    await writeLog(testInfo, 'ui-foundations-line.json', {
      first: { line: first.line, scale: first.scale, dpr: first.dpr, frame: first.frame },
      second: { line: second.line, scale: second.scale, dpr: second.dpr, frame: second.frame },
      third: { line: third.line, scale: third.scale, dpr: third.dpr, frame: third.frame },
    });
  });

  test('el cuerpo sigue la altura del marco: ≈12,8 px a 900×700 y ≈18,8 px a 1280×720', async ({
    page,
  }, testInfo) => {
    const measurements: Array<{
      viewport: string;
      frameHeight: number;
      scale: string;
      line: string;
      hudFont: number;
      ratio: number;
    }> = [];

    for (const viewport of VIEWPORTS) {
      await openGame(page, viewport.width, viewport.height);
      const measurement = await measureFrame(page);
      const size = Number.parseFloat(measurement.hudFont);
      const scale = Number.parseFloat(measurement.scale);
      measurements.push({
        viewport: `${viewport.width}x${viewport.height}`,
        frameHeight: measurement.frame.height,
        scale: measurement.scale,
        line: measurement.line,
        hudFont: size,
        ratio: size / measurement.frame.height,
      });

      expect(scale).toBeCloseTo(measurement.frame.height / FRAME_LOGICAL_HEIGHT, 6);
      expect(size).toBeCloseTo(scale * 11.2, 3);
      expect(Number.parseFloat(measurement.line)).toBeCloseTo(
        measurement.frame.height / FRAME_LOGICAL_HEIGHT,
        6,
      );
    }

    const at900 = measurements.find((entry) => entry.viewport === '900x700')!;
    const at1280 = measurements.find((entry) => entry.viewport === '1280x720')!;
    expect(at900.hudFont).toBeGreaterThanOrEqual(11.8);
    expect(at900.hudFont).toBeLessThanOrEqual(13.8);
    expect(at1280.hudFont).toBeGreaterThanOrEqual(17.8);
    expect(at1280.hudFont).toBeLessThanOrEqual(19.8);
    // La relación cuerpo/altura no depende de la resolución: la UI escala sola.
    expect(at900.ratio).toBeCloseTo(at1280.ratio, 6);

    await writeLog(testInfo, 'ui-foundations-scale.json', measurements);
  });
});

test('auditoría de estilos: sin radios, sombras, degradados, blur ni translucidez', async ({
  page,
}, testInfo) => {
  await openGame(page, 1280, 720);
  await page.keyboard.press('i');
  await expect(page.getByTestId('inventory-panel')).toBeVisible();

  const selectors = [
    '.hud-left',
    '.hud-right',
    '.hud-detail-block',
    '.inventory-panel-body',
    '.inventory-column',
    '.inventory-slot',
    '.inventory-submenu',
    '.spell-list',
    '.feedback-banner',
    '.damage-feedback',
    '.cursor',
    '.overlay',
    '.overlay button',
  ];
  const entries = await auditStyles(page, selectors);

  for (const entry of entries) {
    expect(entry.borderRadius, `${entry.selector} usa radio`).toBe('0px');
    expect(entry.boxShadow, `${entry.selector} usa sombra`).toBe('none');
    expect(entry.textShadow, `${entry.selector} usa text-shadow`).toBe('none');
    expect(entry.backdropFilter, `${entry.selector} usa backdrop-filter`).toBe('none');
    expect(entry.filter, `${entry.selector} usa filter`).toBe('none');
    expect(entry.backgroundImage, `${entry.selector} usa degradado`).toBe('none');
    expect([0, 1], `${entry.selector} usa fondo translúcido`).toContain(
      alpha(entry.backgroundColor),
    );
  }

  // Bisel: claro al noroeste, oscuro al sureste en superficies y huecos.
  const outset = entries.find((entry) => entry.selector === '.hud-left')!;
  expect(outset.borderTopColor).toBe('rgb(110, 184, 168)');
  expect(outset.borderBottomColor).toBe('rgb(47, 20, 47)');
  const inset = entries.find((entry) => entry.selector === '.inventory-slot')!;
  expect(inset.borderTopColor).toBe('rgb(47, 20, 47)');
  expect(inset.borderBottomColor).toBe('rgb(110, 184, 168)');

  await writeLog(testInfo, 'ui-foundations-styles.json', entries);
});

test('capturas de HUD, panel, hechizos y overlays a 1280×720 y 900×700', async ({
  page,
}, testInfo) => {
  const measurements: unknown[] = [];

  for (const viewport of VIEWPORTS) {
    const suffix = `${viewport.width}x${viewport.height}`;
    await openGame(page, viewport.width, viewport.height);

    await screenshot(page, testInfo, `hud-${suffix}`);

    await page.keyboard.press('q');
    await expect(page.getByTestId('spell-list')).toBeVisible();
    await screenshot(page, testInfo, `spells-${suffix}`);
    await page.keyboard.press('q');
    await expect(page.getByTestId('spell-list')).toBeHidden();

    await page.keyboard.press('i');
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    await screenshot(page, testInfo, `panel-${suffix}`);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();

    await page.evaluate(() => {
      const victory = document.querySelector<HTMLElement>(
        '[data-testid="overlay-victory"]',
      );
      if (!victory) throw new Error('Falta el overlay de victoria');
      victory.hidden = false;
    });
    await screenshot(page, testInfo, `overlay-victory-${suffix}`);
    await page.evaluate(() => {
      const victory = document.querySelector<HTMLElement>(
        '[data-testid="overlay-victory"]',
      );
      if (victory) victory.hidden = true;
    });

    await page.evaluate(() => {
      const banner = document.querySelector<HTMLElement>(
        '[data-testid="feedback-banner"]',
      );
      if (!banner) throw new Error('Falta el banner de feedback');
      banner.hidden = false;
      banner.textContent = 'Recoges Hacha';
      banner.dataset.bannerKind = 'pickup';
    });
    await screenshot(page, testInfo, `overlay-banner-${suffix}`);
    await page.evaluate(() => {
      const banner = document.querySelector<HTMLElement>(
        '[data-testid="feedback-banner"]',
      );
      if (!banner) return;
      banner.hidden = true;
      banner.textContent = '';
      delete banner.dataset.bannerKind;
    });

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
      uiScale: await uiScale(page),
      fontReady: await page.evaluate(() => document.fonts.check('16px "Pixelify Sans"')),
      fits,
    });
  }

  await writeLog(testInfo, 'ui-foundations.json', measurements);
});

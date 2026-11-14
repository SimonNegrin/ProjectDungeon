import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { BspMapGenerator } from '../../src/game/bsp';
import { createInitialState } from '../../src/game/engine';
import { equipmentFromLegacy, inventoryFromIds } from '../../src/game/inventory';
import type { GameState } from '../../src/game/types';
import { artifactPath } from './artifacts';
import { openState, selectPanelRow, settle } from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

interface BoxMetrics {
  readonly name: string;
  readonly outer: Rect;
  readonly inner: Rect;
  readonly borderTop: number;
  readonly pseudoActive: boolean;
  readonly paintedLeft: number;
  readonly paintedTop: number;
}

interface Geometry {
  readonly line: number;
  readonly bevel: number;
  readonly boxes: readonly BoxMetrics[];
  readonly mapCursorBorder: number;
  readonly panelCursorBorder: number;
}

function panelState(): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.players[0];
  return {
    ...base,
    players: [
      {
        ...template,
        equipment: equipmentFromLegacy(template.id, {
          weaponId: 'sword',
          armorId: 'armor',
          shieldId: 'shield',
        }),
        inventory: inventoryFromIds(template.id, ['axe']),
      },
    ],
  };
}

async function screenshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
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

async function nextFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let seen = 0;
        const step = (): void => {
          seen += 1;
          if (seen >= frames) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    count,
  );
}

async function measureGeometry(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const box = (element: Element): Rect => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const names: ReadonlyArray<readonly [string, string]> = [
      ['hud', '[data-testid="hud-left"]'],
      ['zona', '[data-testid="hud-zone-character"]'],
      ['ficha', '[data-testid="hud-panel-selected"]'],
      ['cuerpo-panel', '.inventory-panel-body'],
      ['columna', '.inventory-column-equipment'],
      ['slot', '[data-row-key="slot:armor"]'],
      ['boton', '[data-testid="inventory-close"]'],
      ['submenu', '[data-testid="inventory-submenu"]'],
    ];
    const boxes = names.map(([name, selector]) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Falta ${selector}`);
      const style = getComputedStyle(element);
      const pseudo = getComputedStyle(element, '::before');
      const outer = box(element);
      const left = Number.parseFloat(style.borderLeftWidth);
      const top = Number.parseFloat(style.borderTopWidth);
      const right = Number.parseFloat(style.borderRightWidth);
      const bottom = Number.parseFloat(style.borderBottomWidth);
      const pseudoActive = pseudo.content !== 'none' && pseudo.content !== 'normal';
      const bevelWidth = Number.parseFloat(pseudo.outlineWidth);
      const padLeft = Number.parseFloat(style.paddingLeft);
      const padTop = Number.parseFloat(style.paddingTop);
      const padRight = Number.parseFloat(style.paddingRight);
      const padBottom = Number.parseFloat(style.paddingBottom);
      return {
        name,
        outer,
        inner: {
          left: outer.left + left + padLeft,
          top: outer.top + top + padTop,
          right: outer.right - right - padRight,
          bottom: outer.bottom - bottom - padBottom,
          width: outer.width - left - right - padLeft - padRight,
          height: outer.height - top - bottom - padTop - padBottom,
        },
        borderTop: pseudoActive ? bevelWidth : top,
        pseudoActive,
        paintedLeft: outer.left + left - bevelWidth,
        paintedTop: outer.top + top - bevelWidth,
      };
    });
    const root = getComputedStyle(document.documentElement);
    const bevelProbe = document.querySelector<HTMLElement>('[data-testid="hud-left"]');
    if (!bevelProbe) throw new Error('Falta la sonda de bisel');
    const mapCursor = document.querySelector<HTMLElement>('[data-testid="cursor"]');
    const panelCursor = document.querySelector<HTMLElement>(
      '[data-testid="inventory-cursor"]',
    );
    if (!mapCursor || !panelCursor) throw new Error('Faltan los cursores');
    return {
      line: Number.parseFloat(root.getPropertyValue('--ui-line')),
      bevel: Number.parseFloat(
        getComputedStyle(bevelProbe, '::before').outlineWidth,
      ),
      boxes,
      mapCursorBorder: Number.parseFloat(getComputedStyle(mapCursor).borderTopWidth),
      panelCursorBorder: Number.parseFloat(
        getComputedStyle(panelCursor).borderTopWidth,
      ),
    };
  });
}

function expectInteriorPreserved(
  before: BoxMetrics,
  after: BoxMetrics,
  label: string,
): void {
  for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
    expect(
      Math.abs(after.inner[edge] - before.inner[edge]),
      `${label}: interior ${edge} (${before.inner[edge]} → ${after.inner[edge]})`,
    ).toBeLessThanOrEqual(1);
  }
}

for (const viewport of VIEWPORTS) {
  const suffix = `${viewport.width}x${viewport.height}`;

  test(`los biseles de 2× crecen hacia fuera a ${suffix}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openState(page, panelState());
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.keyboard.press('i');
    await expect(page.getByTestId('inventory-panel')).toBeVisible();
    await selectPanelRow(page, 'slot:armor');
    await settle(page);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('inventory-submenu')).toBeVisible();

    // 1×: misma geometría que el relieve anterior. 2×: estado aprobado.
    await page.evaluate(() =>
      document.documentElement.style.setProperty('--ui-bevel', 'var(--ui-line)'),
    );
    await nextFrames(page);
    const before = await measureGeometry(page);

    await page.evaluate(() =>
      document.documentElement.style.removeProperty('--ui-bevel'),
    );
    await nextFrames(page);
    const after = await measureGeometry(page);

    await writeLog(testInfo, `biseles-${suffix}.json`, { before, after });

    expect(after.line).toBeGreaterThan(0);
    expect(
      Math.abs(after.bevel - after.line * 2),
      `bisel redondeado fuera de 2× línea: ${after.bevel}`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after.mapCursorBorder - after.line * 2),
      'cursor del mapa',
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after.panelCursorBorder - after.line),
      'cursor del panel sigue a 1×',
    ).toBeLessThanOrEqual(1);

    for (const current of after.boxes) {
      const previous = before.boxes.find((entry) => entry.name === current.name)!;
      expect(
        Math.abs(current.borderTop - after.line * 2),
        `${current.name}: bisel a 2×`,
      ).toBeLessThanOrEqual(1);
      expectInteriorPreserved(previous, current, current.name);
      if (current.pseudoActive) {
        for (const edge of ['left', 'top', 'right', 'bottom', 'width', 'height'] as const) {
          expect(
            Math.abs(current.outer[edge] - previous.outer[edge]),
            `${current.name}: la caja no debe moverse (${edge})`,
          ).toBeLessThanOrEqual(1);
        }
        expect(
          Math.abs(previous.outer.left - current.paintedLeft - after.line),
          `${current.name}: el bisel crece por la izquierda`,
        ).toBeLessThanOrEqual(1.5);
        expect(
          Math.abs(previous.outer.top - current.paintedTop - after.line),
          `${current.name}: el bisel crece por arriba`,
        ).toBeLessThanOrEqual(1.5);
      } else {
        expect(
          current.outer.left,
          `${current.name}: crece por la izquierda`,
        ).toBeLessThanOrEqual(previous.outer.left + 0.01);
        expect(
          current.outer.top,
          `${current.name}: crece por arriba`,
        ).toBeLessThanOrEqual(previous.outer.top + 0.01);
        expect(
          current.outer.right,
          `${current.name}: crece por la derecha`,
        ).toBeGreaterThanOrEqual(previous.outer.right - 0.01);
        expect(
          current.outer.bottom,
          `${current.name}: crece por abajo`,
        ).toBeGreaterThanOrEqual(previous.outer.bottom - 0.01);
        expect(current.outer.width).toBeGreaterThanOrEqual(
          previous.outer.width - 0.01,
        );
        expect(current.outer.height).toBeGreaterThanOrEqual(
          previous.outer.height - 0.01,
        );
      }
    }

    await screenshot(page, `biseles-panel-${suffix}`, testInfo);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('inventory-panel')).toBeHidden();
    await screenshot(page, `biseles-hud-${suffix}`, testInfo);

    await writeLog(testInfo, `biseles-${suffix}.json`, { before, after });
  });
}

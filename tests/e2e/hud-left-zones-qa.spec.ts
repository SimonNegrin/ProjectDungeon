import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { WEAPONS, weaponDamage } from '../../src/game/equipment';
import {
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type GameState,
  type Unit,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import { expectDebug, openState } from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 900, height: 700 },
  { width: 1280, height: 720 },
] as const;

const RETIRED = ['hud-phase', 'hud-enemy-hp', 'hud-turn', 'hud-status'] as const;

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function roomState(players: readonly Unit[]): GameState {
  return {
    grid: createRoomGrid(20, 20),
    players,
    enemies: [],
    groundItems: [],
    containers: [],
    phase: 'player',
    turn: 1,
    status: 'playing',
    rng: createRng(SEED),
  };
}

interface WarriorOptions {
  readonly name?: string;
  readonly weapon?: boolean;
  readonly hp?: number;
  readonly exhausted?: boolean;
}

function warrior(options: WarriorOptions = {}): Unit {
  const unit = createPlayerFromArchetype('warrior', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: options.name ?? 'Ada',
  });
  return {
    ...unit,
    hp: options.hp ?? unit.hp,
    mp: options.exhausted ? 0 : unit.mp,
    actions: options.exhausted
      ? { ...unit.actions, remaining: 0 }
      : unit.actions,
    equipment:
      options.weapon === false
        ? { ...unit.equipment, weapon: null }
        : unit.equipment,
  };
}

/** Mago sin arma: comprueba las filas condicionales de magia y maná. */
function mage(): Unit {
  return createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
    name: 'Mira',
  });
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

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

interface ZoneStyle {
  readonly background: string;
  readonly borderTopWidth: string;
  readonly borderTopColor: string;
  readonly borderBottomColor: string;
  readonly borderStyle: string;
}

async function layout(page: Page) {
  return page.evaluate((retired) => {
    const element = (testId: string): HTMLElement => {
      const found = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      );
      if (!found) throw new Error(`Falta [data-testid="${testId}"]`);
      return found;
    };
    const box = (testId: string): Box => {
      const rect = element(testId).getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const style = (testId: string): ZoneStyle => {
      const computed = getComputedStyle(element(testId));
      return {
        background: computed.backgroundColor,
        borderTopWidth: computed.borderTopWidth,
        borderTopColor: computed.borderTopColor,
        borderBottomColor: computed.borderBottomColor,
        borderStyle: computed.borderTopStyle,
      };
    };
    const keys = element('hud-keys');
    const suggestion = element('hud-suggestion');
    return {
      left: box('hud-left'),
      character: box('hud-zone-character'),
      weapon: box('hud-zone-weapon'),
      stats: box('hud-zone-stats'),
      portrait: box('hud-portrait'),
      name: box('hud-player-name'),
      keys: box('hud-keys'),
      suggestion: box('hud-suggestion'),
      leftStyle: style('hud-left'),
      characterStyle: style('hud-zone-character'),
      weaponStyle: style('hud-zone-weapon'),
      statsStyle: style('hud-zone-stats'),
      keysStyle: {
        background: getComputedStyle(keys).backgroundColor,
        borderTopWidth: getComputedStyle(keys).borderTopWidth,
        borderBottomWidth: getComputedStyle(keys).borderBottomWidth,
      },
      footerOutsideZones: !keys.closest('.hud-zone'),
      suggestionOutsideZones: !suggestion.closest('.hud-zone'),
      overflow: {
        scrollHeight: element('hud-left').scrollHeight,
        clientHeight: element('hud-left').clientHeight,
      },
      retiredPresent: retired.filter(
        (testId) => document.querySelector(`[data-testid="${testId}"]`) !== null,
      ),
      hudText: (document.querySelector('[data-testid="hud-left"]')?.textContent ??
        '').replace(/\s+/g, ' '),
    };
  }, RETIRED);
}

function expectOutset(style: ZoneStyle, label: string): void {
  expect(style.borderTopWidth, `${label} sin bisel`).not.toBe('0px');
  expect(style.borderStyle).toBe('solid');
  expect(style.borderTopColor, `${label} bisel claro`).toBe('rgb(110, 184, 168)');
  expect(style.borderBottomColor, `${label} bisel oscuro`).toBe('rgb(47, 20, 47)');
}

function expectZoneFrame(style: ZoneStyle, label: string): void {
  expectOutset(style, label);
  expect(style.background, `${label} fondo propio`).toBe('rgb(119, 68, 72)');
}

function expectFooterOutside(area: Awaited<ReturnType<typeof layout>>): void {
  expect(area.footerOutsideZones).toBe(true);
  expect(area.suggestionOutsideZones).toBe(true);
  expect(area.keysStyle.background).toBe('rgba(0, 0, 0, 0)');
  expect(area.keysStyle.borderTopWidth).toBe('0px');
  expect(area.keysStyle.borderBottomWidth).toBe('0px');
  expect(area.keys.y).toBeGreaterThanOrEqual(area.stats.bottom - 1);
  if (area.suggestion.height > 0) {
    expect(area.suggestion.y).toBeGreaterThanOrEqual(area.keys.y);
  }
}

for (const viewport of VIEWPORTS) {
  const suffix = `${viewport.width}x${viewport.height}`;

  test.describe(`HUD izquierdo a ${suffix}`, () => {
    test('personaje en dos columnas, arma con sprite y stats', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, roomState([warrior()]));

      for (const zone of [
        'hud-zone-character',
        'hud-zone-weapon',
        'hud-zone-stats',
      ]) {
        await expect(page.getByTestId(zone)).toBeVisible();
      }
      await expect(page.getByTestId('hud-left')).toBeVisible();

      // Personaje: sprite a la izquierda y datos alineados arriba.
      await expect(page.getByTestId('hud-player-name')).toHaveText('Ada');
      await expect(page.getByTestId('hud-archetype')).toHaveText('Guerrero');
      await expect(page.getByTestId('hud-condition')).toBeHidden();

      // Arma: sprite del recorte de items.png, nombre y stats con signo.
      const sword = WEAPONS.sword;
      await expect(page.getByTestId('hud-weapon')).toHaveText(sword.name);
      await expect(
        page.getByTestId('hud-weapon-stats').locator('li'),
      ).toHaveText([
        `${signed(sword.accuracy)} acierto`,
        `${signed(weaponDamage(sword))} daño`,
      ]);
      await expect(
        page.getByTestId('hud-stats').locator('li'),
      ).toHaveText(['+1 habilidad', '+1 fuerza', '+1 defensa']);
      await expect(page.getByTestId('hud-weapon-sprite')).toBeVisible();
      const spriteBackground = await page
        .getByTestId('hud-weapon-sprite')
        .evaluate((node) => getComputedStyle(node).backgroundImage);
      expect(spriteBackground).toContain('/assets/32rogues/items.png');

      // Stats: PV, MP y acciones; magia, maná y traits no dejan hueco.
      await expect(page.getByTestId('hud-player-hp')).toHaveText('20/20');
      await expect(page.getByTestId('hud-player-mp')).toHaveText('6/6');
      await expect(page.getByTestId('hud-action')).toHaveText('2/2');
      await expect(page.getByTestId('hud-magic-row')).toBeHidden();
      await expect(page.getByTestId('hud-mana-row')).toBeHidden();
      await expect(page.getByTestId('hud-traits')).toBeHidden();

      const area = await layout(page);
      expect(area.retiredPresent).toEqual([]);
      expect(area.hudText).not.toContain('Sin arma');
      expect(area.hudText).not.toContain('Sin traits activos');

      // Biseles y fondo de cada zona y del HUD que las contiene.
      expectOutset(area.leftStyle, 'HUD izquierdo');
      expect(area.leftStyle.background).toBe('rgb(42, 88, 79)');
      expectZoneFrame(area.characterStyle, 'Personaje');
      expectZoneFrame(area.weaponStyle, 'Arma');
      expectZoneFrame(area.statsStyle, 'Stats');

      // Dos columnas: retrato a la izquierda y bordes superiores alineados.
      expect(area.portrait.right).toBeLessThanOrEqual(area.name.x + 1);
      expect(Math.abs(area.portrait.y - area.name.y)).toBeLessThanOrEqual(2);
      expect(area.character.y).toBeGreaterThanOrEqual(area.left.y);
      expect(area.weapon.y).toBeGreaterThanOrEqual(area.character.bottom - 1);
      expect(area.stats.y).toBeGreaterThanOrEqual(area.weapon.bottom - 1);
      expect(area.character.right).toBeLessThanOrEqual(area.left.right + 1);

      expectFooterOutside(area);
      expect(area.overflow.scrollHeight).toBeLessThanOrEqual(
        area.overflow.clientHeight + 1,
      );

      // F1 conserva lo que el HUD retiró.
      await expectDebug(page, [
        'Fase: Jugador · Turno 1',
        'Estado: En juego',
        'Enemigo:',
      ]);

      await screenshot(page, `con-arma-${suffix}`, testInfo);
    });

    test('sin arma se oculta la zona entera', async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, roomState([warrior({ weapon: false })]));

      await expect(page.getByTestId('hud-zone-character')).toBeVisible();
      await expect(page.getByTestId('hud-zone-stats')).toBeVisible();
      await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();

      const area = await layout(page);
      expect(area.hudText).not.toContain('Sin arma');
      expect(area.hudText).not.toContain('Arma');
      expect(area.weapon.height).toBe(0);
      expect(area.stats.y).toBeGreaterThanOrEqual(area.character.bottom - 1);
      expectFooterOutside(area);

      await screenshot(page, `sin-arma-sin-magia-${suffix}`, testInfo);
    });

    test('sin arma y con magia muestra solo las filas que existen', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, roomState([mage()]));

      await expect(page.getByTestId('hud-zone-weapon')).toBeHidden();
      await expect(page.getByTestId('hud-magic-row')).toBeVisible();
      await expect(page.getByTestId('hud-mana-row')).toBeVisible();
      await expect(page.getByTestId('hud-player-magic')).toHaveText('4');
      await expect(page.getByTestId('hud-player-mana')).toHaveText('16/16');

      const area = await layout(page);
      expect(area.hudText).not.toContain('Sin arma');
      expect(area.hudText).not.toContain('Sin traits activos');
      expect(area.retiredPresent).toEqual([]);

      await screenshot(page, `sin-arma-con-magia-${suffix}`, testInfo);
    });

    test('el fantasma sigue al jugador activo sin inventar datos', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      const ghost = warrior({ name: 'Eco', hp: 0 });
      const observer = createPlayerFromArchetype('rogue', {
        id: 'player-2',
        position: { x: 6, y: 5 },
        name: 'Boric',
      });
      await openState(page, roomState([ghost, observer]));

      await expect(page.getByTestId('hud-player-name')).toHaveText('Eco');
      await expect(page.getByTestId('hud-condition')).toBeVisible();
      await expect(page.getByTestId('hud-condition')).toHaveText('Fantasma');
      await expect(page.getByTestId('hud-player-hp')).toHaveText(
        `0/${ghost.maxHp}`,
      );

      const area = await layout(page);
      expect(area.hudText).not.toContain('Boric');
      expectFooterOutside(area);

      await screenshot(page, `fantasma-${suffix}`, testInfo);
    });

    test('la sugerencia de fin de turno queda al pie', async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, roomState([warrior({ exhausted: true })]));

      await expect(page.getByTestId('hud-action')).toHaveText('0/2');
      await expect(page.getByTestId('hud-player-mp')).toHaveText('0/6');
      const suggestion = page.getByTestId('hud-suggestion');
      await expect(suggestion).toBeVisible();
      await expect(suggestion).toHaveText(
        'Sin acciones ni MP: pulsa E para terminar el turno',
      );

      const area = await layout(page);
      expectFooterOutside(area);
      expect(area.suggestion.height).toBeGreaterThan(0);
      expect(area.overflow.scrollHeight).toBeLessThanOrEqual(
        area.overflow.clientHeight + 1,
      );

      await screenshot(page, `sugerencia-${suffix}`, testInfo);
    });
  });
}

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  BspMapGenerator,
  MANA_RECOVERY_PER_TURN,
  SPELLS,
  createInitialState,
  createPlayerFromArchetype,
  createRoomGrid,
  createRng,
  type GameState,
  type MagicLevel,
  type Unit,
} from '../../src/game/index';
import { artifactPath } from './artifacts';
import {
  advanceToCue,
  moveCursorTo,
  openState,
  settle,
  snapshot,
} from './support';

const SEED = 279837264;
const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
] as const;

/** Línea de la lista derivada del catálogo; el test no repite sus cifras. */
function catalogMeta(id: keyof typeof SPELLS): string {
  const spell = SPELLS[id];
  const range =
    spell.range.min === spell.range.max
      ? `${spell.range.min}`
      : `${spell.range.min}–${spell.range.max}`;
  return `Nv ${spell.minLevel} · ${spell.cost} maná · alcance ${range}`;
}

interface ScenarioOptions {
  readonly magicLevel?: MagicLevel;
  readonly mana?: number;
  readonly manaMax?: number;
  readonly actions?: number;
  readonly spellsCast?: number;
  readonly allyHp?: number;
}

/**
 * Estado de presentación con un Mago, un aliado dañado adyacente y enemigos a
 * distancias 2, 3 y 5. El aliado cumple el alcance 1 de Curación III y el
 * enemigo lejano sirve para el rechazo por alcance. No cambia reglas: solo
 * coloca unidades sobre una sala vacía.
 */
function spellScenario(options: ScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.enemies[0];
  const magicLevel = options.magicLevel ?? 4;
  const manaMax = options.manaMax ?? magicLevel * 4;

  const mage = createPlayerFromArchetype('mage', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  const mageUnit: Unit = {
    ...mage,
    hp: 20,
    maxHp: 20,
    mana: { current: options.mana ?? manaMax, max: manaMax },
    stats: { ...mage.stats, magicLevel },
    actions: {
      max: options.actions ?? 3,
      remaining: options.actions ?? 3,
    },
    spellsCast: options.spellsCast ?? 0,
  };

  const ally: Unit = {
    ...createPlayerFromArchetype('warrior', {
      id: 'player-2',
      position: { x: 6, y: 5 },
    }),
    hp: options.allyHp ?? 8,
  };

  const enemy = (id: string, x: number, mana: number): Unit => ({
    ...template,
    id,
    x,
    y: 5,
    hp: 40,
    maxHp: 40,
    mana: { current: mana, max: 8 },
    stats: { ...template.stats, magicLevel: 2 },
    spellsCast: 0,
    awareness: 'dormant',
    fleeing: false,
    home: { x, y: 5 },
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  });

  return {
    grid: createRoomGrid(24, 24),
    players: [mageUnit, ally],
    enemies: [enemy('enemy-1', 7, 5), enemy('enemy-2', 8, 8), enemy('enemy-3', 10, 8)],
    phase: 'player',
    activePlayerId: mageUnit.id,
    round: 1,
    status: 'playing',
    rng: createRng(SEED),
  };
}

interface ClericScenarioOptions {
  readonly mana?: number;
  readonly selfHp?: number;
  readonly allyHp?: number;
  /** 1 la deja adyacente; 2 sirve para el rechazo por alcance. */
  readonly allyDistance?: 1 | 2;
}

/**
 * Clérigo de nivel 3 con maná máximo 12, un aliado a 1 o 2 casillas y un enemigo
 * lejano que mantiene la partida en curso. No toca reglas: solo coloca unidades.
 */
function clericScenario(options: ClericScenarioOptions = {}): GameState {
  const base = createInitialState({ seed: SEED, generator: new BspMapGenerator() });
  const template = base.enemies[0];
  const cleric = createPlayerFromArchetype('cleric', {
    id: 'player-1',
    position: { x: 5, y: 5 },
  });
  const clericUnit: Unit = {
    ...cleric,
    hp: options.selfHp ?? cleric.maxHp,
    mana: {
      current: options.mana ?? cleric.mana.max,
      max: cleric.mana.max,
    },
    actions: { max: 2, remaining: 2 },
    spellsCast: 0,
  };
  const distance = options.allyDistance ?? 1;
  const ally = createPlayerFromArchetype('warrior', {
    id: 'player-2',
    position: { x: 5 + distance, y: 5 },
  });
  const allyUnit: Unit = { ...ally, hp: options.allyHp ?? 8 };
  const enemy: Unit = {
    ...template,
    id: 'enemy-1',
    x: 12,
    y: 5,
    hp: 40,
    maxHp: 40,
    mana: { current: 0, max: 8 },
    spellsCast: 0,
    awareness: 'dormant',
    fleeing: false,
    home: { x: 12, y: 5 },
    lastKnown: null,
    alertTurns: 0,
    hasShouted: false,
  };

  return {
    grid: createRoomGrid(24, 24),
    players: [clericUnit, allyUnit],
    enemies: [enemy],
    phase: 'player',
    activePlayerId: clericUnit.id,
    round: 1,
    status: 'playing',
    rng: createRng(SEED),
  };
}

/** Errores de consola del host durante el escenario. */
function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
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

async function openSpellList(page: Page): Promise<void> {
  await page.keyboard.press('q');
  await expect(page.getByTestId('spell-list')).toBeVisible();
  await expect(page.getByTestId('spell-list-items').locator('li')).toHaveCount(6);
}

async function prepareSpell(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  const ids = [
    'electric-1',
    'fire-2',
    'electric-3',
    'fire-4',
    'healing-3',
    'resurrection-4',
  ] as const;
  await expect(
    page.getByTestId(`spell-row-${ids[Number(key) - 1]}`),
  ).toHaveAttribute('aria-selected', 'true');
}

test.describe('hechizos, HUD y feedback', () => {
  for (const viewport of VIEWPORTS) {
    test(`lanzar, curar, tope y HUD (${viewport.width}×${viewport.height})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await openState(page, spellScenario());

      // HUD de magia/maná del jugador y del enemigo bajo el cursor.
      await expect(page.getByTestId('hud-magic-row')).toBeVisible();
      await expect(page.getByTestId('hud-mana-row')).toBeVisible();
      await expect(page.getByTestId('hud-player-magic')).toHaveText('4');
      await expect(page.getByTestId('hud-player-mana')).toHaveText('16/16');
      await expect(page.getByTestId('hud-action')).toHaveText('3/3');
      await moveCursorTo(page, 7, 5);
      await expect(page.getByTestId('hud-cursor-enemy-magic')).toHaveText('2');
      await expect(page.getByTestId('hud-cursor-enemy-mana')).toHaveText('5/8');

      // La lista muestra nombre, nivel, coste, disponibilidad y selección.
      await openSpellList(page);
      const beforeCancel = await snapshot(page);
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('spell-list')).toBeHidden();
      expect((await snapshot(page)).players[0]).toMatchObject({
        mana: beforeCancel.players[0].mana,
        actions: beforeCancel.players[0].actions,
        spellsCast: beforeCancel.players[0].spellsCast,
      });
      await openSpellList(page);
      await expect(page.getByTestId('spell-row-electric-1')).toContainText(
        'Eléctrico I',
      );
      await expect(page.getByTestId('spell-meta-electric-1')).toHaveText(
        catalogMeta('electric-1'),
      );
      await expect(page.getByTestId('spell-availability-electric-1')).toHaveText(
        'disponible',
      );
      await expect(page.getByTestId('spell-meta-healing-3')).toHaveText(
        catalogMeta('healing-3'),
      );
      await expect(page.getByTestId('spell-meta-resurrection-4')).toHaveText(
        catalogMeta('resurrection-4'),
      );
      await screenshot(
        page,
        `hechizos-lista-${viewport.width}x${viewport.height}`,
        testInfo,
      );

      // Eléctrico I con Enter: una pulsación, acción y maná desde el motor.
      await prepareSpell(page, '1');
      await page.keyboard.press('Enter');
      const electricAtCue = await advanceToCue(page, 'spell');
      const electricEvent = electricAtCue.lastEvents.find(
        (event) => event.type === 'SpellCast',
      );
      expect(electricEvent).toMatchObject({
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: 'electric-1',
        effect: 'damage',
      });
      await expect(page.getByTestId('damage-feedback')).toHaveText(
        electricEvent && 'hit' in electricEvent && electricEvent.hit
          ? `-${electricEvent.damage}`
          : 'Fallo',
      );
      await expect(page.getByTestId('hud-player-mana')).toHaveText('14/16');
      await expect(page.getByTestId('hud-action')).toHaveText('2/3');
      expect(
        electricAtCue.lastEvents.some((event) => event.type === 'ReplicaPerformed'),
      ).toBe(false);
      await settle(page);

      // Fuego II con X: seleccionar, cerrar y lanzar con una sola tecla.
      await moveCursorTo(page, 8, 5);
      await openSpellList(page);
      await prepareSpell(page, '2');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('spell-list')).toBeHidden();
      await page.keyboard.press('x');
      const fireAtCue = await advanceToCue(page, 'spell');
      const fireEvent = fireAtCue.lastEvents.find(
        (event) => event.type === 'SpellCast',
      );
      expect(fireEvent).toMatchObject({
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: 'fire-2',
        effect: 'damage',
      });
      await expect(page.getByTestId('hud-player-mana')).toHaveText('10/16');
      await expect(page.getByTestId('hud-action')).toHaveText('1/3');
      await settle(page);

      // Tercer hechizo: rechazo por tope sin consumir acción, maná ni RNG.
      await moveCursorTo(page, 7, 5);
      const beforeLimit = await snapshot(page);
      await openSpellList(page);
      await prepareSpell(page, '1');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText(
        'Tope de 2 hechizos por turno',
      );
      const limit = await snapshot(page);
      expect(limit.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'spell-limit',
        },
      ]);
      expect(limit.players[0]).toMatchObject({
        mana: beforeLimit.players[0].mana,
        actions: beforeLimit.players[0].actions,
        spellsCast: beforeLimit.players[0].spellsCast,
      });
      expect(limit.rng).toEqual(beforeLimit.rng);
      expect(limit.enemies[0].hp).toBe(beforeLimit.enemies[0].hp);
      await settle(page);

      // Curación III: aliado adyacente, texto legible y sin daño ni réplica.
      await openState(page, spellScenario({ actions: 2, allyHp: 8 }));
      await moveCursorTo(page, 6, 5);
      await openSpellList(page);
      await prepareSpell(page, '5');
      await page.keyboard.press('Enter');
      const healAtCue = await advanceToCue(page, 'spell');
      const healEvent = healAtCue.lastEvents.find(
        (event) => event.type === 'SpellCast',
      );
      expect(healEvent).toMatchObject({
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: 'healing-3',
        effect: 'heal',
        healing: SPELLS['healing-3'].effect.kind === 'heal'
          ? SPELLS['healing-3'].effect.amount
          : 0,
      });
      await expect(page.getByTestId('damage-feedback')).toHaveText(
        `+${healEvent && 'healing' in healEvent ? healEvent.healing : 0}`,
      );
      await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
        'data-result',
        'heal',
      );
      const healed = await snapshot(page);
      expect(healed.players[1].hp).toBe(8 + (healEvent && 'healing' in healEvent ? healEvent.healing : 0));
      expect(healed.players[0]).toMatchObject({
        mana: {
          current: 16 - SPELLS['healing-3'].cost,
          max: 16,
        },
        actions: { remaining: 1, max: 2 },
        spellsCast: 1,
      });
      expect(
        healed.lastEvents.some((event) => event.type === 'ReplicaPerformed'),
      ).toBe(false);
      await expect(page.getByTestId('hud')).not.toContainText(/réplica|replica/i);
      await screenshot(
        page,
        `hechizos-curacion-${viewport.width}x${viewport.height}`,
        testInfo,
      );
      await settle(page);
    });
  }

  for (const viewport of VIEWPORTS) {
    test(`rechazos de maná, nivel y alcance (${viewport.width}×${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);

      // Maná insuficiente: la lista lo explica y el lanzamiento no consume.
      await openState(page, spellScenario({ mana: 1 }));
      await moveCursorTo(page, 7, 5);
      const beforeMana = await snapshot(page);
      await openSpellList(page);
      await expect(page.getByTestId('spell-availability-electric-1')).toHaveText(
        'maná',
      );
      await prepareSpell(page, '1');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText('Sin maná');
      const noMana = await snapshot(page);
      expect(noMana.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'no-mana',
        },
      ]);
      expect(noMana.players[0]).toMatchObject({
        mana: beforeMana.players[0].mana,
        actions: beforeMana.players[0].actions,
        spellsCast: beforeMana.players[0].spellsCast,
      });
      expect(noMana.rng).toEqual(beforeMana.rng);

      // Nivel insuficiente: Fuego II exige nivel 2.
      await openState(page, spellScenario({ magicLevel: 1, mana: 4, manaMax: 4, actions: 2 }));
      await moveCursorTo(page, 8, 5);
      const beforeLevel = await snapshot(page);
      await openSpellList(page);
      await expect(page.getByTestId('spell-availability-fire-2')).toHaveText(
        'nivel',
      );
      await prepareSpell(page, '2');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText(
        'Nivel de magia insuficiente',
      );
      const noLevel = await snapshot(page);
      expect(noLevel.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'insufficient-level',
        },
      ]);
      expect(noLevel.players[0]).toMatchObject({
        mana: beforeLevel.players[0].mana,
        actions: beforeLevel.players[0].actions,
        spellsCast: beforeLevel.players[0].spellsCast,
      });

      // Alcance: Eléctrico I llega a 3 y el tercer enemigo está a 5.
      await openState(page, spellScenario());
      await moveCursorTo(page, 10, 5);
      const beforeRange = await snapshot(page);
      await openSpellList(page);
      await prepareSpell(page, '1');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText('Fuera de alcance');
      const outOfRange = await snapshot(page);
      expect(outOfRange.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'out-of-range',
        },
      ]);
      expect(outOfRange.players[0]).toMatchObject({
        mana: beforeRange.players[0].mana,
        actions: beforeRange.players[0].actions,
        spellsCast: beforeRange.players[0].spellsCast,
      });
      expect(outOfRange.rng).toEqual(beforeRange.rng);
    });
  }

  for (const viewport of VIEWPORTS) {
    test(`Clérigo: adyacente, autocuración, rechazos y maná +4 (${viewport.width}×${viewport.height})`, async ({
      page,
    }, testInfo) => {
      const consoleErrors = watchConsole(page);
      const heal = SPELLS['healing-3'];
      const healAmount = heal.effect.kind === 'heal' ? heal.effect.amount : 0;
      const suffix = `${viewport.width}x${viewport.height}`;
      await page.setViewportSize(viewport);

      // Curación adyacente: 6 PV por 8 de maná; el HUD conserva tope y acción.
      await openState(page, clericScenario({ allyHp: 8 }));
      const initial = await snapshot(page);
      expect(initial.players[0]).toMatchObject({
        mana: { current: 12, max: 12 },
        actions: { remaining: 2, max: 2 },
      });
      await expect(page.getByTestId('hud-player-mana')).toHaveText('12/12');
      await moveCursorTo(page, 6, 5);
      await openSpellList(page);
      await expect(page.getByTestId('spell-meta-healing-3')).toHaveText(
        catalogMeta('healing-3'),
      );
      await expect(page.getByTestId('spell-meta-resurrection-4')).toHaveText(
        catalogMeta('resurrection-4'),
      );
      await screenshot(page, `clerigo-lista-${suffix}`, testInfo);
      await prepareSpell(page, '5');
      await page.keyboard.press('Enter');
      const atCue = await advanceToCue(page, 'spell');
      const healEvent = atCue.lastEvents.find(
        (event) => event.type === 'SpellCast',
      );
      expect(healEvent).toMatchObject({
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: 'healing-3',
        targetId: 'player-2',
        effect: 'heal',
        healing: healAmount,
        targetHp: 8 + healAmount,
      });
      await expect(page.getByTestId('damage-feedback')).toHaveText(
        `+${healAmount}`,
      );
      await expect(page.getByTestId('damage-feedback')).toHaveAttribute(
        'data-result',
        'heal',
      );
      const healed = await snapshot(page);
      expect(healed.players[1].hp).toBe(8 + healAmount);
      expect(healed.players[0]).toMatchObject({
        mana: { current: 12 - heal.cost, max: 12 },
        actions: { remaining: 1, max: 2 },
        spellsCast: 1,
      });
      await screenshot(page, `clerigo-curacion-adyacente-${suffix}`, testInfo);
      await settle(page);

      // Terminar el turno de los dos jugadores cierra la ronda: +4 al Clérigo.
      await page.keyboard.press('n');
      await settle(page);
      expect((await snapshot(page)).activePlayerId).toBe('player-2');
      await page.keyboard.press('n');
      await settle(page);
      const nextRound = await snapshot(page);
      expect(nextRound.round).toBe(2);
      expect(nextRound.activePlayerId).toBe('player-1');
      expect(nextRound.players[0].mana.current).toBe(
        Math.min(
          12,
          12 - heal.cost + MANA_RECOVERY_PER_TURN,
        ),
      );
      await expect(page.getByTestId('hud-player-mana')).toHaveText('8/12');
      await screenshot(page, `clerigo-mana-recuperado-${suffix}`, testInfo);

      // Autocuración: mismo coste y curación, sin daño ni réplica.
      await openState(page, clericScenario({ selfHp: 10 }));
      await moveCursorTo(page, 5, 5);
      await openSpellList(page);
      await prepareSpell(page, '5');
      await page.keyboard.press('Enter');
      const selfCue = await advanceToCue(page, 'spell');
      const selfEvent = selfCue.lastEvents.find(
        (event) => event.type === 'SpellCast',
      );
      expect(selfEvent).toMatchObject({
        type: 'SpellCast',
        casterId: 'player-1',
        spellId: 'healing-3',
        targetId: 'player-1',
        effect: 'heal',
        healing: healAmount,
        targetHp: 10 + healAmount,
      });
      const selfHealed = await snapshot(page);
      expect(selfHealed.players[0]).toMatchObject({
        hp: 10 + healAmount,
        mana: { current: 12 - heal.cost, max: 12 },
        actions: { remaining: 1, max: 2 },
        spellsCast: 1,
      });
      expect(
        selfHealed.lastEvents.some((event) => event.type === 'ReplicaPerformed'),
      ).toBe(false);
      await expect(page.getByTestId('damage-feedback')).toHaveText(
        `+${healAmount}`,
      );
      await screenshot(page, `clerigo-autocuracion-${suffix}`, testInfo);
      await settle(page);

      // PV completo: aviso legible y rechazo atómico sin gastar nada.
      await openState(page, clericScenario({ allyHp: 20 }));
      await moveCursorTo(page, 6, 5);
      const beforeFull = await snapshot(page);
      await openSpellList(page);
      await prepareSpell(page, '5');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText(
        'Ya está a PV completo',
      );
      await screenshot(page, `clerigo-aviso-pv-completo-${suffix}`, testInfo);
      const fullHp = await snapshot(page);
      expect(fullHp.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'target-full-hp',
        },
      ]);
      expect(fullHp.players[0]).toMatchObject({
        mana: beforeFull.players[0].mana,
        actions: beforeFull.players[0].actions,
        spellsCast: beforeFull.players[0].spellsCast,
      });
      expect(fullHp.players[1].hp).toBe(beforeFull.players[1].hp);
      expect(fullHp.rng).toEqual(beforeFull.rng);
      await settle(page);

      // Alcance 2: un aliado válido fuera de la casilla adyacente se rechaza.
      await openState(page, clericScenario({ allyDistance: 2, allyHp: 8 }));
      await moveCursorTo(page, 7, 5);
      const beforeRange = await snapshot(page);
      await openSpellList(page);
      await prepareSpell(page, '5');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('hud-message')).toHaveText('Fuera de alcance');
      await screenshot(page, `clerigo-aviso-alcance-2-${suffix}`, testInfo);
      const outOfRange = await snapshot(page);
      expect(outOfRange.lastEvents).toEqual([
        {
          type: 'CommandRejected',
          commandType: 'CastSpell',
          reason: 'out-of-range',
        },
      ]);
      expect(outOfRange.players[0]).toMatchObject({
        mana: beforeRange.players[0].mana,
        actions: beforeRange.players[0].actions,
        spellsCast: beforeRange.players[0].spellsCast,
      });
      expect(outOfRange.players[1].hp).toBe(beforeRange.players[1].hp);
      expect(outOfRange.rng).toEqual(beforeRange.rng);
      await settle(page);

      expect(consoleErrors).toEqual([]);
    });
  }

  test('las filas de magia y maná se ocultan sin magia', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openState(page, spellScenario({ magicLevel: 0, mana: 0, manaMax: 0 }));

    await expect(page.getByTestId('hud-zone-stats')).toBeVisible();
    await expect(page.getByTestId('hud-magic-row')).toBeHidden();
    await expect(page.getByTestId('hud-mana-row')).toBeHidden();
    await expect(page.getByTestId('hud-player-magic')).toBeHidden();
    await expect(page.getByTestId('hud-player-mana')).toBeHidden();
  });

  test('hotseat: la lista usa el nivel del activo al relevar con N', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const warrior = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
    });
    const mage = createPlayerFromArchetype('mage', {
      id: 'player-2',
      position: { x: 8, y: 4 },
    });
    const state: GameState = {
      grid: createRoomGrid(20, 20),
      players: [warrior, mage],
      enemies: [],
      phase: 'player',
      activePlayerId: warrior.id,
      round: 1,
      status: 'playing',
      rng: createRng(SEED),
    };
    await openState(page, state);

    // Turno del primero, sin magia: ningún hechizo está disponible.
    await expect(page.getByTestId('hud-player-position')).toHaveText(
      'Jugador 1 de 2',
    );
    await openSpellList(page);
    await expect(page.getByTestId('spell-row-electric-1')).toHaveAttribute(
      'data-availability',
      'level',
    );
    await expect(page.getByTestId('spell-availability-electric-1')).toHaveText(
      'nivel',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('spell-list')).toBeHidden();

    // N releva al segundo, mago: su lista se recalcula para él.
    await page.keyboard.press('n');
    await settle(page);
    await expect(page.getByTestId('hud-player-position')).toHaveText(
      'Jugador 2 de 2',
    );
    await openSpellList(page);
    await expect(page.getByTestId('spell-row-electric-1')).toHaveAttribute(
      'data-availability',
      'available',
    );
    await expect(page.getByTestId('spell-availability-electric-1')).toHaveText(
      'disponible',
    );
    await expect(page.getByTestId('spell-row-fire-2')).toHaveAttribute(
      'data-availability',
      'available',
    );
    await page.keyboard.press('Escape');

    // La ronda vuelve al primero y no conserva la disponibilidad del mago.
    await page.keyboard.press('n');
    await settle(page);
    await expect(page.getByTestId('hud-player-position')).toHaveText(
      'Jugador 1 de 2',
    );
    await openSpellList(page);
    await expect(page.getByTestId('spell-row-electric-1')).toHaveAttribute(
      'data-availability',
      'level',
    );
  });
});

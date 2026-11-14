import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARMORS,
  ITEMS,
  SHIELDS,
  WEAPONS,
  weaponDamage,
} from '../../../src/game/equipment';
import {
  BESTIARY,
  BspMapGenerator,
  ROSTER,
  createInitialState,
  createPlayerFromArchetype,
  reduce,
  type GameEvent,
} from '../../../src/game/index';
import type { GameState } from '../../../src/game/types';
import type { ArchetypeId } from '../../../src/game/roster';
import { buildDebugModel, buildHudModel, KEYS_HELP } from '../../../src/host/hud';
import { buildInventoryPanelModel } from '../../../src/host/inventory-panel';
import type { CursorStatus } from '../../../src/host/cursor';
import { makeState, makeUnit, makeGridWithWalls, rngForDice } from '../game/helpers';

const PLAYER_CURSOR: CursorStatus = {
  x: 4,
  y: 4,
  visible: true,
  kind: 'player',
  state: 'player',
  path: [],
  cost: 0,
  withinMp: true,
  strongSteps: 0,
};

/** Recortes de `rogues.png` esperados para cada arquetipo (brief de TASK-0111). */
const PORTRAIT_CASES: ReadonlyArray<readonly [ArchetypeId, number, number]> = [
  ['warrior', 0, 32],
  ['barbarian', 0, 96],
  ['rogue', 96, 0],
  ['archer', 64, 0],
  ['mage', 32, 128],
  ['cleric', 96, 64],
  ['spellblade', 96, 96],
  ['cook', 96, 160],
  ['farmer', 0, 160],
];

function attack(state: GameState): GameState {
  return reduce(state, {
    type: 'Attack',
    unitId: 'player-1',
    targetId: 'enemy-1',
  }).state;
}

function endTurn(state: GameState): GameState {
  return reduce(state, { type: 'EndTurn' }).state;
}

describe('modelo del HUD', () => {
  it('refleja el estado inicial con vida, MP, acción y ayuda', () => {
    const state = makeState();
    const model = buildHudModel(state);

    expect(model).toMatchObject({
      playerHp: `${state.players[0].hp}/${state.players[0].maxHp}`,
      playerMp: `${state.players[0].mp}/${state.players[0].maxMp}`,
      action: '2/2',
      actionSuggestion: null,
    });
    expect(model.keys).toBe(KEYS_HELP);
    expect(model.keys).toContain('cursor');
    expect(model.keys).toContain('Espacio/Enter moverse');
    expect(model.keys).toContain('F atacar');
    expect(model.keys).toContain('I panel');
    expect(model.keys).toContain('Escape cerrar');
    expect(model.keys).not.toContain('G ');
    expect(model.keys).not.toContain('1-3');
    expect(model.keys).not.toContain('1–3');
    expect(model.keys).toContain('E terminar turno');
    expect(model.keys).toContain('R reiniciar');
    expect(model.keys).toContain('F1');
    expect(model.overlays).toEqual({ victory: false, defeat: false });
    expect(model.weapon).toMatchObject({
      name: WEAPONS.sword.name,
      accuracy: WEAPONS.sword.accuracy,
      damage: weaponDamage(WEAPONS.sword),
      sprite: ITEMS.sword.sprite.rect,
    });
    expect(model.shield).toBe(`${SHIELDS.shield.name} +${SHIELDS.shield.defense}`);
    expect(model.armor).toBe(`${ARMORS.armor.name} +${ARMORS.armor.armor}`);
    expect(model.stats).toBe('+1 habilidad · +1 fuerza · +1 defensa');
    expect(model.cursorEnemyHp).toBe('—/—');
    expect(model.weaponHint).toBeNull();
  });

  it('retira fase, turno, estado y PV del enemigo del modelo del HUD', () => {
    const model = buildHudModel(makeState()) as unknown as Record<string, unknown>;

    for (const field of ['phase', 'turn', 'status', 'enemyHp']) {
      expect(model, `El HUD no debe exponer ${field}`).not.toHaveProperty(field);
    }
  });

  it('muestra el nombre y el arquetipo del jugador por defecto', () => {
    const warrior = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
    });
    const model = buildHudModel(makeState({ players: [warrior] }));

    expect(model.playerName).toBe(ROSTER.warrior.name);
    expect(model.archetype).toBe(ROSTER.warrior.name);
    expect(model.stats).toBe(
      '+1 habilidad · +1 fuerza · +1 defensa',
    );
  });

  it('distingue el nombre editable del nombre del arquetipo', () => {
    const warrior = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
      name: 'Ada',
    });
    const model = buildHudModel(makeState({ players: [warrior] }));

    expect(model.playerName).toBe('Ada');
    expect(model.archetype).toBe(ROSTER.warrior.name);
  });

  it('omite la fila de maná y el bloque de traits sin datos', () => {
    const warrior = buildHudModel(makeState());
    expect(warrior.playerMagicVisible).toBe(false);
    expect(warrior.playerMana).toBe('0/0');
    expect(warrior.playerManaVisible).toBe(false);
    expect(warrior.traits).toBeNull();
    expect(warrior.condition).toBeNull();

    const mage = createPlayerFromArchetype('mage', {
      id: 'player-1',
      position: { x: 4, y: 4 },
    });
    const withMana = buildHudModel(makeState({ players: [mage] }));
    expect(withMana.playerMagicVisible).toBe(true);
    expect(withMana.playerManaVisible).toBe(true);
    expect(withMana.playerMagic).toBe(String(mage.stats.magicLevel));
    expect(withMana.playerMana).toBe(
      `${mage.mana.current}/${mage.mana.max}`,
    );
    expect(withMana.weapon).toBeNull();
  });

  it('mantiene la ficha izquierda en el jugador fantasma con su MP', () => {
    const ghost = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
      hp: 0,
      mp: 3,
      maxMp: 6,
    });
    // Un segundo jugador vivo da línea de visión; la ficha sigue al fantasma,
    // que es el jugador activo de este turno.
    const observer = makeUnit({
      id: 'player-2',
      faction: 'player',
      x: 5,
      y: 4,
    });
    const model = buildHudModel(
      makeState({ players: [ghost, observer] }),
      { x: 4, y: 4 },
    );

    expect(model.condition).toBe('Fantasma');
    expect(model.playerMp).toBe('3/6');
    expect(model.playerHp).toBe(`0/${ghost.maxHp}`);
    expect(model.cursorDetail.kind).toBe('ally');
    expect(model.cursorDetail.title).toBe('player-1');
    expect(model.cursorDetail.notes.join(' ')).toContain('Fantasma');
    expect(model.cursorDetail.notes.join(' ')).toContain('sin equipo');
    expect(JSON.stringify(model.cursorDetail)).not.toContain('Mochila');
  });

  it('cambia la ficha con el jugador activo de la lista (hotseat)', () => {
    const first = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
      name: 'Ada',
    });
    const second = createPlayerFromArchetype('rogue', {
      id: 'player-2',
      position: { x: 5, y: 4 },
      name: 'Boric',
    });

    expect(
      buildHudModel(makeState({ players: [first, second] })).playerName,
    ).toBe('Ada');
    expect(
      buildHudModel(makeState({ players: [second, first] })).playerName,
    ).toBe('Boric');
  });

  it('deriva la miniatura del arquetipo del jugador activo', () => {
    for (const [id, sx, sy] of PORTRAIT_CASES) {
      const player = createPlayerFromArchetype(id, {
        id: 'player-1',
        position: { x: 4, y: 4 },
      });
      const model = buildHudModel(makeState({ players: [player] }));
      expect(model.portrait, `recorte de ${id}`).toEqual({
        sx,
        sy,
        sw: 32,
        sh: 32,
      });
    }

    // Los nueve recortes son distintos: ningún arquetipo comparte miniatura.
    const positions = new Set(
      PORTRAIT_CASES.map(([, sx, sy]) => `${sx},${sy}`),
    );
    expect(positions.size).toBe(PORTRAIT_CASES.length);

    // La miniatura sigue al jugador activo de la lista, no a un índice fijo.
    const warrior = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 4, y: 4 },
    });
    const rogue = createPlayerFromArchetype('rogue', {
      id: 'player-2',
      position: { x: 5, y: 4 },
    });
    expect(
      buildHudModel(makeState({ players: [warrior, rogue] })).portrait,
    ).toMatchObject({ sx: 0, sy: 32 });
    expect(
      buildHudModel(makeState({ players: [rogue, warrior] })).portrait,
    ).toMatchObject({ sx: 96, sy: 0 });
  });

  it('deja la miniatura nula sin jugador o sin arquetipo conocido', () => {
    expect(buildHudModel(makeState({ players: [] })).portrait).toBeNull();

    const synthetic = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
    });
    expect(synthetic.archetypeId).toBeNull();
    expect(
      buildHudModel(makeState({ players: [synthetic] })).portrait,
    ).toBeNull();

    const unknown = {
      ...createPlayerFromArchetype('warrior', {
        id: 'player-1',
        position: { x: 4, y: 4 },
      }),
      archetypeId: 'unknown' as ArchetypeId,
    };
    expect(
      buildHudModel(makeState({ players: [unknown] })).portrait,
    ).toBeNull();
  });

  it('la ayuda estática de index.html coincide con las teclas nuevas', () => {
    const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
    const help = html.match(/data-testid="hud-keys"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '';

    expect(help).toContain('I panel');
    expect(help).toContain('Escape cerrar');
    expect(help).not.toMatch(/\bG\b/);
    expect(help).not.toMatch(/\b1-3\b|\b1–3\b/);
  });

  it('sin arquetipo conocido deja el arquetipo como guion', () => {
    expect(buildHudModel(makeState()).archetype).toBe('—');
  });

  it('refleja un cambio de arma y un equipo sin escudo ni armadura', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipment: { weaponId: 'axe', armorId: null, shieldId: null },
          stats: { habilidad: 2, fuerza: 0, defensa: 1 },
          weapons: ['sword', 'axe'],
        }),
      ],
    });

    const model = buildHudModel(state);

    expect(model.weapon).toMatchObject({
      name: WEAPONS.axe.name,
      accuracy: WEAPONS.axe.accuracy,
      damage: weaponDamage(WEAPONS.axe),
      sprite: ITEMS.axe.sprite.rect,
    });
    expect(model.shield).toBe('Sin escudo');
    expect(model.armor).toBe('Sin armadura');
    expect(model.stats).toBe('+2 habilidad · +0 fuerza · +1 defensa');
  });

  it('deja el arma nula cuando la unidad no tiene arma equipada', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipment: { weaponId: null, armorId: null, shieldId: null },
          weapons: [],
        }),
      ],
    });

    expect(buildHudModel(state).weapon).toBeNull();
  });

  it('muestra la vida del enemigo vivo bajo el cursor y nada si no hay enemigo', () => {
    const state = makeState({
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    expect(buildHudModel(state, { x: 6, y: 5 }).cursorEnemyHp).toBe('10/10');
    expect(buildHudModel(state, { x: 5, y: 5 }).cursorEnemyHp).toBe('—/—');
    expect(buildHudModel(state).cursorEnemyHp).toBe('—/—');
  });

  it('muestra las cinco bandas con texto e icono si hay línea de visión', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          stats: {
            resistencia: {
              slash: 'vulnerable',
              pierce: 'resistant',
              magic: 'resistant',
              electric: 'very-resistant',
            },
          },
        }),
      ],
    });

    const bands = buildHudModel(state, { x: 6, y: 5 }).cursorEnemyBands;
    if (!bands) throw new Error('se esperaban bandas con línea de visión');

    expect(bands.map((row) => row.type)).toEqual([
      'slash',
      'blunt',
      'pierce',
      'magic',
      'electric',
    ]);
    expect(bands.map((row) => `${row.typeLabel} ${row.bandLabel} ${row.icon}`)).toEqual([
      'filo vulnerable ▲',
      'contundente normal ●',
      'punzante resistente ▼',
      'mágico resistente ▼',
      'eléctrico muy resistente ▼▼',
    ]);
  });

  it('muestra las bandas normales del perfil por defecto', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const bands = buildHudModel(state, { x: 6, y: 5 }).cursorEnemyBands;
    expect(bands).toHaveLength(5);
    expect(bands?.every((row) => row.band === 'normal')).toBe(true);
    expect(bands?.every((row) => row.icon === '●')).toBe(true);
  });

  it('sin línea de visión oculta bandas y stats del cursor tras «Desconocido»', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
    });

    const model = buildHudModel(state, { x: 7, y: 5 });
    // REQ-023 R-007: el panel no revela stats si ningún jugador vivo ve la
    // casilla. La comprobación anterior solo cubría las bandas.
    expect(model.cursorEnemyBands).toBeNull();
    expect(model.cursorEnemyHp).toBe('—/—');
    expect(model.cursorEnemyMagic).toBe('—');
    expect(model.cursorEnemyMana).toBe('—/—');
    expect(model.cursorDetail.kind).toBe('unknown');
    expect(model.cursorDetail.title).toBe('Desconocido');
    expect(JSON.stringify(model.cursorDetail)).not.toContain('enemy-1');
  });

  it('con el jugador muerto no muestra bandas aunque el cursor vea al enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 0 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    expect(buildHudModel(state, { x: 6, y: 5 }).cursorEnemyBands).toBeNull();
  });

  it('sin enemigo bajo el cursor o sin cursor no hay bandas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    expect(buildHudModel(state, { x: 5, y: 5 }).cursorEnemyBands).toBeNull();
    expect(buildHudModel(state).cursorEnemyBands).toBeNull();
  });

  it('muestra la pista del panel solo cuando el jugador ocupa un objeto del mapa', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const items = state.groundItems;
    if (!items || items.length === 0) {
      throw new Error('La semilla de referencia debe colocar armas');
    }
    const item = items[0];
    const onWeapon: GameState = {
      ...state,
      players: [{ ...state.players[0], x: item.x, y: item.y }],
    };

    const model = buildHudModel(onWeapon, { x: item.x, y: item.y });
    expect(model.weaponHint).toBe(
      `I panel · ${ITEMS[item.itemId].name} en el suelo`,
    );
    expect(model.weaponHint).not.toContain('G recoger');

    const picked = reduce(onWeapon, { type: 'PickUp', unitId: 'player-1' }).state;
    expect(picked.groundItems?.some((entry) => entry.id === item.id)).toBe(false);
    expect(buildHudModel(picked, { x: item.x, y: item.y }).weaponHint).toBeNull();
    expect(buildHudModel(picked).weapon).toMatchObject({
      name: WEAPONS.sword.name,
      accuracy: WEAPONS.sword.accuracy,
      damage: weaponDamage(WEAPONS.sword),
      sprite: ITEMS.sword.sprite.rect,
    });
  });

  it('actualiza el contador de acciones 2/2→1/2→0/2', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });

    expect(buildHudModel(state).action).toBe('2/2');

    const afterFirst = attack(state);
    expect(buildHudModel(afterFirst).action).toBe('1/2');

    const next = attack(afterFirst);
    const model = buildHudModel(next);

    expect(model.action).toBe('0/2');
    expect(model.playerHp).toBe(`${next.players[0].hp}/${next.players[0].maxHp}`);
  });

  it('restaura las acciones tras fin de turno sin exponer fase ni turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const next = endTurn(state);
    const model = buildHudModel(next);

    expect(next.turn).toBe(2);
    expect(next.phase).toBe('player');
    expect(model.playerHp).toBe(`${next.players[0].hp}/${next.players[0].maxHp}`);
    expect(model.playerMp).toBe(`${next.players[0].mp}/${next.players[0].maxMp}`);
    expect(model.action).toBe('2/2');
    expect(model).not.toHaveProperty('phase');
    expect(model).not.toHaveProperty('turn');
  });

  it('sugiere terminar solo con 0 acciones, sin MP y en fase de jugador', () => {
    const exhausted = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          mp: 0,
          actions: 0,
        }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    expect(buildHudModel(exhausted).actionSuggestion).toBe(
      'Sin acciones ni MP: pulsa E para terminar el turno',
    );

    const withMp = {
      ...exhausted,
      players: [{ ...exhausted.players[0], mp: 1 }],
    };
    expect(buildHudModel(withMp).actionSuggestion).toBeNull();

    const withAction = {
      ...exhausted,
      players: [{ ...exhausted.players[0], actions: { ...exhausted.players[0].actions, remaining: 1 } }],
    };
    expect(buildHudModel(withAction).actionSuggestion).toBeNull();

    expect(buildHudModel({ ...exhausted, phase: 'enemy' }).actionSuggestion).toBeNull();
    expect(buildHudModel({ ...exhausted, status: 'victory' }).actionSuggestion).toBeNull();
  });

  it('muestra el overlay de victoria cuando el enemigo muere', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, hp: 1 })],
      rng: rngForDice([6, 1, 2, 1]),
    });

    const afterFirst = attack(state);
    const next = attack(afterFirst);
    const model = buildHudModel(next);

    expect(next.enemies[0].hp).toBe(0);
    expect(model.overlays).toEqual({ victory: true, defeat: false });
  });

  it('muestra el overlay de derrota cuando el jugador muere', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 1 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const next = endTurn(state);
    const model = buildHudModel(next);

    expect(model.playerHp).toBe(`0/${next.players[0].maxHp}`);
    expect(model.overlays).toEqual({ victory: false, defeat: true });
  });
});

describe('modelo del overlay de debug', () => {
  it('incluye posiciones, MP, fase, cámara y semilla determinista', () => {
    const model = buildDebugModel(
      makeState(),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    );
    const text = model.lines.join('\n');

    expect(text).toContain('Jugador: (4, 4)');
    expect(text).toContain('Identidad: player-1 · Arquetipo —');
    expect(text).toContain('MP 6/6');
    expect(text).toContain('Acciones 2/2');
    expect(text).toContain('Enemigo: (15, 15)');
    expect(text).toContain('Fase: Jugador · Turno 1');
    expect(text).toContain('Cursor: (4, 4) jugador · camino 0');
    expect(text).toContain('Cámara: (0, 0) · Límites (224, 224) · Viewport 416×416');
    expect(text).toContain('Semilla: n/a (determinista)');
    expect(text).toContain('Últimos eventos: ninguno');
  });

  it('muestra mochila, capacidad, equipo por hueco y suelo del mismo estado que el panel', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          inventory: {
            capacity: 8,
            items: [
              { id: 'item-player-1-axe', itemId: 'axe' },
              { id: 'item-player-1-plate', itemId: 'plate' },
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          },
          equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
        }),
      ],
      groundItems: [
        { id: 'item-ground-hammer', itemId: 'hammer', x: 7, y: 9 },
      ],
    });
    const text = buildDebugModel(
      state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines.join('\n');
    const panel = buildInventoryPanelModel(state);

    expect(text).toContain('Mochila 2/8');
    expect(text).toContain('1. Hacha [item-player-1-axe]');
    expect(text).toContain('2. Coraza [item-player-1-plate]');
    expect(text).toContain('Equipo por hueco:');
    expect(text).toContain('Arma Espada [item-player-1-weapon]');
    expect(text).toContain('Escudo Escudo [item-player-1-shield]');
    expect(text).toContain('Armadura Armadura [item-player-1-armor]');
    expect(text).toContain('Casco —');
    expect(text).toContain('Suelo: Martillo [item-ground-hammer] en (7,9)');

    // La UI y F1 se derivan del mismo estado: los nombres coinciden.
    for (const row of [...panel.backpack, ...panel.equipment, ...(panel.ground ?? [])]) {
      if (!row.empty) expect(text).toContain(row.name);
    }
  });

  it('sin objetos en el suelo lo indica sin ambigüedad', () => {
    const text = buildDebugModel(
      makeState(),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines.join('\n');

    expect(text).toContain('Suelo: sin objetos');
    expect(text).toContain('Mochila 0/8: vacía');
  });

  it('muestra nombre y arquetipo del Guerrero en el overlay de debug', () => {
    const state = createInitialState({ generator: new BspMapGenerator() });
    const text = buildDebugModel(
      state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines.join('\n');

    expect(text).toContain(`Identidad: ${ROSTER.warrior.name} · Arquetipo ${ROSTER.warrior.name}`);
  });

  it('resume los últimos eventos', () => {
    const state = makeState();
    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    const model = buildDebugModel(
      result.state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      result.events,
      PLAYER_CURSOR,
    );

    expect(model.lines.join('\n')).toContain('player-1: (4,4)→(5,4) MP 5');
  });

  it('con un mapa generado muestra semilla, salas, huecos, spawns y pasillos anchos', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const spawns = state.map!.spawns;
    const model = buildDebugModel(
      state,
      { x: 0, y: 64 },
      { maxX: 608, maxY: 608 },
      { width: 416, height: 416 },
      [],
      { ...PLAYER_CURSOR, x: spawns.player.x, y: spawns.player.y },
    );
    const text = model.lines.join('\n');

    expect(text).toContain(
      `Cursor: (${spawns.player.x}, ${spawns.player.y}) jugador · camino 0`,
    );
    expect(text).toContain('Semilla: 279837264');
    expect(text).toContain('Salas:');
    expect(text).toContain('0 (3,4) 7×9 large');
    expect(text).toContain('Huecos:');
    expect(text).toContain('(10,5) vertical sala 0');
    expect(text).toContain(
      `Spawns: jugador (${spawns.player.x},${spawns.player.y}) · enemigo (${spawns.enemy.x},${spawns.enemy.y}) · distancia ${spawns.distance}`,
    );
    expect(text).toContain('Pasillos anchos:');
    expect(text).toContain('0→1 2 tiles');
    expect(text).toContain('F2 nueva semilla');
  });

  it('sin mapa mantiene las líneas n/a del overlay', () => {
    const text = buildDebugModel(
      makeState(),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines.join('\n');

    expect(text).toContain('Semilla: n/a (determinista)');
    expect(text).toContain('Salas: n/a');
    expect(text).toContain('Huecos: n/a');
    expect(text).toContain('Spawns: n/a');
    expect(text).toContain('Pasillos anchos: n/a');
  });

  it('añade equipo, modificadores, vida de todos, último ataque y enemigo bajo cursor', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    const text = buildDebugModel(
      result.state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      result.events,
      { ...PLAYER_CURSOR, x: 6, y: 5, state: 'enemy', kind: 'enemy' },
    ).lines.join('\n');

    const attackEvent = result.events.find(
      (event): event is Extract<GameEvent, { type: 'AttackPerformed' }> =>
        event.type === 'AttackPerformed',
    );
    if (!attackEvent) throw new Error('se esperaba un ataque');

    expect(text).toContain(
      `Equipo: ${WEAPONS.sword.name} +${WEAPONS.sword.accuracy}/+${weaponDamage(WEAPONS.sword)} · ${SHIELDS.shield.name} +${SHIELDS.shield.defense} · ${ARMORS.armor.name} +${ARMORS.armor.armor}`,
    );
    expect(text).toContain(
      'Atributos +1 habilidad · +1 fuerza · +1 defensa',
    );
    expect(text).toContain(
      `Vida: player-1 ${result.state.players[0].hp}/${result.state.players[0].maxHp} · enemy-1 ${result.state.enemies[0].hp}/${result.state.enemies[0].maxHp}`,
    );
    expect(text).toContain(
      `Enemigo bajo cursor: enemy-1 ${result.state.enemies[0].hp}/${result.state.enemies[0].maxHp}`,
    );
    expect(text).toContain(
      `Último ataque: player-1→enemy-1 impacto ${attackEvent.damage} (PV ${attackEvent.targetHp})`,
    );
    expect(text).toContain(
      `tiradas ataque ${attackEvent.rolls.attack} escudo ${attackEvent.rolls.shield} golpe ${attackEvent.rolls.damage} absorción ${attackEvent.rolls.armor}`,
    );
    expect(text).toContain(
      `Últimos eventos: player-1→enemy-1 -${attackEvent.damage} (HP ${attackEvent.targetHp})`,
    );
  });

  it('muestra equipo y modificadores de cada enemigo vivo, con el centinela', () => {
    const sentinel = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      enemyType: 'sentinel',
      x: 6,
      y: 5,
      equipment: BESTIARY.sentinel.equipment,
      stats: BESTIARY.sentinel.stats,
    });
    const fallen = makeUnit({
      id: 'enemy-2',
      faction: 'enemy',
      enemyType: 'brute',
      x: 9,
      y: 5,
      hp: 0,
      equipment: BESTIARY.brute.equipment,
      stats: BESTIARY.brute.stats,
    });

    const lines = buildDebugModel(
      makeState({ enemies: [sentinel, fallen] }),
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      PLAYER_CURSOR,
    ).lines;

    const weapon = WEAPONS[BESTIARY.sentinel.equipment.weaponId!];
    const shield =
      BESTIARY.sentinel.equipment.shieldId === null
        ? 'Sin escudo'
        : `${SHIELDS[BESTIARY.sentinel.equipment.shieldId].name} +${SHIELDS[BESTIARY.sentinel.equipment.shieldId].defense}`;
    const armor =
      BESTIARY.sentinel.equipment.armorId === null
        ? 'Sin armadura'
        : `${ARMORS[BESTIARY.sentinel.equipment.armorId].name} +${ARMORS[BESTIARY.sentinel.equipment.armorId].armor}`;
    const equipment = lines.filter((line) => line.startsWith('Equipo enemigo'));
    expect(equipment).toEqual([
      `Equipo enemigo enemy-1: ${weapon.name} +${weapon.accuracy}/+${weaponDamage(weapon)} · ${shield} · ${armor} · Atributos +0 habilidad · +0 fuerza · +0 defensa · Acciones 2/2`,
    ]);
  });

  it('muestra el estado de percepción por enemigo y las etiquetas de sus eventos', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const events = [
      {
        type: 'EnemySpotted' as const,
        unitId: 'enemy-1',
        playerId: 'player-1',
        position: { x: 23, y: 28 },
        step: { x: 22, y: 27 },
      },
      { type: 'AlarmRaised' as const, unitId: 'enemy-1', position: { x: 23, y: 28 } },
      { type: 'EnemyFled' as const, unitId: 'enemy-4' },
      { type: 'EnemyReturned' as const, unitId: 'enemy-2' },
    ];

    const text = buildDebugModel(
      state,
      { x: 0, y: 64 },
      { maxX: 608, maxY: 608 },
      { width: 416, height: 416 },
      events,
      { ...PLAYER_CURSOR, x: 6, y: 8 },
    ).lines.join('\n');

    for (const id of ['enemy-1', 'enemy-2', 'enemy-3', 'enemy-4']) {
      expect(text).toContain(`Percepción ${id}`);
    }
    for (const definition of Object.values(BESTIARY)) {
      expect(text).toContain(`visión ${definition.vision} · alarma ${definition.alarm}`);
    }
    expect(text).toContain('enemy-1 ve a player-1 en (22,27)');
    expect(text).toContain('alarma de enemy-1 en (23,28)');
    expect(text).toContain('enemy-4 huye');
    expect(text).toContain('enemy-2 vuelve a su puesto');
  });

  it('un fallo en F1 muestra Fallo y no inventa tiradas de daño', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([1, 6]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });

    const text = buildDebugModel(
      result.state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      result.events,
      PLAYER_CURSOR,
    ).lines.join('\n');

    expect(text).toContain('Último ataque: player-1→enemy-1 fallo');
    expect(text).toContain('tiradas ataque 1 escudo 6');
    expect(text).not.toContain('tiradas ataque 1 escudo 6 golpe');
    expect(text).toContain('Últimos eventos: player-1→enemy-1 fallo (HP 10)');
    expect(text).not.toContain('player-1→enemy-1 -0');
    expect(text).toContain('Enemigo bajo cursor: ninguno');
  });

  it('F1 muestra las cinco bandas, incluidas las normales', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          stats: {
            resistencia: { slash: 'vulnerable', electric: 'very-resistant' },
          },
        }),
      ],
    });

    const text = buildDebugModel(
      state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      { ...PLAYER_CURSOR, x: 6, y: 5, state: 'enemy', kind: 'enemy' },
    ).lines.join('\n');

    expect(text).toContain(
      'Enemigo bajo cursor: enemy-1 10/10 · bandas filo vulnerable ▲ · contundente normal ● · punzante normal ● · mágico normal ● · eléctrico muy resistente ▼▼',
    );
  });

  it('F1 conserva el perfil completo aunque no haya línea de visión', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
    });
    const cursor: CursorStatus = { ...PLAYER_CURSOR, x: 7, y: 5, state: 'enemy', kind: 'enemy' };

    const text = buildDebugModel(
      state,
      { x: 0, y: 0 },
      { maxX: 224, maxY: 224 },
      { width: 416, height: 416 },
      [],
      cursor,
    ).lines.join('\n');

    expect(text).toContain(
      'Enemigo bajo cursor: enemy-1 10/10 · bandas filo normal ● · contundente normal ● · punzante normal ● · mágico normal ● · eléctrico normal ●',
    );
    // El HUD de juego sí respeta la LOS; `F1` es debug y no la filtra.
    expect(buildHudModel(state, { x: 7, y: 5 }).cursorEnemyBands).toBeNull();
  });
});

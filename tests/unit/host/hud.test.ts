import { describe, expect, it } from 'vitest';
import { ARMORS, SHIELDS, WEAPONS, weaponDamage } from '../../../src/game/equipment';
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
import { buildDebugModel, buildHudModel, KEYS_HELP } from '../../../src/host/hud';
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
  it('refleja el estado inicial con vida, MP, acción, fase, enemigo y ayuda', () => {
    const state = makeState();
    const model = buildHudModel(state);

    expect(model).toMatchObject({
      playerHp: `${state.players[0].hp}/${state.players[0].maxHp}`,
      playerMp: `${state.players[0].mp}/${state.players[0].maxMp}`,
      action: '2/2',
      actionSuggestion: null,
      phase: 'Jugador',
      enemyHp: `${state.enemies[0].hp}/${state.enemies[0].maxHp}`,
      turn: 'Turno 1',
      status: 'En juego',
    });
    expect(model.keys).toBe(KEYS_HELP);
    expect(model.keys).toContain('cursor');
    expect(model.keys).toContain('Espacio/Enter moverse');
    expect(model.keys).toContain('F atacar');
    expect(model.keys).toContain('E terminar turno');
    expect(model.keys).toContain('R reiniciar');
    expect(model.keys).toContain('F1');
    expect(model.overlays).toEqual({ victory: false, defeat: false });
    expect(model.weapon).toBe(
      `${WEAPONS.sword.name} +${WEAPONS.sword.accuracy}/+${weaponDamage(WEAPONS.sword)}`,
    );
    expect(model.shield).toBe(`${SHIELDS.shield.name} +${SHIELDS.shield.defense}`);
    expect(model.armor).toBe(`${ARMORS.armor.name} +${ARMORS.armor.armor}`);
    expect(model.stats).toBe('+1 habilidad · +1 fuerza · +1 defensa');
    expect(model.cursorEnemyHp).toBe('—/—');
    expect(model.weaponHint).toBeNull();
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

    expect(model.weapon).toBe(
      `${WEAPONS.axe.name} +${WEAPONS.axe.accuracy}/+${weaponDamage(WEAPONS.axe)}`,
    );
    expect(model.shield).toBe('Sin escudo');
    expect(model.armor).toBe('Sin armadura');
    expect(model.stats).toBe('+2 habilidad · +0 fuerza · +1 defensa');
  });

  it('muestra Sin arma cuando la unidad no tiene arma equipada', () => {
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

    expect(buildHudModel(state).weapon).toBe('Sin arma');
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

  it('sin línea de visión no muestra bandas, pero no oculta los PV del cursor', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 7, y: 5 })],
    });

    const model = buildHudModel(state, { x: 7, y: 5 });
    expect(model.cursorEnemyBands).toBeNull();
    expect(model.cursorEnemyHp).toBe('10/10');
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

  it('muestra la pista de G solo cuando el jugador ocupa un arma del mapa', () => {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const map = state.map;
    if (!map || !map.weapons || map.weapons.length === 0) {
      throw new Error('La semilla de referencia debe colocar armas');
    }
    const weapon = map.weapons[0];
    const onWeapon: GameState = {
      ...state,
      players: [{ ...state.players[0], x: weapon.x, y: weapon.y }],
    };

    const model = buildHudModel(onWeapon, { x: weapon.x, y: weapon.y });
    expect(model.weaponHint).toBe(`G recoger ${WEAPONS[weapon.weaponId].name}`);

    const picked = reduce(onWeapon, { type: 'PickUp', unitId: 'player-1' }).state;
    expect(picked.map?.weapons?.some((entry) => entry.id === weapon.id)).toBe(false);
    expect(buildHudModel(picked, { x: weapon.x, y: weapon.y }).weaponHint).toBeNull();
    expect(buildHudModel(picked).weapon).toBe(
      `${WEAPONS[weapon.weaponId].name} +${WEAPONS[weapon.weaponId].accuracy}/+${weaponDamage(WEAPONS[weapon.weaponId])}`,
    );
  });

  it('actualiza la vida del enemigo y el contador de acciones 2/2→1/2→0/2', () => {
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

    expect(model.enemyHp).toBe(`${next.enemies[0].hp}/${next.enemies[0].maxHp}`);
    expect(model.action).toBe('0/2');
    expect(model.playerHp).toBe(`${next.players[0].hp}/${next.players[0].maxHp}`);
  });

  it('refleja la fase de jugador, el turno y la restauración tras fin de turno', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });

    const next = endTurn(state);
    const model = buildHudModel(next);

    expect(model.phase).toBe('Jugador');
    expect(model.turn).toBe('Turno 2');
    expect(model.playerHp).toBe(`${next.players[0].hp}/${next.players[0].maxHp}`);
    expect(model.playerMp).toBe(`${next.players[0].mp}/${next.players[0].maxMp}`);
    expect(model.action).toBe('2/2');
    expect(model.status).toBe('En juego');
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

    expect(model.enemyHp).toBe(`0/${next.enemies[0].maxHp}`);
    expect(model.status).toBe('Victoria');
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
    expect(model.status).toBe('Derrota');
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

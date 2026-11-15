import { describe, expect, it } from 'vitest';
import {
  GHOST_ACTIONS,
  corpseId,
  emptyEquipment,
  equipmentFromLegacy,
  inspectContainer,
  inventoryFromIds,
  isAlive,
  isGhost,
  isOccupied,
  itemInstance,
  lifeState,
  livingUnitAt,
  nearestVisiblePlayer,
  planCursorTarget,
  planEnemyAction,
  reduce,
  resolveAttack,
  restorePlayerTurn,
  settleUnitDeath,
  visiblePlayers,
  type Container,
  type GameState,
} from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit, rngForDice } from './helpers';

/** Golpe letal del enemigo por defecto contra un jugador adyacente. */
const ENEMY_HIT = [6, 1, 3, 3] as const;

type UnitPatch = Partial<Parameters<typeof makeUnit>[0]>;

function ghostAt(x: number, y: number, patch: UnitPatch = {}) {
  return makeUnit({
    id: 'player-1',
    faction: 'player',
    x,
    y,
    hp: 0,
    ghost: true,
    actionsMax: GHOST_ACTIONS,
    actions: GHOST_ACTIONS,
    ...patch,
  });
}

function aliveAt(id: string, x: number, y: number, patch: UnitPatch = {}) {
  return makeUnit({ id, faction: 'player', x, y, ...patch });
}

function enemyAt(x: number, y: number, patch: UnitPatch = {}) {
  return makeUnit({ id: 'enemy-1', faction: 'enemy', x, y, ...patch });
}

function roundTrip(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe('muerte y representación del fantasma (REQ-021 R-001/R-002/T-001/T-002)', () => {
  it('al morir con otro vivo el jugador pasa a fantasma con identidad y una acción', () => {
    const equipment = equipmentFromLegacy('player-1', {
      weaponId: 'sword',
      armorId: 'armor',
      shieldId: 'shield',
    });
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          nombre: 'Guerrero',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 1,
          archetypeId: 'warrior',
          variant: 2,
          mp: 2,
          maxMp: 6,
          equipmentSlots: equipment,
          inventory: inventoryFromIds('player-1', ['dagger']),
        }),
        aliveAt('player-2', 4, 5, { hp: 10, maxHp: 10 }),
      ],
      enemies: [enemyAt(6, 5)],
      rng: rngForDice(ENEMY_HIT),
      // El último jugador cierra la ronda: el enemigo mata a player-1.
      activePlayerId: 'player-2',
    });
    const before = state.players[0];

    const result = reduce(state, { type: 'EndTurn' });
    const ghost = result.state.players[0];

    expect(ghost.id).toBe(before.id);
    expect(ghost.nombre).toBe('Guerrero');
    expect(ghost.archetypeId).toBe('warrior');
    expect(ghost.variant).toBe(2);
    expect(ghost.faction).toBe('player');
    expect(ghost.x).toBe(5);
    expect(ghost.y).toBe(5);
    expect(ghost.hp).toBe(0);
    expect(ghost.maxHp).toBe(before.maxHp);
    expect(ghost.maxMp).toBe(6);
    expect(ghost.stats).toEqual(before.stats);
    expect(isAlive(ghost)).toBe(false);
    expect(isGhost(ghost)).toBe(true);
    expect(lifeState(ghost)).toBe('ghost');
    expect(ghost.actions).toEqual({ max: GHOST_ACTIONS, remaining: GHOST_ACTIONS });
    expect(ghost.equipment).toEqual(emptyEquipment());
    expect(ghost.inventory.items.every((item) => item === null)).toBe(true);

    const corpse = result.state.containers?.find(
      (container) => container.corpseOf === 'player-1',
    );
    expect(corpse?.id).toBe(corpseId('player-1'));

    expect(lifeState(result.state.players[1])).toBe('alive');
    expect(roundTrip(result.state)).toEqual(result.state);
  });

  it('un muerto sin fantasma sigue siendo dead y no se restaura al empezar el turno', () => {
    const dead = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 4,
      y: 4,
      hp: 0,
      mp: 0,
      actions: 0,
    });
    expect(isGhost(dead)).toBe(false);
    expect(lifeState(dead)).toBe('dead');
    expect(lifeState({ ...dead, hp: 5, ghost: true })).toBe('alive');

    const restored = restorePlayerTurn(makeState({ players: [dead], enemies: [] }));
    expect(restored.players[0]).toBe(dead);
  });

  it('la marca de fantasma no regala MP y conserva el remanente de acciones', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 0,
          mp: 2,
          maxMp: 6,
          actions: 1,
        }),
      ],
      enemies: [],
    });

    const settled = settleUnitDeath(state, 'player-1');
    const ghost = settled.players[0];

    expect(ghost.mp).toBe(2);
    expect(ghost.maxMp).toBe(6);
    expect(ghost.actions).toEqual({ max: GHOST_ACTIONS, remaining: 1 });
    expect(settleUnitDeath(settled, 'player-1')).toBe(settled);
    expect(
      settled.containers?.filter((container) => container.corpseOf === 'player-1'),
    ).toHaveLength(1);
    expect(roundTrip(settled)).toEqual(settled);

    const exhausted = settleUnitDeath(
      makeState({
        players: [
          makeUnit({
            id: 'player-1',
            faction: 'player',
            x: 5,
            y: 5,
            hp: 0,
            actions: 0,
          }),
        ],
        enemies: [],
      }),
      'player-1',
    );
    expect(exhausted.players[0].actions).toEqual({ max: GHOST_ACTIONS, remaining: 0 });
  });

  it('el MP y las acciones no dependen del equipo que llevara el cadáver', () => {
    const withEquipment = settleUnitDeath(
      makeState({
        players: [
          makeUnit({
            id: 'player-1',
            faction: 'player',
            x: 5,
            y: 5,
            hp: 0,
            maxMp: 5,
            equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
          }),
        ],
        enemies: [],
      }),
      'player-1',
    ).players[0];
    const bare = settleUnitDeath(
      makeState({
        players: [
          makeUnit({
            id: 'player-2',
            faction: 'player',
            x: 5,
            y: 5,
            hp: 0,
            maxMp: 5,
            equipment: { weaponId: null, armorId: null, shieldId: null },
          }),
        ],
        enemies: [],
      }),
      'player-2',
    ).players[0];

    expect(withEquipment.maxMp).toBe(bare.maxMp);
    expect(withEquipment.actions).toEqual(bare.actions);
    expect(withEquipment.equipment).toEqual(emptyEquipment());
  });
});

describe('casilla compartida, movimiento y pathfinding (REQ-021 R-003/T-002/T-009)', () => {
  it('el fantasma no ocupa ni bloquea la casilla', () => {
    const state = makeState({ players: [ghostAt(5, 5)], enemies: [] });

    expect(isOccupied(state, 5, 5)).toBe(false);
    expect(livingUnitAt(state.players, 5, 5)).toBeUndefined();
  });

  it('un vivo se mueve sobre la casilla del fantasma', () => {
    const state = makeState({
      players: [ghostAt(5, 5), aliveAt('player-2', 4, 5)],
      enemies: [],
      activePlayerId: 'player-2',
    });

    const result = reduce(state, {
      type: 'Move',
      unitId: 'player-2',
      dx: 1,
      dy: 0,
    });

    expect(result.state.players[1]).toMatchObject({ x: 5, y: 5, mp: 5 });
    expect(result.state.players[0]).toMatchObject({ x: 5, y: 5 });
    expect(result.events).toEqual([
      expect.objectContaining({ type: 'UnitMoved', unitId: 'player-2' }),
    ]);
  });

  it('el fantasma se mueve sobre un aliado y sobre un enemigo sin atacar', () => {
    const overAlly = reduce(
      makeState({
        players: [ghostAt(5, 5), aliveAt('player-2', 6, 5)],
        enemies: [],
      }),
      { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 },
    );
    expect(overAlly.state.players[0]).toMatchObject({ x: 6, y: 5, mp: 5 });
    expect(overAlly.events.map((event) => event.type)).toEqual(['UnitMoved']);

    const overEnemy = reduce(
      makeState({ players: [ghostAt(5, 5)], enemies: [enemyAt(6, 5)] }),
      { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 },
    );
    expect(overEnemy.state.players[0]).toMatchObject({ x: 6, y: 5 });
    expect(overEnemy.state.enemies[0]).toMatchObject({ x: 6, y: 5, hp: 10 });
    expect(overEnemy.events.some((event) => event.type === 'AttackPerformed')).toBe(
      false,
    );
  });

  it('el fantasma sigue bloqueado por muros y no corta esquinas', () => {
    const grid = makeGridWithWalls([
      { x: 6, y: 5 },
      { x: 5, y: 6 },
    ]);
    const state = makeState({ grid, players: [ghostAt(5, 5)], enemies: [] });

    const wall = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });
    expect(wall.state).toBe(state);
    expect(wall.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'wall' },
    ]);

    const corner = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 1 });
    expect(corner.state).toBe(state);
    expect(corner.events).toEqual([
      { type: 'CommandRejected', commandType: 'Move', reason: 'corner-cut' },
    ]);
  });

  it('MoveTo del fantasma trata la unidad como suelo y nunca devuelve plan enemy', () => {
    const state = makeState({ players: [ghostAt(5, 5)], enemies: [enemyAt(6, 5)] });

    const plan = planCursorTarget(state, 'player-1', { x: 6, y: 5 });
    expect(plan.kind).toBe('floor');
    expect(plan.path).toEqual([{ x: 6, y: 5 }]);

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 5 },
    });

    expect(result.state.players[0]).toMatchObject({ x: 6, y: 5, mp: 5 });
    expect(result.state.enemies[0]).toMatchObject({ x: 6, y: 5, hp: 10 });
    expect(result.events.map((event) => event.type)).toEqual(['UnitMoved']);
  });

  it('el camino del fantasma ignora unidades y el del vivo no', () => {
    const grid = makeGridWithWalls(
      Array.from({ length: 9 }, (_, index) => [
        { x: index + 1, y: 4 },
        { x: index + 1, y: 6 },
      ]).flat(),
    );
    const state = makeState({
      grid,
      players: [
        ghostAt(2, 5),
        aliveAt('player-2', 2, 5),
        aliveAt('player-3', 3, 5, { nombre: 'Aliado' }),
      ],
      enemies: [],
    });

    const ghostPlan = planCursorTarget(state, 'player-1', { x: 6, y: 5 });
    expect(ghostPlan.kind).toBe('floor');
    expect(ghostPlan.path).toHaveLength(4);

    const livingPlan = planCursorTarget(state, 'player-2', { x: 6, y: 5 });
    expect(livingPlan.kind).toBe('blocked');
    expect(livingPlan.blockedReason).toBe('no-path');
  });

  it('IA y percepción ignoran al fantasma y atacarlo da target-dead', () => {
    const state = makeState({
      players: [ghostAt(5, 5)],
      enemies: [enemyAt(6, 5, { awareness: 'alert' })],
    });
    const enemy = state.enemies[0];

    expect(nearestVisiblePlayer(state, enemy)).toBeUndefined();
    expect(visiblePlayers(state, enemy)).toEqual([]);
    expect(planEnemyAction(state, enemy)).toEqual({ type: 'wait' });

    const againstGhost = resolveAttack(state, 'enemy-1', 'player-1');
    expect(againstGhost).toEqual({ ok: false, reason: 'target-dead' });

    const ghostAttack = resolveAttack(state, 'player-1', 'enemy-1');
    expect(ghostAttack).toEqual({ ok: false, reason: 'dead-unit' });
  });
});

describe('MP intrínseco y una acción por ronda (REQ-021 R-002/T-003, REQ-026)', () => {
  it('restaurar el turno devuelve al fantasma su MP intrínseco y una acción', () => {
    const state = makeState({
      players: [
        ghostAt(5, 5, { mp: 0, actions: 0 }),
        aliveAt('player-2', 4, 5),
      ],
      enemies: [enemyAt(15, 15, { awareness: 'dormant' })],
      // Cierra la ronda para que el fantasma empiece la siguiente.
      activePlayerId: 'player-2',
    });

    const result = reduce(state, { type: 'EndTurn' });
    const ghost = result.state.players[0];

    expect(ghost.mp).toBe(ghost.maxMp);
    expect(ghost.mp).toBe(6);
    expect(ghost.actions).toEqual({ max: GHOST_ACTIONS, remaining: GHOST_ACTIONS });
  });

  it('recoger gasta la única acción y no MP; sin acción se rechaza', () => {
    const state = makeState({
      players: [ghostAt(5, 5, { mp: 3, actions: 1 })],
      enemies: [],
      groundItems: [
        { id: 'item-a', itemId: 'axe', lootable: true, x: 5, y: 5 },
        { id: 'item-b', itemId: 'dagger', lootable: true, x: 5, y: 5 },
      ],
    });

    const picked = reduce(state, { type: 'PickUp', unitId: 'player-1' });
    expect(picked.state.players[0]).toMatchObject({
      mp: 3,
      actions: { max: GHOST_ACTIONS, remaining: 0 },
    });
    expect(
      picked.state.players[0].inventory.items.filter((item) => item !== null),
    ).toEqual([expect.objectContaining({ itemId: 'axe' })]);
    expect(picked.events).toEqual([]);

    const second = reduce(picked.state, { type: 'PickUp', unitId: 'player-1' });
    expect(second.state).toBe(picked.state);
    expect(second.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-action' },
    ]);
  });

  it('soltar gasta la acción, no MP y deja el objeto en el suelo', () => {
    const state = makeState({
      players: [
        ghostAt(5, 5, {
          mp: 0,
          actions: 1,
          inventory: inventoryFromIds('player-1', ['dagger']),
        }),
      ],
      enemies: [],
    });

    const dropped = reduce(state, {
      type: 'DropItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });

    expect(dropped.state.players[0]).toMatchObject({
      mp: 0,
      actions: { remaining: 0 },
    });
    expect(dropped.state.groundItems).toEqual([
      expect.objectContaining({ itemId: 'dagger', x: 5, y: 5 }),
    ]);

    const again = reduce(dropped.state, { type: 'PickUp', unitId: 'player-1' });
    expect(again.events).toEqual([
      { type: 'CommandRejected', commandType: 'PickUp', reason: 'no-action' },
    ]);
  });

  it('atacar, lanzar, equipar, desequipar y seleccionar arma se rechazan sin cambios', () => {
    const state = makeState({
      players: [ghostAt(5, 5, { mp: 6, actions: 1 })],
      enemies: [enemyAt(6, 5)],
    });
    const commands = [
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
      {
        type: 'CastSpell',
        unitId: 'player-1',
        spellId: 'fire-2',
        target: { x: 6, y: 5 },
      },
      { type: 'EquipItem', unitId: 'player-1', from: 'backpack', index: 0 },
      { type: 'UnequipItem', unitId: 'player-1', slot: 'weapon' },
      { type: 'SelectWeapon', unitId: 'player-1', slot: 1 },
    ] as const;

    for (const command of commands) {
      const result = reduce(state, command);
      expect(result.state).toBe(state);
      expect(result.state.rng).toBe(state.rng);
      expect(result.events).toEqual([
        { type: 'CommandRejected', commandType: command.type, reason: 'dead-unit' },
      ]);
    }
  });
});

describe('inspección de contenedores sin revelar trampa (REQ-021 R-006/T-005)', () => {
  it('devuelve solo identidad, catálogo y saqueabilidad sin mutar ni gastar', () => {
    const container = {
      id: 'chest-1',
      x: 5,
      y: 5,
      capacity: 3,
      items: [
        itemInstance('loot-1', 'axe'),
        null,
        itemInstance('loot-2', 'dagger', false),
      ],
      kind: 'chest',
      trap: true,
    } as Container & { readonly trap: boolean };
    const state = makeState({
      players: [ghostAt(5, 5)],
      enemies: [],
      containers: [container],
    });
    const before = JSON.stringify(state);

    const result = reduce(state, {
      type: 'InspectContainer',
      unitId: 'player-1',
      containerId: 'chest-1',
    });

    expect(result.state).toBe(state);
    expect(result.state.rng).toBe(state.rng);
    expect(JSON.stringify(state)).toBe(before);
    expect(result.events).toEqual([
      {
        type: 'ContainerInspected',
        unitId: 'player-1',
        containerId: 'chest-1',
        items: [
          { id: 'loot-1', itemId: 'axe', lootable: true },
          { id: 'loot-2', itemId: 'dagger', lootable: false },
        ],
      },
    ]);
    const inspected = result.events[0];
    expect(JSON.stringify(inspected)).not.toContain('trap');
    if (inspected.type === 'ContainerInspected') {
      expect(Object.keys(inspected.items[0]).sort()).toEqual([
        'id',
        'itemId',
        'lootable',
      ]);
    }
    expect(state.players[0].actions.remaining).toBe(GHOST_ACTIONS);
  });

  it('solo lo permite a fantasmas en fase de jugador y rechaza contenedores desconocidos', () => {
    const base = makeState({
      players: [ghostAt(5, 5), aliveAt('player-2', 4, 5)],
      enemies: [],
      // El vivo debe ser el activo para aislar el rechazo `not-ghost`.
      activePlayerId: 'player-2',
      containers: [
        { id: 'chest-1', x: 5, y: 5, capacity: 0, items: [] },
      ],
    });

    const living = reduce(base, {
      type: 'InspectContainer',
      unitId: 'player-2',
      containerId: 'chest-1',
    });
    expect(living.state).toBe(base);
    expect(living.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'InspectContainer',
        reason: 'not-ghost',
      },
    ]);

    const wrongPhase = reduce(
      { ...base, phase: 'enemy' },
      { type: 'InspectContainer', unitId: 'player-1', containerId: 'chest-1' },
    );
    expect(wrongPhase.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'InspectContainer',
        reason: 'wrong-phase',
      },
    ]);

    const ghostActive = { ...base, activePlayerId: 'player-1' };
    const unknown = reduce(ghostActive, {
      type: 'InspectContainer',
      unitId: 'player-1',
      containerId: 'chest-9',
    });
    expect(unknown.state).toBe(ghostActive);
    expect(unknown.events).toEqual([
      {
        type: 'CommandRejected',
        commandType: 'InspectContainer',
        reason: 'unknown-container',
      },
    ]);
  });

  it('el helper puro filtra huecos vacíos sin exponer campos del contenedor', () => {
    const state = makeState({
      players: [],
      enemies: [],
      containers: [
        {
          id: 'chest-1',
          x: 1,
          y: 1,
          capacity: 2,
          items: [null, itemInstance('loot-1', 'axe')],
          kind: 'chest',
          corpseOf: 'player-9',
        },
      ],
    });

    expect(inspectContainer(state, 'chest-1')).toEqual({
      containerId: 'chest-1',
      items: [{ id: 'loot-1', itemId: 'axe', lootable: true }],
    });
    expect(inspectContainer(state, 'chest-9')).toBeNull();

    const inventoryState = makeState({ players: [ghostAt(5, 5)], enemies: [] });
    expect(inventoryState.containers).toEqual([]);
  });
});

describe('flujo integrado: muerte, fantasma, casilla compartida, inspección y recogida', () => {
  it('recorre el caso completo sin romper la identidad ni el cadáver', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          hp: 1,
          equipmentSlots: equipmentFromLegacy('player-1', {
            weaponId: 'sword',
            armorId: null,
            shieldId: null,
          }),
        }),
        aliveAt('player-2', 4, 5),
      ],
      enemies: [enemyAt(6, 5)],
      groundItems: [{ id: 'item-ground', itemId: 'dagger', lootable: true, x: 5, y: 5 }],
      rng: rngForDice(ENEMY_HIT),
      // El último jugador cierra la ronda y provoca la muerte de player-1.
      activePlayerId: 'player-2',
    });

    const afterDeath = reduce(state, { type: 'EndTurn' }).state;
    expect(lifeState(afterDeath.players[0])).toBe('ghost');

    const shared = reduce(
      { ...afterDeath, activePlayerId: 'player-2' },
      {
        type: 'Move',
        unitId: 'player-2',
        dx: 1,
        dy: 0,
      },
    ).state;
    expect(shared.players[0].x).toBe(5);
    expect(shared.players[1].x).toBe(5);
    expect(shared.players[1].y).toBe(5);

    const inspected = reduce(
      { ...shared, activePlayerId: 'player-1' },
      {
        type: 'InspectContainer',
        unitId: 'player-1',
        containerId: corpseId('player-1'),
      },
    );
    const event = inspected.events[0];
    expect(event.type).toBe('ContainerInspected');
    if (event.type === 'ContainerInspected') {
      expect(event.items.map((item) => item.id)).toEqual(['item-player-1-weapon']);
      expect(JSON.stringify(event)).not.toContain('kind');
    }

    const picked = reduce(inspected.state, {
      type: 'PickUp',
      unitId: 'player-1',
    });
    expect(
      picked.state.players[0].inventory.items.filter((item) => item !== null),
    ).toEqual([expect.objectContaining({ id: 'item-ground', itemId: 'dagger' })]);
    expect(picked.state.players[0].actions.remaining).toBe(0);
    expect(picked.state.players[0].mp).toBeGreaterThan(0);
  });
});

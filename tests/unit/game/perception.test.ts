import { describe, expect, it } from 'vitest';
import {
  ALERT_COOLDOWN_PHASES,
  BESTIARY,
  alarmRadius,
  bresenhamLine,
  canSee,
  detectEnemiesAfterStep,
  hasLineOfSight,
  noteDamage,
  reduce,
  visionRadius,
  visiblePlayers,
  type EnemyType,
  type GameEvent,
  type GameState,
  type Unit,
} from '../../../src/game/index';
import { makeGridWithWalls, makeState, makeUnit } from './helpers';

function enemyOf(
  type: EnemyType,
  x: number,
  y: number,
  patch: Partial<Unit> = {},
): Unit {
  return makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    enemyType: type,
    x,
    y,
    awareness: 'dormant',
    ...patch,
  });
}

function playerAt(x: number, y: number, patch: Partial<Unit> = {}): Unit {
  return makeUnit({ id: 'player-1', faction: 'player', x, y, ...patch });
}

describe('línea de visión de Bresenham', () => {
  it('traza la línea inclusiva esperada', () => {
    expect(bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
  });

  it('los muros intermedios bloquean y las unidades no', () => {
    const enemy = enemyOf('sentinel', 3, 5);
    const player = playerAt(7, 5);

    expect(hasLineOfSight(makeGridWithWalls([{ x: 5, y: 5 }]), enemy, player)).toBe(
      false,
    );
    expect(hasLineOfSight(makeGridWithWalls([{ x: 5, y: 6 }]), enemy, player)).toBe(
      true,
    );

    // Dos enemigos alineados no se tapan: la visión ignora unidades.
    const state = makeState({
      grid: makeGridWithWalls([{ x: 5, y: 6 }]),
      players: [player],
      enemies: [enemy, makeUnit({ id: 'enemy-2', faction: 'enemy', x: 5, y: 5 })],
    });
    expect(visiblePlayers(state, enemy)).toEqual([player]);
  });

  it('un muro en diagonal también bloquea', () => {
    expect(
      hasLineOfSight(
        makeGridWithWalls([{ x: 2, y: 1 }]),
        { x: 0, y: 0 },
        { x: 4, y: 2 },
      ),
    ).toBe(false);
  });
});

describe('radios de visión del bestiario', () => {
  const expected: readonly (readonly [EnemyType, number])[] = [
    ['sentinel', 6],
    ['brute', 4],
    ['coward', 5],
  ];

  it('cada tipo usa su radio (6/4/5) y no ve un tile más allá', () => {
    for (const [type, radius] of expected) {
      expect(BESTIARY[type].vision).toBe(radius);
      const enemy = enemyOf(type, 5, 5);

      expect(visionRadius(enemy)).toBe(radius);
      expect(canSee(makeGridWithWalls([]), enemy, { x: 5 + radius, y: 5 })).toBe(true);
      expect(canSee(makeGridWithWalls([]), enemy, { x: 5 + radius + 1, y: 5 })).toBe(
        false,
      );
    }
  });

  it('los jugadores y las unidades sin tipo no tienen radio', () => {
    expect(visionRadius(playerAt(5, 5))).toBe(0);
    expect(visionRadius(makeUnit({ id: 'enemy-x', faction: 'enemy', x: 5, y: 5 }))).toBe(
      0,
    );
  });
});

describe('detección tras cada paso', () => {
  it('Move que cruza la vista emite la detección y no consume acción', () => {
    const enemy = enemyOf('sentinel', 11, 5);
    const state = makeState({
      players: [playerAt(4, 5)],
      enemies: [enemy],
    });
    expect(canSee(state.grid, enemy, state.players[0])).toBe(false);

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: 1, dy: 0 });

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(result.events[1]).toEqual({
      type: 'EnemySpotted',
      unitId: 'enemy-1',
      playerId: 'player-1',
      position: { x: 11, y: 5 },
      step: { x: 5, y: 5 },
    });
    expect(result.events[2]).toEqual({
      type: 'AlarmRaised',
      unitId: 'enemy-1',
      position: { x: 11, y: 5 },
    });
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 5, y: 5 },
      alertTurns: 0,
      hasShouted: true,
    });
    expect(result.state.players[0]).toMatchObject({ mp: 5, actionAvailable: true });
  });

  it('MoveTo de 3 pasos emite la detección en el paso correcto', () => {
    const state = makeState({
      players: [playerAt(3, 5)],
      enemies: [enemyOf('sentinel', 10, 5)],
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 6, y: 5 },
    });

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
      'UnitMoved',
      'UnitMoved',
    ]);
    expect(result.events[1]).toEqual({
      type: 'EnemySpotted',
      unitId: 'enemy-1',
      playerId: 'player-1',
      position: { x: 10, y: 5 },
      step: { x: 4, y: 5 },
    });
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 6, y: 5 },
      alertTurns: 0,
    });
    expect(result.state.players[0]).toMatchObject({
      x: 6,
      y: 5,
      mp: 3,
      actionAvailable: true,
    });
  });

  it('un MoveTo que acaba tras un muro deja al enemigo alertado', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 9, y: 8 }]),
      players: [playerAt(3, 6)],
      enemies: [enemyOf('sentinel', 10, 10)],
    });

    const result = reduce(state, {
      type: 'MoveTo',
      unitId: 'player-1',
      target: { x: 8, y: 6 },
    });

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
      'UnitMoved',
    ]);
    expect(result.events[1]).toEqual({
      type: 'EnemySpotted',
      unitId: 'enemy-1',
      playerId: 'player-1',
      position: { x: 10, y: 10 },
      step: { x: 4, y: 6 },
    });
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 6, y: 6 },
    });
    expect(canSee(result.state.grid, result.state.enemies[0], result.state.players[0])).toBe(
      false,
    );
    expect(result.state.players[0]).toMatchObject({ x: 8, y: 6, mp: 1 });
  });

  it('una nueva visión reinicia la memoria y el contador', () => {
    const state = makeState({
      players: [playerAt(12, 5)],
      enemies: [
        enemyOf('sentinel', 5, 5, {
          awareness: 'returning',
          alertTurns: ALERT_COOLDOWN_PHASES,
          lastKnown: { x: 18, y: 18 },
          hasShouted: true,
        }),
      ],
    });

    const result = reduce(state, { type: 'Move', unitId: 'player-1', dx: -1, dy: 0 });

    expect(result.events.map((event) => event.type)).toEqual([
      'UnitMoved',
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 11, y: 5 },
      alertTurns: 0,
      hasShouted: true,
    });
  });
});

describe('onda de alarma', () => {
  it('todos los tipos del bestiario comparten radio de alarma 8', () => {
    for (const type of ['sentinel', 'brute', 'coward'] as const) {
      expect(BESTIARY[type].alarm).toBe(8);
      expect(alarmRadius(enemyOf(type, 5, 5))).toBe(8);
    }
    expect(alarmRadius(playerAt(5, 5))).toBe(0);
  });

  it('alerta a 8 tiles aunque haya un muro y no a 9', () => {
    const emitter = enemyOf('sentinel', 2, 2);
    const near = makeUnit({
      id: 'enemy-2',
      faction: 'enemy',
      enemyType: 'sentinel',
      x: 10,
      y: 2,
      awareness: 'dormant',
    });
    const far = makeUnit({
      id: 'enemy-3',
      faction: 'enemy',
      enemyType: 'sentinel',
      x: 11,
      y: 2,
      awareness: 'dormant',
    });
    const state = makeState({
      // El muro bloquea la visión entre emisor y receptor, no la onda.
      grid: makeGridWithWalls([{ x: 6, y: 2 }]),
      players: [playerAt(3, 2)],
      enemies: [emitter, near, far],
    });

    const result = detectEnemiesAfterStep(state);

    expect(result.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(result.events[1]).toEqual({
      type: 'AlarmRaised',
      unitId: 'enemy-1',
      position: { x: 2, y: 2 },
    });
    expect(result.state.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 3, y: 2 },
      hasShouted: true,
    });
    expect(result.state.enemies[1]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 3, y: 2 },
      alertTurns: 0,
      hasShouted: true,
    });
    expect(result.state.enemies[2]).toMatchObject({
      awareness: 'dormant',
      lastKnown: null,
      hasShouted: false,
    });
  });

  it('no se propaga en cadena: un receptor no alerta a otro', () => {
    const state = makeState({
      players: [playerAt(3, 2)],
      enemies: [
        enemyOf('sentinel', 2, 2),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'brute',
          x: 9,
          y: 2,
          awareness: 'dormant',
        }),
        makeUnit({
          id: 'enemy-3',
          faction: 'enemy',
          enemyType: 'brute',
          x: 17,
          y: 2,
          awareness: 'dormant',
        }),
      ],
    });

    const result = detectEnemiesAfterStep(state);

    expect(result.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(result.state.enemies[1]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 3, y: 2 },
      hasShouted: true,
    });
    expect(result.state.enemies[2]).toMatchObject({
      awareness: 'dormant',
      lastKnown: null,
      hasShouted: false,
    });
  });

  it('un receptor ya alertado comparte lastKnown y no repite la onda', () => {
    const state = makeState({
      players: [playerAt(3, 2)],
      enemies: [
        enemyOf('sentinel', 2, 2),
        makeUnit({
          id: 'enemy-2',
          faction: 'enemy',
          enemyType: 'sentinel',
          x: 10,
          y: 2,
          awareness: 'alert',
          lastKnown: { x: 1, y: 1 },
          alertTurns: 1,
          hasShouted: true,
        }),
      ],
    });

    const first = detectEnemiesAfterStep(state);

    expect(first.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'AlarmRaised',
    ]);
    expect(first.state.enemies[1]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 3, y: 2 },
      alertTurns: 0,
      hasShouted: true,
    });

    const second = detectEnemiesAfterStep(first.state);
    expect(second.events).toEqual([]);
  });

  it('con dos emisores emite todos los EnemySpotted y luego las ondas por índice', () => {
    const makeScenario = (): GameState =>
      makeState({
        players: [playerAt(10, 10)],
        enemies: [
          enemyOf('sentinel', 9, 10),
          enemyOf('sentinel', 11, 10, { id: 'enemy-2' }),
        ],
      });

    const first = detectEnemiesAfterStep(makeScenario());
    const second = detectEnemiesAfterStep(makeScenario());

    expect(first.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'EnemySpotted',
      'AlarmRaised',
      'AlarmRaised',
    ]);
    expect(first.events.map((event) => ('unitId' in event ? event.unitId : null))).toEqual([
      'enemy-1',
      'enemy-2',
      'enemy-1',
      'enemy-2',
    ]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('daño como despertador', () => {
  it('un enemigo dormido despierta en alerta y guarda la posición del atacante', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [enemyOf('sentinel', 15, 15, { awareness: 'dormant' })],
    });

    const next = noteDamage(state, 'enemy-1', { x: 12, y: 14 });

    expect(next).not.toBe(state);
    expect(next.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 12, y: 14 },
      alertTurns: 0,
      hasShouted: false,
    });
    expect(state.enemies[0]).toMatchObject({
      awareness: 'dormant',
      lastKnown: null,
    });
  });

  it('reinicia la memoria de un enemigo alertado sin repetir la alarma', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [
        enemyOf('sentinel', 15, 15, {
          awareness: 'alert',
          lastKnown: { x: 2, y: 2 },
          alertTurns: 2,
          hasShouted: true,
        }),
      ],
    });

    const next = noteDamage(state, 'enemy-1', { x: 13, y: 13 });

    expect(next.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 13, y: 13 },
      alertTurns: 0,
      hasShouted: true,
    });
  });

  it('devuelve a alerta a un enemigo en regreso como episodio nuevo', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [
        enemyOf('sentinel', 15, 15, {
          awareness: 'returning',
          alertTurns: ALERT_COOLDOWN_PHASES,
          hasShouted: true,
        }),
      ],
    });

    const next = noteDamage(state, 'enemy-1', { x: 16, y: 16 });

    expect(next.enemies[0]).toMatchObject({
      awareness: 'alert',
      lastKnown: { x: 16, y: 16 },
      alertTurns: 0,
      hasShouted: false,
    });
  });

  it('no cambia nada si el enemigo está muerto o no existe', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [enemyOf('sentinel', 15, 15, { awareness: 'dormant', hp: 0 })],
    });

    expect(noteDamage(state, 'enemy-1', { x: 1, y: 1 })).toBe(state);
    expect(noteDamage(state, 'enemy-x', { x: 1, y: 1 })).toBe(state);
  });
});

describe('dormido, investigación y regreso', () => {
  it('un enemigo dormido no se mueve ni ataca y conserva el estado', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [enemyOf('sentinel', 15, 15, { awareness: 'dormant' })],
    });

    let current = state;
    const events: GameEvent[] = [];
    for (let phase = 0; phase < 2; phase += 1) {
      const result = reduce(current, { type: 'EndTurn' });
      current = result.state;
      events.push(...result.events);
    }

    expect(current.enemies[0]).toMatchObject({
      x: 15,
      y: 15,
      awareness: 'dormant',
      alertTurns: 0,
    });
    expect(events.filter((event) => event.type === 'UnitMoved')).toEqual([]);
    expect(events.filter((event) => event.type === 'AttackPerformed')).toEqual([]);
    expect(events.filter((event) => event.type === 'EnemyWaited')).toHaveLength(2);
  });

  it('investiga 2 fases, vuelve en la tercera y se duerme al llegar', () => {
    const state = makeState({
      players: [playerAt(18, 18)],
      enemies: [
        enemyOf('sentinel', 2, 2, {
          awareness: 'alert',
          lastKnown: { x: 18, y: 18 },
        }),
      ],
    });

    let current = state;
    const events: GameEvent[] = [];

    for (let phase = 0; phase < 2; phase += 1) {
      const result = reduce(current, { type: 'EndTurn' });
      current = result.state;
      events.push(...result.events);
      expect(current.enemies[0].awareness).toBe('alert');
      expect(current.enemies[0].alertTurns).toBe(phase + 1);
    }

    const third = reduce(current, { type: 'EndTurn' });
    current = third.state;
    events.push(...third.events);
    expect(current.enemies[0]).toMatchObject({
      awareness: 'returning',
      alertTurns: ALERT_COOLDOWN_PHASES,
    });

    const fourth = reduce(current, { type: 'EndTurn' });
    current = fourth.state;
    events.push(...fourth.events);

    expect(current.enemies[0]).toMatchObject({
      x: 2,
      y: 2,
      awareness: 'dormant',
      lastKnown: null,
      alertTurns: 0,
      hasShouted: false,
    });
    expect(fourth.events).toContainEqual({
      type: 'EnemyReturned',
      unitId: 'enemy-1',
    });
    expect(events.filter((event) => event.type === 'AttackPerformed')).toEqual([]);
  });
});

describe('serialización y determinismo', () => {
  it('la percepción y la memoria sobreviven a un round-trip JSON', () => {
    const state = makeState({
      players: [playerAt(4, 4)],
      enemies: [
        enemyOf('coward', 10, 10, {
          awareness: 'returning',
          fleeing: true,
          home: { x: 2, y: 3 },
          lastKnown: { x: 8, y: 9 },
          alertTurns: 2,
          hasShouted: true,
        }),
      ],
    });

    const parsed = JSON.parse(JSON.stringify(state)) as GameState;

    expect(parsed).toEqual(state);
    expect(parsed.enemies[0]).toMatchObject({
      awareness: 'returning',
      fleeing: true,
      home: { x: 2, y: 3 },
      lastKnown: { x: 8, y: 9 },
      alertTurns: 2,
      hasShouted: true,
    });
  });

  it('dos ejecuciones idénticas producen los mismos eventos y posiciones', () => {
    const run = (): { state: GameState; events: ReturnType<typeof reduce>['events'] } => {
      const state = makeState({
        players: [playerAt(3, 6)],
        enemies: [enemyOf('sentinel', 10, 10)],
      });
      const move = reduce(state, {
        type: 'MoveTo',
        unitId: 'player-1',
        target: { x: 8, y: 6 },
      });
      const end = reduce(move.state, { type: 'EndTurn' });
      return { state: end.state, events: [...move.events, ...end.events] };
    };

    const first = run();
    const second = run();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('detectar no muta el estado de entrada', () => {
    const state = makeState({
      players: [playerAt(7, 5)],
      enemies: [enemyOf('sentinel', 3, 5)],
    });
    const before = JSON.stringify(state);

    const result = detectEnemiesAfterStep(state);

    expect(JSON.stringify(state)).toBe(before);
    expect(result.state).not.toBe(state);
    expect(result.events.map((event) => event.type)).toEqual([
      'EnemySpotted',
      'AlarmRaised',
    ]);
  });
});

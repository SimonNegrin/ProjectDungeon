import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  createPlayerFromArchetype,
} from '../../../src/game/index';
import { ITEMS } from '../../../src/game/equipment';
import type { GameState } from '../../../src/game/types';
import { buildHudModel } from '../../../src/host/hud';
import {
  buildCursorDetail,
  buildPanelDetail,
  cursorVisible,
  itemStats,
  traitsLabel,
} from '../../../src/host/hud-detail';
import { makeGridWithWalls, makeState, makeUnit } from '../game/helpers';

type MapOverrides = Partial<NonNullable<GameState['map']>>;

/** Mapa mínimo para el detalle: solo se leen doors, entrance y exit. */
function withMap(state: GameState, map: MapOverrides): GameState {
  return {
    ...state,
    map: map as unknown as NonNullable<GameState['map']>,
  };
}

function enemyState(): GameState {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    enemies: [
      makeUnit({
        id: 'enemy-1',
        nombre: BESTIARY.sentinel.name,
        enemyType: 'sentinel',
        faction: 'enemy',
        x: 6,
        y: 5,
        magicLevel: 2,
        mana: { current: 5, max: 8 },
      }),
    ],
  });
}

describe('detalle bajo el cursor por tipo', () => {
  it('describe un enemigo visible con PV, equipo, acciones y magia', () => {
    const detail = buildCursorDetail(enemyState(), { x: 6, y: 5 });

    expect(detail.kind).toBe('enemy');
    expect(detail.title).toBe(BESTIARY.sentinel.name);
    // Un único indicador: el tipo no se repite en un subtítulo.
    expect('subtitle' in detail).toBe(false);
    expect(JSON.stringify(detail)).not.toContain('"Enemigo"');
    expect(detail.rows.map((row) => row.id)).toEqual([
      'arma',
      'escudo',
      'armadura',
      'acciones',
    ]);
    expect(detail.vitals.map((row) => row.id)).toEqual(['pv', 'magia', 'mana']);
    expect(detail.vitals.find((row) => row.id === 'pv')?.value).toBe('6/6');
    expect(detail.rows.find((row) => row.id === 'arma')?.value).toContain(
      'Espada',
    );
    expect(detail.rows.find((row) => row.id === 'escudo')?.value).toContain(
      'Escudo',
    );
    expect(detail.rows.find((row) => row.id === 'armadura')?.value).toBe(
      'Sin armadura',
    );
    expect(detail.rows.find((row) => row.id === 'acciones')?.value).toBe('2/2');
    expect(detail.vitals.find((row) => row.id === 'magia')?.value).toBe('2');
    expect(detail.vitals.find((row) => row.id === 'mana')?.value).toBe('5/8');
    expect(detail.bands).toHaveLength(5);
  });

  it('omite magia y maná de un enemigo sin hechizos', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, magicLevel: 0 }),
      ],
    });
    const detail = buildCursorDetail(state, { x: 6, y: 5 });

    expect(detail.vitals.map((row) => row.id)).toEqual(['pv']);
    expect(detail.vitals.some((row) => row.id === 'magia')).toBe(false);
    expect(detail.vitals.some((row) => row.id === 'mana')).toBe(false);
  });

  it('describe un aliado con stats y equipo, nunca inventario', () => {
    const ally = createPlayerFromArchetype('warrior', {
      id: 'player-2',
      position: { x: 6, y: 5 },
    });
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        ally,
      ],
      enemies: [],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('ally');
    expect(detail.title).toBe('Guerrero');
    expect(detail.rows.find((row) => row.id === 'arquetipo')?.value).toBe(
      'Guerrero',
    );
    expect(detail.rows.find((row) => row.id === 'atributos')?.value).toBe(
      '+1 habilidad · +1 fuerza · +1 defensa',
    );
    expect(detail.rows.find((row) => row.id === 'arma')?.value).toContain(
      'Espada',
    );
    expect(detail.stats).toEqual([]);
    expect(detail.sprite).toBeNull();
    expect(JSON.stringify(detail)).not.toMatch(/mochila|inventario/i);
    // El tipo ya no se repite en eyebrow/título/subtítulo.
    expect(JSON.stringify(detail)).not.toContain('"Aliado"');
  });

  it('en fantasma, el aliado muestra estado y MP sin equipo ni inventario', () => {
    const ally = createPlayerFromArchetype('warrior', {
      id: 'player-2',
      position: { x: 6, y: 5 },
    });
    const ghost = { ...ally, hp: 0, mp: 2, maxMp: 6 };
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 }),
        ghost,
      ],
      enemies: [],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('ally');
    expect(detail.rows.find((row) => row.id === 'estado')?.value).toBe(
      'Fantasma',
    );
    expect(detail.rows.find((row) => row.id === 'mp')?.value).toBe('2/6');
    expect(detail.rows.some((row) => row.id === 'arma')).toBe(false);
    expect(detail.rows.some((row) => row.id === 'escudo')).toBe(false);
    expect(detail.rows.some((row) => row.id === 'armadura')).toBe(false);
    expect(detail.notes.join(' ')).toContain('sin equipo');
    expect(JSON.stringify(detail)).not.toMatch(/mochila/i);
  });

  it('describe un objeto del suelo con sprite y stats verticales, sin descripción', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      groundItems: [{ id: 'item-1', itemId: 'axe', x: 6, y: 5 }],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('item');
    expect(detail.title).toBe('Hacha');
    expect('subtitle' in detail).toBe(false);
    expect(detail.rows.map((row) => row.id)).toEqual(['ubicacion']);
    expect(detail.sprite).toEqual(ITEMS.axe.sprite.rect);
    expect(detail.stats).toEqual([
      { id: 'acierto', label: 'Acierto', value: '+2' },
      { id: 'dano', label: 'Daño', value: '+5' },
    ]);
    expect(detail.traits).toEqual([]);
    expect(JSON.stringify(detail)).not.toContain(ITEMS.axe.description);
    expect(JSON.stringify(detail)).not.toMatch(/cantidad|x1|×1|\d+\s*ud/i);
  });

  it('describe una puerta por tipo y sala sin prometer que se abre', () => {
    const state = withMap(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      }),
      {
        doors: [
          {
            id: 0,
            x: 6,
            y: 5,
            orientation: 'vertical',
            roomId: 3,
            style: 'grated',
          },
        ],
      },
    );

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('door');
    expect(detail.title).toBe('Puerta');
    expect(detail.rows).toEqual([
      { id: 'tipo', label: 'Tipo', value: 'Rejilla' },
      { id: 'sala', label: 'Sala', value: '3' },
    ]);
    expect(JSON.stringify(detail)).not.toMatch(/abre|cerrada|llave/i);
  });

  it('sin estilo de puerta solo conserva el tipo genérico y la sala', () => {
    const state = withMap(makeState(), {
      doors: [
        { id: 0, x: 6, y: 5, orientation: 'horizontal', roomId: 1 },
      ],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.title).toBe('Puerta');
    expect(detail.rows).toEqual([{ id: 'sala', label: 'Sala', value: '1' }]);
  });

  it('describe suelo y muro cuando la casilla está vacía, sin repetir el título', () => {
    const floor = buildCursorDetail(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      }),
      { x: 6, y: 5 },
    );
    expect(floor.kind).toBe('terrain');
    expect(floor.title).toBe('Suelo');
    expect(floor.rows).toEqual([]);

    const wallState = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
    });
    const wall = buildCursorDetail(wallState, { x: 6, y: 5 });
    expect(wall.kind).toBe('terrain');
    expect(wall.title).toBe('Muro');
    expect(wall.rows).toEqual([]);
  });

  it('da prioridad a la entrada y la salida sobre suelo o muro', () => {
    const entrance = withMap(
      makeState({
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      }),
      { entrance: { roomId: 1, position: { x: 6, y: 5 } } },
    );
    expect(buildCursorDetail(entrance, { x: 6, y: 5 }).title).toBe('Entrada');
    expect(buildCursorDetail(entrance, { x: 6, y: 5 }).rows).toEqual([]);

    const grid = makeGridWithWalls([{ x: 6, y: 5 }]);
    const exit = withMap(
      makeState({
        grid,
        players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      }),
      {
        exit: {
          roomId: 0,
          kind: 'door',
          position: { x: 6, y: 5 },
          access: { x: 5, y: 5 },
          tile: 'exit-door',
          distance: 1,
          path: [],
          fallback: false,
        },
      },
    );
    expect(buildCursorDetail(exit, { x: 6, y: 5 }).title).toBe('Salida');
  });

  it('no lee ni renderiza contenedores: el tipo queda reservado a REQ-020', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      containers: [
        {
          id: 'container-1',
          x: 6,
          y: 5,
          capacity: 4,
          items: [{ id: 'item-1', itemId: 'axe' }],
        },
      ],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('terrain');
    expect(JSON.stringify(detail)).not.toContain('container-1');
    expect(JSON.stringify(detail)).not.toContain('Hacha');
  });

  it('sin línea de visión devuelve desconocido sin filtrar la unidad oculta', () => {
    const state = makeState({
      grid: makeGridWithWalls([{ x: 6, y: 5 }]),
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          nombre: 'Oculto',
          faction: 'enemy',
          x: 7,
          y: 5,
        }),
      ],
    });

    expect(cursorVisible(state, { x: 7, y: 5 })).toBe(false);
    const detail = buildCursorDetail(state, { x: 7, y: 5 });
    expect(detail).toMatchObject({
      kind: 'unknown',
      title: 'Desconocido',
      rows: [],
      stats: [],
      traits: [],
      sprite: null,
      bands: null,
    });
    expect(JSON.stringify(detail)).not.toContain('Oculto');
    expect(JSON.stringify(detail)).not.toContain('10/10');
  });

  it('sin ningún jugador vivo no revela el contenido de la casilla', () => {
    const state = makeState({
      players: [
        makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5, hp: 0 }),
      ],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
    });

    const detail = buildCursorDetail(state, { x: 6, y: 5 });
    expect(detail.kind).toBe('unknown');
    expect(detail.title).toBe('Desconocido');
  });

  it('sin cursor, fuera de la rejilla o sin mapa devuelve desconocido', () => {
    const state = makeState();
    expect(buildCursorDetail(state).kind).toBe('unknown');
    expect(buildCursorDetail(state, { x: -1, y: 0 }).kind).toBe('unknown');
    expect(buildCursorDetail(state, { x: 99, y: 99 }).kind).toBe('unknown');
    expect(buildCursorDetail(state, { x: 4, y: 4 }).kind).toBe('ally');
  });

  it('los traits salen del catálogo equipado y hoy no hay bloque', () => {
    const state = makeState();
    expect(traitsLabel(state.players[0])).toBeNull();
    expect(traitsLabel(undefined)).toBeNull();
  });

  it('compone una fila por stat con el valor delante del nombre', () => {
    expect(itemStats(ITEMS.sword).map((stat) => `${stat.value} ${stat.label}`)).toEqual([
      '+3 Acierto',
      '+3 Daño',
    ]);
    expect(itemStats(ITEMS.armor).map((stat) => `${stat.value} ${stat.label}`)).toEqual([
      '+1 Absorción',
    ]);
    expect(itemStats(ITEMS.shield).map((stat) => `${stat.value} ${stat.label}`)).toEqual([
      '+1 Defensa',
    ]);
  });
});

describe('ficha de dos bloques con el panel abierto', () => {
  function panelState(): GameState {
    return makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['axe'],
          equipment: { weaponId: 'sword', armorId: null, shieldId: null },
        }),
      ],
      groundItems: [{ id: 'ground-plate', itemId: 'plate', x: 4, y: 4 }],
    });
  }

  it('muestra el seleccionado y el equipado en su hueco, sin delta', () => {
    const detail = buildPanelDetail(panelState(), {
      key: 'backpack:0',
      itemId: 'axe',
      instanceId: 'item-player-1-backpack-0',
      zone: 'backpack',
    });

    expect(detail.kind).toBe('panel');
    expect(detail.blocks).toHaveLength(2);
    const [selected, equipped] = detail.blocks;
    expect(selected).toMatchObject({
      id: 'selected',
      label: null,
      title: ITEMS.axe.name,
      empty: false,
    });
    expect(selected.stats).toEqual([
      { id: 'acierto', label: 'Acierto', value: '+2' },
      { id: 'dano', label: 'Daño', value: '+5' },
    ]);
    expect(selected.traits).toEqual([]);
    expect(selected.sprite).toEqual(ITEMS.axe.sprite.rect);
    expect(JSON.stringify(detail)).not.toContain(ITEMS.axe.description);

    expect(equipped).toMatchObject({
      id: 'equipped',
      label: 'Equipado',
      title: ITEMS.sword.name,
      empty: false,
    });
    expect(equipped.stats).toEqual([
      { id: 'acierto', label: 'Acierto', value: '+3' },
      { id: 'dano', label: 'Daño', value: '+3' },
    ]);
    expect(equipped.sprite).toEqual(ITEMS.sword.sprite.rect);
    expect(JSON.stringify(detail)).not.toContain(ITEMS.sword.description);
    expect(JSON.stringify(detail)).not.toContain('Seleccionado');
    // Sin comparación ni delta: no hay filas antes/después.
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toMatch(/before|after|antes|después/);
  });

  it('el bloque equipado dice «Vacío» y no inventa sprite, stats ni traits', () => {
    const detail = buildPanelDetail(panelState(), {
      key: 'ground:ground-plate',
      itemId: 'plate',
      instanceId: 'ground-plate',
      zone: 'right',
    });

    expect(detail.blocks[0]).toMatchObject({
      id: 'selected',
      label: null,
      title: ITEMS.plate.name,
      empty: false,
    });
    expect(detail.blocks[0].sprite).toEqual(ITEMS.plate.sprite.rect);
    expect(detail.blocks[1]).toMatchObject({
      id: 'equipped',
      label: 'Equipado',
      title: 'Vacío',
      stats: [],
      traits: [],
      sprite: null,
      empty: true,
    });
  });

  it('con el objeto equipado seleccionado mantiene dos bloques independientes', () => {
    const detail = buildPanelDetail(panelState(), {
      key: 'slot:weapon',
      itemId: 'sword',
      instanceId: 'item-player-1-weapon',
      zone: 'equipment',
    });

    expect(detail.blocks[0].label).toBeNull();
    expect(detail.blocks[1].label).toBe('Equipado');
    expect(detail.blocks[0].title).toBe(ITEMS.sword.name);
    expect(detail.blocks[1].title).toBe(ITEMS.sword.name);
    expect(detail.blocks[0].stats).toEqual(detail.blocks[1].stats);
  });

  it('los traits se muestran solo cuando el catálogo los declara', () => {
    const definition = ITEMS.axe as unknown as {
      traits: readonly { id: string; description: string }[];
    };
    const original = definition.traits;
    try {
      definition.traits = [{ id: 'filoso', description: 'Corta más' }];
      const detail = buildPanelDetail(panelState(), {
        key: 'backpack:0',
        itemId: 'axe',
        instanceId: 'item-player-1-backpack-0',
        zone: 'backpack',
      });
      expect(detail.blocks[0].traits).toEqual(['filoso: Corta más']);
      expect(detail.blocks[0].stats).toHaveLength(2);
    } finally {
      definition.traits = original;
    }
  });

  it('no altera el detalle del cursor', () => {
    const state = panelState();
    const before = buildCursorDetail(state, { x: 4, y: 4 });
    buildPanelDetail(state, {
      key: 'backpack:0',
      itemId: 'axe',
      instanceId: 'item-player-1-backpack-0',
      zone: 'backpack',
    });
    expect(buildCursorDetail(state, { x: 4, y: 4 })).toEqual(before);
  });
});

describe('solo lectura del modelo del HUD', () => {
  it('buildHudModel y buildCursorDetail no mutan estado ni RNG', () => {
    const state = enemyState();
    const before = JSON.stringify(state);
    const rngBefore = state.rng;

    buildHudModel(state, { x: 6, y: 5 });
    buildCursorDetail(state, { x: 6, y: 5 });
    buildHudModel(state, { x: 0, y: 0 });
    buildCursorDetail(state, { x: 0, y: 0 });

    expect(JSON.stringify(state)).toBe(before);
    expect(state.rng).toBe(rngBefore);
  });
});

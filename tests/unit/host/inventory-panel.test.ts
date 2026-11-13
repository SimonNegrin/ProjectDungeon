import { describe, expect, it } from 'vitest';
import {
  BspMapGenerator,
  createInitialState,
  reduce,
} from '../../../src/game/index';
import { ITEMS } from '../../../src/game/equipment';
import { allInstances } from '../../../src/game/inventory';
import type { GameState } from '../../../src/game/types';
import {
  buildInventoryPanelModel,
  rejectionMessage,
} from '../../../src/host/inventory-panel';
import { buildMotionTimeline, presentationState } from '../../../src/host/motion';
import { buildPresentationEvents } from '../../../src/host/presentation';
import { makeState, makeUnit } from '../game/helpers';

const GROUND_ITEM = { id: 'item-player-1-weapon', itemId: 'axe' as const, x: 4, y: 4 };

function backpackNames(state: GameState): readonly string[] {
  return state.players[0].inventory.items
    .filter((item) => item !== null)
    .map((item) => ITEMS[item.itemId].name);
}

function playerOnGroundItem(): GameState {
  return makeState({
    players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4 })],
    groundItems: [GROUND_ITEM],
  });
}

describe('modelo del panel de personaje', () => {
  it('muestra los ocho huecos de equipo y la mochila completa', () => {
    const model = buildInventoryPanelModel(makeState());

    expect(model.equipment.map((row) => row.key)).toEqual([
      'slot:weapon',
      'slot:shield',
      'slot:armor',
      'slot:head',
      'slot:feet',
      'slot:hands',
      'slot:neck',
      'slot:ring',
    ]);
    expect(model.equipment[0]).toMatchObject({
      name: ITEMS.sword.name,
      empty: false,
    });
    expect(model.equipment.filter((row) => row.empty)).toHaveLength(5);
    expect(model.backpack).toHaveLength(8);
    expect(model.backpack.every((row) => row.empty)).toBe(true);
    expect(model.backpackCount).toBe('0/8');
  });

  it('omite la zona del suelo si el tile está vacío y lista sus objetos si los hay', () => {
    const empty = buildInventoryPanelModel(makeState());
    expect(empty.ground).toBeNull();
    expect(empty.groundHint).toBe('');

    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4 })],
      groundItems: [
        GROUND_ITEM,
        { id: 'item-player-1-backpack-1', itemId: 'hammer', x: 4, y: 4 },
        { id: 'item-player-1-backpack-2', itemId: 'dagger', x: 9, y: 9 },
      ],
    });
    const model = buildInventoryPanelModel(state);

    expect(model.ground?.map((row) => row.name)).toEqual([
      ITEMS.axe.name,
      ITEMS.hammer.name,
    ]);
    expect(model.groundHint).toContain('primer objeto');
  });

  it('el icono de cada fila usa el mismo recorte de items.png que el mundo', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['hammer'],
        }),
      ],
      groundItems: [GROUND_ITEM],
    });
    const model = buildInventoryPanelModel(state);

    expect(model.equipment[0].sprite).toEqual(ITEMS.sword.sprite.rect);
    expect(model.backpack[0].sprite).toEqual(ITEMS.hammer.sprite.rect);
    expect(model.ground?.[0].sprite).toEqual(ITEMS.axe.sprite.rect);
    expect(model.backpack[1].empty).toBe(true);
    expect(model.backpack[1].sprite).toBeNull();
  });

  it('compara arma, armadura y escudo antes de equipar', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['hammer', 'plate', 'shield'],
        }),
      ],
    });
    const model = buildInventoryPanelModel(state);

    expect(model.backpack[0].comparison).toEqual([
      { label: 'Acierto', before: '+3', after: '+2' },
      { label: 'Daño', before: '3', after: '4' },
    ]);
    expect(model.backpack[1].comparison).toEqual([
      { label: 'Absorción', before: '+1', after: '+2' },
    ]);
    expect(model.backpack[2].comparison).toEqual([
      { label: 'Evasión', before: '+1', after: '+1' },
    ]);
    expect(model.equipment[0].comparison).toEqual([]);
  });

  it('desglosa base y equipo, y el total efectivo cambia al equipar', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['hammer'],
        }),
      ],
    });
    const before = buildInventoryPanelModel(state);

    expect(before.stats.total).toContain('Acierto +3');
    expect(before.stats.total).toContain('Absorción +1');
    expect(before.stats.rows[0].label).toBe('Base');
    expect(before.stats.rows.map((row) => row.label)).toContain('Espada (Arma)');
    expect(before.stats.rows.map((row) => row.label)).toContain('Escudo (Escudo)');

    const equipped = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    }).state;
    const after = buildInventoryPanelModel(equipped);

    expect(after.stats.total).toContain('Acierto +2');
    expect(after.stats.total).toContain('Daño');
    expect(after.equipment[0].name).toBe(ITEMS.hammer.name);
    expect(after.backpack[0].name).toBe(ITEMS.sword.name);
  });

  it('las acciones del panel llevan el comando del motor', () => {
    const state = playerOnGroundItem();
    const model = buildInventoryPanelModel(state);

    expect(
      model.equipment[0].actions.map((action) => [action.kind, action.command]),
    ).toEqual([
      [
        'unequip',
        { type: 'UnequipItem', unitId: 'player-1', slot: 'weapon' },
      ],
      ['drop', { type: 'DropItem', unitId: 'player-1', from: 'slot', slot: 'weapon' }],
    ]);
    expect(model.ground?.[0].actions).toEqual([
      {
        kind: 'pickup',
        label: 'Recoger',
        command: { type: 'PickUp', unitId: 'player-1' },
      },
      {
        kind: 'equip',
        label: 'Equipar',
        command: {
          type: 'EquipItem',
          unitId: 'player-1',
          from: 'ground',
          itemId: GROUND_ITEM.id,
        },
      },
    ]);

    const backpackState = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['dagger'],
        }),
      ],
    });
    expect(buildInventoryPanelModel(backpackState).backpack[0].actions).toEqual([
      {
        kind: 'equip',
        label: 'Equipar',
        command: { type: 'EquipItem', unitId: 'player-1', from: 'backpack', index: 0 },
      },
      {
        kind: 'drop',
        label: 'Soltar',
        command: { type: 'DropItem', unitId: 'player-1', from: 'backpack', index: 0 },
      },
    ]);
  });

  it('traduce los rechazos a un motivo textual y tiene un texto genérico', () => {
    expect(rejectionMessage('no-mp')).toBe('Sin MP para esta operación');
    expect(rejectionMessage('inventory-full')).toBe('La mochila está llena');
    expect(rejectionMessage('two-handed')).toBe(
      'El arma a dos manos no admite escudo',
    );
    expect(rejectionMessage('wrong-slot')).toBe(
      'El objeto no encaja en ese hueco',
    );
    expect(rejectionMessage('wall')).toBe('Operación rechazada');
  });
});

describe('integración del panel con el motor y los cues', () => {
  function initialRoom() {
    const state = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const item = (state.groundItems ?? [])[0];
    if (!item) throw new Error('La semilla de referencia debe colocar objetos');
    const onItem: GameState = {
      ...state,
      players: [{ ...state.players[0], x: item.x, y: item.y }],
    };
    return { state: onItem, item };
  }

  it('recoger desde el panel cambia la mochila y cobra 1 MP sin gastar acción', () => {
    const { state, item } = initialRoom();
    const model = buildInventoryPanelModel(state);
    const row = model.ground?.find((entry) => entry.key === `ground:${item.id}`);
    const pickup = row?.actions.find((action) => action.kind === 'pickup');
    if (!pickup) throw new Error('El suelo debe ofrecer recoger');

    const before = state.players[0];
    const result = reduce(state, pickup.command);
    const after = result.state.players[0];

    expect(after.mp).toBe(before.mp - 1);
    expect(after.actions).toEqual(before.actions);
    expect(backpackNames(result.state)).toContain(ITEMS[item.itemId].name);
    expect(
      buildInventoryPanelModel(result.state).ground?.some(
        (entry) => entry.key === `ground:${item.id}`,
      ) ?? false,
    ).toBe(false);
  });

  it('equipar desde la mochila del panel cambia el arma y conserva la acción', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          weapons: ['hammer'],
        }),
      ],
    });
    const model = buildInventoryPanelModel(state);
    const equip = model.backpack[0].actions.find(
      (action) => action.kind === 'equip',
    );
    if (!equip) throw new Error('La mochila debe ofrecer equipar');

    const before = state.players[0];
    const result = reduce(state, equip.command);
    const after = result.state.players[0];

    expect(after.equipment.weapon?.itemId).toBe('hammer');
    expect(after.mp).toBe(before.mp - 1);
    expect(after.actions).toEqual(before.actions);
    expect(buildInventoryPanelModel(result.state).equipment[0].name).toBe(
      ITEMS.hammer.name,
    );
  });

  it('el panel no muestra el objeto recogido antes de su cue', () => {
    const { state, item } = initialRoom();
    const model = buildInventoryPanelModel(state);
    const pickup = model.ground
      ?.find((entry) => entry.key === `ground:${item.id}`)
      ?.actions.find((action) => action.kind === 'pickup');
    if (!pickup) throw new Error('El suelo debe ofrecer recoger');

    const result = reduce(state, pickup.command);
    const presentation = buildPresentationEvents(
      pickup.command,
      state,
      result.state,
      result.events,
    );
    const timeline = buildMotionTimeline(presentation, {
      initialState: state,
      finalState: result.state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'pickup');
    if (!cue) throw new Error('La recogida debe producir un cue');

    const beforeCue = presentationState(
      result.state,
      timeline,
      cue.atMs - 1,
      state,
    );
    const beforeModel = buildInventoryPanelModel(beforeCue);
    expect(
      beforeModel.ground?.some((entry) => entry.key === `ground:${item.id}`),
    ).toBe(true);
    expect(beforeModel.backpack.some((entry) => entry.name === ITEMS[item.itemId].name)).toBe(
      false,
    );
    expect(beforeModel.mp).toBe(`${state.players[0].mp}/${state.players[0].maxMp}`);

    const afterCue = presentationState(
      result.state,
      timeline,
      cue.atMs + cue.durationMs,
      state,
    );
    const afterModel = buildInventoryPanelModel(afterCue);
    expect(
      afterModel.ground?.some((entry) => entry.key === `ground:${item.id}`) ?? false,
    ).toBe(false);
    expect(afterModel.backpack[0].name).toBe(ITEMS[item.itemId].name);
    expect(afterModel.mp).toBe(
      `${result.state.players[0].mp}/${result.state.players[0].maxMp}`,
    );
  });

  function expectUniqueInstances(state: GameState): void {
    const ids = allInstances(state).map((instance) => instance.id);
    expect(new Set(ids).size).toBe(ids.length);
  }

  it('soltar invierte la recogida: el objeto sigue en la mochila hasta el fin del beat', () => {
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
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          },
        }),
      ],
      groundItems: [],
    });
    const command = {
      type: 'DropItem' as const,
      unitId: 'player-1',
      from: 'backpack' as const,
      index: 0,
    };
    const result = reduce(state, command);
    const presentation = buildPresentationEvents(
      command,
      state,
      result.state,
      result.events,
    );
    expect(presentation).toEqual([
      { type: 'DropItem', unitId: 'player-1', itemId: 'axe', slot: 1 },
    ]);

    const timeline = buildMotionTimeline(presentation, {
      initialState: state,
      finalState: result.state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'select-weapon');
    if (!cue) throw new Error('Soltar debe producir su cue');

    const beforeCue = presentationState(result.state, timeline, cue.atMs - 1, state);
    expect(beforeCue.groundItems).toEqual([]);
    expect(beforeCue.players[0].inventory.items[0]?.itemId).toBe('axe');
    expectUniqueInstances(beforeCue);

    const duringCue = presentationState(result.state, timeline, cue.atMs, state);
    expect(duringCue.groundItems).toEqual([]);
    expectUniqueInstances(duringCue);

    const afterCue = presentationState(
      result.state,
      timeline,
      cue.atMs + cue.durationMs,
      state,
    );
    expect(afterCue.players[0].inventory.items[0]).toBeNull();
    expect(afterCue.groundItems).toEqual([
      { id: 'item-player-1-axe', itemId: 'axe', x: 4, y: 4 },
    ]);
    expectUniqueInstances(afterCue);
  });

  it('desequipar mueve el objeto al hueco de mochila al acabar su beat', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 4,
          y: 4,
          equipment: { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
        }),
      ],
    });
    const command = {
      type: 'UnequipItem' as const,
      unitId: 'player-1',
      slot: 'armor' as const,
    };
    const result = reduce(state, command);
    const presentation = buildPresentationEvents(
      command,
      state,
      result.state,
      result.events,
    );
    expect(presentation).toHaveLength(1);
    expect(presentation[0]).toMatchObject({
      type: 'UnequipItem',
      unitId: 'player-1',
      itemId: 'armor',
    });

    const timeline = buildMotionTimeline(presentation, {
      initialState: state,
      finalState: result.state,
    });
    const cue = timeline.cues.find((entry) => entry.kind === 'select-weapon');
    if (!cue) throw new Error('Desequipar debe producir su cue');

    const beforeCue = presentationState(result.state, timeline, cue.atMs - 1, state);
    expect(beforeCue.players[0].equipment.armor?.itemId).toBe('armor');
    expect(beforeCue.players[0].inventory.items[0]).toBeNull();
    expectUniqueInstances(beforeCue);

    const afterCue = presentationState(
      result.state,
      timeline,
      cue.atMs + cue.durationMs,
      state,
    );
    expect(afterCue.players[0].equipment.armor).toBeNull();
    expect(afterCue.players[0].inventory.items[0]?.itemId).toBe('armor');
    expectUniqueInstances(afterCue);
  });

  it('con prefers-reduced-motion el estado final se aplica de inmediato', () => {
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
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          },
        }),
      ],
      groundItems: [],
    });
    const command = {
      type: 'DropItem' as const,
      unitId: 'player-1',
      from: 'backpack' as const,
      index: 0,
    };
    const result = reduce(state, command);
    const presentation = buildPresentationEvents(
      command,
      state,
      result.state,
      result.events,
    );
    const timeline = buildMotionTimeline(presentation, {
      initialState: state,
      finalState: result.state,
      reducedMotion: true,
    });

    expect(timeline.totalMs).toBe(0);
    const immediate = presentationState(result.state, timeline, 0, state);
    expect(immediate.players[0].inventory.items[0]).toBeNull();
    expect(immediate.groundItems).toEqual(result.state.groundItems);
  });
});

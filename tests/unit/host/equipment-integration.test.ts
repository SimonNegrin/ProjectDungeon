import { describe, expect, it } from 'vitest';
import { BspMapGenerator, reduce, createInitialState } from '../../../src/game/index';
import { ITEMS, WEAPONS, weaponDamage } from '../../../src/game/equipment';
import type { GameState } from '../../../src/game/types';
import { buildHudModel } from '../../../src/host/hud';

function stateOnItem(
  state: GameState,
  item: { readonly x: number; readonly y: number },
): GameState {
  return {
    ...state,
    players: [{ ...state.players[0], x: item.x, y: item.y }],
  };
}

function backpackItemIds(state: GameState): readonly string[] {
  return state.players[0].inventory.items
    .filter((item) => item !== null)
    .map((item) => item.itemId);
}

describe('integración de recogida y equipo con el HUD', () => {
  it('recoger actualiza el HUD y la mochila sin auto-equipar', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const items = base.groundItems ?? [];
    expect(items.length).toBeGreaterThan(0);
    const item = items[0];

    const onItem = stateOnItem(base, item);
    expect(buildHudModel(onItem).weaponHint).toBe(
      `I panel · ${ITEMS[item.itemId].name} en el suelo`,
    );

    const picked = reduce(onItem, { type: 'PickUp', unitId: 'player-1' }).state;

    expect(picked.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(backpackItemIds(picked)).toEqual([item.itemId]);
    expect(buildHudModel(picked).weapon).toMatchObject({
      name: WEAPONS.sword.name,
      accuracy: WEAPONS.sword.accuracy,
      damage: weaponDamage(WEAPONS.sword),
      sprite: ITEMS.sword.sprite.rect,
    });
    expect(buildHudModel(picked).weaponHint).toBeNull();
  });

  it('recoger el martillo nuevo muestra su nombre del catálogo en pista', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const hammer = (base.groundItems ?? []).find(
      (item) => item.itemId === 'hammer',
    );
    if (!hammer) throw new Error('La semilla de referencia debe colocar el martillo');

    const onHammer = stateOnItem(base, hammer);
    expect(buildHudModel(onHammer).weaponHint).toBe(
      'I panel · Martillo en el suelo',
    );
    expect(buildHudModel(onHammer).weaponHint).not.toContain('hammer');

    const picked = reduce(onHammer, { type: 'PickUp', unitId: 'player-1' }).state;
    expect(picked.players[0].equipment.weapon?.itemId).toBe('sword');
    expect(backpackItemIds(picked)).toEqual(['hammer']);
  });

  it('equipar desde la mochila actualiza el HUD, cuesta 1 MP y no gasta acción', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const items = base.groundItems ?? [];
    expect(items.length).toBeGreaterThanOrEqual(2);

    const first = items[0];
    const afterFirst = reduce(stateOnItem(base, first), {
      type: 'PickUp',
      unitId: 'player-1',
    }).state;
    const second = (afterFirst.groundItems ?? [])[0];
    const afterSecond = reduce(stateOnItem(afterFirst, second), {
      type: 'PickUp',
      unitId: 'player-1',
    }).state;

    expect(backpackItemIds(afterSecond)).toEqual([first.itemId, second.itemId]);

    const mpBefore = afterSecond.players[0].mp;
    const actionsBefore = afterSecond.players[0].actions;
    const equipped = reduce(afterSecond, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    }).state;

    expect(equipped.players[0].equipment.weapon?.itemId).toBe(first.itemId);
    expect(equipped.players[0].mp).toBe(mpBefore - 1);
    expect(equipped.players[0].actions).toEqual(actionsBefore);
    const weapon = WEAPONS[first.itemId as keyof typeof WEAPONS];
    expect(buildHudModel(equipped).weapon).toMatchObject({
      name: weapon.name,
      accuracy: weapon.accuracy,
      damage: weaponDamage(weapon),
      sprite: ITEMS[first.itemId as keyof typeof ITEMS].sprite.rect,
    });
  });
});

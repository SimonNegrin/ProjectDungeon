import { describe, expect, it } from 'vitest';
import { BspMapGenerator, reduce, createInitialState } from '../../../src/game/index';
import { WEAPONS } from '../../../src/game/equipment';
import type { GameState } from '../../../src/game/types';
import { buildHudModel } from '../../../src/host/hud';

function stateOnWeapon(
  state: GameState,
  weapon: { readonly x: number; readonly y: number },
): GameState {
  return {
    ...state,
    players: [{ ...state.players[0], x: weapon.x, y: weapon.y }],
  };
}

describe('integración de recogida y cambio de arma con el HUD', () => {
  it('recoger actualiza el HUD, el inventario y el arma equipada', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const weapons = base.map?.weapons ?? [];
    expect(weapons.length).toBeGreaterThan(0);
    const weapon = weapons[0];

    const onWeapon = stateOnWeapon(base, weapon);
    expect(buildHudModel(onWeapon).weaponHint).toBe(
      `G recoger ${WEAPONS[weapon.weaponId].name}`,
    );

    const picked = reduce(onWeapon, { type: 'PickUp', unitId: 'player-1' }).state;

    expect(picked.players[0].equipment.weaponId).toBe(weapon.weaponId);
    expect(picked.players[0].weapons).toEqual(['sword', weapon.weaponId]);
    expect(buildHudModel(picked).weapon).toBe(
      `${WEAPONS[weapon.weaponId].name} +${WEAPONS[weapon.weaponId].accuracy}/+${WEAPONS[weapon.weaponId].damage}`,
    );
    expect(buildHudModel(picked).weaponHint).toBeNull();
  });

  it('cambiar de hueco actualiza el HUD sin gastar MP ni acción', () => {
    const base = createInitialState({
      seed: 279837264,
      generator: new BspMapGenerator(),
    });
    const weapons = base.map?.weapons ?? [];
    expect(weapons.length).toBeGreaterThanOrEqual(2);

    const first = weapons[0];
    const afterFirst = reduce(stateOnWeapon(base, first), {
      type: 'PickUp',
      unitId: 'player-1',
    }).state;
    const second = (afterFirst.map?.weapons ?? [])[0];
    const afterSecond = reduce(stateOnWeapon(afterFirst, second), {
      type: 'PickUp',
      unitId: 'player-1',
    }).state;

    expect(afterSecond.players[0].weapons).toEqual([
      'sword',
      first.weaponId,
      second.weaponId,
    ]);

    const mpBefore = afterSecond.players[0].mp;
    const actionBefore = afterSecond.players[0].actionAvailable;
    const switched = reduce(afterSecond, {
      type: 'SelectWeapon',
      unitId: 'player-1',
      slot: 2,
    }).state;

    expect(switched.players[0].equipment.weaponId).toBe(first.weaponId);
    expect(switched.players[0].mp).toBe(mpBefore);
    expect(switched.players[0].actionAvailable).toBe(actionBefore);
    expect(buildHudModel(switched).weapon).toBe(
      `${WEAPONS[first.weaponId].name} +${WEAPONS[first.weaponId].accuracy}/+${WEAPONS[first.weaponId].damage}`,
    );
  });
});

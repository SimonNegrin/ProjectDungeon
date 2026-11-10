import { describe, expect, it } from 'vitest';
import {
  WEAPONS,
  armorValue,
  reduce,
  resolveDamage,
  type Unit,
} from '../../../src/game/index';
import {
  collectAttackFeedbacks,
  collectDamageFeedbacks,
  damageFeedbackAnchor,
  DAMAGE_FEEDBACK_HALF_WIDTH,
  DAMAGE_FEEDBACK_HEIGHT,
  type DamageFeedbackAnchor,
} from '../../../src/host/feedback';
import { makeState, makeUnit, rngForDice } from '../game/helpers';

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  armorDie: number,
): number {
  return resolveDamage(
    attacker.stats.fuerza + WEAPONS[attacker.equipment.weaponId!].damage,
    armorValue(target.equipment.armorId),
    damageDie,
    armorDie,
  );
}

describe('feedback de ataque', () => {
  it('convierte AttackPerformed en daño y posición del objetivo', () => {
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

    expect(collectDamageFeedbacks(result.events, result.state)).toEqual([
      {
        targetId: 'enemy-1',
        damage: expectedDamage(state.players[0], state.enemies[0], 2, 1),
        x: 6,
        y: 5,
      },
    ]);
  });

  it('también produce feedback para el ataque enemigo', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5 })],
      rng: rngForDice([6, 1, 3, 3]),
    });
    const result = reduce(state, { type: 'EndTurn' });

    expect(collectDamageFeedbacks(result.events, result.state)).toEqual([
      {
        targetId: 'player-1',
        damage: expectedDamage(state.enemies[0], state.players[0], 3, 3),
        x: 5,
        y: 5,
      },
    ]);
  });

  it('no inventa feedback sin ataques', () => {
    const state = makeState();

    expect(collectDamageFeedbacks([], state)).toEqual([]);
    expect(collectAttackFeedbacks([], state)).toEqual([]);
  });
});

describe('feedback de impacto y fallo', () => {
  it('un impacto usa el texto ASCII -N y conserva daño, vida y tiradas', () => {
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

    const damage = expectedDamage(state.players[0], state.enemies[0], 2, 1);
    expect(collectAttackFeedbacks(result.events, result.state)).toEqual([
      {
        targetId: 'enemy-1',
        hit: true,
        damage,
        targetHp: state.enemies[0].maxHp - damage,
        rolls: { attack: 6, shield: 1, damage: 2, armor: 1 },
        text: `-${damage}`,
        x: 6,
        y: 5,
        attacker: { x: 5, y: 5 },
      },
    ]);
  });

  it('un fallo produce Fallo con texto y sin tiradas de daño', () => {
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

    const [feedback] = collectAttackFeedbacks(result.events, result.state);

    expect(feedback).toMatchObject({
      targetId: 'enemy-1',
      hit: false,
      damage: 0,
      targetHp: 10,
      rolls: { attack: 1, shield: 6, damage: null, armor: null },
      text: 'Fallo',
      x: 6,
      y: 5,
    });
  });
});

describe('anclaje del feedback de daño', () => {
  const MAP = { width: 32, height: 32 } as const;
  const TARGET = { x: 10, y: 10 } as const;

  /** Caja nominal del texto: centro horizontal en `x` y borde inferior en `y`. */
  function textBox(anchor: DamageFeedbackAnchor) {
    return {
      left: anchor.x - DAMAGE_FEEDBACK_HALF_WIDTH,
      right: anchor.x + DAMAGE_FEEDBACK_HALF_WIDTH,
      top: anchor.y - DAMAGE_FEEDBACK_HEIGHT,
      bottom: anchor.y,
    };
  }

  function tileBox(tile: { readonly x: number; readonly y: number }) {
    return { left: tile.x, right: tile.x + 1, top: tile.y, bottom: tile.y + 1 };
  }

  function intersects(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  it('si el atacante está arriba, el texto queda debajo del centro del objetivo', () => {
    const anchor = damageFeedbackAnchor(TARGET, { x: 10, y: 9 }, MAP);
    const text = textBox(anchor);

    expect(anchor.side).toBe('below');
    expect(anchor.x).toBe(10.5);
    expect(text.top).toBeGreaterThanOrEqual(10.5);
    expect(text.bottom).toBeLessThanOrEqual(11);
  });

  it('si el atacante está abajo, el texto queda encima del centro del objetivo', () => {
    const anchor = damageFeedbackAnchor(TARGET, { x: 10, y: 11 }, MAP);
    const text = textBox(anchor);

    expect(anchor.side).toBe('above');
    expect(anchor.x).toBe(10.5);
    expect(text.bottom).toBeLessThanOrEqual(10.5);
    expect(text.top).toBeGreaterThanOrEqual(10);
  });

  it('si el atacante está a la izquierda, el texto se desplaza a la derecha', () => {
    const anchor = damageFeedbackAnchor(TARGET, { x: 9, y: 10 }, MAP);

    expect(anchor.side).toBe('right');
    expect(anchor.x).toBeGreaterThan(10.5);
  });

  it('si el atacante está a la derecha, el texto se desplaza a la izquierda', () => {
    const anchor = damageFeedbackAnchor(TARGET, { x: 11, y: 10 }, MAP);

    expect(anchor.side).toBe('left');
    expect(anchor.x).toBeLessThan(10.5);
  });

  it('en las cuatro direcciones el texto no invade la casilla del atacante', () => {
    for (const attacker of [
      { x: 10, y: 9 },
      { x: 10, y: 11 },
      { x: 9, y: 10 },
      { x: 11, y: 10 },
    ]) {
      const anchor = damageFeedbackAnchor(TARGET, attacker, MAP);
      expect(intersects(textBox(anchor), tileBox(attacker))).toBe(false);
    }
  });

  it('en diagonal gana el eje vertical de forma determinista', () => {
    const desdeArribaIzquierda = damageFeedbackAnchor(TARGET, { x: 9, y: 9 }, MAP);
    const desdeAbajoIzquierda = damageFeedbackAnchor(TARGET, { x: 9, y: 11 }, MAP);

    expect(desdeArribaIzquierda.side).toBe('below');
    expect(desdeAbajoIzquierda.side).toBe('above');
    expect(intersects(textBox(desdeArribaIzquierda), tileBox({ x: 9, y: 9 }))).toBe(false);
    expect(intersects(textBox(desdeAbajoIzquierda), tileBox({ x: 9, y: 11 }))).toBe(false);
  });

  it('en la misma casilla usa `below` como regla fija', () => {
    const anchor = damageFeedbackAnchor(TARGET, { x: 10, y: 10 }, MAP);

    expect(anchor.side).toBe('below');
    expect(anchor).toEqual({ x: 10.5, y: 11, side: 'below' });
  });

  it('en los bordes del mapa mantiene la caja del texto dentro del marco', () => {
    const cases = [
      { target: { x: 0, y: 0 }, attacker: { x: 1, y: 0 }, side: 'left' },
      { target: { x: 31, y: 0 }, attacker: { x: 30, y: 0 }, side: 'right' },
      { target: { x: 0, y: 0 }, attacker: { x: 0, y: 1 }, side: 'above' },
      { target: { x: 0, y: 31 }, attacker: { x: 0, y: 30 }, side: 'below' },
    ] as const;

    for (const item of cases) {
      const anchor = damageFeedbackAnchor(item.target, item.attacker, MAP);
      const text = textBox(anchor);

      expect(anchor.side, `borde ${item.side}`).toBe(item.side);
      expect(text.left).toBeGreaterThanOrEqual(0);
      expect(text.right).toBeLessThanOrEqual(MAP.width);
      expect(text.top).toBeGreaterThanOrEqual(0);
      expect(text.bottom).toBeLessThanOrEqual(MAP.height);
    }
  });
});

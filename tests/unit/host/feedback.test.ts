import { describe, expect, it } from 'vitest';
import { reduce, type GameEvent, type ResistanceProfile, type Unit } from '../../../src/game/index';
import {
  collectAttackFeedbacks,
  collectDamageFeedbacks,
  damageFeedbackAnchor,
  DAMAGE_FEEDBACK_HALF_WIDTH,
  DAMAGE_FEEDBACK_HEIGHT,
  layoutDamageTexts,
  MAX_DAMAGE_TEXTS,
  type DamageFeedbackAnchor,
} from '../../../src/host/feedback';
import {
  expectedSinglePacketDamage,
  makeState,
  makeUnit,
  rngForDice,
} from '../game/helpers';

function expectedDamage(
  attacker: Unit,
  target: Unit,
  damageDie: number,
  resistanceDie: number,
): number {
  return expectedSinglePacketDamage(attacker, target, damageDie, resistanceDie);
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
      {
        targetId: 'player-1',
        damage: 0,
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
        detail: `filo ${damage}`,
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

describe('desglose por tipo del ataque', () => {
  interface MixedOptions {
    readonly resistencia?: ResistanceProfile;
    readonly dice?: readonly number[];
    readonly armorId?: 'armor' | 'plate' | null;
  }

  /** Ataque real con la espada electrizada (filo + eléctrico) del catálogo. */
  function mixedAttack(options: MixedOptions = {}) {
    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      weapons: ['electric-sword'],
      equipment: { weaponId: 'electric-sword', armorId: null, shieldId: null },
    });
    const enemy = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      x: 6,
      y: 5,
      maxHp: 50,
      stats: { resistencia: options.resistencia ?? { electric: 'vulnerable' } },
      equipment: {
        weaponId: 'sword',
        armorId: options.armorId === undefined ? null : options.armorId,
        shieldId: null,
      },
    });
    const state = makeState({
      players: [player],
      enemies: [enemy],
      rng: rngForDice(options.dice ?? [6, 1, 4, 2, 3, 1]),
    });
    const result = reduce(state, {
      type: 'Attack',
      unitId: 'player-1',
      targetId: 'enemy-1',
    });
    const event = result.events.find(
      (entry): entry is Extract<GameEvent, { type: 'AttackPerformed' }> =>
        entry.type === 'AttackPerformed',
    );
    if (!event) throw new Error('se esperaba un ataque');
    const [feedback] = collectAttackFeedbacks(result.events, result.state);
    if (!feedback) throw new Error('se esperaba feedback de ataque');
    return { event, feedback };
  }

  it('lee el total y el desglose del evento, no de una fórmula paralela', () => {
    const { event, feedback } = mixedAttack();

    expect(event.damage).toBe(10);
    expect(event.damageBreakdown.map((packet) => packet.damage)).toEqual([6, 4]);
    expect(feedback.text).toBe('-10');
    expect(feedback.damage).toBe(event.damage);
    expect(feedback.detail).toBe(
      `filo ${event.damageBreakdown[0].damage} + eléctrico ${event.damageBreakdown[1].damage}`,
    );
    expect(feedback.detail).toBe('filo 6 + eléctrico 4');
  });

  it('un cambio de banda en el estado cambia el texto sin tocar el host', () => {
    const normal = mixedAttack({ resistencia: { electric: 'normal' } });
    const vulnerable = mixedAttack({ resistencia: { electric: 'vulnerable' } });

    expect(normal.feedback.detail).toBe('filo 6 + eléctrico 3');
    expect(vulnerable.feedback.detail).toBe('filo 6 + eléctrico 4');
    expect(normal.feedback.detail).not.toBe(vulnerable.feedback.detail);
  });

  it('un paquete recortado a 0 no aparece en el desglose', () => {
    const { event, feedback } = mixedAttack({ dice: [6, 1, 4, 2, 3, 6] });

    expect(event.damageBreakdown.map((packet) => packet.damage)).toEqual([6, 0]);
    expect(event.damage).toBe(6);
    expect(feedback.detail).toBe('filo 6');
    expect(feedback.detail).not.toContain('eléctrico');
  });

  it('si todos los paquetes quedan a 0 muestra el total mínimo sin desglose', () => {
    const { event, feedback } = mixedAttack({
      dice: [6, 1, 1, 6, 1, 6],
      armorId: 'plate',
    });

    expect(event.damageBreakdown.map((packet) => packet.damage)).toEqual([0, 0]);
    expect(event.damage).toBe(1);
    expect(feedback.text).toBe('-1');
    expect(feedback.detail).toBe('');
  });

  it('curación y resurrección no producen desglose ni texto de daño', () => {
    const heal: GameEvent = {
      type: 'SpellCast',
      casterId: 'player-1',
      spellId: 'healing-3',
      targetId: 'player-1',
      target: { x: 5, y: 5 },
      effect: 'heal',
      healing: 4,
      targetHp: 10,
    };
    const resurrect: GameEvent = {
      type: 'SpellCast',
      casterId: 'player-1',
      spellId: 'resurrection-4',
      targetId: 'player-1',
      target: { x: 5, y: 5 },
      effect: 'resurrect',
      targetHp: 12,
    };

    expect(collectAttackFeedbacks([heal, resurrect], makeState())).toEqual([]);
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

  it('coloca hasta tres textos simultáneos del mismo tile sin pisarse', () => {
    expect(MAX_DAMAGE_TEXTS).toBe(3);
    const layouts = layoutDamageTexts(
      [
        { target: TARGET, attacker: { x: 9, y: 10 } },
        { target: TARGET, attacker: { x: 9, y: 10 } },
        { target: TARGET, attacker: { x: 9, y: 10 } },
      ],
      MAP,
    );

    const boxes = layouts.map(textBox);
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        expect(intersects(boxes[a], boxes[b]), `textos ${a}/${b}`).toBe(false);
      }
      expect(boxes[a].left).toBeGreaterThanOrEqual(0);
      expect(boxes[a].right).toBeLessThanOrEqual(MAP.width);
      expect(boxes[a].top).toBeGreaterThanOrEqual(0);
      expect(boxes[a].bottom).toBeLessThanOrEqual(MAP.height);
    }
  });
});

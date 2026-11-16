import { describe, expect, it } from 'vitest';
import {
  BESTIARY,
  ITEMS,
  ROSTER,
  TRAITS,
  activeTraits,
  aggregateEffectiveStats,
  areaOffsets,
  buildSaveFiles,
  createInitialState,
  effectiveStats,
  emptyEquipment,
  equipmentFromLegacy,
  inventoryFromIds,
  itemInstance,
  lifestealHealing,
  modifierTotals,
  parseSave,
  reduce,
  resolveAttack,
  shiftResistance,
  validateItemCatalog,
  validateTraitCatalog,
  withEquipment,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemId,
  type TraitAreaParameters,
  type UnitStats,
} from '../../../src/game/index';
import {
  expectedSinglePacketDamage,
  makeState,
  makeUnit,
  rngForDice,
} from './helpers';

const BASE: UnitStats = {
  habilidad: 1,
  fuerza: 1,
  defensa: 1,
  resistencia: {},
  punteria: 0,
  magicLevel: 0,
  acciones: 2,
};

const BARE = { weaponId: null, armorId: null, shieldId: null } as const;

let syntheticCounter = 0;

/** Objeto sintético sobre una base del catálogo, para aislar una regla. */
function syntheticItem(
  slot: EquipmentSlot,
  traitIds: readonly string[],
  overrides: Partial<ItemDefinition> = {},
): ItemDefinition {
  const base =
    slot === 'weapon'
      ? ITEMS['circular-mace']
      : slot === 'ring'
        ? ITEMS['lifesteal-ring']
        : slot === 'neck'
          ? ITEMS['mana-necklace']
          : slot === 'hands'
            ? ITEMS['action-gloves']
            : ITEMS.armor;
  syntheticCounter += 1;
  return {
    ...base,
    id: `synthetic-${syntheticCounter}` as ItemDefinition['id'],
    slot,
    hands: slot === 'weapon' ? 1 : undefined,
    modifiers: {},
    damagePackets: slot === 'weapon' ? [{ type: 'blunt', amount: 3 }] : [],
    traits: traitIds.map((id) => ({ id, description: TRAITS[id].description })),
    ...overrides,
  };
}

function profileWith(item: ItemDefinition, bases = { maxHp: 20, maxMp: 6 }) {
  return aggregateEffectiveStats(BASE, [item], bases);
}

describe('catálogo de traits como dato (REQ-019 T-001/T-002)', () => {
  it('valida el catálogo y los objetos con traits del catálogo', () => {
    expect(validateTraitCatalog(TRAITS)).toEqual([]);
    expect(validateItemCatalog(Object.values(ITEMS))).toEqual([]);
    for (const trait of Object.values(TRAITS)) {
      expect(trait.id.length).toBeGreaterThan(0);
      expect(trait.name.length).toBeGreaterThan(0);
      expect(trait.description.length).toBeGreaterThan(0);
      expect(['modifier', 'triggered', 'continuous']).toContain(trait.type);
      expect(['sum', 'unique']).toContain(trait.stacking);
      expect(['inherent', 'equipment', 'temporary']).toContain(trait.source);
    }
  });

  it('rechaza traits con ID estable incoherente o parámetros imposibles', () => {
    const invalid = {
      ...TRAITS.lifesteal,
      id: 'otro-id',
      parameters: { kind: 'lifesteal', percent: 150, rounding: 'floor', minimum: -1 },
    } as const;
    const issues = validateTraitCatalog({ lifesteal: invalid });
    expect(issues.map((issue) => issue.rule)).toEqual(
      expect.arrayContaining(['id', 'parameters']),
    );
  });

  it('las cuatro piezas existen con sprite y no están en roster ni bestiario', () => {
    const pieces = [
      ['lifesteal-ring', 'ring'],
      ['mana-necklace', 'neck'],
      ['action-gloves', 'hands'],
      ['circular-mace', 'weapon'],
    ] as const;
    for (const [id, slot] of pieces) {
      expect(ITEMS[id].slot).toBe(slot);
      expect(ITEMS[id].traits.length).toBeGreaterThan(0);
      expect(ITEMS[id].sprite.label.length).toBeGreaterThan(0);
    }
    expect(ITEMS['circular-mace'].hands).toBe(2);
    expect(ITEMS['circular-mace'].damagePackets[0].amount).toBeLessThan(5);
    expect(ITEMS['circular-mace'].damagePackets[0].amount).toBeLessThan(
      ITEMS.axe.damagePackets[0].amount,
    );

    const rosterIds = Object.values(ROSTER).flatMap((entry) => [
      entry.equipment.weaponId,
      entry.equipment.armorId,
      entry.equipment.shieldId,
    ]);
    const enemyIds = Object.values(BESTIARY).flatMap((entry) => [
      entry.equipment.weaponId,
      entry.equipment.armorId,
      entry.equipment.shieldId,
    ]);
    for (const [id] of pieces) {
      expect(rosterIds).not.toContain(id);
      expect(enemyIds).not.toContain(id);
    }
  });
});

describe('stacking, suelos y topes (REQ-019 R-008/T-003)', () => {
  it('cubre los nueve atributos, incluidos resistencia, magia, PV, MP y acciones', () => {
    const item = syntheticItem('ring', [
      'precise',
      'strong',
      'guarded',
      'tough-skin',
      'sharp-eye',
      'arcane',
      'vitality',
      'mana-surge',
      'action-surge',
    ]);
    const profile = profileWith(item);

    expect(profile.stats).toMatchObject({
      habilidad: 2,
      fuerza: 2,
      defensa: 2,
      punteria: 1,
      magicLevel: 1,
      acciones: 3,
    });
    expect(profile.stats.resistencia).toEqual({
      slash: 'resistant',
      blunt: 'resistant',
      pierce: 'resistant',
      magic: 'resistant',
      electric: 'resistant',
    });
    expect(profile.maxHp).toBe(22);
    expect(profile.maxMp).toBe(8);
    expect(profile.actionsMax).toBe(3);
    expect(profile.traits).toHaveLength(9);
    expect(profile.traits.every((trait) => trait.source === 'equipment')).toBe(true);
  });

  it('suma los modificadores numéricos del mismo atributo', () => {
    const neck = syntheticItem('neck', ['mana-surge']);
    const ring = syntheticItem('ring', ['mana-surge']);
    const profile = aggregateEffectiveStats(BASE, [neck, ring], {
      maxHp: 20,
      maxMp: 6,
    });
    expect(profile.maxMp).toBe(10);
    expect(profile.modifiers.mpMax).toBe(4);
  });

  it('los especiales son únicos y cuenta el mayor, sin depender del orden', () => {
    const minor = syntheticItem('neck', ['lifesteal-minor']);
    const major = syntheticItem('ring', ['lifesteal']);
    const forward = aggregateEffectiveStats(BASE, [minor, major], {
      maxHp: 20,
      maxMp: 6,
    });
    const reversed = aggregateEffectiveStats(BASE, [major, minor], {
      maxHp: 20,
      maxMp: 6,
    });

    const lifesteals = (items: readonly ActiveTraitLike[]) =>
      items.filter((trait) => trait.stackingKey === 'lifesteal');
    expect(lifesteals(forward.traits)).toHaveLength(1);
    expect(lifesteals(reversed.traits)).toHaveLength(1);
    expect(forward.traits.find((trait) => trait.stackingKey === 'lifesteal')).toMatchObject({
      id: 'lifesteal',
      parameters: { kind: 'lifesteal', percent: 50 },
    });
    expect(reversed.stats).toEqual(forward.stats);
    expect(reversed.traits).toEqual(forward.traits);
  });

  it('aplica suelos de PV, MP y acciones, y el tope de 4 acciones', () => {
    const brittle = syntheticItem('neck', ['brittle']);
    expect(aggregateEffectiveStats(BASE, [brittle], { maxHp: 3, maxMp: 6 }).maxHp).toBe(1);

    const drain = syntheticItem('neck', ['mana-drain']);
    expect(aggregateEffectiveStats(BASE, [drain], { maxHp: 20, maxMp: 2 }).maxMp).toBe(0);

    const slow = syntheticItem('hands', ['slow']);
    const lowStats: UnitStats = { ...BASE, acciones: 1 };
    const slowProfile = aggregateEffectiveStats(lowStats, [slow], {});
    expect(slowProfile.stats.acciones).toBe(1);
    expect(slowProfile.actionsMax).toBe(1);

    const threeActions = [
      syntheticItem('hands', ['action-surge']),
      syntheticItem('neck', ['action-surge']),
      syntheticItem('ring', ['action-surge']),
    ];
    const cappedProfile = aggregateEffectiveStats(BASE, threeActions, {});
    expect(cappedProfile.stats.acciones).toBe(4);
    expect(cappedProfile.actionsMax).toBe(4);
  });

  it('permite traits negativos y respeta los suelos', () => {
    const frail = syntheticItem('neck', ['frail']);
    const profile = profileWith(frail);
    expect(profile.stats.defensa).toBe(0);
    expect(profile.modifiers.defensa).toBe(-1);
  });

  it('desplaza las bandas de resistencia con tope y sin camino paralelo', () => {
    expect(shiftResistance({}, 1)).toEqual({
      slash: 'resistant',
      blunt: 'resistant',
      pierce: 'resistant',
      magic: 'resistant',
      electric: 'resistant',
    });
    expect(shiftResistance({ slash: 'very-resistant' }, 1).slash).toBe('very-resistant');
    expect(shiftResistance({ slash: 'vulnerable' }, -1).slash).toBe('vulnerable');
  });

  it('el desglose y los traits activos son serializables', () => {
    const unit = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('mace', 'circular-mace'),
        ring: itemInstance('ring', 'lifesteal-ring'),
        neck: itemInstance('neck', 'mana-necklace'),
      },
    });
    const profile = effectiveStats(unit);
    const roundTrip = JSON.parse(JSON.stringify(profile)) as typeof profile;

    expect(roundTrip).toEqual(profile);
    expect(profile.traits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'circular-strike',
          source: 'equipment',
          slot: 'weapon',
          itemId: 'circular-mace',
        }),
        expect.objectContaining({
          id: 'lifesteal',
          source: 'equipment',
          slot: 'ring',
          itemId: 'lifesteal-ring',
        }),
      ]),
    );
    expect(profile.maxMp).toBe(unit.maxMp + 2);
  });

  it('guarda y carga el equipo con traits sin perder recursos', () => {
    const base = createInitialState({ seed: 1017 });
    const player = withEquipment(base.players[0], {
      ...emptyEquipment(),
      weapon: itemInstance('mace', 'circular-mace'),
      ring: itemInstance('ring', 'lifesteal-ring'),
      neck: itemInstance('neck', 'mana-necklace'),
    });
    const state = { ...base, players: [player] };
    const files = buildSaveFiles(state, {
      gameVersion: '0.1.0',
      createdAt: '2026-11-16T00:00:00Z',
    });
    const loaded = parseSave(files.save);
    if (!loaded.ok) throw new Error(loaded.error.message);

    const restored = loaded.value.players[0];
    expect(restored.equipment.weapon?.itemId).toBe('circular-mace');
    expect(restored.equipment.ring?.itemId).toBe('lifesteal-ring');
    expect(restored.equipment.neck?.itemId).toBe('mana-necklace');
    expect(restored.maxHp).toBe(player.maxHp);
    expect(restored.maxMp).toBe(player.maxMp);
    expect(restored.baseMaxHp).toBe(player.baseMaxHp);
    expect(restored.baseMaxMp).toBe(player.baseMaxMp);
    expect(effectiveStats(restored).traits.map((trait) => trait.id)).toEqual([
      'circular-strike',
      'mana-surge',
      'lifesteal',
    ]);
  });
});

type ActiveTraitLike = {
  readonly stackingKey: string;
  readonly id: string;
  readonly parameters: unknown;
};

describe('área como dato y ataque circular (REQ-019 R-010/R-011/T-006)', () => {
  it('el radio y el centro son parámetros; el orden de casillas es fijo', () => {
    const circular: TraitAreaParameters = {
      kind: 'area',
      radius: 1,
      includesCenter: false,
      actionCost: 1,
    };
    const offsets = areaOffsets(circular);
    expect(offsets).toHaveLength(8);
    expect(offsets).not.toContainEqual({ dx: 0, dy: 0 });
    expect(offsets).toEqual([
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 1 },
    ]);
    expect(areaOffsets({ ...circular, includesCenter: true })).toHaveLength(9);
    expect(areaOffsets({ ...circular, radius: 2 })).toHaveLength(24);
  });

  it('golpea las 8 adyacentes, excluye centro y aliados y resuelve una tirada por objetivo', () => {
    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      stats: { habilidad: 20 },
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('mace', 'circular-mace'),
      },
    });
    const ally = makeUnit({
      id: 'player-2',
      faction: 'player',
      x: 4,
      y: 5,
      equipment: BARE,
    });
    const enemies = [
      makeUnit({
        id: 'enemy-right',
        faction: 'enemy',
        x: 6,
        y: 5,
        hp: 100,
        maxHp: 100,
        equipment: BARE,
      }),
      makeUnit({
        id: 'enemy-diag',
        faction: 'enemy',
        x: 4,
        y: 4,
        hp: 100,
        maxHp: 100,
        equipment: BARE,
      }),
      makeUnit({
        id: 'enemy-down',
        faction: 'enemy',
        x: 6,
        y: 6,
        hp: 100,
        maxHp: 100,
        equipment: BARE,
      }),
    ];
    const state = makeState({
      players: [player, ally],
      enemies,
    });

    const result = resolveAttack(state, 'player-1', 'enemy-right');
    if (!result.ok) throw new Error(result.reason);

    expect(result.targets.map((target) => target.targetId)).toEqual([
      'enemy-diag',
      'enemy-right',
      'enemy-down',
    ]);
    for (const target of result.targets) {
      expect(target.hit).toBe(true);
      const original = state.enemies.find((enemy) => enemy.id === target.targetId);
      if (!original) throw new Error('objetivo ausente');
      const expected = expectedSinglePacketDamage(
        player,
        original,
        target.rolls.damage ?? 0,
        target.rolls.armor ?? 0,
      );
      expect(target.damage).toBe(expected);
      const next = result.state.enemies.find((enemy) => enemy.id === target.targetId);
      expect(next?.hp).toBe(100 - expected);
    }
    expect(result.state.players[0].actions.remaining).toBe(1);
    expect(result.state.players[1].hp).toBe(ally.hp);
    expect(result.events.map((event) => event.type)).toEqual([
      'AttackPerformed',
      'TraitImpact',
      'AttackPerformed',
      'TraitImpact',
      'AttackPerformed',
      'TraitImpact',
    ]);
    const consumed = result.targets.flatMap((target) => [
      target.rolls.attack,
      target.rolls.shield,
      target.rolls.damage ?? 0,
      target.rolls.armor ?? 0,
    ]);
    expect(result.state.rng).not.toEqual(state.rng);
    expect(consumed).toHaveLength(12);
  });

  it('cambiar el parámetro del catálogo cambia radio y coste sin tocar el motor', () => {
    const parameters = TRAITS['circular-strike'].parameters as unknown as {
      radius: number;
      actionCost: number;
      includesCenter: boolean;
      kind: 'area';
    };
    const original = { ...parameters };
    parameters.radius = 2;
    parameters.actionCost = 2;
    try {
      const player = makeUnit({
        id: 'player-1',
        faction: 'player',
        x: 5,
        y: 5,
        equipmentSlots: {
          ...emptyEquipment(),
          weapon: itemInstance('mace', 'circular-mace'),
        },
      });
      const state = makeState({
        players: [player],
        enemies: [
          makeUnit({
            id: 'enemy-near',
            faction: 'enemy',
            x: 6,
            y: 5,
            hp: 100,
            maxHp: 100,
            equipment: BARE,
          }),
          makeUnit({
            id: 'enemy-far',
            faction: 'enemy',
            x: 7,
            y: 5,
            hp: 100,
            maxHp: 100,
            equipment: BARE,
          }),
        ],
        rng: rngForDice([6, 1, 2, 1, 6, 1, 2, 1]),
      });

      const result = resolveAttack(state, 'player-1', 'enemy-near');
      if (!result.ok) throw new Error(result.reason);

      expect(result.targets.map((target) => target.targetId)).toEqual([
        'enemy-near',
        'enemy-far',
      ]);
      expect(result.state.players[0].actions.remaining).toBe(0);
    } finally {
      parameters.radius = original.radius;
      parameters.actionCost = original.actionCost;
    }
  });
});

describe('robo de vida (REQ-019 R-012/T-007)', () => {
  function lifestealState(hp: number, maxHp = 20) {
    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      hp,
      maxHp,
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('sword', 'sword'),
        ring: itemInstance('ring', 'lifesteal-ring'),
      },
    });
    return makeState({
      players: [player],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          hp: 100,
          maxHp: 100,
          equipment: BARE,
        }),
      ],
    });
  }

  it('cura el 50 % a la baja, con mínimo 1 si el golpe entra', () => {
    expect(lifestealHealing({ percent: 50, minimum: 1 }, 3)).toBe(1);
    expect(lifestealHealing({ percent: 50, minimum: 1 }, 1)).toBe(1);
    expect(lifestealHealing({ percent: 50, minimum: 1 }, 5)).toBe(2);
    expect(lifestealHealing({ percent: 25, minimum: 0 }, 3)).toBe(0);
  });

  it('una tirada de daño 5 cura 2 y una de 1 cura 1', () => {
    const five = resolveAttack(
      { ...lifestealState(5), rng: rngForDice([6, 1, 2, 1]) },
      'player-1',
      'enemy-1',
    );
    if (!five.ok) throw new Error(five.reason);
    expect(five.state.players[0].hp).toBe(7);
    expect(five.events).toContainEqual(
      expect.objectContaining({ type: 'TraitDamage', healing: 2, unitHp: 7 }),
    );

    const one = resolveAttack(
      { ...lifestealState(5), rng: rngForDice([6, 1, 1, 6]) },
      'player-1',
      'enemy-1',
    );
    if (!one.ok) throw new Error(one.reason);
    expect(one.state.players[0].hp).toBe(6);
    expect(one.events).toContainEqual(
      expect.objectContaining({ type: 'TraitDamage', healing: 1, unitHp: 6 }),
    );
  });

  it('no sobrecura y no cura sin el trait', () => {
    const nearFull = resolveAttack(
      { ...lifestealState(19), rng: rngForDice([6, 1, 2, 1]) },
      'player-1',
      'enemy-1',
    );
    if (!nearFull.ok) throw new Error(nearFull.reason);
    expect(nearFull.state.players[0].hp).toBe(20);
    expect(nearFull.events).toContainEqual(
      expect.objectContaining({ type: 'TraitDamage', healing: 1, unitHp: 20 }),
    );

    const plain = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      hp: 5,
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('sword', 'sword'),
      },
    });
    const state = makeState({
      players: [plain],
      enemies: [
        makeUnit({
          id: 'enemy-1',
          faction: 'enemy',
          x: 6,
          y: 5,
          hp: 100,
          maxHp: 100,
          equipment: BARE,
        }),
      ],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const result = resolveAttack(state, 'player-1', 'enemy-1');
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.players[0].hp).toBe(5);
    expect(result.events.some((event) => event.type === 'TraitDamage')).toBe(false);
  });

  it('en área cura una vez por objetivo golpeado (sinergia área + robo)', () => {
    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      hp: 1,
      maxHp: 100,
      stats: { habilidad: 20 },
      equipmentSlots: {
        ...emptyEquipment(),
        weapon: itemInstance('mace', 'circular-mace'),
        ring: itemInstance('ring', 'lifesteal-ring'),
      },
    });
    const enemies = [
      makeUnit({ id: 'enemy-a', faction: 'enemy', x: 6, y: 5, hp: 100, maxHp: 100, equipment: BARE }),
      makeUnit({ id: 'enemy-b', faction: 'enemy', x: 4, y: 4, hp: 100, maxHp: 100, equipment: BARE }),
      makeUnit({ id: 'enemy-c', faction: 'enemy', x: 6, y: 6, hp: 100, maxHp: 100, equipment: BARE }),
    ];
    const state = makeState({
      players: [player],
      enemies,
    });

    const result = resolveAttack(state, 'player-1', 'enemy-a');
    if (!result.ok) throw new Error(result.reason);

    const heals = result.events.filter(
      (event) => event.type === 'TraitDamage',
    ) as Extract<(typeof result.events)[number], { type: 'TraitDamage' }>[];
    expect(heals).toHaveLength(3);
    const expectedHeals = result.targets.map((target) =>
      lifestealHealing({ percent: 50, minimum: 1 }, target.damage),
    );
    expect(heals.map((event) => event.healing)).toEqual(expectedHeals);
    expect(result.state.players[0].hp).toBe(
      1 + expectedHeals.reduce((total, heal) => total + heal, 0),
    );
  });
});

describe('pipeline de disparadores (REQ-019 T-004)', () => {
  it('emite equipar y desequipar solo para traits declarados', () => {
    const withRing = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          inventory: inventoryFromIds('player-1', ['lifesteal-ring']),
        }),
      ],
      enemies: [],
    });
    const equipped = reduce(withRing, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    expect(equipped.events).toEqual([
      {
        type: 'TraitEquipped',
        unitId: 'player-1',
        traitId: 'lifesteal',
        source: 'equipment',
        slot: 'ring',
        itemId: 'lifesteal-ring',
      },
    ]);

    const unequipped = reduce(equipped.state, {
      type: 'UnequipItem',
      unitId: 'player-1',
      slot: 'ring',
    });
    expect(unequipped.events).toEqual([
      {
        type: 'TraitUnequipped',
        unitId: 'player-1',
        traitId: 'lifesteal',
        source: 'equipment',
        slot: 'ring',
        itemId: 'lifesteal-ring',
      },
    ]);

    const plain = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          inventory: inventoryFromIds('player-1', ['dagger']),
        }),
      ],
      enemies: [],
    });
    const plainEquip = reduce(plain, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    expect(plainEquip.events).toEqual([]);
  });

  it('la misma semilla y comandos repiten estado y eventos', () => {
    function run() {
      const state = makeState({
        players: [
          makeUnit({
            id: 'player-1',
            faction: 'player',
            x: 5,
            y: 5,
            hp: 5,
            equipmentSlots: {
              ...emptyEquipment(),
              weapon: itemInstance('mace', 'circular-mace'),
              ring: itemInstance('ring', 'lifesteal-ring'),
            },
          }),
        ],
        enemies: [
          makeUnit({ id: 'enemy-a', faction: 'enemy', x: 6, y: 5, hp: 100, maxHp: 100, equipment: BARE }),
          makeUnit({ id: 'enemy-b', faction: 'enemy', x: 4, y: 4, hp: 100, maxHp: 100, equipment: BARE }),
        ],
        rng: rngForDice([6, 1, 2, 1, 6, 1, 2, 1]),
      });
      return reduce(state, { type: 'Attack', unitId: 'player-1', targetId: 'enemy-a' });
    }
    const first = run();
    const second = run();
    expect(JSON.stringify(first.events)).toBe(JSON.stringify(second.events));
    expect(JSON.stringify(first.state)).toBe(JSON.stringify(second.state));
  });

  it('el equipo cambia recursos y desequipar vuelve a la base', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          inventory: inventoryFromIds('player-1', [
            'mana-necklace',
            'action-gloves',
          ]),
        }),
      ],
      enemies: [],
    });
    const withNecklace = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    const withBoth = reduce(withNecklace.state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 1,
    });
    const player = withBoth.state.players[0];
    expect(player.maxMp).toBe(state.players[0].maxMp + 2);
    expect(player.actions.max).toBe(3);
    expect(effectiveStats(player).stats.acciones).toBe(3);

    const withoutNecklace = reduce(withBoth.state, {
      type: 'UnequipItem',
      unitId: 'player-1',
      slot: 'neck',
    });
    expect(withoutNecklace.state.players[0].maxMp).toBe(state.players[0].maxMp);
    const withoutGloves = reduce(withoutNecklace.state, {
      type: 'UnequipItem',
      unitId: 'player-1',
      slot: 'hands',
    });
    expect(effectiveStats(withoutGloves.state.players[0]).stats.acciones).toBe(2);
    expect(withoutGloves.state.players[0].actions.max).toBe(2);
  });
});

describe('no regresión y compatibilidad', () => {
  it('el ataque normal sin traits conserva eventos y tiradas', () => {
    const state = makeState({
      players: [makeUnit({ id: 'player-1', faction: 'player', x: 5, y: 5 })],
      enemies: [
        makeUnit({ id: 'enemy-1', faction: 'enemy', x: 6, y: 5, equipment: BARE }),
      ],
      rng: rngForDice([6, 1, 2, 1]),
    });
    const result = resolveAttack(state, 'player-1', 'enemy-1');
    if (!result.ok) throw new Error(result.reason);
    expect(result.targets).toHaveLength(1);
    expect(result.events.map((event) => event.type)).toEqual(['AttackPerformed']);
  });

  it('la maza a dos manos desplaza el escudo y el escudo no convive con ella', () => {
    const state = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          equipmentSlots: {
            ...emptyEquipment(),
            shield: itemInstance('shield', 'shield'),
          },
          inventory: inventoryFromIds('player-1', ['circular-mace']),
        }),
      ],
      enemies: [],
    });

    const equipped = reduce(state, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    expect(equipped.state.players[0].equipment.weapon?.itemId).toBe('circular-mace');
    expect(equipped.state.players[0].equipment.shield).toBeNull();
    expect(
      equipped.state.players[0].inventory.items.filter(
        (item) => item?.itemId === 'shield',
      ),
    ).toHaveLength(1);

    const withMace = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          equipmentSlots: {
            ...emptyEquipment(),
            weapon: itemInstance('mace', 'circular-mace'),
          },
          inventory: inventoryFromIds('player-1', ['shield']),
        }),
      ],
      enemies: [],
    });
    const rejected = reduce(withMace, {
      type: 'EquipItem',
      unitId: 'player-1',
      from: 'backpack',
      index: 0,
    });
    expect(rejected.state).toBe(withMace);
    expect(rejected.events).toEqual([
      { type: 'CommandRejected', commandType: 'EquipItem', reason: 'two-handed' },
    ]);
  });

  it('los traits no aparecen en arquetipos ni enemigos (R-014/R-015)', () => {
    const equippedTraitIds = Object.values(ROSTER).flatMap((entry) =>
      Object.values(
        equipmentFromLegacy('roster', entry.equipment),
      ).flatMap((instance) =>
        instance === null ? [] : ITEMS[instance.itemId].traits.map((t) => t.id),
      ),
    );
    const enemyTraitIds = Object.values(BESTIARY).flatMap((entry) =>
      Object.values(
        equipmentFromLegacy('enemy', entry.equipment),
      ).flatMap((instance) =>
        instance === null ? [] : ITEMS[instance.itemId].traits.map((t) => t.id),
      ),
    );
    expect(equippedTraitIds).toEqual([]);
    expect(enemyTraitIds).toEqual([]);
  });

  it('modificadores y traits se calculan en el mismo punto', () => {
    const unit = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      equipmentSlots: {
        ...emptyEquipment(),
        neck: itemInstance('neck', 'mana-necklace'),
      },
    });
    const profile = effectiveStats(unit);
    expect(profile.modifiers.mpMax).toBe(modifierTotals([ITEMS['mana-necklace']]).mpMax);
    expect(profile.maxMp).toBe(unit.maxMp + 2);
  });

  it('no hay traits en la mochila ni en objetos sin equipar', () => {
    const unit = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      inventory: inventoryFromIds('player-1', ['lifesteal-ring']),
    });
    expect(effectiveStats(unit).traits).toEqual([]);
    expect(activeTraits([ITEMS.sword])).toEqual([]);
  });

  it('el catálogo no depende de src/host y no introduce dependencias', () => {
    // La comprobación estructural la hace el build; aquí se fija que el trait
    // se resuelve con datos del catálogo y no con ramas por ID de objeto.
    const mace = ITEMS['circular-mace'];
    expect(mace.traits.map((trait) => trait.id)).toEqual(['circular-strike']);
    expect((TRAITS['circular-strike'].parameters as TraitAreaParameters).radius).toBe(
      1,
    );
  });
});

describe('insumos de prueba', () => {
  it('los objetos sintéticos no colisionan con el catálogo', () => {
    const item = syntheticItem('neck', ['mana-surge']);
    expect(item.id.startsWith('synthetic-')).toBe(true);
    const id: ItemId = 'mana-necklace';
    expect(ITEMS[id].name.length).toBeGreaterThan(0);
  });
});

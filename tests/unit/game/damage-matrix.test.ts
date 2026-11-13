import { describe, expect, it } from 'vitest';
import {
  BAND_MULTIPLIERS,
  BESTIARY,
  ROSTER,
  SPELLS,
  WEAPONS,
  armorValue,
  castSpell,
  createPlayerFromArchetype,
  createRng,
  isPhysical,
  reduce,
  resolveAttack,
  resolveHit,
  resolvePackets,
  validateDamagePackets,
  type ArmorId,
  type Command,
  type DamagePacket,
  type DamageType,
  type GameState,
  type DamagePacketBreakdown,
  type ResistanceBand,
  type ResistanceProfile,
  type SpellCastResult,
  type Unit,
  type WeaponDefinition,
  type WeaponId,
} from '../../../src/game/index';
import { advanceRng, makeState, makeUnit, rngForDice } from './helpers';

const DAMAGE_TYPES: readonly DamageType[] = [
  'slash',
  'blunt',
  'pierce',
  'magic',
  'electric',
];
const BANDS = Object.keys(BAND_MULTIPLIERS) as ResistanceBand[];
const PHYSICAL_TYPES = DAMAGE_TYPES.filter((type) => isPhysical(type));
const ELEMENTAL_TYPES = DAMAGE_TYPES.filter((type) => !isPhysical(type));

/** Dados fijos reutilizados: el bruto 13 hace estrictas las cuatro bandas. */
const BAND_DICE = rngForDice([6, 1]);
/** Dados con bruto positivo suficiente para aislar fuerza y armadura. */
const PACKET_DICE = rngForDice([4, 2]);
/** Dados de un arma mixta: impacto, y daño/resistencia altos en ambos paquetes. */
const MIXED_DICE = rngForDice([6, 1, 6, 1, 6, 1]);

function packet(type: DamageType, amount = 8): DamagePacket {
  return { type, amount };
}

function mixedWeapon(): WeaponDefinition {
  const weapon = Object.values(WEAPONS).find(
    (entry) =>
      entry.damagePackets.length === 2 &&
      entry.damagePackets.some((entryPacket) => isPhysical(entryPacket.type)) &&
      entry.damagePackets.some((entryPacket) => !isPhysical(entryPacket.type)),
  );
  if (!weapon) throw new Error('el catálogo no declara ningún arma mixta');
  return weapon;
}

interface AttackOptions {
  readonly weaponId: WeaponId;
  readonly armor?: ArmorId | null;
  readonly strength?: number;
  readonly targetDefense?: number;
  readonly targetProfile?: ResistanceProfile;
  readonly rng?: GameState['rng'];
}

function stateForWeapon(options: AttackOptions): GameState {
  const attacker = makeUnit({
    id: 'player-1',
    faction: 'player',
    x: 5,
    y: 5,
    equipment: { weaponId: options.weaponId, armorId: null, shieldId: null },
    weapons: [options.weaponId],
    stats: { fuerza: options.strength ?? 0 },
  });
  const target = makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    x: 6,
    y: 5,
    hp: 100,
    maxHp: 100,
    awareness: 'alert',
    stats: {
      defensa: options.targetDefense ?? 0,
      resistencia: options.targetProfile ?? {},
    },
    equipment: { weaponId: 'sword', armorId: options.armor ?? null, shieldId: null },
  });

  return makeState({
    players: [attacker],
    enemies: [target],
    rng: options.rng ?? createRng(9090),
  });
}

function attackBreakdown(
  options: AttackOptions,
): readonly DamagePacketBreakdown[] {
  const state = stateForWeapon(options);
  const result = resolveAttack(state, 'player-1', 'enemy-1');
  if (!result.ok) throw new Error(result.reason);
  const event = result.events[0];
  if (event.type !== 'AttackPerformed') throw new Error('se esperaba AttackPerformed');
  expect(event.hit).toBe(true);
  return event.damageBreakdown;
}

function spellVictim(profile: ResistanceProfile = {}): Unit {
  return makeUnit({
    id: 'enemy-1',
    faction: 'enemy',
    x: 8,
    y: 5,
    hp: 100,
    maxHp: 100,
    stats: { defensa: -100, resistencia: profile },
    equipment: { weaponId: 'sword', armorId: null, shieldId: null },
  });
}

function spellState(level: number, profile: ResistanceProfile = {}): GameState {
  const caster = makeUnit({
    id: 'player-1',
    faction: 'player',
    x: 5,
    y: 5,
    magicLevel: level as Unit['stats']['magicLevel'],
    mana: { current: 16, max: 16 },
    actionsMax: 3,
    actions: 3,
    equipment: { weaponId: null, armorId: null, shieldId: null },
  });

  return makeState({
    players: [caster],
    enemies: [spellVictim(profile)],
    rng: rngForDice([6, 1, 3, 2]),
  });
}

function damageSpellEvent(result: SpellCastResult) {
  if (!result.ok) throw new Error(result.reason);
  const event = result.events[0];
  if (event.type !== 'SpellCast' || event.effect !== 'damage') {
    throw new Error('se esperaba SpellCast de daño');
  }
  return event;
}

describe('matriz de bandas sobre los cinco tipos', () => {
  it('aplica cada banda del catálogo y ordena el daño de vulnerable a muy resistente', () => {
    for (const type of DAMAGE_TYPES) {
      const damageByBand = new Map<ResistanceBand, number>();

      for (const band of BANDS) {
        const profile: ResistanceProfile = { [type]: band };
        const result = resolvePackets(
          [packet(type)],
          0,
          0,
          profile,
          BAND_DICE,
        );
        const entry = result.breakdown[0];

        expect(entry.type, type).toBe(type);
        expect(entry.band, `${type}/${band}`).toBe(band);
        expect(entry.multiplier, `${type}/${band}`).toBe(BAND_MULTIPLIERS[band]);
        expect(result.total, `${type}/${band}`).toBe(Math.max(1, entry.damage));
        damageByBand.set(band, entry.damage);
      }

      expect(damageByBand.get('vulnerable')!, type).toBeGreaterThan(
        damageByBand.get('normal')!,
      );
      expect(damageByBand.get('normal')!, type).toBeGreaterThan(
        damageByBand.get('resistant')!,
      );
      expect(damageByBand.get('resistant')!, type).toBeGreaterThan(
        damageByBand.get('very-resistant')!,
      );
    }
  });

  it('una banda ausente equivale a normal y el desglose conserva el orden declarado', () => {
    const absent = resolvePackets([packet('blunt')], 0, 0, {}, BAND_DICE);
    expect(absent.breakdown[0].band).toBe('normal');
    expect(absent.breakdown[0].multiplier).toBe(BAND_MULTIPLIERS.normal);

    const ordered = resolvePackets(
      [packet('electric', 1), packet('slash', 3)],
      0,
      0,
      { electric: 'vulnerable' },
      rngForDice([2, 1, 4, 2]),
    );
    expect(ordered.breakdown.map((entry) => entry.type)).toEqual([
      'electric',
      'slash',
    ]);
  });
});

describe('físico frente a elemental', () => {
  it('la fuerza solo suma al físico y la armadura solo lo reduce', () => {
    for (const type of PHYSICAL_TYPES) {
      const base = resolvePackets([packet(type, 5)], 0, 0, {}, PACKET_DICE)
        .breakdown[0];
      const strong = resolvePackets([packet(type, 5)], 4, 0, {}, PACKET_DICE)
        .breakdown[0];
      const armored = resolvePackets([packet(type, 5)], 0, 4, {}, PACKET_DICE)
        .breakdown[0];

      expect(strong.raw, type).toBeGreaterThan(base.raw);
      expect(strong.damage, type).toBeGreaterThan(base.damage);
      expect(armored.raw, type).toBeLessThan(base.raw);
      expect(armored.damage, type).toBeLessThan(base.damage);
    }
  });

  it('mágico y eléctrico ignoran fuerza y armadura', () => {
    for (const type of ELEMENTAL_TYPES) {
      const base = resolvePackets([packet(type, 5)], 0, 0, {}, PACKET_DICE)
        .breakdown[0];
      const buffed = resolvePackets([packet(type, 5)], 40, 40, {}, PACKET_DICE)
        .breakdown[0];

      expect(buffed.raw, type).toBe(base.raw);
      expect(buffed.damage, type).toBe(base.damage);
      expect(buffed.band, type).toBe(base.band);
    }
  });
});

describe('ataque con paquete físico y elemental', () => {
  it('resuelve los paquetes del catálogo en orden y consume dos tiradas por paquete', () => {
    const weapons = Object.values(WEAPONS);

    for (const weapon of weapons) {
      const state = stateForWeapon({
        weaponId: weapon.id,
        targetDefense: -100,
        rng: createRng(9090),
      });
      const result = resolveAttack(state, 'player-1', 'enemy-1');
      if (!result.ok) throw new Error(result.reason);
      const event = result.events[0];
      if (event.type !== 'AttackPerformed') {
        throw new Error('se esperaba AttackPerformed');
      }

      expect(event.hit, weapon.id).toBe(true);
      expect(event.damageBreakdown.map((entry) => entry.type), weapon.id).toEqual(
        weapon.damagePackets.map((entry) => entry.type),
      );
      expect(event.damageBreakdown, weapon.id).toHaveLength(
        weapon.damagePackets.length,
      );
      for (const [index, entry] of event.damageBreakdown.entries()) {
        expect(entry.amount, `${weapon.id}/${index}`).toBe(
          weapon.damagePackets[index].amount,
        );
      }
      expect(event.damage, weapon.id).toBe(
        Math.max(
          1,
          event.damageBreakdown.reduce((total, entry) => total + entry.damage, 0),
        ),
      );
      expect(result.rolls.damage, weapon.id).toBe(
        event.damageBreakdown[0].damageRoll,
      );
      expect(result.rolls.armor, weapon.id).toBe(
        event.damageBreakdown[0].resistanceRoll,
      );
      // Impacto + dos tiradas por paquete: el techo de REQ-029 T-012.
      expect(
        result.state.rng.state - state.rng.state,
        weapon.id,
      ).toBe(2 + 2 * weapon.damagePackets.length);
    }

    expect(weapons.some((weapon) => weapon.damagePackets.length === 2)).toBe(true);
  });

  it('con el arma mixta la armadura reduce solo el paquete físico', () => {
    const weapon = mixedWeapon();
    const physicalIndex = weapon.damagePackets.findIndex((entry) =>
      isPhysical(entry.type),
    );
    const elementalIndex = weapon.damagePackets.findIndex(
      (entry) => !isPhysical(entry.type),
    );
    const options = {
      weaponId: weapon.id,
      targetDefense: -100,
      rng: MIXED_DICE,
    } as const;

    function breakdown(overrides: Partial<AttackOptions> = {}) {
      const state = stateForWeapon({ ...options, ...overrides });
      const result = resolveAttack(state, 'player-1', 'enemy-1');
      if (!result.ok) throw new Error(result.reason);
      const event = result.events[0];
      if (event.type !== 'AttackPerformed') {
        throw new Error('se esperaba AttackPerformed');
      }
      return event.damageBreakdown;
    }

    const unarmored = breakdown();
    const armored = breakdown({ armor: 'plate' });
    expect(armored[physicalIndex].damage).toBeLessThan(
      unarmored[physicalIndex].damage,
    );
    expect(armored[elementalIndex].damage).toBe(
      unarmored[elementalIndex].damage,
    );

    const weak = breakdown({ strength: 0 });
    const strong = breakdown({ strength: 6 });
    expect(strong[physicalIndex].damage).toBeGreaterThan(
      weak[physicalIndex].damage,
    );
    expect(strong[elementalIndex].damage).toBe(weak[elementalIndex].damage);
  });

  it('recorta cada paquete a 0 y aplica el mínimo 1 global aunque todos queden a 0', () => {
    const result = resolvePackets(
      [packet('slash', 1), packet('magic', 1)],
      0,
      50,
      { slash: 'vulnerable', magic: 'very-resistant' },
      rngForDice([1, 6, 1, 6]),
    );

    expect(result.breakdown).toHaveLength(2);
    for (const [index, entry] of result.breakdown.entries()) {
      expect(entry.raw, `paquete ${index}`).toBeLessThan(0);
      expect(entry.damage, `paquete ${index}`).toBe(0);
      expect(entry.multiplier, `paquete ${index}`).toBe(
        BAND_MULTIPLIERS[entry.band],
      );
    }
    expect(result.breakdown[0].band).toBe('vulnerable');
    expect(result.breakdown[1].band).toBe('very-resistant');
    expect(result.total).toBe(1);
  });

  it('el catálogo no pasa de dos paquetes y la validación rechaza duplicados de grupo', () => {
    for (const weapon of Object.values(WEAPONS)) {
      expect(weapon.damagePackets.length, weapon.id).toBeLessThanOrEqual(2);
      expect(validateDamagePackets(weapon.damagePackets), weapon.id).toBe(true);
    }

    expect(validateDamagePackets([])).toBe(true);
    expect(
      validateDamagePackets([packet('slash', 1), packet('pierce', 1)]),
    ).toBe(false);
    expect(
      validateDamagePackets([packet('magic', 1), packet('electric', 1)]),
    ).toBe(false);
    expect(
      validateDamagePackets([
        packet('slash', 1),
        packet('magic', 1),
        packet('electric', 1),
      ]),
    ).toBe(false);
  });
});

describe('hechizos tipados', () => {
  it('eléctrico usa paquete eléctrico y fuego usa paquete mágico', () => {
    for (const spell of Object.values(SPELLS)) {
      if (spell.effect.kind !== 'damage') continue;
      const expected = spell.family === 'electric' ? 'electric' : 'magic';
      expect(spell.damagePacket?.type, spell.id).toBe(expected);
    }
  });

  it('cada hechizo de daño aplica la banda del tipo de su paquete', () => {
    for (const spell of Object.values(SPELLS)) {
      if (spell.effect.kind !== 'damage') continue;
      const packetData = spell.damagePacket;
      if (!packetData) throw new Error(`${spell.id} sin paquete`);

      const normal = damageSpellEvent(
        castSpell(spellState(4), 'player-1', spell.id, { x: 8, y: 5 }),
      );
      const resistantProfile: ResistanceProfile = {
        [packetData.type]: 'resistant',
      };
      const resistant = damageSpellEvent(
        castSpell(spellState(4, resistantProfile), 'player-1', spell.id, {
          x: 8,
          y: 5,
        }),
      );

      expect(normal.damageBreakdown, spell.id).toHaveLength(1);
      expect(normal.damageBreakdown[0].type, spell.id).toBe(packetData.type);
      expect(normal.damageBreakdown[0].band, spell.id).toBe('normal');
      expect(resistant.damageBreakdown[0].band, spell.id).toBe('resistant');
      expect(resistant.damage, spell.id).toBeLessThan(normal.damage);
      expect(normal.damage, spell.id).toBe(
        Math.max(1, normal.damageBreakdown[0].damage),
      );
    }
  });

  it('eléctrico y fuego leen su propia banda del mismo perfil', () => {
    const profile: ResistanceProfile = {
      electric: 'very-resistant',
      magic: 'vulnerable',
    };

    const electric = damageSpellEvent(
      castSpell(spellState(4, profile), 'player-1', 'electric-1', {
        x: 8,
        y: 5,
      }),
    );
    const fire = damageSpellEvent(
      castSpell(spellState(4, profile), 'player-1', 'fire-2', {
        x: 8,
        y: 5,
      }),
    );

    expect(electric.damageBreakdown[0]).toMatchObject({
      type: 'electric',
      band: 'very-resistant',
      multiplier: BAND_MULTIPLIERS['very-resistant'],
    });
    expect(fire.damageBreakdown[0]).toMatchObject({
      type: 'magic',
      band: 'vulnerable',
      multiplier: BAND_MULTIPLIERS.vulnerable,
    });
  });

  it('el nivel de magia no cambia el tipo ni el daño del paquete', () => {
    for (const spell of Object.values(SPELLS)) {
      if (spell.effect.kind !== 'damage') continue;

      const low = damageSpellEvent(
        castSpell(
          spellState(spell.minLevel),
          'player-1',
          spell.id,
          { x: 8, y: 5 },
        ),
      );
      const high = damageSpellEvent(
        castSpell(spellState(4), 'player-1', spell.id, { x: 8, y: 5 }),
      );

      expect(low.hit, spell.id).toBe(true);
      expect(high.hit, spell.id).toBe(true);
      expect(low.damage, spell.id).toBe(high.damage);
      expect(low.damageBreakdown, spell.id).toEqual(high.damageBreakdown);
      expect(low.damageBreakdown[0].type, spell.id).toBe(
        high.damageBreakdown[0].type,
      );
    }
  });

  it('la curación no declara paquete y no consume RNG', () => {
    const heal = SPELLS['healing-3'];
    const caster = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      magicLevel: heal.minLevel,
      mana: { current: 12, max: 12 },
      actionsMax: 2,
      actions: 2,
      equipment: { weaponId: null, armorId: null, shieldId: null },
    });
    const ally = makeUnit({
      id: 'player-2',
      faction: 'player',
      x: 7,
      y: 5,
      hp: 10,
      maxHp: 20,
    });
    const state = makeState({
      players: [caster, ally],
      enemies: [spellVictim()],
    });

    const result = castSpell(state, 'player-1', heal.id, { x: 7, y: 5 });
    if (!result.ok) throw new Error(result.reason);
    const event = result.events[0];

    expect(heal.damagePacket).toBeNull();
    expect(event.type).toBe('SpellCast');
    expect(event).toMatchObject({ effect: 'heal', targetId: 'player-2' });
    expect('damageBreakdown' in event).toBe(false);
    expect(result.state.rng).toEqual(state.rng);
    expect(result.state.players[1].hp).toBeGreaterThan(10);
  });
});

describe('determinismo y réplica con el resolvedor compartido', () => {
  it('la misma semilla y los mismos comandos repiten estado, eventos y desglose', () => {
    const weapon = mixedWeapon();
    const commands: readonly Command[] = [
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
      { type: 'EndTurn' },
      { type: 'Attack', unitId: 'player-1', targetId: 'enemy-1' },
    ];

    function run() {
      let state = stateForWeapon({
        weaponId: weapon.id,
        targetDefense: 0,
        rng: createRng(2024),
      });
      const events = [];
      for (const command of commands) {
        const result = reduce(state, command);
        state = result.state;
        events.push(...result.events);
      }
      return { state, events };
    }

    const first = run();
    const second = run();

    expect(first.events).toEqual(second.events);
    expect(JSON.stringify(first.state)).toBe(JSON.stringify(second.state));
    expect(first.state.rng).toEqual(second.state.rng);

    const attacks = first.events.filter((event) => 'damageBreakdown' in event);
    expect(attacks.length).toBeGreaterThan(0);
    for (const attack of attacks) {
      expect(Array.isArray(attack.damageBreakdown)).toBe(true);
    }

    const breakdowns = (events: typeof first.events) =>
      events.flatMap((event) =>
        'damageBreakdown' in event ? [event.damageBreakdown] : [],
      );
    expect(breakdowns(first.events).length).toBeGreaterThan(0);
    expect(breakdowns(first.events)).toEqual(breakdowns(second.events));
  });

  it('la réplica usa el mismo resolvedor y no pasa de dos paquetes', () => {
    const weapon = mixedWeapon();
    const player = makeUnit({
      id: 'player-1',
      faction: 'player',
      x: 5,
      y: 5,
      stats: { habilidad: 0, defensa: -50 },
      equipment: { weaponId: 'sword', armorId: null, shieldId: null },
      weapons: ['sword'],
    });
    const enemy = makeUnit({
      id: 'enemy-1',
      faction: 'enemy',
      x: 6,
      y: 5,
      hp: 100,
      maxHp: 100,
      awareness: 'alert',
      stats: { habilidad: 20, defensa: 20 },
      equipment: { weaponId: weapon.id, armorId: null, shieldId: null },
      weapons: [weapon.id],
    });
    const state = makeState({
      players: [player],
      enemies: [enemy],
      rng: createRng(777),
    });

    const result = resolveAttack(state, 'player-1', 'enemy-1');
    if (!result.ok) throw new Error(result.reason);

    expect(result.hit).toBe(false);
    const replica = result.events.find(
      (event) => event.type === 'ReplicaPerformed',
    );
    if (!replica || replica.type !== 'ReplicaPerformed') {
      throw new Error('se esperaba ReplicaPerformed');
    }
    expect(replica.hit).toBe(true);
    expect(replica.damageBreakdown.map((entry) => entry.type)).toEqual(
      weapon.damagePackets.map((entry) => entry.type),
    );
    expect(replica.damageBreakdown).toHaveLength(weapon.damagePackets.length);
    expect(replica.damage).toBe(
      Math.max(
        1,
        replica.damageBreakdown.reduce(
          (total, entry) => total + entry.damage,
          0,
        ),
      ),
    );
    expect(result.state.rng.state - state.rng.state).toBe(
      2 + 2 + 2 * weapon.damagePackets.length,
    );
  });
});

describe('no regresión de REQ-010, REQ-014 y REQ-025', () => {
  it('REQ-010: el empate falla, el escudo defiende y la armadura absorbe', () => {
    expect(resolveHit(0, 0, 3, 3)).toBe(false);
    expect(resolveHit(0, 0, 3, 2)).toBe(true);
    expect(resolveHit(0, 1, 3, 2)).toBe(false);

    expect(armorValue(null)).toBe(0);
    expect(armorValue('plate')).toBeGreaterThan(armorValue('armor'));

    const weapon = WEAPONS.sword;
    const unarmored = attackBreakdown({
      weaponId: weapon.id,
      targetDefense: -100,
      rng: MIXED_DICE,
    });
    const armored = attackBreakdown({
      weaponId: weapon.id,
      targetDefense: -100,
      armor: 'plate',
      rng: MIXED_DICE,
    });

    expect(unarmored[0].damage).toBeGreaterThan(armored[0].damage);
    expect(unarmored[0].type).toBe(armored[0].type);
  });

  it('REQ-014: los nueve atributos siguen en catálogos y unidades', () => {
    const statKeys = [
      'habilidad',
      'fuerza',
      'defensa',
      'resistencia',
      'punteria',
      'magicLevel',
      'acciones',
    ].sort();

    for (const definition of Object.values(BESTIARY)) {
      expect(Object.keys(definition.stats).sort(), definition.id).toEqual(
        statKeys,
      );
    }
    for (const entry of Object.values(ROSTER)) {
      expect(Object.keys(entry.stats).sort(), entry.id).toEqual(statKeys);
    }

    const warrior = createPlayerFromArchetype('warrior', {
      id: 'player-1',
      position: { x: 5, y: 5 },
    });
    expect(warrior.hp).toBe(ROSTER.warrior.maxHp);
    expect(warrior.mp).toBe(ROSTER.warrior.maxMp);
    expect(warrior.actions.max).toBeGreaterThan(0);
  });

  it('REQ-025: nivel, maná y tope de hechizos se validan antes de tirar', () => {
    const spell = SPELLS['fire-2'];
    const target = { x: 8, y: 5 } as const;

    const lowLevel = spellState(spell.minLevel - 1);
    const levelResult = castSpell(lowLevel, 'player-1', spell.id, target);
    expect(levelResult).toEqual({ ok: false, reason: 'insufficient-level' });

    const dry = makeState({
      players: [
        makeUnit({
          id: 'player-1',
          faction: 'player',
          x: 5,
          y: 5,
          magicLevel: 4,
          mana: { current: spell.cost - 1, max: 16 },
          actionsMax: 3,
          actions: 3,
          equipment: { weaponId: null, armorId: null, shieldId: null },
        }),
      ],
      enemies: [spellVictim()],
      rng: createRng(3030),
    });
    const manaResult = castSpell(dry, 'player-1', spell.id, target);
    expect(manaResult).toEqual({ ok: false, reason: 'no-mana' });

    const first = castSpell(spellState(4), 'player-1', spell.id, target);
    if (!first.ok) throw new Error(first.reason);
    const second = castSpell(first.state, 'player-1', spell.id, target);
    if (!second.ok) throw new Error(second.reason);
    const third = castSpell(second.state, 'player-1', spell.id, target);

    expect(second.state.players[0].mana.current).toBe(16 - spell.cost * 2);
    expect(third).toEqual({ ok: false, reason: 'spell-limit' });
  });
});

describe('secuencia RNG del desglose', () => {
  it('el desglose y el estado final del RNG coinciden con la secuencia consumida', () => {
    const state = stateForWeapon({
      weaponId: 'electric-sword',
      targetDefense: -100,
    });
    const weapon = WEAPONS['electric-sword'];
    const result = resolveAttack(state, 'player-1', 'enemy-1');
    if (!result.ok) throw new Error(result.reason);
    const event = result.events[0];
    if (event.type !== 'AttackPerformed') {
      throw new Error('se esperaba AttackPerformed');
    }

    const dice = event.damageBreakdown.flatMap((entry) => [
      entry.damageRoll,
      entry.resistanceRoll,
    ]);
    expect(result.state.rng).toEqual(
      advanceRng(state.rng, [
        result.rolls.attack,
        result.rolls.shield,
        ...dice,
      ]),
    );
    expect(event.damageBreakdown).toHaveLength(weapon.damagePackets.length);
    expect(
      event.damageBreakdown.every(
        (entry) => entry.damage >= 0 && entry.amount > 0,
      ),
    ).toBe(true);
  });
});

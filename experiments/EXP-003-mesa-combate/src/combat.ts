/**
 * Modelo puro de EXP-003: roster, presets, impacto, daño y duelo.
 *
 * No conoce DOM, Canvas, red ni relojes. Las tiradas siempre vienen de un RNG
 * sembrado; la página solo presenta los resultados. La fórmula es la de
 * REQ-010: impacto con `>` (el empate falla) y daño con mínimo 1.
 */

import { mulberry32, seedForVariant } from '../../_shell/rng';

export const EXPERIMENT_ID = 'EXP-003' as const;
export const EXPERIMENT_TITLE = 'Mesa de combate configurable';
export const EXPERIMENT_QUESTION =
  '¿Qué valores de acierto, daño, escudo, armadura, PV y modificadores producen combates de 2-3 impactos, con roles de arma claros y sin que un enemigo aislado sea letal?';

export const DEFAULT_SEED = 1017;
export const DEFAULT_DUELS = 1000;
export const DUEL_LIMITS = { min: 10, max: 5000, step: 10 } as const;

export type Side = 'jugador' | 'enemigo';
export type WeaponId = 'espada' | 'hacha' | 'daga' | 'personalizada';
export type PresetId = 'A' | 'B' | 'C' | 'D';
export type RosterMode = PresetId | 'personalizada';

export type Combatant = {
  id: string;
  name: string;
  side: Side;
  hp: number;
  acc: number;
  dmg: number;
  def: number;
  weapon: WeaponId;
  weaponAcc: number;
  weaponDmg: number;
  shield: number;
  armor: number;
};

export type CombatantPatch = Partial<Omit<Combatant, 'id'>>;

export const WEAPONS: Record<
  WeaponId,
  { label: string; acc: number; dmg: number }
> = {
  espada: { label: 'Espada', acc: 3, dmg: 4 },
  hacha: { label: 'Hacha', acc: 2, dmg: 6 },
  daga: { label: 'Daga', acc: 4, dmg: 3 },
  personalizada: { label: 'Personalizada', acc: 0, dmg: 1 },
};

export const WEAPON_OPTIONS: ReadonlyArray<{ value: WeaponId; label: string }> = (
  Object.keys(WEAPONS) as WeaponId[]
).map((value) => ({ value, label: WEAPONS[value].label }));

export type PresetDefinition = {
  label: string;
  summary: string;
  detail: string;
};

export const PRESET_DEFINITIONS: Record<RosterMode, PresetDefinition> = {
  A: {
    label: 'A · Propuesta',
    summary: 'La tabla de REQ-010 tal cual.',
    detail:
      'Tabla de REQ-010: jugador +1/+1/+1; centinela +0/+0/+0; bruto +0/+1/+0; cobarde +1/+0/+1. Armas, escudos, armaduras y PV de la hoja.',
  },
  B: {
    label: 'B · Sin base',
    summary: 'Todo el peso en el equipo.',
    detail:
      'Mismos PV, armas, escudos y armaduras que A; acierto, daño y defensa base a +0 en todas las unidades.',
  },
  C: {
    label: 'C · Tanque',
    summary: 'Combates más largos y menos daño.',
    detail:
      'Sobre A: +6 PV y +1 armadura a todas las unidades; −1 al daño base (mínimo 0). No está aprobado: es una hipótesis de playtest.',
  },
  D: {
    label: 'D · Letal',
    summary: 'Menos PV y más daño.',
    detail:
      'Sobre A: PV × 0,65 redondeado hacia arriba (mínimo 4); +2 al daño base. No está aprobado: es una hipótesis de playtest.',
  },
  personalizada: {
    label: 'Personalizada',
    summary: 'Roster editado a mano.',
    detail:
      'Roster editado a mano con los controles de la mesa. Los valores no son un preset aprobado; el export los conserva para el playtest.',
  },
};

const BASE_ROSTER: ReadonlyArray<Combatant> = [
  {
    id: 'jugador',
    name: 'Jugador',
    side: 'jugador',
    hp: 20,
    acc: 1,
    dmg: 1,
    def: 1,
    weapon: 'espada',
    weaponAcc: 3,
    weaponDmg: 4,
    shield: 1,
    armor: 1,
  },
  {
    id: 'centinela',
    name: 'Centinela',
    side: 'enemigo',
    hp: 9,
    acc: 0,
    dmg: 0,
    def: 0,
    weapon: 'espada',
    weaponAcc: 3,
    weaponDmg: 4,
    shield: 1,
    armor: 1,
  },
  {
    id: 'bruto',
    name: 'Bruto',
    side: 'enemigo',
    hp: 12,
    acc: 0,
    dmg: 1,
    def: 0,
    weapon: 'hacha',
    weaponAcc: 2,
    weaponDmg: 6,
    shield: 0,
    armor: 2,
  },
  {
    id: 'cobarde',
    name: 'Cobarde',
    side: 'enemigo',
    hp: 8,
    acc: 1,
    dmg: 0,
    def: 1,
    weapon: 'daga',
    weaponAcc: 4,
    weaponDmg: 3,
    shield: 1,
    armor: 0,
  },
];

const DEFAULT_NEW_COMBATANT: Omit<Combatant, 'id'> = {
  name: 'Nuevo combatiente',
  side: 'enemigo',
  hp: 8,
  acc: 0,
  dmg: 0,
  def: 0,
  weapon: 'espada',
  weaponAcc: 3,
  weaponDmg: 4,
  shield: 0,
  armor: 0,
};

function toInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function toSide(value: unknown): Side {
  return value === 'jugador' ? 'jugador' : 'enemigo';
}

function toWeapon(value: unknown): WeaponId {
  return value === 'espada' ||
    value === 'hacha' ||
    value === 'daga' ||
    value === 'personalizada'
    ? value
    : 'espada';
}

export function normalizeCombatant(
  input: Partial<Combatant> & { id?: string },
  fallbackId = 'custom-1',
): Combatant {
  const weapon = toWeapon(input.weapon);
  const weaponDefinition = WEAPONS[weapon];
  const id = String(input.id ?? fallbackId).trim() || fallbackId;
  return {
    id,
    name: String(input.name ?? DEFAULT_NEW_COMBATANT.name).trim() || 'Sin nombre',
    side: toSide(input.side),
    hp: toInteger(input.hp, DEFAULT_NEW_COMBATANT.hp, 1, 99),
    acc: toInteger(input.acc, DEFAULT_NEW_COMBATANT.acc, -5, 10),
    dmg: toInteger(input.dmg, DEFAULT_NEW_COMBATANT.dmg, -5, 10),
    def: toInteger(input.def, DEFAULT_NEW_COMBATANT.def, -5, 10),
    weapon,
    weaponAcc: toInteger(
      input.weaponAcc,
      weaponDefinition.acc,
      0,
      10,
    ),
    weaponDmg: toInteger(
      input.weaponDmg,
      weaponDefinition.dmg,
      1,
      20,
    ),
    shield: toInteger(input.shield, DEFAULT_NEW_COMBATANT.shield, 0, 10),
    armor: toInteger(input.armor, DEFAULT_NEW_COMBATANT.armor, 0, 10),
  };
}

export function createPresetRoster(preset: PresetId): Combatant[] {
  if (preset === 'B') {
    return BASE_ROSTER.map((combatant) => ({
      ...combatant,
      acc: 0,
      dmg: 0,
      def: 0,
    }));
  }
  if (preset === 'C') {
    return BASE_ROSTER.map((combatant) => ({
      ...combatant,
      hp: combatant.hp + 6,
      armor: combatant.armor + 1,
      dmg: Math.max(0, combatant.dmg - 1),
    }));
  }
  if (preset === 'D') {
    return BASE_ROSTER.map((combatant) => ({
      ...combatant,
      hp: Math.max(4, Math.ceil(combatant.hp * 0.65)),
      dmg: combatant.dmg + 2,
    }));
  }
  return BASE_ROSTER.map((combatant) => ({ ...combatant }));
}

export function findCombatant(
  roster: ReadonlyArray<Combatant>,
  id: string,
): Combatant | undefined {
  return roster.find((combatant) => combatant.id === id);
}

export function nextCombatantId(roster: ReadonlyArray<Combatant>): string {
  const used = new Set(roster.map((combatant) => combatant.id));
  let index = 1;
  while (used.has(`custom-${index}`)) index += 1;
  return `custom-${index}`;
}

export function addCombatant(
  roster: ReadonlyArray<Combatant>,
  patch: CombatantPatch = {},
): Combatant[] {
  const id = nextCombatantId(roster);
  return [
    ...roster,
    normalizeCombatant(
      { ...DEFAULT_NEW_COMBATANT, ...patch, id },
      id,
    ),
  ];
}

export function duplicateCombatant(
  roster: ReadonlyArray<Combatant>,
  id: string,
): Combatant[] {
  const source = findCombatant(roster, id);
  if (!source) return [...roster];
  const nextId = nextCombatantId(roster);
  return [
    ...roster,
    normalizeCombatant(
      { ...source, id: nextId, name: `${source.name} (copia)` },
      nextId,
    ),
  ];
}

export function updateCombatant(
  roster: ReadonlyArray<Combatant>,
  id: string,
  patch: CombatantPatch,
): Combatant[] {
  return roster.map((combatant) =>
    combatant.id === id
      ? normalizeCombatant({ ...combatant, ...patch, id }, id)
      : combatant,
  );
}

export function removeCombatant(
  roster: ReadonlyArray<Combatant>,
  id: string,
): Combatant[] {
  return roster.filter((combatant) => combatant.id !== id);
}

export function normalizeSeed(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SEED;
  return parsed >>> 0;
}

export function normalizeDuelCount(value: unknown): number {
  return toInteger(value, DEFAULT_DUELS, DUEL_LIMITS.min, DUEL_LIMITS.max);
}

export function roundTo(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function rollDie(rng: () => number): number {
  return Math.min(6, Math.max(1, Math.floor(rng() * 6) + 1));
}

export function impactDifference(
  attacker: Combatant,
  defender: Combatant,
): number {
  return attacker.acc + attacker.weaponAcc - (defender.def + defender.shield);
}

/** Cuenta los 36 pares de 1d6 que superan la defensa para una diferencia. */
export function impactHitsForDifference(difference: number): number {
  let hits = 0;
  for (let attackRoll = 1; attackRoll <= 6; attackRoll += 1) {
    for (let defenseRoll = 1; defenseRoll <= 6; defenseRoll += 1) {
      if (difference + attackRoll > defenseRoll) hits += 1;
    }
  }
  return hits;
}

export type Impact = {
  hit: boolean;
  attackRoll: number;
  defenseRoll: number;
  attackTotal: number;
  defenseTotal: number;
  difference: number;
};

export function resolveImpact(
  attacker: Combatant,
  defender: Combatant,
  attackRoll: number,
  defenseRoll: number,
): Impact {
  const difference = impactDifference(attacker, defender);
  const attackTotal = difference + attackRoll;
  const defenseTotal = defenseRoll;
  return {
    hit: attackTotal > defenseTotal,
    attackRoll,
    defenseRoll,
    attackTotal,
    defenseTotal,
    difference,
  };
}

export function impactProbability(
  attacker: Combatant,
  defender: Combatant,
): number {
  return impactHitsForDifference(impactDifference(attacker, defender)) / 36;
}

export function damageFor(
  attacker: Combatant,
  defender: Combatant,
  damageRoll: number,
  armorRoll: number,
): number {
  const base = attacker.dmg + attacker.weaponDmg;
  return Math.max(1, base + damageRoll - (defender.armor + armorRoll));
}

export type DamageDistributionEntry = {
  damage: number;
  count: number;
  probability: number;
};

export type DamageStats = {
  min: number;
  max: number;
  mean: number;
  distribution: DamageDistributionEntry[];
};

export function damageDistribution(
  attacker: Combatant,
  defender: Combatant,
): DamageDistributionEntry[] {
  const counts = new Map<number, number>();
  for (let damageRoll = 1; damageRoll <= 6; damageRoll += 1) {
    for (let armorRoll = 1; armorRoll <= 6; armorRoll += 1) {
      const damage = damageFor(attacker, defender, damageRoll, armorRoll);
      counts.set(damage, (counts.get(damage) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([damage, count]) => ({
      damage,
      count,
      probability: count / 36,
    }));
}

export function damageStats(
  attacker: Combatant,
  defender: Combatant,
): DamageStats {
  const distribution = damageDistribution(attacker, defender);
  const min = distribution[0]?.damage ?? 1;
  const max = distribution[distribution.length - 1]?.damage ?? 1;
  const mean = distribution.reduce(
    (total, entry) => total + entry.damage * entry.probability,
    0,
  );
  return { min, max, mean, distribution };
}

export type AttackSummary = {
  attackerId: string;
  defenderId: string;
  impactDifference: number;
  impactHits: number;
  impactChance: number;
  damageMin: number;
  damageMean: number;
  damageMax: number;
  expectedDamagePerAttack: number;
  expectedAttacksToKill: number;
  distribution: DamageDistributionEntry[];
};

export function attackSummary(
  attacker: Combatant,
  defender: Combatant,
): AttackSummary {
  const difference = impactDifference(attacker, defender);
  const impactHits = impactHitsForDifference(difference);
  const impactChance = impactHits / 36;
  const damage = damageStats(attacker, defender);
  const expectedDamagePerAttack = impactChance * damage.mean;
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    impactDifference: difference,
    impactHits,
    impactChance,
    damageMin: damage.min,
    damageMean: damage.mean,
    damageMax: damage.max,
    expectedDamagePerAttack,
    expectedAttacksToKill:
      expectedDamagePerAttack > 0
        ? defender.hp / expectedDamagePerAttack
        : Number.POSITIVE_INFINITY,
    distribution: damage.distribution,
  };
}

export type AttackResult = {
  attackerId: string;
  defenderId: string;
  hit: boolean;
  attackRoll: number;
  defenseRoll: number;
  attackTotal: number;
  defenseTotal: number;
  damageRoll: number | null;
  armorRoll: number | null;
  damage: number;
  rolls: 2 | 4;
};

/**
 * Orden de tiradas de REQ-010: ataque, escudo; si entra, daño y armadura.
 * Un fallo consume dos tiradas; un impacto, cuatro.
 */
export function resolveAttack(
  attacker: Combatant,
  defender: Combatant,
  rng: () => number,
): AttackResult {
  const attackRoll = rollDie(rng);
  const defenseRoll = rollDie(rng);
  const impact = resolveImpact(attacker, defender, attackRoll, defenseRoll);
  if (!impact.hit) {
    return {
      attackerId: attacker.id,
      defenderId: defender.id,
      hit: false,
      attackRoll,
      defenseRoll,
      attackTotal: impact.attackTotal,
      defenseTotal: impact.defenseTotal,
      damageRoll: null,
      armorRoll: null,
      damage: 0,
      rolls: 2,
    };
  }
  const damageRoll = rollDie(rng);
  const armorRoll = rollDie(rng);
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    hit: true,
    attackRoll,
    defenseRoll,
    attackTotal: impact.attackTotal,
    defenseTotal: impact.defenseTotal,
    damageRoll,
    armorRoll,
    damage: damageFor(attacker, defender, damageRoll, armorRoll),
    rolls: 4,
  };
}

export type DuelWinner = 'attacker' | 'defender' | 'draw';

export type DuelOutcome = {
  index: number;
  seed: number;
  winner: DuelWinner;
  turns: number;
  attackerHp: number;
  defenderHp: number;
};

/**
 * Un duelo: el atacante golpea en el turno 1 y se alterna. Un turno es un
 * ataque resuelto; gana quien deja al otro a 0 PV. La semilla se deriva de la
 * semilla base y el índice del duelo.
 */
export function simulateSingleDuel(
  attacker: Combatant,
  defender: Combatant,
  seed: number,
  index = 0,
): DuelOutcome {
  const duelSeed = seedForVariant(seed, `duel:${index}`);
  const rng = mulberry32(duelSeed);
  let attackerHp = attacker.hp;
  let defenderHp = defender.hp;
  let turns = 0;
  const maxTurns = (attacker.hp + defender.hp) * 1000 + 100;

  while (attackerHp > 0 && defenderHp > 0 && turns < maxTurns) {
    turns += 1;
    if (turns % 2 === 1) {
      defenderHp -= resolveAttack(attacker, defender, rng).damage;
    } else {
      attackerHp -= resolveAttack(defender, attacker, rng).damage;
    }
  }

  const winner: DuelWinner =
    defenderHp <= 0 ? 'attacker' : attackerHp <= 0 ? 'defender' : 'draw';

  return {
    index,
    seed: duelSeed,
    winner,
    turns,
    attackerHp: Math.max(0, attackerHp),
    defenderHp: Math.max(0, defenderHp),
  };
}

export type DuelSummary = {
  seed: number;
  count: number;
  attackerId: string;
  defenderId: string;
  attackerWins: number;
  defenderWins: number;
  draws: number;
  attackerWinRate: number;
  defenderWinRate: number;
  averageTurns: number;
  averageWinnerHp: number;
  averageAttackerHp: number;
  averageDefenderHp: number;
  turnDistribution: Array<{ turns: number; count: number }>;
};

export function simulateDuel(
  attacker: Combatant,
  defender: Combatant,
  seed: number,
  count: number,
): DuelSummary {
  const safeCount = normalizeDuelCount(count);
  const safeSeed = normalizeSeed(seed);
  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let turnsTotal = 0;
  let winnerHpTotal = 0;
  let winnerHpCount = 0;
  let attackerHpTotal = 0;
  let defenderHpTotal = 0;
  const turnCounts = new Map<number, number>();

  for (let index = 0; index < safeCount; index += 1) {
    const outcome = simulateSingleDuel(attacker, defender, safeSeed, index);
    turnsTotal += outcome.turns;
    attackerHpTotal += outcome.attackerHp;
    defenderHpTotal += outcome.defenderHp;
    turnCounts.set(outcome.turns, (turnCounts.get(outcome.turns) ?? 0) + 1);
    if (outcome.winner === 'attacker') {
      attackerWins += 1;
      winnerHpTotal += outcome.attackerHp;
      winnerHpCount += 1;
    } else if (outcome.winner === 'defender') {
      defenderWins += 1;
      winnerHpTotal += outcome.defenderHp;
      winnerHpCount += 1;
    } else {
      draws += 1;
    }
  }

  return {
    seed: safeSeed,
    count: safeCount,
    attackerId: attacker.id,
    defenderId: defender.id,
    attackerWins,
    defenderWins,
    draws,
    attackerWinRate: roundTo(attackerWins / safeCount, 3),
    defenderWinRate: roundTo(defenderWins / safeCount, 3),
    averageTurns: roundTo(turnsTotal / safeCount),
    averageWinnerHp:
      winnerHpCount > 0 ? roundTo(winnerHpTotal / winnerHpCount) : 0,
    averageAttackerHp: roundTo(attackerHpTotal / safeCount),
    averageDefenderHp: roundTo(defenderHpTotal / safeCount),
    turnDistribution: [...turnCounts.entries()]
      .sort(([left], [right]) => left - right)
      .map(([turns, turnCount]) => ({ turns, count: turnCount })),
  };
}

export type CombatDecisionInput = {
  roster: ReadonlyArray<Combatant>;
  preset: RosterMode;
  seed: number;
  duels: number;
  attackerId: string;
  defenderId: string;
  decision: string;
  notes: string;
  decidedAt: string;
};

export type CombatDecisionPayload = {
  experiment: typeof EXPERIMENT_ID;
  question: string;
  seed: number;
  preset: RosterMode;
  presetDetail: string;
  presetDefinitions: {
    C: PresetDefinition;
    D: PresetDefinition;
  };
  roster: Combatant[];
  attackerId: string;
  defenderId: string;
  attack: AttackSummary;
  duel: DuelSummary;
  parameters: {
    preset: RosterMode;
    seed: number;
    duels: number;
    attacker: string;
    defender: string;
  };
  decision: string;
  notes: string;
  decidedAt: string;
};

export function buildCombatDecision(
  input: CombatDecisionInput,
): CombatDecisionPayload {
  const attacker = findCombatant(input.roster, input.attackerId);
  const defender = findCombatant(input.roster, input.defenderId);
  if (!attacker || !defender || attacker.id === defender.id) {
    throw new Error('El export necesita dos combatientes distintos');
  }
  return {
    experiment: EXPERIMENT_ID,
    question: EXPERIMENT_QUESTION,
    seed: input.seed,
    preset: input.preset,
    presetDetail: PRESET_DEFINITIONS[input.preset].detail,
    presetDefinitions: {
      C: PRESET_DEFINITIONS.C,
      D: PRESET_DEFINITIONS.D,
    },
    roster: input.roster.map((combatant) => ({ ...combatant })),
    attackerId: attacker.id,
    defenderId: defender.id,
    attack: attackSummary(attacker, defender),
    duel: simulateDuel(attacker, defender, input.seed, input.duels),
    parameters: {
      preset: input.preset,
      seed: input.seed,
      duels: input.duels,
      attacker: attacker.id,
      defender: defender.id,
    },
    decision: input.decision,
    notes: input.notes,
    decidedAt: input.decidedAt,
  };
}

export type CombatExperimentApi = {
  id: typeof EXPERIMENT_ID;
  getSeed: () => number;
  setSeed: (seed: number) => void;
  getPreset: () => RosterMode;
  setPreset: (preset: RosterMode) => void;
  getDuels: () => number;
  setDuels: (duels: number) => void;
  getRoster: () => Combatant[];
  setRoster: (roster: ReadonlyArray<Combatant>) => void;
  addCombatant: (patch?: CombatantPatch) => Combatant | null;
  duplicateCombatant: (id: string) => Combatant | null;
  updateCombatant: (id: string, patch: CombatantPatch) => void;
  removeCombatant: (id: string) => void;
  getSelection: () => { attackerId: string; defenderId: string };
  setSelection: (attackerId: string, defenderId: string) => void;
  calculateAttack: (
    attackerId?: string,
    defenderId?: string,
  ) => AttackSummary;
  simulateDuel: (options?: {
    seed?: number;
    duels?: number;
    attackerId?: string;
    defenderId?: string;
  }) => DuelSummary;
  getMetrics: () => { attack: AttackSummary; duel: DuelSummary };
  snapshot: () => {
    params: {
      preset: RosterMode;
      seed: number;
      duels: number;
      attacker: string;
      defender: string;
    };
    seed: number;
    variants: Array<{
      id: string;
      metrics: Array<{ label: string; value: string | number }>;
    }>;
    roster: Combatant[];
  };
  getDecision: () => CombatDecisionPayload;
  reset: () => void;
};

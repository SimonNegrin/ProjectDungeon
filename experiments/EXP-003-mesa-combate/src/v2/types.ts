/**
 * Tipos de la mesa de combate v2.0.
 *
 * Todo es dato serializable: catálogos, unidades, escenario y métricas. El
 * runtime no conoce DOM, Canvas, red ni relojes.
 */

export type Side = 'hero' | 'enemy';
export type Awareness = 'dormant' | 'alert' | 'returning';
export type Winner = 'hero' | 'enemy' | 'draw';

export interface Stats {
  readonly habilidad: number;
  readonly fuerza: number;
  readonly defensa: number;
  readonly resistencia: number;
}

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly accuracy: number;
  readonly damage: number;
}

export interface ArmorDefinition {
  readonly id: string;
  readonly name: string;
  readonly armor: number;
}

export interface ShieldDefinition {
  readonly id: string;
  readonly name: string;
  readonly defense: number;
}

export type SpellTarget = 'enemy' | 'ally' | 'corpse';

export type SpellEffect =
  | { readonly type: 'damage' }
  | { readonly type: 'heal'; readonly amount: number }
  | { readonly type: 'resurrect'; readonly hpFraction: number };

export interface SpellDefinition {
  readonly id: string;
  readonly name: string;
  readonly family: string;
  readonly level: number;
  readonly cost: number;
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly accuracy: number;
  readonly power: number;
  readonly target: SpellTarget;
  readonly effect: SpellEffect;
}

export interface AIProfile {
  readonly id: string;
  readonly name: string;
  /** Fracción del PV máximo que dispara la huida; `null` = nunca huye. */
  readonly fleeThreshold: number | null;
  readonly castSpells: boolean;
  readonly spellPriority: 'power' | 'cost';
}

export interface CombatantTemplate {
  readonly id: string;
  readonly name: string;
  readonly side: Side;
  readonly stats: Stats;
  readonly maxHp: number;
  readonly maxMp: number;
  readonly magicLevel: number;
  readonly maxActions: number;
  readonly weaponId: string | null;
  readonly armorId: string | null;
  readonly shieldId: string | null;
  /** Puntería declarada; v2.0 no dispara a distancia. */
  readonly marksmanship: number;
  readonly vision: number;
  readonly alarmRadius: number;
  readonly profileId: string;
  readonly enemyType?: string;
}

export interface Catalog {
  readonly version: string;
  readonly roster: ReadonlyArray<CombatantTemplate>;
  readonly bestiary: ReadonlyArray<CombatantTemplate>;
  readonly weapons: Readonly<Record<string, WeaponDefinition>>;
  readonly armors: Readonly<Record<string, ArmorDefinition>>;
  readonly shields: Readonly<Record<string, ShieldDefinition>>;
  readonly spells: Readonly<Record<string, SpellDefinition>>;
  readonly aiProfiles: Readonly<Record<string, AIProfile>>;
}

export interface Unit {
  id: string;
  templateId: string;
  name: string;
  side: Side;
  stats: Stats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  mana: number;
  maxMana: number;
  magicLevel: number;
  actions: number;
  maxActions: number;
  spellsCastThisTurn: number;
  weaponId: string | null;
  armorId: string | null;
  shieldId: string | null;
  pos: number;
  vision: number;
  alarmRadius: number;
  profileId: string;
  awareness: Awareness;
  home: number;
  lastKnown: number | null;
  fleeing: boolean;
}

export interface Scenario {
  readonly id: string;
  readonly width: number;
  readonly heroId: string;
  readonly enemyId: string;
  readonly heroPos: number;
  readonly enemyPos: number;
  readonly initiative: Side;
  readonly maxRounds: number;
}

export interface AttackRolls {
  readonly attack: number;
  readonly shield: number;
  readonly damage: number | null;
  readonly armor: number | null;
}

export type Rejection =
  | 'no-action'
  | 'unarmed'
  | 'not-adjacent'
  | 'target-dead'
  | 'target-dormant'
  | 'unknown-spell'
  | 'level-too-low'
  | 'not-enough-mana'
  | 'spell-limit'
  | 'out-of-range'
  | 'invalid-target'
  | 'no-mp'
  | 'blocked'
  | 'invalid-step';

export interface SideCounters {
  attack: number;
  spell: number;
  move: number;
  wait: number;
}

export interface SpellMetrics {
  casts: number;
  hits: number;
  misses: number;
  damage: number;
}

export interface ReplicaMetrics {
  triggered: number;
  hits: number;
  misses: number;
  kills: number;
  damage: number;
}

export interface DuelMetrics {
  actions: Record<Side, SideCounters>;
  spells: Record<string, SpellMetrics>;
  mana: Record<Side, { available: number; spent: number }>;
  damageDealt: Record<Side, number>;
  healing: Record<Side, number>;
  replicas: Record<Side, ReplicaMetrics>;
  flee: { triggers: number; rounds: number };
}

export type CombatEvent =
  | {
      readonly type: 'attack';
      readonly attacker: Side;
      readonly defender: Side;
      readonly hit: boolean;
      readonly damage: number;
      readonly rolls: AttackRolls;
    }
  | {
      readonly type: 'replica';
      readonly attacker: Side;
      readonly defender: Side;
      readonly hit: boolean;
      readonly damage: number;
      readonly rolls: AttackRolls;
    }
  | {
      readonly type: 'spell';
      readonly caster: Side;
      readonly target: Side;
      readonly spellId: string;
      readonly hit: boolean;
      readonly damage: number;
    }
  | { readonly type: 'death'; readonly side: Side }
  | { readonly type: 'flee'; readonly side: Side }
  | { readonly type: 'wait'; readonly side: Side }
  | {
      readonly type: 'move';
      readonly side: Side;
      readonly from: number;
      readonly to: number;
    };

export interface DuelState {
  readonly scenario: Scenario;
  readonly catalog: Catalog;
  readonly hero: Unit;
  readonly enemy: Unit;
  rng: Rng;
  round: number;
  turns: number;
  over: boolean;
  winner: Winner | null;
  events: CombatEvent[];
  metrics: DuelMetrics;
}

export interface Rng {
  next(): number;
  die(): number;
  readonly calls: number;
}

export interface DuelResult {
  readonly winner: Winner;
  readonly rounds: number;
  readonly turns: number;
  readonly heroHp: number;
  readonly enemyHp: number;
  readonly metrics: DuelMetrics;
}

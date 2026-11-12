import {
  BESTIARY,
  MAX_ACTIONS,
  createMana,
  createRoomGrid,
  createRng,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  rollDie,
  type Awareness,
  type ArchetypeId,
  type EnemyType,
  type Faction,
  type GameState,
  type Grid,
  type MagicLevel,
  type Mana,
  type Phase,
  type Position,
  type RngState,
  type Unit,
  type UnitEquipment,
  type UnitStats,
  type WeaponId,
} from '../../../src/game/index';

/** Valores de las unidades sintéticas sin `enemyType`; los reales leen el bestiario. */
const FIXTURE_ENEMY_MAX_HP = 10;
const FIXTURE_ENEMY_MAX_MP = 4;

const PLAYER_STATS: UnitStats = {
  habilidad: 1,
  fuerza: 1,
  defensa: 1,
  resistencia: 0,
  punteria: 0,
  magicLevel: 0,
  acciones: 2,
};

const NEUTRAL_STATS: UnitStats = {
  habilidad: 0,
  fuerza: 0,
  defensa: 0,
  resistencia: 0,
  punteria: 0,
  magicLevel: 0,
  acciones: 2,
};

export interface UnitOptions {
  readonly id: string;
  /** Nombre de instancia; por defecto, el del `id`. */
  readonly nombre?: string;
  readonly faction: Faction;
  readonly enemyType?: EnemyType | null;
  /** Arquetipo del roster; `null` en unidades sintéticas. */
  readonly archetypeId?: ArchetypeId | null;
  readonly x: number;
  readonly y: number;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly mp?: number;
  readonly maxMp?: number;
  /** Nivel de magia explícito; por defecto, el de los stats base. */
  readonly magicLevel?: MagicLevel;
  /** Maná explícito; por defecto, completo según el nivel. */
  readonly mana?: Mana;
  /** Acciones restantes; por defecto, todas las del máximo. */
  readonly actions?: number;
  /** Hechizos ya lanzados en el turno; por defecto, 0. */
  readonly spellsCast?: number;
  /** Máximo explícito; por defecto, inherente + bonus recortado a 4. */
  readonly actionsMax?: number;
  readonly stats?: Partial<UnitStats>;
  readonly equipment?: UnitEquipment;
  readonly weapons?: readonly WeaponId[];
  /** Por defecto `alert`: conserva la intención de los tests legacy. */
  readonly awareness?: Awareness;
  readonly fleeing?: boolean;
  readonly home?: Position;
  readonly lastKnown?: Position | null;
  readonly alertTurns?: number;
  readonly hasShouted?: boolean;
}

export function makeUnit(options: UnitOptions): Unit {
  const isPlayer = options.faction === 'player';
  const definition = options.enemyType ? BESTIARY[options.enemyType] : null;
  const maxHp =
    options.maxHp ?? (isPlayer ? PLAYER_MAX_HP : definition?.maxHp ?? FIXTURE_ENEMY_MAX_HP);
  const maxMp =
    options.maxMp ?? (isPlayer ? PLAYER_MAX_MP : definition?.maxMp ?? FIXTURE_ENEMY_MAX_MP);
  const stats: UnitStats = {
    ...(isPlayer ? PLAYER_STATS : definition?.stats ?? NEUTRAL_STATS),
    ...(options.magicLevel !== undefined ? { magicLevel: options.magicLevel } : {}),
    ...options.stats,
  };
  const equipment: UnitEquipment =
    options.equipment ??
    definition?.equipment ?? { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' };
  const maxActions =
    options.actionsMax ??
    Math.min(MAX_ACTIONS, Math.max(0, stats.acciones + (equipment.actionsBonus ?? 0)));

  return {
    id: options.id,
    nombre: options.nombre ?? options.id,
    faction: options.faction,
    enemyType: options.enemyType ?? null,
    archetypeId: options.archetypeId ?? null,
    x: options.x,
    y: options.y,
    hp: options.hp ?? maxHp,
    maxHp,
    mp: options.mp ?? maxMp,
    maxMp,
    mana: options.mana ?? createMana(stats.magicLevel),
    actions: { max: maxActions, remaining: options.actions ?? maxActions },
    spellsCast: options.spellsCast ?? 0,
    stats,
    equipment,
    weapons: options.weapons ?? [definition?.equipment.weaponId ?? 'sword'],
    awareness: options.awareness ?? 'alert',
    fleeing: options.fleeing ?? false,
    home: options.home ?? { x: options.x, y: options.y },
    lastKnown: options.lastKnown ?? null,
    alertTurns: options.alertTurns ?? 0,
    hasShouted: options.hasShouted ?? false,
  };
}

export interface StateOptions {
  readonly grid?: Grid;
  readonly players?: readonly Unit[];
  readonly enemies?: readonly Unit[];
  readonly phase?: Phase;
  readonly turn?: number;
  readonly status?: GameState['status'];
  readonly rng?: RngState;
}

export function makeState(options: StateOptions = {}): GameState {
  return {
    grid: options.grid ?? createRoomGrid(20, 20),
    players: options.players ?? [makeUnit({ id: 'player-1', faction: 'player', x: 4, y: 4 })],
    enemies: options.enemies ?? [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 15, y: 15 })],
    phase: options.phase ?? 'player',
    turn: options.turn ?? 1,
    status: options.status ?? 'playing',
    rng: options.rng ?? createRng(1017),
  };
}

const rngCache = new Map<string, RngState>();

/**
 * Busca un estado de RNG cuya secuencia empiece por los dados indicados.
 * Permite fijar tiradas en los tests sin tocar el generador de producción.
 */
export function rngForDice(dice: readonly number[], seed = 1017): RngState {
  const key = `${seed}:${dice.join(',')}`;
  const cached = rngCache.get(key);
  if (cached) return cached;

  const maxStates = 2_000_000;
  for (let state = 0; state < maxStates; state += 1) {
    let rng: RngState = { seed, state };
    let matches = true;
    for (const expected of dice) {
      const rolled = rollDie(rng);
      if (rolled.die !== expected) {
        matches = false;
        break;
      }
      rng = rolled.rng;
    }
    if (matches) {
      const found: RngState = { seed, state };
      rngCache.set(key, found);
      return found;
    }
  }

  throw new Error(`No se encontró RNG para la secuencia ${dice.join(',')}`);
}

/** Avanza el RNG tantas tiradas como elementos tenga `dice`, comprobando cada una. */
export function advanceRng(rng: RngState, dice: readonly number[]): RngState {
  let current = rng;
  for (const expected of dice) {
    const rolled = rollDie(current);
    if (rolled.die !== expected) {
      throw new Error(`Se esperaba ${expected} y salió ${rolled.die}`);
    }
    current = rolled.rng;
  }
  return current;
}

export function makeGridWithWalls(
  walls: readonly { readonly x: number; readonly y: number }[],
): Grid {
  const base = createRoomGrid(20, 20);
  const wallSet = new Set(walls.map(({ x, y }) => `${x},${y}`));

  return {
    width: base.width,
    height: base.height,
    tiles: base.tiles.map((tile, index) => {
      const x = index % base.width;
      const y = Math.floor(index / base.width);
      return wallSet.has(`${x},${y}`) ? 'wall' : tile;
    }),
  };
}

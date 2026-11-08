import {
  createRoomGrid,
  createRng,
  ENEMY_MAX_MP,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  rollDie,
  type EnemyType,
  type Faction,
  type GameState,
  type Grid,
  type Phase,
  type RngState,
  type Unit,
  type UnitEquipment,
  type UnitModifiers,
  type WeaponId,
} from '../../../src/game/index';

/** Vida de los enemigos sintéticos de test; el bestiario fija la de los reales. */
const FIXTURE_ENEMY_MAX_HP = 10;

export interface UnitOptions {
  readonly id: string;
  readonly faction: Faction;
  readonly enemyType?: EnemyType | null;
  readonly x: number;
  readonly y: number;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly mp?: number;
  readonly maxMp?: number;
  readonly actionAvailable?: boolean;
  readonly modifiers?: UnitModifiers;
  readonly equipment?: UnitEquipment;
  readonly weapons?: readonly WeaponId[];
}

export function makeUnit(options: UnitOptions): Unit {
  const isPlayer = options.faction === 'player';
  const maxHp = options.maxHp ?? (isPlayer ? PLAYER_MAX_HP : FIXTURE_ENEMY_MAX_HP);
  const maxMp = options.maxMp ?? (isPlayer ? PLAYER_MAX_MP : ENEMY_MAX_MP);

  return {
    id: options.id,
    faction: options.faction,
    enemyType: options.enemyType ?? null,
    x: options.x,
    y: options.y,
    hp: options.hp ?? maxHp,
    maxHp,
    mp: options.mp ?? maxMp,
    maxMp,
    actionAvailable: options.actionAvailable ?? true,
    modifiers:
      options.modifiers ??
      (isPlayer
        ? { accuracy: 1, damage: 1, defense: 1 }
        : { accuracy: 0, damage: 0, defense: 0 }),
    equipment:
      options.equipment ??
      { weaponId: 'sword', armorId: 'armor', shieldId: 'shield' },
    weapons: options.weapons ?? ['sword'],
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

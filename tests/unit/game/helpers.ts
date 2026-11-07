import {
  createRoomGrid,
  ENEMY_MAX_HP,
  ENEMY_MAX_MP,
  PLAYER_MAX_HP,
  PLAYER_MAX_MP,
  type Faction,
  type GameState,
  type Grid,
  type Phase,
  type Unit,
} from '../../../src/game/index';

export interface UnitOptions {
  readonly id: string;
  readonly faction: Faction;
  readonly x: number;
  readonly y: number;
  readonly hp?: number;
  readonly mp?: number;
  readonly actionAvailable?: boolean;
}

export function makeUnit(options: UnitOptions): Unit {
  const isPlayer = options.faction === 'player';
  const maxHp = isPlayer ? PLAYER_MAX_HP : ENEMY_MAX_HP;
  const maxMp = isPlayer ? PLAYER_MAX_MP : ENEMY_MAX_MP;

  return {
    id: options.id,
    faction: options.faction,
    x: options.x,
    y: options.y,
    hp: options.hp ?? maxHp,
    maxHp,
    mp: options.mp ?? maxMp,
    maxMp,
    actionAvailable: options.actionAvailable ?? true,
  };
}

export interface StateOptions {
  readonly grid?: Grid;
  readonly players?: readonly Unit[];
  readonly enemies?: readonly Unit[];
  readonly phase?: Phase;
  readonly turn?: number;
  readonly status?: GameState['status'];
}

export function makeState(options: StateOptions = {}): GameState {
  return {
    grid: options.grid ?? createRoomGrid(32, 24),
    players: options.players ?? [makeUnit({ id: 'player-1', faction: 'player', x: 2, y: 2 })],
    enemies: options.enemies ?? [makeUnit({ id: 'enemy-1', faction: 'enemy', x: 5, y: 2 })],
    phase: options.phase ?? 'player',
    turn: options.turn ?? 1,
    status: options.status ?? 'playing',
  };
}

export function makeGridWithWalls(
  walls: readonly { readonly x: number; readonly y: number }[],
): Grid {
  const base = createRoomGrid(32, 24);
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

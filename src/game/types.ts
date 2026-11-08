import type { GeneratedMap } from './map';

export type Tile = 'floor' | 'wall';
export type Faction = 'player' | 'enemy';
export type Phase = 'player' | 'enemy';
export type GameStatus = 'playing' | 'victory' | 'defeat';
export type GameEndStatus = Exclude<GameStatus, 'playing'>;

export interface Grid {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Unit {
  readonly id: string;
  readonly faction: Faction;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly actionAvailable: boolean;
}

export interface GameState {
  readonly grid: Grid;
  /** Mapa generado que dio lugar a `grid`. Siempre presente en `createInitialState`. */
  readonly map?: GeneratedMap;
  readonly players: readonly Unit[];
  readonly enemies: readonly Unit[];
  readonly phase: Phase;
  readonly turn: number;
  readonly status: GameStatus;
}

export type CommandType = 'Move' | 'MoveTo' | 'Attack' | 'EndTurn' | 'Restart';

export type Command =
  | {
      readonly type: 'Move';
      readonly unitId: string;
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly type: 'MoveTo';
      readonly unitId: string;
      /** Tile seleccionado por el host; el motor recalcula el camino. */
      readonly target: Position;
    }
  | { readonly type: 'Attack'; readonly unitId: string; readonly targetId: string }
  | { readonly type: 'EndTurn' }
  | { readonly type: 'Restart' };

export type RejectionReason =
  | 'game-over'
  | 'wrong-phase'
  | 'unknown-unit'
  | 'dead-unit'
  | 'invalid-direction'
  | 'out-of-bounds'
  | 'wall'
  | 'occupied'
  | 'corner-cut'
  | 'no-mp'
  | 'no-action'
  | 'target-not-found'
  | 'target-dead'
  | 'target-not-adjacent'
  | 'same-faction'
  /** `MoveTo`: no existe camino hasta el destino o el tile de ataque. */
  | 'no-path'
  /** `MoveTo`: destino no accionable (por ejemplo, el propio tile del jugador). */
  | 'invalid-target';

export type GameEvent =
  | {
      readonly type: 'UnitMoved';
      readonly unitId: string;
      readonly from: Position;
      readonly to: Position;
      readonly mpLeft: number;
    }
  | {
      readonly type: 'AttackPerformed';
      readonly attackerId: string;
      readonly targetId: string;
      readonly damage: number;
      readonly targetHp: number;
    }
  | { readonly type: 'UnitDied'; readonly unitId: string }
  | { readonly type: 'TurnEnded'; readonly turn: number }
  | { readonly type: 'EnemyPhaseStarted'; readonly turn: number }
  | { readonly type: 'PlayerTurnStarted'; readonly turn: number }
  | { readonly type: 'EnemyWaited'; readonly unitId: string }
  | { readonly type: 'GameEnded'; readonly status: GameEndStatus }
  | { readonly type: 'GameRestarted' }
  | {
      readonly type: 'CommandRejected';
      readonly commandType: CommandType;
      readonly reason: RejectionReason;
    };

export interface ReduceResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export const ROOM_WIDTH = 20;
export const ROOM_HEIGHT = 20;
export const PLAYER_MAX_HP = 20;
export const ENEMY_MAX_HP = 10;
export const PLAYER_MAX_MP = 6;
export const ENEMY_MAX_MP = 4;
export const PLAYER_ATTACK_DAMAGE = 5;
export const ENEMY_ATTACK_DAMAGE = 3;
export const MOVE_COST = 1;

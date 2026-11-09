import type { EnemyType } from './bestiary';
import type { ArmorId, ShieldId, WeaponId } from './equipment';
import type { GeneratedMap } from './map';

export type Tile = 'floor' | 'wall';
export type Faction = 'player' | 'enemy';
export type Phase = 'player' | 'enemy';
/** Estado de percepción de un enemigo (REQ-009). */
export type Awareness = 'dormant' | 'alert' | 'returning';
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

/** Nivel de una familia de magia (REQ-014 R-007): siempre de 1 a 4. */
export type MagicLevel = 1 | 2 | 3 | 4;

/** Familia de magia con su nivel; el efecto aún no existe (REQ-014 R-007). */
export interface MagicSchool {
  readonly familia: string;
  readonly nivel: MagicLevel;
}

/**
 * Atributos inherentes de un personaje (REQ-014 R-001). PV y MP viven en sus
 * campos actuales de `Unit`; el equipo no define ninguno de estos valores.
 */
export interface UnitStats {
  readonly habilidad: number;
  readonly fuerza: number;
  readonly defensa: number;
  readonly resistencia: number;
  readonly punteria: number;
  readonly magia: readonly MagicSchool[];
}

/** Equipo equipado, serializable y estable por ID de catálogo. */
export interface UnitEquipment {
  readonly weaponId: WeaponId;
  /** `null` = sin armadura. */
  readonly armorId: ArmorId | null;
  /** `null` = sin escudo. */
  readonly shieldId: ShieldId | null;
}

/** RNG de combate serializable: misma semilla y contador, misma secuencia. */
export interface RngState {
  readonly seed: number;
  readonly state: number;
}

export interface Unit {
  readonly id: string;
  readonly faction: Faction;
  /** Tipo de enemigo del bestiario; `null` para jugadores. */
  readonly enemyType: EnemyType | null;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly actionAvailable: boolean;
  readonly stats: UnitStats;
  readonly equipment: UnitEquipment;
  /** Armas llevadas; la equipada es `equipment.weaponId`. */
  readonly weapons: readonly WeaponId[];
  /** Percepción del enemigo; los jugadores usan `alert` como valor estable. */
  readonly awareness: Awareness;
  /** Huida activa del perfil cobarde (REQ-009; comportamiento en TASK-0037). */
  readonly fleeing: boolean;
  /** Puesto inicial al que vuelve la alerta al enfriarse. */
  readonly home: Position;
  /** Última posición conocida de un jugador; `null` si nunca vio a uno. */
  readonly lastKnown: Position | null;
  /** Fases enemigas sin visión desde la última detección. */
  readonly alertTurns: number;
  /** Ya dio la alarma en el episodio actual (operativo en TASK-0035). */
  readonly hasShouted: boolean;
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
  readonly rng: RngState;
}

export type CommandType =
  | 'Move'
  | 'MoveTo'
  | 'Attack'
  | 'PickUp'
  | 'SelectWeapon'
  | 'EndTurn'
  | 'Restart';

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
  /** Recoge el arma del mapa que ocupa la unidad (1 MP, sin gastar acción). */
  | { readonly type: 'PickUp'; readonly unitId: string }
  /** Cambia al hueco de arma `slot` (1-3), gratis y sin gastar acción. */
  | { readonly type: 'SelectWeapon'; readonly unitId: string; readonly slot: number }
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
  | 'invalid-target'
  /** `PickUp`: no hay un arma del mapa en el tile de la unidad. */
  | 'no-weapon'
  /** `PickUp`: el inventario ya tiene los tres huecos ocupados. */
  | 'inventory-full'
  /** `SelectWeapon`: el hueco no existe o no tiene arma. */
  | 'invalid-slot';

/** Tiradas de un ataque; daño y armadura solo se tiran si hay impacto. */
export interface AttackRolls {
  readonly attack: number;
  readonly shield: number;
  readonly damage: number | null;
  readonly armor: number | null;
}

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
      readonly hit: boolean;
      readonly damage: number;
      readonly targetHp: number;
      readonly rolls: AttackRolls;
    }
  | { readonly type: 'UnitDied'; readonly unitId: string }
  | { readonly type: 'TurnEnded'; readonly turn: number }
  | { readonly type: 'EnemyPhaseStarted'; readonly turn: number }
  | { readonly type: 'PlayerTurnStarted'; readonly turn: number }
  | { readonly type: 'EnemyWaited'; readonly unitId: string }
  | { readonly type: 'GameEnded'; readonly status: GameEndStatus }
  | { readonly type: 'GameRestarted' }
  | {
      /** Un enemigo ha visto a un jugador por primera vez en el episodio. */
      readonly type: 'EnemySpotted';
      readonly unitId: string;
      readonly playerId: string;
      /** Posición del enemigo que detecta, para anclar el "!". */
      readonly position: Position;
      /** Posición del jugador tras el paso que provoca la detección. */
      readonly step: Position;
    }
  /** Un enemigo en regreso ha llegado a su puesto y vuelve a estar dormido. */
  | { readonly type: 'EnemyReturned'; readonly unitId: string }
  /** El perfil cobarde inicia o renueva la huida tras un golpe fuerte. */
  | { readonly type: 'EnemyFled'; readonly unitId: string }
  | {
      /** El enemigo que detecta da la alarma de una onda en este episodio. */
      readonly type: 'AlarmRaised';
      readonly unitId: string;
      /** Posición del emisor de la onda. */
      readonly position: Position;
    }
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
export const PLAYER_MAX_MP = 6;
export const MOVE_COST = 1;
/** Huecos de arma que puede llevar una unidad. */
export const MAX_WEAPONS = 3;
/** Coste en MP de recoger un arma del mapa. */
export const PICKUP_COST = 1;

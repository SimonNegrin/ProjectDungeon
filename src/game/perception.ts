import { BESTIARY } from './bestiary';
import { isAlive, isWallAt } from './grid';
import type { GameEvent, GameState, Grid, Position, Unit } from './types';

/** Fases que el enemigo investiga la última posición conocida. */
export const ALERT_INVESTIGATE_PHASES = 2;
/** Fases enemigas sin visión antes de volver al puesto (2 investigando + 1 de regreso). */
export const ALERT_COOLDOWN_PHASES = ALERT_INVESTIGATE_PHASES + 1;

/**
 * Radio de visión en tiles según el bestiario. Los jugadores y las unidades
 * sintéticas sin `enemyType` no perciben.
 */
export function visionRadius(unit: Pick<Unit, 'faction' | 'enemyType'>): number {
  if (unit.faction !== 'enemy' || unit.enemyType === null) return 0;
  return BESTIARY[unit.enemyType].vision;
}

/**
 * Radio de la onda de alarma en tiles según el bestiario. Los jugadores y las
 * unidades sin `enemyType` no emiten alarma.
 */
export function alarmRadius(unit: Pick<Unit, 'faction' | 'enemyType'>): number {
  if (unit.faction !== 'enemy' || unit.enemyType === null) return 0;
  return BESTIARY[unit.enemyType].alarm;
}

/**
 * Línea de Bresenham inclusiva entre dos casillas. Es determinista y no muta
 * las posiciones de entrada.
 */
export function bresenhamLine(from: Position, to: Position): readonly Position[] {
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - x);
  const dy = Math.abs(to.y - y);
  const stepX = x < to.x ? 1 : -1;
  const stepY = y < to.y ? 1 : -1;
  let error = dx - dy;
  const points: Position[] = [];

  for (;;) {
    points.push({ x, y });
    if (x === to.x && y === to.y) break;

    const doubled = 2 * error;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }

  return points;
}

/**
 * Visión 360°: los muros intermedios de la línea de Bresenham bloquean; las
 * unidades no se tienen en cuenta. Los extremos no cuentan como intermedios.
 */
export function hasLineOfSight(grid: Grid, from: Position, to: Position): boolean {
  const line = bresenhamLine(from, to);
  for (let index = 1; index < line.length - 1; index += 1) {
    if (isWallAt(grid, line[index].x, line[index].y)) return false;
  }
  return true;
}

/** Un enemigo ve a un objetivo si está dentro de su radio y hay línea de visión. */
export function canSee(grid: Grid, observer: Unit, target: Pick<Unit, 'x' | 'y'>): boolean {
  const radius = visionRadius(observer);
  const distance = Math.max(
    Math.abs(observer.x - target.x),
    Math.abs(observer.y - target.y),
  );
  if (distance > radius) return false;
  return hasLineOfSight(grid, observer, target);
}

/** Jugadores vivos visibles, en orden de índice del estado. */
export function visiblePlayers(state: GameState, observer: Unit): readonly Unit[] {
  return state.players.filter(
    (player) => isAlive(player) && canSee(state.grid, observer, player),
  );
}

/**
 * Jugador visible más cercano (Chebyshev), con desempate por índice. Es la
 * posición que se guarda como `lastKnown`.
 */
export function nearestVisiblePlayer(state: GameState, observer: Unit): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const player of state.players) {
    if (!isAlive(player) || !canSee(state.grid, observer, player)) continue;
    const distance = Math.max(
      Math.abs(observer.x - player.x),
      Math.abs(observer.y - player.y),
    );
    if (distance < bestDistance) {
      best = player;
      bestDistance = distance;
    }
  }

  return best;
}

/**
 * Onda de alarma de una sola pasada desde un emisor vivo. Los receptores vivos
 * dentro del radio Chebyshev pasan o siguen en alerta, comparten la posición
 * recibida como `lastKnown` y quedan `hasShouted: true`; el emisor también. No
 * requiere línea de visión y no se propaga en cadena: solo alerta a los
 * receptores directos. No muta el estado de entrada.
 */
export function raiseAlarm(
  state: GameState,
  emitterId: string,
  lastKnown: Position,
): {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
} {
  const emitter = state.enemies.find((candidate) => candidate.id === emitterId);
  if (!emitter || !isAlive(emitter)) return { state, events: [] };

  const radius = alarmRadius(emitter);
  const target = { x: lastKnown.x, y: lastKnown.y };
  let changed = false;

  const enemies = state.enemies.map((enemy) => {
    if (!isAlive(enemy)) return enemy;

    if (enemy.id !== emitter.id) {
      const distance = Math.max(
        Math.abs(enemy.x - emitter.x),
        Math.abs(enemy.y - emitter.y),
      );
      if (distance > radius) return enemy;
    }

    changed = true;
    return {
      ...enemy,
      awareness: 'alert' as const,
      lastKnown: { x: target.x, y: target.y },
      alertTurns: 0,
      hasShouted: true,
    };
  });

  return {
    state: changed ? { ...state, enemies } : state,
    events: [
      {
        type: 'AlarmRaised',
        unitId: emitter.id,
        position: { x: emitter.x, y: emitter.y },
      },
    ],
  };
}

/**
 * Detección tras un paso aceptado del jugador. Primero calcula todas las
 * detecciones de un episodio sobre el estado de entrada y actualiza a los que
 * ven; después resuelve las ondas de alarma en orden de índice. Cada emisor
 * emite `EnemySpotted` y `AlarmRaised` una vez por episodio; los receptores no
 * generan una segunda onda.
 */
export function detectEnemiesAfterStep(state: GameState): {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
} {
  const events: GameEvent[] = [];
  const spotters: {
    readonly player: Unit;
    readonly update: Unit;
  }[] = [];
  let changed = false;

  const enemies = state.enemies.map((enemy) => {
    if (!isAlive(enemy)) return enemy;
    const player = nearestVisiblePlayer(state, enemy);
    if (!player) return enemy;

    const newEpisode = enemy.awareness !== 'alert';
    changed = true;
    const update: Unit = {
      ...enemy,
      awareness: 'alert' as const,
      lastKnown: { x: player.x, y: player.y },
      alertTurns: 0,
      hasShouted: newEpisode ? true : enemy.hasShouted,
    };
    if (newEpisode) spotters.push({ player, update });
    return update;
  });

  let next = changed ? { ...state, enemies } : state;

  for (const { update, player } of spotters) {
    events.push({
      type: 'EnemySpotted',
      unitId: update.id,
      playerId: player.id,
      position: { x: update.x, y: update.y },
      step: { x: player.x, y: player.y },
    });
  }

  for (const { update, player } of spotters) {
    events.push({
      type: 'AlarmRaised',
      unitId: update.id,
      position: { x: update.x, y: update.y },
    });
    next = raiseAlarm(next, update.id, {
      x: player.x,
      y: player.y,
    }).state;
  }

  // Candado de memoria: la onda de otro emisor no sobrescribe a quien también
  // ha visto al jugador en este paso; su detección propia manda.
  if (spotters.length > 0) {
    const own = new Map(spotters.map(({ update }) => [update.id, update]));
    next = {
      ...next,
      enemies: next.enemies.map((enemy) => own.get(enemy.id) ?? enemy),
    };
  }

  return { state: next, events };
}

export interface EnemyAwarenessUpdate {
  readonly unit: Unit;
  readonly changed: boolean;
  /** El enemigo estaba en regreso, ya en su puesto, y pasa a dormido. */
  readonly returned: boolean;
  /** El enemigo empieza un episodio de alerta en esta fase. */
  readonly spotted: boolean;
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Actualiza la memoria de un enemigo al empezar su activación:
 * - si ve a un jugador, pasa o permanece en alerta y reinicia el contador;
 * - sin visión, alerta incrementa `alertTurns` y a las 3 fases pasa a regreso;
 * - un enemigo en regreso que ya está en `home` pasa a dormido.
 */
export function refreshEnemyAwareness(state: GameState, enemy: Unit): EnemyAwarenessUpdate {
  if (!isAlive(enemy)) {
    return { unit: enemy, changed: false, returned: false, spotted: false };
  }

  const player = nearestVisiblePlayer(state, enemy);
  if (player) {
    const spotted = enemy.awareness !== 'alert';
    return {
      unit: {
        ...enemy,
        awareness: 'alert',
        lastKnown: { x: player.x, y: player.y },
        alertTurns: 0,
        hasShouted: spotted ? false : enemy.hasShouted,
      },
      changed: true,
      returned: false,
      spotted,
    };
  }

  if (enemy.awareness === 'alert') {
    const alertTurns = Math.min(enemy.alertTurns + 1, ALERT_COOLDOWN_PHASES);
    return {
      unit: {
        ...enemy,
        awareness: alertTurns >= ALERT_COOLDOWN_PHASES ? 'returning' : 'alert',
        fleeing: alertTurns >= ALERT_COOLDOWN_PHASES ? false : enemy.fleeing,
        alertTurns,
      },
      changed: true,
      returned: false,
      spotted: false,
    };
  }

  if (
    enemy.awareness === 'returning' &&
    samePosition({ x: enemy.x, y: enemy.y }, enemy.home)
  ) {
    return {
      unit: {
        ...enemy,
        awareness: 'dormant',
        fleeing: false,
        lastKnown: null,
        alertTurns: 0,
        hasShouted: false,
      },
      changed: true,
      returned: true,
      spotted: false,
    };
  }

  return { unit: enemy, changed: false, returned: false, spotted: false };
}

/**
 * Transición pura de daño: un enemigo vivo despierta o permanece en alerta,
 * guarda la posición del atacante como `lastKnown` y reinicia `alertTurns`.
 * No resuelve daño ni emite eventos; `resolveAttack` decide la onda a partir
 * del estado resultante. Al empezar un episodio nuevo deja `hasShouted` a
 * `false` para que esa alarma pueda dispararse.
 */
export function noteDamage(
  state: GameState,
  enemyId: string,
  attackerPosition: Position,
): GameState {
  const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy || !isAlive(enemy)) return state;

  const newEpisode = enemy.awareness !== 'alert';

  return {
    ...state,
    enemies: state.enemies.map((candidate) =>
      candidate.id === enemyId
        ? {
            ...candidate,
            awareness: 'alert' as const,
            lastKnown: { x: attackerPosition.x, y: attackerPosition.y },
            alertTurns: 0,
            hasShouted: newEpisode ? false : candidate.hasShouted,
          }
        : candidate,
    ),
  };
}

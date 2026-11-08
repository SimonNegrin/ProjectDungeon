import type { AttackRolls, GameEvent, GameState, Position, Unit } from '../game/types';

export interface DamageFeedback {
  readonly targetId: string;
  readonly damage: number;
  readonly x: number;
  readonly y: number;
}

/** Datos de presentación de un ataque, con impacto/fallo y tiradas del motor. */
export interface AttackFeedback {
  readonly targetId: string;
  readonly hit: boolean;
  readonly damage: number;
  readonly targetHp: number;
  readonly rolls: AttackRolls;
  /** Texto ASCII: `-N` en impacto y `Fallo` en fallo. */
  readonly text: string;
  /** Posición del objetivo al resolverse el ataque. */
  readonly x: number;
  readonly y: number;
  /** Posición del atacante al resolverse el ataque, para orientar el feedback. */
  readonly attacker: Position;
}

/** Lado del objetivo donde se dibuja el texto, opuesto al atacante. */
export type DamageFeedbackSide = 'above' | 'below' | 'left' | 'right';

/**
 * Ancla del borde inferior-centro del texto en coordenadas de tile. La vista la
 * convierte a porcentajes del marco; el texto se dibuja con
 * `translate(-50%, -100%)`.
 */
export interface DamageFeedbackAnchor {
  readonly x: number;
  readonly y: number;
  readonly side: DamageFeedbackSide;
}

/** Medidas nominales del texto en tiles; mantienen la caja dentro del mapa. */
export const DAMAGE_FEEDBACK_HALF_WIDTH = 0.45;
export const DAMAGE_FEEDBACK_HEIGHT = 0.5;
/** Distancia del centro del objetivo al centro del texto en el eje elegido. */
const DAMAGE_FEEDBACK_SIDE_OFFSET = 0.25;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Calcula dónde dibujar `-N`/`Fallo` para que quede sobre el objetivo y en el
 * lado opuesto al atacante.
 *
 * Reglas deterministas:
 * - Atacante arriba/abajo: texto debajo/encima del centro del objetivo.
 * - Atacante izquierda/derecha: texto a la derecha/izquierda del centro.
 * - Diagonal: gana el eje vertical, que es el que produce el solape original en
 *   los pasillos estrechos.
 * - Misma casilla: no hay lado opuesto; se usa `below`.
 *
 * El ancla se limita al mapa para que el texto no se salga del marco.
 */
export function damageFeedbackAnchor(
  target: Position,
  attacker: Position,
  map: { readonly width: number; readonly height: number },
): DamageFeedbackAnchor {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const side: DamageFeedbackSide =
    dy !== 0 && Math.abs(dy) >= Math.abs(dx)
      ? dy > 0
        ? 'below'
        : 'above'
      : dx !== 0
        ? dx > 0
          ? 'right'
          : 'left'
        : 'below';

  const centerX = target.x + 0.5;
  const centerY = target.y + 0.5;
  const rawX =
    side === 'left'
      ? centerX - DAMAGE_FEEDBACK_SIDE_OFFSET
      : side === 'right'
        ? centerX + DAMAGE_FEEDBACK_SIDE_OFFSET
        : centerX;
  // El texto crece hacia arriba desde el ancla: para quedar debajo del centro
  // hay que anclarlo en el borde inferior del tile; para quedar encima, en el
  // centro. En horizontal se centra en la mitad inferior del tile.
  const rawY =
    side === 'below'
      ? target.y + 1
      : side === 'above'
        ? centerY
        : centerY + DAMAGE_FEEDBACK_SIDE_OFFSET;

  return {
    x: clamp(rawX, DAMAGE_FEEDBACK_HALF_WIDTH, map.width - DAMAGE_FEEDBACK_HALF_WIDTH),
    y: clamp(rawY, DAMAGE_FEEDBACK_HEIGHT, map.height),
    side,
  };
}

function findUnit(state: GameState, id: string): Unit | undefined {
  return state.players.find((unit) => unit.id === id) ?? state.enemies.find((unit) => unit.id === id);
}

/**
 * Convierte los eventos de ataque en datos de presentación. Usa la posición del
 * objetivo en el estado resultante (los muertos conservan su casilla) y no
 * altera el estado ni retrasa la lógica.
 */
export function collectDamageFeedbacks(
  events: readonly GameEvent[],
  state: GameState,
): DamageFeedback[] {
  const feedbacks: DamageFeedback[] = [];

  for (const event of events) {
    if (event.type !== 'AttackPerformed') continue;
    const target = findUnit(state, event.targetId);
    if (!target) continue;
    feedbacks.push({
      targetId: event.targetId,
      damage: event.damage,
      x: target.x,
      y: target.y,
    });
  }

  return feedbacks;
}

/**
 * Convierte los ataques en feedback legible sin recalcular reglas: el impacto,
 * el daño y el HP salen del evento del motor. Un fallo se comunica con texto
 * (`Fallo`), no solo con color o animación.
 */
export function collectAttackFeedbacks(
  events: readonly GameEvent[],
  state: GameState,
): AttackFeedback[] {
  const feedbacks: AttackFeedback[] = [];

  for (const event of events) {
    if (event.type !== 'AttackPerformed') continue;
    const target = findUnit(state, event.targetId);
    if (!target) continue;
    const attacker = findUnit(state, event.attackerId);
    feedbacks.push({
      targetId: event.targetId,
      hit: event.hit,
      damage: event.damage,
      targetHp: event.targetHp,
      rolls: { ...event.rolls },
      text: event.hit ? `-${event.damage}` : 'Fallo',
      x: target.x,
      y: target.y,
      attacker: { x: attacker?.x ?? target.x, y: attacker?.y ?? target.y },
    });
  }

  return feedbacks;
}

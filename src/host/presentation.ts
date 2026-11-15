import type { ItemId } from '../game/equipment';
import type {
  Command,
  EnemyPhaseEntry,
  GameEvent,
  GameState,
  Unit,
} from '../game/types';
import type { MotionTimeline } from './motion';

const EPSILON = 1e-9;

/** Actor enemigo y objetivo presentados en un instante de la fase enemiga. */
export interface EnemyActorContext {
  readonly actorId: string;
  readonly targetId: string | null;
}

/** ¿La fase enemiga tiene al menos un enemigo que mueve o ataca? (REQ-031 R-007) */
export function enemyPhaseHasActions(
  enemyPhase: readonly EnemyPhaseEntry[] | undefined,
): boolean {
  return enemyPhase?.some((entry) => entry.action === 'act') === true;
}

function presentationActor(event: PresentationEvent): string | null {
  switch (event.type) {
    case 'UnitMoved':
      return event.unitId;
    case 'AttackPerformed':
      return event.attackerId;
    case 'SpellCast':
      return event.casterId;
    default:
      return null;
  }
}

/** Inicio de la presentación de un actor en la timeline; `null` si no actúa. */
function actorStartMs(
  entry: EnemyPhaseEntry,
  timeline: MotionTimeline,
): number | null {
  let start = Number.POSITIVE_INFINITY;
  for (const step of timeline.steps) {
    if (step.unitId === entry.enemyId) start = Math.min(start, step.startMs);
  }
  for (const timed of timeline.events) {
    if (presentationActor(timed.event) === entry.enemyId) {
      start = Math.min(start, timed.atMs);
    }
  }
  return Number.isFinite(start) ? start : null;
}

/**
 * Contexto de HUD en el instante `elapsed`: el último enemigo que actúa cuya
 * presentación ya ha empezado. Los enemigos que solo esperan no abren ventana,
 * de modo que la cámara y el HUD no se detienen en ellos (REQ-031 R-008/R-009).
 */
export function enemyActorContextAt(
  enemyPhase: readonly EnemyPhaseEntry[] | undefined,
  timeline: MotionTimeline,
  elapsed: number,
): EnemyActorContext | null {
  if (enemyPhase === undefined) return null;

  const windows = enemyPhase
    .filter((entry) => entry.action === 'act')
    .flatMap((entry) => {
      const startMs = actorStartMs(entry, timeline);
      return startMs === null
        ? []
        : [{ context: { actorId: entry.enemyId, targetId: entry.targetId }, startMs }];
    })
    .sort((a, b) => a.startMs - b.startMs);

  let current: EnemyActorContext | null = null;
  for (const window of windows) {
    if (elapsed + EPSILON < window.startMs) break;
    current = window.context;
  }
  return current;
}

/**
 * Eventos de presentación del host. `PickUp`, `SelectWeapon`, `DropItem` y
 * `UnequipItem` no son eventos del motor: el host los crea a partir del comando y
 * del diff entre el estado antes y después de despacharlo. Así la timeline y el
 * estado intermedio los tratan como cualquier otro evento sin añadirlos a
 * `DispatchResult.events`.
 */
export interface PickUpPresentationEvent {
  readonly type: 'PickUp';
  readonly unitId: string;
  readonly itemId: ItemId;
  readonly slot: number;
}

export interface SelectWeaponPresentationEvent {
  readonly type: 'SelectWeapon';
  readonly unitId: string;
  readonly itemId: ItemId;
  readonly slot: number;
}

/** Soltar un objeto de mochila o hueco: el estado visible cambia al acabar su beat. */
export interface DropItemPresentationEvent {
  readonly type: 'DropItem';
  readonly unitId: string;
  readonly itemId: ItemId;
  /** Hueco de mochila (1-based) o 0 cuando sale de un hueco de equipo. */
  readonly slot: number;
}

/** Desequipar: el hueco queda vacío y el objeto entra en la mochila al acabar su beat. */
export interface UnequipItemPresentationEvent {
  readonly type: 'UnequipItem';
  readonly unitId: string;
  readonly itemId: ItemId;
  readonly slot: number;
}

export type PresentationEvent =
  | GameEvent
  | PickUpPresentationEvent
  | SelectWeaponPresentationEvent
  | DropItemPresentationEvent
  | UnequipItemPresentationEvent;

function additions(before: Unit, after: Unit) {
  const beforeIds = new Set(
    before.inventory.items
      .filter((item) => item !== null)
      .map((item) => item.id),
  );
  return after.inventory.items
    .map((item, index) => ({ item, index }))
    .filter(
      (entry): entry is { item: NonNullable<typeof entry.item>; index: number } =>
        entry.item !== null && !beforeIds.has(entry.item.id),
    );
}

function replacedSlot(before: Unit, after: Unit) {
  for (const slot of Object.keys(after.equipment) as Array<keyof Unit['equipment']>) {
    if (before.equipment[slot]?.id !== after.equipment[slot]?.id) {
      return { slot, instance: after.equipment[slot] };
    }
  }
  return null;
}

/**
 * Construye la lista de eventos de presentación de una acción.
 *
 * Los eventos del motor se conservan tal cual. Solo se añade un evento sintético
 * cuando el comando cambia inventario o equipo, el motor no emitió eventos y el
 * estado cambió. Un rechazo emite `CommandRejected`, que ya viene en `events`.
 */
export function buildPresentationEvents(
  command: Command,
  initialState: GameState,
  finalState: GameState,
  events: readonly GameEvent[],
): PresentationEvent[] {
  const presentation: PresentationEvent[] = [...events];
  if (events.length > 0) return presentation;
  if (
    command.type !== 'PickUp' &&
    command.type !== 'EquipItem' &&
    command.type !== 'SelectWeapon' &&
    command.type !== 'DropItem' &&
    command.type !== 'UnequipItem'
  ) {
    return presentation;
  }

  const before = initialState.players.find((unit) => unit.id === command.unitId);
  const after = finalState.players.find((unit) => unit.id === command.unitId);
  if (!before || !after) return presentation;

  if (command.type === 'PickUp') {
    const added = additions(before, after)[0];
    if (!added) return presentation;
    presentation.push({
      type: 'PickUp',
      unitId: command.unitId,
      itemId: added.item.itemId,
      slot: added.index + 1,
    });
    return presentation;
  }

  if (command.type === 'DropItem') {
    const instance =
      command.from === 'backpack'
        ? before.inventory.items[command.index]
        : before.equipment[command.slot];
    if (!instance) return presentation;
    presentation.push({
      type: 'DropItem',
      unitId: command.unitId,
      itemId: instance.itemId,
      slot: command.from === 'backpack' ? command.index + 1 : 0,
    });
    return presentation;
  }

  if (command.type === 'UnequipItem') {
    const instance = before.equipment[command.slot];
    if (!instance) return presentation;
    presentation.push({
      type: 'UnequipItem',
      unitId: command.unitId,
      itemId: instance.itemId,
      slot: 0,
    });
    return presentation;
  }

  if (command.type === 'EquipItem' || command.type === 'SelectWeapon') {
    const changed = replacedSlot(before, after);
    if (!changed?.instance) return presentation;
    presentation.push({
      type: 'SelectWeapon',
      unitId: command.unitId,
      itemId: changed.instance.itemId,
      slot:
        command.type === 'SelectWeapon'
          ? command.slot
          : command.type === 'EquipItem' && command.from === 'backpack'
            ? command.index + 1
            : 1,
    });
  }

  return presentation;
}

import type { ItemId } from '../game/equipment';
import type { Command, GameEvent, GameState, Unit } from '../game/types';

/**
 * Eventos de presentación del host. `PickUp` y `SelectWeapon` no son eventos del
 * motor: el host los crea a partir del comando y del diff entre el estado antes
 * y después de despacharlo. Así la timeline y el estado intermedio los tratan
 * como cualquier otro evento sin añadirlos a `DispatchResult.events`.
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

export type PresentationEvent =
  | GameEvent
  | PickUpPresentationEvent
  | SelectWeaponPresentationEvent;

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
    command.type !== 'SelectWeapon'
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

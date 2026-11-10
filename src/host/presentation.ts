import type { Command, GameEvent, GameState } from '../game/types';
import type { WeaponId } from '../game/equipment';

/**
 * Eventos de presentación del host. `PickUp` y `SelectWeapon` no son eventos del
 * motor: el host los crea a partir del comando y del diff entre el estado antes
 * y después de despacharlo. Así la timeline y el estado intermedio los tratan
 * como cualquier otro evento sin añadirlos a `DispatchResult.events`.
 */
export interface PickUpPresentationEvent {
  readonly type: 'PickUp';
  readonly unitId: string;
  readonly weaponId: WeaponId;
  readonly slot: number;
}

export interface SelectWeaponPresentationEvent {
  readonly type: 'SelectWeapon';
  readonly unitId: string;
  readonly weaponId: WeaponId;
  readonly slot: number;
}

export type PresentationEvent =
  | GameEvent
  | PickUpPresentationEvent
  | SelectWeaponPresentationEvent;

/**
 * Construye la lista de eventos de presentación de una acción.
 *
 * Los eventos del motor se conservan tal cual. Solo se añade un evento sintético
 * cuando el comando es `PickUp` o `SelectWeapon`, el motor no emitió eventos
 * (esos comandos no producen `GameEvent`) y el estado cambió. Un rechazo emite
 * `CommandRejected`, que ya viene en `events`, así que no se inventa nada.
 */
export function buildPresentationEvents(
  command: Command,
  initialState: GameState,
  finalState: GameState,
  events: readonly GameEvent[],
): PresentationEvent[] {
  const presentation: PresentationEvent[] = [...events];

  // PickUp/SelectWeapon exitosos no emiten eventos; un rechazo sí. Cualquier
  // evento del motor ya describe la acción y no necesita un evento sintético.
  if (events.length > 0) return presentation;

  if (command.type === 'PickUp') {
    const before = initialState.players.find((unit) => unit.id === command.unitId);
    const after = finalState.players.find((unit) => unit.id === command.unitId);
    if (!before || !after) return presentation;

    const weaponId = after.equipment.weaponId;
    if (!weaponId) return presentation;

    const mapChanged =
      (initialState.map?.weapons?.length ?? 0) !==
      (finalState.map?.weapons?.length ?? 0);
    const changed =
      mapChanged ||
      before.mp !== after.mp ||
      before.weapons !== after.weapons ||
      before.equipment !== after.equipment;
    if (!changed) return presentation;

    presentation.push({
      type: 'PickUp',
      unitId: command.unitId,
      weaponId,
      slot: after.weapons.indexOf(weaponId) + 1,
    });
    return presentation;
  }

  if (command.type === 'SelectWeapon') {
    const before = initialState.players.find((unit) => unit.id === command.unitId);
    const after = finalState.players.find((unit) => unit.id === command.unitId);
    if (!before || !after) return presentation;
    if (before.equipment.weaponId === after.equipment.weaponId) return presentation;

    const weaponId = after.equipment.weaponId;
    if (!weaponId) return presentation;

    presentation.push({
      type: 'SelectWeapon',
      unitId: command.unitId,
      weaponId,
      slot: command.slot,
    });
  }

  return presentation;
}

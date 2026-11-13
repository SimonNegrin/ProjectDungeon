/**
 * Modelo puro del menú de hechizos (REQ-025 R-011/T-004).
 *
 * Deriva la lista, la disponibilidad y la selección del catálogo y del estado
 * del motor. No conoce DOM ni teclado: `input.ts` traduce pulsaciones y la
 * vista pinta este modelo.
 */

import { MAX_SPELLS_PER_TURN } from '../game/magic';
import { SPELLS, type SpellDefinition, type SpellId } from '../game/spells';
import type { GameState, Unit } from '../game/types';

/** Orden estable del catálogo, usado por la lista y las teclas 1-6. */
export const SPELL_ORDER: readonly SpellId[] = Object.values(SPELLS).map(
  (spell) => spell.id,
);

export type SpellAvailability = 'available' | 'level' | 'mana' | 'limit';

export const SPELL_AVAILABILITY_LABELS: Readonly<
  Record<SpellAvailability, string>
> = {
  available: 'disponible',
  level: 'nivel',
  mana: 'maná',
  limit: 'tope',
};

export interface SpellMenuSelection {
  readonly open: boolean;
  /** Fila resaltada mientras la lista está abierta. */
  readonly index: number;
  /** Hechizo seleccionado para `X`; persiste al cerrar la lista. */
  readonly selectedId: SpellId | null;
}

export const INITIAL_SPELL_MENU: SpellMenuSelection = {
  open: false,
  index: 0,
  selectedId: null,
};

export interface SpellMenuItem {
  readonly id: SpellId;
  readonly name: string;
  readonly minLevel: number;
  readonly cost: number;
  readonly availability: SpellAvailability;
  readonly availabilityLabel: string;
  /** Fila resaltada (lista abierta) o hechizo seleccionado (lista cerrada). */
  readonly selected: boolean;
}

export interface SpellMenuModel {
  readonly open: boolean;
  readonly selectedId: SpellId | null;
  readonly items: readonly SpellMenuItem[];
  readonly hint: string;
}

/**
 * Motivo por el que un hechizo no está disponible, en el orden que importa al
 * jugador: nivel, maná y tope. `available` es el único estado lanzable.
 */
export function spellAvailability(
  caster: Unit,
  spell: SpellDefinition,
): SpellAvailability {
  if (caster.stats.magicLevel < spell.minLevel) return 'level';
  if (caster.mana.current < spell.cost) return 'mana';
  if (caster.spellsCast >= MAX_SPELLS_PER_TURN) return 'limit';
  return 'available';
}

/** Mueve la fila resaltada con vuelta circular; no selecciona por sí sola. */
export function moveSpellSelection(
  index: number,
  delta: number,
  count = SPELL_ORDER.length,
): number {
  if (count <= 0) return 0;
  return ((index + delta) % count + count) % count;
}

/** Índice de un hechizo en el orden de la lista; -1 si no existe. */
export function spellIndex(id: SpellId | null): number {
  return id === null ? -1 : SPELL_ORDER.indexOf(id);
}

function activePlayer(state: GameState): Unit | undefined {
  return state.players.find((player) => player.hp > 0) ?? state.players[0];
}

/** Modelo de la lista para pintar; no muta el estado ni la selección. */
export function buildSpellMenuModel(
  state: GameState,
  selection: SpellMenuSelection,
): SpellMenuModel {
  const caster = activePlayer(state);
  const count = SPELL_ORDER.length;
  const index = count === 0 ? 0 : Math.min(Math.max(0, selection.index), count - 1);

  const items = SPELL_ORDER.map((id, itemIndex) => {
    const spell = SPELLS[id];
    const availability = caster
      ? spellAvailability(caster, spell)
      : ('level' as const);
    return {
      id,
      name: spell.name,
      minLevel: spell.minLevel,
      cost: spell.cost,
      availability,
      availabilityLabel: SPELL_AVAILABILITY_LABELS[availability],
      selected: selection.open
        ? itemIndex === index
        : selection.selectedId === id,
    };
  });

  return {
    open: selection.open,
    selectedId: selection.selectedId,
    items,
    hint: '↑/↓ mover · 1-6 elegir · Enter lanzar · Esc cerrar',
  };
}

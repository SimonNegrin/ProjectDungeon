import { ITEMS } from '../game/equipment';
import { hasLineOfSight } from '../game/perception';
import { rosterEntry } from '../game/roster';
import { effectiveStats } from '../game/stats';
import type { Door } from '../game/map';
import type { GameState, Position, Unit } from '../game/types';
import {
  itemStatsText,
  PANEL_SLOT_LABELS,
  type PanelSelection,
} from './inventory-panel';
import { profileRows, type BandRow } from './damage-labels';

/**
 * Tipos del detalle bajo el cursor. `container` queda reservado para REQ-020:
 * el modelo lo admite, pero esta tarea no lee `state.containers` ni lo pinta.
 */
export type CursorDetailKind =
  | 'enemy'
  | 'ally'
  | 'item'
  | 'door'
  | 'terrain'
  | 'unknown'
  | 'container';

export interface CursorDetailRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Composición pura de la columna derecha. Es de solo lectura: se deriva del
 * snapshot y no guarda ni muta estado de juego.
 */
export interface CursorDetail {
  readonly kind: CursorDetailKind;
  readonly title: string;
  readonly subtitle: string | null;
  readonly rows: readonly CursorDetailRow[];
  /** PV y magia/maná del enemigo visible, con IDs estables de compatibilidad. */
  readonly vitals: readonly CursorDetailRow[];
  readonly notes: readonly string[];
  /** Bandas de resistencia de un enemigo visible; `null` en el resto. */
  readonly bands: readonly BandRow[] | null;
}

export const UNKNOWN_TITLE = 'Desconocido';

/**
 * Ficha del HUD derecho con el panel abierto (REQ-023 R-009 / REQ-032 R-011).
 * Dos bloques independientes: el objeto seleccionado y el equipado en su hueco.
 * No hay comparación ni delta numérico.
 */
export interface PanelDetailBlock {
  readonly id: 'selected' | 'equipped';
  readonly title: string;
  readonly subtitle: string;
  readonly rows: readonly CursorDetailRow[];
  readonly traits: string;
  readonly description: string;
  readonly empty: boolean;
}

export interface PanelDetail {
  readonly kind: 'panel';
  readonly blocks: readonly [PanelDetailBlock, PanelDetailBlock];
}

export const DOOR_STYLE_LABELS = {
  wood: 'Madera',
  metal: 'Metal',
  grated: 'Rejilla',
} as const;

export function formatHp(unit: Unit | undefined): string {
  return unit ? `${unit.hp}/${unit.maxHp}` : '—/—';
}

export function formatMp(unit: Unit | undefined): string {
  return unit ? `${unit.mp}/${unit.maxMp}` : '—/—';
}

export function formatMagic(unit: Unit | undefined): string {
  return unit ? String(unit.stats.magicLevel) : '—';
}

export function formatMana(unit: Unit | undefined): string {
  return unit ? `${unit.mana.current}/${unit.mana.max}` : '—/—';
}

export function formatActions(unit: Unit | undefined): string {
  return unit ? `${unit.actions.remaining}/${unit.actions.max}` : '—/—';
}

export function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function weaponLabel(unit: Unit | undefined): string {
  if (!unit) return '—';
  const profile = effectiveStats(unit);
  if (profile.weapon === null) return 'Sin arma';
  const damage = profile.weapon.damagePackets.reduce(
    (total, packet) => total + packet.amount,
    0,
  );
  return `${profile.weapon.name} ${signed(profile.accuracy)}/${signed(damage)}`;
}

export function shieldLabel(unit: Unit | undefined): string {
  if (!unit) return 'Sin escudo';
  const profile = effectiveStats(unit);
  if (profile.shield === null) return 'Sin escudo';
  return `${profile.shield.name} ${signed(profile.evasion)}`;
}

export function armorLabel(unit: Unit | undefined): string {
  if (!unit) return 'Sin armadura';
  const profile = effectiveStats(unit);
  if (profile.armor === null) return 'Sin armadura';
  return `${profile.armor.name} ${signed(profile.absorption)}`;
}

export function statsLabel(unit: Unit | undefined): string {
  if (!unit) return '—';
  const { habilidad, fuerza, defensa } = effectiveStats(unit).stats;
  return `${signed(habilidad)} habilidad · ${signed(fuerza)} fuerza · ${signed(defensa)} defensa`;
}

export function archetypeLabel(unit: Unit | undefined): string {
  return unit?.archetypeId ? rosterEntry(unit.archetypeId).name : '—';
}

/** La condición fantasma solo se muestra; no toca la mecánica de REQ-021. */
export function conditionLabel(unit: Unit | undefined): string | null {
  return unit && unit.hp <= 0 ? 'Fantasma' : null;
}

/**
 * Traits de las definiciones equipadas. El catálogo actual no declara ninguno;
 * esta función devuelve el estado vacío real y no inventa notas de recorte.
 */
export function traitsLabel(unit: Unit | undefined): string {
  if (!unit) return 'Sin traits activos';
  const traits = Object.values(unit.equipment)
    .filter((instance) => instance !== null)
    .flatMap((instance) => ITEMS[instance.itemId].traits);
  if (traits.length === 0) return 'Sin traits activos';
  return traits.map((trait) => `${trait.id}: ${trait.description}`).join(' · ');
}

function row(id: string, label: string, value: string): CursorDetailRow {
  return { id, label, value };
}

function unknown(notes: readonly string[] = []): CursorDetail {
  return {
    kind: 'unknown',
    title: UNKNOWN_TITLE,
    subtitle: null,
    rows: [],
    vitals: [],
    notes,
    bands: null,
  };
}

function inBounds(state: GameState, position: Position): boolean {
  return (
    Number.isInteger(position.x) &&
    Number.isInteger(position.y) &&
    position.x >= 0 &&
    position.y >= 0 &&
    position.x < state.grid.width &&
    position.y < state.grid.height
  );
}

/** Un jugador vivo debe ver la casilla; la decisión la toma el motor. */
export function cursorVisible(state: GameState, cursor?: Position): boolean {
  if (!cursor || !inBounds(state, cursor)) return false;
  return state.players.some(
    (player) => player.hp > 0 && hasLineOfSight(state.grid, player, cursor),
  );
}

function unitAt(units: readonly Unit[], position: Position): Unit | undefined {
  return units.find(
    (unit) => unit.hp > 0 && unit.x === position.x && unit.y === position.y,
  );
}

function allyAt(state: GameState, position: Position): Unit | undefined {
  // Un jugador fantasma sigue siendo un aliado: se describe su estado, no se
  // oculta la unidad muerta como si fuera terreno.
  return state.players.find(
    (unit) => unit.x === position.x && unit.y === position.y,
  );
}

function enemyDetail(enemy: Unit): CursorDetail {
  const vitals: CursorDetailRow[] = [row('pv', 'PV', formatHp(enemy))];
  if (enemy.stats.magicLevel > 0 || enemy.mana.max > 0) {
    vitals.push(row('magia', 'Magia', formatMagic(enemy)));
    vitals.push(row('mana', 'Maná', formatMana(enemy)));
  }

  return {
    kind: 'enemy',
    title: enemy.nombre,
    subtitle: 'Enemigo',
    rows: [
      row('arma', 'Arma', weaponLabel(enemy)),
      row('escudo', 'Escudo', shieldLabel(enemy)),
      row('armadura', 'Armadura', armorLabel(enemy)),
      row('acciones', 'Acciones', formatActions(enemy)),
    ],
    vitals,
    notes: [],
    bands: profileRows(enemy.stats.resistencia),
  };
}

function allyDetail(ally: Unit): CursorDetail {
  const condition = conditionLabel(ally);
  if (condition !== null) {
    return {
      kind: 'ally',
      title: ally.nombre,
      subtitle: `Aliado · ${archetypeLabel(ally)}`,
      rows: [
        row('estado', 'Estado', condition),
        row('pv', 'PV', formatHp(ally)),
        row('mp', 'MP', formatMp(ally)),
        row('acciones', 'Acciones', formatActions(ally)),
        row('atributos', 'Atributos', statsLabel(ally)),
        ...(ally.mana.max > 0 ? [row('mana', 'Maná', formatMana(ally))] : []),
      ],
      vitals: [],
      notes: ['Fantasma: sin equipo ni inventario'],
      bands: null,
    };
  }

  return {
    kind: 'ally',
    title: ally.nombre,
    subtitle: 'Aliado',
    rows: [
      row('arquetipo', 'Arquetipo', archetypeLabel(ally)),
      row('pv', 'PV', formatHp(ally)),
      row('mp', 'MP', formatMp(ally)),
      row('acciones', 'Acciones', formatActions(ally)),
      row('atributos', 'Atributos', statsLabel(ally)),
      row('arma', 'Arma', weaponLabel(ally)),
      row('escudo', 'Escudo', shieldLabel(ally)),
      row('armadura', 'Armadura', armorLabel(ally)),
      ...(ally.mana.max > 0 ? [row('mana', 'Maná', formatMana(ally))] : []),
    ],
    vitals: [],
    notes: [],
    bands: null,
  };
}

function doorDetail(door: Door): CursorDetail {
  const rows: CursorDetailRow[] = [];
  if (door.style !== undefined) {
    rows.push(row('tipo', 'Tipo', DOOR_STYLE_LABELS[door.style]));
  }
  rows.push(row('sala', 'Sala', String(door.roomId)));
  return {
    kind: 'door',
    title: 'Puerta',
    subtitle: null,
    rows,
    vitals: [],
    notes: [],
    bands: null,
  };
}

function terrainDetail(state: GameState, cursor: Position): CursorDetail {
  if (
    state.map?.entrance &&
    state.map.entrance.position.x === cursor.x &&
    state.map.entrance.position.y === cursor.y
  ) {
    return {
      kind: 'terrain',
      title: 'Entrada',
      subtitle: null,
      rows: [row('terreno', 'Terreno', 'Entrada')],
      vitals: [],
      notes: [],
      bands: null,
    };
  }

  if (
    state.map?.exit &&
    state.map.exit.position.x === cursor.x &&
    state.map.exit.position.y === cursor.y
  ) {
    return {
      kind: 'terrain',
      title: 'Salida',
      subtitle: null,
      rows: [row('terreno', 'Terreno', 'Salida')],
      vitals: [],
      notes: [],
      bands: null,
    };
  }

  const index = cursor.y * state.grid.width + cursor.x;
  const tile = state.grid.tiles[index] ?? 'wall';
  return {
    kind: 'terrain',
    title: tile === 'wall' ? 'Muro' : 'Suelo',
    subtitle: null,
    rows: [row('terreno', 'Terreno', tile === 'wall' ? 'Muro' : 'Suelo')],
    vitals: [],
    notes: [],
    bands: null,
  };
}

/**
 * Resuelve la casilla del cursor en este orden: unidad, objeto, puerta,
 * terreno y desconocido. Sin línea de visión de ningún jugador vivo devuelve
 * «desconocido» sin revelar tipo, nombre, stats ni contenido.
 */
export function buildCursorDetail(state: GameState, cursor?: Position): CursorDetail {
  if (!cursor) return unknown();
  if (!inBounds(state, cursor)) return unknown(['Fuera del mapa']);
  if (!cursorVisible(state, cursor)) return unknown(['Sin línea de visión']);

  const ally = allyAt(state, cursor);
  if (ally) return allyDetail(ally);

  const enemy = unitAt(state.enemies, cursor);
  if (enemy) return enemyDetail(enemy);

  const item = (state.groundItems ?? []).find(
    (entry) => entry.x === cursor.x && entry.y === cursor.y,
  );
  if (item) {
    return {
      kind: 'item',
      title: ITEMS[item.itemId].name,
      subtitle: 'Objeto en el suelo',
      rows: [row('ubicacion', 'Ubicación', 'Suelo')],
      vitals: [],
      notes: [],
      bands: null,
    };
  }

  // Los contenedores de REQ-023 quedan tipados, pero no se leen de
  // `state.containers` ni se renderizan en esta tarea.
  const door = (state.map?.doors ?? []).find(
    (entry) => entry.x === cursor.x && entry.y === cursor.y,
  );
  if (door) return doorDetail(door);

  return terrainDetail(state, cursor);
}

function panelZoneLabel(selection: PanelSelection): string {
  if (selection.zone === 'equipment' || selection.key.startsWith('slot:')) {
    return 'Equipado';
  }
  if (selection.zone === 'backpack' || selection.key.startsWith('backpack:')) {
    return 'En mochila';
  }
  return 'En el suelo';
}

function panelTraits(
  traits: readonly { readonly id: string; readonly description: string }[],
): string {
  if (traits.length === 0) return 'Sin traits activos';
  return traits.map((trait) => `${trait.id}: ${trait.description}`).join(' · ');
}

function selectedBlock(selection: PanelSelection): PanelDetailBlock {
  const item = ITEMS[selection.itemId];
  return {
    id: 'selected',
    title: item.name,
    subtitle: panelZoneLabel(selection),
    rows: [{ id: 'stats', label: 'Stats', value: itemStatsText(item) }],
    traits: panelTraits(item.traits),
    description: item.description,
    empty: false,
  };
}

function equippedBlock(
  unit: Unit | undefined,
  selection: PanelSelection,
): PanelDetailBlock {
  const item = ITEMS[selection.itemId];
  const slotLabel = PANEL_SLOT_LABELS[item.slot] ?? String(item.slot);
  const equipped = unit?.equipment[item.slot] ?? null;
  if (!equipped) {
    return {
      id: 'equipped',
      title: 'Vacío',
      subtitle: `Equipado · ${slotLabel}`,
      rows: [],
      traits: 'Sin traits activos',
      description: 'Sin objeto equipado en este hueco',
      empty: true,
    };
  }
  const equippedItem = ITEMS[equipped.itemId];
  return {
    id: 'equipped',
    title: equippedItem.name,
    subtitle: `Equipado · ${slotLabel}`,
    rows: [
      { id: 'stats', label: 'Stats', value: itemStatsText(equippedItem) },
    ],
    traits: panelTraits(equippedItem.traits),
    description: equippedItem.description,
    empty: false,
  };
}

/**
 * Compone la ficha de dos bloques sin comparar ni restar stats. Resuelve la
 * misma unidad que el panel (`players.find(hp > 0) ?? players[0]`).
 */
export function buildPanelDetail(
  state: GameState,
  selection: PanelSelection,
  unitId?: string,
): PanelDetail {
  const unit =
    unitId !== undefined
      ? state.players.find((player) => player.id === unitId)
      : (state.players.find((player) => player.hp > 0) ?? state.players[0]);
  return {
    kind: 'panel',
    blocks: [selectedBlock(selection), equippedBlock(unit, selection)],
  };
}

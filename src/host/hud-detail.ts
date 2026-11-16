import {
  ITEMS,
  type ItemAttribute,
  type ItemDefinition,
  type ItemSpriteRect,
  type ItemTrait,
} from '../game/equipment';
import { hasLineOfSight } from '../game/perception';
import { activePlayer } from '../game/party';
import { ROSTER } from '../game/roster';
import { effectiveStats } from '../game/stats';
import type { Door } from '../game/map';
import type { Container, GameState, Position, Unit } from '../game/types';
import type { PanelSelection } from './inventory-panel';
import { PANEL_SLOT_LABELS } from './inventory-panel';
import { profileRows, type BandRow } from './damage-labels';
import { statBreakdown, type StatBreakdownRow } from './stat-breakdown';
import { traitText } from './trait-labels';

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

/** Stat de un objeto: valor delante del nombre, p. ej. `+3 Acierto`. */
export interface DetailStat {
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
  readonly rows: readonly CursorDetailRow[];
  /** Stats de un objeto, una fila por stat; vacío en el resto de tipos. */
  readonly stats: readonly DetailStat[];
  /** Traits legibles; vacío cuando el catálogo no declara ninguno. */
  readonly traits: readonly string[];
  /** Recorte de `items.png`; `null` cuando la casilla no es un objeto. */
  readonly sprite: ItemSpriteRect | null;
  /** PV y magia/maná del enemigo visible, con IDs estables de compatibilidad. */
  readonly vitals: readonly CursorDetailRow[];
  readonly notes: readonly string[];
  /** Bandas de resistencia de un enemigo visible; `null` en el resto. */
  readonly bands: readonly BandRow[] | null;
}

export const UNKNOWN_TITLE = 'Desconocido';

/**
 * Ficha del HUD derecho con el panel abierto (REQ-023 R-009 / REQ-033 R-011).
 * Dos bloques independientes: el objeto seleccionado y el equipado en su hueco.
 * No hay comparación ni delta numérico.
 */
export interface PanelDetailBlock {
  readonly id: 'selected' | 'equipped';
  /** Etiqueta pequeña opcional; el bloque seleccionado no lleva «Seleccionado». */
  readonly label: string | null;
  readonly title: string;
  readonly stats: readonly DetailStat[];
  readonly traits: readonly string[];
  readonly sprite: ItemSpriteRect | null;
  readonly empty: boolean;
}

export interface PanelDetail {
  readonly kind: 'panel';
  readonly blocks: readonly [PanelDetailBlock, PanelDetailBlock];
  /** Desglose inherente/equipo/traits por atributo, con los totales del motor. */
  readonly stats: readonly StatBreakdownRow[];
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

/**
 * Atributos del personaje como entradas de lista, una por atributo. El HUD
 * izquierdo y la ficha del aliado consumen esta misma fuente (R-026, T-016).
 */
export function unitStatEntries(
  unit: Unit | undefined,
): readonly DetailStat[] {
  if (!unit) return [];
  const { habilidad, fuerza, defensa } = effectiveStats(unit).stats;
  return [
    { id: 'habilidad', label: 'habilidad', value: signed(habilidad) },
    { id: 'fuerza', label: 'fuerza', value: signed(fuerza) },
    { id: 'defensa', label: 'defensa', value: signed(defensa) },
  ];
}

/** Líneas de atributos en el orden del HUD; `—` sin unidad. */
export function statLines(unit: Unit | undefined): readonly string[] {
  const entries = unitStatEntries(unit);
  if (entries.length === 0) return ['—'];
  return entries.map((stat) => `${stat.value} ${stat.label}`);
}

/** Cadena de una sola línea solo para el overlay de `F1`. */
export function statsLabel(unit: Unit | undefined): string {
  return statLines(unit).join(' · ');
}

export function archetypeLabel(unit: Unit | undefined): string {
  const id = unit?.archetypeId;
  // Un snapshot con un id fuera del roster no debe romper el HUD: el arquetipo
  // queda como guion y la miniatura cae en el recorte seguro (`null`).
  return id && id in ROSTER ? ROSTER[id].name : '—';
}

/** La condición fantasma solo se muestra; no toca la mecánica de REQ-021. */
export function conditionLabel(unit: Unit | undefined): string | null {
  return unit && unit.hp <= 0 ? 'Fantasma' : null;
}

/** Atributos numéricos del catálogo, en el orden en que los lee la ficha. */
const ITEM_ATTRIBUTE_LABELS: readonly (readonly [ItemAttribute, string])[] = [
  ['habilidad', 'Habilidad'],
  ['fuerza', 'Fuerza'],
  ['defensa', 'Defensa'],
  ['punteria', 'Puntería'],
  ['acciones', 'Acciones'],
];

function damageTotal(item: ItemDefinition): number {
  return item.damagePackets.reduce(
    (total, packet) => total + packet.amount,
    0,
  );
}

/**
 * Stats de un objeto, uno por fila y con el valor delante (`+3 Acierto`). Solo
 * lee el catálogo: los modificadores primero y después el dato de la categoría.
 */
export function itemStats(item: ItemDefinition): readonly DetailStat[] {
  const stats: DetailStat[] = ITEM_ATTRIBUTE_LABELS.flatMap(
    ([attribute, label]) => {
      const value = item.modifiers[attribute];
      return value === undefined
        ? []
        : [{ id: `mod-${attribute}`, label, value: signed(value) }];
    },
  );
  switch (item.category) {
    case 'weapon':
      stats.push(
        {
          id: 'acierto',
          label: 'Acierto',
          value: signed(item.accuracy ?? 0),
        },
        { id: 'dano', label: 'Daño', value: signed(damageTotal(item)) },
      );
      break;
    case 'armor':
      stats.push({
        id: 'absorcion',
        label: 'Absorción',
        value: signed(item.absorption ?? 0),
      });
      break;
    case 'shield':
      stats.push({
        id: 'defensa',
        label: 'Defensa',
        value: signed(item.evasion ?? 0),
      });
      break;
    case 'ring':
    case 'neck':
    case 'hands':
      break;
  }
  return stats;
}

/** Traits del catálogo, uno por línea, con nombre, descripción y efecto. */
export function itemTraits(
  traits: readonly ItemTrait[],
): readonly string[] {
  return traits.map((trait) => traitText(trait.id, trait.description));
}

/**
 * Traits activos del portador con su fuente (objeto y hueco). Usa el perfil del
 * motor para respetar el stacking único; si un fixture declara un trait fuera
 * del catálogo, conserva su texto para no ocultar datos de test.
 */
export function unitTraits(unit: Unit | undefined): readonly string[] {
  if (!unit) return [];
  const profile = effectiveStats(unit);
  const lines = profile.traits.map((trait) =>
    traitText(trait.id, trait.description, {
      itemName: ITEMS[trait.itemId].name,
      slotLabel: PANEL_SLOT_LABELS[trait.slot],
    }),
  );
  const known = new Set(profile.traits.map((trait) => trait.id));
  for (const instance of Object.values(unit.equipment)) {
    if (instance === null) continue;
    for (const itemTrait of ITEMS[instance.itemId].traits) {
      if (known.has(itemTrait.id)) continue;
      known.add(itemTrait.id);
      lines.push(traitText(itemTrait.id, itemTrait.description));
    }
  }
  return lines;
}

/**
 * Resumen compacto para el HUD izquierdo y la ficha del aliado: nombre y hueco
 * de origen, sin descripción. La descripción completa vive en la ficha del
 * objeto y en `F1`, donde hay espacio para leerla.
 */
export function unitTraitSummary(unit: Unit | undefined): readonly string[] {
  if (!unit) return [];
  const profile = effectiveStats(unit);
  const lines = profile.traits.map(
    (trait) => `${trait.name} (${PANEL_SLOT_LABELS[trait.slot]})`,
  );
  const known = new Set(profile.traits.map((trait) => trait.id));
  for (const instance of Object.values(unit.equipment)) {
    if (instance === null) continue;
    for (const itemTrait of ITEMS[instance.itemId].traits) {
      if (known.has(itemTrait.id)) continue;
      known.add(itemTrait.id);
      lines.push(`${itemTrait.id}: ${itemTrait.description}`);
    }
  }
  return lines;
}

function row(id: string, label: string, value: string): CursorDetailRow {
  return { id, label, value };
}

function unknown(notes: readonly string[] = []): CursorDetail {
  return {
    kind: 'unknown',
    title: UNKNOWN_TITLE,
    rows: [],
    stats: [],
    traits: [],
    sprite: null,
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

/** Detalle del enemigo que actúa en la fase enemiga (REQ-031 R-009). */
export function enemyDetail(enemy: Unit): CursorDetail {
  const vitals: CursorDetailRow[] = [row('pv', 'PV', formatHp(enemy))];
  if (enemy.stats.magicLevel > 0 || enemy.mana.max > 0) {
    vitals.push(row('magia', 'Magia', formatMagic(enemy)));
    vitals.push(row('mana', 'Maná', formatMana(enemy)));
  }

  return {
    kind: 'enemy',
    title: enemy.nombre,
    rows: [
      row('arma', 'Arma', weaponLabel(enemy)),
      row('escudo', 'Escudo', shieldLabel(enemy)),
      row('armadura', 'Armadura', armorLabel(enemy)),
      row('acciones', 'Acciones', formatActions(enemy)),
    ],
    stats: [],
    traits: [],
    sprite: null,
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
      rows: [
        row('estado', 'Estado', condition),
        row('pv', 'PV', formatHp(ally)),
        row('mp', 'MP', formatMp(ally)),
        row('acciones', 'Acciones', formatActions(ally)),
        ...(ally.mana.max > 0 ? [row('mana', 'Maná', formatMana(ally))] : []),
      ],
      stats: unitStatEntries(ally),
      traits: [],
      sprite: null,
      vitals: [],
      notes: ['Fantasma: sin equipo ni inventario'],
      bands: null,
    };
  }

  return {
    kind: 'ally',
    title: ally.nombre,
    rows: [
      row('arquetipo', 'Arquetipo', archetypeLabel(ally)),
      row('pv', 'PV', formatHp(ally)),
      row('mp', 'MP', formatMp(ally)),
      row('acciones', 'Acciones', formatActions(ally)),
      row('arma', 'Arma', weaponLabel(ally)),
      row('escudo', 'Escudo', shieldLabel(ally)),
      row('armadura', 'Armadura', armorLabel(ally)),
      ...(ally.mana.max > 0 ? [row('mana', 'Maná', formatMana(ally))] : []),
    ],
    stats: unitStatEntries(ally),
    traits: unitTraitSummary(ally),
    sprite: null,
    vitals: [],
    notes: [],
    bands: null,
  };
}

/**
 * Cofre bajo el cursor (REQ-023 R-004/T-006). Un cofre cerrado declara tipo y
 * estado sin contenido; uno abierto muestra sus objetos. Nunca se lee ni se
 * filtra una trampa: el modelo no la tiene.
 */
function chestDetail(container: Container): CursorDetail {
  const opened = container.opened === true;
  const items = container.items.filter(
    (item): item is NonNullable<Container['items'][number]> => item !== null,
  );
  const rows: CursorDetailRow[] = [
    row('estado', 'Estado', opened ? 'Abierto' : 'Cerrado'),
    row('tipo', 'Tipo', 'Cofre'),
  ];
  if (opened) {
    rows.push(
      row(
        'contenido',
        'Contenido',
        items.length === 0
          ? 'Vacío'
          : items.map((item) => ITEMS[item.itemId].name).join(', '),
      ),
    );
  }
  return {
    kind: 'container',
    title: 'Cofre',
    rows,
    stats: [],
    traits: [],
    sprite: null,
    vitals: [],
    notes: opened
      ? []
      : ['Se abre con Espacio/Enter desde una casilla adyacente'],
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
    rows,
    stats: [],
    traits: [],
    sprite: null,
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
      rows: [],
      stats: [],
      traits: [],
      sprite: null,
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
      rows: [],
      stats: [],
      traits: [],
      sprite: null,
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
    rows: [],
    stats: [],
    traits: [],
    sprite: null,
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
    const definition = ITEMS[item.itemId];
    return {
      kind: 'item',
      title: definition.name,
      rows: [row('ubicacion', 'Ubicación', 'Suelo')],
      stats: itemStats(definition),
      traits: itemTraits(definition.traits),
      sprite: definition.sprite.rect,
      vitals: [],
      notes: [],
      bands: null,
    };
  }

  // Los cofres se leen del contenedor del motor: cerrado no revela contenido.
  const container = (state.containers ?? []).find(
    (entry) =>
      entry.kind === 'chest' &&
      entry.x === cursor.x &&
      entry.y === cursor.y,
  );
  if (container) return chestDetail(container);

  // Las puertas son decorativas; el panel no sugiere que se abran.
  const door = (state.map?.doors ?? []).find(
    (entry) => entry.x === cursor.x && entry.y === cursor.y,
  );
  if (door) return doorDetail(door);

  return terrainDetail(state, cursor);
}

function selectedBlock(selection: PanelSelection): PanelDetailBlock {
  const item = ITEMS[selection.itemId];
  return {
    id: 'selected',
    label: null,
    title: item.name,
    stats: itemStats(item),
    traits: itemTraits(item.traits),
    sprite: item.sprite.rect,
    empty: false,
  };
}

function equippedBlock(
  unit: Unit | undefined,
  selection: PanelSelection,
): PanelDetailBlock {
  const item = ITEMS[selection.itemId];
  const equipped = unit?.equipment[item.slot] ?? null;
  if (!equipped) {
    return {
      id: 'equipped',
      label: 'Equipado',
      title: 'Vacío',
      stats: [],
      traits: [],
      sprite: null,
      empty: true,
    };
  }
  const equippedItem = ITEMS[equipped.itemId];
  return {
    id: 'equipped',
    label: 'Equipado',
    title: equippedItem.name,
    stats: itemStats(equippedItem),
    traits: itemTraits(equippedItem.traits),
    sprite: equippedItem.sprite.rect,
    empty: false,
  };
}

/**
 * Misma resolución que el panel: `unitId` explícito o, sin él, el jugador
 * activo y vivo. Sin activo válido no hay portador y el panel no se abre.
 */
function detailUnit(state: GameState, unitId?: string): Unit | undefined {
  if (unitId !== undefined) {
    return state.players.find((player) => player.id === unitId);
  }
  const active = activePlayer(state);
  return active !== undefined && active.hp > 0 ? active : undefined;
}

/**
 * Compone la ficha de dos bloques sin comparar ni restar stats. Sin `unitId`
 * resuelve la misma unidad que el panel: el jugador activo y vivo, o ninguna.
 */
export function buildPanelDetail(
  state: GameState,
  selection: PanelSelection,
  unitId?: string,
): PanelDetail {
  const unit = detailUnit(state, unitId);
  return {
    kind: 'panel',
    blocks: [selectedBlock(selection), equippedBlock(unit, selection)],
    stats: unit ? statBreakdown(unit) : [],
  };
}

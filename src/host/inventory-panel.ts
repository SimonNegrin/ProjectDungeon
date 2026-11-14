/**
 * Modelo puro del panel de personaje (REQ-018 R-015 a R-017, T-008/T-009).
 *
 * El host no valida huecos, manos ni capacidad: convierte el estado del motor en
 * filas legibles y comandos que se despachan solo al confirmar. Los costes y los
 * rechazos vienen del motor. La agregación de stats pasa siempre por
 * `effectiveStats`/`aggregateEffectiveStats`; aquí no se suma equipo a mano.
 */

import {
  EQUIPMENT_SLOTS,
  ITEMS,
  type EquipmentSlot,
  type ItemDefinition,
  type ItemId,
  type ItemSpriteRect,
} from '../game/equipment';
import {
  backpackCount,
  INVENTORY_OPERATION_COST,
  type GroundItem,
} from '../game/inventory';
import {
  aggregateEffectiveStats,
  effectiveStats,
  equippedDefinitions,
} from '../game/stats';
import type {
  Command,
  DamagePacket,
  GameState,
  RejectionReason,
  Unit,
} from '../game/types';

export const PANEL_SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  weapon: 'Arma',
  shield: 'Escudo',
  armor: 'Armadura',
  head: 'Casco',
  feet: 'Botas',
  hands: 'Guantes',
  neck: 'Collar',
  ring: 'Anillo',
};

/** Atributos numéricos que el panel desglosa; la resistencia vive en el HUD. */
type NumericStat = 'habilidad' | 'fuerza' | 'defensa' | 'punteria' | 'acciones';

const ATTRIBUTES: readonly (readonly [NumericStat, string])[] = [
  ['habilidad', 'Habilidad'],
  ['fuerza', 'Fuerza'],
  ['defensa', 'Defensa'],
  ['punteria', 'Puntería'],
  ['acciones', 'Acciones'],
];

export type PanelActionKind = 'equip' | 'unequip' | 'pickup' | 'drop';

/** Acción confirmable de una fila; siempre lleva el comando del motor. */
export interface PanelAction {
  readonly kind: PanelActionKind;
  readonly label: string;
  readonly command: Command;
}

/**
 * Opción del submenú contextual (`Enter` sobre el objeto). Añade el coste y el
 * motivo al comando; construirla no despacha ni gasta MP.
 */
export interface PanelMenuOption extends PanelAction {
  /** Coste anunciado antes de confirmar, p. ej. `1 MP`. */
  readonly costLabel: string;
  /** `true` con MP insuficiente: la opción se muestra con su motivo. */
  readonly disabled: boolean;
  /** Motivo legible cuando la opción no está disponible. */
  readonly reason: string | null;
}

/** Selección publicada por la vista para la ficha del HUD derecho. */
export interface PanelSelection {
  readonly key: string;
  readonly itemId: ItemId;
  readonly instanceId: string;
  readonly zone: string;
}

/** Comparación antes/después de equipar un objeto concreto. */
export interface PanelComparisonRow {
  readonly label: string;
  readonly before: string;
  readonly after: string;
}

/** Fila de equipo, mochila o suelo. `key` es estable entre refrescos. */
export interface PanelItem {
  readonly key: string;
  /** `true` para huecos vacíos: no hay acciones ni comparación. */
  readonly empty: boolean;
  /** Definición del catálogo; `null` en un hueco vacío. */
  readonly itemId: ItemId | null;
  /** Identidad de instancia; N-008 la sigue cuando la fila cambia de zona. */
  readonly instanceId: string | null;
  readonly name: string;
  readonly detail: string;
  /** Recorte de `items.png` que comparte con el objeto dibujado en el suelo. */
  readonly sprite: ItemSpriteRect | null;
  /** Traits legibles; vacío hoy, pero se leen en el hueco. */
  readonly traits: readonly string[];
  readonly comparison: readonly PanelComparisonRow[];
  readonly actions: readonly PanelAction[];
}

export interface PanelStatsRow {
  readonly label: string;
  readonly value: string;
}

export interface PanelStats {
  /** Totales efectivos en una línea. */
  readonly total: string;
  /** Base inherente y aporte de cada objeto equipado. */
  readonly rows: readonly PanelStatsRow[];
}

export interface InventoryPanelModel {
  readonly playerName: string;
  readonly mp: string;
  readonly equipment: readonly PanelItem[];
  readonly backpack: readonly PanelItem[];
  /** Suelo del tile, siempre presente; vacío es una lista sin filas (R-015). */
  readonly ground: readonly PanelItem[];
  /** Cadáveres del tile: reservado para REQ-021, vacío en este corte. */
  readonly corpses: readonly PanelItem[];
  readonly groundHint: string;
  readonly groundEmptyHint: string;
  readonly corpsesEmptyHint: string;
  readonly backpackCount: string;
  readonly stats: PanelStats;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function damageTotal(packets: readonly DamagePacket[]): number {
  return packets.reduce((total, packet) => total + packet.amount, 0);
}

function slotLabel(slot: EquipmentSlot): string {
  return PANEL_SLOT_LABELS[slot] ?? String(slot);
}

function itemDetail(item: ItemDefinition): string {
  switch (item.category) {
    case 'weapon':
      return `${signed(item.accuracy ?? 0)} acierto · ${damageTotal(item.damagePackets)} daño · ${item.hands === 2 ? '2 manos' : '1 mano'}`;
    case 'armor':
      return `${signed(item.absorption ?? 0)} absorción`;
    case 'shield':
      return `${signed(item.evasion ?? 0)} evasión`;
  }
}

function itemTraits(item: ItemDefinition): readonly string[] {
  return item.traits.map((trait) => trait.description);
}

function itemName(item: ItemDefinition): string {
  return item.name;
}

/** Atributos modificados por el objeto, en el orden del panel. */
function modifierText(item: ItemDefinition): string {
  const parts = ATTRIBUTES.filter(
    ([attribute]) => item.modifiers[attribute] !== undefined,
  ).map(([attribute, label]) => `${label} ${signed(item.modifiers[attribute] ?? 0)}`);
  return parts.join(' · ');
}

/** Texto de stats de un objeto; la ficha del HUD reutiliza esta composición. */
export function itemStatsText(item: ItemDefinition): string {
  const parts = [modifierText(item), itemDetail(item)].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' · ') : 'Sin cambios en stats';
}

function profileTotal(unit: Unit): string {
  const profile = effectiveStats(unit);
  return [
    ...ATTRIBUTES.map(
      ([attribute, label]) => `${label} ${signed(profile.stats[attribute])}`,
    ),
    `Acierto ${signed(profile.accuracy)}`,
    `Daño ${damageTotal(profile.damagePackets)}`,
    `Evasión ${signed(profile.evasion)}`,
    `Absorción ${signed(profile.absorption)}`,
  ].join(' · ');
}

/** Base inherente y aporte individual de cada objeto equipado. */
function buildStats(unit: Unit): PanelStats {
  const base = ATTRIBUTES.map(
    ([attribute, label]) => `${label} ${signed(unit.stats[attribute])}`,
  ).join(' · ');
  const rows: PanelStatsRow[] = [{ label: 'Base', value: base }];
  for (const item of equippedDefinitions(unit)) {
    rows.push({
      label: `${itemName(item)} (${slotLabel(item.slot)})`,
      value: itemStatsText(item),
    });
  }
  return { total: profileTotal(unit), rows };
}

/**
 * Comparación antes de equipar. Usa `aggregateEffectiveStats` con el objeto
 * candidato en lugar del equipado en su mismo hueco, sin tocar el catálogo.
 */
export function compareEquip(
  unit: Unit,
  itemId: ItemId,
): readonly PanelComparisonRow[] {
  const candidate = ITEMS[itemId];
  const before = effectiveStats(unit);
  const definitions = equippedDefinitions(unit).filter(
    (item) => item.slot !== candidate.slot,
  );
  const after = aggregateEffectiveStats(unit.stats, [...definitions, candidate]);
  const rows: PanelComparisonRow[] = [];

  if (candidate.category === 'weapon') {
    rows.push({
      label: 'Acierto',
      before: signed(before.accuracy),
      after: signed(after.accuracy),
    });
    rows.push({
      label: 'Daño',
      before: String(damageTotal(before.damagePackets)),
      after: String(damageTotal(after.damagePackets)),
    });
  } else if (candidate.category === 'armor') {
    rows.push({
      label: 'Absorción',
      before: signed(before.absorption),
      after: signed(after.absorption),
    });
  } else if (candidate.category === 'shield') {
    rows.push({
      label: 'Evasión',
      before: signed(before.evasion),
      after: signed(after.evasion),
    });
  }

  for (const [attribute, label] of ATTRIBUTES) {
    if (before.stats[attribute] !== after.stats[attribute]) {
      rows.push({
        label,
        before: signed(before.stats[attribute]),
        after: signed(after.stats[attribute]),
      });
    }
  }

  return rows;
}

function backpackActions(
  unit: Unit,
  index: number,
): readonly PanelAction[] {
  return [
    {
      kind: 'equip',
      label: 'Equipar',
      command: { type: 'EquipItem', unitId: unit.id, from: 'backpack', index },
    },
    {
      kind: 'drop',
      label: 'Soltar',
      command: { type: 'DropItem', unitId: unit.id, from: 'backpack', index },
    },
  ];
}

function equipmentRow(unit: Unit, slot: EquipmentSlot): PanelItem {
  const instance = unit.equipment[slot];
  const base = {
    key: `slot:${slot}`,
    empty: instance === null,
    itemId: instance ? instance.itemId : null,
    instanceId: instance ? instance.id : null,
    comparison: [] as readonly PanelComparisonRow[],
    name: instance ? itemName(ITEMS[instance.itemId]) : 'Vacío',
    detail: instance ? itemDetail(ITEMS[instance.itemId]) : slotLabel(slot),
    sprite: instance ? ITEMS[instance.itemId].sprite.rect : null,
    traits: instance ? itemTraits(ITEMS[instance.itemId]) : [],
    actions: [] as readonly PanelAction[],
  };
  if (!instance) return base;
  return {
    ...base,
    actions: [
      {
        kind: 'unequip',
        label: 'Desequipar',
        command: { type: 'UnequipItem', unitId: unit.id, slot },
      },
      {
        kind: 'drop',
        label: 'Soltar',
        command: { type: 'DropItem', unitId: unit.id, from: 'slot', slot },
      },
    ],
  };
}

function backpackRow(unit: Unit, index: number): PanelItem {
  const instance = unit.inventory.items[index] ?? null;
  if (!instance) {
    return {
      key: `backpack:${index}`,
      empty: true,
      itemId: null,
      instanceId: null,
      name: 'Vacío',
      detail: `Hueco ${index + 1}`,
      sprite: null,
      traits: [],
      comparison: [],
      actions: [],
    };
  }
  const item = ITEMS[instance.itemId];
  return {
    key: `backpack:${index}`,
    empty: false,
    itemId: instance.itemId,
    instanceId: instance.id,
    name: itemName(item),
    detail: `${itemDetail(item)} · ${slotLabel(item.slot)}`,
    sprite: item.sprite.rect,
    traits: itemTraits(item),
    comparison: compareEquip(unit, instance.itemId),
    actions: backpackActions(unit, index),
  };
}

function groundRow(unit: Unit, item: GroundItem): PanelItem {
  const definition = ITEMS[item.itemId];
  return {
    key: `ground:${item.id}`,
    empty: false,
    itemId: item.itemId,
    instanceId: item.id,
    name: `${definition.name}`,
    detail: `${itemDetail(definition)} · ${slotLabel(definition.slot)}`,
    sprite: definition.sprite.rect,
    traits: itemTraits(definition),
    comparison: compareEquip(unit, item.itemId),
    actions: [
      {
        kind: 'pickup',
        label: 'Recoger',
        command: { type: 'PickUp', unitId: unit.id },
      },
      {
        kind: 'equip',
        label: 'Equipar',
        command: {
          type: 'EquipItem',
          unitId: unit.id,
          from: 'ground',
          itemId: item.id,
        },
      },
    ],
  };
}

function unitForPanel(state: GameState, unitId?: string): Unit | undefined {
  if (unitId !== undefined) {
    return state.players.find((player) => player.id === unitId);
  }
  return state.players.find((player) => player.hp > 0) ?? state.players[0];
}

/**
 * Construye el modelo del panel. Sin jugador devuelve un modelo vacío estable;
 * el host nunca abre el panel en ese caso.
 */
export function buildInventoryPanelModel(
  state: GameState,
  unitId?: string,
): InventoryPanelModel {
  const unit = unitForPanel(state, unitId);
  if (!unit) {
    return {
      playerName: '—',
      mp: '—/—',
      equipment: EQUIPMENT_SLOTS.map((slot) => ({
        key: `slot:${slot}`,
        empty: true,
        itemId: null,
        instanceId: null,
        name: 'Vacío',
        detail: slotLabel(slot),
        sprite: null,
        traits: [],
        comparison: [],
        actions: [],
      })),
      backpack: [],
      ground: [],
      corpses: [],
      groundHint: '',
      groundEmptyHint: 'No hay objetos en el suelo',
      corpsesEmptyHint: 'No hay cadáveres en esta casilla',
      backpackCount: '0',
      stats: { total: '—', rows: [] },
    };
  }

  const groundItems = (state.groundItems ?? []).filter(
    (item) => item.x === unit.x && item.y === unit.y,
  );

  return {
    playerName: unit.nombre,
    mp: `${unit.mp}/${unit.maxMp}`,
    equipment: EQUIPMENT_SLOTS.map((slot) => equipmentRow(unit, slot)),
    backpack: Array.from({ length: unit.inventory.capacity }, (_value, index) =>
      backpackRow(unit, index),
    ),
    ground: groundItems.map((item) => groundRow(unit, item)),
    corpses: [],
    groundHint:
      groundItems.length > 1
        ? 'Recoger toma el primer objeto del tile; equipar elige la fila.'
        : '',
    groundEmptyHint: 'No hay objetos en el suelo',
    corpsesEmptyHint: 'No hay cadáveres en esta casilla',
    backpackCount: `${backpackCount(unit.inventory)}/${unit.inventory.capacity}`,
    stats: buildStats(unit),
  };
}

const REJECTION_MESSAGES: Readonly<Partial<Record<RejectionReason, string>>> = {
  'no-mp': 'Sin MP para esta operación',
  'inventory-full': 'La mochila está llena',
  'no-item': 'No hay ningún objeto ahí',
  'invalid-slot': 'Ese hueco no es válido',
  'wrong-slot': 'El objeto no encaja en ese hueco',
  'two-handed': 'El arma a dos manos no admite escudo',
  'unknown-container': 'El contenedor ya no existe',
  'unknown-unit': 'La unidad ya no existe',
  'dead-unit': 'La unidad no está viva',
  'wrong-phase': 'Solo puedes gestionar el equipo en tu turno',
  'game-over': 'La partida ha terminado',
};

/** Motivo legible de un rechazo del motor; nunca deja la operación sin texto. */
export function rejectionMessage(reason: RejectionReason): string {
  return REJECTION_MESSAGES[reason] ?? 'Operación rechazada';
}

function panelRow(
  model: InventoryPanelModel,
  key: string,
): PanelItem | undefined {
  return (
    model.equipment.find((item) => item.key === key) ??
    model.backpack.find((item) => item.key === key) ??
    model.ground.find((item) => item.key === key)
  );
}

/**
 * Opciones del submenú contextual para el objeto seleccionado, en el orden del
 * modelo. Solo lectura: no despacha, no muta el estado y no gasta MP.
 *
 * - El coste se anuncia siempre antes de confirmar.
 * - Con MP insuficiente la opción queda deshabilitada con el motivo del motor.
 * - Con la mochila llena se omite `pickup`; `equip` desde el suelo sigue
 *   ofreciéndose porque el intercambio puede caber y el motor decide.
 */
export function buildPanelMenu(
  state: GameState,
  key: string,
  unitId?: string,
): readonly PanelMenuOption[] {
  const unit = unitForPanel(state, unitId);
  if (!unit) return [];
  const item = panelRow(buildInventoryPanelModel(state, unitId), key);
  if (!item || item.empty) return [];

  const full =
    backpackCount(unit.inventory) >= unit.inventory.capacity;
  const actions = item.actions.filter(
    (action) => !(action.kind === 'pickup' && full),
  );
  const disabled = unit.mp < INVENTORY_OPERATION_COST;
  const costLabel = `${INVENTORY_OPERATION_COST} MP`;

  return actions.map((action) => ({
    ...action,
    costLabel,
    disabled,
    reason: disabled ? rejectionMessage('no-mp') : null,
  }));
}

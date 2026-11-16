/**
 * Catálogo de objetos y definiciones de equipo (REQ-018 T-001/T-011, REQ-029
 * T-002). Es un módulo de datos puro: identificadores estables, estadísticas y
 * sprite. Ni el motor ni el host deben codificar valores de armas, armaduras o
 * escudos fuera de este catálogo; el host solo traduce el sprite a su ruta.
 */

import { isPhysical } from './damage';
import type { DamagePacket } from './types';

export type WeaponId =
  | 'sword'
  | 'axe'
  | 'dagger'
  | 'knife'
  | 'hammer'
  | 'electric-sword'
  | 'arcane-dagger'
  | 'circular-mace';
export type ArmorId = 'armor' | 'plate';
export type ShieldId = 'shield';
export type AccessoryId = 'lifesteal-ring' | 'mana-necklace' | 'action-gloves';
export type ItemId = WeaponId | ArmorId | ShieldId | AccessoryId;

/** Categorías con contenido; los cinco huecos secundarios ya tienen piezas. */
export type ItemCategory = 'weapon' | 'shield' | 'armor' | 'ring' | 'neck' | 'hands';

/**
 * Política de botín de un objeto (REQ-034 R-002/T-001). `common` se tira al
 * crear al enemigo; `progression` nace siempre saqueable (REQ-034 R-008/T-008).
 */
export type LootPolicy = 'common' | 'progression';

/** Porcentaje de saqueabilidad por política, en datos (REQ-034 R-002/R-008). */
export const LOOT_CHANCES: Readonly<Record<LootPolicy, number>> = {
  common: 25,
  progression: 100,
};

/** Los ocho huecos de REQ-018 R-002; las cuatro piezas nuevas ocupan ring, neck, hands y weapon. */
export type EquipmentSlot = ItemCategory | 'head' | 'feet';

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  'weapon',
  'shield',
  'armor',
  'head',
  'feet',
  'hands',
  'neck',
  'ring',
];

/** Hoja de sprites de objetos: 352×832 con celdas de 32×32 (ADR-006). */
export const ITEM_SHEET = {
  id: 'items',
  width: 352,
  height: 832,
  cell: 32,
} as const;

export interface ItemSpriteRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ItemSprite {
  /** ID de la hoja; el host decide la ruta. */
  readonly sheet: 'items';
  /** Etiqueta exacta de `items.txt`; su fila y columna dan el recorte. */
  readonly label: string;
  readonly rect: ItemSpriteRect;
}

export type ItemAttribute =
  | 'habilidad'
  | 'fuerza'
  | 'defensa'
  | 'punteria'
  | 'acciones';

/** Modificadores pasivos de atributos; vacío en las piezas de este corte. */
export type ItemAttributeModifiers = Readonly<Partial<Record<ItemAttribute, number>>>;

/**
 * Traits de objeto (REQ-019 T-001/T-002). El motor no define traits: cada
 * definición vive en `TRAITS` y los objetos solo guardan la referencia y el
 * texto visible. `description` se conserva para que la ficha y el panel lean el
 * objeto sin conocer el catálogo de traits.
 */
export interface ItemTrait {
  readonly id: string;
  readonly description: string;
}

/** Tipo de efecto declarado por el catálogo (REQ-019 T-001). */
export type TraitType = 'modifier' | 'triggered' | 'continuous';

/** Política de apilamiento explícita (REQ-019 R-008/T-003). */
export type TraitStacking = 'sum' | 'unique';

/** Fuente del trait; este corte solo usa `equipment` (REQ-019 T-002). */
export type TraitSource = 'inherent' | 'equipment' | 'temporary';

/** Los nueve atributos que puede tocar un modificador (REQ-014 R-001). */
export type TraitAttribute =
  | 'habilidad'
  | 'fuerza'
  | 'defensa'
  | 'resistencia'
  | 'punteria'
  | 'magia'
  | 'pvMax'
  | 'mpMax'
  | 'acciones';

/** Disparadores del pipeline (REQ-019 T-004); este corte usa los cuatro primeros. */
export type TraitTrigger =
  | 'equip'
  | 'unequip'
  | 'impact'
  | 'damage'
  | 'death'
  | 'move'
  | 'turn-start'
  | 'turn-end';

export interface TraitModifierParameters {
  readonly kind: 'modifier';
  readonly attribute: TraitAttribute;
  readonly amount: number;
}

/** Regla de área reutilizable: radio Chebyshev, centro y coste (REQ-019 R-011). */
export interface TraitAreaParameters {
  readonly kind: 'area';
  readonly radius: number;
  readonly includesCenter: boolean;
  readonly actionCost: number;
}

/** Robo de vida: porcentaje, redondeo y mínimo (REQ-019 R-012). */
export interface TraitLifestealParameters {
  readonly kind: 'lifesteal';
  readonly percent: number;
  readonly rounding: 'floor';
  readonly minimum: number;
}

export type TraitParameters =
  | TraitModifierParameters
  | TraitAreaParameters
  | TraitLifestealParameters;

/** Definición completa de un trait como dato (REQ-019 T-001, ADR-024). */
export interface TraitDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: TraitType;
  readonly stacking: TraitStacking;
  /** Clave de apilamiento: atributo para modificadores, efecto para especiales. */
  readonly stackingKey: string;
  readonly source: TraitSource;
  readonly triggers: readonly TraitTrigger[];
  readonly parameters: TraitParameters;
}

/**
 * Catálogo de traits del corte. Los cuatro objetos equipados referencian sus
 * traits por ID; el resto son datos disponibles para pruebas y contenido
 * posterior. Ajustar un valor aquí cambia el juego sin tocar el motor.
 */
export const TRAITS: Readonly<Record<string, TraitDefinition>> = {
  precise: {
    id: 'precise',
    name: 'Precisión',
    description: '+1 habilidad.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'habilidad',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'habilidad', amount: 1 },
  },
  strong: {
    id: 'strong',
    name: 'Fuerza bruta',
    description: '+1 fuerza.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'fuerza',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'fuerza', amount: 1 },
  },
  guarded: {
    id: 'guarded',
    name: 'Guardia',
    description: '+1 defensa.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'defensa',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'defensa', amount: 1 },
  },
  'tough-skin': {
    id: 'tough-skin',
    name: 'Piel dura',
    description: '+1 resistencia en todas las bandas.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'resistencia',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'resistencia', amount: 1 },
  },
  'sharp-eye': {
    id: 'sharp-eye',
    name: 'Ojo fino',
    description: '+1 puntería.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'punteria',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'punteria', amount: 1 },
  },
  arcane: {
    id: 'arcane',
    name: 'Foco arcano',
    description: '+1 nivel de magia.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'magia',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'magia', amount: 1 },
  },
  vitality: {
    id: 'vitality',
    name: 'Vitalidad',
    description: '+2 PV máximos.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'pvMax',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'pvMax', amount: 2 },
  },
  'mana-surge': {
    id: 'mana-surge',
    name: 'Pulso de maná',
    description: '+2 MP máximos.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'mpMax',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'mpMax', amount: 2 },
  },
  'action-surge': {
    id: 'action-surge',
    name: 'Impulso',
    description: '+1 acción por turno.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'acciones',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'acciones', amount: 1 },
  },
  frail: {
    id: 'frail',
    name: 'Fragilidad',
    description: '−1 defensa; respeta el suelo del atributo.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'defensa',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'defensa', amount: -1 },
  },
  slow: {
    id: 'slow',
    name: 'Lentitud',
    description: '−1 acción por turno, con suelo en 1.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'acciones',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'acciones', amount: -1 },
  },
  'mana-drain': {
    id: 'mana-drain',
    name: 'Drenaje',
    description: '−5 MP máximos, con suelo en 0.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'mpMax',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'mpMax', amount: -5 },
  },
  brittle: {
    id: 'brittle',
    name: 'Fragilidad vital',
    description: '−5 PV máximos, con suelo en 1.',
    type: 'modifier',
    stacking: 'sum',
    stackingKey: 'pvMax',
    source: 'equipment',
    triggers: ['equip', 'unequip'],
    parameters: { kind: 'modifier', attribute: 'pvMax', amount: -5 },
  },
  lifesteal: {
    id: 'lifesteal',
    name: 'Robo de vida',
    description: 'Cura el 50 % del daño efectivo, mínimo 1 y sin sobrecurar.',
    type: 'triggered',
    stacking: 'unique',
    stackingKey: 'lifesteal',
    source: 'equipment',
    triggers: ['equip', 'unequip', 'damage'],
    parameters: { kind: 'lifesteal', percent: 50, rounding: 'floor', minimum: 1 },
  },
  'lifesteal-minor': {
    id: 'lifesteal-minor',
    name: 'Robo menor',
    description: 'Cura el 25 % del daño efectivo, mínimo 1.',
    type: 'triggered',
    stacking: 'unique',
    stackingKey: 'lifesteal',
    source: 'equipment',
    triggers: ['equip', 'unequip', 'damage'],
    parameters: { kind: 'lifesteal', percent: 25, rounding: 'floor', minimum: 1 },
  },
  'circular-strike': {
    id: 'circular-strike',
    name: 'Ataque circular',
    description: 'Golpea las 8 casillas adyacentes salvo el centro; cuesta 1 acción.',
    type: 'continuous',
    stacking: 'unique',
    stackingKey: 'area',
    source: 'equipment',
    triggers: ['equip', 'unequip', 'impact'],
    parameters: { kind: 'area', radius: 1, includesCenter: false, actionCost: 1 },
  },
  'wide-circular-strike': {
    id: 'wide-circular-strike',
    name: 'Ataque circular amplio',
    description: 'Golpea un radio 2 salvo el centro; cuesta 2 acciones.',
    type: 'continuous',
    stacking: 'unique',
    stackingKey: 'area',
    source: 'equipment',
    triggers: ['equip', 'unequip', 'impact'],
    parameters: { kind: 'area', radius: 2, includesCenter: false, actionCost: 2 },
  },
};

/** Trait del catálogo con su texto visible, para declararlo en un objeto. */
export function itemTrait(id: string): ItemTrait {
  const trait = TRAITS[id];
  if (trait === undefined) {
    throw new Error(`Trait desconocido en el catálogo: ${id}`);
  }
  return { id, description: trait.description };
}

/**
 * Definición completa de un objeto del catálogo. Los campos de combate son
 * opcionales porque dependen de la categoría: las armas declaran acierto y
 * paquetes, las armaduras absorción y los escudos evasión.
 */
export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly category: ItemCategory;
  readonly slot: EquipmentSlot;
  /** Política de botín; obligatoria y en datos (REQ-034 T-001). */
  readonly lootPolicy: LootPolicy;
  /** Solo armas: una o dos manos (REQ-018 R-003). */
  readonly hands?: 1 | 2;
  /** Acierto que suma al ataque; solo armas. */
  readonly accuracy?: number;
  /** Absorción de daño físico; solo armaduras corporales. */
  readonly absorption?: number;
  /** Evasión que suma a la defensa; solo escudos. */
  readonly evasion?: number;
  readonly modifiers: ItemAttributeModifiers;
  /** Paquetes de daño tipado; solo armas (REQ-029 T-002). */
  readonly damagePackets: readonly DamagePacket[];
  readonly traits: readonly ItemTrait[];
  readonly sprite: ItemSprite;
  readonly description: string;
  readonly estimatedV1?: true;
}

function cellRect(row: number, column: string): ItemSpriteRect {
  const columnIndex = column.charCodeAt(0) - 'a'.charCodeAt(0);
  return {
    x: columnIndex * ITEM_SHEET.cell,
    y: (row - 1) * ITEM_SHEET.cell,
    width: ITEM_SHEET.cell,
    height: ITEM_SHEET.cell,
  };
}

/**
 * Catálogo único de objetos del corte. Los IDs son estables y los diez valores
 * actuales se conservan; los sprites referencian etiquetas de `items.txt`.
 */
export const ITEMS: Readonly<Record<ItemId, ItemDefinition>> = {
  sword: {
    id: 'sword',
    name: 'Espada',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 3,
    modifiers: {},
    damagePackets: [{ type: 'slash', amount: 3 }],
    traits: [],
    sprite: { sheet: 'items', label: '1.d. long sword', rect: cellRect(1, 'd') },
    description: 'Espada recta de una mano; arma inicial del Guerrero.',
  },
  axe: {
    id: 'axe',
    name: 'Hacha',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 2,
    modifiers: {},
    damagePackets: [{ type: 'slash', amount: 5 }],
    traits: [],
    sprite: { sheet: 'items', label: '4.b. battle axe', rect: cellRect(4, 'b') },
    description: 'Hacha de guerra de una mano, lenta pero contundente.',
  },
  dagger: {
    id: 'dagger',
    name: 'Daga',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 4,
    modifiers: {},
    damagePackets: [{ type: 'pierce', amount: 2 }],
    traits: [],
    sprite: { sheet: 'items', label: '1.a. dagger', rect: cellRect(1, 'a') },
    description: 'Daga ligera de una mano, precisa y de filo corto.',
  },
  knife: {
    id: 'knife',
    name: 'Cuchillo',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 4,
    modifiers: {},
    damagePackets: [{ type: 'pierce', amount: 1 }],
    traits: [],
    sprite: { sheet: 'items', label: '3.e. kukri', rect: cellRect(3, 'e') },
    description: 'Cuchillo corto de una mano, rápido y de daño mínimo.',
  },
  // Armas nuevas de REQ-029 § contenido estimado v1: entran por mapa o botín y
  // no cambian el equipo inicial del roster.
  hammer: {
    id: 'hammer',
    name: 'Martillo',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 2,
    modifiers: {},
    damagePackets: [{ type: 'blunt', amount: 4 }],
    traits: [],
    sprite: { sheet: 'items', label: '5.d. hammer', rect: cellRect(5, 'd') },
    description: 'Martillo de guerra de una mano; contenido estimado v1.',
    estimatedV1: true,
  },
  'electric-sword': {
    id: 'electric-sword',
    name: 'Espada electrizada',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 3,
    modifiers: {},
    damagePackets: [
      { type: 'slash', amount: 3 },
      { type: 'electric', amount: 1 },
    ],
    traits: [],
    sprite: { sheet: 'items', label: '1.i. crystal sword', rect: cellRect(1, 'i') },
    description: 'Espada de una mano con descarga eléctrica añadida; estimada v1.',
    estimatedV1: true,
  },
  'arcane-dagger': {
    id: 'arcane-dagger',
    name: 'Daga arcana',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 1,
    accuracy: 4,
    modifiers: {},
    damagePackets: [
      { type: 'pierce', amount: 2 },
      { type: 'magic', amount: 1 },
    ],
    traits: [],
    sprite: { sheet: 'items', label: '1.h. magic dagger', rect: cellRect(1, 'h') },
    description: 'Daga de una mano con filo arcano añadido; estimada v1.',
    estimatedV1: true,
  },
  armor: {
    id: 'armor',
    name: 'Armadura',
    category: 'armor',
    slot: 'armor',
    lootPolicy: 'common',
    absorption: 1,
    modifiers: {},
    damagePackets: [],
    traits: [],
    sprite: { sheet: 'items', label: '13.e. scale mail', rect: cellRect(13, 'e') },
    description: 'Armadura corporal de escamas; absorbe daño físico.',
  },
  plate: {
    id: 'plate',
    name: 'Coraza',
    category: 'armor',
    slot: 'armor',
    lootPolicy: 'common',
    absorption: 2,
    modifiers: {},
    damagePackets: [],
    traits: [],
    sprite: { sheet: 'items', label: '13.f. chest plate', rect: cellRect(13, 'f') },
    description: 'Coraza corporal pesada; absorbe más daño físico que la armadura.',
  },
  shield: {
    id: 'shield',
    name: 'Escudo',
    category: 'shield',
    slot: 'shield',
    lootPolicy: 'common',
    evasion: 1,
    modifiers: {},
    damagePackets: [],
    traits: [],
    sprite: { sheet: 'items', label: '12.a. buckler', rect: cellRect(12, 'a') },
    description: 'Escudo ligero que suma evasión a la defensa.',
  },
  // Cuatro piezas de REQ-019: entran por cofres y saqueo de REQ-020; ningún
  // arquetipo las recibe y el bestiario no las declara.
  'lifesteal-ring': {
    id: 'lifesteal-ring',
    name: 'Anillo de robo',
    category: 'ring',
    slot: 'ring',
    lootPolicy: 'common',
    modifiers: {},
    damagePackets: [],
    traits: [itemTrait('lifesteal')],
    sprite: { sheet: 'items', label: '18.b. gold band ring', rect: cellRect(18, 'b') },
    description: 'Anillo que roba vida con cada impacto.',
  },
  'mana-necklace': {
    id: 'mana-necklace',
    name: 'Collar de maná',
    category: 'neck',
    slot: 'neck',
    lootPolicy: 'common',
    modifiers: {},
    damagePackets: [],
    traits: [itemTrait('mana-surge')],
    sprite: { sheet: 'items', label: '17.b. metal pendant', rect: cellRect(17, 'b') },
    description: 'Collar que eleva el MP máximo en 2.',
  },
  'action-gloves': {
    id: 'action-gloves',
    name: 'Guantes de impulso',
    category: 'hands',
    slot: 'hands',
    lootPolicy: 'common',
    modifiers: {},
    damagePackets: [],
    traits: [itemTrait('action-surge')],
    sprite: { sheet: 'items', label: '14.b. leather gloves', rect: cellRect(14, 'b') },
    description: 'Guantes que conceden una acción extra por turno.',
  },
  'circular-mace': {
    id: 'circular-mace',
    name: 'Maza circular',
    category: 'weapon',
    slot: 'weapon',
    lootPolicy: 'common',
    hands: 2,
    accuracy: 2,
    modifiers: {},
    damagePackets: [{ type: 'blunt', amount: 3 }],
    traits: [itemTrait('circular-strike')],
    sprite: { sheet: 'items', label: '6.c. great mace', rect: cellRect(6, 'c') },
    description: 'Maza a dos manos que golpea las ocho casillas adyacentes.',
  },
};

/**
 * Valida un arma para este corte (REQ-029 R-004): como máximo un paquete físico,
 * como máximo un paquete elemental y como máximo dos paquetes en total.
 */
export function validateDamagePackets(packets: readonly DamagePacket[]): boolean {
  if (packets.length > 2) return false;
  let physicals = 0;
  let elementals = 0;
  for (const packet of packets) {
    if (isPhysical(packet.type)) physicals += 1;
    else elementals += 1;
  }
  return physicals <= 1 && elementals <= 1;
}

export type ItemCatalogRule =
  | 'duplicate-id'
  | 'category-slot'
  | 'hands'
  | 'stat'
  | 'damage-packets'
  | 'traits'
  | 'modifiers'
  | 'sprite'
  | 'loot-policy';

export interface ItemCatalogIssue {
  readonly itemId: string;
  readonly rule: ItemCatalogRule;
  readonly detail: string;
}

const SLOTS_BY_CATEGORY: Readonly<Record<ItemCategory, readonly EquipmentSlot[]>> = {
  weapon: ['weapon'],
  shield: ['shield'],
  armor: ['armor'],
  ring: ['ring'],
  neck: ['neck'],
  hands: ['hands'],
};

const LABEL_PATTERN = /^(\d+)\.([a-z])\.\s+(.+)$/;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function rectFromLabel(label: string): ItemSpriteRect | null {
  const match = LABEL_PATTERN.exec(label);
  if (match === null) return null;
  const row = Number(match[1]);
  const column = match[2];
  return {
    x: (column.charCodeAt(0) - 'a'.charCodeAt(0)) * ITEM_SHEET.cell,
    y: (row - 1) * ITEM_SHEET.cell,
    width: ITEM_SHEET.cell,
    height: ITEM_SHEET.cell,
  };
}

function sameRect(a: ItemSpriteRect, b: ItemSpriteRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** Silueta aprobada de un hueco: etiqueta de `items.txt` y su celda. */
export interface EquipmentSilhouette {
  /** Etiqueta exacta de `items.txt`; documenta el objeto representativo. */
  readonly label: string;
  readonly rect: ItemSpriteRect;
}

function silhouetteFromLabel(label: string): EquipmentSilhouette {
  const rect = rectFromLabel(label);
  if (rect === null) {
    throw new Error(`Etiqueta de silueta no válida: ${label}`);
  }
  return { label, rect };
}

/**
 * Tabla única de las ocho siluetas de equipamiento (REQ-033 R-029/S-005).
 * Las piezas que ya existen en el catálogo reutilizan su sprite; los cinco
 * huecos secundarios declaran aquí su celda. Ningún componente duplica estos
 * recortes: la vista solo traduce `rect` a `mask-position`.
 */
export const EQUIPMENT_SILHOUETTES: Readonly<
  Record<EquipmentSlot, EquipmentSilhouette>
> = {
  weapon: { label: ITEMS.sword.sprite.label, rect: ITEMS.sword.sprite.rect },
  shield: { label: ITEMS.shield.sprite.label, rect: ITEMS.shield.sprite.rect },
  armor: { label: ITEMS.armor.sprite.label, rect: ITEMS.armor.sprite.rect },
  head: silhouetteFromLabel('16.e. helm'),
  feet: silhouetteFromLabel('15.b. leather boots'),
  hands: silhouetteFromLabel('14.b. leather gloves'),
  neck: silhouetteFromLabel('17.b. metal pendant'),
  ring: silhouetteFromLabel('18.b. gold band ring'),
};

/**
 * Valida un catálogo de objetos: IDs únicos, categoría y hueco coherentes,
 * manos 1|2, paquetes de daño de REQ-029, traits declarados en el catálogo,
 * modificadores numéricos, política de botín conocida y sprite dentro de la
 * hoja y coherente con `items.txt`.
 */
export function validateItemCatalog(
  items: readonly ItemDefinition[],
): readonly ItemCatalogIssue[] {
  const issues: ItemCatalogIssue[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const report = (rule: ItemCatalogRule, detail: string): void => {
      issues.push({ itemId: String(item.id), rule, detail });
    };

    if (seen.has(item.id)) report('duplicate-id', `ID repetido: ${item.id}`);
    else seen.add(item.id);

    const allowedSlots = SLOTS_BY_CATEGORY[item.category];
    if (allowedSlots === undefined) {
      report('category-slot', `Categoría desconocida: ${String(item.category)}`);
    } else if (!EQUIPMENT_SLOTS.includes(item.slot) || !allowedSlots.includes(item.slot)) {
      report('category-slot', `Categoría ${item.category} no admite el hueco ${item.slot}`);
    }

    switch (item.category) {
      case 'weapon':
        if (item.hands !== 1 && item.hands !== 2) {
          report('hands', 'Un arma debe declarar 1 o 2 manos');
        }
        if (!isFiniteNumber(item.accuracy)) report('stat', 'Falta el acierto del arma');
        if (item.absorption !== undefined || item.evasion !== undefined) {
          report('stat', 'Un arma no declara absorción ni evasión');
        }
        if (item.damagePackets.length === 0) {
          report('damage-packets', 'Un arma necesita al menos un paquete');
        } else if (!validateDamagePackets(item.damagePackets)) {
          report('damage-packets', 'Paquetes fuera de REQ-029 R-004');
        }
        break;
      case 'armor':
        if (!isFiniteNumber(item.absorption)) {
          report('stat', 'Falta la absorción de la armadura');
        }
        if (item.accuracy !== undefined || item.evasion !== undefined || item.hands !== undefined) {
          report('stat', 'Una armadura no declara acierto, evasión ni manos');
        }
        if (item.damagePackets.length > 0) {
          report('damage-packets', 'Una armadura no declara paquetes');
        }
        break;
      case 'shield':
        if (!isFiniteNumber(item.evasion)) report('stat', 'Falta la evasión del escudo');
        if (item.accuracy !== undefined || item.absorption !== undefined || item.hands !== undefined) {
          report('stat', 'Un escudo no declara acierto, absorción ni manos');
        }
        if (item.damagePackets.length > 0) {
          report('damage-packets', 'Un escudo no declara paquetes');
        }
        break;
      case 'ring':
      case 'neck':
      case 'hands':
        if (
          item.accuracy !== undefined ||
          item.absorption !== undefined ||
          item.evasion !== undefined ||
          item.hands !== undefined
        ) {
          report('stat', 'Un accesorio no declara acierto, absorción, evasión ni manos');
        }
        if (item.damagePackets.length > 0) {
          report('damage-packets', 'Un accesorio no declara paquetes');
        }
        break;
    }

    for (const trait of item.traits) {
      if (TRAITS[trait.id] === undefined) {
        report('traits', `Trait desconocido: ${trait.id}`);
      }
      if (trait.description.trim() === '') {
        report('traits', `Trait sin descripción: ${trait.id}`);
      }
    }

    if (typeof LOOT_CHANCES[item.lootPolicy] !== 'number') {
      report('loot-policy', `Política de botín desconocida: ${String(item.lootPolicy)}`);
    }

    for (const [attribute, value] of Object.entries(item.modifiers)) {
      if (!isFiniteNumber(value)) report('modifiers', `Modificador no numérico: ${attribute}`);
    }

    if (item.sprite.sheet !== ITEM_SHEET.id) {
      report('sprite', `Hoja desconocida: ${String(item.sprite.sheet)}`);
    }
    const expected = rectFromLabel(item.sprite.label);
    if (expected === null) {
      report('sprite', `Etiqueta no válida: ${item.sprite.label}`);
    } else if (!sameRect(expected, item.sprite.rect)) {
      report('sprite', `Recorte incoherente con la etiqueta ${item.sprite.label}`);
    }
    const { x, y, width, height } = item.sprite.rect;
    if (width !== ITEM_SHEET.cell || height !== ITEM_SHEET.cell) {
      report('sprite', 'El recorte debe medir una celda de 32×32');
    }
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x + width > ITEM_SHEET.width ||
      y + height > ITEM_SHEET.height
    ) {
      report('sprite', 'El recorte se sale de la hoja de 352×832');
    }
  }

  return issues;
}

export type TraitCatalogRule =
  | 'id'
  | 'text'
  | 'type'
  | 'stacking'
  | 'parameters'
  | 'triggers'
  | 'source';

export interface TraitCatalogIssue {
  readonly traitId: string;
  readonly rule: TraitCatalogRule;
  readonly detail: string;
}

const TRAIT_TYPES: readonly TraitType[] = ['modifier', 'triggered', 'continuous'];
const TRAIT_STACKING: readonly TraitStacking[] = ['sum', 'unique'];
const TRAIT_SOURCES: readonly TraitSource[] = ['inherent', 'equipment', 'temporary'];
const TRAIT_TRIGGERS: readonly TraitTrigger[] = [
  'equip',
  'unequip',
  'impact',
  'damage',
  'death',
  'move',
  'turn-start',
  'turn-end',
];
const TRAIT_ATTRIBUTES: readonly TraitAttribute[] = [
  'habilidad',
  'fuerza',
  'defensa',
  'resistencia',
  'punteria',
  'magia',
  'pvMax',
  'mpMax',
  'acciones',
];

/**
 * Valida el catálogo de traits como dato: ID estable, textos, tipo,
 * apilamiento, fuente, disparadores y parámetros coherentes con su clase.
 */
export function validateTraitCatalog(
  traits: Readonly<Record<string, TraitDefinition>>,
): readonly TraitCatalogIssue[] {
  const issues: TraitCatalogIssue[] = [];

  for (const [key, trait] of Object.entries(traits)) {
    const report = (rule: TraitCatalogRule, detail: string): void => {
      issues.push({ traitId: key, rule, detail });
    };

    if (trait.id !== key) report('id', `La clave ${key} no coincide con el id ${trait.id}`);
    if (trait.name.trim() === '' || trait.description.trim() === '') {
      report('text', 'Nombre y descripción son obligatorios');
    }
    if (trait.stackingKey.trim() === '') report('stacking', 'Falta la clave de stacking');
    if (!TRAIT_TYPES.includes(trait.type)) report('type', `Tipo desconocido: ${String(trait.type)}`);
    if (!TRAIT_STACKING.includes(trait.stacking)) {
      report('stacking', `Apilamiento desconocido: ${String(trait.stacking)}`);
    }
    if (!TRAIT_SOURCES.includes(trait.source)) {
      report('source', `Fuente desconocida: ${String(trait.source)}`);
    }
    for (const trigger of trait.triggers) {
      if (!TRAIT_TRIGGERS.includes(trigger)) {
        report('triggers', `Disparador desconocido: ${String(trigger)}`);
      }
    }

    const parameters = trait.parameters;
    if (parameters.kind === 'modifier') {
      if (!TRAIT_ATTRIBUTES.includes(parameters.attribute)) {
        report('parameters', `Atributo desconocido: ${String(parameters.attribute)}`);
      }
      if (!isFiniteNumber(parameters.amount)) {
        report('parameters', 'El modificador debe ser un número finito');
      }
    } else if (parameters.kind === 'area') {
      if (!Number.isInteger(parameters.radius) || parameters.radius < 1) {
        report('parameters', 'El radio del área debe ser un entero positivo');
      }
      if (typeof parameters.includesCenter !== 'boolean') {
        report('parameters', '`incluyeCentro` debe ser booleano');
      }
      if (!Number.isInteger(parameters.actionCost) || parameters.actionCost < 1) {
        report('parameters', 'El coste de acción debe ser un entero positivo');
      }
    } else if (parameters.kind === 'lifesteal') {
      if (!isFiniteNumber(parameters.percent) || parameters.percent < 0 || parameters.percent > 100) {
        report('parameters', 'El porcentaje de robo debe estar entre 0 y 100');
      }
      if (parameters.rounding !== 'floor') {
        report('parameters', 'El redondeo del robo debe ser `floor`');
      }
      if (!isFiniteNumber(parameters.minimum) || parameters.minimum < 0) {
        report('parameters', 'El mínimo de robo debe ser no negativo');
      }
    } else {
      report('parameters', `Clase de parámetro desconocida: ${String((parameters as { kind?: unknown }).kind)}`);
    }
  }

  return issues;
}

export interface WeaponDefinition {
  readonly id: WeaponId;
  readonly name: string;
  /** Bono que suma al modificador de acierto del portador. */
  readonly accuracy: number;
  /** Paquetes de daño tipado (REQ-029 T-002); sustituye al `damage` único. */
  readonly damagePackets: readonly DamagePacket[];
  /**
   * `true` cuando acierto y paquetes son contenido estimado v1 de REQ-029
   * (§ contenido estimado v1) pendiente de ajuste con roster y bestiario.
   * Las armas ya existentes no lo declaran.
   */
  readonly estimatedV1?: true;
}

export interface ArmorDefinition {
  readonly id: ArmorId;
  readonly name: string;
  /** Valor que se opone a la tirada de daño. */
  readonly armor: number;
}

export interface ShieldDefinition {
  readonly id: ShieldId;
  readonly name: string;
  /** Bono que suma a la defensa del portador. */
  readonly defense: number;
}

function weaponView(item: ItemDefinition): WeaponDefinition {
  if (item.category !== 'weapon' || item.accuracy === undefined) {
    throw new Error(`El objeto ${item.id} no es un arma con acierto`);
  }
  return {
    id: item.id as WeaponId,
    name: item.name,
    accuracy: item.accuracy,
    damagePackets: item.damagePackets,
    ...(item.estimatedV1 === true ? { estimatedV1: true as const } : {}),
  };
}

function armorView(item: ItemDefinition): ArmorDefinition {
  if (item.category !== 'armor' || item.absorption === undefined) {
    throw new Error(`El objeto ${item.id} no es una armadura con absorción`);
  }
  return { id: item.id as ArmorId, name: item.name, armor: item.absorption };
}

function shieldView(item: ItemDefinition): ShieldDefinition {
  if (item.category !== 'shield' || item.evasion === undefined) {
    throw new Error(`El objeto ${item.id} no es un escudo con evasión`);
  }
  return { id: item.id as ShieldId, name: item.name, defense: item.evasion };
}

/** Vista derivada del catálogo para los consumidores de REQ-010. */
export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  sword: weaponView(ITEMS.sword),
  axe: weaponView(ITEMS.axe),
  dagger: weaponView(ITEMS.dagger),
  knife: weaponView(ITEMS.knife),
  hammer: weaponView(ITEMS.hammer),
  'electric-sword': weaponView(ITEMS['electric-sword']),
  'arcane-dagger': weaponView(ITEMS['arcane-dagger']),
  'circular-mace': weaponView(ITEMS['circular-mace']),
};

/** Vista derivada del catálogo para los consumidores de REQ-010. */
export const ARMORS: Readonly<Record<ArmorId, ArmorDefinition>> = {
  armor: armorView(ITEMS.armor),
  plate: armorView(ITEMS.plate),
};

/** Vista derivada del catálogo para los consumidores de REQ-010. */
export const SHIELDS: Readonly<Record<ShieldId, ShieldDefinition>> = {
  shield: shieldView(ITEMS.shield),
};

export function weaponFor(id: WeaponId): WeaponDefinition {
  return WEAPONS[id];
}

/** Suma de las cantidades base de los paquetes de un arma; uso en HUD/tests. */
export function weaponDamage(weapon: WeaponDefinition): number {
  return weapon.damagePackets.reduce((total, packet) => total + packet.amount, 0);
}

/** Valor de armadura; `null` representa no llevar armadura. */
export function armorValue(id: ArmorId | null): number {
  return id === null ? 0 : ARMORS[id].armor;
}

/** Valor de escudo; `null` representa no llevar escudo. */
export function shieldValue(id: ShieldId | null): number {
  return id === null ? 0 : SHIELDS[id].defense;
}

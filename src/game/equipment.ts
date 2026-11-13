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
  | 'arcane-dagger';
export type ArmorId = 'armor' | 'plate';
export type ShieldId = 'shield';
export type ItemId = WeaponId | ArmorId | ShieldId;

/** Categorías con contenido en este corte (REQ-018 R-004). */
export type ItemCategory = 'weapon' | 'shield' | 'armor';

/** Los ocho huecos de REQ-018 R-002; los cinco secundarios siguen sin objetos. */
export type EquipmentSlot = ItemCategory | 'head' | 'feet' | 'hands' | 'neck' | 'ring';

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

/** Trait de objeto (REQ-018 T-001); sin efectos en este corte. */
export interface ItemTrait {
  readonly id: string;
  readonly description: string;
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
    evasion: 1,
    modifiers: {},
    damagePackets: [],
    traits: [],
    sprite: { sheet: 'items', label: '12.a. buckler', rect: cellRect(12, 'a') },
    description: 'Escudo ligero que suma evasión a la defensa.',
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
  | 'sprite';

export interface ItemCatalogIssue {
  readonly itemId: string;
  readonly rule: ItemCatalogRule;
  readonly detail: string;
}

const SLOTS_BY_CATEGORY: Readonly<Record<ItemCategory, readonly EquipmentSlot[]>> = {
  weapon: ['weapon'],
  shield: ['shield'],
  armor: ['armor'],
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

/**
 * Valida un catálogo de objetos: IDs únicos, categoría y hueco coherentes,
 * manos 1|2, paquetes de daño de REQ-029, traits vacíos, modificadores
 * numéricos y sprite dentro de la hoja y coherente con `items.txt`.
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
    }

    if (item.traits.length > 0) report('traits', 'Los traits deben estar vacíos en este corte');

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

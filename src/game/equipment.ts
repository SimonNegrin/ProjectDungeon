/**
 * Catálogo de equipo de combate (REQ-010).
 *
 * Es un módulo de datos puro: identificadores estables y estadísticas. Ni el
 * motor ni los tests deben codificar valores de armas, armaduras o escudos
 * fuera de este catálogo.
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

export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  sword: {
    id: 'sword',
    name: 'Espada',
    accuracy: 3,
    damagePackets: [{ type: 'slash', amount: 3 }],
  },
  axe: {
    id: 'axe',
    name: 'Hacha',
    accuracy: 2,
    damagePackets: [{ type: 'slash', amount: 5 }],
  },
  dagger: {
    id: 'dagger',
    name: 'Daga',
    accuracy: 4,
    damagePackets: [{ type: 'pierce', amount: 2 }],
  },
  knife: {
    id: 'knife',
    name: 'Cuchillo',
    accuracy: 4,
    damagePackets: [{ type: 'pierce', amount: 1 }],
  },
  // Armas nuevas de REQ-029 § contenido estimado v1: entran por mapa o botín y
  // no cambian el equipo inicial del roster.
  hammer: {
    id: 'hammer',
    name: 'Martillo',
    accuracy: 2,
    damagePackets: [{ type: 'blunt', amount: 4 }],
    estimatedV1: true,
  },
  'electric-sword': {
    id: 'electric-sword',
    name: 'Espada electrizada',
    accuracy: 3,
    damagePackets: [
      { type: 'slash', amount: 3 },
      { type: 'electric', amount: 1 },
    ],
    estimatedV1: true,
  },
  'arcane-dagger': {
    id: 'arcane-dagger',
    name: 'Daga arcana',
    accuracy: 4,
    damagePackets: [
      { type: 'pierce', amount: 2 },
      { type: 'magic', amount: 1 },
    ],
    estimatedV1: true,
  },
};

export const ARMORS: Readonly<Record<ArmorId, ArmorDefinition>> = {
  armor: { id: 'armor', name: 'Armadura', armor: 1 },
  plate: { id: 'plate', name: 'Coraza', armor: 2 },
};

export const SHIELDS: Readonly<Record<ShieldId, ShieldDefinition>> = {
  shield: { id: 'shield', name: 'Escudo', defense: 1 },
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

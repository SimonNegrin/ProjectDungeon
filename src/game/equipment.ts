/**
 * Catálogo de equipo de combate (REQ-010).
 *
 * Es un módulo de datos puro: identificadores estables y estadísticas. Ni el
 * motor ni los tests deben codificar valores de armas, armaduras o escudos
 * fuera de este catálogo.
 */

export type WeaponId = 'sword' | 'axe' | 'dagger';
export type ArmorId = 'armor' | 'plate';
export type ShieldId = 'shield';

export interface WeaponDefinition {
  readonly id: WeaponId;
  readonly name: string;
  /** Bono que suma al modificador de acierto del portador. */
  readonly accuracy: number;
  /** Bono que suma al modificador de daño del portador. */
  readonly damage: number;
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
  sword: { id: 'sword', name: 'Espada', accuracy: 3, damage: 4 },
  axe: { id: 'axe', name: 'Hacha', accuracy: 2, damage: 6 },
  dagger: { id: 'dagger', name: 'Daga', accuracy: 4, damage: 3 },
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

/** Valor de armadura; `null` representa no llevar armadura. */
export function armorValue(id: ArmorId | null): number {
  return id === null ? 0 : ARMORS[id].armor;
}

/** Valor de escudo; `null` representa no llevar escudo. */
export function shieldValue(id: ShieldId | null): number {
  return id === null ? 0 : SHIELDS[id].defense;
}

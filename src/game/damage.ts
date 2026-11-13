/**
 * Resolvedor único y puro de paquetes de daño (REQ-029 T-004).
 *
 * Ataques de arma, réplicas y hechizos resuelven el daño por aquí: un dado de
 * daño y un dado de resistencia por paquete, en el orden fijo en que aparecen.
 * Los paquetes físicos suman fuerza y restan armadura; mágico y eléctrico
 * ignoran ambas. La banda de resistencia se aplica después de la absorción con
 * `floor`, cada paquete se recorta a 0 y el total es `max(1, suma)`. Sin
 * inmunidades absolutas.
 */

import { rollDie } from './rng';
import type {
  DamagePacket,
  DamageType,
  ResistanceBand,
  ResistanceProfile,
  RngState,
} from './types';

/** ¿Es un tipo físico? Solo los físicos suman fuerza y restan armadura. */
export function isPhysical(type: DamageType): boolean {
  return type === 'slash' || type === 'blunt' || type === 'pierce';
}

/** Multiplicadores de banda (REQ-029 R-008). */
export const BAND_MULTIPLIERS: Readonly<Record<ResistanceBand, number>> = {
  vulnerable: 1.5,
  normal: 1,
  resistant: 0.5,
  'very-resistant': 0.25,
};

/** Banda de un perfil para un tipo; la ausente es `normal` (REQ-029 T-003). */
export function bandFor(profile: ResistanceProfile, type: DamageType): ResistanceBand {
  return profile[type] ?? 'normal';
}

/** Dados de un paquete ya resueltos: daño y resistencia, en el orden del RNG. */
export interface PacketRolls {
  readonly type: DamageType;
  readonly damage: number;
  readonly resistance: number;
}

/**
 * Daño de un paquete con dados ya conocidos, sin aplicar el mínimo global.
 * Devuelve el daño recortado a 0 tras aplicar la banda con `floor`.
 */
export function resolvePacket(
  packet: DamagePacket,
  strength: number,
  armor: number,
  band: ResistanceBand,
  damageDie: number,
  resistanceDie: number,
): number {
  const raw = isPhysical(packet.type)
    ? packet.amount + strength + damageDie - (armor + resistanceDie)
    : packet.amount + damageDie - resistanceDie;
  return Math.max(0, Math.floor(Math.max(0, raw) * BAND_MULTIPLIERS[band]));
}

export interface ResolvePacketsResult {
  /** Daño total del ataque, con mínimo global 1. */
  readonly total: number;
  /** Dados por paquete, en orden fijo. */
  readonly rolls: readonly PacketRolls[];
  readonly rng: RngState;
}

/**
 * Resuelve una lista de paquetes consumiendo el RNG: por paquete, un dado de
 * daño y uno de resistencia. No muta el RNG recibido. El total es
 * `max(1, suma)`; un paquete nunca resta a otro.
 */
export function resolvePackets(
  packets: readonly DamagePacket[],
  strength: number,
  armor: number,
  profile: ResistanceProfile,
  rng: RngState,
): ResolvePacketsResult {
  let current = rng;
  let total = 0;
  const rolls: PacketRolls[] = [];

  for (const packet of packets) {
    const damageRoll = rollDie(current);
    const resistanceRoll = rollDie(damageRoll.rng);
    current = resistanceRoll.rng;
    rolls.push({
      type: packet.type,
      damage: damageRoll.die,
      resistance: resistanceRoll.die,
    });

    total += resolvePacket(
      packet,
      strength,
      armor,
      bandFor(profile, packet.type),
      damageRoll.die,
      resistanceRoll.die,
    );
  }

  return { total: Math.max(1, total), rolls, rng: current };
}

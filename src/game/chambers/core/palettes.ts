/**
 * Paletas y estilos del núcleo de chambers (REQ-008 / REQ-011 R-009/R-010).
 *
 * Asigna un ambiente y una paleta de suelo por sala completa sin importar
 * `src/host/`: los colores y el render quedan para el host. El estilo de puerta
 * se deriva de la semilla y del par de salas, y es estable entre partidas.
 */

import { DOOR_STYLES, type DoorStyle } from '../../map';
import { hashSeed } from './rng';

export type ChamberAmbient = 'humid' | 'death' | 'ruin' | 'vegetation' | 'mixed';
export type ChamberPaletteId = 'neutral' | 'humid' | 'death' | 'ruin' | 'vegetation';

export const AMBIENT_ORDER: readonly ChamberAmbient[] = [
  'humid',
  'death',
  'ruin',
  'vegetation',
  'mixed',
];

/** Mapeo determinista ambiente → paleta; `mixed` usa la neutra. */
export const AMBIENT_PALETTE: Readonly<Record<ChamberAmbient, ChamberPaletteId>> = {
  humid: 'humid',
  death: 'death',
  ruin: 'ruin',
  vegetation: 'vegetation',
  mixed: 'neutral',
};

export interface RoomPalette {
  readonly roomId: number;
  readonly ambient: ChamberAmbient;
  readonly palette: ChamberPaletteId;
}

/** Ambiente de una sala; el desplazamiento por semilla recorre los cinco. */
export function ambientFor(seed: number, roomId: number): ChamberAmbient {
  const offset = (seed >>> 0) % AMBIENT_ORDER.length;
  return AMBIENT_ORDER[(roomId + offset) % AMBIENT_ORDER.length];
}

/** Paletas de todas las salas, una entrada por sala y en su orden. */
export function assignRoomPalettes(
  seed: number,
  rooms: readonly { readonly id: number }[],
): readonly RoomPalette[] {
  return rooms.map((room) => {
    const ambient = ambientFor(seed, room.id);
    return { roomId: room.id, ambient, palette: AMBIENT_PALETTE[ambient] };
  });
}

/**
 * Estilo de puerta estable por semilla, par de salas y posición. Se apoya en
 * `hashSeed`, no en `Math.random`, y siempre devuelve uno de los tres estilos
 * del modelo.
 */
export function doorStyleFor(
  seed: number,
  roomA: number,
  roomB: number,
  x: number,
  y: number,
): DoorStyle {
  const salt =
    (seed ^ Math.imul(roomA + 1, 0x9e3779b9) ^ Math.imul(roomB + 7, 0x85ebca6b)) >>> 0;
  const hash = hashSeed(salt, x * 31 + y * 17);
  return DOOR_STYLES[hash % DOOR_STYLES.length];
}

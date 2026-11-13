import { describe, expect, it } from 'vitest';
import {
  BAND_MULTIPLIERS,
  WEAPONS,
  bandFor,
  isPhysical,
  resolvePacket,
  resolvePackets,
  validateDamagePackets,
  type DamagePacket,
  type ResistanceProfile,
} from '../../../src/game/index';
import { advanceRng, rngForDice } from './helpers';

const SLASH: DamagePacket = { type: 'slash', amount: 3 };

describe('resolvedor de paquetes', () => {
  it('aplica las cuatro bandas con multiplicador y floor tras la absorción', () => {
    const packet = { type: 'slash' as const, amount: 5 };
    expect(resolvePacket(packet, 0, 0, 'vulnerable', 1, 1)).toBe(7); // 5 × 1,5 = 7,5 → 7
    expect(resolvePacket(packet, 0, 0, 'normal', 1, 1)).toBe(5);
    expect(resolvePacket(packet, 0, 0, 'resistant', 1, 1)).toBe(2); // 2,5 → 2
    expect(resolvePacket(packet, 0, 0, 'very-resistant', 1, 1)).toBe(1); // 1,25 → 1
    expect(BAND_MULTIPLIERS).toEqual({
      vulnerable: 1.5,
      normal: 1,
      resistant: 0.5,
      'very-resistant': 0.25,
    });
  });

  it('la banda se aplica después de la absorción y cada paquete se recorta a 0', () => {
    // bruto = 3 + 4 − (2 + 1) = 4; vulnerable → floor(4 × 1,5) = 6.
    expect(resolvePacket(SLASH, 0, 2, 'vulnerable', 4, 1)).toBe(6);
    // La absorción deja bruto negativo: se recorta a 0 antes de multiplicar.
    expect(resolvePacket(SLASH, 0, 20, 'vulnerable', 6, 1)).toBe(0);
  });

  it('la fuerza suma solo al paquete físico y la armadura solo lo reduce', () => {
    const physical = { type: 'slash' as const, amount: 3 };
    const magical = { type: 'magic' as const, amount: 3 };
    const electric = { type: 'electric' as const, amount: 3 };

    // Fuerza suma solo al físico.
    expect(resolvePacket(physical, 0, 0, 'normal', 2, 1)).toBe(4);
    expect(resolvePacket(physical, 2, 0, 'normal', 2, 1)).toBe(6);
    // Armadura solo resta al físico.
    expect(resolvePacket(physical, 0, 3, 'normal', 2, 1)).toBe(1);
    // Mágico y eléctrico ignoran fuerza y armadura.
    expect(resolvePacket(magical, 5, 5, 'normal', 2, 1)).toBe(4);
    expect(resolvePacket(electric, 5, 5, 'normal', 2, 1)).toBe(4);
  });

  it('resuelve un ataque mixto sumando paquetes físicos y elementales', () => {
    const packets: readonly DamagePacket[] = [
      { type: 'slash', amount: 3 },
      { type: 'electric', amount: 1 },
    ];
    const profile: ResistanceProfile = { electric: 'resistant' };
    // filo: 3 + 1 + 4 − (1 + 2) = 5 → normal = 5.
    // eléctrico: 1 + 3 − 5 = 0 → resistente = 0.
    const result = resolvePackets(packets, 1, 1, profile, rngForDice([4, 2, 3, 5]));

    expect(result.total).toBe(5);
    expect(result.rolls).toEqual([
      { type: 'slash', damage: 4, resistance: 2 },
      { type: 'electric', damage: 3, resistance: 5 },
    ]);
  });

  it('aplica el mínimo 1 global aunque todos los paquetes queden a 0', () => {
    const result = resolvePackets(
      [{ type: 'slash', amount: 1 }, { type: 'magic', amount: 1 }],
      0,
      10,
      {},
      rngForDice([1, 6, 1, 6]),
    );
    expect(result.total).toBe(1);
  });

  it('consume daño y resistencia por paquete en el orden fijo del RNG', () => {
    const rng = rngForDice([4, 2, 3, 5]);
    const packets: readonly DamagePacket[] = [
      { type: 'slash', amount: 3 },
      { type: 'electric', amount: 1 },
    ];
    const result = resolvePackets(packets, 1, 1, {}, rng);

    expect(result.rng).toEqual(advanceRng(rng, [4, 2, 3, 5]));
    // Un paquete consume exactamente dos tiradas.
    const single = resolvePackets([{ type: 'slash', amount: 3 }], 0, 0, {}, rng);
    expect(single.rng).toEqual(advanceRng(rng, [4, 2]));
  });

  it('clasifica los cinco tipos: tres físicos y dos elementales', () => {
    expect(isPhysical('slash')).toBe(true);
    expect(isPhysical('blunt')).toBe(true);
    expect(isPhysical('pierce')).toBe(true);
    expect(isPhysical('magic')).toBe(false);
    expect(isPhysical('electric')).toBe(false);
    expect(bandFor({ slash: 'resistant' }, 'slash')).toBe('resistant');
    expect(bandFor({}, 'magic')).toBe('normal');
  });
});

describe('validación del catálogo de armas', () => {
  it('todas las armas del catálogo pasan la validación', () => {
    for (const weapon of Object.values(WEAPONS)) {
      expect(validateDamagePackets(weapon.damagePackets), weapon.id).toBe(true);
    }
  });

  it('rechaza dos físicos, dos elementales o más de dos paquetes', () => {
    expect(
      validateDamagePackets([
        { type: 'slash', amount: 1 },
        { type: 'pierce', amount: 1 },
      ]),
    ).toBe(false);
    expect(
      validateDamagePackets([
        { type: 'magic', amount: 1 },
        { type: 'electric', amount: 1 },
      ]),
    ).toBe(false);
    expect(
      validateDamagePackets([
        { type: 'slash', amount: 1 },
        { type: 'magic', amount: 1 },
        { type: 'electric', amount: 1 },
      ]),
    ).toBe(false);
    // Un físico + un elemental es válido en este corte.
    expect(
      validateDamagePackets([
        { type: 'slash', amount: 3 },
        { type: 'electric', amount: 1 },
      ]),
    ).toBe(true);
  });
});

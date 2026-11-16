import { describe, expect, it } from 'vitest';
import { ITEMS, TRAITS } from '../../../src/game/equipment';
import { traitEffectText, traitText } from '../../../src/host/trait-labels';

describe('texto visible de un trait', () => {
  it('el ataque circular se lee con nombre, descripción y efecto', () => {
    const line = traitText(
      'circular-strike',
      ITEMS['circular-mace'].traits[0].description,
    );
    expect(line).toContain('Ataque circular:');
    expect(line).toContain('Golpea las 8 casillas adyacentes');
    expect(line).toContain('radio 1');
    expect(line).toContain('sin centro');
    expect(line).toContain('1 acción');
  });

  it('el robo de vida muestra porcentaje y mínimo', () => {
    expect(traitEffectText(TRAITS.lifesteal.parameters)).toBe(
      '50 % del daño, mínimo 1',
    );
    expect(traitText('lifesteal', ITEMS['lifesteal-ring'].traits[0].description)).toContain(
      'Robo de vida:',
    );
  });

  it('un modificador no repite el número entre paréntesis y conserva la fuente', () => {
    expect(traitText('precise', '+1 habilidad.', {
      itemName: 'Espada',
      slotLabel: 'Arma',
    })).toBe('Precisión (Espada, Arma): +1 habilidad.');
  });

  it('un ID fuera del catálogo mantiene el formato de los fixtures', () => {
    expect(traitText('filoso', 'Corta más')).toBe('filoso: Corta más');
  });
});

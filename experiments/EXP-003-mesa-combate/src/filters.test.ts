import { describe, expect, it } from 'vitest';
import {
  filterCombatBlocks,
  filterHeroes,
  filterWeapons,
  groupMatchupsByEnemy,
  matchesSearch,
  normalizeSearchText,
  weaponRows,
} from './bench-ui';
import type { EnemyBlock } from './bench-ui';
import { CATALOG } from './v2/catalog';
import { measureMatchups } from './v2/measure';
import type { MatchupResult } from './v2/measure';

const BASE = measureMatchups({ seed: 31, duels: 24 });

const UNITS = [...CATALOG.roster, ...CATALOG.bestiary];

function nameOf(id: string): string {
  return UNITS.find((unit) => unit.id === id)?.name ?? id;
}

function combatBlocks(): ReadonlyArray<EnemyBlock<MatchupResult>> {
  return groupMatchupsByEnemy(BASE.matchups, BASE.enemyOrder);
}

describe('normalización y coincidencia de los filtros', () => {
  it('quita tildes, mayúsculas y espacios de los extremos', () => {
    expect(normalizeSearchText('Clérigo')).toBe('clerigo');
    expect(normalizeSearchText('  CENTINELA  ')).toBe('centinela');
    expect(normalizeSearchText('Ñandú')).toBe('nandu');
    expect(normalizeSearchText('')).toBe('');
  });

  it('encuentra por subcadena sin distinguir mayúsculas ni tildes', () => {
    expect(matchesSearch('Clérigo', 'clerigo')).toBe(true);
    expect(matchesSearch('Clérigo', 'CLÉRIGO')).toBe(true);
    expect(matchesSearch('Centinela', 'centi')).toBe(true);
    expect(matchesSearch('Centinela', 'zombi')).toBe(false);
    expect(matchesSearch('Centinela', '')).toBe(true);
    expect(matchesSearch('Centinela', '   ')).toBe(true);
  });
});

describe('filtro de la tabla de armas', () => {
  const rows = weaponRows(CATALOG);

  it('busca por nombre del arma, sin mayúsculas ni tildes', () => {
    expect(filterWeapons(rows, 'espada').map((row) => row.id)).toEqual([
      'espada',
    ]);
    expect(filterWeapons(rows, 'ESPADA').map((row) => row.id)).toEqual([
      'espada',
    ]);
    expect(filterWeapons(rows, 'cuchi').map((row) => row.id)).toEqual([
      'cuchillo',
    ]);
  });

  it('busca también en las unidades que usan el arma', () => {
    expect(filterWeapons(rows, 'guerrero').map((row) => row.id)).toEqual([
      'espada',
    ]);
    expect(filterWeapons(rows, 'picaro').map((row) => row.id)).toEqual([
      'daga',
    ]);
    expect(filterWeapons(rows, 'PÍCARO').map((row) => row.id)).toEqual([
      'daga',
    ]);
    expect(filterWeapons(rows, 'centinela').map((row) => row.id)).toEqual([
      'espada',
    ]);
    expect(filterWeapons(rows, 'bruto').map((row) => row.id)).toEqual([
      'hacha',
    ]);
  });

  it('devuelve la misma referencia de fila y no muta la entrada', () => {
    const filtered = filterWeapons(rows, 'guerrero');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(rows.find((row) => row.id === 'espada'));
    expect(rows.map((row) => row.id)).toEqual(Object.keys(CATALOG.weapons));
  });
});

describe('filtro de la tabla de héroes', () => {
  it('encuentra Clérigo con «clerigo» y respeta el orden del catálogo', () => {
    expect(
      filterHeroes(CATALOG.roster, 'clerigo').map((hero) => hero.id),
    ).toEqual(['clerigo']);
    expect(
      filterHeroes(CATALOG.roster, 'CLÉRIGO').map((hero) => hero.id),
    ).toEqual(['clerigo']);
    expect(filterHeroes(CATALOG.roster, 'guerrero').map((hero) => hero.id)).toEqual(
      ['guerrero'],
    );
  });

  it('no muta la entrada y devuelve las mismas referencias', () => {
    const filtered = filterHeroes(CATALOG.roster, 'mago');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(CATALOG.roster.find((hero) => hero.id === 'mago'));
    expect(filterHeroes(CATALOG.roster, '')).toHaveLength(CATALOG.roster.length);
  });
});

describe('filtro de la tabla de combates', () => {
  it('el filtro de héroe deja una fila por bloque y un rowspan de 1', () => {
    const filtered = filterCombatBlocks(
      combatBlocks(),
      { hero: 'guerrero', enemy: '' },
      nameOf,
    );

    expect(filtered.map((block) => block.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    for (const block of filtered) {
      expect(block.rows).toHaveLength(1);
      expect(block.rows[0]?.heroId).toBe('guerrero');
      // La UI usa block.rows.length como rowSpan visible.
      expect(block.rows.length).toBe(1);
    }
  });

  it('el filtro de enemigo deja su bloque con sus cuatro filas', () => {
    const filtered = filterCombatBlocks(
      combatBlocks(),
      { hero: '', enemy: 'centinela' },
      nameOf,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.enemyId).toBe('centinela');
    expect(filtered[0]?.rows).toHaveLength(4);
    expect(filtered[0]?.rows.map((row) => row.heroId)).toEqual([
      'guerrero',
      'picaro',
      'mago',
      'clerigo',
    ]);
    expect(filtered[0]?.rows.length).toBe(4);
  });

  it('combina héroe y enemigo, acepta tildes y mayúsculas y conserva el orden', () => {
    const original = combatBlocks();
    const filtered = filterCombatBlocks(
      original,
      { hero: 'CLÉRIGO', enemy: 'CENTINELA' },
      nameOf,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.enemyId).toBe('centinela');
    expect(filtered[0]?.rows.map((row) => row.heroId)).toEqual(['clerigo']);
    expect(filtered[0]?.rows[0]).toBe(
      original[0]?.rows.find((row) => row.heroId === 'clerigo'),
    );
  });

  it('elimina un bloque sin filas visibles y conserva los demás', () => {
    const blocks: ReadonlyArray<
      EnemyBlock<{ readonly heroId: string; readonly enemyId: string }>
    > = [
      {
        enemyId: 'centinela',
        rows: [
          { heroId: 'guerrero', enemyId: 'centinela' },
          { heroId: 'clerigo', enemyId: 'centinela' },
        ],
      },
      {
        enemyId: 'bruto',
        rows: [{ heroId: 'mago', enemyId: 'bruto' }],
      },
    ];

    const filtered = filterCombatBlocks(
      blocks,
      { hero: 'guerrero', enemy: '' },
      nameOf,
    );
    expect(filtered.map((block) => block.enemyId)).toEqual(['centinela']);
    expect(filtered[0]?.rows).toHaveLength(1);
  });

  it('sin coincidencias devuelve una lista vacía (aviso de sin resultados)', () => {
    expect(
      filterCombatBlocks(combatBlocks(), { hero: 'zombi', enemy: '' }, nameOf),
    ).toEqual([]);
    expect(
      filterWeapons(weaponRows(CATALOG), 'zombi'),
    ).toEqual([]);
    expect(filterHeroes(CATALOG.roster, 'zombi')).toEqual([]);
  });

  it('no muta los bloques de entrada y conserva las referencias de fila', () => {
    const original = combatBlocks();
    const enemyIds = original.map((block) => block.enemyId);
    const rowCounts = original.map((block) => block.rows.length);
    const firstRows = original.map((block) => block.rows[0]);

    const filtered = filterCombatBlocks(
      original,
      { hero: 'guerrero', enemy: '' },
      nameOf,
    );

    expect(original.map((block) => block.enemyId)).toEqual(enemyIds);
    expect(original.map((block) => block.rows.length)).toEqual(rowCounts);
    expect(filtered[0]?.rows[0]).toBe(firstRows[0]);
  });
});

describe('los filtros no miden ni alteran los resultados', () => {
  it('deja intacto el payload y no toca los duelos al filtrar', () => {
    const snapshot = JSON.stringify(BASE);
    const blocks = combatBlocks();

    filterCombatBlocks(blocks, { hero: 'guerrero', enemy: 'centinela' }, nameOf);
    filterWeapons(weaponRows(CATALOG), 'guerrero');
    filterHeroes(CATALOG.roster, 'clerigo');

    expect(JSON.stringify(BASE)).toBe(snapshot);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]?.rows[0]).toBe(BASE.matchups[0]);
    expect(BASE.matchups).toHaveLength(12);
  });
});

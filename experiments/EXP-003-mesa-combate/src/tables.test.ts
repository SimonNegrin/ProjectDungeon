import { describe, expect, it } from 'vitest';
import {
  COMBAT_COLUMNS,
  ENEMY_TABLE_FIELDS,
  HERO_COLUMNS,
  HERO_TABLE_FIELDS,
  WEAPON_COLUMNS,
  enemyFieldPatch,
  formatRealCell,
  formatRecalcStatus,
  formatWeaponBonus,
  formatWeaponUsers,
  formatWins,
  groupMatchupsByEnemy,
  pruneOverrides,
  validateEnemyField,
  validateHeroField,
  validateWeaponField,
  weaponRows,
} from './bench-ui';
import {
  CATALOG,
  GUIDE_TARGETS,
  affectedRows,
  benchExportJson,
  buildBenchExport,
  createTargets,
  createWorkingCatalog,
  diagnoseBench,
  emptyOverrides,
  measureMatchups,
  overridesId,
  recalculateMatchups,
  resetEnemies,
  resetHeroes,
  resetOverrides,
  resetTargets,
  resetWeapons,
  rowKey,
  runMatchup,
  setTarget,
  withEnemyOverride,
  withHeroOverride,
  withWeaponOverride,
} from './v2/index';
import type { BenchOverrides } from './v2/index';

const BASE = measureMatchups({ seed: 31, duels: 24 });

function changedAndUntouched(
  previous: typeof BASE,
  next: typeof BASE,
  catalog: typeof CATALOG,
  affectedKeys: ReadonlySet<string>,
): { changed: number; untouched: number } {
  let changed = 0;
  let untouched = 0;
  for (let index = 0; index < previous.matchups.length; index += 1) {
    const before = previous.matchups[index];
    const after = next.matchups[index];
    if (affectedKeys.has(rowKey(before))) {
      changed += 1;
      expect(after).toEqual(
        runMatchup(before.heroId, before.enemyId, previous.seed, previous.duels, catalog),
      );
    } else {
      untouched += 1;
      expect(after).toBe(before);
    }
  }
  return { changed, untouched };
}

function keysOf(
  rows: ReadonlyArray<{ readonly heroId: string; readonly enemyId: string }>,
): Set<string> {
  return new Set(rows.map(rowKey));
}

describe('columnas exactas de las tres tablas', () => {
  it('la tabla de combates tiene 15 columnas en el orden aprobado', () => {
    expect(COMBAT_COLUMNS).toEqual([
      'Héroe',
      'Enemigo',
      'Victorias héroe',
      'Victorias enemigo',
      '% objetivo',
      '% real',
      'PV',
      'Acierto',
      'Daño',
      'Defensa',
      'Resistencia',
      'Acciones',
      'Armadura',
      'Escudo',
      'Arma',
    ]);
    expect(ENEMY_TABLE_FIELDS.map((entry) => entry.label)).toEqual([
      'PV',
      'Acierto',
      'Daño',
      'Defensa',
      'Resistencia',
      'Acciones',
      'Armadura',
      'Escudo',
      'Arma',
    ]);
    expect(ENEMY_TABLE_FIELDS.map((entry) => entry.field)).toEqual([
      'maxHp',
      'habilidad',
      'fuerza',
      'defensa',
      'resistencia',
      'maxActions',
      'armorId',
      'shieldId',
      'weaponId',
    ]);
  });

  it('las tablas de armas y héroes exponen sus columnas y campos editables', () => {
    expect(WEAPON_COLUMNS).toEqual(['Arma', 'Acierto', 'Daño']);
    expect(HERO_COLUMNS).toEqual([
      'Héroe',
      'Arma inicial',
      'PV',
      'Acierto',
      'Daño',
      'Defensa',
      'Resistencia',
      'Acciones',
      'Armadura',
      'Escudo',
      'Nivel de magia',
    ]);
    expect(HERO_TABLE_FIELDS.map((entry) => entry.label)).toEqual(
      HERO_COLUMNS.slice(1),
    );
  });
});

describe('agrupación de filas por enemigo', () => {
  it('agrupa los 12 combates en 3 bloques de 4 héroes', () => {
    const blocks = groupMatchupsByEnemy(BASE.matchups, BASE.enemyOrder);
    expect(blocks.map((block) => block.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    for (const block of blocks) {
      expect(block.rows).toHaveLength(4);
      expect(block.rows.every((row) => row.enemyId === block.enemyId)).toBe(true);
    }
    expect(blocks[0].rows.map((row) => row.heroId)).toEqual([
      'guerrero',
      'picaro',
      'mago',
      'clerigo',
    ]);
  });

  it('respeta el orden de enemigos pedido y añade los ausentes al final', () => {
    const blocks = groupMatchupsByEnemy(BASE.matchups, ['cobarde', 'bruto']);
    expect(blocks.map((block) => block.enemyId)).toEqual([
      'cobarde',
      'bruto',
      'centinela',
    ]);
    const noOrder = groupMatchupsByEnemy(BASE.matchups);
    expect(noOrder.map((block) => block.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
  });
});

describe('formato de celdas de la mesa', () => {
  it('compone % real con delta y estado en una sola celda', () => {
    expect(formatRealCell(71.2, -3.8, true)).toBe('71,2 % · −3,8 pp · dentro');
    expect(formatRealCell(82.1, 7.1, false)).toBe('82,1 % · +7,1 pp · fuera');
  });

  it('muestra los empates solo como sufijo cuando existen', () => {
    expect(formatWins(7, 0)).toBe('7');
    expect(formatWins(2, 1)).toBe('2 (+1 empate)');
    expect(formatWins(2, 2)).toBe('2 (+2 empates)');
  });

  it('muestra acierto/daño y unidades del arma bajo el nombre', () => {
    expect(formatWeaponBonus(CATALOG.weapons.espada)).toBe(
      'Acierto +3 · Daño +3',
    );
    expect(formatWeaponBonus(null)).toBe('sin arma');
    expect(
      formatWeaponBonus({ id: 'x', name: 'X', accuracy: -1, damage: 0 }),
    ).toBe('Acierto −1 · Daño ±0');
    expect(formatWeaponUsers(['Guerrero', 'Centinela'])).toBe(
      'Guerrero, Centinela',
    );
    expect(formatWeaponUsers([])).toBe('sin unidades');
  });

  it('el hint del arma del enemigo sale del catálogo de trabajo', () => {
    const withWeapon = createWorkingCatalog(
      CATALOG,
      pruneOverrides(
        CATALOG,
        withEnemyOverride(emptyOverrides(), 'centinela', { weaponId: 'hacha' }),
      ),
    );
    const centinela = withWeapon.bestiary.find((entry) => entry.id === 'centinela');
    expect(centinela?.weaponId).toBe('hacha');
    expect(
      formatWeaponBonus(
        centinela?.weaponId ? withWeapon.weapons[centinela.weaponId] : null,
      ),
    ).toBe('Acierto +2 · Daño +5');

    const withoutWeapon = createWorkingCatalog(
      CATALOG,
      pruneOverrides(
        CATALOG,
        withEnemyOverride(emptyOverrides(), 'bruto', { weaponId: null }),
      ),
    );
    const bruto = withoutWeapon.bestiary.find((entry) => entry.id === 'bruto');
    expect(bruto?.weaponId).toBeNull();
    expect(
      formatWeaponBonus(bruto?.weaponId ? withoutWeapon.weapons[bruto.weaponId] : null),
    ).toBe('sin arma');

    const edited = createWorkingCatalog(
      CATALOG,
      pruneOverrides(
        CATALOG,
        withWeaponOverride(emptyOverrides(), 'hacha', { damage: 9 }),
      ),
    );
    expect(formatWeaponBonus(edited.weapons.hacha)).toBe('Acierto +2 · Daño +9');
  });

  it('indica el número de filas recalculadas con singular y plural', () => {
    expect(formatRecalcStatus(0)).toBe('Recalculado: 0 filas afectadas.');
    expect(formatRecalcStatus(1)).toBe('Recalculado: 1 fila afectada.');
    expect(formatRecalcStatus(6)).toBe('Recalculado: 6 filas afectadas.');
  });
});

describe('integración de estado sin DOM', () => {
  it('editar un stat de enemigo recalcula sus 4 filas y exporta igual con el mismo estado', () => {
    const validation = validateEnemyField('defensa', '2', CATALOG);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const overrides = pruneOverrides(
      CATALOG,
      withEnemyOverride(
        emptyOverrides(),
        'centinela',
        enemyFieldPatch('defensa', validation.value),
      ),
    );
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const affected = affectedRows(catalog, { kind: 'enemy', enemyId: 'centinela' });
    expect(affected).toHaveLength(4);

    const recalculated = recalculateMatchups(BASE, catalog, {
      kind: 'enemy',
      enemyId: 'centinela',
    });
    const counts = changedAndUntouched(
      BASE,
      recalculated,
      catalog,
      keysOf(affected),
    );
    expect(counts).toEqual({ changed: 4, untouched: 8 });

    const left = buildBenchExport(recalculated, catalog, createTargets(), overrides);
    const right = buildBenchExport(
      recalculateMatchups(BASE, createWorkingCatalog(CATALOG, overrides), {
        kind: 'enemy',
        enemyId: 'centinela',
      }),
      createWorkingCatalog(CATALOG, overrides),
      createTargets(),
      overrides,
    );
    expect(benchExportJson(left)).toBe(benchExportJson(right));
    expect(left.overridesId).toBe(right.overridesId);
  });

  it('editar el arma inicial de un héroe recalcula sus 3 filas y actualiza la tabla de armas', () => {
    const validation = validateHeroField('weaponId', 'espada', CATALOG);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const overrides = pruneOverrides(
      CATALOG,
      withHeroOverride(emptyOverrides(), 'mago', {
        weaponId:
          typeof validation.value === 'string' ? validation.value : null,
      }),
    );
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const affected = affectedRows(catalog, { kind: 'hero', heroId: 'mago' });
    expect(affected).toHaveLength(3);

    const recalculated = recalculateMatchups(BASE, catalog, {
      kind: 'hero',
      heroId: 'mago',
    });
    expect(
      changedAndUntouched(BASE, recalculated, catalog, keysOf(affected)),
    ).toEqual({ changed: 3, untouched: 9 });

    expect(weaponRows(catalog).find((weapon) => weapon.id === 'espada')?.users).toEqual([
      'Guerrero',
      'Mago',
      'Centinela',
    ]);
    expect(overridesId(overrides)).not.toBe(overridesId(emptyOverrides()));
  });

  it('editar un arma compartida recalcula las 6 filas donde se usa', () => {
    expect(validateWeaponField('accuracy', 4).ok).toBe(true);
    const overrides = pruneOverrides(
      CATALOG,
      withWeaponOverride(emptyOverrides(), 'espada', {
        accuracy: 4,
        damage: 6,
      }),
    );
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const affected = affectedRows(catalog, { kind: 'weapon', weaponId: 'espada' });
    expect(affected).toHaveLength(6);

    const recalculated = recalculateMatchups(BASE, catalog, {
      kind: 'weapon',
      weaponId: 'espada',
    });
    expect(
      changedAndUntouched(BASE, recalculated, catalog, keysOf(affected)),
    ).toEqual({ changed: 6, untouched: 6 });
    expect(weaponRows(catalog).find((weapon) => weapon.id === 'espada')).toMatchObject({
      accuracy: 4,
      damage: 6,
    });
  });

  it('un objetivo solo mueve el diagnóstico, no los duelos', () => {
    const before = diagnoseBench(BASE.matchups, createTargets(), CATALOG);
    const targets = setTarget(createTargets(), 'centinela', 60);
    const after = diagnoseBench(BASE.matchups, targets, CATALOG);

    expect(after[0].target).toBe(60);
    expect(after[0].rows.map((row) => row.heroWinRate)).toEqual(
      before[0].rows.map((row) => row.heroWinRate),
    );
    expect(after[0].rows.map((row) => row.delta)).not.toEqual(
      before[0].rows.map((row) => row.delta),
    );
    expect(BASE.matchups).toHaveLength(12);
  });
});

describe('resets por tabla y global', () => {
  const populated: BenchOverrides = withHeroOverride(
    withWeaponOverride(
      withEnemyOverride(emptyOverrides(), 'centinela', {
        maxHp: 9,
        stats: { defensa: 2 },
      }),
      'espada',
      { damage: 6 },
    ),
    'mago',
    { maxHp: 15 },
  );

  it('cada tabla restaura solo su parte', () => {
    expect(resetEnemies(populated).enemies).toEqual({});
    expect(resetEnemies(populated).weapons.espada).toEqual({ damage: 6 });
    expect(resetEnemies(populated).heroes.mago).toEqual({ maxHp: 15 });

    expect(resetWeapons(populated).weapons).toEqual({});
    expect(resetWeapons(populated).enemies.centinela).toEqual({
      maxHp: 9,
      stats: { defensa: 2 },
    });

    expect(resetHeroes(populated).heroes).toEqual({});
    expect(resetHeroes(populated).weapons.espada).toEqual({ damage: 6 });
  });

  it('el reset global vacía overrides y objetivos vuelven a la guía', () => {
    expect(resetOverrides()).toEqual(emptyOverrides());
    expect(resetTargets()).toEqual(GUIDE_TARGETS);
  });
});

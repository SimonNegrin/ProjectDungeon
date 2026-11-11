import { describe, expect, it } from 'vitest';
import {
  benchFileName,
  enemyFieldPatch,
  enemyFieldValue,
  formatBenchSummary,
  formatDelta,
  formatDiagnosisRow,
  formatFourOfFour,
  formatRowState,
  formatTarget,
  pruneOverrides,
  resetEnemyFieldOverride,
  validateEnemyField,
  validateTargetInput,
  validateWeaponField,
  weaponRows,
  weaponUsers,
} from './bench-ui';
import type { EnemyField } from './bench-ui';
import {
  CATALOG,
  GUIDE_TARGETS,
  createTargets,
  createWorkingCatalog,
  diagnoseBench,
  diagnoseEnemy,
  emptyOverrides,
  measureMatchups,
  overridesId,
  recalculateMatchups,
  resetEnemyOverride,
  resetOverrides,
  resetTarget,
  resetWeaponOverride,
  rowKey,
  runMatchup,
  setTarget,
  withEnemyOverride,
  withWeaponOverride,
} from './v2/index';
import type {
  BenchOverrides,
  BenchTargets,
  EnemyOverride,
  MatchupResult,
  WeaponOverride,
} from './v2/index';
import { benchExportJson, buildBenchExport } from './v2/index';

const BASE = measureMatchups({ seed: 31, duels: 24 });

function rowsFor(enemyId: string): ReadonlyArray<MatchupResult> {
  return BASE.matchups.filter((matchup) => matchup.enemyId === enemyId);
}

function rated(
  rows: ReadonlyArray<MatchupResult>,
  rates: ReadonlyArray<number>,
): MatchupResult[] {
  return rows.map((row, index) => ({ ...row, heroWinRate: rates[index] }));
}

function expectValid(validation: ReturnType<typeof validateEnemyField>): void {
  expect(validation.ok).toBe(true);
}

describe('validación de campos de enemigo', () => {
  it('acepta PV, acciones y stats enteros dentro del rango documentado', () => {
    const maxHp = validateEnemyField('maxHp', '12', CATALOG);
    expect(maxHp).toEqual({ ok: true, value: 12, message: null });
    const actions = validateEnemyField('maxActions', 0, CATALOG);
    expect(actions).toEqual({ ok: true, value: 0, message: null });
    const stat = validateEnemyField('habilidad', '-2', CATALOG);
    expect(stat).toEqual({ ok: true, value: -2, message: null });
  });

  it('rechaza PV < 1, acciones negativas, decimales y vacíos', () => {
    for (const [field, raw] of [
      ['maxHp', 0],
      ['maxHp', 12.5],
      ['maxHp', ''],
      ['maxHp', 'no-numero'],
      ['maxActions', -1],
      ['maxActions', 1.5],
      ['fuerza', 21],
      ['defensa', Number.NaN],
    ] as const) {
      const validation = validateEnemyField(field, raw, CATALOG);
      expect(validation.ok).toBe(false);
      if (!validation.ok) expect(validation.message).toBeTruthy();
    }
  });

  it('valida selects contra el catálogo y permite vaciar el equipo', () => {
    expect(validateEnemyField('armorId', 'coraza', CATALOG)).toEqual({
      ok: true,
      value: 'coraza',
      message: null,
    });
    expect(validateEnemyField('weaponId', '', CATALOG)).toEqual({
      ok: true,
      value: null,
      message: null,
    });
    expect(validateEnemyField('shieldId', null, CATALOG)).toEqual({
      ok: true,
      value: null,
      message: null,
    });
    const unknown = validateEnemyField('armorId', 'mitral', CATALOG);
    expect(unknown.ok).toBe(false);
  });
});

describe('validación de armas y objetivos', () => {
  it('valida acierto y daño enteros en su rango', () => {
    expect(validateWeaponField('accuracy', -5)).toEqual({
      ok: true,
      value: -5,
      message: null,
    });
    expect(validateWeaponField('damage', 100)).toEqual({
      ok: true,
      value: 100,
      message: null,
    });
    for (const [field, raw] of [
      ['accuracy', -6],
      ['accuracy', 11],
      ['accuracy', 1.5],
      ['damage', -1],
      ['damage', 101],
      ['damage', ''],
    ] as const) {
      expect(validateWeaponField(field, raw).ok).toBe(false);
    }
  });

  it('acepta objetivos enteros de 0 a 100 y rechaza el resto', () => {
    expect(validateTargetInput('0')).toEqual({ ok: true, value: 0, message: null });
    expect(validateTargetInput('100')).toEqual({
      ok: true,
      value: 100,
      message: null,
    });
    for (const raw of ['', '75.5', '101', '-1', 'abc']) {
      expect(validateTargetInput(raw).ok).toBe(false);
    }
  });
});

describe('normalización de overrides', () => {
  it('elimina campos iguales a la base, entradas vacías y desconocidos', () => {
    const dirty: BenchOverrides = {
      enemies: {
        centinela: {
          maxHp: 6,
          stats: { defensa: 0, habilidad: 1 },
          armorId: null,
          shieldId: 'escudo',
          weaponId: null,
        },
        bruto: {},
        desconocido: { maxHp: 1 },
      },
      weapons: {
        espada: { accuracy: 3, damage: 4 },
        hacha: {},
        desconocida: { damage: 1 },
      },
    };

    const pruned = pruneOverrides(CATALOG, dirty);
    expect(pruned).toEqual({
      enemies: {
        centinela: { stats: { habilidad: 1 }, weaponId: null },
      },
      weapons: { espada: { damage: 4 } },
    });
    expect(pruned.enemies.bruto).toBeUndefined();
    expect(pruned.enemies.desconocido).toBeUndefined();
    expect(pruned.weapons.hacha).toBeUndefined();
  });

  it('elimina solo el campo pedido y deja listo el prune para el resto', () => {
    const overrides = withEnemyOverride(emptyOverrides(), 'centinela', {
      maxHp: 10,
      stats: { defensa: 2, habilidad: 1 },
    });
    const withoutDefense = resetEnemyFieldOverride(
      overrides,
      'centinela',
      'defensa',
    );
    expect(withoutDefense.enemies.centinela).toEqual({
      maxHp: 10,
      stats: { habilidad: 1 },
    });

    const withoutHp = resetEnemyFieldOverride(withoutDefense, 'centinela', 'maxHp');
    const withoutSkill = resetEnemyFieldOverride(
      withoutHp,
      'centinela',
      'habilidad',
    );
    expect(pruneOverrides(CATALOG, withoutSkill)).toEqual(emptyOverrides());
  });

  it('construye parches tipados y lee el valor efectivo del catálogo ajustado', () => {
    const patch = enemyFieldPatch('defensa', 3);
    expect(patch).toEqual({ stats: { defensa: 3 } });
    expect(enemyFieldPatch('armorId', null)).toEqual({ armorId: null });
    expect(enemyFieldPatch('weaponId', 'hacha')).toEqual({ weaponId: 'hacha' });

    const working = createWorkingCatalog(
      CATALOG,
      pruneOverrides(CATALOG, withEnemyOverride(emptyOverrides(), 'bruto', patch)),
    );
    const bruto = working.bestiary.find((entry) => entry.id === 'bruto');
    expect(bruto && enemyFieldValue(bruto, 'defensa')).toBe(3);
    expect(bruto && enemyFieldValue(bruto, 'weaponId')).toBe('hacha');
  });
});

describe('formato de objetivo, delta y diagnóstico', () => {
  it('formatea objetivo, delta y estado con texto además del color', () => {
    expect(formatTarget(75)).toBe('75 %');
    expect(formatTarget(0)).toBe('0 %');
    expect(formatDelta(7.12)).toBe('+7,1 pp');
    expect(formatDelta(-7.12)).toBe('−7,1 pp');
    expect(formatDelta(0)).toBe('±0,0 pp');
    expect(formatRowState(true)).toBe('dentro');
    expect(formatRowState(false)).toBe('fuera');
    expect(
      formatDiagnosisRow(82.1, 75, 7.1, false),
    ).toBe('real 82,1 % · objetivo 75 % · Δ +7,1 pp · fuera');
  });

  it('resume 4-de-4 con los héroes que quedan fuera', () => {
    const centinela = rowsFor('centinela');
    const three = diagnoseEnemy(
      rated(centinela, [75, 75, 82.1, 75]),
      75,
      5,
      CATALOG,
    );
    expect(three.fourOfFour).toBe(false);
    expect(formatFourOfFour(three, CATALOG)).toBe(
      '3/4; Mago fuera por +7,1 pp',
    );

    const all = diagnoseEnemy(rated(centinela, [75, 75, 75, 75]), 75, 5, CATALOG);
    expect(formatFourOfFour(all, CATALOG)).toBe('4/4 dentro');
  });

  it('lista todas las armas y sus unidades desde el catálogo', () => {
    const rows = weaponRows(CATALOG);
    expect(rows.map((row) => row.id)).toEqual(Object.keys(CATALOG.weapons));
    expect(rows.find((row) => row.id === 'espada')?.users).toEqual([
      'Guerrero',
      'Centinela',
    ]);
    expect(rows.find((row) => row.id === 'daga')?.users).toEqual([
      'Pícaro',
      'Cobarde',
    ]);
    expect(rows.find((row) => row.id === 'hacha')?.users).toEqual(['Bruto']);
    expect(rows.find((row) => row.id === 'cuchillo')?.users).toEqual([]);
    expect(weaponUsers(CATALOG, 'espada')).toEqual(['Guerrero', 'Centinela']);

    const custom = {
      ...CATALOG,
      weapons: {
        ...CATALOG.weapons,
        maza: { id: 'maza', name: 'Maza', accuracy: 1, damage: 4 },
      },
    };
    expect(weaponRows(custom).map((row) => row.id)).toContain('maza');
  });
});

describe('nombre y resumen del export', () => {
  it('conserva el nombre base sin overrides y usa bench-overrides-<id> con ajustes', () => {
    const base = measureMatchups({ seed: 42, duels: 10 });
    expect(benchFileName(base, emptyOverrides())).toBe(
      'EXP-003-v2.0-seed-42-duels-10.json',
    );

    const overrides = pruneOverrides(
      CATALOG,
      withWeaponOverride(emptyOverrides(), 'espada', { damage: 6 }),
    );
    const adjusted = benchFileName(base, overrides);
    expect(adjusted).toContain(`bench-overrides-${overridesId(overrides)}`);
    expect(adjusted).not.toBe(benchFileName(base, emptyOverrides()));
  });

  it('resume catálogo, semilla, overridesId, objetivos y diagnóstico', () => {
    const payload = measureMatchups({ seed: 42, duels: 10 });
    const overrides = pruneOverrides(
      CATALOG,
      withEnemyOverride(emptyOverrides(), 'centinela', { maxHp: 9 }),
    );
    const diagnosis = diagnoseBench(payload.matchups, createTargets(), CATALOG);
    const summary = formatBenchSummary(
      payload,
      overrides,
      diagnosis,
      1234,
      CATALOG,
    );

    expect(summary).toContain('catálogo EXP-003-v2.0.0');
    expect(summary).toContain('semilla 42');
    expect(summary).toContain(`overridesId ${overridesId(overrides)}`);
    expect(summary).toContain('Centinela 75 %');
    expect(summary).toContain('Bruto 30 %');
    expect(summary).toContain('Cobarde 85 %');
    expect(summary).toContain('diagnóstico:');
    expect(summary).toContain('1234 B');
  });
});

describe('integración sin DOM: filas afectadas y reset', () => {
  it('recalcula solo las 4 filas del enemigo ajustado y conserva el resto', () => {
    const overrides = pruneOverrides(
      CATALOG,
      withEnemyOverride(emptyOverrides(), 'centinela', {
        maxHp: 12,
        stats: { defensa: 2 },
      }),
    );
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const recalculated = recalculateMatchups(BASE, catalog, {
      kind: 'enemy',
      enemyId: 'centinela',
    });

    expect(recalculated.seed).toBe(BASE.seed);
    expect(recalculated.duels).toBe(BASE.duels);
    expect(recalculated.matchups.map(rowKey)).toEqual(BASE.matchups.map(rowKey));

    let changed = 0;
    let untouched = 0;
    for (let index = 0; index < BASE.matchups.length; index += 1) {
      const previous = BASE.matchups[index];
      const next = recalculated.matchups[index];
      if (previous.enemyId === 'centinela') {
        changed += 1;
        expect(next).toEqual(
          runMatchup(previous.heroId, previous.enemyId, BASE.seed, BASE.duels, catalog),
        );
      } else {
        untouched += 1;
        expect(next).toBe(previous);
      }
    }
    expect(changed).toBe(4);
    expect(untouched).toBe(8);
  });

  it('recalcula las 6 filas de un arma compartida y no toca las demás', () => {
    const overrides = pruneOverrides(
      CATALOG,
      withWeaponOverride(emptyOverrides(), 'espada', {
        accuracy: 2,
        damage: 6,
      }),
    );
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const recalculated = recalculateMatchups(BASE, catalog, {
      kind: 'weapon',
      weaponId: 'espada',
    });

    let changed = 0;
    let untouched = 0;
    for (let index = 0; index < BASE.matchups.length; index += 1) {
      const previous = BASE.matchups[index];
      const next = recalculated.matchups[index];
      const affected =
        (previous.heroId === 'guerrero' || previous.enemyId === 'centinela');
      if (affected) {
        changed += 1;
        expect(next).toEqual(
          runMatchup(previous.heroId, previous.enemyId, BASE.seed, BASE.duels, catalog),
        );
      } else {
        untouched += 1;
        expect(next).toBe(previous);
      }
    }
    expect(changed).toBe(6);
    expect(untouched).toBe(6);
  });

  it('encadena reset por campo, enemigo, arma y global', () => {
    const initial = pruneOverrides(
      CATALOG,
      withWeaponOverride(
        withEnemyOverride(emptyOverrides(), 'centinela', {
          maxHp: 10,
          stats: { defensa: 2 },
        }),
        'espada',
        { damage: 6 },
      ),
    );

    const afterField = pruneOverrides(
      CATALOG,
      resetEnemyFieldOverride(initial, 'centinela', 'maxHp'),
    );
    expect(afterField.enemies.centinela).toEqual({ stats: { defensa: 2 } });
    expect(afterField.weapons.espada).toEqual({ damage: 6 });

    const afterEnemy = pruneOverrides(
      CATALOG,
      resetEnemyOverride(afterField, 'centinela'),
    );
    expect(afterEnemy.enemies.centinela).toBeUndefined();
    expect(afterEnemy.weapons.espada).toEqual({ damage: 6 });

    const afterWeapon = pruneOverrides(
      CATALOG,
      resetWeaponOverride(afterEnemy, 'espada'),
    );
    expect(afterWeapon).toEqual(emptyOverrides());
    expect(resetOverrides()).toEqual(emptyOverrides());
  });

  it('cambiar el objetivo mueve diagnóstico y filas, no los duelos', () => {
    const before = diagnoseBench(BASE.matchups, createTargets(), CATALOG);
    const targets: BenchTargets = setTarget(createTargets(), 'centinela', 60);
    const after = diagnoseBench(BASE.matchups, targets, CATALOG);

    expect(before[0].target).toBe(GUIDE_TARGETS.centinela);
    expect(after[0].target).toBe(60);
    expect(after[0].rows[0].target).toBe(60);
    expect(after[0].rows[0].delta).not.toBe(before[0].rows[0].delta);
    expect(after[0].rows.map((row) => row.heroWinRate)).toEqual(
      before[0].rows.map((row) => row.heroWinRate),
    );
    expect(resetTarget(targets, 'centinela').centinela).toBe(
      GUIDE_TARGETS.centinela,
    );
  });

  it('el mismo estado produce el mismo export y el mismo overridesId', () => {
    const makeExport = (
      enemies: ReadonlyArray<readonly [string, EnemyOverride]>,
      weapon: WeaponOverride,
    ) => {
      let overrides = emptyOverrides();
      for (const [enemyId, patch] of enemies) {
        overrides = withEnemyOverride(overrides, enemyId, patch);
      }
      overrides = pruneOverrides(
        CATALOG,
        withWeaponOverride(overrides, 'espada', weapon),
      );
      const catalog = createWorkingCatalog(CATALOG, overrides);
      const payload = measureMatchups({ seed: 9, duels: 12, catalog });
      return buildBenchExport(payload, catalog, createTargets(), overrides);
    };

    const left = makeExport(
      [
        ['centinela', { stats: { defensa: 2, habilidad: 1 }, maxHp: 9 }],
        ['bruto', { maxActions: 3 }],
      ],
      { accuracy: 5, damage: 4 },
    );
    const right = makeExport(
      [
        ['bruto', { maxActions: 3 }],
        ['centinela', { maxHp: 9, stats: { habilidad: 1, defensa: 2 } }],
      ],
      { damage: 4, accuracy: 5 },
    );

    expect(left.overridesId).toBe(right.overridesId);
    expect(benchExportJson(left)).toBe(benchExportJson(right));
    expect(left.catalog).not.toBe(CATALOG);
    expect(CATALOG.weapons.espada.damage).toBe(3);
  });
});

describe('campos tipados', () => {
  it('todos los campos listados tienen etiqueta y valor efectivo', () => {
    const working = createWorkingCatalog(CATALOG);
    const centinela = working.bestiary.find((entry) => entry.id === 'centinela');
    expect(centinela).toBeDefined();
    if (!centinela) return;
    const fields: ReadonlyArray<EnemyField> = [
      'maxHp',
      'habilidad',
      'fuerza',
      'defensa',
      'resistencia',
      'maxActions',
      'armorId',
      'shieldId',
      'weaponId',
    ];
    for (const field of fields) {
      expect(enemyFieldValue(centinela, field)).not.toBeUndefined();
    }
    expectValid(validateEnemyField('maxHp', 6, CATALOG));
  });
});

import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  DISPERSION_LIMIT_PP,
  GUIDE_TARGETS,
  MARGIN_PP,
  affectedRows,
  benchExportFileName,
  benchExportJson,
  buildBenchExport,
  createTargets,
  createWorkingCatalog,
  diagnoseBench,
  diagnoseEnemy,
  emptyOverrides,
  isOverridesEmpty,
  measureMatchups,
  overridesId,
  recalculateMatchups,
  resetEnemyOverride,
  resetOverrides,
  resetTarget,
  resetTargets,
  resetWeaponOverride,
  rowKey,
  runMatchup,
  setTarget,
  validateTarget,
  withEnemyOverride,
  withWeaponOverride,
  type BenchSelection,
  type MatchupResult,
} from './index';

const BASE_PAYLOAD = measureMatchups({ seed: 31, duels: 24 });

function rowsFor(payload: typeof BASE_PAYLOAD, enemyId: string) {
  return payload.matchups.filter((matchup) => matchup.enemyId === enemyId);
}

function rated(
  matchups: ReadonlyArray<MatchupResult>,
  rates: ReadonlyArray<number>,
): MatchupResult[] {
  return matchups.map((matchup, index) => ({
    ...matchup,
    heroWinRate: rates[index],
  }));
}

describe('objetivos por enemigo', () => {
  it('parte de la guía 75/85/30 y de un margen de ±5 pp', () => {
    expect(GUIDE_TARGETS).toEqual({ centinela: 75, cobarde: 85, bruto: 30 });
    expect(MARGIN_PP).toBe(5);
    expect(DISPERSION_LIMIT_PP).toBe(10);
    expect(createTargets()).toEqual(GUIDE_TARGETS);
    expect(createTargets()).not.toBe(GUIDE_TARGETS);
  });

  it('acepta solo enteros de 0 a 100', () => {
    for (const value of [0, 1, 75, 100]) {
      const result = validateTarget(value);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(value);
    }
    for (const value of [
      101,
      -1,
      75.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '75',
      null,
      undefined,
      {},
    ]) {
      const result = validateTarget(value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toBeTruthy();
    }
  });

  it('fija un objetivo sin mutar el anterior y rechaza valores inválidos', () => {
    const targets = createTargets();
    const custom = setTarget(targets, 'centinela', 60);
    expect(custom.centinela).toBe(60);
    expect(targets.centinela).toBe(75);
    expect(setTarget(targets, 'bruto', 0).bruto).toBe(0);
    expect(setTarget(targets, 'bruto', 100).bruto).toBe(100);
    expect(() => setTarget(targets, 'centinela', 101)).toThrow(RangeError);
    expect(() => setTarget(targets, 'centinela', 75.5)).toThrow(RangeError);
  });

  it('restablece un objetivo y todos los objetivos a la guía', () => {
    const targets = setTarget(createTargets(), 'centinela', 60);
    expect(resetTarget(targets, 'centinela')).toEqual(createTargets());
    expect(resetTargets()).toEqual(GUIDE_TARGETS);
    expect(resetTargets()).not.toBe(GUIDE_TARGETS);
  });
});

describe('catálogo de trabajo', () => {
  it('aplica overrides de enemigo y arma sin mutar el catálogo base', () => {
    const overrides = withWeaponOverride(
      withEnemyOverride(emptyOverrides(), 'centinela', {
        stats: { defensa: 2, habilidad: 1 },
        maxHp: 12,
        maxActions: 3,
        armorId: 'coraza',
        shieldId: null,
        weaponId: 'hacha',
      }),
      'espada',
      { accuracy: 1, damage: 7 },
    );
    const before = JSON.stringify(CATALOG);
    const working = createWorkingCatalog(CATALOG, overrides);

    expect(working).not.toBe(CATALOG);
    expect(working.roster).not.toBe(CATALOG.roster);
    expect(working.bestiary).not.toBe(CATALOG.bestiary);
    expect(working.weapons).not.toBe(CATALOG.weapons);

    const centinela = working.bestiary.find((entry) => entry.id === 'centinela');
    expect(centinela?.maxHp).toBe(12);
    expect(centinela?.maxActions).toBe(3);
    expect(centinela?.stats).toEqual({
      habilidad: 1,
      fuerza: 0,
      defensa: 2,
      resistencia: 0,
    });
    expect(centinela?.armorId).toBe('coraza');
    expect(centinela?.shieldId).toBeNull();
    expect(centinela?.weaponId).toBe('hacha');

    const bruto = working.bestiary.find((entry) => entry.id === 'bruto');
    expect(bruto).toEqual(CATALOG.bestiary.find((entry) => entry.id === 'bruto'));
    expect(working.weapons.espada).toEqual({
      id: 'espada',
      name: 'Espada',
      accuracy: 1,
      damage: 7,
    });
    expect(CATALOG.weapons.espada).toEqual({
      id: 'espada',
      name: 'Espada',
      accuracy: 3,
      damage: 3,
    });
    expect(CATALOG.bestiary.find((entry) => entry.id === 'centinela')?.maxHp).toBe(
      6,
    );
    expect(JSON.stringify(CATALOG)).toBe(before);
  });

  it('sin overrides equivale al catálogo base y el reset lo restaura', () => {
    expect(createWorkingCatalog()).toEqual(CATALOG);
    const overrides = withEnemyOverride(emptyOverrides(), 'bruto', { maxHp: 20 });
    expect(createWorkingCatalog(CATALOG, overrides)).not.toEqual(CATALOG);
    expect(createWorkingCatalog(CATALOG, resetOverrides())).toEqual(CATALOG);
  });

  it('mezcla overrides por enemigo y por arma sin mutar el estado previo', () => {
    const first = withEnemyOverride(emptyOverrides(), 'bruto', {
      stats: { fuerza: 3 },
    });
    const second = withEnemyOverride(first, 'bruto', {
      stats: { defensa: 2 },
      maxActions: 4,
    });
    expect(first.enemies.bruto).toEqual({ stats: { fuerza: 3 } });
    expect(second.enemies.bruto).toEqual({
      stats: { fuerza: 3, defensa: 2 },
      maxActions: 4,
    });
    expect(second).not.toBe(first);

    const withWeapon = withWeaponOverride(second, 'hacha', { damage: 9 });
    expect(withWeapon.weapons.hacha).toEqual({ damage: 9 });
    expect(second.weapons.hacha).toBeUndefined();
  });

  it('restablece un enemigo, un arma y todos los overrides', () => {
    const overrides = withWeaponOverride(
      withEnemyOverride(emptyOverrides(), 'centinela', { maxHp: 9 }),
      'espada',
      { damage: 6 },
    );
    expect(isOverridesEmpty(overrides)).toBe(false);
    expect(resetEnemyOverride(overrides, 'centinela').enemies.centinela).toBeUndefined();
    expect(resetWeaponOverride(overrides, 'espada').weapons.espada).toBeUndefined();
    expect(isOverridesEmpty(emptyOverrides())).toBe(true);
    expect(resetOverrides()).toEqual(emptyOverrides());
  });
});

describe('filas afectadas', () => {
  it('un enemigo afecta a sus cuatro héroes', () => {
    const rows = affectedRows(CATALOG, { kind: 'enemy', enemyId: 'centinela' });
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.heroId)).toEqual([
      'guerrero',
      'picaro',
      'mago',
      'clerigo',
    ]);
    expect(rows.every((row) => row.enemyId === 'centinela')).toBe(true);
    expect(new Set(rows.map(rowKey)).size).toBe(4);
  });

  it('un arma afecta a todas las unidades que la equipan, sin duplicados', () => {
    // Espada: 3 filas de Guerrero + 4 de Centinela, con Guerrero vs Centinela
    // compartida y deduplicada. Daga: mismo caso con Pícaro y Cobarde.
    const expected: Readonly<Record<string, number>> = {
      espada: 6,
      daga: 6,
      hacha: 4,
      cuchillo: 0,
    };
    for (const [weaponId, count] of Object.entries(expected)) {
      const rows = affectedRows(CATALOG, { kind: 'weapon', weaponId });
      expect(rows).toHaveLength(count);
      expect(new Set(rows.map(rowKey)).size).toBe(count);
    }

    const espada = affectedRows(CATALOG, { kind: 'weapon', weaponId: 'espada' });
    expect(espada).toContainEqual({ heroId: 'guerrero', enemyId: 'centinela' });
    expect(espada).toContainEqual({ heroId: 'picaro', enemyId: 'centinela' });
    expect(espada.filter((row) => row.heroId === 'guerrero')).toHaveLength(3);
    expect(espada.filter((row) => row.enemyId === 'centinela')).toHaveLength(4);

    const daga = affectedRows(CATALOG, { kind: 'weapon', weaponId: 'daga' });
    expect(daga).toContainEqual({ heroId: 'picaro', enemyId: 'cobarde' });
    expect(daga.filter((row) => row.heroId === 'picaro')).toHaveLength(3);
    expect(daga.filter((row) => row.enemyId === 'cobarde')).toHaveLength(4);

    const hacha = affectedRows(CATALOG, { kind: 'weapon', weaponId: 'hacha' });
    expect(hacha.every((row) => row.enemyId === 'bruto')).toBe(true);
  });
});

describe('recálculo de filas afectadas', () => {
  it('recalcula solo las filas del enemigo y conserva semilla, duelos y orden', () => {
    const overrides = withEnemyOverride(emptyOverrides(), 'centinela', {
      maxHp: 12,
      stats: { defensa: 2 },
    });
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const selection: BenchSelection = { kind: 'enemy', enemyId: 'centinela' };
    const recalculated = recalculateMatchups(BASE_PAYLOAD, catalog, selection);

    expect(recalculated.seed).toBe(BASE_PAYLOAD.seed);
    expect(recalculated.duels).toBe(BASE_PAYLOAD.duels);
    expect(recalculated.matchups.map(rowKey)).toEqual(
      BASE_PAYLOAD.matchups.map(rowKey),
    );

    const affected = new Set(affectedRows(catalog, selection).map(rowKey));
    let changed = 0;
    let untouched = 0;
    for (let index = 0; index < BASE_PAYLOAD.matchups.length; index += 1) {
      const previous = BASE_PAYLOAD.matchups[index];
      const next = recalculated.matchups[index];
      if (affected.has(rowKey(previous))) {
        changed += 1;
        expect(next).toEqual(
          runMatchup(
            previous.heroId,
            previous.enemyId,
            BASE_PAYLOAD.seed,
            BASE_PAYLOAD.duels,
            catalog,
          ),
        );
      } else {
        untouched += 1;
        expect(next).toBe(previous);
      }
    }
    expect(changed).toBe(4);
    expect(untouched).toBe(8);
  });

  it('recalcula las filas de un arma global y deja el resto intactas', () => {
    const overrides = withWeaponOverride(emptyOverrides(), 'espada', {
      damage: 6,
      accuracy: 2,
    });
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const selection: BenchSelection = { kind: 'weapon', weaponId: 'espada' };
    const recalculated = recalculateMatchups(BASE_PAYLOAD, catalog, selection);
    const affected = new Set(affectedRows(catalog, selection).map(rowKey));

    expect(affected.size).toBe(6);
    let changed = 0;
    let untouched = 0;
    for (let index = 0; index < BASE_PAYLOAD.matchups.length; index += 1) {
      const previous = BASE_PAYLOAD.matchups[index];
      const next = recalculated.matchups[index];
      if (affected.has(rowKey(previous))) {
        changed += 1;
        expect(next).toEqual(
          runMatchup(
            previous.heroId,
            previous.enemyId,
            BASE_PAYLOAD.seed,
            BASE_PAYLOAD.duels,
            catalog,
          ),
        );
      } else {
        untouched += 1;
        expect(next).toBe(previous);
      }
    }
    expect(changed).toBe(6);
    expect(untouched).toBe(6);
  });

  it('dos mediciones con los mismos overrides producen el mismo payload', () => {
    const overrides = withEnemyOverride(emptyOverrides(), 'cobarde', {
      maxHp: 7,
      stats: { resistencia: 1 },
    });
    const first = measureMatchups({
      seed: 17,
      duels: 20,
      catalog: createWorkingCatalog(CATALOG, overrides),
    });
    const second = measureMatchups({
      seed: 17,
      duels: 20,
      catalog: createWorkingCatalog(CATALOG, overrides),
    });
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});

describe('diagnóstico 4-de-4', () => {
  const centinela = rowsFor(BASE_PAYLOAD, 'centinela');
  const bruto = rowsFor(BASE_PAYLOAD, 'bruto');

  it('calcula objetivo, delta, dentro/fuera, 4-de-4 y dispersión', () => {
    const diagnosis = diagnoseEnemy(
      rated(centinela, [70, 80, 75, 90]),
      75,
      5,
      CATALOG,
    );
    expect(diagnosis.enemyId).toBe('centinela');
    expect(diagnosis.rows.map((row) => row.delta)).toEqual([-5, 5, 0, 15]);
    expect(diagnosis.rows.map((row) => row.inside)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(diagnosis.insideCount).toBe(3);
    expect(diagnosis.total).toBe(4);
    expect(diagnosis.fourOfFour).toBe(false);
    expect(diagnosis.outside).toEqual([{ heroId: 'clerigo', delta: 15 }]);
    expect(diagnosis.min).toBe(70);
    expect(diagnosis.max).toBe(90);
    expect(diagnosis.dispersion).toBe(20);
    expect(diagnosis.problems.map((problem) => problem.kind)).toEqual([
      'dispersion',
      'outside',
      'global-weapon',
    ]);
  });

  it('marca 4-de-4 sin lanzar cuando todas las filas están dentro', () => {
    const diagnosis = diagnoseEnemy(rated(centinela, [75, 75, 75, 75]), 75);
    expect(diagnosis.insideCount).toBe(4);
    expect(diagnosis.fourOfFour).toBe(true);
    expect(diagnosis.outside).toEqual([]);
    expect(diagnosis.dispersion).toBe(0);
    expect(diagnosis.problems.map((problem) => problem.kind)).toEqual([
      'global-weapon',
    ]);
    expect(() => diagnoseEnemy(rated(centinela, [70, 80, 75, 90]), 75)).not.toThrow();
  });

  it('no marca dispersión si es exactamente 10 pp', () => {
    const diagnosis = diagnoseEnemy(rated(centinela, [65, 75, 70, 75]), 70);
    expect(diagnosis.dispersion).toBe(10);
    expect(diagnosis.fourOfFour).toBe(true);
    expect(diagnosis.problems.map((problem) => problem.kind)).not.toContain(
      'dispersion',
    );
  });

  it('señala el arma global solo cuando un héroe también la equipa', () => {
    const brutoDiagnosis = diagnoseEnemy(
      rated(bruto, [30, 30, 30, 30]),
      30,
    );
    expect(brutoDiagnosis.fourOfFour).toBe(true);
    expect(brutoDiagnosis.problems).toEqual([]);

    const centinelaDiagnosis = diagnoseEnemy(
      rated(centinela, [75, 75, 75, 75]),
      75,
    );
    const global = centinelaDiagnosis.problems.find(
      (problem) => problem.kind === 'global-weapon',
    );
    expect(global).toBeDefined();
    if (global && global.kind === 'global-weapon') {
      expect(global.weaponId).toBe('espada');
      expect(global.heroIds).toEqual(['guerrero']);
      expect(global.message).toContain('Guerrero');
    }
  });

  it('diagnostica todos los enemigos en orden de aparición', () => {
    const diagnoses = diagnoseBench(BASE_PAYLOAD.matchups, createTargets());
    expect(diagnoses.map((diagnosis) => diagnosis.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    for (const diagnosis of diagnoses) {
      expect(diagnosis.total).toBe(4);
      expect(diagnosis.rows).toHaveLength(4);
    }
  });
});

describe('export reproducible', () => {
  const overrides = withWeaponOverride(
    withEnemyOverride(emptyOverrides(), 'centinela', { maxHp: 10 }),
    'espada',
    { accuracy: 2 },
  );
  const catalog = createWorkingCatalog(CATALOG, overrides);
  const payload = measureMatchups({ seed: 9, duels: 12, catalog });
  const exported = buildBenchExport(payload, catalog, createTargets(), overrides);

  it('incluye catálogo ajustado, objetivos, overrides, resultados y diagnóstico', () => {
    expect(exported.catalog).toBe(catalog);
    expect(exported.targets).toEqual(GUIDE_TARGETS);
    expect(exported.overrides).toEqual(overrides);
    expect(exported.overridesId).toBe(overridesId(overrides));
    expect(exported.seed).toBe(9);
    expect(exported.duels).toBe(12);
    expect(exported.matchups).toBe(payload.matchups);
    expect(exported.matchups).toHaveLength(12);
    expect(exported.diagnosis).toHaveLength(3);
  });

  it('produce el mismo JSON con el mismo estado y sin marca de tiempo', () => {
    const again = buildBenchExport(
      measureMatchups({
        seed: 9,
        duels: 12,
        catalog: createWorkingCatalog(CATALOG, overrides),
      }),
      createWorkingCatalog(CATALOG, overrides),
      createTargets(),
      overrides,
    );
    const text = benchExportJson(exported);
    expect(benchExportJson(again)).toBe(text);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    for (const key of [
      'catalog',
      'targets',
      'overrides',
      'overridesId',
      'diagnosis',
      'seed',
      'duels',
      'matchups',
    ]) {
      expect(parsed).toHaveProperty(key);
    }
    expect(parsed).not.toHaveProperty('timestamp');
    expect(parsed).not.toHaveProperty('generatedAt');
  });

  it('identifica overrides por contenido canónico, sin depender del orden', () => {
    const left = withEnemyOverride(
      withWeaponOverride(emptyOverrides(), 'espada', {
        accuracy: 5,
        damage: 4,
      }),
      'centinela',
      { stats: { defensa: 2, habilidad: 1 }, maxHp: 9 },
    );
    const right = withEnemyOverride(
      withWeaponOverride(emptyOverrides(), 'espada', {
        damage: 4,
        accuracy: 5,
      }),
      'centinela',
      { maxHp: 9, stats: { habilidad: 1, defensa: 2 } },
    );
    expect(overridesId(left)).toBe(overridesId(right));
    expect(overridesId(left)).toMatch(/^[0-9a-f]{8}$/);
    expect(overridesId(left)).not.toBe(overridesId(emptyOverrides()));
  });

  it('distingue el nombre ajustado del base sin sobrescribir el export v2.0', () => {
    const adjusted = benchExportFileName(payload, overrides);
    const base = benchExportFileName(payload, emptyOverrides());
    const legacy = `${payload.experiment}-${payload.engine}-seed-${payload.seed}-duels-${payload.duels}.json`;
    expect(adjusted).toContain(overridesId(overrides));
    expect(base).toContain('bench-base');
    expect(adjusted).not.toBe(base);
    expect(adjusted).not.toBe(legacy);
    expect(base).not.toBe(legacy);
    expect(adjusted.endsWith('.json')).toBe(true);
  });
});

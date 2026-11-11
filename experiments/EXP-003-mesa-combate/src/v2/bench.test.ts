import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  DEFAULT_TARGET,
  GUIDE_TARGETS,
  MARGIN_PP,
  TARGETS_VERSION,
  affectedRows,
  benchExportFileName,
  benchExportJson,
  buildBenchExport,
  createTargets,
  createWorkingCatalog,
  diagnoseBench,
  diagnoseEnemy,
  emptyOverrides,
  guideTargetFor,
  isOverridesEmpty,
  isTargetsGuide,
  measureMatchups,
  overridesId,
  recalculateMatchups,
  resetEnemies,
  resetEnemyOverride,
  resetEnemyTargets,
  resetHeroes,
  resetHeroOverride,
  resetOverrides,
  resetTarget,
  resetTargets,
  resetWeaponOverride,
  resetWeapons,
  rowKey,
  runMatchup,
  setTarget,
  targetKey,
  targetsId,
  validateTarget,
  withEnemyOverride,
  withHeroOverride,
  withWeaponOverride,
  type BenchSelection,
  type BenchTargets,
  type Catalog,
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

function targetsFor(
  enemyId: string,
  values: Readonly<Record<string, number>>,
): BenchTargets {
  let targets = createTargets();
  for (const [heroId, value] of Object.entries(values)) {
    targets = setTarget(targets, heroId, enemyId, value);
  }
  return targets;
}

describe('objetivos por par', () => {
  it('parte de la guía 75/85/30 con las 12 claves en orden roster-major', () => {
    expect(GUIDE_TARGETS).toEqual({ centinela: 75, cobarde: 85, bruto: 30 });
    expect(MARGIN_PP).toBe(5);
    expect(DEFAULT_TARGET).toBe(50);
    expect(TARGETS_VERSION).toBe(2);
    expect(guideTargetFor('centinela')).toBe(75);
    expect(guideTargetFor('desconocido')).toBe(50);
    expect(targetKey('guerrero', 'centinela')).toBe('guerrero:centinela');

    const targets = createTargets();
    expect(Object.keys(targets)).toEqual([
      'guerrero:centinela',
      'guerrero:bruto',
      'guerrero:cobarde',
      'picaro:centinela',
      'picaro:bruto',
      'picaro:cobarde',
      'mago:centinela',
      'mago:bruto',
      'mago:cobarde',
      'clerigo:centinela',
      'clerigo:bruto',
      'clerigo:cobarde',
    ]);
    expect(Object.values(targets)).toEqual([
      75, 30, 85, 75, 30, 85, 75, 30, 85, 75, 30, 85,
    ]);
    expect(targets).not.toBe(GUIDE_TARGETS);
    expect(targets[targetKey('clerigo', 'cobarde')]).toBe(85);
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

  it('fija un par sin mutar el mapa ni los otros tres héroes', () => {
    const targets = createTargets();
    const custom = setTarget(targets, 'guerrero', 'centinela', 60);
    expect(custom[targetKey('guerrero', 'centinela')]).toBe(60);
    expect(targets[targetKey('guerrero', 'centinela')]).toBe(75);
    expect(custom[targetKey('picaro', 'centinela')]).toBe(75);
    expect(custom[targetKey('clerigo', 'centinela')]).toBe(75);
    expect(setTarget(targets, 'guerrero', 'bruto', 0)[targetKey('guerrero', 'bruto')]).toBe(0);
    expect(() => setTarget(targets, 'guerrero', 'centinela', 101)).toThrow(
      RangeError,
    );
    expect(() => setTarget(targets, 'guerrero', 'centinela', 75.5)).toThrow(
      RangeError,
    );
  });

  it('restablece un par, un enemigo completo y todos los pares', () => {
    const modified = setTarget(
      setTarget(
        setTarget(createTargets(), 'guerrero', 'centinela', 60),
        'picaro',
        'centinela',
        90,
      ),
      'guerrero',
      'bruto',
      10,
    );

    const onePair = resetTarget(modified, 'guerrero', 'centinela');
    expect(onePair[targetKey('guerrero', 'centinela')]).toBe(75);
    expect(onePair[targetKey('picaro', 'centinela')]).toBe(90);
    expect(onePair[targetKey('guerrero', 'bruto')]).toBe(10);

    const oneEnemy = resetEnemyTargets(modified, 'centinela');
    for (const hero of CATALOG.roster) {
      expect(oneEnemy[targetKey(hero.id, 'centinela')]).toBe(75);
    }
    expect(oneEnemy[targetKey('guerrero', 'bruto')]).toBe(10);

    expect(resetTargets()).toEqual(createTargets());
    expect(resetTargets()).not.toBe(createTargets());
  });

  it('hereda 50 para un enemigo sin guía y no muta GUIDE_TARGETS', () => {
    const customEnemy = {
      ...CATALOG.bestiary[0],
      id: 'sin-guia',
      name: 'Sin guía',
    };
    const customCatalog: Catalog = {
      ...CATALOG,
      bestiary: [...CATALOG.bestiary, customEnemy],
    };
    const before = JSON.stringify(GUIDE_TARGETS);
    const targets = createTargets(customCatalog);

    expect(Object.keys(targets)).toHaveLength(16);
    for (const hero of customCatalog.roster) {
      expect(targets[targetKey(hero.id, 'sin-guia')]).toBe(50);
    }
    expect(JSON.stringify(GUIDE_TARGETS)).toBe(before);
    expect(GUIDE_TARGETS['sin-guia']).toBeUndefined();
    expect(resetTargets(customCatalog)).toEqual(targets);
    expect(resetTarget(createTargets(), 'guerrero', 'sin-guia')[
      targetKey('guerrero', 'sin-guia')
    ]).toBe(50);
  });

  it('detecta si un mapa es exactamente la guía', () => {
    expect(isTargetsGuide(createTargets())).toBe(true);
    expect(isTargetsGuide(setTarget(createTargets(), 'mago', 'bruto', 31))).toBe(
      false,
    );
    expect(isTargetsGuide({ ...createTargets(), extra: 50 })).toBe(false);
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

  it('aplica overrides de héroe sin mutar el catálogo base', () => {
    const overrides = withHeroOverride(emptyOverrides(), 'guerrero', {
      stats: { habilidad: 2, fuerza: 3 },
      maxHp: 25,
      maxActions: 3,
      magicLevel: 1,
      armorId: null,
      shieldId: 'escudo',
      weaponId: null,
    });
    const before = JSON.stringify(CATALOG);
    const working = createWorkingCatalog(CATALOG, overrides);
    const guerrero = working.roster.find((hero) => hero.id === 'guerrero');

    expect(guerrero?.maxHp).toBe(25);
    expect(guerrero?.maxActions).toBe(3);
    expect(guerrero?.magicLevel).toBe(1);
    expect(guerrero?.stats).toEqual({
      habilidad: 2,
      fuerza: 3,
      defensa: 1,
      resistencia: 1,
    });
    expect(guerrero?.armorId).toBeNull();
    expect(guerrero?.shieldId).toBe('escudo');
    expect(guerrero?.weaponId).toBeNull();
    expect(working.roster.find((hero) => hero.id === 'picaro')).toEqual(
      CATALOG.roster.find((hero) => hero.id === 'picaro'),
    );
    expect(CATALOG.roster.find((hero) => hero.id === 'guerrero')?.maxHp).toBe(
      20,
    );
    expect(CATALOG.roster.find((hero) => hero.id === 'guerrero')?.weaponId).toBe(
      'espada',
    );
    expect(JSON.stringify(CATALOG)).toBe(before);
  });

  it('mezcla overrides de héroe y restablece por héroe, tabla y global', () => {
    const first = withHeroOverride(emptyOverrides(), 'mago', {
      stats: { fuerza: 2 },
    });
    const second = withHeroOverride(first, 'mago', {
      stats: { defensa: 1 },
      maxHp: 15,
      magicLevel: 2,
    });
    expect(first.heroes.mago).toEqual({ stats: { fuerza: 2 } });
    expect(second.heroes.mago).toEqual({
      stats: { fuerza: 2, defensa: 1 },
      maxHp: 15,
      magicLevel: 2,
    });
    expect(second).not.toBe(first);

    const all = withWeaponOverride(
      withEnemyOverride(second, 'bruto', { maxHp: 10 }),
      'hacha',
      { damage: 8 },
    );
    const withoutHero = resetHeroOverride(all, 'mago');
    expect(withoutHero.heroes.mago).toBeUndefined();
    expect(withoutHero.enemies.bruto).toEqual({ maxHp: 10 });
    expect(withoutHero.weapons.hacha).toEqual({ damage: 8 });

    const withoutWeapons = resetWeapons(all);
    expect(withoutWeapons.weapons).toEqual({});
    expect(withoutWeapons.enemies.bruto).toEqual({ maxHp: 10 });
    expect(withoutWeapons.heroes.mago).toBeDefined();

    const withoutEnemies = resetEnemies(all);
    expect(withoutEnemies.enemies).toEqual({});
    expect(withoutEnemies.weapons.hacha).toEqual({ damage: 8 });
    expect(withoutEnemies.heroes.mago).toBeDefined();

    const withoutHeroes = resetHeroes(all);
    expect(withoutHeroes.heroes).toEqual({});
    expect(withoutHeroes.enemies.bruto).toEqual({ maxHp: 10 });
    expect(withoutHeroes.weapons.hacha).toEqual({ damage: 8 });

    expect(isOverridesEmpty(all)).toBe(false);
    expect(isOverridesEmpty(withHeroOverride(emptyOverrides(), 'mago', { maxHp: 9 }))).toBe(
      false,
    );
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

  it('un héroe afecta a sus tres filas', () => {
    const rows = affectedRows(CATALOG, { kind: 'hero', heroId: 'picaro' });
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.heroId)).toEqual(['picaro', 'picaro', 'picaro']);
    expect(rows.map((row) => row.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    expect(new Set(rows.map(rowKey)).size).toBe(3);
    expect(
      affectedRows(CATALOG, { kind: 'hero', heroId: 'desconocido' }),
    ).toHaveLength(0);
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

  it('un arma relee los usuarios del catálogo de trabajo y deduplica', () => {
    const overrides = withHeroOverride(emptyOverrides(), 'mago', {
      weaponId: 'espada',
    });
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const espada = affectedRows(catalog, {
      kind: 'weapon',
      weaponId: 'espada',
    });

    expect(espada).toHaveLength(8);
    expect(new Set(espada.map(rowKey)).size).toBe(8);
    expect(espada).toContainEqual({ heroId: 'mago', enemyId: 'centinela' });
    expect(espada.filter((row) => row.heroId === 'mago')).toHaveLength(3);
    expect(espada.filter((row) => row.enemyId === 'centinela')).toHaveLength(4);
    expect(
      affectedRows(catalog, { kind: 'weapon', weaponId: 'cuchillo' }),
    ).toHaveLength(0);
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

  it('recalcula solo las tres filas del héroe y conserva el resto', () => {
    const overrides = withHeroOverride(emptyOverrides(), 'mago', {
      weaponId: 'espada',
      stats: { fuerza: 2 },
      magicLevel: 2,
    });
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const selection: BenchSelection = { kind: 'hero', heroId: 'mago' };
    const recalculated = recalculateMatchups(BASE_PAYLOAD, catalog, selection);
    const affected = new Set(affectedRows(catalog, selection).map(rowKey));

    expect(affected.size).toBe(3);
    expect(recalculated.seed).toBe(BASE_PAYLOAD.seed);
    expect(recalculated.duels).toBe(BASE_PAYLOAD.duels);
    expect(recalculated.matchups.map(rowKey)).toEqual(
      BASE_PAYLOAD.matchups.map(rowKey),
    );

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
    expect(changed).toBe(3);
    expect(untouched).toBe(9);
  });

  it('cambiar el objetivo solo rehace el diagnóstico con las mismas mediciones', () => {
    const before = diagnoseBench(BASE_PAYLOAD.matchups, createTargets(), CATALOG);
    const targets = setTarget(createTargets(), 'guerrero', 'centinela', 60);
    const after = diagnoseBench(BASE_PAYLOAD.matchups, targets, CATALOG);

    expect(after[0].rows[0].target).toBe(60);
    expect(after[0].rows[1].target).toBe(75);
    expect(after[0].rows[0].delta).not.toBe(before[0].rows[0].delta);
    expect(after.map((entry) => entry.rows.map((row) => row.heroWinRate))).toEqual(
      before.map((entry) => entry.rows.map((row) => row.heroWinRate)),
    );
    expect(BASE_PAYLOAD.matchups).toHaveLength(12);
    expect(before[0].rows.map((row) => row.heroWinRate)).toEqual(
      BASE_PAYLOAD.matchups
        .filter((matchup) => matchup.enemyId === 'centinela')
        .map((matchup) => matchup.heroWinRate),
    );
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

  it('usa el objetivo de cada fila, conserva héroe y delta y no calcula dispersión', () => {
    const targets = targetsFor('centinela', {
      guerrero: 65,
      picaro: 75,
      mago: 80,
      clerigo: 70,
    });
    const diagnosis = diagnoseEnemy(
      rated(centinela, [70, 80, 75, 90]),
      targets,
      5,
      CATALOG,
    );
    expect(diagnosis.enemyId).toBe('centinela');
    expect(diagnosis.rows.map((row) => row.target)).toEqual([65, 75, 80, 70]);
    expect(diagnosis.rows.map((row) => row.delta)).toEqual([5, 5, -5, 20]);
    expect(diagnosis.rows.map((row) => row.inside)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(diagnosis.insideCount).toBe(3);
    expect(diagnosis.total).toBe(4);
    expect(diagnosis.fourOfFour).toBe(false);
    expect(diagnosis.outside).toEqual([{ heroId: 'clerigo', delta: 20 }]);
    expect(diagnosis.problems.map((problem) => problem.kind)).toEqual([
      'outside',
      'global-weapon',
    ]);
    expect(diagnosis).not.toHaveProperty('target');
    expect(diagnosis).not.toHaveProperty('dispersion');
    expect(diagnosis).not.toHaveProperty('min');
    expect(diagnosis).not.toHaveProperty('max');
  });

  it('marca 4-de-4 con objetivos distintos aunque el rango real supere 10 pp', () => {
    const targets = targetsFor('centinela', {
      guerrero: 50,
      picaro: 80,
      mago: 60,
      clerigo: 75,
    });
    const diagnosis = diagnoseEnemy(
      rated(centinela, [50, 80, 60, 75]),
      targets,
    );
    expect(diagnosis.insideCount).toBe(4);
    expect(diagnosis.fourOfFour).toBe(true);
    expect(diagnosis.outside).toEqual([]);
    expect(diagnosis.problems.map((problem) => problem.kind)).toEqual([
      'global-weapon',
    ]);
    expect(
      diagnosis.problems.some(
        (problem) => (problem.kind as string) === 'dispersion',
      ),
    ).toBe(false);
  });

  it('exige el objetivo de cada par y valida su rango', () => {
    const targets = createTargets();
    const missing = Object.fromEntries(
      Object.entries(targets).filter(
        ([key]) => key !== targetKey('mago', 'centinela'),
      ),
    );
    expect(() =>
      diagnoseEnemy(rated(centinela, [75, 75, 75, 75]), missing),
    ).toThrow('Sin objetivo para el par mago:centinela.');
    expect(() =>
      diagnoseEnemy(
        rated(centinela, [75, 75, 75, 75]),
        { ...targets, [targetKey('mago', 'centinela')]: 101 },
      ),
    ).toThrow(RangeError);
  });

  it('señala el arma global solo cuando un héroe también la equipa', () => {
    const brutoDiagnosis = diagnoseEnemy(
      rated(bruto, [30, 30, 30, 30]),
      createTargets(),
    );
    expect(brutoDiagnosis.fourOfFour).toBe(true);
    expect(brutoDiagnosis.problems).toEqual([]);

    const centinelaDiagnosis = diagnoseEnemy(
      rated(centinela, [75, 75, 75, 75]),
      createTargets(),
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

  it('diagnostica con las armas y héroes del catálogo de trabajo', () => {
    const overrides = withHeroOverride(emptyOverrides(), 'mago', {
      weaponId: 'espada',
    });
    const catalog = createWorkingCatalog(CATALOG, overrides);
    const diagnosis = diagnoseEnemy(
      rated(centinela, [75, 75, 75, 75]),
      createTargets(catalog),
      MARGIN_PP,
      catalog,
    );
    const global = diagnosis.problems.find(
      (problem) => problem.kind === 'global-weapon',
    );
    expect(global).toBeDefined();
    if (global && global.kind === 'global-weapon') {
      expect(global.weaponId).toBe('espada');
      expect(global.heroIds).toEqual(['guerrero', 'mago']);
      expect(global.message).toContain('Mago');
    }
  });

  it('diagnostica todos los enemigos en orden de aparición con el mapa por par', () => {
    const targets = setTarget(createTargets(), 'guerrero', 'centinela', 60);
    const diagnoses = diagnoseBench(BASE_PAYLOAD.matchups, targets);
    expect(diagnoses.map((diagnosis) => diagnosis.enemyId)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    expect(diagnoses[0].rows[0].target).toBe(60);
    expect(diagnoses[0].rows[1].target).toBe(75);
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

  it('incluye catálogo ajustado, objetivos por par, versión, id, overrides y diagnóstico', () => {
    expect(exported.catalog).toBe(catalog);
    expect(exported.targets).toEqual(createTargets());
    expect(exported.targetsVersion).toBe(TARGETS_VERSION);
    expect(exported.targetsId).toBe(targetsId(createTargets()));
    expect(exported.targetsId).toMatch(/^[0-9a-f]{8}$/);
    expect(exported.overrides).toEqual(overrides);
    expect(exported.overridesId).toBe(overridesId(overrides));
    expect(exported.seed).toBe(9);
    expect(exported.duels).toBe(12);
    expect(exported.matchups).toBe(payload.matchups);
    expect(exported.matchups).toHaveLength(12);
    expect(exported.diagnosis).toHaveLength(3);
  });

  it('incluye overrides de héroe y un overridesId que cambia con el héroe', () => {
    const heroOverrides = withHeroOverride(emptyOverrides(), 'guerrero', {
      maxHp: 30,
      weaponId: 'hacha',
      magicLevel: 1,
    });
    const heroCatalog = createWorkingCatalog(CATALOG, heroOverrides);
    const heroPayload = measureMatchups({
      seed: 5,
      duels: 8,
      catalog: heroCatalog,
    });
    const heroExport = buildBenchExport(
      heroPayload,
      heroCatalog,
      createTargets(),
      heroOverrides,
    );

    expect(heroExport.overrides.heroes.guerrero).toEqual({
      maxHp: 30,
      weaponId: 'hacha',
      magicLevel: 1,
    });
    expect(
      heroExport.catalog.roster.find((hero) => hero.id === 'guerrero')?.maxHp,
    ).toBe(30);
    expect(heroExport.overridesId).toBe(overridesId(heroOverrides));
    expect(heroExport.overridesId).not.toBe(overridesId(emptyOverrides()));
    expect(heroExport.overridesId).not.toBe(overridesId(overrides));
    expect(benchExportJson(heroExport)).toContain('"heroes"');
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
      'targetsVersion',
      'targetsId',
      'overrides',
      'overridesId',
      'diagnosis',
      'seed',
      'duels',
      'matchups',
    ]) {
      expect(parsed).toHaveProperty(key);
    }
    expect(Object.keys(parsed.targets as Record<string, number>)).toHaveLength(12);
    expect(parsed).not.toHaveProperty('timestamp');
    expect(parsed).not.toHaveProperty('generatedAt');
  });

  it('deriva un targetsId determinista e insensible al orden de claves', () => {
    const targets = createTargets();
    const reordered = Object.fromEntries(Object.entries(targets).reverse());
    expect(targetsId(targets)).toBe(targetsId(reordered));
    expect(targetsId(targets)).toMatch(/^[0-9a-f]{8}$/);
    const changed = setTarget(targets, 'guerrero', 'centinela', 60);
    expect(targetsId(changed)).not.toBe(targetsId(targets));
  });

  it('cambiar un objetivo cambia targetsId y nombre, pero no overridesId', () => {
    const targets = setTarget(createTargets(), 'guerrero', 'centinela', 60);
    const changed = buildBenchExport(payload, catalog, targets, overrides);
    expect(changed.targetsId).toBe(targetsId(targets));
    expect(changed.targetsId).not.toBe(exported.targetsId);
    expect(changed.overridesId).toBe(exported.overridesId);
    expect(overridesId(overrides)).toBe(exported.overridesId);

    const guideName = benchExportFileName(payload, overrides, createTargets());
    const changedName = benchExportFileName(payload, overrides, targets);
    expect(changedName).not.toBe(guideName);
    expect(changedName).toContain(`-targets-${targetsId(targets)}`);
    expect(guideName).not.toContain('-targets-');
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
    const right = withHeroOverride(
      withEnemyOverride(
        withWeaponOverride(emptyOverrides(), 'espada', {
          damage: 4,
          accuracy: 5,
        }),
        'centinela',
        { maxHp: 9, stats: { habilidad: 1, defensa: 2 } },
      ),
      'mago',
      { magicLevel: 2, stats: { defensa: 1, fuerza: 2 } },
    );
    const leftWithHero = withHeroOverride(left, 'mago', {
      stats: { fuerza: 2, defensa: 1 },
      magicLevel: 2,
    });
    expect(overridesId(leftWithHero)).toBe(overridesId(right));
    expect(overridesId(left)).toMatch(/^[0-9a-f]{8}$/);
    expect(overridesId(left)).not.toBe(overridesId(emptyOverrides()));
    expect(overridesId(leftWithHero)).not.toBe(overridesId(left));
  });

  it('distingue el nombre ajustado del base y de los objetivos personalizados', () => {
    const guide = createTargets();
    const custom = setTarget(guide, 'guerrero', 'centinela', 60);
    const adjusted = benchExportFileName(payload, overrides, guide);
    const base = benchExportFileName(payload, emptyOverrides(), guide);
    const legacy = `${payload.experiment}-${payload.engine}-seed-${payload.seed}-duels-${payload.duels}.json`;
    expect(adjusted).toContain(`bench-overrides-${overridesId(overrides)}`);
    expect(adjusted).not.toContain('-targets-');
    expect(base).toContain('bench-base');
    expect(base).not.toContain('-targets-');
    expect(adjusted).not.toBe(base);
    expect(adjusted).not.toBe(legacy);
    expect(base).not.toBe(legacy);
    expect(adjusted.endsWith('.json')).toBe(true);

    expect(benchExportFileName(payload, emptyOverrides(), custom)).toBe(
      `${payload.experiment}-${payload.engine}-seed-${payload.seed}` +
        `-duels-${payload.duels}-bench-base-targets-${targetsId(custom)}.json`,
    );
  });
});

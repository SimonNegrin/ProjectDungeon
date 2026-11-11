import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  createUnit,
  findTemplate,
  manaForLevel,
  templateFor,
} from './catalog';
import { runDuel } from './duel';
import type { Catalog, CombatantTemplate } from './types';

function uniqueCount(values: ReadonlyArray<string>): number {
  return new Set(values).size;
}

describe('catálogo v2.0', () => {
  it('declara versión explícita', () => {
    expect(CATALOG.version).toBeTruthy();
    expect(CATALOG.version).toMatch(/^EXP-003-v2\./);
  });

  it('tiene ids únicos dentro de cada tabla del catálogo', () => {
    const tables = [
      CATALOG.roster.map((entry) => entry.id),
      CATALOG.bestiary.map((entry) => entry.id),
      Object.keys(CATALOG.weapons),
      Object.keys(CATALOG.armors),
      Object.keys(CATALOG.shields),
      Object.keys(CATALOG.spells),
      Object.keys(CATALOG.aiProfiles),
    ];
    for (const ids of tables) {
      expect(uniqueCount(ids)).toBe(ids.length);
    }
  });

  it('contiene los cuatro héroes del primer corte', () => {
    expect(CATALOG.roster.map((entry) => entry.id)).toEqual([
      'guerrero',
      'picaro',
      'mago',
      'clerigo',
    ]);
    for (const template of CATALOG.roster) {
      expect(template.side).toBe('hero');
    }
  });

  it('contiene los tres enemigos del escenario de medición', () => {
    expect(CATALOG.bestiary.map((entry) => entry.id)).toEqual([
      'centinela',
      'bruto',
      'cobarde',
    ]);
    for (const template of CATALOG.bestiary) {
      expect(template.side).toBe('enemy');
      expect(template.vision).toBeGreaterThan(0);
      expect(template.alarmRadius).toBeGreaterThan(0);
      expect(CATALOG.aiProfiles[template.profileId]).toBeDefined();
    }
  });

  it('deriva el maná máximo del nivel de magia', () => {
    for (const template of [...CATALOG.roster, ...CATALOG.bestiary]) {
      const unit = createUnit(template, 0);
      expect(unit.maxMana).toBe(manaForLevel(template.magicLevel));
      expect(unit.mana).toBe(unit.maxMana);
    }
    expect(manaForLevel(0)).toBe(0);
  });

  it('declara las acciones por arquetipo y por tipo enemigo', () => {
    expect(findTemplate(CATALOG, 'picaro')?.maxActions).toBe(3);
    for (const id of ['guerrero', 'mago', 'clerigo']) {
      expect(findTemplate(CATALOG, id)?.maxActions).toBe(2);
    }
    expect(
      CATALOG.bestiary.map((entry) => [entry.id, entry.maxActions]),
    ).toEqual([
      ['centinela', 2],
      ['bruto', 1],
      ['cobarde', 2],
    ]);
  });

  it('marca arma equipada solo donde el arquetipo ataca en melé', () => {
    expect(findTemplate(CATALOG, 'guerrero')?.weaponId).not.toBeNull();
    expect(findTemplate(CATALOG, 'picaro')?.weaponId).not.toBeNull();
    expect(findTemplate(CATALOG, 'mago')?.weaponId).toBeNull();
    expect(findTemplate(CATALOG, 'clerigo')?.weaponId).toBeNull();
  });

  it('incluye los seis hechizos con nivel, coste, alcance y objetivo', () => {
    const spells = Object.values(CATALOG.spells);
    expect(spells).toHaveLength(6);
    expect(spells.map((spell) => spell.id).sort()).toEqual([
      'curacion-iii',
      'electrico-i',
      'electrico-iii',
      'fuego-ii',
      'fuego-iv',
      'resurreccion-iv',
    ]);
    const levels = new Set(spells.map((spell) => spell.level));
    for (const level of [1, 2, 3, 4]) expect(levels.has(level)).toBe(true);
    expect(spells.filter((spell) => spell.target === 'enemy')).toHaveLength(4);
    const heal = CATALOG.spells['curacion-iii'];
    expect(heal.target).toBe('ally');
    expect(heal.rangeMin).toBeGreaterThan(1);
    expect(heal.effect.type).toBe('heal');
    const resurrect = CATALOG.spells['resurreccion-iv'];
    expect(resurrect.target).toBe('corpse');
    expect(resurrect.level).toBe(4);
    expect(resurrect.effect).toEqual({ type: 'resurrect', hpFraction: 0.6 });
  });

  it('declara perfiles de IA como datos', () => {
    expect(CATALOG.aiProfiles.valiente.fleeThreshold).toBeNull();
    expect(CATALOG.aiProfiles.cobarde.fleeThreshold).toBeGreaterThan(0);
    for (const profile of Object.values(CATALOG.aiProfiles)) {
      expect(typeof profile.castSpells).toBe('boolean');
      expect(['power', 'cost']).toContain(profile.spellPriority);
    }
  });

  it('da de alta un enemigo de prueba solo con datos', () => {
    const testEnemy: CombatantTemplate = {
      ...templateFor(CATALOG, 'centinela'),
      id: 'guardia-de-prueba',
      name: 'Guardia de prueba',
      maxHp: 2,
    };
    const extended: Catalog = {
      ...CATALOG,
      bestiary: [...CATALOG.bestiary, testEnemy],
    };
    const result = runDuel(
      {
        id: 'alta-por-datos',
        width: 8,
        heroId: 'guerrero',
        enemyId: testEnemy.id,
        heroPos: 0,
        enemyPos: 7,
        initiative: 'hero',
        maxRounds: 100,
      },
      extended,
      1017,
    );
    expect(['hero', 'enemy', 'draw']).toContain(result.winner);
    expect(result.rounds).toBeGreaterThan(0);
  });
});

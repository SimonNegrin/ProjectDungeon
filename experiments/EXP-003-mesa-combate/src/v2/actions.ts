/**
 * Acciones, costes y validaciones de la v2.0.
 *
 * Atacar y lanzar hechizo cuestan 1 acción; moverse cuesta 1 MP por casilla y
 * no consume acción; esperar es gratis. Las validaciones no mutan nada: el
 * llamador rechaza antes de tirar dados.
 */

import type {
  AIProfile,
  Catalog,
  Rejection,
  Scenario,
  SpellDefinition,
  Unit,
} from './types';

export function restoreTurn(unit: Unit): void {
  unit.mp = unit.maxMp;
  unit.actions = unit.maxActions;
  unit.mana = unit.maxMana;
  unit.spellsCastThisTurn = 0;
}

export function distanceBetween(a: { pos: number }, b: { pos: number }): number {
  return Math.abs(a.pos - b.pos);
}

export function isAdjacent(a: Unit, b: Unit): boolean {
  return distanceBetween(a, b) === 1;
}

export function otherSide(side: Unit['side']): Unit['side'] {
  return side === 'hero' ? 'enemy' : 'hero';
}

/** Motivo de rechazo de un ataque cuerpo a cuerpo, o `null` si es válido. */
export function meleeRejection(
  attacker: Unit,
  defender: Unit,
  _catalog: Catalog,
): Rejection | null {
  if (defender.hp <= 0) return 'target-dead';
  if (attacker.weaponId === null) return 'unarmed';
  if (!isAdjacent(attacker, defender)) return 'not-adjacent';
  if (defender.awareness === 'dormant') return 'target-dormant';
  if (attacker.actions < 1) return 'no-action';
  return null;
}

/** Motivo de rechazo de un hechizo, o `null` si es válido. */
export function spellRejection(
  caster: Unit,
  target: Unit,
  spell: SpellDefinition,
  _catalog: Catalog,
): Rejection | null {
  if (caster.actions < 1) return 'no-action';
  if (caster.mana < spell.cost) return 'not-enough-mana';
  if (caster.magicLevel < spell.level) return 'level-too-low';
  if (caster.spellsCastThisTurn >= 2) return 'spell-limit';

  const distance = distanceBetween(caster, target);
  if (distance < spell.rangeMin || distance > spell.rangeMax) {
    return 'out-of-range';
  }

  if (spell.target === 'enemy') {
    if (target.side === caster.side) return 'invalid-target';
    if (target.hp <= 0) return 'target-dead';
  } else if (spell.target === 'ally') {
    if (target.side !== caster.side || target.id === caster.id) {
      return 'invalid-target';
    }
    if (target.hp <= 0) return 'target-dead';
  } else {
    if (target.side !== caster.side) return 'invalid-target';
    if (target.hp > 0) return 'invalid-target';
  }
  return null;
}

function spellCandidates(
  caster: Unit,
  target: Unit,
  catalog: Catalog,
): SpellDefinition[] {
  const distance = distanceBetween(caster, target);
  const entries = Object.values(catalog.spells);
  return entries.filter(
    (spell) =>
      spell.effect.type === 'damage' &&
      spell.level <= caster.magicLevel &&
      spell.cost <= caster.mana &&
      target.hp > 0 &&
      target.side !== caster.side &&
      distance >= spell.rangeMin &&
      distance <= spell.rangeMax,
  );
}

/**
 * Selección de hechizos de daño del héroe: hasta dos por turno maximizando la
 * suma de poder, con desempate por menor coste y orden de catálogo. Se permite
 * repetir el mismo hechizo (el acceso es por nivel, no por grimorio).
 */
export function selectDamageSpells(
  caster: Unit,
  target: Unit,
  catalog: Catalog,
): SpellDefinition[] {
  const budget = Math.min(2 - caster.spellsCastThisTurn, caster.actions);
  if (budget <= 0) return [];
  const candidates = spellCandidates(caster, target, catalog);
  if (candidates.length === 0) return [];

  const order = Object.values(catalog.spells);
  const keyFor = (sequence: SpellDefinition[]): string =>
    sequence
      .map((spell) => String(order.indexOf(spell)).padStart(3, '0'))
      .join('');

  let best: SpellDefinition[] = [];
  let bestPower = 0;
  let bestCost = Number.POSITIVE_INFINITY;
  let bestKey = '';

  const consider = (sequence: SpellDefinition[]): void => {
    const cost = sequence.reduce((total, spell) => total + spell.cost, 0);
    if (cost > caster.mana) return;
    const power = sequence.reduce((total, spell) => total + spell.power, 0);
    const key = keyFor(sequence);
    if (
      power > bestPower ||
      (power === bestPower &&
        (cost < bestCost || (cost === bestCost && key < bestKey)))
    ) {
      best = sequence;
      bestPower = power;
      bestCost = cost;
      bestKey = key;
    }
  };

  for (const first of candidates) {
    consider([first]);
    if (budget >= 2) {
      for (const second of candidates) consider([first, second]);
    }
  }
  return best;
}

/** Hechizo de daño que elige la IA según su perfil (potencia o coste). */
export function pickEnemySpell(
  caster: Unit,
  target: Unit,
  catalog: Catalog,
  profile: AIProfile,
): SpellDefinition | null {
  if (!profile.castSpells || caster.spellsCastThisTurn >= 2) return null;
  if (caster.actions < 1) return null;
  const candidates = spellCandidates(caster, target, catalog);
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((left, right) => {
    if (profile.spellPriority === 'cost') {
      if (left.cost !== right.cost) return left.cost - right.cost;
      if (left.power !== right.power) return right.power - left.power;
    } else {
      if (left.power !== right.power) return right.power - left.power;
      if (left.cost !== right.cost) return left.cost - right.cost;
    }
    return (
      Object.values(catalog.spells).indexOf(left) -
      Object.values(catalog.spells).indexOf(right)
    );
  });
  return sorted[0] ?? null;
}

/**
 * Acorralado: ninguna casilla adyacente dentro del pasillo mejora la distancia
 * al amenazante. El pasillo no tiene muros; la única celda bloqueada es la del
 * propio amenazante.
 */
export function isCornered(
  unit: Unit,
  threatPos: number,
  scenario: Scenario,
): boolean {
  const current = Math.abs(unit.pos - threatPos);
  for (const delta of [-1, 1]) {
    const cell = unit.pos + delta;
    if (cell < 0 || cell >= scenario.width) continue;
    if (cell === threatPos) continue;
    if (Math.abs(cell - threatPos) > current) return false;
  }
  return true;
}

export function stepToward(from: number, target: number): number | null {
  if (from === target) return null;
  return from + Math.sign(target - from);
}

export function isInside(
  scenario: Scenario,
  pos: number,
  occupied: ReadonlyArray<number> = [],
): boolean {
  return pos >= 0 && pos < scenario.width && !occupied.includes(pos);
}

export function healUnit(target: Unit, amount: number): number {
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  return target.hp - before;
}

export function resurrectUnit(target: Unit, hpFraction: number): number {
  if (target.hp > 0) return 0;
  target.hp = Math.max(1, Math.ceil(target.maxHp * hpFraction));
  return target.hp;
}

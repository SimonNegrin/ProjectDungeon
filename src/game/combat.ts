import { hasActions, spendActions } from './actions';
import { BESTIARY } from './bestiary';
import { resolvePackets } from './damage';
import { settleUnitDeath } from './death';
import { isAlive, isInside, isOccupied, isWallAt } from './grid';
import { noteDamage, raiseAlarm } from './perception';
import { rollDie } from './rng';
import {
  activeAreaTrait,
  activeLifestealTrait,
  effectiveStats,
  type ActiveTrait,
} from './stats';
import type { TraitAreaParameters } from './equipment';
import type {
  AttackRolls,
  DamagePacketBreakdown,
  GameEvent,
  GameState,
  RejectionReason,
  RngState,
  Unit,
} from './types';

/** Tipo de ataque; solo el cuerpo a cuerpo abre réplica (REQ-027 R-004). */
export type AttackKind = 'melee' | 'ranged' | 'magic';

export function isAdjacent(a: Pick<Unit, 'x' | 'y'>, b: Pick<Unit, 'x' | 'y'>): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) === 1;
}

export function findUnit(state: GameState, id: string): Unit | undefined {
  return state.players.find((unit) => unit.id === id) ?? state.enemies.find((unit) => unit.id === id);
}

/** Impacto: el ataque debe superar la defensa; el empate falla. */
export function resolveHit(
  attackBonus: number,
  defenseBonus: number,
  attackDie: number,
  shieldDie: number,
): boolean {
  return attackBonus + attackDie > defenseBonus + shieldDie;
}

/**
 * Fórmula de daño único histórica (ADR-015). Conservada únicamente como
 * referencia pura para el cross-check de `EXP-003` (que compara su modelo con
 * la producción de antes de REQ-029). El motor ya no la usa: el daño real se
 * resuelve con `resolvePackets` en `damage.ts`.
 */
export function resolveDamage(
  damageBonus: number,
  absorption: number,
  damageDie: number,
  absorptionDie: number,
): number {
  return Math.max(1, damageBonus + damageDie - (absorption + absorptionDie));
}

/** Resultado de una tirada de ataque completa, sin acción ni efectos laterales. */
interface Strike {
  readonly hit: boolean;
  readonly damage: number;
  readonly targetHp: number;
  readonly rolls: AttackRolls;
  /** Desglose por paquete; vacío si falla. */
  readonly damageBreakdown: readonly DamagePacketBreakdown[];
  readonly rng: RngState;
}

/** Un objetivo resuelto dentro de un ataque simple o circular. */
export interface AttackTargetResult {
  readonly targetId: string;
  readonly hit: boolean;
  readonly damage: number;
  readonly targetHp: number;
  readonly rolls: AttackRolls;
  readonly damageBreakdown: readonly DamagePacketBreakdown[];
}

/**
 * Desplazamientos del área en orden fijo de casilla: filas de arriba abajo y
 * columnas de izquierda a derecha. El radio es Chebyshev; el centro se omite
 * cuando el dato lo pide. Cambiar `radius` o `includesCenter` cambia el
 * comportamiento sin tocar el motor (REQ-019 R-011).
 */
export function areaOffsets(
  parameters: TraitAreaParameters,
): readonly { readonly dx: number; readonly dy: number }[] {
  const offsets: { readonly dx: number; readonly dy: number }[] = [];
  for (let dy = -parameters.radius; dy <= parameters.radius; dy += 1) {
    for (let dx = -parameters.radius; dx <= parameters.radius; dx += 1) {
      if (!parameters.includesCenter && dx === 0 && dy === 0) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > parameters.radius) continue;
      offsets.push({ dx, dy });
    }
  }
  return offsets;
}

/** Hostiles vivos del anillo, en el orden fijo que fija el área. */
function areaTargets(
  state: GameState,
  attacker: Unit,
  parameters: TraitAreaParameters,
): readonly Unit[] {
  const targets: Unit[] = [];
  for (const offset of areaOffsets(parameters)) {
    const x = attacker.x + offset.dx;
    const y = attacker.y + offset.dy;
    const target = [...state.players, ...state.enemies].find(
      (unit) =>
        unit.faction !== attacker.faction &&
        isAlive(unit) &&
        unit.x === x &&
        unit.y === y,
    );
    if (target) targets.push(target);
  }
  return targets;
}

/** Curación del robo de vida para un golpe que entra. */
export function lifestealHealing(
  parameters: { readonly percent: number; readonly minimum: number },
  damage: number,
): number {
  return Math.max(
    parameters.minimum,
    Math.floor((damage * parameters.percent) / 100),
  );
}

/**
 * Tirada de ataque con la fórmula de REQ-010 y el resolvedor de paquetes de
 * REQ-029. Es la única implementación: ataque y réplica la comparten. Consume
 * dos tiradas si falla y, si impacta, dos por paquete (daño y resistencia) en
 * orden fijo; no muta la entrada.
 */
function resolveStrike(state: GameState, attacker: Unit, target: Unit): Strike {
  const attackerProfile = effectiveStats(attacker);
  const targetProfile = effectiveStats(target);
  const weapon = attackerProfile.weapon;
  if (weapon === null) throw new Error('resolveStrike requiere un arma equipada');

  const attackRoll = rollDie(state.rng);
  const shieldRoll = rollDie(attackRoll.rng);
  const hit = resolveHit(
    attackerProfile.stats.habilidad + attackerProfile.accuracy,
    targetProfile.stats.defensa + targetProfile.evasion,
    attackRoll.die,
    shieldRoll.die,
  );

  let rng = shieldRoll.rng;
  let damage = 0;
  let damageBreakdown: readonly DamagePacketBreakdown[] = [];
  let rolls: AttackRolls = {
    attack: attackRoll.die,
    shield: shieldRoll.die,
    damage: null,
    armor: null,
  };

  if (hit) {
    const resolved = resolvePackets(
      weapon.damagePackets,
      attackerProfile.stats.fuerza,
      targetProfile.absorption,
      targetProfile.stats.resistencia,
      rng,
    );
    rng = resolved.rng;
    damage = resolved.total;
    damageBreakdown = resolved.breakdown;
    // `AttackRolls.damage/armor` conservan por compatibilidad los dados del
    // primer paquete; el desglose es la fuente autoritativa.
    rolls = { ...rolls, damage: resolved.rolls[0].damage, armor: resolved.rolls[0].resistance };
  }

  return {
    hit,
    damage,
    targetHp: Math.max(0, target.hp - damage),
    rolls,
    damageBreakdown,
    rng,
  };
}

/** Sustituye unidades por ID en jugadores y enemigos sin mutar la entrada. */
function withUnits(state: GameState, updates: readonly Unit[]): GameState {
  const byId = new Map(updates.map((unit) => [unit.id, unit]));
  return {
    ...state,
    players: state.players.map((unit) => byId.get(unit.id) ?? unit),
    enemies: state.enemies.map((unit) => byId.get(unit.id) ?? unit),
  };
}

interface WeaponAttackResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly targets: readonly AttackTargetResult[];
  readonly primary: Strike;
}

/**
 * Resuelve un ataque de arma contra uno o varios objetivos. Comparte el mismo
 * camino para el ataque normal y la réplica: un `resolveStrike` por objetivo en
 * orden fijo, robo de vida por impacto y reacciones de enemigo. No gasta acción
 * ni abre réplica; eso lo decide `resolveAttack`.
 */
function resolveWeaponAttack(
  state: GameState,
  attacker: Unit,
  target: Unit,
  area: ActiveTrait | null,
  lifesteal: ActiveTrait | null,
  eventType: 'AttackPerformed' | 'ReplicaPerformed',
): WeaponAttackResult {
  const events: GameEvent[] = [];
  const targets: AttackTargetResult[] = [];
  const ordered =
    area === null
      ? [target]
      : areaTargets(state, attacker, area.parameters as TraitAreaParameters);
  let currentState = state;
  let primary: Strike | null = null;

  for (const orderedTarget of ordered) {
    const currentAttacker = findUnit(currentState, attacker.id);
    const currentTarget = findUnit(currentState, orderedTarget.id);
    if (!currentAttacker || !currentTarget || !isAlive(currentTarget)) continue;

    const strike = resolveStrike(currentState, currentAttacker, currentTarget);
    if (orderedTarget.id === target.id) primary = strike;

    events.push({
      type: eventType,
      attackerId: currentAttacker.id,
      targetId: currentTarget.id,
      hit: strike.hit,
      damage: strike.damage,
      targetHp: strike.targetHp,
      rolls: strike.rolls,
      damageBreakdown: strike.damageBreakdown,
    });

    if (area !== null && strike.hit) {
      events.push({
        type: 'TraitImpact',
        unitId: currentAttacker.id,
        traitId: area.id,
        source: area.source,
        slot: area.slot,
        itemId: area.itemId,
        targetId: currentTarget.id,
        damage: strike.damage,
        targetHp: strike.targetHp,
      });
    }

    let healedAttacker = currentAttacker;
    if (
      lifesteal !== null &&
      strike.hit &&
      strike.damage > 0 &&
      lifesteal.parameters.kind === 'lifesteal'
    ) {
      const profile = effectiveStats(currentAttacker);
      const beforeHp = currentAttacker.hp;
      const unitHp = Math.min(
        profile.maxHp,
        beforeHp + lifestealHealing(lifesteal.parameters, strike.damage),
      );
      const healing = unitHp - beforeHp;
      healedAttacker = { ...currentAttacker, hp: unitHp };
      if (healing > 0) {
        events.push({
          type: 'TraitDamage',
          unitId: currentAttacker.id,
          traitId: lifesteal.id,
          source: lifesteal.source,
          slot: lifesteal.slot,
          itemId: lifesteal.itemId,
          targetId: currentTarget.id,
          damage: strike.damage,
          healing,
          unitHp,
        });
      }
    }

    currentState = withUnits(
      { ...currentState, rng: strike.rng },
      [healedAttacker, { ...currentTarget, hp: strike.targetHp }],
    );

    targets.push({
      targetId: currentTarget.id,
      hit: strike.hit,
      damage: strike.damage,
      targetHp: strike.targetHp,
      rolls: strike.rolls,
      damageBreakdown: strike.damageBreakdown,
    });

    if (strike.targetHp === 0) {
      events.push({ type: 'UnitDied', unitId: currentTarget.id });
      currentState = settleUnitDeath(currentState, currentTarget.id);
    } else {
      currentState = applyEnemyHitReaction(
        currentState,
        events,
        currentTarget,
        healedAttacker,
        strike.hit,
        strike.damage,
      );
    }
  }

  if (primary === null) {
    // El objetivo pedido siempre forma parte del anillo si el ataque es válido.
    throw new Error('resolveWeaponAttack no resolvió el objetivo principal');
  }

  return { state: currentState, events, targets, primary };
}

/**
 * Reacciones de un enemigo que recibe un impacto: despertar, alarma y huida del
 * cobarde. La réplica usa el mismo camino que un ataque normal.
 */
export function applyEnemyHitReaction(
  state: GameState,
  events: GameEvent[],
  target: Unit,
  attacker: Pick<Unit, 'x' | 'y'>,
  hit: boolean,
  damage: number,
): GameState {
  if (!hit || target.faction !== 'enemy' || target.hp <= 0) {
    return state;
  }

  // El daño despierta al enemigo y, si empieza un episodio, da la alarma.
  const newEpisode = target.awareness !== 'alert';
  const attackerPosition = { x: attacker.x, y: attacker.y };
  let next = noteDamage(state, target.id, attackerPosition);
  if (newEpisode) {
    const alarm = raiseAlarm(next, target.id, attackerPosition);
    next = alarm.state;
    events.push(...alarm.events);
  }

  // Huida determinista del cobarde: un golpe de al menos el 40 % de su vida
  // máxima, sobreviviendo, inicia o renueva la huida sin tirada adicional.
  const strongHit = damage * 5 >= target.maxHp * 2;
  const profile =
    target.enemyType === null ? undefined : BESTIARY[target.enemyType].profile;
  if (strongHit && profile === 'coward') {
    next = {
      ...next,
      enemies: next.enemies.map((unit) =>
        unit.id === target.id ? { ...unit, fleeing: true } : unit,
      ),
    };
    events.push({ type: 'EnemyFled', unitId: target.id });
  }

  return next;
}

/**
 * ¿Está `unit` acorralada por `threat`? Ninguna casilla adyacente libre aumenta
 * la distancia Chebyshev: muros y unidades vivas bloquean. Helper puro.
 */
export function isCornered(
  state: GameState,
  unit: Pick<Unit, 'x' | 'y'>,
  threat: Pick<Unit, 'x' | 'y'>,
): boolean {
  const distance = Math.max(
    Math.abs(unit.x - threat.x),
    Math.abs(unit.y - threat.y),
  );

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      if (!isInside(state.grid, x, y) || isWallAt(state.grid, x, y)) continue;
      if (isOccupied(state, x, y)) continue;

      const nextDistance = Math.max(
        Math.abs(x - threat.x),
        Math.abs(y - threat.y),
      );
      if (nextDistance > distance) return false;
    }
  }

  return true;
}

/**
 * Elegibilidad del defensor para replicar (REQ-027 R-005/R-006): vivo,
 * adyacente, con arma equipada, alerta o regresando; huyendo solo acorralado.
 * Un dormido nunca replica.
 */
export function canReplicate(
  state: GameState,
  defender: Unit,
  attacker: Unit,
): boolean {
  if (!isAlive(defender) || !isAlive(attacker)) return false;
  if (!isAdjacent(defender, attacker)) return false;
  if (defender.equipment.weapon === null) return false;
  if (defender.awareness === 'dormant') return false;
  if (defender.fleeing) return isCornered(state, defender, attacker);
  return true;
}

export type AttackResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
      /** Objetivo pedido; en área, el principal del resultado. */
      readonly hit: boolean;
      readonly damage: number;
      readonly rolls: AttackRolls;
      /** Todos los objetivos resueltos, en orden fijo de casilla. */
      readonly targets: readonly AttackTargetResult[];
    }
  | { readonly ok: false; readonly reason: RejectionReason };

/**
 * Ataque básico genérico para jugadores y enemigos. No comprueba la fase:
 * esa decisión pertenece al motor. No muta el estado de entrada.
 *
 * Orden de tiradas: ataque, escudo; si impacta, por paquete en orden fijo, daño
 * y resistencia. Un fallo consume dos tiradas y un impacto dos por paquete.
 *
 * Si el arma declara un trait de área, el mismo ataque resuelve un objetivo por
 * casilla del anillo en orden fijo; no hay un camino alternativo para el arma
 * circular. El robo de vida se aplica por impacto, también en el área.
 *
 * En melé (`kind` por defecto), un fallo abre una réplica inmediata del
 * defensor si es elegible (REQ-027): tirada nueva con la misma fórmula, gratis,
 * sin recursión y antes de la siguiente acción del atacante. `ranged` y `magic`
 * quedan como discriminante para TASK-0082 y no replican. Un ataque de área no
 * abre réplica para no encadenar anillos.
 */
export function resolveAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
  kind: AttackKind = 'melee',
): AttackResult {
  const attacker = findUnit(state, attackerId);
  if (!attacker) {
    return { ok: false, reason: 'unknown-unit' };
  }
  if (!isAlive(attacker)) {
    return { ok: false, reason: 'dead-unit' };
  }

  const target = findUnit(state, targetId);
  if (!target) {
    return { ok: false, reason: 'target-not-found' };
  }
  if (!isAlive(target)) {
    return { ok: false, reason: 'target-dead' };
  }
  if (target.faction === attacker.faction) {
    return { ok: false, reason: 'same-faction' };
  }

  const attackerProfile = effectiveStats(attacker);
  const area = activeAreaTrait(attackerProfile);
  const lifesteal = activeLifestealTrait(attackerProfile);
  const actionCost = area?.parameters.kind === 'area' ? area.parameters.actionCost : 1;

  if (!hasActions(attacker, actionCost)) {
    return { ok: false, reason: 'no-action' };
  }
  if (!isAdjacent(attacker, target)) {
    return { ok: false, reason: 'target-not-adjacent' };
  }
  if (attacker.equipment.weapon === null) {
    return { ok: false, reason: 'unarmed' };
  }

  const attack = resolveWeaponAttack(
    state,
    attacker,
    target,
    area,
    lifesteal,
    'AttackPerformed',
  );
  const spent = findUnit(attack.state, attackerId);
  let nextState =
    spent === undefined
      ? attack.state
      : withUnits(attack.state, [spendActions(spent, actionCost)]);
  const events: GameEvent[] = [...attack.events];

  if (kind === 'melee' && area === null && !attack.primary.hit) {
    const defender = findUnit(nextState, targetId);
    const aggressor = findUnit(nextState, attackerId);

    if (defender && aggressor && canReplicate(nextState, defender, aggressor)) {
      const defenderProfile = effectiveStats(defender);
      const replica = resolveWeaponAttack(
        nextState,
        defender,
        aggressor,
        activeAreaTrait(defenderProfile),
        activeLifestealTrait(defenderProfile),
        'ReplicaPerformed',
      );
      nextState = replica.state;
      events.push(...replica.events);
    }
  }

  return {
    ok: true,
    state: nextState,
    events,
    hit: attack.primary.hit,
    damage: attack.primary.damage,
    rolls: attack.primary.rolls,
    targets: attack.targets,
  };
}

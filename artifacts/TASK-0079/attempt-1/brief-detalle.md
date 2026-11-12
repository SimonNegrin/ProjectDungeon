---
type: Task Brief Detail
title: "TASK-0079: detalle técnico del intento 1"
description: Decisiones de implementación y contexto de tests para la réplica.
task: TASK-0079
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T20:05:00Z }
---

# Decisiones técnicas

- `resolveAttack` acepta `melee` (defecto), `ranged` o `magic`; solo melé replica
  (enganche de `TASK-0082`). No implementes alcance ni fórmula mágica.
- Elegibilidad del defensor: vivo, adyacente, arma equipada, `alert` o
  `returning`; `fleeing` solo acorralado; `dormant` nunca.
- «Acorralado»: ninguna casilla adyacente libre aumenta la distancia Chebyshev al
  atacante. Helper puro y determinista.
- «Dormido no atacable en melé» es emergente: acercarse lo despierta. No añadas
  un rechazo `target-dormant`: rompería los tests de daño/alarma de `REQ-009`.
  Demuéstralo con un paso o `MoveTo` que despierta al dormido y con que un
  dormido no replica.
- Réplica letal: el atacante muerto no actúa (sin segunda acción); si es jugador,
  `applyTerminal` cierra la partida. Orden `AttackPerformed` →
  `ReplicaPerformed` → `UnitDied`/`GameEnded`.
- El que regresa sigue regresando: la réplica no cambia su `awareness`,
  `lastKnown` ni su plan.
- `ReplicaPerformed`: `attackerId` (quien replica), `targetId` (atacante
  original), `hit`, `damage`, `targetHp` y `rolls`.
- Si ampliar `GameEvent` exige casos exhaustivos en `src/host/motion.ts` o
  `hud.ts`, añade solo stubs neutros (sin cue, beat 0, sin cambio visible) y
  documéntalo; `TASK-0080` implementa la presentación.

# Contexto de tests

- `tests/unit/game/combat.test.ts`: contrato de `resolveAttack`, tiradas de
  `REQ-010`, despertar/alarma y huida.
- `engine.test.ts` (`Attack`), `move-to.test.ts` (ataque al llegar),
  `turn.test.ts` (fase enemiga y `applyTerminal`), `bestiary.test.ts` (enemigos
  reales) y `helpers.ts` (`makeUnit`, `makeState`, `rngForDice`).
- Criterio 4: el dormido se despierta al acercarse; el ataque directo sintético
  sobre un dormido no genera réplica. Conserva los tests de `REQ-009`.
- Criterio 10: no toques HUD, presentación ni valores; la única excepción
  admisible son los stubs de exhaustividad descritos arriba.

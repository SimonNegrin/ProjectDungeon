---
type: Task Brief
title: "TASK-0082: brief del intento 1"
description: Catálogo data-driven de seis hechizos y resolvedor mágico atómico y determinista.
task: TASK-0082
attempt: 1
status: stable
brief_bytes: 4032
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T23:45:00Z }
---

# Objetivo

Crear `src/game/spells.ts` (seis hechizos como dato serializable y fuente única)
y `src/game/magic.ts` (validación y resolución), y cablear el comando de
lanzamiento en `engine.ts`. Ataque, curación y resurrección salen del catálogo,
no de un `switch` por id.

# No objetivos

HUD/input/notices/feedback y debug de `TASK-0083`; IA lanzadora; fantasma,
cadáver y wipe de `REQ-021`; hechizos, resistencias, estados, balance, réplica,
acciones, MP, guardado y dependencias nuevas.

# Invariantes

- `spells.ts` es la única fuente de nivel, coste, alcance, acierto, poder,
  objetivo, efecto y presentación. Los tests leen del catálogo; el resolvedor no
  fija números por hechizo.
- Validación completa antes de mutar o tirar: fase, lanzador vivo, acción, maná,
  nivel, alcance, LOS, objetivo y tope. Un rechazo devuelve el estado original y
  un `CommandRejected`; no consume acción, maná, RNG ni tope.
- Cada lanzamiento gasta 1 acción y el coste final. Contador por unidad y turno
  con tope 2, independiente de las acciones; se reinicia con MP, acciones y maná
  al empezar el turno (`turn.ts`).
- Ataque mágico con las capas de [R-012/T-011](../../../docs/requirements/REQ-025-magia-hechizos-mana.md#requisitos-creativos-decididos):
  reutiliza `resolveHit`/`resolveDamage` y `equipment.ts`; sin resistencia mágica
  y sin réplica. Proyectiles con alcance del hechizo y LOS: muros bloquean,
  unidades no.
- Curación: sin tirada, aliado a 2–3 casillas (Chebyshev) con LOS, nunca a sí
  mismo ni a enemigos, sin superar PV máximo.
- Resurrección: nivel 4, coste 8, adyacente a un jugador muerto y casilla sin
  vivos de ninguna facción; vuelve con `ceil(0.6 × maxHp)`, mínimo 1. El muerto
  sigue en `state.players`; no implementes fantasma.
- Determinismo con `rollDie` y el RNG del estado; nunca `Math.random`. El evento
  de hechizo debe llevar lo necesario para que `TASK-0083` presente impacto,
  fallo, curación o resurrección sin recalcular reglas.
- No debilites tests; `package.json`/`pnpm-lock.yaml` intactos; no edites
  `docs/`.

# Criterios de aceptación

En la ficha:
[criterios](../../../docs/tasks/TASK-0082-motor-catalogo-hechizos.md#criterios-de-aceptación).

# Contexto mínimo

- `src/game/types.ts`: `Command`, `GameEvent`, `RejectionReason`, `Unit`,
  `UnitStats`, `Mana`, `Actions`.
- `src/game/engine.ts`, `turn.ts`, `actions.ts`, `mana.ts`; `combat.ts`,
  `equipment.ts`, `perception.ts`, `grid.ts`, `rng.ts`.
- `tests/unit/game/helpers.ts`: `makeUnit`, `makeState`, `rngForDice`.
- [REQ-025](../../../docs/requirements/REQ-025-magia-hechizos-mana.md#catálogo-mínimo-provisional-v1)
  y T-002/T-003/T-004/T-007/T-011;
  [ADR-019](../../../docs/decisions/ADR-019-magia-mana-hechizos.md#decisión).
- Resurrección: [REQ-021](../../../docs/requirements/REQ-021-muerte-fantasma-resurreccion.md#requisitos-creativos-decididos)
  R-009/R-010/R-013.

# Artefactos

`artifacts/TASK-0082/attempt-1/{report.md,test-output.txt,verify-output.txt,logs/}`;
commit con SHA en `task/TASK-0082`.

# Riesgos y decisiones abiertas

- Comando propuesto: `CastSpell { unitId, spellId, target: Position }`; resuelve
  la unidad por casilla. Si eliges `targetId`, justifícalo y cubre el cadáver.
- Motivos nuevos y estables (`unknown-spell`, `no-mana`, `insufficient-level`,
  `out-of-range`, `no-line-of-sight`, `spell-limit`); reutiliza los existentes
  cuando encajen. `TASK-0083` los mapeará a texto.
- El contador debe ser serializable y sobrevivir al snapshot; tocar
  `src/host/debug.ts` solo para clonarlo.
- Un golpe mágico que dañe a un enemigo reutiliza la reacción de daño de
  `REQ-009` (despertar/alarma/huida), sin réplica. Registra desviaciones.

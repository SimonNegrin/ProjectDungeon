---
type: Task
id: TASK-0026
title: "Motor: combate con equipo, modificadores y RNG sembrado"
description: Sustituir el daño fijo por el resolvedor de impacto y daño de REQ-010, con catálogo de equipo, modificadores por unidad y RNG serializable.
status: stable
task_status: done
task_type: feature
requirement: REQ-010
requirement_ids: [R-001, R-002, R-003, R-004, R-011, R-013, T-001, T-002, T-003, T-008, T-010]
depends_on: []
unlocks: [TASK-0027, TASK-0028]
created_at: 2026-11-08T17:31:45Z
completed_at: 2026-11-08T18:05:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0026/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-08T18:05:00Z
    note: >-
      Intento 2 verificado en task/TASK-0026: implementación ac5e145, tests
      76c9ab7 e informe 2008d23. `pnpm run verify` OK (443 tests, 136 docs,
      build) y `pnpm run test:e2e` OK (55/55); sin cambios en `src/host/`,
      `index.html`, `public/`, docs de requisito/diseño, `experiments/` ni
      dependencias. El snapshot expone la semilla del RNG en
      solo lectura (`snapshot().seed`); el contador serializable vive en
      `GameState.rng` y no se añade al snapshot por el límite de `src/host`.
---

# Objetivo

Que `src/game/` resuelva el combate de [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos)
con las fórmulas, el catálogo de equipo, los modificadores y el RNG sembrado de
la tabla A de [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md).
El jugador y el enemigo actual comparten el mismo resolvedor; el motor sigue
siendo puro y determinista.

# Contexto

- Fórmulas y tabla: REQ-010, requisitos R-001 a R-004 y R-013.
- Puntos de partida: `src/game/combat.ts`, `types.ts`, `engine.ts` y `turn.ts`;
  tests en `tests/unit/game/combat.test.ts` y `engine.test.ts`.
- No se implementan aún armas del mapa, bestiario completo ni HUD.

# Criterios de aceptación

- [x] Impacto: `mod. acierto + acierto del arma + 1d6 > mod. defensa + escudo +
      1d6`; el empate falla. Daño: `max(1, (mod. daño + daño del arma + 1d6) −
      (armadura + 1d6))`.
- [x] Tests de las 36 combinaciones de impacto; con diferencia 0 el impacto es
      15/36 y con +1, 21/36. El daño nunca baja de 1 y su distribución coincide
      con la teórica dentro de ±2 puntos.
- [x] Orden de tiradas: ataque y escudo; si impacta, daño y armadura. Un fallo
      consume dos tiradas y un impacto cuatro; el resultado incluye tiradas,
      impacto, daño y eventos.
- [x] Catálogo de armas (espada +3/4, hacha +2/6, daga +4/3), armadura y escudo
      con IDs estables; cada unidad guarda equipo y modificadores de acierto,
      daño y defensa como datos serializables.
- [x] El jugador empieza con +1/+1/+1, espada, armadura 1, escudo 1 y 20 PV. El
      enemigo actual usa el mismo resolvedor con estadísticas provisionales, sin
      fórmula paralela ni daño fijo; el catálogo por tipo llega en `TASK-0028`.
- [x] RNG sembrado y serializable: misma semilla y comandos dan la misma
      secuencia; `window.__game.snapshot()` lo expone en solo lectura; no se usa
      `Math.random`.
- [x] Victoria, derrota y economía de turno no cambian; los tests existentes
      conservan su intención y no se borran, saltan ni debilitan.
- [x] `pnpm run verify` pasa; `src/game/` no conoce DOM, Canvas, red ni relojes;
      sin dependencias nuevas.

# Plan de test

- **Unitario:** 36 combinaciones, mínimo 1, orden condicional de tiradas,
  modificadores, catálogo, distribución de daño y secuencia del RNG.
- **Integración:** comando `Attack` del jugador y ataque enemigo con el mismo
  resolvedor; reproducibilidad con la misma semilla.
- **Regresión:** `pnpm test` completo y `pnpm run verify`; snapshots y eventos
  existentes sin cambios de intención.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0026/attempt-2/report.md` (intento 1 en
      `attempt-1/report.md`).
- [x] Salidas de tests, `verify` y `test:e2e` en `attempt-2/`.
- [x] Commit SHA en la rama `task/TASK-0026` (`ac5e145`, `76c9ab7`, `2008d23`).

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/combat.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No tocar `src/host/`, `index.html`, `public/`, `docs/`, `experiments/` ni
  dependencias.
- No implementar armas del mapa, recogida, bestiario de percepción ni HUD.
- No usar `Math.random`, `Date.now` ni estado global mutable.

# No objetivos

- Equipo y recogida (`TASK-0027`), bestiario y ataque enemigo por tipo
  (`TASK-0028`), HUD y feedback (`TASK-0029`) y E2E/QA visual (`TASK-0030`).
- Críticos, ataques a distancia, magia, inventario completo o loot.

# Verificación

`task-lead` revisó el diff y re-ejecutó `pnpm run verify` (443 tests, 136 docs,
build) y `pnpm run test:e2e` (55/55). Las aserciones E2E existentes usan la
semilla `279837264`; no hay cobertura nueva (TASK-0030). `snapshot().seed`
expone la semilla en solo lectura; el contador vive en `GameState.rng` y no se
añade al snapshot por el límite de `src/host`. `T-009` (docs y `ADR-012`) no
tiene tarea; se eleva a `requirements-writer`.

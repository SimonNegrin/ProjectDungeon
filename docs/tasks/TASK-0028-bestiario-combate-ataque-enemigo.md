---
type: Task
id: TASK-0028
title: "Motor: bestiario de combate y ataque enemigo"
description: Dar a centinela, bruto y cobarde las estadísticas y el equipo de la tabla A, y hacer que la IA ataque con el mismo resolvedor que el jugador.
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-010
requirement_ids: [R-007, R-008, R-011, R-013, T-003, T-005, T-008, T-010]
depends_on: [TASK-0026]
unlocks: [TASK-0029]
created_at: 2026-11-08T17:31:45Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0028/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T17:31:45Z }
verified:
---

# Objetivo

Que el bestiario de combate sea una única tabla de datos con los valores de la
tabla A de [EXP-003](../../experiments/EXP-003-mesa-combate/experiment.md) y que
el ataque enemigo use el mismo resolvedor y catálogo que el jugador, según
[REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#requisitos-creativos)
R-007, R-008 y T-005. La percepción, la alarma y la huida pertenecen a
`REQ-009` y no se implementan aquí.

# Contexto

- Motor de combate: `TASK-0026`; IA actual en `src/game/ai.ts`; estado en
  `types.ts` y `engine.ts`; tests en `tests/unit/game/ai.test.ts` y
  `combat.test.ts`.
- Equipo y PV aceptados: [REQ-010](../requirements/REQ-010-combate-equipo-acierto-defensa.md#modificadores-y-equipo-aceptados).
- La partida sigue con un solo enemigo; el tipo visible será el centinela.

# Criterios de aceptación

- [ ] El catálogo incluye centinela (+0/+0/+0, espada +3/4, escudo 1, armadura
      1, 9 PV), bruto (+0/+1/+0, hacha +2/6, escudo 0, armadura 2, 12 PV) y
      cobarde (+1/+0/+1, daga +4/3, escudo 1, armadura 0, 8 PV).
- [ ] Cada tipo guarda arma, escudo, armadura, PV, modificadores, visión y
      perfil como datos serializables; cambiar un valor del catálogo cambia el
      combate sin tocar fórmulas.
- [ ] El enemigo actual es un centinela y ataca con el mismo resolvedor y el
      mismo catálogo que el jugador; no hay daño fijo ni fórmula paralela.
- [ ] Con la tabla A, el centinela cae en ~2,6 ataques de espada, ~2,1 de hacha
      y ~3,0 de daga; el bruto en ~4,0, ~2,9 y ~4,8; el cobarde en ~2,2, ~2,0 y
      ~2,3. Los valores medidos quedan dentro de ±0,3 ataques.
- [ ] La visión y el perfil son datos, pero no hay percepción, alarma, huida ni
      colocación de 3-4 enemigos en esta tarea.
- [ ] Victoria y derrota no cambian; un enemigo sigue contando como vivo hasta
      morir. No se debilitan tests existentes.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** tabla completa por tipo, equipo y modificadores, ataque enemigo
  con el resolvedor compartido, tiempo para matar de los tres tipos con las tres
  armas y determinismo del RNG.
- **Integración:** fase enemiga con un centinela; daño e impacto coherentes con
  el equipo; sin cambios en turnos ni victoria/derrota.
- **Regresión:** `pnpm test` y `pnpm run verify`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0028/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0028`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm test -- tests/unit/game/ai.test.ts tests/unit/game/combat.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No implementar percepción, alarma, huida, memoria ni colocación de varios
  enemigos: pertenecen a `REQ-009`.
- No añadir sprites, animaciones ni arte final.
- No tocar HUD, feedback, `src/host/`, `docs/` ni dependencias.

# No objetivos

- HUD y feedback (`TASK-0029`), E2E y QA visual (`TASK-0030`).
- Perfiles de comportamiento, visión efectiva o huida (`REQ-009`).
- Más tipos de enemigo, clases o progresión.

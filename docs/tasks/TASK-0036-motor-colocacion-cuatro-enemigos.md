---
type: Task
id: TASK-0036
title: "Motor: colocación determinista de cuatro enemigos"
description: Derivar del mapa y la semilla 4 enemigos (2 centinelas, 1 bruto y 1 cobarde) en salas distintas, fuera de la visión inicial, con una pareja dentro del radio de alarma y uno fuera.
status: stable
task_status: ready
task_type: feature
requirement: REQ-009
requirement_ids: [R-010, T-007, T-010, T-011]
depends_on: [TASK-0034]
unlocks: [TASK-0037]
created_at: 2026-11-08T20:31:53Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0036/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:31:53Z }
verified:
---

# Objetivo

Que `createInitialState` coloque 4 enemigos deterministas a partir del mapa
generado, con los tipos y las restricciones de
[REQ-009](../requirements/REQ-009-percepcion-alarma-huida.md#requisitos-creativos)
R-010 y T-007. La semilla de referencia es `279837264`, la del host y los E2E.

# Contexto

- Percepción y línea de visión: `TASK-0034`.
- Puntos de partida: `src/game/engine.ts`, `map.ts`, `bsp.ts` y `bestiary.ts`;
  tests en `tests/unit/game/engine.test.ts` y `map.test.ts`.
- El mapa generado ya expone salas, pasillos y `spawns`; la colocación no usa
  `Math.random`.

# Criterios de aceptación

- [ ] La partida arranca con exactamente 4 enemigos: 2 centinelas, 1 bruto y 1
      cobarde, con las estadísticas y el equipo de `REQ-010`.
- [ ] Cada enemigo ocupa una sala distinta; ninguno cae dentro de la visión
      inicial del jugador.
- [ ] Se respeta una distancia mínima entre enemigos y respecto al jugador; hay
      al menos una pareja a ≤8 tiles y un enemigo a >8 de los demás.
- [ ] La colocación es determinista por semilla: la semilla `279837264` y otra
      semilla cumplen las restricciones; no se usa `Math.random`.
- [ ] `home` de cada enemigo es su posición inicial y el snapshot lo refleja.
- [ ] Victoria, derrota, economía de turno y combate no cambian; los tests que
      asumían un solo enemigo se ajustan sin borrar, saltar ni debilitar su
      intención.
- [ ] `pnpm run verify` pasa; sin dependencias nuevas; `src/game/` sigue puro.

# Plan de test

- **Unitario:** tipos y número de enemigos; salas distintas; visión inicial;
  distancias mínima, pareja ≤8 y enemigo >8; `home`; determinismo con dos
  semillas.
- **Integración:** `createInitialState` con el generador BSP por defecto; estado
  serializable y snapshot.
- **Regresión:** victoria, derrota, turnos, movimiento y tests E2E existentes
  ajustados solo en sus supuestos de número de enemigos.
- **E2E / visual:** la cobertura específica llega en `TASK-0039`.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0036/attempt-1/report.md`.
- [ ] Salidas de tests y `verify` en `attempt-1/`.
- [ ] Commit SHA en la rama `task/TASK-0036`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/game/engine.test.ts tests/unit/game/map.test.ts` | 120 s |
| `pnpm run verify` | 180 s |
| `git diff --stat` | 15 s |

# Restricciones

- No implementar alarma, huida ni IA de alerta.
- No cambiar los valores de combate, el bestiario ni la economía de turno.
- No tocar `src/host/`, `index.html`, `public/`, `experiments/` ni dependencias.
- No usar posiciones fijas ajenas al mapa generado.

# No objetivos

- Alarma y daño (`TASK-0035`), IA de alerta y huida (`TASK-0037`), feedback del
  host (`TASK-0038`) y E2E/QA (`TASK-0039`).
- Spawns aleatorios sin semilla, refuerzos o enemigos adicionales.

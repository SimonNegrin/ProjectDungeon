---
type: Task Brief
title: "TASK-0050: brief del intento 1"
description: Balance provisional v1 en catálogos, sin duplicar valores.
task: TASK-0050
attempt: 1
status: stable
brief_bytes: 2554
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T21:50:00Z }
---

# Objetivo

Que el motor lea del catálogo el balance provisional v1: PV 6/8/5, alarma 5,
MP 5/4/6, centinela sin armadura y daños de arma 3/5/2. Tests unitarios en verde
sin valores duplicados fuera de los catálogos.

# No objetivos

- E2E, QA visual o playtest: TASK-0051.
- Preset de EXP-003: TASK-0052.
- Cambiar fórmulas, percepción, economía de turno ni el resto del bestiario.

# Invariantes

- Solo cambian datos de balance y las lecturas que los duplican.
- `src/game/` sigue puro: sin DOM, red, relojes ni dependencias nuevas.
- No se borran, saltan ni debilitan tests; se migran sus expectativas.
- El acierto de las armas no cambia: espada +3, hacha +2, daga +4.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0050-motor-balance-provisional-v1.md`, sección
«Criterios de aceptación». No copiarlos.

# Contexto mínimo

- `src/game/bestiary.ts`: añadir `maxMp`; PV 6/8/5; `alarm: 5`; centinela con
  `armorId: null` (conserva escudo).
- `src/game/equipment.ts`: `WEAPONS.damage` 3/5/2.
- `src/game/engine.ts` y `src/game/types.ts`: `createEnemy` usa
  `definition.maxMp`; `ENEMY_MAX_MP` deja de ser fuente de verdad.
- `src/game/enemy-placement.ts`: deriva el radio de alarma del bestiario; debe
  seguir colocando 4 enemigos en las semillas 279837264, 42 y 1234 con pareja
  ≤5 y aislado >5.
- Tests con valores fijos: `tests/unit/game/{bestiary,engine,perception,ai,combat,integration,enemy-placement}.test.ts`
  y `tests/unit/host/{hud,perception-overlay}.test.ts`; los helpers sintéticos
  leen del catálogo.
- Requisitos: [REQ-010 v5](../../../docs/requirements/REQ-010-combate-equipo-acierto-defensa.md#balance-provisional-v1)
  y [REQ-009 v4](../../../docs/requirements/REQ-009-percepcion-alarma-huida.md#bestiario-mínimo).
- `tests/e2e/` queda fuera: lo actualiza TASK-0051.

# Artefactos

- `artifacts/TASK-0050/attempt-1/report.md`
- `test-output.txt`, `verify-output.txt`
- Commit SHA en `task/TASK-0050`.

# Riesgos y decisiones abiertas

- Con alarma 5, la colocación puede no encontrar pareja ≤5 en alguna semilla.
  Si ocurre, no relajar restricciones: devolver `blocked` con evidencia.
- Los tests de balance deben usar propiedades o rangos y leer del catálogo; no
  sustituir cobertura por aserciones triviales.

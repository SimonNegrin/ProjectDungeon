---
type: Task
id: TASK-0046
title: "Motor: variante growth y generador por defecto"
description: Crear src/game/chambers/variants/growth.ts, el adaptador GrowthMapGenerator y el import estático que convierte growth en el generador por defecto sin switch runtime.
status: stable
task_status: ready
task_type: feature
requirement: REQ-011
requirement_ids: [R-001, R-002, R-008, T-001, T-002, T-009, T-015, T-016]
depends_on: [TASK-0045]
unlocks: [TASK-0047, TASK-0048]
created_at: 2026-11-09T15:30:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0046/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
---

# Objetivo

Que `growth` exista como variante de producción en
`src/game/chambers/variants/growth.ts`, se exponga como `MapGenerator` con
`id = 'growth'` y sea el generador por defecto de `createInitialState`. BSP
sigue inyectable y sus tests pasan.

# Contexto

- Core: `TASK-0044` y `TASK-0045`.
- Modelo: `TASK-0043`.
- Decisión: [ADR-013](../decisions/ADR-013-generador-produccion-por-variante.md).
- El generador de experimento no se copia tal cual: se compone desde el core.

# Criterios de aceptación

- [ ] `src/game/chambers/variants/growth.ts` exporta `GrowthMapGenerator` con
      `id = 'growth'`; `generate(seed, options)` devuelve un `GeneratedMap`
      completo con salas, puertas, pasillos, spawn, entrada, salida y enemigos.
- [ ] `createInitialState` instancia `GrowthMapGenerator` si no se inyecta nada;
      inyectar `BspMapGenerator` sigue funcionando y conserva 4 enemigos.
- [ ] El punto de composición importa solo `growth` de forma estática. No hay
      `switch (variant)`, registro de plugins ni import de `bsp.ts`/`templates.ts`
      desde el módulo de producción.
- [ ] El módulo de producción no importa nada de `experiments/`.
- [ ] `createInitialState` consume `map.enemies` cuando el generador los aporta;
      el estado final conserva tipos, `home` y snapshot serializable.
- [ ] La misma semilla y opciones producen estructuras profundamente iguales;
      no hay `Math.random`, relojes ni estado global.
- [ ] Se mantiene el rendimiento de 22×18 por debajo de 50 ms en CI.
- [ ] `pnpm run verify` pasa; los tests de BSP se ejecutan inyectando el
      generador y no se debilitan.

# Plan de test

- **Unitario:** `GrowthMapGenerator` determinista, contrato `GeneratedMap`,
  opciones por defecto y enemigos del mapa.
- **Integración:** default growth y BSP inyectado en `createInitialState`.
- **Regresión:** `map-integration.test.ts`, `engine.test.ts`, `REQ-009` y
  `REQ-010`; una partida completa con growth.
- **Rendimiento:** medición de 22×18 con la semilla de playtest.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0046/attempt-1/report.md`.
- [ ] Tests, `verify` y medición en `attempt-1/`.
- [ ] Commit SHA en `task/TASK-0046`.

# Restricciones

- No promocionar BSP con máscaras ni plantillas.
- No añadir selector de variante en runtime ni dependencias.
- No tocar `src/host/` salvo lo imprescindible para que compile; el render va en
  `TASK-0048`.
- No cambiar la suite de conformidad ni la guarda de bundle (`TASK-0047`).

# No objetivos

- Bundle y build separado (`TASK-0047`), host y debug (`TASK-0048`), QA y
  playtest (`TASK-0049`).
- Cámara secreta, transición de nivel o cooperativo.

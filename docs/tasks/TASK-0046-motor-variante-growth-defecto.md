---
type: Task
id: TASK-0046
title: "Motor: variante growth y generador por defecto"
description: Crear src/game/chambers/variants/growth.ts, el adaptador GrowthMapGenerator y el import estático que convierte growth en el generador por defecto sin switch runtime.
status: stable
task_status: done
task_type: feature
requirement: REQ-011
requirement_ids: [R-001, R-002, R-008, T-001, T-002, T-009, T-015, T-016]
depends_on: [TASK-0045]
unlocks: [TASK-0047, TASK-0048]
created_at: 2026-11-09T15:30:00Z
completed_at: 2026-11-09T17:00:09Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0046/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
verified:
  - by: task-lead
    at: 2026-11-09T17:00:09Z
    note: >-
      Intentos 1 y 2 verificados en task/TASK-0046 (código 4627913, 7abe223;
      tests f6507e6, ed176cf; evidencia 6c5b017 y 45a6108; fusión be5022a).
      El intento 1 se rechazó por una regresión detectada en la verificación:
      `createInitialState()` ya usaba growth pero su mapa no traía `weapons`, y
      los tests de armas se habían redirigido a BSP. El intento 2 lo corrige
      reutilizando `placeMapWeapons` con `blockedCells` aditivo y añade hacha y
      daga deterministas fuera de spawn, puertas, salida y enemigos. Diff
      completo revisado: solo `src/game/chambers/variants/growth.ts`,
      `src/game/engine.ts`, `src/game/map.ts` (extensión aditiva), tests y
      artefactos; sin tocar `src/host/`, `experiments/`, `index.html`,
      dependencias, bestiario, IA ni combate. Lead re-ejecutó `pnpm run verify`
      (711/711 tests, docs/config y build OK), las suites dirigidas
      growth/BSP/REQ-009/REQ-010 (187/187 en la selección del lead) y las de
      armas host (68/68); growth mide 1,93 ms de media en 22×18 con semilla
      2738263054 y el barrido de 200 semillas pasa el validador de growth. BSP
      inyectado conserva 32×32, 4 enemigos y sus armas exactas. `growth` es el
      default, consume `map.enemies` con tipo y `home`, admite BSP inyectado y
      no importa BSP, plantillas ni experimentos. `validateGeneratedMap` sigue
      siendo BSP-específico; growth usa `validateGrowthMap` con positivos y
      negativos. Sin tests borrados, saltados o debilitados: solo se adaptaron
      los casos que probaban BSP inyectándolo. E2E no aplica: es TASK-0049 y el
      render de growth es TASK-0048. Fricción triada: el desajuste
      `MapOptions`/opciones de growth se acepta como workaround local y se eleva
      a requirements-writer como propuesta documental; la falta de test de
      default sin inyección se cubre con el test nuevo y se registra como
      lección (`accepted`).
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

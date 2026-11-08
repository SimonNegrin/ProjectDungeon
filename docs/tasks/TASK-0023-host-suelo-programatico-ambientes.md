---
type: Task
id: TASK-0023
title: "Host: suelo programático por sala y decoración ambiental"
description: Pintar el damero con dos colores planos y una paleta curada por sala, y agrupar 33 decals por ambientes con densidad 35/16, sin tocar el motor.
status: stable
task_status: done
task_type: feature
requirement: REQ-008
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010]
depends_on: []
unlocks: [TASK-0024]
created_at: 2026-11-08T14:29:18Z
completed_at: 2026-11-08T14:50:13Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0023/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:29:18Z }
verified:
  - by: task-lead
    at: 2026-11-08T14:50:13Z
    note: >-
      Verificación independiente en task/TASK-0023 (commits daa86a2, 3982fd6,
      978d0d6; fusión 36c864e): diff limitado a src/host/, tests/unit/host/,
      tests/e2e/floor-qa.spec.ts y artifacts/TASK-0023; src/game/, index.html,
      public/, docs/, package.json y pnpm-lock.yaml intactos. `pnpm run verify`
      OK (118 documentos, 24 tareas; 397/397 tests en 30 archivos; build 54
      módulos) y `pnpm run test:e2e` OK (46/46). Densidad de referencia 121/339 =
      35,69 % en salas y 11/71 = 15,49 % en pasillos; 132 decals en 132 tiles
      únicos, 0 en 18 puertas y 2 apariciones. Mezcla por sala 23,1-28,6 %;
      paletas con ΔL 13,23-17,48; muros 0/73728 píxeles distintos del sprite.
      Capturas 1280×720 de sala y pasillo revisadas; grises y camino/cursor
      sobre decal verificados. Tests existentes actualizados sin borrar, saltar
      ni debilitar; fricción de `timeout` en macOS elevada a
      requirements-writer (`deferred`).
---

# Objetivo

El suelo usa un damero de dos colores planos, con base común y segundo tono por
sala. La decoración usa 33 decals agrupados por ambientes, con densidad 35 % en
salas y 16 % en pasillos, sin bloquear ni cambiar el motor.

# Contexto

- [REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md) y
  [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md).
- Render y assets: `src/host/renderer.ts` (`floorTileFor`) y
  `src/host/assets.ts`.
- Lógica pura: `src/host/floor.ts`. Debug: `src/host/debug.ts`.
- Datos: `state.map.rooms`, `doors`, `spawns`.
- La lista actual etiqueta mal las filas 9 y 10; se corrige aquí.

# Diseño esperado

- `FLOOR_BASE` y `FLOOR_PALETTES` con las cinco paletas aprobadas; mapeo
  ambiente→paleta y `roomAmbientFor(map, room)` deterministas.
- Suelo con `fillRect` por tile y paridad global; sin `floorTileFor` ni recortes
  de suelo del PNG.
- Lista blanca de 33 decals con familias correctas: piedritas `7.e-g`, hierba
  `8.e-g`, tierra `9.e-g`, ladrillos azules `10.e-g`, huesos `11.e-g`, ladrillos
  rojos `12.e-g`, plantas `20.a/b/e/l/n/o/p`, setas `21.a-b`, cadáveres `22.a-b`
  y sangre/slime `23.a-d`.
- Planificador: ambiente dominante por sala, 1-3 focos, 20-30 % de mezcla,
  algunas salas dispersas; pasillos mixtos y sin foco; máximo un decal por tile;
  nunca en apariciones ni puertas.
- `snapshot()` expone decoración (tipo, familia, ambiente, área) y paleta por
  sala, de solo lectura.

# Criterios de aceptación

- [ ] Damero 1×1 global en salas, pasillos y umbrales; ni muros ni tiles no
      transitables reciben color de suelo.
- [ ] Modelo A: base `#0d1519` común y segundo tono por sala; pasillos y
      umbrales neutros.
- [ ] Paletas por contraste con el ambiente; ΔL simple (0-255) ≥ 12; escala de
      grises; camino y cursor visibles.
- [ ] 33 decals de la lista blanca; familias correctas (9 = tierra, 10 = ladrillo
      azul, 11 = huesos); sin props, fondos ni cultivos altos.
- [ ] Densidad 32-38 % en salas y 13-19 % en pasillos para la semilla
      `279837264`; máximo un decal por tile; sin decals en 2 apariciones ni en
      las puertas.
- [ ] Ambientes y focos deterministas; mezcla 20-30 %; algunas salas dispersas.
- [ ] `state.grid.tiles` no cambia; no se añaden colisiones; un `MoveTo` puede
      terminar en un tile decorado.
- [ ] Camino, cursor y unidades se dibujan por encima de los decals; muros sin
      cambios.
- [ ] Snapshot determinista, completo y sin mutadores.
- [ ] Tests nuevos y actualizados sin borrar, saltar ni debilitar intención;
      `pnpm run verify` pasa; `src/game/` intacto; sin dependencias nuevas.
- [ ] Captura a 1280×720 con `?seed=279837264` de una sala y un pasillo.

# Plan de test

- **Unitario:** paletas, contraste, mapeo de familias, lista blanca, densidad,
  exclusiones, máximo un decal, ambientes, focos, determinismo y fallback sin
  mapa.
- **Renderer:** colores por sala, orden base → decals, unidades y camino por
  encima; sin recortes de suelo.
- **Integración:** `MoveTo` a un tile decorado; el estado se mueve y la
  decoración no cambia.
- **Visual:** capturas de sala, pasillo y umbral; comparación de escala de grises.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0023/attempt-1/report.md`.
- [ ] Salidas de tests y de `pnpm run verify` en `attempt-1/`.
- [ ] Capturas de sala, pasillo y umbral; commit SHA en `task/TASK-0023`.

# Restricciones

- No tocar `src/game/`, `index.html` ni `public/assets/`.
- No editar `docs/`; hoja, ADR e índices ya están preparados.
- No añadir dependencias ni importar `experiments/`; no debilitar tests.
- Sin `Math.random`, `Date.now` ni estado global mutable.
- No usar más de un decal por tile.

# No objetivos

- E2E y QA visual completos: pertenecen a `TASK-0024`.
- Biomas, superficie, plantas altas, árboles, props que bloquean, interacción,
  iluminación, sombras o decals animados.
- Cambiar camino, coste, MP, turnos, combate, generación o muros.

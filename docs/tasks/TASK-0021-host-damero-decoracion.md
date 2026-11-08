---
type: Task
id: TASK-0021
title: "Host: damero global y decoración plana determinista"
description: Pintar el suelo transitable con un damero de dos tonos y decals planos no bloqueantes, de forma determinista y sin tocar el motor.
status: stable
task_status: done
task_type: feature
requirement: REQ-007
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-009]
depends_on: []
unlocks: [TASK-0022]
created_at: 2026-11-08T11:55:58Z
completed_at: 2026-11-08T13:40:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0021/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:55:58Z }
verified:
  - by: task-lead
    at: 2026-11-08T13:40:00Z
    note: >-
      Verificación independiente en task/TASK-0021 (commits ae6164c, b37af32,
      2d36f5f, 10b17d3; fusión 6c8117f): diff limitado a src/host/assets.ts,
      debug.ts, floor.ts, renderer.ts, tests/unit/host y artifacts/TASK-0021;
      src/game/, index.html, public/assets/, package.json y pnpm-lock.yaml
      intactos; sin tests borrados ni debilitados. `pnpm run verify` OK (109
      documentos, 22 tareas; 381/381 tests en 30 archivos; build 54 módulos) y
      `pnpm run test:e2e` OK (40/40). Densidad de referencia 15,04 % en salas y
      7,04 % en pasillos; sin decals en 18 puertas ni spawns. Capturas 1280×720
      en artifacts/TASK-0021/attempt-1/screenshots/.
---

# Objetivo

El suelo transitable muestra un damero global de dos tonos y decals planos
deterministas. La decoración no bloquea ni cambia el estado del motor; muros,
reglas, generación y economía de turno quedan igual.

# Contexto

- [REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md) y
  [ADR-010](../decisions/ADR-010-damero-decoracion-presentacion.md).
- Render y assets: `src/host/renderer.ts` (`floorTileFor`) y
  `src/host/assets.ts`.
- Datos: `state.map.rooms`, `doors`, `spawns`. Debug: `src/host/debug.ts` y
  `src/host/main.ts`.

# Diseño esperado

- Módulo puro `src/host/floor.ts`: paridad `(x + y) % 2`, configuración del
  tinte, lista blanca, densidades y hash. Sin DOM, Canvas, relojes ni
  `Math.random`.
- Orden: base → tinte → decals → camino/cursor → unidades → HUD.
- Clasificación: sala dentro de un `Room`; pasillo fuera de salas; umbral en
  `map.doors`. Umbrales y apariciones no se decoran. Sin mapa: damero sí,
  decoración no.
- Lista blanca: filas `7.e-g`, `8.e-g`, `9.e-g`, `10.e-g`, `11.e-g`, `21.a-b`,
  `22.a-b` y `23.a-d` de `tiles.png`. Sin props sólidos; PNG intacto.
- Densidad y mezcla: las de REQ-007 (12-18 % salas, 6-8 % pasillos, un decal por
  tile; mezcla 40/20/15/15/10).
- `snapshot()` expone un resumen de solo lectura de la decoración (posiciones,
  tipo y área), determinista y sin mutadores.

# Criterios de aceptación

- [ ] Damero 1×1 global en todo el suelo transitable; ni muros ni tiles no
      transitables reciben damero.
- [ ] Dos tonos por tinte sutil (~10 % gris-azul), con diferencia de luminancia;
      configuración única; PNG intacto.
- [ ] Solo decals de la lista blanca; sin props sólidos.
- [ ] Densidades dentro de rango en la semilla `279837264`; máximo un decal por
      tile; sin decals en apariciones ni umbrales.
- [ ] Misma semilla y mapa dan el mismo resultado; otra semilla cambia decals, no
      damero.
- [ ] `state.grid.tiles` no cambia, no se añaden colisiones y un `MoveTo` puede
      terminar en un tile decorado.
- [ ] Camino, cursor y unidades se dibujan por encima de los decals.
- [ ] El snapshot incluye el resumen de decoración, es determinista y no muta el
      estado.
- [ ] Tests nuevos de paridad, tinte, lista blanca, densidad, exclusiones,
      determinismo y no bloqueo; sin debilitar tests.
- [ ] `pnpm run verify` pasa; `src/game/` no cambia; sin dependencias nuevas.
- [ ] Captura a 1280×720 con la semilla de referencia.

# Plan de test

- **Unitario:** paridad, configuración del tinte, lista blanca, densidad,
  exclusiones, determinismo y fallback sin mapa.
- **Renderer:** contexto falso; orden base → tinte → decal; unidades por encima.
- **Integración:** `MoveTo` a un tile decorado; el estado se mueve y la
  decoración no cambia.
- **Visual:** captura con `?seed=279837264` de sala, pasillo y umbral.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm test` | 120 s | Unitarios y renderer |
| `pnpm run build` | 120 s | Typecheck y build |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `git diff --stat` | 15 s | Alcance del diff |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0021/attempt-1/report.md`.
- [ ] Salidas de tests y de `pnpm run verify` en `attempt-1/`.
- [ ] Capturas de sala, pasillo y umbral; commit SHA en `task/TASK-0021`.

# Restricciones

- No tocar `src/game/`, `index.html` ni `public/assets/`.
- No editar `docs/`; la hoja y el ADR ya están preparados.
- No añadir dependencias ni importar `experiments/`; no debilitar tests.
- Sin `Math.random`, `Date.now` ni estado global mutable.

# No objetivos

- E2E y QA visual completos: pertenecen a `TASK-0022`.
- Objetos que bloquean, interacción, iluminación, sombras o decals animados.
- Cambiar camino, coste, MP, turnos, combate, generación o muros.

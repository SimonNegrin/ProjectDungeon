---
type: Task
id: TASK-0022
title: "E2E y QA visual del damero y la decoración"
description: Verificar en navegador que el damero se lee, la decoración no bloquea y la misma semilla reproduce el mismo aspecto.
status: stable
task_status: done
task_type: test
requirement: REQ-007
requirement_ids: [R-001, R-002, R-004, R-005, R-006, R-007, R-008, T-006, T-007]
depends_on: [TASK-0021]
unlocks: []
created_at: 2026-11-08T11:55:58Z
completed_at: 2026-11-08T13:44:53Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0022/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:55:58Z }
verified:
  - by: task-lead
    at: 2026-11-08T13:44:53Z
    note: >-
      Verificación independiente en task/TASK-0022 (commits a4ea798, c564947,
      af45545, e542355; fusión 505837c): diff limitado a tests/e2e/floor-qa.spec.ts y
      artifacts/TASK-0022; src/, index.html, public/, package.json y
      pnpm-lock.yaml intactos; specs existentes sin cambios, borrados ni
      debilitados. `pnpm run test:e2e` OK (46/46; 40 previos + 6 nuevos) y
      `pnpm run verify` OK (112 documentos, 22 tareas; 381/381 tests en 30
      archivos; build 54 módulos; único aviso: report.md de 3937 B). Densidad de
      referencia 51/339 = 15,04 % en salas y 5/71 = 7,04 % en pasillos; 56
      decals en 56 tiles únicos, 0 en 18 puertas y 2 spawns. Damero sala Δ 14,65
      y pasillo Δ 13,89; grises Δ 14,98; muros 0/73728 píxeles con tinte.
      Camino/cursor sobre blood-23a en (7,6) con z-index 1/2 y píxeles verdes
      visibles; MoveTo (7,8)→(7,9) aceptado sin cambiar decoración ni rejilla;
      misma semilla con buffers idénticos (sha256 c441dcfb…) y semilla
      alternativa 279837265 con 55 decals y damero intacto. Capturas revisadas en
      artifacts/TASK-0022/attempt-1/floor-qa/screenshots/. Fricción de
      `artifactPath` con `fullyParallel`: `deferred — requirements-writer`.
---

# Objetivo

Al terminar, el damero y la decoración están verificados en navegador: el patrón
se lee en salas y pasillos, los decals no bloquean, las exclusiones se respetan y
la misma semilla reproduce el mismo aspecto. Sin cambios de producción.

# Contexto

- Requisito: [REQ-007](../requirements/REQ-007-damero-decoracion-suelo.md).
- Implementación: `TASK-0021` (`src/host/floor.ts`, `assets.ts`, `renderer.ts`,
  `debug.ts`).
- Decisión: [ADR-010](../decisions/ADR-010-damero-decoracion-presentacion.md).
- Convención de capturas: [QA visual](../harness/visual-qa.md).
- Semilla de referencia: `279837264`.

# Criterios de aceptación

- [ ] Captura a 1280×720 con `?seed=279837264`: el damero se distingue en una
      sala y en un pasillo sin ampliar; dos tiles ortogonalmente adyacentes
      alternan tono; ningún muro lleva damero.
- [ ] La escala de grises de una captura conserva el damero por luminancia.
- [ ] Hay decoración en salas y pasillos; no aparecen props sólidos; el snapshot
      confirma que no hay decals en apariciones ni umbrales y que no hay más de
      uno por tile.
- [ ] Densidad medida en el snapshot dentro de 12-18 % en salas y 6-8 % en
      pasillos para la semilla de referencia.
- [ ] El camino resaltado y el cursor se ven por encima de los decals en una
      captura con camino activo.
- [ ] Un `MoveTo` a un tile decorado termina correctamente y el jugador ocupa ese
      tile; la decoración sigue en su sitio.
- [ ] Dos capturas de la misma semilla son idénticas; otra semilla cambia al
      menos un decal y mantiene el damero.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests; no se modifica `src/`, `index.html` ni `public/`.
- [ ] Evidencia en `artifacts/TASK-0022/attempt-1/` con informe, capturas y
      salidas de test.

# Plan de test

- **E2E funcional:** leer el snapshot de decoración; comprobar densidades,
  exclusiones y máximo un decal por tile; elegir un tile decorado y ejecutar
  `MoveTo`; comprobar que la posición cambia y que el tile sigue decorado.
- **E2E visual:** capturas `damero-sala.png`, `damero-pasillo.png`,
  `camino-sobre-decal.png`, `gris.png` y `semilla-distinta.png`.
- **Comparación:** misma semilla dos veces (buffers idénticos); semilla distinta
  (decoración distinta, damero igual).
- **Regresión:** `pnpm run test:e2e` completo y `pnpm run verify`.
- **Manual:** revisar que el damero no compite con el camino ni el cursor.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test:e2e` | 240 s | Suite E2E completa |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0022/attempt-1 pnpm run test:e2e` | 240 s | Capturas versionadas |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0022/attempt-1/report.md`.
- [ ] Capturas de sala, pasillo, camino, escala de grises y semilla distinta.
- [ ] Salidas de `pnpm run test:e2e` y `pnpm run verify`.
- [ ] Commit SHA en la rama `task/TASK-0022`.

# Restricciones

- No modificar código de producción; si falta un dato, se devuelve al lead.
- No cambiar aserciones, nombres de capturas ni esperas existentes.
- No borrar, saltar ni debilitar tests.
- No tocar artefactos históricos; usar `E2E_ARTIFACTS_DIR`.
- No editar `docs/`.

# No objetivos

- Implementar el damero o los decals: pertenece a `TASK-0021`.
- Añadir objetos que bloquean, muros nuevos, iluminación o animación de decals.
- Cambiar reglas, generación, cámara, HUD o economía de turno.

---
type: Task
id: TASK-0024
title: "E2E y QA visual del suelo por sala y la decoración ambiental"
description: Verificar en navegador las paletas por sala, la densidad 35/16, los ambientes y la no bloqueabilidad con capturas y snapshot.
status: stable
task_status: done
task_type: test
requirement: REQ-008
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, T-006, T-007]
depends_on: [TASK-0023]
unlocks: []
created_at: 2026-11-08T14:29:18Z
completed_at: 2026-11-08T15:10:18Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0024/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T14:29:18Z }
verified:
  - by: task-lead
    at: 2026-11-08T15:10:18Z
    note: >-
      Verificación independiente en task/TASK-0024 (tests ae0553b, evidencia
      808a55c, cierre 94b3a34; fusión d52fefe): diff limitado a
      tests/e2e/floor-qa-ambient.spec.ts y artifacts/TASK-0024; src/, index.html,
      public/, package.json y pnpm-lock intactos; floor-qa.spec.ts sin cambios.
      `pnpm run test:e2e` OK (51/51) y `pnpm run verify` OK (397/397 en 30
      archivos; build 54 módulos); 11/11 en floor-qa. Densidades 121/339 =
      35,69 % y 11/71 = 15,49 %; 132 decals en 132 tiles, 0 en 18 puertas y 2
      apariciones. Cinco ambientes con mezcla 23,1-28,6 % y focos 5×5 de hasta
      13 decals; capturas de sala neutra, humedad, muerte, ruina, pasillo, gris,
      camino/cursor y familias 9/10/11 revisadas. Determinismo: misma semilla
      idéntica; semilla 279837265 cambia decals y ambientes y conserva la base
      #0d1519 y la paridad. `MoveTo` a (6,7) termina, conserva decoración y
      grid. Los cambios externos de REQ-009 en docs/ no se incluyeron.
---

# Objetivo

Al terminar, el suelo programático por sala y la decoración ambiental están
verificados en navegador: cada sala tiene su paleta y su ambiente, la densidad
está en rango, los decals no bloquean y la misma semilla reproduce el mismo
aspecto. Sin cambios de producción.

# Contexto

- Requisito: [REQ-008](../requirements/REQ-008-suelo-programatico-decoracion-ambiental.md).
- Implementación: `TASK-0023` (`src/host/floor.ts`, `assets.ts`, `renderer.ts`,
  `debug.ts`).
- Decisión: [ADR-011](../decisions/ADR-011-suelo-programatico-ambientes.md).
- Convención de capturas: [QA visual](../harness/visual-qa.md).
- Semilla de referencia: `279837264`.

# Criterios de aceptación

- [ ] Captura a 1280×720 con `?seed=279837264`: el damero se distingue en una
      sala y en un pasillo sin ampliar; dos tiles adyacentes alternan color;
      ningún muro lleva paleta de suelo.
- [ ] El snapshot confirma la base común y una paleta por sala; pasillos y
      puertas usan la neutra.
- [ ] Se distinguen al menos tres ambientes (humedad, muerte/combate y ruina o
      vegetación) con focos y mezcla; no todas las salas se ven iguales.
- [ ] La escala de grises conserva el damero por luminancia; el camino y el
      cursor se ven por encima de los decals.
- [ ] Densidad medida en el snapshot dentro de 32-38 % en salas y 13-19 % en
      pasillos; máximo un decal por tile; sin decals en apariciones ni puertas.
- [ ] La lista blanca se respeta: sin props, fondos ni cultivos altos; las
      familias 9 = tierra, 10 = ladrillo azul y 11 = huesos se ven correctas.
- [ ] Un `MoveTo` a un tile decorado termina correctamente y el jugador ocupa ese
      tile; la decoración sigue en su sitio y `state.grid.tiles` no cambia.
- [ ] Dos capturas de la misma semilla son idénticas; otra semilla cambia al
      menos un decal y un ambiente, pero mantiene el damero.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests; no se modifica `src/`, `index.html` ni `public/`.
- [ ] Evidencia en `artifacts/TASK-0024/attempt-1/` con informe, capturas y
      salidas de test.

# Plan de test

- **E2E funcional:** leer el snapshot de decoración y paletas; comprobar
  densidades, exclusiones, máximo un decal y familias; elegir un tile decorado y
  ejecutar `MoveTo`.
- **E2E visual:** capturas de sala neutra, humedad, muerte/combate y pasillo;
  `camino-sobre-decal.png` y `gris.png`.
- **Comparación:** misma semilla dos veces (buffers idénticos); semilla distinta
  (decoración y ambiente distintos, damero igual).
- **Regresión:** `pnpm run test:e2e` completo y `pnpm run verify`.
- **Manual:** revisar que las paletas no compiten con camino, cursor ni HUD.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0024/attempt-1/report.md`.
- [ ] Capturas de sala neutra, humedad, muerte/combate, pasillo, camino y gris.
- [ ] Salidas de `pnpm run test:e2e` y `pnpm run verify`.
- [ ] Commit SHA en la rama `task/TASK-0024`.

# Restricciones

- No modificar código de producción; si falta un dato, se devuelve al lead.
- No cambiar aserciones, nombres de capturas ni esperas existentes.
- No borrar, saltar ni debilitar tests.
- No tocar artefactos históricos; usar `E2E_ARTIFACTS_DIR`.
- No editar `docs/`.

# No objetivos

- Implementar el suelo o la decoración: pertenece a `TASK-0023`.
- Biomas, superficie, plantas altas, árboles, props que bloquean, iluminación o
  animación de decals.
- Cambiar reglas, generación, cámara, HUD o economía de turno.

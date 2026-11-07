---
type: Task
id: TASK-0007
title: "Experimento comparativo de generadores de mazmorra"
description: Construir EXP-001 con tres variantes (BSP, salas+pasillos, híbrido), misma semilla, métricas, huecos de puerta y render con 32rogues.
status: stable
task_status: review
task_type: experiment
requirement: REQ-003
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-011, T-001, T-002, T-004, T-005]
depends_on: [TASK-0006]
unlocks: []
created_at: 2026-11-07T17:43:55Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0007/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:43:55Z }
verified:
  - by: task-lead
    at: 2026-11-07T18:05:55Z
    note: Verificación técnica independiente con verify y E2E; pendiente del playtest y la decisión de human:simon.
---

# Objetivo

Construir `EXP-001` en `experiments/EXP-001-generador-mazmorra/` usando el shell
compartido. El experimento compara tres generadores con la misma semilla y los
mismos parámetros, renderiza el mapa de 32×32 con los tiles de 32rogues, marca
los huecos de puerta y los puntos de aparición, y permite exportar una decisión.

El resultado no se promociona a `src/` en esta tarea. Solo se construye y se deja
listo para que el usuario lo pruebe y decida.

# Contexto

- Requisito: [REQ-003](../requirements/REQ-003-generacion-mapa.md).
- Experimento: [EXP-001](../../experiments/EXP-001-generador-mazmorra/experiment.md).
- Shell: [experimentos](../harness/experiments.md) y
  `experiments/EXP-000-shell-demo/` como ejemplo.
- Regla de muros ya aprobada: `wallSide1` solo con suelo al sur; `wallTop` en el
  resto; `wallSide2` no se usa.
- Arte: `public/assets/32rogues/tiles.png` y los recortes de `src/host/assets.ts`.
- Página y código previstos:
  - `experiments/EXP-001-generador-mazmorra/index.html`
  - `experiments/EXP-001-generador-mazmorra/src/main.ts`
  - `experiments/manifest.ts`
  - `tests/e2e/experiment-generator.spec.ts`

# Criterios de aceptación

- [x] La página `/experiments/EXP-001-generador-mazmorra/` carga y aparece en
      `experiments/manifest.ts` y en el índice de experimentos.
- [x] Hay tres variantes A/B/C: BSP, salas+pasillos e híbrido. Las tres reciben
      la misma semilla y los mismos parámetros y se regeneran a la vez.
- [x] La semilla se puede editar y regenerar; el botón de reinicio vuelve a los
      valores y la semilla inicial.
- [x] Parámetros disponibles: `roomTarget` (8-12), `roomMin` (3-6), `roomMax`
      (8-11), `loopRatio` (0-40 %) y `showDoors` (toggle). El tamaño del mapa es
      fijo en 32×32.
- [x] Con los parámetros por defecto, las tres variantes producen mapas conexos
      de 8-12 salas, pasillos de 1 tile, 1-3 bucles y huecos de puerta. Si una
      combinación de parámetros es imposible, se normaliza y se muestra un aviso
      visible; no se rompe la página.
- [x] El render usa los tiles reales de 32rogues: `wallSide1` solo en muros con
      suelo al sur, `wallTop` en el resto y nunca `wallSide2`; las variantes de
      suelo son deterministas.
- [x] Se marcan los huecos de puerta, los puntos de aparición y los límites de
      sala con overlays legibles. `showDoors` oculta o muestra los huecos.
- [x] Cada variante muestra métricas: salas, área mínima/mediana/máxima,
      porcentaje de suelo, pasillos, esquinas, callejones, bucles, huecos,
      conectividad, distancia jugador→enemigo y tiempo de generación.
- [x] El panel de decisión ofrece A, B, C y "ninguna"; el JSON exportado incluye
      semilla, parámetros, decisión y notas.
- [x] El modo `?test=1&seed=...` es determinista y `window.__experiment` expone
      parámetros, semilla, métricas y decisión.
- [x] Hay un E2E nuevo que carga la página, comprueba las tres variantes, cambia
      la semilla, verifica que las métricas cambian y exporta una decisión.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan. No se borran, saltan ni
      debilitan tests existentes.
- [x] No se modifica código de producción: `src/`, `index.html` y `public/`
      quedan intactos. Solo cambian `experiments/`, `tests/e2e/` y los artefactos.

# Plan de test

- **Unitario:** determinismo por semilla, conectividad BFS, recuento y tamaño de
  salas, longitud de pasillos, bucles, huecos de puerta, apariciones y regla de
  muros. Probar al menos tres semillas por variante.
- **Integración:** montar el experimento en modo test y comprobar que las tres
  variantes generan estado y métricas sin animación.
- **E2E:** `tests/e2e/experiment-generator.spec.ts` con carga, tres canvases,
  cambio de semilla, métricas, decisión y captura.
- **Visual:** capturas de A/B/C con la misma semilla y de una semilla alternativa
  en `artifacts/TASK-0007/attempt-1/screenshots/`.
- **Manual:** el usuario abre la página, compara y decide. Esa decisión no la
  toma el runner.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Generadores, métricas y shell |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Página del experimento y regresiones |
| `pnpm run build` | 120 s | Build con el experimento nuevo |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0007/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0007/attempt-1/test-output.txt`
- [x] Capturas A/B/C con la misma semilla
- [x] Captura de una semilla alternativa
- [x] Commit SHA en la rama `task/TASK-0007`

# Verificación

Verificación independiente del `task-lead` sobre `task/TASK-0007` (intento 1).
La implementación está en `1164fcd` y el informe en `2755cee`; la rama se
fusionó en `main` por fast-forward hasta `260ae46` al pasar la revisión técnica.
La tarea queda en `review` hasta que `human:simon` pruebe el experimento y
registre su decisión.

- **Alcance del diff:** solo `experiments/EXP-001-generador-mazmorra/**`,
  `experiments/manifest.ts`, `experiments/index.md`,
  `tests/e2e/experiment-generator.spec.ts`, `artifacts/TASK-0007/**` y los
  documentos de preparación de la tarea. Sin cambios en `src/**`, `index.html`,
  `public/**`, `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`,
  `experiments/_shell/**`, `REQ-003` ni los specs E2E existentes.
- **Comandos re-ejecutados por el lead** (timeout de la herramienta de shell):
  - `pnpm run verify` (180 s): docs 55, config 3/9, 143 tests, `tsc` y build OK.
  - `pnpm run test:e2e` (300 s): 11 tests OK (10 existentes + 1 nuevo).
  - Comprobaciones de alcance con `git diff --stat` y `git status` limpio al
    terminar. Sin servidores vivos en 4173/5173.
- **Criterios:** se leyeron `main.ts`, `dungeon.ts`, `render.ts`, los tests y el
  informe. Se comprobó: parámetros exactos y mapa 32×32; render con
  `TILE_RECTS` de `src/host/assets.ts`; `wallTileFor` solo devuelve `wallTop` o
  `wallSide1`, con `wallSide1` únicamente si el sur es suelo y sin ninguna
  referencia a `wallSide2` en el render; suelos deterministas; overlays de salas,
  huecos y apariciones; toggle `showDoors` observable; métricas completas;
  decisión A/B/C/ninguna y JSON con semilla, parámetros, decisión y notas; modo
  `?test=1&seed=...` determinista y `window.__experiment` intacto.
- **Tests debilitados:** ninguno. Se pasa de 120 a 143 tests unitarios y de 10 a
  11 E2E; no hay `.skip`, `.only` ni `.todo`, y los specs existentes tienen diff
  vacío. Los unitarios cubren 3 semillas por variante, BFS de conectividad,
  salas, pasillos de 1 tile, bucles, huecos, apariciones y regla de muros.
- **Capturas revisadas:** A/B/C con la semilla `20261107`, semilla alternativa
  `12345` y `showDoors` desactivado. Se ven los tiles reales, los límites de
  sala, los huecos ámbar, el jugador `J` y el enemigo `E`; al desactivar
  `showDoors` desaparecen los marcadores de hueco.
- **Desviaciones:** la semilla `123` de B descarta una sala sin pasillo válido y
  normaliza a 9 salas con aviso visible; los parámetros extremos
  (`12/6/8/40`) normalizan a 7-10 salas con aviso `Ajuste`; C es mucho más densa
  (59 % de suelo y 103 callejones) y no se ha suavizado; el canvas lógico es
  512×512 (~10 px CSS por tile en tres columnas) y B puede superar 100 ms en
  Node con alguna semilla. Todo está documentado en el informe.
- **Pendiente:** playtest de `human:simon`, decisión de variante y actualización
  posterior de `REQ-003` a v2. Nada de esto lo decide el `task-lead`.

# Restricciones

- Una pregunta por experimento: qué generador elegir. No mezclar la decisión de
  muros ni la de puertas.
- El experimento es desechable: no se importa desde producción ni se promociona
  automáticamente.
- No tocar `docs/requirements/REQ-003` ni tomar la decisión creativa.
- No añadir dependencias nuevas.
- Mantener el estilo y la estructura del shell de `EXP-000`.

# No objetivos

- Implementar la generación en `src/game/`.
- Puertas abiertas/cerradas, escaleras, varios niveles, enemigos adicionales,
  niebla de guerra o minimapa.
- Ajustar el HUD, el encuadre o la cámara de producción.
- Elegir la variante ganadora.

# Notas

- La variante C puede ser la más costosa; si no aporta una diferencia clara,
  documentarlo y dejar que el usuario decida con A y B.
- Si una variante no puede cumplir los rangos de sala con 32×32, mostrar la
  limitación en las métricas y en el informe; no falsear los datos.

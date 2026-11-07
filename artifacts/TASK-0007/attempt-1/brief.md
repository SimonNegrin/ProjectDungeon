---
type: Task Brief
title: "Brief — TASK-0007: experimento comparativo de generadores de mazmorra"
description: Brief del intento 1 para construir EXP-001 con tres generadores, render 32rogues, métricas, decisión y E2E.
task: TASK-0007
attempt: 1
status: stable
branch: task/TASK-0007
created_at: 2026-11-07T18:05:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T18:05:00Z }
---

# Objetivo

Construir `EXP-001` en `experiments/EXP-001-generador-mazmorra/` usando el shell
compartido de `experiments/_shell/`. El experimento compara tres generadores con
la misma semilla y los mismos parámetros, renderiza un mapa de 32×32 con los
tiles reales de 32rogues, marca huecos de puerta y puntos de aparición, muestra
métricas comparables y exporta una decisión.

El resultado **no se promociona a `src/`** y **no elige variante ganadora**. El
experimento queda listo para que `human:simon` lo pruebe y decida. La decisión
creativa y la actualización de `REQ-003` a v2 no son parte de esta tarea.

# Contexto mínimo

- Rama de trabajo: `task/TASK-0007`, creada desde `main` con el commit de
  preparación `8867f52` (REQ-003 v1, EXP-001 propuesto, TASK-0007, índices, log y
  scope). No reescribas ni reviertas ese commit.
- Requisito aprobado: `docs/requirements/REQ-003-generacion-mapa.md` (v1,
  aprobada por `human:simon`). No lo modifiques.
- Experimento: `experiments/EXP-001-generador-mazmorra/experiment.md`. No tomes
  la decisión ni cambies sus parámetros o pregunta.
- Shell y ejemplo: `docs/harness/experiments.md`, `experiments/_shell/` y
  `experiments/EXP-000-shell-demo/`. Mantén el estilo y la estructura de
  `EXP-000`.
- Arte: `public/assets/32rogues/tiles.png` y los recortes de
  `src/host/assets.ts` (`TILE_RECTS`, `ASSET_URLS`, `loadImage`). Puedes
  importarlos en modo solo lectura; no modifiques `src/`.
- La regla de muros ya está decidida y no se rediscute: `wallSide1` solo en un
  muro con suelo transitable al sur; `wallTop` en el resto; `wallSide2` nunca se
  usa.

# Criterios de aceptación

Deben cumplirse todos los de `docs/tasks/TASK-0007-experimento-generador-mazmorra.md`.
Resumen operativo:

1. La página `/experiments/EXP-001-generador-mazmorra/` carga, aparece en
   `experiments/manifest.ts` y en `experiments/index.md`.
2. Tres variantes A/B/C —BSP, salas+pasillos e híbrido— reciben la misma semilla
   y parámetros y se regeneran a la vez.
3. La semilla se edita y regenera; `Reiniciar` vuelve a los valores y la semilla
   inicial.
4. Parámetros exactos: `roomTarget` 8-12 (default 10), `roomMin` 3-6 (default 3),
   `roomMax` 8-11 (default 11), `loopRatio` 0-40 % paso 5 (default 20),
   `showDoors` toggle (default true). Mapa fijo 32×32.
5. Con los valores por defecto, las tres variantes producen mapas conexos de
   8-12 salas, pasillos de 1 tile, 1-3 bucles y huecos de puerta. Si una
   combinación es imposible, se normaliza y aparece un aviso visible; la página
   nunca se rompe.
6. Render con los tiles reales: `wallSide1` solo con suelo al sur, `wallTop` en
   el resto, `wallSide2` jamás; suelo determinista con `floor1`/`floor2`/`floor3`.
7. Overlays legibles: límites de sala, huecos de puerta (según `showDoors`) y
   puntos de aparición de jugador y enemigo.
8. Métricas por variante: salas, área mínima/mediana/máxima, porcentaje de suelo,
   pasillos, esquinas, callejones, bucles, huecos, conectividad, distancia de
   camino jugador→enemigo y tiempo de generación.
9. Panel de decisión con A, B, C y `ninguna`; el JSON exportado incluye semilla,
   parámetros, decisión y notas.
10. `?test=1&seed=...` es determinista y `window.__experiment` expone parámetros,
    semilla, métricas y decisión (el shell ya lo hace; no lo rompas).
11. E2E nuevo `tests/e2e/experiment-generator.spec.ts`: carga, tres canvases,
    cambio de semilla con métricas distintas, exportación de decisión y captura.
12. `pnpm run verify` y `pnpm run test:e2e` pasan sin borrar, saltar ni debilitar
    tests existentes.
13. Sin cambios en `src/`, `index.html`, `public/`, `package.json`,
    `pnpm-lock.yaml`, `playwright.config.ts` ni en los specs E2E existentes. Solo
    `experiments/`, `tests/e2e/`, `artifacts/` y, si hace falta, `docs/tasks/`.

# Archivos y estructura previstos

```text
experiments/EXP-001-generador-mazmorra/
  index.html
  src/main.ts          # definición ExperimentDefinition + mountExperiment
  src/dungeon.ts       # tipos, PRNG local, generadores A/B/C, validadores, métricas
  src/render.ts        # render Canvas 2D con tiles 32rogues, overlays y wallTileFor
  src/dungeon.test.ts  # unitarios deterministas y validadores
  src/variants.test.ts # integración sin DOM: tres variantes, misma semilla y métricas
  src/experiment.css   # opcional, solo overrides locales de legibilidad
experiments/manifest.ts
tests/e2e/experiment-generator.spec.ts
```

Puedes agrupar módulos si mantiene el código claro, pero **separa generación
pura de DOM/Canvas** para poder testear en Vitest sin jsdom. No importes el shell
desde los módulos puros.

## Contrato técnico

- `createDungeon(variant, seed, options)` debe ser puro y determinista: sin
  `Math.random`, `Date.now` ni `performance.now` dentro de la generación. Usa un
  PRNG local sembrado (puedes reutilizar `mulberry32` de `_shell/rng.ts`).
- Tipos serializables: rejilla, `rooms` (id, bounds, accesos), `doors`
  (x, y, orientación), `spawns` (player, enemy), `corridors`, `loops`, `warnings`.
- Variante A (BSP): partición recursiva, salas en hojas, conexión de hermanos con
  pasillos L/Z y bucles extra.
- Variante B: salas rectangulares colocadas sin solape y con al menos 1 tile de
  separación, árbol de expansión (Prim/Kruskal) y pasillos L/Z, más bucles.
- Variante C: colocación de salas como B + relleno laberíntico determinista en el
  espacio libre + conexión de salas y bucles. Si C no aporta diferencia clara,
  documéntalo; no falsees métricas.
- `loopRatio` traduce a conexiones extra sobre el árbol: con 10 salas y 20 %
  deben salir 1-3 bucles. A 0 % puede haber 0; no lo ocultes.
- Pasillos ortogonales de 1 tile, sin diagonales. Intenta no ensanchar a 2 tiles;
  si una conexión extra lo provoca, descártala o re-rutéala y regístralo.
- Normalización: si la combinación no cabe en 32×32, reduce el objetivo efectivo
  de salas o el tamaño máximo, mantén la página viva y expón el ajuste en un
  `warning` visible (por ejemplo, una métrica «Ajuste» con el texto). No cambies
  los valores del panel; normaliza internamente.
- Jugador en una sala con salida; enemigo en la sala más lejana por BFS, nunca la
  misma. Ambos sobre suelo y fuera de un hueco de puerta. Reporta la distancia de
  camino; con los valores por defecto intenta ≥12, pero no falsees si una semilla
  no lo alcanza.
- Huecos de puerta: tile de suelo en el paso sala↔pasillo, con muro a ambos lados
  perpendiculares al paso y sin estar en esquina; guarda orientación
  `horizontal`/`vertical`. No se renderizan puertas ni bloquean el paso.
- Tiles de suelo deterministas por celda y semilla: elige entre `floor1`,
  `floor2`, `floor3` con un hash estable, sin RNG de render.
- `wallTileFor(grid, x, y)` puro: `wallSide1` solo si el sur es suelo; `wallTop`
  en el resto; nunca `wallSide2`. Renderer consume el resultado.
- Canvas: `stageSize` 512×512 (o 480×480 si la legibilidad lo justifica), tiles
  de 32 px escalados sin suavizado (`imageSmoothingEnabled = false`). Precarga
  `tiles.png` antes de montar para que test mode y capturas muestren arte real.
  Si quieres etapas más anchas, añade CSS local; **no edites
  `experiments/_shell/styles.css`**.
- Overlays legibles sobre el render: rectángulos de sala, marca de huecos solo si
  `showDoors`, y marcadores distintos para jugador y enemigo. Expón el estado del
  toggle de forma observable (por ejemplo `canvas.dataset.showDoors`) para el
  E2E, sin alterar la API del shell.
- Métricas en español y con valores estables. Incluye además una «Huella»
  determinista (checksum de rejilla+salas) para que el E2E pueda comprobar que la
  semilla cambia el mapa sin comparar píxeles.
- Tiempo de generación medido **fuera** de la función pura, con
  `performance.now()` alrededor de la llamada, y mostrado en ms con un decimal.
- Sin dependencias nuevas.

## Tests

- `src/dungeon.test.ts` (Vitest, Node, sin jsdom):
  - determinismo: dos llamadas con misma semilla/opciones son profundamente
    iguales; semillas distintas cambian la huella;
  - al menos 3 semillas por variante (por ejemplo 1, 123, 20261107);
  - conectividad BFS del 100 % del suelo alcanzable desde el jugador;
  - recuento de salas y tamaños dentro de rango; sin solapes y con separación;
  - pasillos de 1 tile, esquinas L/Z, longitud de tramo recto, bucles
    (conexiones extra sobre n-1) y callejones;
  - huecos con muros perpendiculares correctos y sin esquina;
  - apariciones en salas distintas, sobre suelo y fuera de huecos;
  - regla de muros por tabla, incluido que `wallSide2` nunca aparece.
- `src/variants.test.ts` (integración sin DOM): las tres variantes con la misma
  semilla y parámetros generan estado y métricas no vacías, sin animación, y la
  huella de cada variante es estable.
- E2E `tests/e2e/experiment-generator.spec.ts`:
  - `goto('/experiments/EXP-001-generador-mazmorra/?test=1&seed=20261107')` y
    espera a `window.__experiment`;
  - tres canvases visibles (`canvas-bsp`, `canvas-random`, `canvas-hybrid` o IDs
    equivalentes documentados) y tres contenedores de métricas con los textos
    clave;
  - mismo `seed` en el snapshot y 3 variantes;
  - cambia la semilla por la UI (input + evento `change`) y comprueba que la
    huella/métricas cambian y que la nueva semilla se refleja en el snapshot;
  - alterna `showDoors` y comprueba el cambio observable del overlay;
  - selecciona `variant-a` (o el valor acordado), escribe notas y comprueba
    `window.__experiment.getDecision()` con semilla, parámetros, decisión y notas;
  - prueba una combinación extrema (por ejemplo `roomTarget=12`,
    `roomMin=6`, `roomMax=8`, `loopRatio=40`) y verifica que la página sigue
    viva, las tres variantes renderizan y hay aviso de normalización si aplica;
  - guarda capturas en `artifacts/TASK-0007/attempt-1/screenshots/` con viewport
    amplio (por ejemplo 1600×1200, `fullPage: true`): A/B/C con la misma semilla,
    semilla alternativa y `showDoors` desactivado;
  - adjunta las capturas al test con `testInfo.attach` como en `EXP-000`.
- No uses diffs de píxeles a pantalla completa ni esperas por tiempo real. Usa
  esperas por estado y `window.__experiment`.

# Comandos y timeouts

Ejecuta desde la raíz, con timeout explícito y sin dejar procesos vivos:

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración nuevos y existentes |
| `pnpm run build` | 120 s | Typecheck y build con la página nueva |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 300 s | Spec nuevo y regresiones E2E |

Playwright usa su `webServer` en el puerto 4173; no levantes servidores manuales
salvo que necesites diagnosticar, y ciérralos. No ejecutes comandos en paralelo
que compartan el puerto 4173.

# Restricciones y no objetivos

- No cambies requisitos, criterios, parámetros ni el alcance. No toques
  `REQ-003`, no rellenes la decisión de `EXP-001` y no marques variante ganadora.
- No escribas en `src/`, `index.html` ni `public/`. No añadas dependencias ni
  toques el lockfile.
- No modifiques `experiments/_shell/` ni los specs E2E existentes. Si un cambio
  del shell fuera imprescindible, para y escala con evidencia.
- No promociones código a producción ni crees tareas nuevas.
- Nada de puertas abiertas/cerradas, escaleras, niveles, niebla, minimapa,
  enemigos adicionales ni arte nuevo.
- No falsees métricas para que una variante parezca mejor.

# Artefactos y qué debes devolver

Crea y deja:

```text
artifacts/TASK-0007/attempt-1/
  report.md                 # frontmatter OKF + informe
  test-output.txt           # salida de test/verify/e2e
  screenshots/
    variant-a-seed-20261107.png
    variant-b-seed-20261107.png
    variant-c-seed-20261107.png
    alternative-seed.png
    doors-off.png
  logs/                     # opcional
```

`report.md` debe incluir: estado (`implemented`, `blocked` o `partial`), rama,
commit SHA, archivos cambiados, decisiones técnicas, comandos ejecutados con
timeout y resultado, criterios de aceptación uno a uno, métricas resumidas de
A/B/C con la semilla de referencia, desviaciones, limitaciones conocidas
(especialmente si C no cumple algún rango) y qué debe revisar el usuario. No
declares la tarea terminada: eso lo hace `task-lead`.

Al terminar, devuelve un resumen breve con: estado, commit SHA, comandos y
resultados, rutas de artefactos, desviaciones y cualquier bloqueo.

# Notas de verificación para el lead

- Se comprobará el diff completo y que no haya cambios fuera de alcance.
- Se re-ejecutarán `pnpm run verify` y `pnpm run test:e2e` con timeout.
- Se revisarán las capturas y que los tiles reales se vean (no un fallback).
- Se comprobará que no hay `.skip`, `.only`, tests borrados o debilitados.
- Se comprobará que `wallSide2` no aparece en el render ni en el código de
  selección de tile.

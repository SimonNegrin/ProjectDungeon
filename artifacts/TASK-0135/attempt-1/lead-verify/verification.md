---
type: Verification
title: "TASK-0135: verificación independiente del intento 1"
description: Render de cadáveres desde contenedores, beat de muerte y pila por contenedor.
task: TASK-0135
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:31:18Z }
---

# Resultado

`done`. Intento 1 con una corrección de visibilidad por contenedor. Código final
`0ea6c4d`; evidencia del runner `d049316`/`533499d`. El primer informe dejaba
un problema conocido en la pila cuando dos contenedores compartían tile y uno
seguía en su beat; se devolvió al runner con la hipótesis de filtrar por
contenedor antes de agrupar. La regresión nueva lo cubre.

# Diff revisado

14 archivos, todos dentro de alcance: `src/host/renderer.ts`, los dos tests
unitarios previstos, el spec E2E acotado, la ficha y artefactos. No se tocaron
`src/game/**`, panel de inventario, arte, `package.json`, `pnpm-lock.yaml`,
`docs/requirements/**`, `docs/harness/**` ni plantillas. Sin tests borrados,
saltados o debilitados: el test existente de cadáver pasa a construir el
contenedor y conserva su intención de orden de capas y rejilla intacta.

# Reejecución

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/presentation-feedback.test.ts` | 96/96 | `targeted-tests.txt` |
| `pnpm run test:e2e tests/e2e/corpse-containers-render-qa.spec.ts` | 1/1 | `e2e-output.txt` |
| `pnpm run verify` | 102 archivos/1548 tests, docs:check, config:check, tsc, build y bundle OK | `verify-output.txt` |

El E2E se ejecutó con `E2E_ARTIFACTS_DIR=artifacts/TASK-0135/attempt-1/lead-verify`;
las capturas del lead están bajo
`lead-verify/corpse-containers-render-qa/screenshots/`. No quedaron servidores
ni procesos en background.

# Criterios

- Contenedores `kind: 'corpse'`: `corpseMarks` filtra antes de agrupar; una
  unidad muerta sin contenedor no produce decal.
- Beat de muerte: `corpseContainerVisible` usa `dyingUnitIds` y `effects`; la
  regresión cubre un cadáver visible más otro contenedor en su beat y demuestra
  que no aparece `×2` hasta terminar.
- Jugador vacío: se dibuja desde su contenedor aunque `items` esté vacío; el de
  enemigo deja de dibujarse cuando el motor retira el contenedor.
- Pila: un decal por tile y contador `×N` solo con `count > 1`; la captura
  `mapa-dos-cadaveres.png` muestra `×2` y la línea base sin contenedores no.
- Arte: se reutiliza `corpseRectFor` y `corpse-22a/b`; no hay sprites nuevos.
- Tests de mapeo, retirada, beat, pila, no mutación y capas; `verify` pasa.

# Observaciones

- El panel de inventario sigue leyendo unidades muertas; su cambio a contenedores
  y el saqueo son TASK-0136, fuera de esta ficha. El render ya no usa esa fuente.
- La captura elegida comparte tile con una puerta/decoration del mapa, pero el
  contador `×2` y el decal se distinguen; el E2E además compara el canvas con y
  sin contenedores y con la unidad muerta huérfana retirada.
- No se publicó `origin/main`; el trabajo queda en `main` local.

---
type: Task Verification
title: "TASK-0068: verificación independiente del intento 1"
description: Re-ejecución de verify/E2E, revisión del diff y de las capturas del banco de ajuste.
task: TASK-0068
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T23:55:00Z }
---

# Alcance revisado

- Rama `task/TASK-0068`, commits `4ca8f67` (tarea lista), `29ebd79` (spec E2E)
  y `c8475b8` (informe).
- Diff completo `main...HEAD`: solo `tests/e2e/experiment-bench.spec.ts`, la
  ficha/índice de tarea y `artifacts/TASK-0068/attempt-1/`.
- Sin cambios en `src/`, `tests/` de producción, `index.html`, `public/`,
  `experiments/`, reglas, motor ni valores base. Los 4 tests de
  `experiment-combat.spec.ts` siguen intactos.

# Comandos re-ejecutados

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | docs/config OK, 945/945 tests, build y bundle OK | `verify-rerun-lead.txt` |
| `pnpm run test:e2e tests/e2e/experiment-bench.spec.ts tests/e2e/experiment-combat.spec.ts` | 11/11 OK | `e2e-rerun-lead.txt` |
| `pnpm run test:e2e` | 105/105 OK | `e2e-full-rerun-lead.txt` |

`docs:check` mantiene el aviso de handoff de 2991 B para el brief (objetivo
2560 B, tope duro 4096 B); no falla y es coherente con tareas anteriores.

# Criterios

- [x] Editar PV de un enemigo: 4 filas afectadas, 8 intactas, editor y foco
      conservados. Cubierto por el test de PV y por la API.
- [x] Objetivo editable: delta y 4-de-4 cambian; objetivo 100 deja 4/4 dentro y
      el reset a la guía restaura delta y estado.
- [x] Arma global: daño de espada recalcula exactamente las 6 filas de Guerrero
      y Centinela; las otras 6 no cambian; usuarios listados y reset.
- [x] Reset por enemigo y global: medición base, overrides vacíos, objetivos de
      guía y export sin overrides.
- [x] Export: catálogo ajustado, objetivos, diagnóstico, `overridesId`
      determinista; dos lecturas y descarga idénticas; sin `decidedAt`.
- [x] QA visual 1280×720 y 900×700: sin desbordamiento del documento, paneles
      dentro del viewport, scroll interno de tabla permitido, dentro/fuera por
      texto y foco de teclado con outline de 2 px.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan; capturas y salidas en
      `artifacts/TASK-0068/attempt-1/`.
- [x] Sin cambios fuera del alcance; no se han debilitado tests.

# Capturas revisadas

`artifacts/TASK-0068/attempt-1/experiment-bench/screenshots/`:
`qa-1280x720-editor.png`, `qa-1280x720-editor-campo.png`,
`qa-1280x720-armas.png`, `qa-1280x720-foco.png` y las cuatro de 900×700,
además de `enemigo-pv-editor-abierto.png`, `objetivo-4-de-4-restaurado.png`,
`export-ajustado.png`, `reset-global-base.png`. Se ven tabla, editor, armas,
diagnóstico, export y foco. Las capturas de 900 muestran el recorte por scroll
interno, sin desbordamiento de la página.

# Observaciones de usabilidad

- La tabla de 18 columnas y el editor comparten el scroll horizontal de
  `.table-scroll`. A 1280 el contenido del editor mide ~1658 px dentro de un
  contenedor de ~1144 px; todos los campos son legibles y accesibles, pero
  requieren desplazamiento horizontal para ver PV/armadura o los campos de la
  derecha según la posición del scroll. No hay desbordamiento del documento.
- La tabla de armas también usa scroll interno a 900; no rompe el layout.

# Fricción

La discrepancia brief/`benchFileName` sobre el nombre del export base se
considera `accepted`: el nombre histórico v2.0 sin overrides es el
comportamiento acordado en TASK-0067 y el test fija lo real; no se cambia el
motor ni la UI para satisfacer el brief.

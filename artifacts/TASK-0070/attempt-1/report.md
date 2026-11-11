---
type: Task Report
title: "TASK-0070: informe del intento 1"
description: Tres tablas inline de EXP-003 con edición, agrupación y recálculo quirúrgico.
task: TASK-0070
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:10:00Z }
artifacts: artifacts/TASK-0070/attempt-1/
verified:
---

# Estado

`success`. UI de tres tablas, helpers y tests implementados; `verify` verde en la
segunda ejecución.

# Cambios

- **Archivos:** `experiments/EXP-003-mesa-combate/src/main.ts`,
  `bench-ui.ts`, `experiment.css`, `tables.test.ts`.
- **Tabla de combates:** 15 columnas exactas; 3 bloques de 4 filas con `rowspan`
  en Enemigo, `% objetivo` y los 9 stats compartidos; un input/select por stat;
  `% real` con delta y dentro/fuera; 4-de-4 y avisos en la celda del enemigo.
- **Foco:** al enfocar un stat se resaltan las 4 filas; el input conserva foco y
  valor porque el recálculo actualiza en sitio y omite el elemento activo.
- **Tablas 2 y 3:** armas (Arma, Acierto, Daño) con unidades bajo el nombre;
  héroes (11 columnas) con arma inicial «sin arma», armadura/escudo «sin …» y
  nivel de magia.
- **Detalle:** conserva acciones, hechizos, maná, PV, réplicas y duración; añade
  banda, TTK, turnos/rondas, daño y victorias/empates.
- **Resets:** por tabla y global; se eliminan editor expandible, tabla de 18
  columnas, resets por campo y tablas duplicadas. `window.__experiment` se
  mantiene.
- **Tests:** helpers de columnas, agrupación, formato, resets y estado; 14 tests
  nuevos sin jsdom.
- **Commit SHA de código:** `8817540` (`feat(TASK-0070): tres tablas inline a
  ancho completo`). Helpers/tests: `d57af23`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run test` | 72 archivos, 973 tests OK | `test-output.txt` |
| `pnpm run verify` | docs, config, 973 tests, tsc, vite y bundle OK | `verify-output.txt` |
| `pnpm run build:experiments` | build de EXP-003 y resto OK | `logs/build-experiments.txt` |
| vitest focalizado | 3 archivos, 69 tests OK | salida en sesión |

# Evidencia visual

- No se genera captura: corresponde a [TASK-0071](../../../docs/tasks/TASK-0071-exp-003-tres-tablas-e2e.md).
- Qué debe mirar el usuario en 0071: tres tablas a ancho completo, `rowspan` del
  enemigo, foco estable, 4/4 con héroe fuera, scroll interno a 900 px y detalle
  al seleccionar fila.

# Desviaciones

- Sin Playwright, E2E ni QA visual por alcance de esta tarea.
- El E2E existente `tests/e2e/experiment-bench.spec.ts` aún espera la UI antigua;
  no se ejecutó ni modificó. Queda para TASK-0071.

# Problemas conocidos y preguntas abiertas

- En varias ejecuciones de `pnpm run verify`, el test ajeno `EXP-004 spawn`
  (barrido de 200 semillas) agotó su timeout de 5 s bajo carga paralela. Aislado
  pasó y la última ejecución completa quedó verde; no hay cambios en ese
  experimento.
- Sin comprobación en navegador real en este intento: la estabilidad visual y el
  ancho a 1280/900 quedan cubiertos por TASK-0071.

# Fricción reutilizable

Ninguna reproducible. El timeout anterior fue transitorio y no se repitió.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3806 |
| `report_bytes` | 3283 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

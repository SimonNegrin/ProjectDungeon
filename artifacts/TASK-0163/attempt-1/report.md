---
type: Task Report
title: "TASK-0163: informe de ejecución"
description: "Filtro E2E_ARTIFACTS_SPECS para limitar capturas, JSON y logs a los specs de la tarea."
task: TASK-0163
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T13:04:59Z }
artifacts: artifacts/TASK-0163/attempt-1/
verified:
---

# Estado

`success`. Criterios 1–4 y 6 cubiertos; el 5 (docs) lo cierra `game-lead`.

# Cambios

- `tests/e2e/artifacts.ts`: `E2E_ARTIFACTS_SPECS` (comas, espacios recortados,
  vacías ignoradas). Con filtro y spec fuera de la lista devuelve
  `testInfo.outputPath(...)`, sin crear nada bajo `E2E_ARTIFACTS_DIR`; sin
  variable o vacía, ruta idéntica a antes. Variables leídas por llamada.
- `tests/unit/artifacts-helper.test.ts`: sin variable, lista vacía, un spec,
  varios con espacios, guiones y acentos, desconocido, repetición y lectura por
  llamada.
- Commit: `3deb76c`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run tests/unit/artifacts-helper.test.ts` | 14/14 (131 ms) | corrida directa; entra en `verify` |
| `E2E_ARTIFACTS_DIR=…/e2e E2E_ARTIFACTS_SPECS=inventory pnpm run test:e2e` | 282/282 (2.0 m) | `e2e-output.txt` |
| `pnpm run verify` | OK: 759 docs, 112 archivos/1803 tests, build y bundle | `verify-output.txt` |

# Evidencia visual

- `e2e-rutas.txt`: bajo `attempt-1/e2e` solo hay `inventory/` y
  `inventory/screenshots/` (3 directorios, 9 archivos); ninguna carpeta de otro
  spec.
- La suite ejecutó specs ajenos (`game-render`, `floor-qa`, etc.) y sus
  artefactos cayeron en `test-results/` (245 carpetas), que Playwright limpia
  por corrida.

# Desviaciones

- Al empezar, `docs/harness/visual-qa.md` ya tenía un cambio sin commitear
  (párrafo de `E2E_ARTIFACTS_SPECS`). No lo edité ni lo incluí en el commit.
- El commit de código no incluye `artifacts/`; la evidencia va en otro commit.

# Problemas conocidos y preguntas abiertas

- La comparación es exacta con el nombre del subdirectorio (`inventory`,
  `hotseat-flow-qa`): `Inventory` no coincide y ese spec no deja artefactos.
  Coherente con la ficha y `visual-qa.md`; tolerarla sería otra tarea.
- Un nombre desconocido no avisa: la corrida pasa sin artefactos para él.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El árbol ya tiene ediciones del lead en `docs/` al lanzar el runner | `git status` inicial: ` M docs/harness/visual-qa.md` | `git add` de rutas concretas | Se repite en cada cierre o reintento | El lead commitea docs antes de lanzar, o el handoff declara rutas sucias | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | `none` (primer intento) |
| `report_bytes` | 2933 |
| `overflow` | `none` |
| `criteria_failed` | `0` (criterio 5 pendiente de `game-lead`) |

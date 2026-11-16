---
type: Task
id: TASK-0163
title: "Arnés: artefactos E2E filtrados por spec"
description: "Permitir que una corrida de la suite con E2E_ARTIFACTS_DIR limite capturas, JSON y logs a los specs de la tarea, sin escribir los del resto."
status: draft
task_status: done
task_type: test
requirement: HARNESS
requirement_ids: []
depends_on: []
unlocks: []
created_at: 2026-11-16T10:40:00Z
completed_at: 2026-11-16T13:10:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0163/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T10:40:00Z }
verified:
  - by: game-lead
    at: 2026-11-16T13:10:00Z
    note: >-
      Intento 1 verificado (código `3deb76c`, evidencia `e831827`). Filtro por
      spec con `E2E_ARTIFACTS_SPECS`; la suite completa deja solo `inventory/`
      bajo el directorio de artefactos y el resto en `test-results/`. 14 pruebas
      del helper, 282 E2E y 1803 tests en `verify`. La documentación se landó en
      `harness/2agentes` (`ca7fcc9`) por alcance de tipo de tarea. Detalle en
      `attempt-1/lead-verify/verification.md`.
---

# Objetivo

Que una tarea que necesita la suite completa con capturas escriba solo las de sus
specs en `E2E_ARTIFACTS_DIR`, sin llenar la evidencia con las capturas de los otros
specs.

# Contexto

Fricción medida en el piloto de [ADR-031](../decisions/ADR-031-arnes-dos-agentes.md):
`E2E_ARTIFACTS_DIR` con la suite completa escribió 48 MB y 603 archivos en
TASK-0162 y TASK-0154, casi todos de specs ajenos; hubo que podar y relanzar. El
helper es `tests/e2e/artifacts.ts` (`artifactPath`), documentado en
[visual-qa](../harness/visual-qa.md).

# Criterios de aceptación

- [x] Nueva variable `E2E_ARTIFACTS_SPECS`: lista separada por comas de nombres de
      spec (`inventory`, `hotseat-flow-qa`) que limita los artefactos a esos
      specs; sin la variable, o vacía, el comportamiento actual no cambia.
- [x] Los specs fuera de la lista no crean nada bajo `E2E_ARTIFACTS_DIR`: sus
      rutas caen en `testInfo.outputPath`, que Playwright limpia por ejecución, y
      no dejan carpetas vacías del resto.
- [x] La coincidencia usa el mismo nombre normalizado que el subdirectorio
      (`segment(basename(file, '.spec.ts'))`); un nombre desconocido no rompe la
      suite ni hace fallar a los demás.
- [x] Hay prueba del helper para: sin variable, lista vacía, un spec, varios y
      nombre con guiones; sin depender de estado del módulo.
- [x] `docs/harness/visual-qa.md` documenta la variable y su uso por tarea; lo
      redacta `game-lead` en el cierre del mismo intento.
- [x] `pnpm run test:e2e` y `pnpm run verify` pasan; no se debilitan tests
      existentes y `src/`, `index.html` y `experiments/` quedan intactos.

# Plan de test

- Unitario: `tests/unit/artifacts-helper.test.ts` con los casos del criterio 4.
- Integración: `E2E_ARTIFACTS_DIR=artifacts/TASK-0163/attempt-1/e2e
  E2E_ARTIFACTS_SPECS=inventory` sobre la suite completa; comprobar que solo
  aparece `e2e/inventory/` y ninguna carpeta de otro spec.
- Regresión: `pnpm run test:e2e` y `pnpm run verify`.
- E2E / visual: no; la evidencia es la estructura de rutas.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0163/attempt-1/report.md`
- [x] Salida de `pnpm run verify`, `test:e2e` y del listado de rutas del filtro
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/artifacts-helper.test.ts` | 120 s |
| `pnpm run test:e2e` | 300 s |
| `pnpm run verify` | 300 s |
| `pnpm run docs:check` | 60 s |

# Restricciones

- Solo `tests/e2e/artifacts.ts`, sus pruebas y `docs/harness/visual-qa.md`.
- Sin cambios de juego, presentación, dependencias ni CI.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Cambiar el esquema de rutas de capturas o el sufijo de repetición.
- Filtros por test, globs o expresiones regulares.
- Cambiar el gate de `verify:task` ni el flujo de evidencia.

---
type: Task
id: TASK-0062
title: "Arnés: sufijo de repetición en capturas E2E"
description: "Evitar que --repeat-each sobrescriba capturas, JSON y logs usando el índice real de repetición; prueba del helper y documentación actualizada."
status: draft
task_status: ready
task_type: harness
requirement: HARNESS
requirement_ids: []
depends_on: []
unlocks: []
created_at: 2026-11-10T21:37:55Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0062/
priority: P2
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T21:37:55Z }
verified:
---

# Objetivo

Que una ejecución con `--repeat-each=N` deje cada pasada en una ruta distinta y
no sobrescriba las capturas, JSON o logs de las anteriores. Sin cambios en el
juego.

# Contexto

- Fricción detectada en TASK-0060 y TASK-0061: el helper
  `tests/e2e/artifacts.ts` decide el sufijo con `testInfo.project.repeatEach`,
  que no refleja el flag de CLI. Las tres pasadas escriben en
  `<spec>/screenshots/` y la última pisa a las anteriores.
- `testInfo.repeatEachIndex` sí identifica la pasada real. La solución puede
  usar ese índice, una variable de entorno explícita o una combinación; debe
  distinguir una corrida única de una repetida sin romper la evidencia histórica.
- `docs/harness/visual-qa.md` documenta hoy la limitación y el workaround manual;
  al cerrar la tarea debe describir el comportamiento real.
- TASK-0020 creó el helper y su contrato de rutas; esta tarea lo corrige, no lo
  rediseña.

# Criterios de aceptación

- [ ] `artifactPath` produce rutas distintas para cada pasada de
      `--repeat-each`; ninguna captura, JSON o log se sobrescribe.
- [ ] Una corrida única conserva el esquema de rutas documentado, o el cambio se
      documenta y se actualizan las referencias afectadas.
- [ ] Con `--repeat-each=3` y `E2E_ARTIFACTS_DIR`, una prueba pequeña deja tres
      salidas verificables con `find`; la carpeta de cada pasada es estable.
- [ ] Hay prueba del helper para corrida única, repetición y ausencia de
      `E2E_ARTIFACTS_DIR`; no se depende del reloj real ni de estado compartido.
- [ ] `docs/harness/visual-qa.md` describe la ruta real y elimina el workaround
      manual; `pnpm run docs:check` pasa.
- [ ] `pnpm run test:e2e` y `pnpm run verify` pasan; no se borran, saltan ni
      debilitan tests existentes.
- [ ] Solo cambian el helper, sus pruebas y documentación; `src/`, `src/game/`,
      `experiments/` y dependencias quedan intactos.

# Plan de test

- **Unitario:** `artifactPath` con `repeatEach` 1 y 3, índices 0/1/2, con y sin
  `E2E_ARTIFACTS_DIR`; comprobar que las rutas no colisionan.
- **Integración:** spec mínima con `--repeat-each=3`; listar las carpetas
  `repeat-*` o el esquema elegido y comprobar que hay tres salidas.
- **Regresión:** `pnpm run test:e2e` completo y `pnpm run verify`.
- **Visual:** no aplica; la evidencia es la estructura de rutas y la ausencia de
  sobrescritura.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0062/attempt-1/report.md`.
- [ ] Salidas de `test:e2e`, `verify` y del listado de rutas repetidas.
- [ ] Diff del helper y de `docs/harness/visual-qa.md`.
- [ ] Commit SHA en la rama `task/TASK-0062`.

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec playwright test tests/e2e/<spec>.spec.ts --repeat-each=3` | 180 s |
| `pnpm run test:e2e` | 300 s |
| `pnpm run verify` | 300 s |
| `find artifacts/TASK-0062/attempt-1 -maxdepth 3 -type d` | 15 s |
| `git diff --stat` | 15 s |

# Restricciones

- No cambiar reglas, presentación ni comportamiento del juego.
- No reescribir artefactos históricos de tareas cerradas.
- No añadir dependencias ni tocar `experiments/`.
- No debilitar la intención de los tests existentes.

# No objetivos

- Nuevas suites de feedback o de juego.
- Cambiar el esquema general de artefactos de TASK-0020.
- CI, caché de tests o paralelización.

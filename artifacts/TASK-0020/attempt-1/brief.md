---
type: Task Brief
title: "TASK-0020: brief del intento 1"
description: Parametrizar la ruta base de capturas, JSON y logs E2E con un helper único.
task: TASK-0020
attempt: 1
status: stable
brief_bytes: 3367
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T12:20:00Z }
---

# Objetivo

Un helper `artifactPath(testInfo, ...parts)` en `tests/e2e/artifacts.ts` sustituye
todas las rutas literales `artifacts/TASK-*` y `artifacts/EXP-*` de los 11 specs.
Sin `E2E_ARTIFACTS_DIR` escribe en `testInfo.outputPath(...)` (`test-results/`,
limpio por ejecución); con `E2E_ARTIFACTS_DIR`, solo bajo esa carpeta y aislado
por repetición. Nombres de archivo y comportamiento no cambian.

# No objetivos

- Cambiar aserciones, esperas, nombres o lógica de juego.
- Tocar `src/`, `index.html`, `public/`, `package.json`, `pnpm-lock.yaml` ni
  dependencias.
- Editar `docs/` (lo mantiene `requirements-writer`).
- Reorganizar, borrar o reescribir artefactos históricos.
- Añadir CI.

# Invariantes

- Firma: `artifactPath(testInfo: TestInfo, ...parts: string[]): string`; única vía
  de escritura de capturas, JSON y logs en `tests/e2e`.
- `testInfo.outputPath` es absoluta y segura.
- En `--repeat-each`, ningún worker comparte PNG/JSON/log:
  `testInfo.project.repeatEach` distingue repetición real y `repeatEachIndex` da el
  índice.
- Si una corrida explícita completa puede repetir nombres entre specs, añade un
  subdirectorio por spec/test bajo la base sin cambiar el nombre del archivo.
- El primer repeat de `motion-qa` deja de escribir en `artifacts/TASK-0019`.
- `*.log` está en `.gitignore`: versiona la traza con `git add -f`.
- Conserva los `mkdir`/`dirname` que sigan haciendo falta.

# Criterios de aceptación

Los de `docs/tasks/TASK-0020-artefactos-e2e.md#criterios-de-aceptación`,
incluidos `git status --porcelain artifacts` y `git diff --stat artifacts`
antes/después.

# Contexto mínimo

- Los 11 specs de `docs/tasks/TASK-0020-artefactos-e2e.md#contexto`.
- `tests/e2e/support.ts` no es el sitio del helper.
- `playwright.config.ts`: `fullyParallel`, Vite en 4173.
- Convención sin editar: `docs/harness/visual-qa.md#capturas-y-baselines`.
- Evidencia histórica de patrón: `artifacts/TASK-0019/attempt-1/` (intacta).
- Guard opcional: test unitario que falle si un spec contiene `artifacts/TASK-` o
  `artifacts/EXP-`; si no entra, usa `grep` y anótalo.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1 pnpm run test:e2e motion-qa` | 240 s |
| `pnpm run test:e2e --repeat-each=3` | 300 s |
| `pnpm run verify` | 180 s |
| `git status` / `git diff` | 30 s |

No uses `timeout` de GNU (no existe en macOS); usa el timeout de la herramienta.

# Artefactos

- `report.md` según `docs/templates/task-report.md` en esta carpeta.
- `test-output.txt`, `verify-output.txt`, `git-status-before.txt` y
  `git-status-after.txt`, salidas de las corridas y capturas de la explícita.
- Commit en `task/TASK-0020` con SHA en el informe.

# Riesgos y decisiones abiertas

- Documenta la estructura final de la corrida explícita (subdirectorios incluidos)
  para que el lead la verifique.
- El guard automático es opcional: si complica, queda pendiente con `grep`; no
  bloquea.

# Desbordamiento

No hay; el detalle vive en la tarea.

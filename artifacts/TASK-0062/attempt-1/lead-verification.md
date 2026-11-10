---
type: Task Verification
title: "TASK-0062: verificación independiente del intento 1"
description: Re-ejecución del lead, alcance del diff y delta pendiente en QA visual.
task: TASK-0062
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-10T21:48:00Z }
---

# Resultado

Implementación verificada; el criterio de documentación queda pendiente porque
`task-lead` no puede editar `docs/harness/**`. La tarea no se cierra.

# Evidencia re-ejecutada por el lead

| Comprobación | Resultado | Archivo |
|---|---|---|
| `pnpm run test:e2e` | 98/98 en 42,8 s | `lead-e2e-output.txt` |
| `pnpm run verify` | docs 307, config OK, 825/825 en 62 archivos, build 59 módulos, bundle OK | `lead-verify-output.txt` |
| `pnpm run docs:check` | 307 documentos, 62 tareas, 5 experimentos | `lead-docs-check-output.txt` |
| `--repeat-each=3` con `E2E_ARTIFACTS_DIR=.../lead-repeat` | 3/3; tres rutas | `lead-repeat-each-output.txt`, `lead-find-repeat.txt` |

Rutas de la repetición: `experiment-shell/shell-smoke.png`,
`experiment-shell/repeat-1/shell-smoke.png` y
`experiment-shell/repeat-2/shell-smoke.png`.

# Alcance

- Cambian solo `tests/e2e/artifacts.ts`, `tests/unit/artifacts-helper.test.ts`,
  `artifacts/TASK-0062/**` y esta ficha.
- `src/`, `src/game/`, `experiments/`, `package.json`, `pnpm-lock.yaml` y
  `playwright.config.ts` intactos; ningún test borrado.
- Artefactos históricos fuera de `TASK-0062` sin cambios.

# Delta pendiente en `docs/harness/visual-qa.md`

Sustituir en «Capturas y baselines» el párrafo que empieza «La suite escribe
solo en esa carpeta» por este texto, manteniendo el resto:

```markdown
  La suite escribe solo en esa carpeta, con subdirectorio por spec:
  `$E2E_ARTIFACTS_DIR/<spec>/screenshots/<nombre>.png`. Briefs e informes deben
  citar esa ruta real; si una captura se copia a la raíz del intento, se
  registra la ruta final y el motivo. Con `--repeat-each=N`, la pasada 0
  conserva esa ruta y las pasadas 1..N-1 añaden `repeat-<índice>`:
  `$E2E_ARTIFACTS_DIR/<spec>/repeat-1/screenshots/<nombre>.png`. El sufijo usa
  `testInfo.repeatEachIndex`, no `testInfo.project.repeatEach`, que no refleja
  el flag de CLI. No mezclar en la misma carpeta una corrida única y una
  repetida: ambas usan la ruta de la pasada 0.
```

Al aplicarlo, ejecutar `pnpm run docs:check`; después la tarea puede cerrarse
con `task_status: done`.

# Riesgos

- La pasada 0 de una repetición comparte ruta con una corrida única. No hay
  sobrescritura entre pasadas de la misma ejecución, pero una corrida única
  posterior en la misma carpeta pisa la captura de la pasada 0.
- `repeatEachIndex` no expone el total; no existe `repeat-0` explícito.

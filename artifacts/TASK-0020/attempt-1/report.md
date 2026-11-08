---
type: Task Report
title: "TASK-0020: informe de ejecución"
description: Helper único artifactPath y evidencia E2E sin reescribir el histórico.
task: TASK-0020
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:00Z }
artifacts: artifacts/TASK-0020/attempt-1/
verified:
  - by: task-lead
    at: 2026-11-08T12:20:00Z
    note: >-
      Verificación independiente en task/TASK-0020: diff limitado a
      tests/e2e/artifacts.ts y los 11 specs (solo ruta base), docs preparados por
      requirements-writer y artifacts/TASK-0020; src/, index.html, public/,
      package.json, pnpm-lock.yaml y dependencias intactos; sin tests borrados,
      saltados ni debilitados (40 E2E y 360 unitarios). Re-ejecutados por el
      lead: pnpm run test:e2e (40/40, 16.3 s),
      E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1 pnpm run test:e2e motion-qa
      (8/8, 4.7 s), pnpm run test:e2e --repeat-each=3 (120/120, 45.6 s) y
      pnpm run verify (107 documentos, 20 tareas, 3 experimentos; 360 tests en
      29 archivos; build de 53 módulos). El histórico de artifacts/ no cambia en
      ninguna corrida; las capturas explícitas quedan en
      artifacts/TASK-0020/attempt-1/motion-qa/ y arrival.png y motion-trace.log
      son byte-idénticos a TASK-0019. Fricción del grep: rechazada (el comando
      actual no tiene coincidencias; el helper usa artifacts/<TASK>/...).
---

# Estado

`success`. Suite normal 40/40, captura explícita 8/8 y repetición 120/120;
`verify` completo. El histórico de `artifacts/` no cambia en ninguna corrida.

# Cambios

- Archivos: `tests/e2e/artifacts.ts` (nuevo) y los 11 specs de `tests/e2e/`.
  Solo cambia la ruta base; mismas aserciones, esperas y nombres de archivo.
- Commits: `ff52427` (implementación), `8a06476` (evidencia) y el commit que
  añade este informe.
- Normal: `testInfo.outputPath(...)` → `test-results/`. Explícita:
  `E2E_ARTIFACTS_DIR/<spec>/...`, con `repeat-<n>/` si hay `--repeat-each`.
  Ejemplo: `artifacts/TASK-0020/attempt-1/motion-qa/{screenshots,logs}/`.
- Sin tocar `src/`, `index.html`, `public/`, `package.json`, `pnpm-lock.yaml`,
  dependencias ni `docs/`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test:e2e` | 240 s | 40/40, 19.3 s | `test-output.txt` |
| `E2E_ARTIFACTS_DIR=artifacts/TASK-0020/attempt-1 pnpm run test:e2e motion-qa` | 240 s | 8/8, 6.5 s | `test-output-explicit-motion-qa.txt` |
| `pnpm run test:e2e --repeat-each=3` | 300 s | 120/120, 44.0 s | `test-output-repeat-each.txt` |
| `pnpm run verify` | 180 s | docs, config, 360 unitarios y build OK | `verify-output.txt` |
| `grep -R -n "artifacts/\(TASK\|EXP\)-" tests/e2e` | 30 s | exit 1, sin coincidencias | `static-grep.txt` |
| `git status` / `git diff --stat artifacts` | 30 s | histórico intacto | `git-status-*.txt` |

Repetición: `test-results/` tiene tres copias aisladas de `step-intermediate.png`
y `snapshot.json` (`...-repeat1/`, `...-repeat2/` y base). La traza solo la escribe
el repeat 0, como antes.

# Evidencia visual

- `motion-qa/screenshots/arrival.png` es byte-idéntica (SHA-256 `24dba2a9…9969f9`)
  a `artifacts/TASK-0019/attempt-1/screenshots/arrival.png`; 1280×720.
- `motion-qa/logs/motion-trace.log` también idéntico (`10f1304b…bc5ee6`).
- `git status --porcelain artifacts` / `git diff --stat artifacts` solo muestran
  `artifacts/TASK-0020/` (nuevo); ningún artefacto histórico cambia.

# Desviaciones

- Ninguna funcional. No se añadió el guard automático opcional; se validó con el
  `grep` del plan de test, opción permitida por el brief.

# Problemas conocidos y preguntas abiertas

- `*.log` está ignorado: `motion-trace.log` se versionó con `git add -f`.
- `attack-after-walk.png` y `attack-damage-detail.png` varían unos bytes entre
  corridas por el fundido CSS del daño; rutas, nombres y aserciones no cambian.
- El estado limpio final de `artifacts/` se comprueba tras commitear este
  informe; antes queda el propio informe sin trackear.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El `grep` estático revisa también `tests/e2e/artifacts.ts`: un comentario con `artifacts/TASK-…` da falso positivo aunque ningún spec tenga rutas fijas. | El `grep` del plan marcó el comentario del helper durante el desarrollo. | Ejemplo redactado como `artifacts/<TASK>/attempt-N`. | Cualquier helper que documente la ruta de ejemplo rompe el criterio «sin coincidencias». | Acotar el comando a `tests/e2e/*.spec.ts` o excluir comentarios en `docs/harness/visual-qa.md`. | Trivial; sin riesgo. | `rejected`: el `grep` actual pasa sin coincidencias y el helper usa `artifacts/<TASK>/...`, así que no queda falso positivo que corregir. |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 3367 |
| `report_bytes` | 5284 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | Refactor acotado sin fallos de test ni de verificación. |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead

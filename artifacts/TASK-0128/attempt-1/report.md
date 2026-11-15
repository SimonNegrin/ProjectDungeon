---
type: Task Report
title: "TASK-0128: informe del intento 1"
description: ADR-006 y glosario hechos; alcance bloqueado por permisos.
task: TASK-0128
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:18:00Z }
artifacts: artifacts/TASK-0128/attempt-1/
verified:
---

# Estado

`blocked`. ADR-006, glosario e índice están hechos y verificados. El criterio de
alcance exige `docs/scope.md`, fuera del allowlist de `task-lead` y reservado a
`requirements-writer`; detalle y texto propuesto en `report-detalle.md`.

# Cambios

- `docs/decisions/ADR-006-arte-placeholder-32rogues.md`: tabla de 18 celdas
  `(sx, sy)`, fuente `ARCHETYPE_VARIANT_CELLS` y variante como estado.
- `docs/glossary.md`: «menú principal», «paso 1», «resumen» y «variante de
  sprite», sin etiquetas de género.
- `docs/decisions/index.md`: resumen de ADR-006.
- `docs/tasks/TASK-0128-*.md`: `in_progress`, intento 1.
- Commit SHA: `2c6ee63`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | pasa; 633 documentos, 159 tareas | `docs-check-output.txt` |
| `pnpm run verify` | pasa; 99/1471 tests, `tsc`, build y bundle | `verify-output.txt` |

# Evidencia visual

No aplica: tarea documental sin UI.

# Desviaciones

- Sin brief: tarea `docs` ejecutada por el lead, sin `task-runner`.
- `docs/scope.md` no se editó: `Permission denied`; el allowlist y el rol
  reservan alcance a `requirements-writer`.

# Problemas conocidos y preguntas abiertas

- Pendiente: alcance con arranque, 1-6 jugadores y sin persistencia de
  configuraciones. Dueño: `requirements-writer`.
- `docs/requirements/**` intacto para TASK-0156.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| TASK-0128 mezcla destinos: restricción sin `docs/scope.md`, criterio que lo exige y TASK-0156 que lo prohíbe | Edición denegada | Hecho lo del lead; alcance elevado | Una tarea `docs` debe tener un solo dueño | Mover alcance a `requirements-writer` o a TASK-0156 | Bajo | `elevada a requirements-writer` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin runner) |
| `report_bytes` | 2337 |
| `overflow` | `report-detalle` |
| `criteria_failed` | 1 |

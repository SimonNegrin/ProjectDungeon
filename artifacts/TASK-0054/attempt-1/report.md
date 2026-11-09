---
type: Task Report
title: "TASK-0054: informe de ejecución"
description: HUD y F1 con atributos nuevos; ADR-015 aplicado y diseño/glosario pendientes.
task: TASK-0054
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T23:55:00Z }
artifacts: artifacts/TASK-0054/attempt-1/
verified:
---

# Estado

`blocked`: HUD y `F1` funcionan, pero `task-runner` no puede editar `docs/`
(permiso denegado) y `task-lead` tampoco `docs/design/` ni el glosario. La
propuesta documental está lista en `docs-proposal/`.

Actualización del lead: `docs/decisions/ADR-015-atributos-inherentes-absorcion.md`
y el enlace de `docs/decisions/index.md` ya están aplicados y verificados con
`docs:check`, `verify` y E2E. Solo quedan `turn-economy`, glosario y arquitectura
para `requirements-writer`.

# Cambios

- `src/host/hud.ts`: `HudModel.stats` sustituye a `modifiers`; testid
  `hud-stats`, etiqueta `Atributos` y valor con habilidad, fuerza, defensa y
  resistencia. `F1` usa `Atributos` y las tiradas `golpe`/`absorción`.
- Tests unitarios y E2E de HUD/combate: solo expectativas y helpers; ningún test
  borrado, saltado o debilitado.
- `docs-proposal/`: contenido exacto para turn-economy, glosario y arquitectura.
- `docs/decisions/ADR-015-atributos-inherentes-absorcion.md` y su línea en
  `docs/decisions/index.md` (aplicados por el lead).
- Commit de implementación: `d8e3876`. Sin cambios de fórmulas, balance,
  `experiments/`, `index.html`, `public/` ni dependencias.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK, 263 documentos | `docs-check-output.txt` |
| `pnpm run verify` | OK, 740 tests; build y bundle OK | `verify-output.txt` |
| E2E `equipment-hud-qa.spec.ts` | 2/2 | `e2e-hud-output.txt` |
| E2E `combat-equipment-qa.spec.ts -g "impacto, vida bajo cursor"` | 1/1 | `e2e-combat-f1-output.txt` |

# Evidencia visual

- `equipment-hud-qa/screenshots/weapon-in-map.png`: HUD con
  `Atributos +1 habilidad · +1 fuerza · +1 defensa · +0 resistencia`.
- `combat-equipment-qa/screenshots/debug-f1.png`: `F1` con `Atributos` y
  `golpe`/`absorción`.
- `equipment-hud-qa/screenshots/debug-f1.png`: fallo sin etiquetas antiguas.
- Mirar: sin `acierto`, `daño`, `Modificadores` ni `hud-modifiers` visibles.

# Desviaciones

- No se editaron `docs/design/turn-economy.md`, `docs/glossary.md` ni
  `docs/design/architecture.md`; el criterio documental de diseño queda pendiente
  para `requirements-writer`. El ADR-015 y su índice sí están aplicados.
  `docs:check` pasa porque los tres documentos pendientes siguen intactos.

# Problemas conocidos y preguntas abiertas

- ¿Aplica `requirements-writer` la propuesta y relanza el intento? `task-lead`
  podría aplicar el ADR, pero no el diseño ni el glosario.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Tarea «host y docs» asigna al runner ediciones de `docs/` que su permiso deniega | `.opencode/agents/task-runner.md` solo permite `src/**`, `tests/**`, etc.; `edit`/`write` en `docs/` devuelven `Permission denied`; `task-lead` no puede editar diseño ni glosario. | Propuesta `.txt` en `docs-proposal/`. | Cualquier tarea mixta bloquea al runner y exige otra sesión. | Separar la parte documental o permitir al runner `docs/design/**`, `docs/glossary.md` y `docs/decisions/**` con brief que lo autorice. | Bajo; validable con `config:check`. | `deferred` (requirements-writer) |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2427 |
| `report_bytes` | 3744 |
| `overflow` | `none` |
| `criteria_failed` | 1 (diseño y glosario pendientes) |

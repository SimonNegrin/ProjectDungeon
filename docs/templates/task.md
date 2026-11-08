---
type: Template
title: Plantilla de tarea
description: Tarea atómica con requisito, dependencias, criterios y evidencia.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

> El brief se escribe aparte con `docs/templates/task-brief.md`. Los criterios
> viven en esta hoja; el brief los enlaza, no los copia. El informe sigue
> `docs/templates/task-report.md`.

# Uso

Copiar a `docs/tasks/TASK-NNNN-slug.md`. Una tarea debe producir un resultado
observable, un diff revisable y un comando de test. Si no cabe en una sesión de
agente, se divide.

```markdown
---
type: Task
id: TASK-0001
title: Nombre corto y accionable
description: Resultado observable de la tarea.
status: draft
task_status: backlog
task_type: feature
requirement: REQ-001
requirement_ids: [R-001]
depends_on: []
unlocks: []
created_at: 2026-11-07T00:00:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0001/
priority: P1
risk: low
review_required: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
verified:
---

# Objetivo

Qué debe existir o funcionar al terminar.

# Contexto

Enlaces al requisito, diseño y archivos relevantes.

# Criterios de aceptación

- [ ] ...
- [ ] ...

# Plan de test

- Unitario:
- Integración:
- E2E / visual:
- Manual:

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run verify` | 120 s | Docs, config, unitarios y build |
| `pnpm run test:e2e` | 180 s | UI/Canvas si aplica |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0001/attempt-1/report.md`
- [ ] Salida de tests
- [ ] Capturas si hay UI (con `E2E_ARTIFACTS_DIR` si la evidencia se versiona)
- [ ] Commit SHA

# Restricciones

- ...

# No objetivos

- ...

# Notas

- ...
```

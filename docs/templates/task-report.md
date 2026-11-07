---
type: Template
title: Plantilla de informe de tarea
description: Informe que devuelve task-runner al task-lead.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Uso

Copiar a `artifacts/TASK-NNNN/attempt-N/report.md`. El informe debe ser honesto:
incluye fallos, desviaciones y preguntas abiertas.

```markdown
---
type: Task Report
title: "TASK-0001: informe de ejecución"
description: Resultado del intento.
task: TASK-0001
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
artifacts: artifacts/TASK-0001/attempt-1/
verified:
---

# Resumen

Qué se ha hecho y si cumple los criterios.

# Cambios

- Archivos:
- Commit SHA:
- Diff resumido:

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `npm run verify` | ... | `test-output.txt` |

# Evidencia visual

- Capturas:
- Qué debe mirar el usuario:

# Desviaciones

- ...

# Problemas conocidos

- ...

# Preguntas abiertas

- ...

# Estado

- [ ] Listo para verificación del lead
- [ ] Bloqueado
- [ ] Fallido
```

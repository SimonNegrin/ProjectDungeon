---
type: Template
title: Plantilla de informe de tarea
description: Informe compacto que task-runner devuelve al task-lead.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:50:11Z }
---

# Uso

Copiar a `artifacts/TASK-NNNN/attempt-N/report.md`. El informe debe ser honesto:
incluye fallos, desviaciones y preguntas abiertas. Objetivo ~2 KB (3–4 KB en
tareas grandes); límite blando, sin truncar.

Las salidas completas van a `test-output.txt`, `verify-output.txt` o `logs/`.
No se pegan en el informe.

# Esquema

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

# Estado

`success | blocked | failed`. Una frase de motivo si no es `success`.

# Cambios

- Archivos:
- Commit SHA:

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run verify` | 180 s | ... | `verify-output.txt` |

# Evidencia visual

- Rutas:
- Qué debe mirar el usuario:

# Desviaciones

- ...

# Problemas conocidos y preguntas abiertas

- ...

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | ... |
| `report_bytes` | ... |
| `overflow` | `none` / `brief-detalle` / `report-detalle` |
| `criteria_failed` | ... |
| `cause` | ... |

# Checklist

- [ ] Criterios cubiertos y sin tests debilitados
- [ ] Evidencia guardada y enlazada
- [ ] Sin salidas completas pegadas en el informe
- [ ] Listo para verificación del lead
```

# Reglas

- Si falta un campo obligatorio, el handoff no es válido.
- Si un campo no cabe, el contenido completo va a `report-detalle.md` y se
  enlaza; nada se borra.
- `report_bytes` se mide sobre el archivo final; `overflow` indica si hay
  detalle enlazado.

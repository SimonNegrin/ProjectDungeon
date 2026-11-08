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

# Fricción reutilizable

Solo si cumple un disparador: comportamiento no documentado que hubo que
descubrir, comando o entorno que falla de forma repetible, contradicción entre
brief, plantilla, validador o documentación, workaround manual que se repite
entre tareas, o hallazgo de verificación que se generaliza a otros agentes.

Un bug de esta tarea, una preferencia estética, una idea especulativa o un
cambio de alcance no son fricción de arnés: van en «Problemas conocidos».

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| ... | comando/log/captura/ruta | ... | ... | archivo o sección y texto mínimo | ... | `pending` |

Máximo 1–2 entradas por intento. La propuesta es no vinculante: no cambia los
criterios, no desbloquea la tarea y no relaja tests. Si el detalle no cabe, va a
`report-detalle.md` y se enlaza.

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
- La disposición la deja el runner en `pending`; el lead la actualiza a
  `accepted`, `rejected` o `deferred` antes de cerrar.

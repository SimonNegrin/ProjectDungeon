---
type: Template
title: Plantilla de tarea
description: Tarea atómica con criterios, evidencia y anexos de brief e informe.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:23Z }
---

# Uso

Copiar a `docs/tasks/TASK-NNNN-slug.md`. Una tarea debe producir un resultado
observable, un diff revisable y un comando de test. Si no cabe en una sesión de
agente, se divide. Si contiene una decisión creativa abierta, no está lista: es
un requisito o un experimento.

Tope: 600 palabras de objetivo, aviso; 800, error. Lo que no quepa va a una hoja
de requisito, a `docs/design/` o al brief.

# Esquema

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

Qué debe existir o funcionar al terminar, en 1–3 frases.

# Criterios de aceptación

- [ ] ...
- [ ] ...

# Plan de test

- Unitario:
- Integración:
- E2E / visual:
- Manual:

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0001/attempt-1/report.md`
- [ ] Salida de tests
- [ ] Capturas si hay UI (con `E2E_ARTIFACTS_DIR`, en `<spec>/screenshots/`)
- [ ] Commit SHA

# Restricciones

- ...

# No objetivos

- ...
```

# Reglas

- Los criterios de aceptación viven solo aquí; el brief los enlaza.
- No se copia el requisito: se enlaza con ancla.
- No se repite la tabla de timeouts: la política es global
  ([workflow](../harness/workflow.md#timeouts-y-procesos)).
- `depends_on` y `unlocks` usan IDs y son simétricos.
- Solo se planifica el milestone actual; las tareas caducan si cambia el
  requisito.

# Atomicidad

Una tarea tiene un resultado observable, un diff revisable, un comando de test,
una ruta de artefactos y una sola razón para fallar.

Buenas: “Validar movimiento diagonal con coste 1 y sin corte de esquina”, “Añadir
cámara que sigue al jugador y se limita al mapa”.

Malas: “Implementar el combate”, “Hacer el multijugador”, “Mejorar el
rendimiento”.

---

# Anexo A: brief del intento

`task-lead` escribe `artifacts/TASK-NNNN/attempt-N/brief.md`. Es el contrato del
intento: si falta un campo obligatorio, el runner devuelve `blocked`.

Objetivo 1,5 KB; tope duro 4 KB. No se trunca: el desbordamiento va a
`brief-detalle.md` y se enlaza.

```markdown
---
type: Task Brief
title: "TASK-0001: brief del intento 1"
description: Resultado esperado y alcance del intento.
task: TASK-0001
attempt: 1
status: stable
brief_bytes: 0
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
---

# Objetivo

Resultado observable, 1–3 líneas.

# No objetivos

- ...

# Invariantes

- ...

# Criterios de aceptación

Viven en `docs/tasks/TASK-0001-slug.md`, sección «Criterios de aceptación».
Enlazar con ancla; no copiar.

# Contexto mínimo

- `ruta/archivo.ts`: qué mirar.
- Sección del requisito: enlace con ancla.

# Artefactos

- `report.md`, `test-output.txt`, `verify-output.txt`, `screenshots/`, `logs/`.

# Riesgos y decisiones abiertas

- ...
```

---

# Anexo B: informe del intento

`task-runner` escribe `artifacts/TASK-NNNN/attempt-N/report.md`. Debe ser honesto:
incluye fallos, desviaciones y preguntas. Objetivo 2 KB; tope duro 4 KB. Las
salidas completas van a archivos aparte, no se pegan.

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

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ... | `verify-output.txt` |

# Evidencia visual

- Rutas:
- Qué debe mirar el usuario:

# Desviaciones

- ...

# Problemas conocidos y preguntas abiertas

- ...

# Fricción reutilizable

Solo si cumple un disparador: comportamiento no documentado, fallo repetible,
contradicción entre brief, plantilla, validador o documentación, workaround
repetido o hallazgo generalizable. Un bug de la tarea, una preferencia estética o
una idea especulativa no son fricción.

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| ... | ... | ... | ... | ... | ... | `pending` |

Máximo 1–2 entradas. La propuesta no cambia criterios, no desbloquea y no relaja
tests. El detalle va a `report-detalle.md`.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | ... |
| `report_bytes` | ... |
| `overflow` | `none` / `brief-detalle` / `report-detalle` |
| `criteria_failed` | ... |
```

Las métricas existen para vigilar el tope, no para lucir. Si el handoff se acerca
a 4 KB, la causa suele ser duplicar la tarea: enlaza y recorta.

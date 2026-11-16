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

# Comandos

- Tablero: `pnpm run tasks:board`.
- Validación: `pnpm run docs:check`; ya informa del recuento de palabras de la
  tarea cuando pasa de 600.
- Inspección: `rg`, `sed -n` y `wc -w`; no `node -e`, que equivale a ejecución
  arbitraria.
- Sin prefijo `timeout`: el timeout es el parámetro de la herramienta de shell.

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
scope:               # opcional: raíces del diff; si falta, manda task_type
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
- [ ] Capturas si hay UI: con `E2E_ARTIFACTS_DIR`, en `<spec>/screenshots/`;
      una captura manual va a `screenshots/` y el informe registra la ruta y el
      motivo. No `attempt-N/screenshots/` para E2E: el helper ya añade el
      segmento del spec.
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
- `scope` (opcional) declara el alcance del diff cuando el `task_type` no basta
  —un tipo de código que también documenta, o una tarea de arnés que añade
  tests—; las entradas salen del catálogo de `scripts/lib/scope.mjs` y se
  congelan: `verify:task` mide con la versión de la ficha en `merge-base`, así
  que ampliarla a mitad del intento no amplía el diff
  ([workflow](../harness/workflow.md#verificación-determinista)).
- Solo se planifica el milestone actual; las tareas caducan si cambia el
  requisito.
- `docs` no se asigna a `task-runner`: `assignee` es `game-lead`. El arnés se
  pide con `/harness`, fuera del flujo de tareas, sin ficha `docs`.
- Una ficha `docs` no mezcla destinos si eso impide revisarla en un diff
  legible; si ocurre, se parte por resultado esperado.

# Atomicidad

Una tarea tiene un resultado observable, un diff revisable, un comando de test,
una ruta de artefactos y una sola razón para fallar.

Buenas: “Validar movimiento diagonal con coste 1 y sin corte de esquina”, “Añadir
cámara que sigue al jugador y se limita al mapa”.

Malas: “Implementar el combate”, “Hacer el multijugador”, “Mejorar el
rendimiento”.

---

# Anexo A: brief del intento

`game-lead` escribe `artifacts/TASK-NNNN/attempt-N/brief.md` **obligatoriamente
desde el intento 2**; en el intento 1 solo cuando la ficha necesita acotarlo. Sin
acotar, en el primer intento la ficha es el contrato y no hay brief. Si hay brief y
falta un campo obligatorio, el runner devuelve `blocked`.

Objetivo 1,5 KB; aviso 2,5 KB; tope duro 4 KB. No se trunca: el desbordamiento
va a `brief-detalle.md` y se enlaza.

`brief-detalle.md` es un documento OKF como el brief: lleva frontmatter con
`type: Task Brief Detail`, `title`, `description`, `task`, `attempt`, `status` y
`generated`; `docs:check` lo valida y no lo mide.

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

- `report.md`, `test-output.txt`, `verify-output.txt`, `logs/`.
- `<spec>/screenshots/` para E2E; `screenshots/` solo para capturas manuales,
  con el motivo en el informe.

# Riesgos y decisiones abiertas

- ...
```

---

# Anexo B: informe del intento

`task-runner` escribe `artifacts/TASK-NNNN/attempt-N/report.md`. Debe ser honesto:
incluye fallos, desviaciones y preguntas. Objetivo 2 KB; aviso 3 KB; tope duro
4 KB. Las salidas completas van a archivos aparte, no se pegan.

`report-detalle.md` lleva el mismo frontmatter mínimo que el informe, con
`type: Task Report Detail` y `task`/`attempt`.

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

---

# Anexo C: verificación

`game-lead` marca `[x]` solo los criterios que puede sostener con evidencia y
ejecuta `pnpm run verify:task TASK-NNNN`. El script deja la salida mecánica en
`attempt-N/lead-verify/verify-task.txt`; el juicio va en `verification.md`:

```markdown
---
type: Verification
title: "TASK-0001: verificación del intento 1"
description: Resultado de verify:task y criterios revisados.
task: TASK-0001
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
---

# Resultado

`ok` o `fail`, y por qué.

# Criterios

Los que no se pudieron sostener y qué falta.

# Diff revisado

Archivos de `git diff main...HEAD` y riesgos.

# Qué debe probar el usuario

...
```

# Cómo recortar

- No copies criterios, requisitos, tablas de timeouts ni el brief: enlaza con
  ancla.
- El mapeo criterio → test va en la verificación de `game-lead`. Si el informe lo
  incluye, una línea por criterio; el detalle, en `report-detalle.md`.
- Cita la evidencia una vez: nombre de archivo y qué mirar, no la salida.
- Las preguntas abiertas y la fricción van en su tabla; no las repitas en
  «Desviaciones».
- Si dos secciones crecen a la vez, mueve el contexto estable al detalle y deja
  en el handoff solo el delta del intento.

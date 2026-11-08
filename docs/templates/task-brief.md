---
type: Template
title: Plantilla de brief de tarea
description: Brief compacto del intento que task-lead entrega a task-runner.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:50:11Z }
---

# Uso

Copiar a `artifacts/TASK-NNNN/attempt-N/brief.md`. El brief es el contrato del
intento: si falta un campo obligatorio, el handoff no es válido y el runner
devuelve `blocked`.

El brief se escribe aparte de la tarea. Los criterios de aceptación viven en
`docs/tasks/TASK-NNNN-slug.md`; el brief los enlaza, no los copia.

# Presupuesto

- Objetivo ~2 KB. En tareas grandes se admiten 3–4 KB.
- Límite blando: no se trunca nada. Al 100 % se avisa; al 150 % se justifica en
  el propio brief.
- Lo que no cabe va a `brief-detalle.md`, enlazado desde el brief. El runner solo
  lo lee si el brief lo indica (`read_detail: true`).

# No duplicación

- No copies la tarea, los criterios ni el requisito: enlaza con ancla.
- No pegues bloques de código salvo una firma imprescindible (máximo 10 líneas).

# Campos obligatorios

1. Objetivo observable.
2. No objetivos y fuera de alcance.
3. Invariantes y restricciones no obvias.
4. Criterios de aceptación: enlace a la tarea, sin copiarlos.
5. Contexto mínimo: archivos, módulos y enlaces con anclas.
6. Comandos y timeouts.
7. Artefactos y qué debe devolver el runner.
8. Riesgos o decisiones abiertas.

# Esquema

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

Resultado observable, en 1–3 líneas.

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

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run verify` | 180 s |

# Artefactos

- `report.md` según `docs/templates/task-report.md`.
- `test-output.txt`, `verify-output.txt`, `screenshots/`, `logs/`.

# Riesgos y decisiones abiertas

- ...
- Propuestas de fricción del intento anterior que afecten a este, enlazadas; no
  se copian.

# Desbordamiento

Detalle en `brief-detalle.md`. El runner lo lee: no.
```

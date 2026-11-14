---
type: Harness
title: Documentación y validación
description: Perfil OKF v0.2, campos propios, plantillas y topes que valida docs:check.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:23Z }
---

# Base OKF

Usamos **OKF v0.2**: Markdown con frontmatter YAML. El único campo obligatorio es
`type`; los productores pueden añadir campos propios. `index.md` y `log.md` son
nombres reservados: no llevan frontmatter, salvo `okf_version` en el índice raíz.

Bundles: `docs/` (conocimiento), `experiments/` (experimentos y su código) y
`artifacts/` (evidencias; sus informes también llevan frontmatter).

# Frontmatter mínimo

```yaml
---
type: Task
title: Validar movimiento diagonal
description: Una frase que permita decidir si el documento es relevante.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---
```

`status`: `draft`, `stable` o `deprecated` (ciclo de vida del documento).
`generated`: quién y cuándo. `verified`: quién lo confirmó; `human:<id>` indica
revisión humana. `stale_after` y `sources` son opcionales. El estado operativo de
una tarea va en `task_status`, no en `status`.

# Tipos y campos

Tipos: `Vision`, `Scope`, `Glossary`, `Design`, `Architecture`, `ADR`,
`Requirement Sheet`, `Task`, `Task Brief`, `Task Report`, `Experiment`,
`Test Strategy`, `Quality Gate`, `Workflow`, `Harness`, `Template`,
`Artifact Guide`, `README` y `Agent Instructions`. La lista canónica vive en el
validador.

Campos por tipo:

- **Requisito**: `id`, `version`, `decision_owner`, `review_required`,
  `related_tasks`.
- **Tarea**: `id`, `task_status`, `task_type`, `requirement`, `requirement_ids`,
  `depends_on`, `unlocks`, `created_at`, `completed_at`, `assignee`, `attempts`,
  `artifacts`, `priority`, `risk`. `task_type` ∈ `feature`, `experiment`,
  `test`, `qa`, `docs`, `harness`, `refactor`; `docs` elige `assignee` por
  destino ([workflow](workflow.md#quién-ejecuta-una-tarea-docs)).
- **Experimento**: `id`, `question`, `related_requirements`, `parameters`,
  `decision`, `decided_by`, `decided_at`, `experiment_status`.

# Grafo

- `depends_on` y `unlocks` usan IDs, no rutas.
- Si A depende de B, B incluye A en `unlocks`.
- Sin ciclos ni tareas huérfanas.
- Una tarea `ready` no tiene dependencias sin terminar.
- Una tarea `done` tiene `completed_at`.

# Topes

Los topes existen para que el handoff sea legible, no para castigar. Se aplican a
`TASK-0021` en adelante; las tareas y artefactos anteriores son históricos y no
se reescriben.

| Documento | Objetivo | Aviso | Error |
|---|---:|---:|---:|
| Tarea (`docs/tasks/`) | 600 palabras | 600 | 800 |
| Brief | 1,5 KB | 2,5 KB | 4 KB |
| Informe | 2 KB | 3 KB | 4 KB |
| Entrada de log | 1 línea | — | 400 caracteres |

El desbordamiento va a `brief-detalle.md` o `report-detalle.md`; `docs:check` no
los mide. El log usa el formato
`* YYYY-MM-DD — Tipo — ID — resultado — enlace`; solo se miden las líneas con ese
formato.

# Validación

```bash
pnpm run docs:check
```

Comprueba frontmatter y `type`, campos obligatorios, fechas ISO, enlaces locales,
IDs únicos, dependencias, simetría `depends_on`/`unlocks`, ciclos, estados y los
topes anteriores. OKF tolera enlaces rotos; nuestro perfil no, porque la
trazabilidad es parte del arnés.

# Plantillas

Están en [templates](../templates/index.md). La
[plantilla de tarea](../templates/task.md) incluye el esquema de la tarea y, como
anexos, el brief y el informe. No hay plantillas separadas de handoff.

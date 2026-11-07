---
type: Harness
title: Perfil OKF del proyecto
description: Convenciones OKF v0.2, campos propios, tipos y validación.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Base

Usamos **OKF v0.2**: un directorio de documentos Markdown con frontmatter YAML.
El único campo obligatorio de OKF es `type`; los productores pueden añadir campos
propios. `index.md` y `log.md` son nombres reservados.

# Bundles

- `docs/` es el bundle principal de conocimiento.
- `experiments/` contiene documentos de experimento y su código.
- `artifacts/` contiene evidencias de tareas; sus informes también llevan
  frontmatter OKF.

El `docs/index.md` declara `okf_version: "0.2"`. Los `index.md` no llevan
frontmatter salvo esa excepción. Los `log.md` son listas de cambios agrupadas por
fecha.

# Frontmatter mínimo del perfil

```yaml
---
type: Task
title: Validar movimiento diagonal
description: Una frase que permita decidir si el documento es relevante.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---
```

# Tipos usados

| Tipo | Uso |
|---|---|
| `Vision` | Dirección creativa. |
| `Scope` | Alcance y fases. |
| `Glossary` | Términos compartidos. |
| `Design` | Reglas y experiencia. |
| `Architecture` | Arquitectura técnica. |
| `ADR` | Decisión técnica. |
| `Requirement Sheet` | Hoja de requisitos. |
| `Task` | Tarea atómica. |
| `Task Report` | Informe de ejecución. |
| `Experiment` | Experimento interactivo. |
| `Test Strategy` | Estrategia de pruebas. |
| `Quality Gate` | Criterios de listo/terminado. |
| `Workflow` | Flujo de trabajo. |
| `Agent Charter` | Charter de agente. |
| `Skill Catalog` | Catálogo de skills. |
| `Harness` | Documento del arnés. |
| `Template` | Plantilla. |
| `Artifact Guide` | Convención de artefactos. |
| `README` | Entrada del repositorio. |
| `Agent Instructions` | Instrucciones para agentes. |

# Ciclo de vida y confianza

- `status`: `draft`, `stable` o `deprecated`. Es el ciclo de vida del documento.
- `generated`: quién y cuándo produjo el contenido.
- `verified`: quién lo ha confirmado. `human:<id>` indica revisión humana.
- `stale_after`: fecha a partir de la cual el documento debe revisarse.
- `sources`: referencias externas o internas.

No usamos `status` para el estado operativo de una tarea. Para eso existe
`task_status`.

# Campos propios

## Requisitos

- `id`: `REQ-NNN`.
- `version`: versión de la hoja.
- `decision_owner`: normalmente `human:simon`.
- `review_required`: si una decisión técnica necesita revisión.
- `related_tasks`: IDs de tareas.

## Tareas

- `id`: `TASK-NNNN`.
- `task_status`: `backlog`, `ready`, `in_progress`, `blocked`, `review`, `done`.
- `task_type`: `feature`, `test`, `experiment`, `spike`, `docs`, `art`, `refactor`.
- `requirement`: ruta o ID de la hoja.
- `requirement_ids`: lista de IDs concretos.
- `depends_on`: IDs de tareas.
- `unlocks`: IDs de tareas.
- `created_at` / `completed_at`: fechas ISO 8601.
- `assignee`: agente responsable.
- `attempts`: número de intentos.
- `artifacts`: ruta de evidencias.
- `priority`: `P0`, `P1`, `P2`.
- `risk`: `low`, `medium`, `high`.

## Experimentos

- `id`: `EXP-NNN`.
- `question`: la pregunta que responde.
- `related_requirements`: hojas o IDs.
- `parameters`: parámetros ajustables.
- `decision`: opción elegida.
- `decided_by` / `decided_at`: quién y cuándo.
- `experiment_status`: `proposed`, `building`, `ready`, `decided`, `archived`.
  El `status` de OKF sigue siendo el ciclo de vida del documento.

# Grafo de tareas

- `depends_on` y `unlocks` usan IDs, no rutas.
- Si A depende de B, B debe incluir A en `unlocks`.
- No se permiten ciclos.
- Una tarea `ready` no puede tener dependencias sin terminar.
- Una tarea `done` debe tener `completed_at`.
- Los IDs son únicos.

El validador comprueba todo esto.

# Validación

```bash
pnpm run docs:check
```

Comprueba:

- frontmatter parseable y `type` presente;
- campos obligatorios del perfil;
- fechas ISO;
- enlaces locales;
- IDs únicos;
- dependencias existentes;
- simetría de `depends_on` / `unlocks`;
- ciclos;
- estado de tareas y experimentos.

OKF tolera enlaces rotos; nuestro perfil no, porque la trazabilidad es parte del
arnés.

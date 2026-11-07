---
name: OKF Authoring
description: Crear y editar documentos Markdown con frontmatter OKF v0.2, enlaces, índices y log.
---

# Cuándo usarla

Al crear o editar cualquier documento del bundle `docs/` o de `experiments/`.

# Antes de escribir

Lee `docs/harness/okf.md` y la plantilla correspondiente en `docs/templates/`.

# Reglas

- Cada concepto Markdown lleva frontmatter YAML con `type` no vacío.
- Añade `title`, `description`, `status` y `generated`.
- Usa fechas ISO 8601 con offset UTC, por ejemplo `2026-11-07T14:33:11Z`.
- `index.md` y `log.md` son reservados: no les pongas frontmatter, salvo
  `okf_version` en el `index.md` raíz.
- Enlaza con rutas relativas o bundle-relative; no dejes enlaces locales rotos.
- Usa `verified` solo si alguien ha verificado de verdad. `human:<id>` para
  revisión humana.
- No uses `status` para el estado operativo de una tarea; usa `task_status`.
- Los IDs de tareas, requisitos y experimentos son estables.
- Si cambias un documento, actualiza `generated.at` y el `log.md` si es
  relevante.

# Tipos

Usa los tipos del perfil: `Vision`, `Scope`, `Glossary`, `Design`,
`Architecture`, `ADR`, `Requirement Sheet`, `Task`, `Task Report`, `Experiment`,
`Test Strategy`, `Quality Gate`, `Workflow`, `Agent Charter`, `Skill Catalog`,
`Harness`, `Template`, `Artifact Guide`, `README`, `Agent Instructions`.

# Validación

Ejecuta con timeout de 60 s:

```bash
pnpm run docs:check
```

Corrige errores de frontmatter, fechas, enlaces y grafo antes de terminar.

# Checklist

- [ ] `type` presente.
- [ ] `title` y `description` claros.
- [ ] Fechas ISO.
- [ ] Enlaces locales resueltos.
- [ ] Índice actualizado si es un documento nuevo.
- [ ] Log actualizado si el cambio es relevante.
- [ ] `pnpm run docs:check` pasa.

---
type: Template
title: Plantilla de requisitos
description: Hoja de requisitos creativos y técnicos con trazabilidad.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Uso

Copiar el bloque de abajo a `docs/requirements/REQ-NNN-slug.md`. Una hoja por
área o milestone, no una hoja gigante para todo el juego. Aprobar con el usuario
antes de generar tareas.

```markdown
---
type: Requirement Sheet
id: REQ-001
title: Nombre corto
description: Una frase que resuma el requisito.
status: draft
version: 1
decision_owner: human:simon
review_required: true
created_at: 2026-11-07T00:00:00Z
updated_at: 2026-11-07T00:00:00Z
related_tasks: []
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
verified:
---

# Contexto

Qué problema o experiencia motiva esta hoja.

# Objetivos de experiencia

Qué debe sentir, entender o decidir el jugador.

# Requisitos creativos

| ID | Requisito | Aceptación |
|---|---|---|
| R-001 | ... | ... |

# Requisitos técnicos

| ID | Requisito | Aceptación |
|---|---|---|
| T-001 | ... | ... |

# Requisitos no funcionales

- Rendimiento:
- Accesibilidad:
- Compatibilidad:
- Seguridad:
- Mantenibilidad:

# Fuera de alcance

- ...

# Preguntas abiertas

- ...

# Decisiones

| Fecha | Decisión | Quién | Estado |
|---|---|---|---|
| ... | ... | ... | ... |

# Aceptación de la hoja

- [ ] El usuario ha aprobado las decisiones creativas.
- [ ] Los requisitos son verificables.
- [ ] Las dependencias están claras.
- [ ] Se puede generar un grafo de tareas.
```

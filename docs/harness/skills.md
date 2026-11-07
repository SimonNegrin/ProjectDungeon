---
type: Skill Catalog
title: Skills
description: Procedimientos reutilizables disponibles para los agentes.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Criterio

Las skills son procedimientos y checklists. Los agentes son roles. Una skill se
carga solo cuando la tarea la necesita; no se mete todo en el prompt.

# Catálogo

| Skill | Cuándo usarla | Salida |
|---|---|---|
| `okf-authoring` | Crear o editar documentación | Frontmatter, enlaces, índices, log |
| `requirements-interview` | Hablar con el usuario y redactar requisitos | Hoja de requisitos o preguntas |
| `task-decomposition` | Convertir requisitos en tareas | Tareas atómicas y grafo |
| `experiment-design` | Hay una duda que se decide mejor probando | Experimento y decisión |
| `game-architecture` | Diseñar motor, input, render o futura red | Diseño técnico y ADRs |
| `canvas-rendering` | Implementar host, cámara, tilemap o HUD | Código de render y debug hooks |
| `visual-qa` | Verificar UI/Canvas o capturar evidencia | Tests, capturas, informe |
| `task-verification` | Revisar el trabajo del runner | Verificación o escalado |
| `playtest-facilitation` | El usuario va a probar una build | Guion de playtest y feedback |

# Ubicación

```text
.opencode/skills/
  okf-authoring/SKILL.md
  requirements-interview/SKILL.md
  task-decomposition/SKILL.md
  experiment-design/SKILL.md
  game-architecture/SKILL.md
  canvas-rendering/SKILL.md
  visual-qa/SKILL.md
  task-verification/SKILL.md
  playtest-facilitation/SKILL.md
```

# Reglas

- Una skill no duplica el charter del agente.
- Una skill debe tener pasos, checklist y salida.
- Las skills pueden enlazar plantillas y documentos del bundle.
- Si una skill se usa mal, se corrige la skill, no se añade otro agente.
- No se cargan todas las skills a la vez.

---
type: Template
title: Plantilla de experimento
description: Experimento interactivo con una pregunta, parámetros y decisión.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Uso

Copiar a `experiments/EXP-NNN-slug/experiment.md` y usar el shell de
`experiments/_shell/`. El experimento debe responder una sola pregunta.

```markdown
---
type: Experiment
id: EXP-001
title: Nombre corto
description: Qué se compara y para qué.
status: draft
experiment_status: proposed
question: ¿Qué decisión permite tomar este experimento?
related_requirements: []
parameters:
  - id: example
    label: Ejemplo
    type: range
    min: 0
    max: 10
    default: 5
decision:
decided_by:
decided_at:
created_at: 2026-11-07T00:00:00Z
updated_at: 2026-11-07T00:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T00:00:00Z }
verified:
---

# Hipótesis

Qué esperamos y por qué.

# Opciones

| Variante | Descripción | Tradeoff |
|---|---|---|
| A | ... | ... |
| B | ... | ... |

# Cómo usarlo

1. Abrir la página.
2. Ajustar estos parámetros.
3. Comparar A/B con la misma semilla.
4. Exportar la configuración y registrar la decisión.

# Métricas

- ...

# Observaciones

Rellenar después del playtest.

# Decisión

- Opción:
- Motivo:
- Fecha:
- Decidido por:

# Siguientes pasos

- Actualizar requisito:
- Crear tareas:
- Archivar o promocionar:
```

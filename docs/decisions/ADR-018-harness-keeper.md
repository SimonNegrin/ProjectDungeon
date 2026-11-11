---
type: ADR
title: "ADR-018: Harness Keeper"
description: Agente primario que custodia el arnés y la documentación, con auditoría bajo demanda; no escribe código ni decide creatividad.
status: stable
decision_status: accepted
decided_by: [human:simon]
decided_at: 2026-11-11T00:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T00:00:00Z }
---

# Contexto

El arnés creció: reglas de sesión, topes de handoff, permisos por documento,
gates, timeouts y tres agentes. `requirements-writer` acumulaba la propiedad de
todo `docs/**` y del arnés, así que las consultas de flujo competían con la
conversación de producto. `task-lead` detecta fricción, pero solo puede elevar y
no tiene contexto ni mandato para rediseñar la documentación.

La deriva ya es visible: enlaces históricos que apuntan a documentos eliminados,
reglas repetidas entre `AGENTS.md`, `workflow.md` y los prompts, y documentos que
se cargan enteros cuando bastaría un ancla.

# Decisión

- Se añade `harness-keeper` como agente primario, en español, invocado
  manualmente por el usuario.
- Custodia `docs/harness/**`, `docs/templates/**`, `AGENTS.md`, `.opencode/**` y
  `opencode.jsonc`; puede leer el resto.
- `requirements-writer` conserva requisitos, diseño, decisiones y producto.
  `task-lead` conserva tareas, decisiones, diseño y glosario.
- El keeper aplica correcciones factuales y de bajo riesgo con entrada en
  `docs/log.md`; pide confirmación antes de cambiar reglas, permisos, gates,
  coste o comportamiento de agentes.
- No hay auditoría periódica ni obligatoria al cerrar hito. El usuario decide
  cuándo lanzarla. Una auditoría sin hallazgos no genera informe ni log.
- El keeper no toca `src/`, `tests/`, `index.html`, `public/`, código de
  experimentos, artefactos de tarea, requisitos, criterios ni alcance.

# Consecuencias

- Un solo dueño para el arnés y una conversación de producto sin distracciones.
- Menos vueltas: las correcciones de flujo no esperan a una sesión de requisitos.
- La deriva depende de que el usuario invoque al keeper; se acepta ese riesgo a
  cambio de no añadir rituales. El prompt incluye señales de deriva para
  mencionarlas aunque no se haya pedido auditoría.
- `scripts/validate-opencode.mjs` exige el agente y su modo para que no
  desaparezca por accidente.
- La propiedad compartida de `docs/` queda acotada por ruta, no por convención.

# Alternativas descartadas

- **Skill `harness-audit` + comando**: más barata, pero sin identidad, permisos
  ni memoria de rol; la custodia del arnés se diluye.
- **Subagente de auditoría**: no sirve para conversación directa ni para aplicar
  cambios; además duplicaría el contexto del orquestador.
- **Auditoría obligatoria al cerrar hito**: añade ceremonia y coste fijo; el
  usuario prefiere invocarla cuando haga falta.

Ver [workflow](../harness/workflow.md#agentes),
[documentación](../harness/documentacion.md) y
[ADR-016](ADR-016-permisos-docs-diseno-glosario.md).

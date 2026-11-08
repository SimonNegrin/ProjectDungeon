---
type: Task Brief
title: "TASK-0031: brief del intento 1"
description: Feedback de daño legible sin solapar con el atacante.
task: TASK-0031
attempt: 1
status: stable
brief_bytes: 2131
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T20:10:00Z }
---

# Objetivo

Colocar `-N`/`Fallo` sobre el objetivo, al lado opuesto al atacante, legible en
pasillos de una casilla y dentro del mapa, sin cambiar reglas ni eventos.

# No objetivos

- Reglas, daño, vida, turnos, HUD o arte; no tocar `src/game/`.
- `TASK-0032` ni ampliar la cobertura E2E ya cerrada.
- Elementos nuevos que oculten el mapa.

# Invariantes

- `AttackPerformed` es la única fuente de impacto, daño, HP y tiradas.
- `Fallo`/`-N` conservan texto, color, `aria-live` y 1200 ms; destello solo en impacto.
- El texto queda asociado al objetivo y dentro del marco.
- Sin dependencias; `index.html` solo si el CSS es imprescindible, documentado.

# Criterios de aceptación

En `docs/tasks/TASK-0031-host-feedback-dano-legible.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- `src/host/feedback.ts`: añadir la función pura de anclaje, exportada y testeable.
- `src/host/main.ts`: `createDamageFeedbackView` (posición en % y `damage-pop`).
- `index.html`: `.damage-feedback`; CSS solo si es imprescindible.
- `tests/unit/host/feedback.test.ts`: cuatro direcciones, diagonal y bordes.
- `tests/e2e/combat-equipment-qa.spec.ts`: captura 1280×720 con `E2E_ARTIFACTS_DIR`.
- Requisito: `docs/requirements/REQ-010-combate-equipo-acierto-defensa.md`
  (`#requisitos-creativos` R-010, `#requisitos-técnicos` T-006).
- Defecto: `artifacts/TASK-0030/attempt-1/screenshots/attack-hit.png`.

# Artefactos

`artifacts/TASK-0031/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `screenshots/` (`attack-corridor.png`, `attack-normal.png`).
Commit en `task/TASK-0031`; no cerrar la tarea.

# Riesgos y decisiones abiertas

- Diagonal/misma casilla: regla determinista documentada y testeada.
- Bordes: el test unitario fija el anclaje dentro del marco.
- `review_required: true`: el lead revisa capturas y diff.

---
type: Task
id: TASK-0083
title: "Host: lanzamiento de hechizos, HUD y feedback"
description: "Seleccionar hechizo y objetivo con teclado, mostrar nivel de magia y maná actual/máximo en el HUD y el debug, y presentar impacto, curación, resurrección y rechazos con feedback legible."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-025
requirement_ids: [R-011, R-013, T-004, T-008]
depends_on: [TASK-0082]
unlocks: [TASK-0084]
created_at: 2026-11-12T15:05:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0083/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T15:05:00Z }
verified:
---

# Objetivo

Que el jugador pueda elegir un hechizo disponible, apuntar a un objetivo válido y
ver su efecto con feedback claro. El HUD muestra nivel de magia y maná
actual/máximo del jugador y del enemigo bajo el cursor; los rechazos explican el
motivo sin consumir nada.

# Contexto

- `src/host/input.ts`: teclado, cursor y comandos; hoy no hay selección de
  hechizo.
- `src/host/hud.ts`: `buildHudModel` y `buildDebugModel`; el HUD actual se
  extiende con magia y maná, sin rediseñar las columnas de `REQ-022`/`REQ-023`.
- `src/host/notices.ts`: mensajes de rechazo; añadir los motivos de hechizo.
- `src/host/feedback.ts` y `src/host/feedback-config.ts`: beats de impacto,
  curación y resurrección.
- `index.html`: nodos del HUD actual; sin arte nuevo.
- Requisito: [REQ-025](../requirements/REQ-025-magia-hechizos-mana.md).
  Depende de `TASK-0082` por el catálogo y el resolvedor.
- [REQ-029](../requirements/REQ-029-tipos-dano-resistencias.md) cambia el daño
  mágico a paquetes tipados (TASK-0085) y añade desglose a `SpellCast`
  (TASK-0088); esta tarea presenta el total del evento y no reimplementa daño.

# Criterios de aceptación

- [ ] El jugador elige hechizo y objetivo solo con teclado; la lista muestra
      nivel mínimo, coste y disponibilidad. Cancelar no consume nada.
- [ ] El HUD muestra `magia` y `maná actual/máximo` del jugador activo y del
      enemigo bajo el cursor; el debug expone lo mismo para todas las unidades.
- [ ] Un hechizo disponible se lanza con una pulsación; se respetan acción,
      maná, nivel, alcance, LOS, objetivo y tope de 2, y el rechazo explica el
      motivo con texto.
- [ ] Impacto, fallo, curación y resurrección tienen feedback legible y un beat
      propio; no hay texto flotante nuevo si el beat existente basta.
- [ ] El E2E verifica lanzar Eléctrico I, Fuego II y Curación III; rechazo por
      maná, nivel, alcance y tope; HUD de magia/maná; coste de acción y maná; y
      ausencia de réplica por hechizo.
- [ ] QA visual con capturas 1280×720 y 900×700; `pnpm run verify` y `docs:check`
      pasan.
- [ ] Sin cambios en acceso, coste, maná, alcance ni tope; el daño sigue al
      resolvedor de REQ-029 y el total se lee del evento.

# Plan de test

- Unitario: modelo del HUD con magia 0–4 y maná; motivos de rechazo; selección
  de hechizo y cancelación.
- Integración: lanzar dos hechizos con 2 acciones; tercero rechazado; recarga al
  turno siguiente visible en HUD.
- E2E / visual: selección, objetivos válidos e inválidos, curación, capturas.
- Manual: Mago y Cocinero; comprobar que el HUD explica por qué un hechizo no
  está disponible.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0083/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`, E2E y `docs:check`
- [ ] Capturas en `tests/e2e/<spec>/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0083`

# Restricciones

- No rediseñar el HUD lateral de `REQ-022`/`REQ-023`.
- No añadir hechizos, IA lanzadora ni arte/audio.
- No cambiar el catálogo ni las fórmulas de `TASK-0082`.
- No añadir dependencias.

# No objetivos

- Guardado de maná en partida (`REQ-024` sigue en borrador).
- Rebalanceo de hechizos o valores.
- Resurrección jugable completa: depende de `REQ-021`.

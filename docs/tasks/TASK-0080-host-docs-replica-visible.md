---
type: Task
id: TASK-0080
title: "Host y docs: réplica visible y ADR"
description: "Presentar la réplica con la animación de ataque girada hacia el atacante, sin texto, con cue propio y su excepción de ritmo; actualizar glosario, arquitectura, ADR y enmiendas."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-027
requirement_ids: [R-007, T-006, T-007, T-008]
depends_on: [TASK-0079]
unlocks: [TASK-0081]
created_at: 2026-11-12T14:50:00Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0080/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-12T14:50:00Z }
verified:
---

# Objetivo

Que el jugador vea la réplica como una reacción inmediata: el defensor gira
hacia el atacante y ejecuta la animación de ataque, sin texto, con un cue propio
en la timeline y con la secuencia fallo → réplica legible. Dejar la regla
documentada en glosario, arquitectura y ADR.

# Contexto

- `src/host/feedback.ts`, `src/host/feedback-config.ts` y
  `src/host/feedback-events.ts`: timeline, configuración de beats y mapeo de
  eventos.
- `src/host/renderer.ts` y `src/host/motion.ts`: animación de ataque y giro de
  la unidad.
- `docs/design/turn-economy.md`, `docs/design/architecture.md`,
  `docs/glossary.md` y `docs/decisions/` (ADR nuevo de la réplica).
- [REQ-017](../requirements/REQ-017-feedback-visual-eventos.md): cue, matriz y
  techo de 1,3 s; la réplica necesita excepción declarada.
- Requisito: [REQ-027](../requirements/REQ-027-replica-combate-cuerpo-a-cuerpo.md).
  Depende de `TASK-0079` por el evento y la resolución.

# Criterios de aceptación

- [ ] La réplica usa la animación de ataque con giro hacia el atacante y sin
      texto; se distingue del ataque normal por su aparición inmediata tras el
      fallo y por el cue propio.
- [ ] La presentación respeta el orden fallo → réplica → siguiente acción y no
      adelanta ni pierde eventos; el E2E verifica `ReplicaPerformed` entre el
      fallo y la acción siguiente.
- [ ] El cue tiene su fila en la matriz de `REQ-017` y su excepción al techo de
      1,3 s documentada; con `prefers-reduced-motion` se presenta sin animación.
- [ ] QA visual con capturas 1280×720 y 900×700 del giro y de la secuencia; sin
      aviso, probabilidad ni indicador de réplica en el HUD.
- [ ] Glosario define «réplica» y su elegibilidad; arquitectura y economía de
      turno recogen la regla; ADR de la réplica registrado; se verifica que las
      enmiendas a `REQ-009`, `REQ-010` y `REQ-017` están anotadas y se añade
      solo lo que falte. `docs:check` pasa.
- [ ] `pnpm run verify` y el E2E pasan; los tests de `REQ-010` y `REQ-017`
      conservan su intención.
- [ ] Las cinco expectativas E2E que TASK-0079 dejó obsoletas se actualizan al
      comportamiento aprobado, con el motivo en el test: orden con
      `ReplicaPerformed` entre el fallo y la acción siguiente, derrota que ya no
      se alcanza a 80 turnos y secuencias de daño. Cada cambio acota el escenario
      o corrige la expectativa; ninguna aserción se elimina ni se relaja.

# Plan de test

- Unitario: mapeo del evento a cue, orden de la timeline, giro y reduced motion.
- Integración: fallo + réplica + siguiente ataque en una sola secuencia.
- E2E / visual: `ReplicaPerformed` entre eventos, capturas y revisión del giro.
- Manual: atacar y fallar contra un enemigo armado; leer la reacción sin texto.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0080/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`, del E2E y de `docs:check`
- [ ] Capturas en `tests/e2e/<spec>/screenshots/`
- [ ] Commit SHA en la rama `task/TASK-0080`

# Restricciones

- No añadir texto, sonido ni arte nuevos.
- No mostrar probabilidad ni aviso de réplica en el HUD.
- No cambiar la regla ni el evento de `TASK-0079`.
- No añadir dependencias.

# No objetivos

- Réplica a distancia o mágica.
- Penalización de −1 al acierto.
- Rebalanceo de valores.

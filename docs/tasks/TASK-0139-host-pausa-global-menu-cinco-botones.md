---
type: Task
id: TASK-0139
title: "Host: pausa global y menú de cinco botones"
description: "Añadir la pausa global con `Esc`, el menú Reanudar/Nueva partida/Cargar/Guardar/Controles y el bloqueo de la timeline y del input."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-024
requirement_ids: [R-001, R-002, R-003, R-007, R-011, R-013, R-014, T-007, T-008, T-014]
depends_on: [TASK-0123, TASK-0126, TASK-0134]
unlocks: [TASK-0140, TASK-0141, TASK-0144, TASK-0149, TASK-0154]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0139/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que cualquier jugador pueda pausar con `Esc` y detener de verdad la partida,
con un menú de cinco acciones en orden fijo y sin que avance ningún turno, beat
ni animación.

# Contexto

REQ-024
[R-001](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
y
[R-002](../requirements/REQ-024-menu-pausa-guardado.md#requisitos-creativos-decididos)
fijan la pausa y el menú. TASK-0123 deja el menú principal, TASK-0126 el
arranque y TASK-0134 el estado de fase. Guardar y cargar se conectan en
TASK-0140 y TASK-0141; aquí se deja el menú y el bloqueo.

# Criterios de aceptación

- [ ] `Esc` abre la pausa desde cualquier fase: personajes, enemiga, paneo y
      animación; con el panel abierto, el primer `Esc` cierra el panel.
- [ ] Con el menú abierto no avanza ningún turno, beat ni animación, y el input
      de juego se ignora; reanudar continúa exactamente desde el mismo estado.
- [ ] El menú ofrece en orden Reanudar, Nueva partida, Cargar partida, Guardar
      partida y Controles, navegable con teclado y foco visible.
- [ ] `Esc` en el menú raíz reanuda; en un submenú o aviso vuelve al menú.
- [ ] Guardar queda desactivado con motivo en texto fuera de la fase de
      personajes, durante animación o paneo; su ejecución es TASK-0140.
- [ ] «Nueva partida» y «Cargar partida» piden una confirmación cada una; la
      carga funcional es TASK-0141 y «Nueva» abre el paso 1 de TASK-0123.
- [ ] La lista de controles se genera desde el mapa único de teclas y no permite
      remapeo.
- [ ] No existe reinicio rápido ni atajo `R`.
- [ ] Tests de congelación, input ignorado, reanudación, orden, `Esc` y controles
      sin deriva; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/input.test.ts` y `notice`/pausa nuevos.
- Integración: pausar en fase de personajes, enemiga y animación; reanudar.
- E2E: pausa y orden del menú; la suite completa va en TASK-0144.
- Manual: comprobar que no se mueve el cursor ni el feedback con la pausa.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0139/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/input.test.ts tests/unit/host/session.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la descarga ni la lectura de archivos.
- No implementar el resultado de partida ni el reinicio rápido.
- No duplicar la lista de controles en texto suelto.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Guardado y carga completos.
- Audio, silencio o remapeo.
- Pausa por jugador.
- Cambios de motor o de reglas.

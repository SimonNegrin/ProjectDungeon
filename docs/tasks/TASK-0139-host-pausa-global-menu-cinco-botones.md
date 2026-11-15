---
type: Task
id: TASK-0139
title: "Host: pausa global y menú de cinco botones"
description: "Añadir la pausa global con `Esc`, el menú Reanudar/Nueva partida/Cargar/Guardar/Controles y el bloqueo de la timeline y del input."
status: stable
task_status: done
task_type: feature
requirement: REQ-024
requirement_ids: [R-001, R-002, R-003, R-007, R-011, R-013, R-014, T-007, T-008, T-014]
depends_on: [TASK-0123, TASK-0126, TASK-0134]
unlocks: [TASK-0140, TASK-0141, TASK-0144, TASK-0149, TASK-0154]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T17:33:26Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0139/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T17:33:26Z
    note: >-
      Intentos 1-2 verificados (código `f0dbe24`, evidencia `9e3329d`; fusión
      `ff99ae2`). El intento 1 pasó `verify` y los E2E de pausa, pero la suite
      completa destapó una regresión intermitente: el guard global de
      `defaultPrevented` en `main.ts` se comía la primera flecha tras cerrar el
      panel. El intento 2 la corrigió en origen (`pause-menu-view` consume con
      `stopImmediatePropagation`) y añadió un test determinista; estrés 40/40 y
      `main` 60/60 como control. Verificación del lead: 130 unitarios
      focalizados, `pnpm run verify` 105 archivos/1649 tests + docs/config/tsc/
      build/bundle OK, `pnpm run test:e2e` 241/241 y un E2E adicional en modo
      normal que confirma que «Nueva partida» desde la pausa abre el paso 1.
      Criterios 1-9: `Esc` global con prioridad de panel/lista; relojes de
      animación y feedback congelados; input ignorado y reanudación sin
      comandos; cinco acciones en orden con teclado y foco; `Esc` raíz reanuda y
      submenú/aviso vuelve; guardado desactivado con motivo por fase, animación
      o paneo; confirmaciones de Nueva y Cargar; controles desde `KEY_BINDINGS`
      sin remapeo; `R` retirada del input y de la ayuda. Resultado y botones
      «Reiniciar» quedan para TASK-0153. Fricción de frontmatter de anexos
      diferida a `harness-keeper`; sin cambios de alcance ni tests debilitados.
      Evidencia en `attempt-1/`, `attempt-2/` y `lead-verify/`.
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

- [x] `Esc` abre la pausa desde cualquier fase: personajes, enemiga, paneo y
      animación; con el panel abierto, el primer `Esc` cierra el panel.
- [x] Con el menú abierto no avanza ningún turno, beat ni animación, y el input
      de juego se ignora; reanudar continúa exactamente desde el mismo estado.
- [x] El menú ofrece en orden Reanudar, Nueva partida, Cargar partida, Guardar
      partida y Controles, navegable con teclado y foco visible.
- [x] `Esc` en el menú raíz reanuda; en un submenú o aviso vuelve al menú.
- [x] Guardar queda desactivado con motivo en texto fuera de la fase de
      personajes, durante animación o paneo; su ejecución es TASK-0140.
- [x] «Nueva partida» y «Cargar partida» piden una confirmación cada una; la
      carga funcional es TASK-0141 y «Nueva» abre el paso 1 de TASK-0123.
- [x] La lista de controles se genera desde el mapa único de teclas y no permite
      remapeo.
- [x] No existe reinicio rápido ni atajo `R`.
- [x] Tests de congelación, input ignorado, reanudación, orden, `Esc` y controles
      sin deriva; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/input.test.ts` y `notice`/pausa nuevos.
- Integración: pausar en fase de personajes, enemiga y animación; reanudar.
- E2E: pausa y orden del menú; la suite completa va en TASK-0144.
- Manual: comprobar que no se mueve el cursor ni el feedback con la pausa.

# Evidencia esperada

- [x] Informes en `artifacts/TASK-0139/attempt-1/report.md` y `attempt-2/report.md`
- [x] Salida de `pnpm run verify` en `attempt-2/verify-output.txt`
- [x] Commit SHA `f0dbe24` y fusión `ff99ae2`

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/input.test.ts tests/unit/host/session.test.ts` | 120 s |
| `pnpm run verify` | 240 s |
| `pnpm run test:e2e` | 180 s |

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

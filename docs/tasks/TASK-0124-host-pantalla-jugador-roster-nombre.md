---
type: Task
id: TASK-0124
title: "Host: pantalla de jugador (roster, nombre, navegación)"
description: "Implementar la configuración jugador a jugador con el roster de nueve arquetipos, dos variantes, nombre de 12 caracteres y navegación «Atrás»/«Siguiente» que conserva valores."
status: stable
task_status: backlog
task_type: feature
requirement: REQ-016
requirement_ids: [R-005, R-007, R-008, R-011, T-005, T-006, T-007]
depends_on: [TASK-0122, TASK-0123]
unlocks: [TASK-0125, TASK-0126, TASK-0127, TASK-0129]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0124/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que cada jugador se configure completo —arquetipo, variante y nombre— antes de
pasar al siguiente, con «Atrás» y «Siguiente» y sin perder lo escrito.

# Contexto

TASK-0123 deja el paso 1 con N y semilla. Esta tarea cubre el flujo jugador a
jugador de [R-008](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-creativos-decididos)
y el nombre de [T-006](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos).
El roster y los nombres por defecto salen de `src/game/roster.ts`; la pantalla
no redefine arquetipos. La ficha visual del arquetipo es TASK-0125 y el resumen
es TASK-0126.

# Criterios de aceptación

- [ ] Cada jugador elige uno de los nueve arquetipos y una de sus dos variantes,
      sin etiqueta de género; se permiten arquetipo y variante repetidos.
- [ ] Cambiar de arquetipo devuelve la variante a la 1; ir atrás y adelante
      conserva arquetipo, variante y nombre.
- [ ] El nombre se acepta en NFC, con espacios recortados, máximo 12 code points
      y solo letras, dígitos y espacio; se trunca en vivo sin mensaje de error.
- [ ] Un nombre vacío usa el nombre del arquetipo; los duplicados están
      permitidos y no bloquean.
- [ ] El flujo es jugador a jugador: «Siguiente» configura al siguiente y en el
      último emite la entrada al resumen (TASK-0126); «Atrás» recorre los ya
      configurados sin volver al paso 1.
- [ ] `Esc` o «Cancelar» piden confirmación y, al confirmar, descartan la
      configuración y vuelven al menú principal.
- [ ] Navegación completa por teclado, foco visible y errores anunciados con
      `aria-live`.
- [ ] Tests de variantes, reset al cambiar arquetipo, nombres con acentos,
      truncado, vacío, duplicados, avance y retroceso; `pnpm run verify` pasa.

# Plan de test

- Unitario: normalización de nombre, defaults y estado de la configuración.
- Integración: avance y retroceso entre 1, 2 y 6 jugadores; cancelación.
- E2E: flujo de dos jugadores; la cobertura completa va en TASK-0129.
- Manual: comprobar que el foco y el truncado se entienden sin color.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0124/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/input.test.ts tests/unit/host/session.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No implementar la ficha completa ni las miniaturas; eso es TASK-0125.
- No implementar el resumen ni «Empezar»; eso es TASK-0126.
- No cambiar el roster, los arquetipos ni sus valores.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Menú principal, paso 1, semilla y cancelación de la partida.
- Render del jugador en el mapa y miniatura del HUD.
- Persistencia de nombres o configuraciones.
- Reordenar jugadores.

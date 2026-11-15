---
type: Task
id: TASK-0129
title: "QA/E2E de la pantalla de inicio"
description: "Cubrir en navegador el menú principal, la configuración de 1, 2 y 6 jugadores, la semilla, el nombre, la variante, la cancelación y el arranque de partida, con capturas."
status: stable
task_status: in_progress
task_type: qa
requirement: REQ-016
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-009, R-010, R-011, R-012, R-013, T-003, T-004, T-005, T-006, T-007, T-008]
depends_on: [TASK-0123, TASK-0124, TASK-0125, TASK-0126, TASK-0127]
unlocks: []
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0129/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
---

# Objetivo

Que el shell de REQ-016 quede verificado en navegador real, con capturas
legibles y sin regresiones de navegación, semilla, nombre, variante ni arranque.

# Contexto

TASK-0123 a TASK-0127 implementan menú, paso 1, jugadores, ficha, resumen y
render. Esta tarea no rediseña: recorre el flujo y reporta. Si algo no encaja, el
defecto vuelve a la tarea propietaria. La carga funcional del menú principal es
REQ-024 y se prueba en TASK-0144.

# Criterios de aceptación

- [ ] El menú principal es la primera pantalla, `Esc` no lo abandona y «Nueva»
      abre el paso 1.
- [ ] Se arranca una partida con 1 jugador y otra con 2; el resumen con 6
      jugadores lista la party y la semilla en solo lectura.
- [ ] Semilla válida, vacía e inválida: la inválida bloquea con mensaje; `?seed=`
      precarga una vez y sigue editable.
- [ ] Nombre con acentos, truncado a 12, vacío con nombre del arquetipo y
      duplicados permitidos.
- [ ] «Atrás» conserva valores; «Cancelar»/`Esc` confirman en paso 1, jugador y
      resumen y vuelven al menú principal.
- [ ] La variante elegida se ve en el mapa y en la miniatura del HUD.
- [ ] El flujo completo se puede hacer solo con teclado, con foco visible y
      avisos legibles sin depender del color.
- [ ] Capturas a 1280×720 y 900×700 en `tests/e2e/<spec>/screenshots/`;
      `pnpm run test:e2e` y `pnpm run verify` pasan.

# Plan de test

- Unitario: `pnpm run verify`.
- Integración: recorrido de 1, 2 y 6 jugadores y cancelación en los tres puntos.
- E2E / visual: spec nuevo de arranque y configuración con capturas.
- Manual: revisar que la semilla y el resumen se leen sin explicación previa.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0129/attempt-1/report.md`
- [ ] Salida de `pnpm run test:e2e` y `pnpm run verify`
- [ ] Capturas del menú, paso 1, jugador, ficha, resumen y mapa con variante
- [ ] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm run test:e2e` | 240 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar reglas, UI ni criterios; los defectos vuelven a su tarea.
- No debilitar, borrar ni saltar tests existentes.
- No probar la carga `.zip`/`.json`; eso es TASK-0144.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Hotseat, turnos, relevo o resultado.
- Guardado, pausa o carga de archivos.
- Botín, muerte o fantasmas.
- Rediseñar la pantalla o cambiar la tabla de sprites.

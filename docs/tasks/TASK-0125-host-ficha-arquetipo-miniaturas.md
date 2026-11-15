---
type: Task
id: TASK-0125
title: "Host: ficha de arquetipo y miniaturas"
description: "Mostrar la ficha completa del arquetipo elegido —nueve atributos, arma temática, nivel de magia y las dos miniaturas de variante— y actualizarla al cambiar de arquetipo."
status: stable
task_status: done
task_type: feature
requirement: REQ-016
requirement_ids: [R-005, R-006, T-003]
depends_on: [TASK-0122, TASK-0123, TASK-0124]
unlocks: [TASK-0126, TASK-0127, TASK-0129]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T09:45:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0125/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T09:45:00Z
    note: >-
      Intento 1 verificado (código bd1c8c6, 39fe050, bc497b6 y 6e524eb;
      evidencia 3e98b09). Diff revisado: solo host, HTML/CSS, tests y
      artefactos; sin cambios en roster, motor, `hud.ts`, dependencias ni docs
      ajenas. `pnpm run verify` reejecutado: 98 archivos/1434 tests, tsc, build
      y bundle OK; E2E completo 224/224, incluidos `?test=1`, reentrada y los
      cinco casos de `player-screen`. Ficha dentro de `player-archetypes`, 18
      celdas de REQ-016, nueve filas desde `ROSTER`, variante seleccionada con
      texto y contorno, sin etiquetas de género. Evidencia en
      `attempt-1/lead-verify/`.
---

# Objetivo

Que al elegir un arquetipo se vea su ficha completa y las dos miniaturas de
variante, de modo que el jugador entienda qué personaje elige antes de
confirmarlo.

# Contexto

TASK-0124 deja el roster y la navegación. Esta tarea añade la información de
[R-006](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-creativos-decididos)
y consume la tabla de 18 celdas de
[sprites](../requirements/REQ-016-pantalla-inicio-configuracion.md#tabla-de-sprites)
y [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md). La variante
elegida se guarda en el estado, pero su render en mapa y HUD es TASK-0127.

# Criterios de aceptación

- [x] La ficha muestra los nueve atributos inherentes del arquetipo, su arma
      temática y su nivel de magia; los datos salen del roster, no de una copia
      en el host.
- [x] La ficha muestra las dos miniaturas de variante del arquetipo usando las
      celdas de 32×32 de `rogues.png` de la tabla de REQ-016.
- [x] La variante seleccionada se distingue visual y textualmente; no hay
      etiquetas de género.
- [x] Al cambiar de arquetipo, la ficha y las dos miniaturas cambian juntas y la
      variante vuelve a la 1.
- [x] La ficha es legible con teclado y las miniaturas tienen nombre accesible.
- [x] No se añaden sprites, dependencias ni cambios de valores del roster.
- [x] Tests de mapeo arquetipo → atributos, arma, magia y celdas de sprite;
      `pnpm run verify` pasa.

# Plan de test

- Unitario: tabla arquetipo → celdas y datos de ficha; reset de variante.
- Integración: cambiar de arquetipo actualiza ficha y miniaturas.
- E2E / visual: captura de la ficha con dos arquetipos; la revisión completa va
  en TASK-0129.
- Manual: comprobar legibilidad de las miniaturas a 1280×720.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0125/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/hud.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No dibujar todavía al jugador en el mapa ni en el HUD; eso es TASK-0127.
- No cambiar la tabla de sprites, el roster ni sus valores.
- No tocar el flujo de nombre, avance o resumen.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Resumen, «Empezar» y arranque de la partida.
- Animación, cámara o retratos del HUD de partida.
- Nuevos arquetipos, variantes o arte final.

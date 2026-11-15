---
type: Task
id: TASK-0127
title: "Render: variante en mapa y miniatura HUD"
description: "Dibujar al jugador con la celda de la variante elegida en el mapa y usar la misma celda en la miniatura del HUD, sin sprites fijos por arquetipo."
status: stable
task_status: done
task_type: feature
requirement: REQ-016
requirement_ids: [R-005, T-003]
depends_on: [TASK-0122, TASK-0124, TASK-0125]
unlocks: [TASK-0128, TASK-0129, TASK-0135, TASK-0150, TASK-0156]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T10:13:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0127/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T10:13:00Z
    note: >-
      Intento 2 verificado (código 87e8629, tests be18481 y 41fbdad, evidencia
      26feb19 y 97277d1). Diff revisado: solo host (`archetype-sheet`, `hud`,
      `renderer`), tests y artefactos; sin arte, tabla, roster, motor, cámara,
      orden de dibujo, dependencias ni docs ajenas. `pnpm run verify` reejecutado:
      99 archivos/1471 tests, tsc, build y bundle OK. E2E completo 229/229 en el
      intento 1 (mismo código de producción) y E2E focalizado 1/1 tras el
      intento 2; puerto 4173 libre. Las capturas del intento 2 muestran la
      miniatura y el sprite del mapa con variante 1 y 2, mismo tile y cámara.
      El intento 2 cierra el mapeo de las 18 celdas y separa la captura del HUD.
---

# Objetivo

Que el sprite del jugador en el mapa y su miniatura en el HUD correspondan a la
variante elegida en la configuración, no a un sprite fijo por arquetipo.

# Contexto

TASK-0125 muestra las dos miniaturas en la ficha. REQ-016
[T-003](../requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos)
exige que la variante forme parte del estado y que mapa y HUD la usen. La tabla
de celdas está en
[REQ-016](../requirements/REQ-016-pantalla-inicio-configuracion.md#tabla-de-sprites)
y [ADR-006](../decisions/ADR-006-arte-placeholder-32rogues.md). El render vive en
`src/host/renderer.ts` y el HUD en `src/host/hud.ts`.

# Criterios de aceptación

- [x] El render del mapa lee la variante del jugador y la traduce a la celda
      `(sx, sy)` de 32×32 de la tabla; no queda un sprite fijo por arquetipo.
- [x] La miniatura del HUD usa exactamente la misma celda que el mapa para el
      jugador activo.
- [x] La variante se conserva al cargar o reconstruir el estado; una variante
      ausente o inválida no se sustituye en silencio por otro arquetipo.
- [x] No cambian animación, cámara, orden de dibujo ni el resto de sprites.
- [x] No se añaden imágenes, dependencias ni cambios en `rogues.png`.
- [x] Tests de mapeo de las 18 celdas y de que mapa y HUD comparten la variante;
      `pnpm run verify` pasa.

# Plan de test

- Unitario: tabla arquetipo/variante → celda; renderer y HUD con la misma
  instancia.
- Integración: arrancar con dos variantes distintas y comprobar el sprite.
- E2E / visual: captura de mapa y HUD con variante 1 y 2; la revisión completa va
  en TASK-0129.
- Manual: comprobar que no hay diferencias de escala entre mapa y miniatura.

# Evidencia esperada

- [x] Informes en `artifacts/TASK-0127/attempt-1/report.md` y
      `artifacts/TASK-0127/attempt-2/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/hud.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar la ficha de arquetipo ni el flujo de configuración.
- No tocar la tabla de sprites, el arte ni el roster.
- No implementar HUD de hotseat, fase enemiga ni relevo.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.
- pnpm, nunca npm ni npx.

# No objetivos

- Retratos finales o animaciones nuevas.
- Variantes adicionales o desbloqueos.
- Cambios de cámara, escala o layout del HUD.

---
type: Task
id: TASK-0127
title: "Render: variante en mapa y miniatura HUD"
description: "Dibujar al jugador con la celda de la variante elegida en el mapa y usar la misma celda en la miniatura del HUD, sin sprites fijos por arquetipo."
status: stable
task_status: in_progress
task_type: feature
requirement: REQ-016
requirement_ids: [R-005, T-003]
depends_on: [TASK-0122, TASK-0124, TASK-0125]
unlocks: [TASK-0128, TASK-0129, TASK-0135, TASK-0150, TASK-0156]
created_at: 2026-11-14T23:31:45Z
completed_at:
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0127/
priority: P1
risk: low
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
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

- [ ] El render del mapa lee la variante del jugador y la traduce a la celda
      `(sx, sy)` de 32×32 de la tabla; no queda un sprite fijo por arquetipo.
- [ ] La miniatura del HUD usa exactamente la misma celda que el mapa para el
      jugador activo.
- [ ] La variante se conserva al cargar o reconstruir el estado; una variante
      ausente o inválida no se sustituye en silencio por otro arquetipo.
- [ ] No cambian animación, cámara, orden de dibujo ni el resto de sprites.
- [ ] No se añaden imágenes, dependencias ni cambios en `rogues.png`.
- [ ] Tests de mapeo de las 18 celdas y de que mapa y HUD comparten la variante;
      `pnpm run verify` pasa.

# Plan de test

- Unitario: tabla arquetipo/variante → celda; renderer y HUD con la misma
  instancia.
- Integración: arrancar con dos variantes distintas y comprobar el sprite.
- E2E / visual: captura de mapa y HUD con variante 1 y 2; la revisión completa va
  en TASK-0129.
- Manual: comprobar que no hay diferencias de escala entre mapa y miniatura.

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0127/attempt-1/report.md`
- [ ] Salida de `pnpm run verify`
- [ ] Commit SHA

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

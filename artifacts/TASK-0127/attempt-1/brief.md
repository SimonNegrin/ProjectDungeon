---
type: Task Brief
title: "TASK-0127: brief del intento 1"
description: Mapa y miniatura del HUD con la variante elegida del jugador.
task: TASK-0127
attempt: 1
status: stable
brief_bytes: 2559
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:05:00Z }
---

# Objetivo

Mapa y miniatura del HUD usan la celda 32×32 del `variant` (1|2) del jugador,
desde la tabla de 18 celdas; sin sprite fijo por arquetipo ni `PORTRAIT_RECTS`
fijo.

# No objetivos

Animaciones, cámara, orden de dibujo, escala, layout, hotseat, fase enemiga,
arte, tabla, roster, ficha o configuración. No tocar «Cargar» ni `?test=1`.

# Invariantes

- `ARCHETYPE_VARIANT_CELLS` intacta; enemigos con `GOBLIN_RECT`; panel de
  inventario sin cambios.
- `renderScene` solo lectura: efectos, cadáveres, puertas y orden intactos.
- Una única resolución compartida por mapa y HUD; sin tabla duplicada.
- `variant` ausente/inválida: variante 1 del **mismo** arquetipo (documentado),
  nunca otro arquetipo; `archetypeId` nulo/desconocido: sin sprite/miniatura.
- `Restart` y `GameSession.load` conservan `variant`.

# Criterios de aceptación

En `docs/tasks/TASK-0127-render-variante-mapa-miniatura-hud.md#criterios-de-aceptación`;
enlazar, no copiar.

# Contexto mínimo

- `src/host/renderer.ts`: bucle de `state.players` (hoy `KNIGHT_RECT`).
- `src/host/hud.ts`: `PORTRAIT_RECTS`, `portraitRect`, `renderPortrait`.
- `src/host/archetype-sheet.ts`: tabla y comentario obsoleto.
- `src/game/types.ts`, `src/game/engine.ts`, `src/host/session.ts`: `Unit.variant`
  y su conservación.
- Tests: `tests/unit/host/renderer.test.ts`, `hud.test.ts`,
  `tests/e2e/party-summary.spec.ts`.
- REQ-016 T-003 y tabla de sprites
  (`docs/requirements/REQ-016-pantalla-inicio-configuracion.md#requisitos-técnicos`).

# Tests exigidos

- Unitario: 18 celdas exactas (9×2); renderer dibuja la celda de la variante; HUD
  coincide con el mapa para el mismo jugador; dos jugadores distintos.
- Integración: `createInitialState({ players })` + renderer/HUD; `Restart`
  conserva la variante.
- E2E nuevo: arranque real con el mismo arquetipo en variante 1 y 2; capturas de
  mapa y HUD; el canvas del tile del jugador cambia y la miniatura usa el
  `background-position` de su celda ×2.
- E2E solo con el `webServer` de Playwright.

# Riesgos y decisiones abiertas

Un jugador sin arquetipo deja de pintarse en el mapa (antes, caballero):
documentarlo y cubrirlo.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`screenshots/`, `logs/`.

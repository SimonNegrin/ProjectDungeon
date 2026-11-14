---
type: Task Brief
title: "TASK-0111: brief del intento 1"
description: Miniatura del HUD ligada al sprite del jugador activo.
task: TASK-0111
attempt: 1
status: stable
brief_bytes: 2539
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T15:00:00Z }
---

# Objetivo

Que la miniatura de la zona Personaje muestre el sprite del jugador activo y
cambie en el mismo render que el nombre y el arquetipo. La corrección es solo el
recorte de `rogues.png` que pinta `hud-portrait`; el resto del HUD de
TASK-0104/TASK-0105 queda intacto.

# No objetivos

- Rediseñar HUD, zonas, disposición, escala, paleta o tokens.
- Reglas, estado, inventario, navegación, snapshot ni render del mapa.
- Arte nuevo, dependencias o cambios en `src/game/**`.
- QA visual completo de REQ-033 (ya cerrado en TASK-0109).

# Invariantes

- `hud-portrait` conserva tamaño, bisel inset, `background-size`,
  `background-repeat`, `image-rendering: pixelated` y hueco en la rejilla.
- El modelo deriva del snapshot (`state.players[0]`) y no guarda estado propio.
- Sin jugador o arquetipo desconocido: recorte seguro, sin nodo vacío ni error.
- No se borran, saltan ni debilitan tests.

# Criterios de aceptación

En `docs/tasks/TASK-0111-ui-retrato-hud-jugador-activo.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/hud.ts`: `HudModel`, `buildHudModel`, `createHudView` y
  `renderSprite`; el retrato aún no está en el modelo.
- `src/host/ui.css`: `.hud-portrait` fija hoy `background-position` estático.
- `src/host/assets.ts`: recortes 32×32 de `rogues.png`.
- `src/game/roster.ts`: `ArchetypeId` y `Unit.archetypeId`; solo lectura.
- `tests/unit/host/hud.test.ts`, `tests/e2e/hud-left-zones-qa.spec.ts` y
  `tests/e2e/qa-visual-revision-ui.spec.ts` (auditoría no bloqueante).
- REQ-022 R-002, ancla `#requisitos-creativos-decididos`.
- **Lee [brief-detalle.md](brief-detalle.md)**: mapa de sprites, posición,
  pruebas y evidencia.

# Artefactos

`artifacts/TASK-0111/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, capturas de guerrero, mago y pícaro a 900×700 y 1280×720, y
commit en `task/TASK-0111`.

# Riesgos y decisiones del lead

- `rogues.png` mide 224×224 y la CSS la pinta a 448: la posición lógica se
  multiplica por 2. No cambies `background-size` ni la escala.
- El render del mapa dibuja el caballero para todos; queda fuera de alcance. La
  aceptación es la miniatura del HUD, no el sprite del mapa.
- Si el sprite no cambia entre arquetipos, la tarea falla aunque el test pase.

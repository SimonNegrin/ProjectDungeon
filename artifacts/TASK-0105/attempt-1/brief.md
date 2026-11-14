---
type: Task Brief
title: "TASK-0105: brief del intento 1"
description: HUD izquierdo en Personaje, Arma y Stats+Traits, con teclas y sugerencia al pie.
task: TASK-0105
attempt: 1
status: stable
brief_bytes: 2886
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:05:00Z }
---

# Objetivo

Recomponer la columna izquierda en tres zonas enmarcadas —Personaje (sprite a la
izquierda, datos a la derecha), Arma actual y Stats+Traits— que sigan al jugador
activo y al estado fantasma. Las teclas y la sugerencia de fin de turno quedan
como texto plano al pie. Fase, turno, PV del enemigo y estado desaparecen del
HUD y siguen solo en `F1`.

# No objetivos

- Ficha derecha, panel, cursor, mapa o marco.
- Reglas, costes, inventario, navegación ni snapshot.
- Arte nuevo, dependencias o cambios de `src/game/**`.
- QA visual final (TASK-0109).

# Invariantes

- Escala, paleta de ocho colores y biseles de TASK-0104 intactos: todo tamaño usa
  `--ui-unit`/`--ui-line` o token de rol; sin literales de color, radios, sombras,
  degradados, blur ni translucidez.
- El HUD izquierdo conserva `ui-outset`; cada zona usa `ui-outset` y fondo
  propio (`--ui-raised`). El pie no lleva marco.
- El modelo se deriva solo del snapshot y no inventa filas ni estados vacíos.
- No se borran, saltan ni debilitan tests: las aserciones antiguas de fase,
  turno, PV enemigo o estado se sustituyen por ausencia en el HUD y presencia en
  `F1`, conservando la cobertura.

# Criterios de aceptación

En `docs/tasks/TASK-0105-ui-hud-izquierdo-tres-zonas.md#criterios-de-aceptación`.

# Contexto mínimo

- `index.html`: marcado de `.hud-left`.
- `src/host/ui.css`: reglas del HUD izquierdo, biseles y retrato.
- `src/host/hud.ts`: `HudModel`, `buildHudModel` y `createHudView`.
- `src/host/hud-detail.ts`: `weaponLabel`, `traitsLabel`, `formatMagic`.
- `tests/unit/host/hud.test.ts`, `tests/e2e/*-hud*.spec.ts`,
  `tests/e2e/frame-qa.spec.ts`, `tests/e2e/generated-map-qa.spec.ts`.
- REQ-033 R-007/R-008 y T-005; REQ-022 R-002/R-003/R-005.
- **Lee [brief-detalle.md](brief-detalle.md)**: marcado, modelo, tests y mandos.

# Artefactos

`artifacts/TASK-0105/attempt-1/`: `report.md`, `verify-output.txt`,
`e2e-output.txt`, capturas a 900×700 y 1280×720 de los estados pedidos y commit
en `task/TASK-0105`.

# Riesgos y decisiones del lead

- A 900×700 la columna mide ≈190 px: el sprite debe caber junto al texto; deriva
  su tamaño de `--ui-unit`, no lo fijes en px.
- Sin arma se oculta la zona entera (nada de «Sin arma»); sin traits no hay
  bloque ni «Sin traits activos»; magia y maná solo con nivel/maná > 0.
- La etiqueta de vida es «PV». Mantén `hud-weapon` y la clase `is-pulsing` en el
  nombre del arma para conservar el feedback de TASK-0083.
- `weapon-hint` y `hud-message` siguen fuera de las zonas, al pie; no son una
  cuarta zona ni llevan marco.

---
type: Task Brief
title: "TASK-0113: brief del intento 1"
description: Stats y traits como listas verticales en el HUD izquierdo y la ficha derecha.
task: TASK-0113
attempt: 1
status: stable
brief_bytes: 2542
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:05:00Z }
---

# Objetivo

Stats y traits del HUD izquierdo (atributos, traits y arma actual) y de la ficha
derecha (objeto, bloques seleccionado/equipado y atributos del aliado) se
renderizan como listas verticales, una entrada por línea, sin `·`.

# No objetivos

- Bisel, su token y su cuantización (TASK-0112): no tocar; si hace falta, reporta.
- Panel, figura, siluetas y cursor (0114-0116), QA visual (0117), docs (0118).
- Valores, fórmulas, catálogo, equipo, reglas, escala, paleta y relieve.

# Invariantes

- PV, MP, magia/maná, acciones y filas numéricas conservan formato y valores.
- Condicionales intactos: sin maná, sin traits, sin arma, bloque vacío.
- Se conservan los `data-testid` actuales de HUD y ficha.
- Listas DOM (`ul`/`li`), no cadenas; ningún `·` entre stats ni traits.
- No se debilitan tests: se adaptan conservando cobertura.

# Criterios de aceptación

En `docs/tasks/TASK-0113-ui-listas-verticales-stats-traits.md`, sección
«Criterios de aceptación».

# Contexto mínimo

- `src/host/hud-detail.ts`: `statsLabel` (141) y `traitsLabel` (228) devuelven
  cadenas con `·`; `allyDetail` (313) vuelca `Atributos` en una fila.
  `itemStats`/`itemTraits` ya devuelven arrays.
- `src/host/hud.ts`: `HudModel.stats/traits` (95-105), `renderStats`/
  `renderTraits` (643-666), `update` (839-849) pinta texto y el arma con `·`.
- `index.html`: 55 (`hud-weapon-stats`), 75-76 (`hud-stats`, `hud-traits`),
  109/150/174 (listas derechas). `ui.css`: `.hud-stats`, `.hud-traits`,
  `.hud-weapon-stats`.
- Tests: `tests/unit/host/hud.test.ts` (95, 117, 312), `hud-detail.test.ts`; E2E
  de HUD y ficha (`equipment-hud`, `combat-equipment`, `default-character`,
  `hud-left-zones`, `hud-three-zones`, `qa-visual-revision-ui`).

# Artefactos

`artifacts/TASK-0113/attempt-1/`: `report.md`, `verify-output.txt`,
`test-output.txt`, `screenshots/` (vía `E2E_ARTIFACTS_DIR`) y `logs/`.

# Riesgos y decisiones abiertas

- El bloque `Atributos` del aliado también usa `·`; R-026 lo incluye: pásalo a
  lista conservando etiqueta y valores, y adapta su test.
- Si `HudModel.stats/traits` pasa a arrays, revisa consumidores y no dupliques
  la composición de etiquetas.
- `pnpm run verify` (120 s) y `pnpm run test:e2e` (180 s).

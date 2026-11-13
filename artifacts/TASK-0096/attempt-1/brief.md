---
type: Task Brief
title: "TASK-0096: brief del intento 1"
description: Objetos del suelo con sprite, icono en el panel, cues y debug.
task: TASK-0096
attempt: 1
status: stable
brief_bytes: 3207
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T20:50:00Z }
---

# Objetivo

Mundo y panel muestran el mismo objeto con su recorte de `items.png`; recoger,
soltar y equipar se presentan en su beat sin duplicar ni parpadear; `F1` y el
snapshot exponen mochila, equipo por hueco, capacidad y suelo; la ayuda muestra
`I` y `Escape` sin `G` ni `1`-`3`.

# No objetivos

- Docs (TASK-0097) y E2E/visual nuevos (TASK-0098).
- Reglas, catálogo, costes, operaciones, HUD lateral, marco, cofres o traits.
- Arte fuera de `items.png`; dependencias nuevas.

# Invariantes

- Host presenta; no decide existencia ni valida huecos/capacidad.
  `ITEMS[...].sprite` es la única fuente del recorte; `src/game/` no importa
  `src/host/`.
- `items.png` es local; se carga con los demás PNG, sin red.
- Suelo: objeto antes de unidades, en su tile, sin tapar unidad ni cursor;
  conserva el parpadeo de `pickupItem`.
- Panel: DOM; icono como fondo CSS posicionado con el mismo `rect` que el mundo.
- `presentationState` retrasa mochila, equipo y suelo hasta el fin del beat: en
  ningún frame el objeto está en origen y destino. `prefers-reduced-motion`
  aplica el estado final de inmediato.
- Actualiza los tests de formas provisionales al sprite; no borres, saltes ni
  debilites. Los E2E de `G`/`1`-`3` son de TASK-0098.

# Criterios de aceptación

En `../../../docs/tasks/TASK-0096-host-objetos-suelo-sprite-debug.md`, sección
«Criterios de aceptación»; no se copian.

# Contexto mínimo

- `src/host/assets.ts`: añade `items` a `ASSET_URLS` y `GameAssets`.
- `src/host/renderer.ts`: `drawImage` con `item.sprite.rect`; retira
  `drawWeaponShape` y el filtro de solo armas.
- `src/game/equipment.ts`: `ItemSprite.rect` ya validado; no toques valores.
- `src/host/inventory-panel.ts`/`-view.ts` e `index.html`: fila con icono.
- `src/host/presentation.ts`/`motion.ts`: cues de inventario; `DropItem` y
  `UnequipItem` necesitan beat y reversión de las tres zonas hasta el fin.
  Reutiliza beats/banners existentes; no inventes copy.
- `src/host/hud.ts`: `KEYS_HELP` con `I`/`Escape`, sin `G`/`1`-`3`; líneas de
  `F1` con mochila, capacidad, equipo por hueco y suelo. Alinea `index.html`.
- `src/host/debug.ts`: `inventory`, `equipment` y `groundItems`; cúbrelo.
- [REQ-018](../../../docs/requirements/REQ-018-inventario-equipo.md#requisitos-técnicos)
  T-010/T-011, R-015..R-017;
  [REQ-017](../../../docs/requirements/REQ-017-feedback-visual-eventos.md#inventario-y-percepción)
  R-011/R-012/R-022;
  [ADR-006](../../../docs/decisions/ADR-006-arte-placeholder-32rogues.md).

# Artefactos

`report.md`, `verify-output.txt`, `focused-test-output.txt`, `logs/`; captura
manual opcional, no sustituye a TASK-0098.

# Riesgos y decisiones abiertas

- Capa del suelo: test de orden objeto → unidad y sin tapar cursor/camino.
- Icono DOM: recorte exacto de 32×32; test de modelo y smoke manual.
- Si un cue exige copy nueva, para y propón.
- No toques los E2E que TASK-0098 actualizará.

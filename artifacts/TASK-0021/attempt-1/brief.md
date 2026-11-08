---
type: Task Brief
title: "TASK-0021: brief del intento 1"
description: Damero y decals deterministas en el host; motor intacto.
task: TASK-0021
attempt: 1
status: stable
brief_bytes: 2515
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T12:10:00Z }
---

# Objetivo

Implementar el damero global y la decoración plana determinista de REQ-007 en el
host: módulo puro, renderer, recuadros, snapshot de solo lectura y tests. Motor,
muros y reglas no cambian.

# No objetivos

E2E/QA visual (`TASK-0022`); props sólidos, interacción, animación, colisiones y
cualquier cambio de reglas o muros.

# Invariantes

- Paridad `(x + y) % 2` en todo tile `floor` visible; muro y no transitable sin
  damero ni decal.
- Dos tonos con una única configuración de tinte (~10 % hacia gris-azul) sobre
  la piedra; diferencia de luminancia; PNG intacto.
- Decals solo de la lista blanca de 32×32 (filas 7–11 e–g, 21–22 a–b, 23 a–d de
  `tiles.png`); sin props sólidos.
- Semilla `279837264`: 12–18 % en salas, 6–8 % en pasillos, un decal por tile
  como máximo, ninguno en `map.spawns` ni `map.doors`.
- Determinismo por semilla; otra semilla cambia decals, no damero.
- `state.grid.tiles` inmutable, sin colisiones; `MoveTo` puede acabar en tile
  decorado. Orden: base → tinte → decals → camino/cursor → unidades → HUD.
- `snapshot()` expone resumen de solo lectura (posición, tipo, área), sin
  mutadores; render y snapshot comparten lista.
- `src/host/floor.ts` puro: sin DOM/Canvas/relojes/`Math.random` ni estado
  global mutable. `src/game/` e `index.html` sin cambios; sin dependencias ni
  imports de `experiments/`; tests intactos.

# Criterios de aceptación

En [TASK-0021 § Criterios](../../../docs/tasks/TASK-0021-host-damero-decoracion.md#criterios-de-aceptación);
plan en [§ Plan de test](../../../docs/tasks/TASK-0021-host-damero-decoracion.md#plan-de-test).

# Contexto mínimo

Ampliado en [`brief-detalle.md`](brief-detalle.md).

# Artefactos

`artifacts/TASK-0021/attempt-1/`: `report.md`, `test-output.txt`,
`verify-output.txt`, `screenshots/` (sala, pasillo y umbral a 1280×720 con
`?seed=279837264`) y commit SHA.

# Riesgos y decisiones abiertas

- Tinte y mezcla (40/20/15/15/10 propuesta) ajustables en playtest; elige uno
  determinista dentro de los rangos y documéntalo. Clasificación: sala dentro de
  un `Room`, pasillo fuera, umbral en `map.doors`; sin mapa, damero sin decals.
- Capturas: ver [`brief-detalle.md`](brief-detalle.md).

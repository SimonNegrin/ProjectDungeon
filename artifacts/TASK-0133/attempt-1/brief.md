---
type: Task Brief
title: "TASK-0133: brief del intento 1"
description: Cadáver de enemigo solo con saqueables, descarte y retirada al vaciar.
task: TASK-0133
attempt: 1
status: stable
brief_bytes: 2152
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:00:29Z }
---

# Objetivo

Al morir un enemigo, transferir solo sus instancias `lootable` a un `Container`
de cadáver en su casilla, descartar el resto con la unidad y retirar el
contenedor al coger el último objeto. Sin saqueables, no se crea contenedor.

# No objetivos

- Render, panel, saqueo desde el mismo tile y costes: TASK-0135/TASK-0136.
- Cambiar el cadáver de jugador más allá de compartir el modelo de contenedor.
- RNG, probabilidad, `lootPolicy`, catálogo, guardado, IA o mapa.
- Añadir campos de estado o una segunda estructura de contenedores.

# Invariantes

- `hp === 0` es la única señal de muerte; el enemigo permanece en `enemies`.
- La contención es la única verdad; sin listas paralelas de objetos.
- `src/game` puro y serializable: sin `src/host`, red ni `Math.random`.
- No borrar, saltar ni debilitar tests. No cambiar reglas de producto.

# Criterios de aceptación

`docs/tasks/TASK-0133-motor-cadaver-enemigo-descarte.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/game/death.ts`: `settleUnitDeath` hoy solo resuelve jugadores.
- `src/game/inventory.ts`: `Container`, `locateSource`, `equipItem` y la retirada
  de instancias de un contenedor.
- `src/game/combat.ts` y `src/game/magic.ts` ya llaman a `settleUnitDeath` al
  llegar a 0 PV.
- `src/game/types.ts` y `src/host/debug.ts`: snapshot de contenedores y
  `lootable` ya existen; no duplicarlos.
- REQ-034 R-001/R-004/R-007 y T-004/T-007. Contrato cerrado en
  `brief-detalle.md`: leerlo antes de editar.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `commit.txt`; sin capturas.

# Riesgos y decisiones abiertas

- La retirada del contenedor debe vivir en la ruta única de retirada de
  contenedores, no en una ruta nueva. Si algo choca con REQ-034, devolver
  `blocked` con evidencia.
- Timeouts: focalizados 120 s; `pnpm run verify` 240 s.

---
type: Task Report Detail
title: "TASK-0048: detalle del intento 1"
description: Fallos E2E restantes y desviaciones para TASK-0049.
task: TASK-0048
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T17:42:00Z }
---

# Fallos E2E restantes (asignados a TASK-0049)

Salida completa y trazas: `e2e-output.txt`. Baseline previo: `e2e-baseline.txt`.
Resumen: 37 fallos / 37 pasan, frente a 50 / 20 del baseline. Ningún test se
borró, saltó o relajó; los specs con coordenadas históricas se adaptaron para
inyectar `BspMapGenerator` con `openBspState` y `?test=1`.

## Grupos

- `combat-equipment-qa`: 4 fallos. `approachEnemy` ya no deja al jugador en el
  lado esperado porque el spawn BSP cambió de `(6,8)` a `(9,27)`; la semilla 1
  produce ahora un resultado de ataque distinto.
- `cursor-qa`: 7 fallos. Cursor inicial y rutas fijas `(6,8)`, `(11,7)`,
  `(11,19)` dependen del spawn/geometría antigua.
- `frame-qa`: 6 fallos. Cámara inicial y HUD esperan `(6,8)`; ahora `(9,27)` y
  cámara `(96,608)`.
- `game-cursor`, `game-input-hud`: 4 fallos. Mismas coordenadas y HUD inicial.
- `floor-qa-ambient`: 3 fallos. Muestreo de puerta/pasillo en posiciones BSP
  antiguas (`(10,27)` ahora es puerta con paleta neutra).
- `generated-map-qa`: 3 fallos. Snapshot/cámara y muestras de muro con spawn
  antiguo.
- `motion-qa`: 8 fallos. Recorridos y cámaras calculados desde `(6,8)`.
- `perception-alarm-qa` / `perception-host-qa`: 2 fallos. `MoveTo` y detección
  fijan enemigos/rutas de la colocación BSP anterior.

## Decisión

Actualizar las expectativas de esos specs al BSP actual (spawn `9,27`, enemigo
`28,5`, cámara `96,608`) o rehacer sus fixtures con posiciones explícitas. Es
trabajo de QA de TASK-0049; no cambia el motor ni el render de TASK-0048.

# Notas de implementación

- `GeneratedMap.openMouths`, `hotspots` y `cavernRoomId` son opcionales; BSP no
  los rellena. `growth` los copia del plan y del contenido.
- La capa F1 usa solo primitivas de Canvas disponibles en el doble de test y no
  dibuja texto cuando `debug` es falso.
- `window.__game.setup(state, generator?)` permite inyectar BSP desde el test con
  import dinámico del módulo de desarrollo; el bundle de producción no incluye
  BSP (guard de TASK-0047 verificado).

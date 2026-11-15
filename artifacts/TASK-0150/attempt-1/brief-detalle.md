---
type: Task Brief Detail
title: "TASK-0150: detalle del brief del intento 1"
description: Enfoque técnico, reglas de paneo, tests y specs E2E del relevo por cámara.
task: TASK-0150
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:10:00Z }
---

# Enfoque pedido

1. Módulo puro `src/host/camera-pan.ts`: 300 ms, interpolación lineal redondeada
   y transición testeable (`none`/`jump`/`pan`) con activo y ronda previos,
   estado final, cámara y `reducedMotion`.
   - Objetivo: jugador activo final (respaldo `players[0]`).
   - Ronda 1 arranca directa: sin cambio de activo/ronda, salto.
   - Relevo: paneo si cambia el activo y hay más de un jugador.
   - Vuelta tras fase enemiga: paneo al primer jugador en rondas > 1; con un
     jugador no hay paneo de relevo, pero la cámara vuelve a él.
   - Reducido o destino igual a la cámara actual: salto sin paneo.
2. `src/host/main.ts`:
   - Cámara en reposo = activo (no `players[0]`); tras `finishAnimation`, salto o
     paneo según la transición.
   - Durante el paneo `render` no recentra ni recoloca el cursor.
   - Reloj rAF propio, cancelado por pausa/carga/nueva/restart/setup, reanudado
     al cerrar la pausa y avanzable desde `advance` (incluido el resto de ms
     después de acabar la animación).
   - `panning` alimenta `pauseContext` (guardado desactivado), el keydown y el
     snapshot de debug (campo opcional en la fuente, `false` por defecto).
   - Al empezar turno, el cursor queda en el activo, no en `players[0]`.
3. Tests unitarios: objetivo, ronda 1, dos jugadores, un jugador, movimiento
   reducido, 300 ms e interpolación. Conserva los tests del gate `panning` de
   `input.test.ts`.
4. E2E nuevo de relevo con dos jugadores: paneo a mitad, comando ignorado y
   aceptado al llegar, destino final = activo y captura. Casos de un jugador y
   `prefers-reduced-motion`.

# Specs E2E a ejecutar por separado

La suite completa supera 180 s. Ejecuta al menos: el spec nuevo,
`feedback-turns-marks-qa`, `game-input-hud`, `motion-qa`, `pause-menu`,
`pause-save-load-qa`, `enemy-phase-offscreen-qa` y `load-game`.

# Notas

- El bloqueo del paneo es adicional al beat de `PlayerTurnStarted` y termina con
  la cámara en el destino.
- No confundas la vuelta de ronda con un aviso: «Ronda N» es TASK-0151.

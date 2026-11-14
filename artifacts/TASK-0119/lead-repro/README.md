---
type: Research Note
title: "TASK-0119: reproducción del lead"
description: Evidencia de la causa real del submenú que no reabre con teclado.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T19:50:00Z }
---

# Hallazgo

El submenú sí se abre con `Enter`; lo que falla es que se cierra en el frame
siguiente. Tras cualquier acción que genera feedback (recoger, equipar,
desequipar, soltar) el host queda en un bucle de `render()` a ~60 fps y cada
`render()` llama a `inventoryPanelView.update(state)`, cuyo `renderModel` hace
`if (menuOpen) closeMenu(false)` aunque el estado sea el mismo objeto.

Cadena:

1. `src/host/main.ts` (`scheduleTextFrame`): reinicia `textLastFrameTime` en
   cada reenganche; `textTick` calcula `raw = 0` siempre, así que
   `advanceTransientFeedback` no descuenta y el banner/damage text no caduca.
   El bucle `requestAnimationFrame` no termina nunca.
2. `src/host/inventory-panel-view.ts` (`renderModel`): cierra el menú abierto en
   cada actualización, sin comparar estado ni modelo.

La selección y el foco DOM son correctos después de cada acción (siguen a la
instancia). La hipótesis de "la selección cae en una celda vacía" no se
reproduce. Parar el bucle con `window.__game.advance(0)` (manualClock) hace que
el menú permanezca abierto: ver `confirm-loop.txt`.

# Guiones

Cada `.mjs` se ejecuta con el servidor Vite en `127.0.0.1:4173` y `node`:

- `confirm-loop.mjs`: bucle activo, `Enter` no mantiene el menú; con el bucle
  parado, sí. Salida: `confirm-loop.txt`.
- `diagnose-loop.mjs`: mide renders y banner tras recoger. Salida:
  `diagnose-loop.txt`.
- `diagnose-stacks.mjs`: pilas de `requestAnimationFrame` → `textTick`.
- `stress-panel2.txt` / `stress-panel.txt`: secuencias con teclado real;
  primer fallo tras ejecutar con feedback.
- `repro*.mjs`: escenarios de las cuatro acciones, personaje desnudo, cambio de
  turno y `Enter` durante la animación.

Nota: `settle()` de los E2E adelanta el reloj y consume el banner, por eso la
suite actual no detecta el fallo.

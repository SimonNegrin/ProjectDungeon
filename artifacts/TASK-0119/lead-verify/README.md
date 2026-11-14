---
type: Verification Note
title: "TASK-0119: verificación independiente del lead"
description: A/B del E2E, suite completa y comprobaciones manuales de refrescos.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T20:03:00Z }
---

# Resultado

Intento 1 verificado y fusionado en `c15d6b8` (fix `df5143f`, informe `35caa4b`).

- A/B del spec nuevo sobre el código previo (`e2e-before-fix.txt`): 2 fallos y
  1 guardia en verde; restaurado el código después.
- Spec nuevo con el arreglo (`e2e-after-fix.txt`): 3/3.
- `pnpm run verify` (`verify.txt`): 94 archivos, 1332/1332, `tsc`, build y
  bundle.
- `pnpm run test:e2e` (`e2e-full.txt`): 211/211.

# Comprobación manual de refrescos

`resize-check.mjs` y `resize-check.txt`, con el submenú abierto sobre el arma
del suelo:

- Resize a 900×700 y vuelta a 1280×720: menú visible.
- `__game.advance(0)` (render con el mismo estado): menú visible.
- `EndTurn` real (estado nuevo, misma selección y opciones): menú visible,
  flechas operativas y sin MP extra.
- `Escape` cierra el menú y deja el foco en la fila.

# Límites

El bucle de render a ~60 fps de `src/host/main.ts` no se toca en esta tarea; la
evidencia está en `artifacts/TASK-0119/lead-repro/` y en el informe del runner.

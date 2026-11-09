---
type: Verification Evidence
title: "TASK-0049: evidencia del lead sobre el flake de floor-qa"
description: Fallo intermitente en la comparación de capturas de página completa y diferencia de píxeles.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T19:12:00Z }
---

# Flake detectado en la verificación independiente

- Comando: `pnpm run test:e2e --repeat-each=3` con `E2E_ARTIFACTS_DIR` temporal.
- Resultado: 227 pasan, 1 falla.
- Test: `tests/e2e/floor-qa.spec.ts:1126` › «misma semilla idéntica y otra semilla
  cambia decals manteniendo el damero».
- Fallo: `Buffer.compare(firstShot, secondShot)` devuelve `-1` en
  `floor-qa.spec.ts:1154`.
- Reproducción dirigida: `pnpm exec playwright test tests/e2e/floor-qa.spec.ts:1126 --repeat-each=50`
  → 47 pasan, 3 fallan (6 %).
- Diferencia: 4 píxeles con delta 1 en `x=122-123`, `y=82-84`; el resto de la
  imagen es idéntica. `pixel-diff.json` y `shot-a.png`/`shot-b.png`.
- La aserción de `canvas.toDataURL()` posterior es idéntica; apunta a una captura
  tomada antes de que el canvas/DOM quede estable, no a un estado distinto.

# Hipótesis de corrección

Esperar a que dos muestras consecutivas de `#game-canvas` separadas por un frame
sean idénticas (y `document.fonts.ready`) antes de cada captura, sin tocar el
estado del juego ni relajar la comparación byte a byte.

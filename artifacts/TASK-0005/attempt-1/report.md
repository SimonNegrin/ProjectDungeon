---
type: Task Report
title: "Informe — TASK-0005: host con encuadre 16:9, render 3× y mapa 12×12"
description: Resultado del intento 1 con cambios, evidencia, comandos y desviaciones.
task: TASK-0005
attempt: 1
status: stable
branch: task/TASK-0005
commit: 4792109f2e845cee8aa2f9e9991424709f2f5f04
created_at: 2026-11-07T17:07:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:07:00Z }
---

# Estado

**done**. Se sustituyó el canvas 960×600 por un marco lógico 16:9 de
682,666…×384 con canvas interno 2048×1152 (3×), mapa cuadrado 12×12 centrado,
laterales negros, cámara 384×384 sobre mundo 640×640 y HUD/feedback fuera del
sub-rectángulo del mapa. `pnpm run test`, `pnpm run verify` y `pnpm run test:e2e`
pasan.

# Cambios por archivo

## Producción

- `src/host/layout.ts` (nuevo): constantes del encuadre (`FRAME_LOGICAL_WIDTH`,
  `FRAME_LOGICAL_HEIGHT`, `RENDER_SCALE`, `CANVAS_WIDTH`, `CANVAS_HEIGHT`,
  `MAP_VIEWPORT`, offsets 448/149,333…), función pura `computeFrameLayout` y
  helpers de porcentajes del feedback respecto al marco.
- `src/host/renderer.ts`: pinta el marco completo de 2048×1152 en negro, aplica
  `ctx.scale(3, 3)`, desplaza el mapa 149,333… px lógicos (448 px de respaldo) y
  recorta al cuadrado de 384×384. El rango visible queda en 12×12 tiles y las
  unidades fuera del viewport no se dibujan. Sigue importando solo tipos del
  motor.
- `src/host/main.ts`: canvas interno 2048×1152, viewport 384×384, cámara sobre
  mundo 640×640, presentación responsive mediante `computeFrameLayout` y
  `ResizeObserver` (el tamaño interno nunca cambia), y feedback DOM posicionado
  con los porcentajes del sub-rectángulo del mapa.
- `index.html`: escenario con contenedor medible `.stage` y marco `.frame`,
  canvas 2048×1152, bandas negras, `image-rendering: pixelated`, HUD fuera del
  marco y overlays/debug dentro del marco.

## Tests

- `tests/unit/host/layout.test.ts` (nuevo): 16:9 exacto, bandas arriba/abajo y
  a los lados, escala, no salirse del espacio, entradas degeneradas sin NaN y
  porcentajes del mapa (21,875 % / 78,125 % / 4,6875 % / 8,333… %).
- `tests/unit/host/camera.test.ts`: viewport 384×384, mundo 640×640, límites
  (256, 256), clamp en los cuatro bordes, centrado y rango visible 12×12.
- `tests/unit/host/renderer.test.ts`: 12×12 tiles, fondo del marco negro,
  escala 3×, offset 448 px de respaldo, recorte del mapa y ausencia de unidades
  fuera del viewport.
- `tests/unit/host/debug.test.ts` y `tests/unit/host/hud.test.ts`: expectativas
  imprescindibles de viewport y límites.
- `tests/e2e/game-render.spec.ts`: canvas interno 2048×1152, proporción 16:9,
  cámara (0,0)/(256,256), viewport 12×12, sub-rectángulo 1152×1152 centrado con
  laterales de 448 px, enemigo fuera del viewport inicial y captura
  `artifacts/TASK-0005/attempt-1/screenshots/frame.png`.
- `tests/e2e/game-input-hud.spec.ts`: sin cambios; se re-ejecutó completo y sus
  capturas históricas de TASK-0003 se restauraron antes de commitear.

# Criterios de aceptación

- [x] **Canvas de respaldo 2048×1152 y lógica 682,666…×384.** Evidencia:
  `layout.test.ts` y `renderer.test.ts`; E2E lee `canvas.width/height` y el
  viewport del snapshot.
- [x] **Marco 16:9 exacto con bandas al redimensionar.** Evidencia:
  `computeFrameLayout` cubierto para 1920×1080, 1000×1000 y 1600×600; E2E
  comprueba `16/9` a 1280×720 y 800×600.
- [x] **Mapa cuadrado 1152×1152 centrado.** Evidencia: `MAP_BACKING_SIZE = 1152`
  y `MAP_OFFSET_BACKING = 448` probados; E2E comprueba
  `448 + 1152 + 448 = 2048` y `mapHeight = canvasHeight`.
- [x] **Exactamente 12×12 tiles de 32 px lógicos.** Evidencia:
  `visibleTileRange` devuelve 12×12 en origen y en el clamp; E2E comprueba
  `viewport.width / tileSize = 12` y `viewport.height / tileSize = 12`.
- [x] **Laterales negro plano sin arte, HUD ni feedback.** Evidencia: primer
  `fillRect` negro a 2048×1152, clip al mapa de 384×384 y prueba de que el
  goblin no se dibuja con cámara inicial. El HUD sigue fuera del marco.
- [x] **Cámara 384×384, centrada salvo en bordes, mundo 640×640.** Evidencia:
  `camera.test.ts` con límites (256, 256), clamp en cuatro bordes y centrado.
- [x] **Jugador en (4,4) arranca en cámara (0,0); enemigo en (15,15) fuera.**
  Evidencia: test de cámara y E2E (`enemies[0].x * tileSize > viewport.width`).
- [x] **Render sin reglas del motor; motor sin layout.** Evidencia: el test
  existente que inspecciona imports de `renderer.ts` sigue pasando y no se tocó
  `src/game/**`.
- [x] **Pixel art nítido.** Evidencia: `imageSmoothingEnabled = false`, 3×
  interno y `image-rendering: pixelated` comprobados en unitarios/E2E.
- [x] **Sin dependencias nuevas.** Evidencia: no se modificaron
  `package.json` ni `pnpm-lock.yaml`.
- [x] **HUD, ataque y feedback funcionales.** Evidencia: E2E de loop completo
  (teclado, HUD, ataque, flash, daño, overlays, debug y reinicio).
- [x] **`pnpm run verify` y E2E pasan con expectativas actualizadas solo donde
  era imprescindible.** Evidencia: `test-output.txt`.

# Comandos, timeouts y resultados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | 16 archivos, 120 tests OK |
| `pnpm run verify` | 180 s | docs:check OK, config:check OK, 120 tests OK, `tsc --noEmit` + Vite build OK |
| `pnpm run test:e2e` | 240 s | 3 tests Chromium OK |
| `pnpm run build` | 120 s | Incluido dentro de `verify`; build OK |

Salida completa en `artifacts/TASK-0005/attempt-1/test-output.txt`.

# Commits y rama

- Rama: `task/TASK-0005`.
- Commit de implementación y evidencia: `4792109f2e845cee8aa2f9e9991424709f2f5f04`
  (`feat(TASK-0005): encuadre 16:9 con render 3x y mapa 12x12`).
- El informe se añade en un commit posterior sobre la misma rama.

# Artefactos

- `artifacts/TASK-0005/attempt-1/report.md`.
- `artifacts/TASK-0005/attempt-1/test-output.txt`.
- `artifacts/TASK-0005/attempt-1/screenshots/frame.png` (1280×720, marco
  completo y HUD visible).

# Desviaciones y limitaciones

- No se adelantó TASK-0006: no hay matriz multi-resolución, baselines nuevas ni
  diff de píxeles a pantalla completa.
- No se expuso el layout de presentación en `window.__game`; la comprobación E2E
  del sub-rectángulo del mapa usa el tamaño interno del canvas y el viewport del
  snapshot, que es determinista y suficiente para esta tarea.
- La captura E2E de `game-render.spec.ts` ahora escribe en
  `artifacts/TASK-0005/attempt-1/screenshots/frame.png` en vez de regenerar
  `artifacts/TASK-0002/attempt-1/screenshots/room.png`. Es un cambio de ruta de
  evidencia, no una expectativa debilitada, y evita sobrescribir el artefacto
  histórico.
- Al ejecutar E2E se regeneran las capturas de `TASK-0003` por diseño del spec
  existente; se restauraron con `git checkout --` antes del commit. No se tocaron
  capturas históricas de `TASK-0002` ni `TASK-0004`.
- Hay un proceso `@playwright/test ... test-server` preexistente (PID 88419,
  iniciado a las 14:55, antes de este intento) en el workspace. No lo inició este
  intento, no escucha en 4173/5173 y no se ha terminado para no interferir con
  otro proceso. Los puertos 4173 y 5173 quedan libres.

# Confirmaciones

- No se ha modificado `src/game/**` ni reglas, valores, comandos, eventos o
  determinismo del motor.
- No se han añadido ni cambiado dependencias (`package.json`,
  `pnpm-lock.yaml` intactos).
- No se ha borrado, saltado (`skip`/`todo`/`only`) ni debilitado ningún test.
  Los cambios de expectativas son consecuencia del nuevo viewport, los límites
  de cámara y el canvas interno.
- No se ha fusionado nada a `main`.
- No quedan servidores ni procesos iniciados por este intento; 4173 y 5173 están
  libres.

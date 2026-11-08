---
type: Task Brief
title: "TASK-0016: brief del intento 1"
description: Viewport 13×13 con jugador centrado, tiles completos y expectativas actualizadas.
task: TASK-0016
attempt: 1
status: stable
brief_bytes: 3641
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:20:00Z }
---

# Objetivo

Dejar el sub-viewport del mapa en 13×13 tiles (416×416 px lógicos) con el jugador
en el tile central, bordes de tiles completos y pixel art nítido; actualizar la
producción y todas las expectativas unitarias/E2E sin debilitarlas.

# No objetivos

- Cambiar requisito, alcance o tamaño elegido; zoom; rediseñar HUD, cursor,
  lateral, feedback o cámara; tocar generación, economía, combate o IA.
- Añadir dependencias o tocar `package.json`/`pnpm-lock.yaml`.
- Editar `docs/`; la documentación la actualiza `requirements-writer`.

# Invariantes

- `TILE_SIZE = 32`, marco 16:9, laterales negros, HUD/overlays sin recortes.
- Cámara sin clamp: `(tile + 0.5) * 32 − viewport/2` cae en múltiplos de 32;
  clamp a `[0, world − viewport]` intacto.
- `visibleTileRange` devuelve exactamente 13 columnas/filas en centro y en los
  cuatro límites (ojo al `ceil` con cámara clampada).
- `MAP_OFFSET_BACKING` y los offsets de dibujo deben ser enteros. Ojo:
  `round(739,555… × 3) = 2219` deja offset 485,5; elegir un ancho de canvas que
  dé offset entero (p. ej. 2218 → 485; desviación interna < 0,05 %) y conservar
  la presentación CSS 16:9.
- BSP: `VIEWPORT_TILES = 13`; origen `player − floor(13/2)`, simétrico, con clamp
  `[0, 32 − 13]`. Mantener enemigo fuera del viewport inicial y distancia de
  camino ≥ 12 con la semilla de referencia.
- No borrar, saltar ni debilitar tests: actualizar expectativas de 384, 1152,
  2048, 448 y 12×12 donde corresponda.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0016-viewport-13x13.md#criterios-de-aceptación`. No se
copian aquí.

# Contexto mínimo

- `src/host/layout.ts`, `src/host/camera.ts`, `src/host/renderer.ts`,
  `src/host/cursor-view.ts`, `src/host/geometry.ts`.
- `src/game/bsp.ts` (`VIEWPORT_TILES`, `chooseSpawns`).
- `index.html` (`.map-overlay`, cursor y feedback).
- Tests: unit `tests/unit/host/{layout,camera,renderer,cursor,debug,hud}.test.ts`
  y `tests/unit/game/map.test.ts`; E2E `frame-qa`, `game-render`, `game-map`,
  `game-cursor`, `generated-map-qa`, `cursor-qa`.
- Requisito: `docs/requirements/REQ-005-viewport-impar-13.md#requisitos-técnicos`.

# Comandos y timeouts

| Comando | Timeout |
|---|---:|
| `pnpm run test` | 120 s |
| `pnpm run verify` | 180 s |
| `pnpm run test:e2e` | 240 s |
| `pnpm run build` | 120 s |

Servidores en background solo con puerto fijo, comprobación de salud y cierre;
no dejar procesos huérfanos ni esperas indefinidas.

# Artefactos

- `artifacts/TASK-0016/attempt-1/report.md` según `docs/templates/task-report.md`.
- `test-output.txt`, `verify-output.txt`, `e2e-output.txt`, `screenshots/` con
  jugador centrado, bordes completos y debug 416×416, y SHA del commit.
- Devolver informe con estado, desviaciones y fricción `pending`; no cerrar la
  tarea ni fusionar.

# Riesgos y decisiones abiertas

- Offset de respaldo no entero si se conserva el ancho interior exacto; priorizar
  offsets enteros dentro de la desviación permitida.
- El viewport mayor puede dejar al enemigo de la semilla de referencia dentro o a
  menos de 12 de camino: verificarlo, sin cambiar la distancia mínima.
- Barrido amplio de expectativas: buscar 384/1152/2048/448/12×12 en tests y
  comentarios de producción.

# Desbordamiento

Detalle en `brief-detalle.md`. El runner lo lee: no.

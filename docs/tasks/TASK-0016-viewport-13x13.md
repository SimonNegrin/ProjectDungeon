---
type: Task
id: TASK-0016
title: "Host, render y tests: viewport 13×13 centrado con tiles completos"
description: Cambia el sub-viewport del mapa de 12×12 a 13×13 tiles, actualiza cámara, render, aparición y todas las expectativas unitarias/E2E, y conserva el pixel art nítido y el encuadre 16:9.
status: stable
task_status: done
task_type: feature
requirement: REQ-005
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-006, T-001, T-002, T-003, T-004, T-005, T-006, T-007]
depends_on: [TASK-0015]
unlocks: [TASK-0017]
created_at: 2026-11-08T09:12:11Z
completed_at: 2026-11-08T09:24:00Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0016/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T09:12:11Z }
verified:
  - by: task-lead
    at: 2026-11-08T09:24:00Z
    note: "Verificación independiente: diff completo de 5 archivos de producción (layout, renderer, cursor-view, bsp, index.html) y 13 de tests; sin docs/, package.json, pnpm-lock ni dependencias. `pnpm run verify` OK (89 documentos, 3 agentes/9 skills, 308 tests en 27 archivos, build 47 módulos) y `pnpm run test:e2e` OK (29/29); build incluido en verify. Revisados los 11 criterios: 13×13/416×416, marco 416 y 16:9, cámara en múltiplos de 32, rango exacto de 13×13 en centro y bordes, clamp intacto, canvas 2218×1248 con offset entero 485 y laterales iguales, cursor/camino limitados, BSP simétrico con enemigo de referencia fuera y distancia 59, HUD/overlays sin recorte en 1280×720, 1920×1080 y 900×700. Capturas revisadas (jugador centrado, borde, debug 416×416, marcos y cursor). Sin tests borrados, saltados ni debilitados: solo expectativas 384/1152/2048/448/12×12 actualizadas y comprobaciones añadidas. Desviación aceptada: canvas interno 2218×1248 (0,03 % de 16:9) para offset entero; overlay exacto difiere del dibujo 0,11 px lógicos, dentro de tolerancia. Fricción de capturas E2E en artefactos históricos: clasificada como arnés, `deferred` y elevada a requirements-writer con evidencia. Commits `71627da` (implementación y artefactos), `57f6ba5` (informe) y fusión `3205cb1`."
---

# Objetivo

Que el mapa se vea en un recuadro cuadrado de 13×13 tiles: el jugador ocupa el
tile central cuando la cámara no está limitada y los cuatro bordes muestran tiles
completos, sin medios tiles. Se mantienen el marco 16:9, los laterales negros, el
HUD, el cursor y la cámara actuales.

# Contexto

- Requisito: [REQ-005](../requirements/REQ-005-viewport-impar-13.md).
- Encuadre y constantes: `src/host/layout.ts`, `src/host/camera.ts`,
  `src/host/renderer.ts`, `src/host/cursor-view.ts`.
- Aparición: `VIEWPORT_TILES` y `chooseSpawns` en `src/game/bsp.ts`.
- Estructura y overlay: `index.html` (`.map-overlay`, cursor y feedback).
- Tests afectados: `tests/unit/host/layout.test.ts`, `camera.test.ts`,
  `renderer.test.ts`, `cursor.test.ts`, `debug.test.ts`, `hud.test.ts`,
  `tests/unit/game/map.test.ts` y los E2E `frame-qa`, `game-render`,
  `game-map`, `game-cursor` y `generated-map-qa`.

# Diseño técnico de referencia

- `MAP_TILES_PER_AXIS = 13`; `MAP_VIEWPORT = { width: 416, height: 416 }`.
- `FRAME_LOGICAL_HEIGHT = 416`; `FRAME_LOGICAL_WIDTH = 416 * 16 / 9 =
  739,555…`; el canvas de respaldo y `MAP_BACKING_SIZE` se derivan de ahí.
- La cámara no necesita un caso especial: con viewport impar,
  `(tile.x + 0.5) * 32 − 208` es múltiplo de 32 cuando no hay clamp. Verificarlo
  con tests y eliminar cualquier comentario que asuma medios tiles.
- El origen del rectángulo de aparición del BSP debe ser
  `player.x − Math.floor(VIEWPORT_TILES / 2)` y análogo en Y. Mantener la
  distancia mínima de camino de 12 tiles.
- Elegir dimensiones de canvas y offset de mapa que dejen el mapa centrado y los
  tiles en píxeles enteros de respaldo. Si el ancho interno no da 16:9 exacto,
  la desviación debe ser <0,05 % y la presentación CSS sigue siendo 16:9.
- El overlay `.map-overlay` puede conservar `left: 21.875%` y `width: 56.25%`
  porque el mapa sigue siendo un cuadrado dentro de un marco 16:9; comprobar que
  el cursor, el camino y el feedback caen sobre el tile correcto.
- Actualizar los comentarios de producción que digan 12×12, 384, 2048×1152,
  1152 o 448 px cuando hayan quedado obsoletos.

# Criterios de aceptación

- [ ] `MAP_TILES_PER_AXIS` es 13 y el viewport lógico mide 416×416; el marco
      lógico mide 416 px de alto y mantiene 16:9.
- [ ] Lejos de los bordes, el jugador ocupa el tile central: 6 tiles completos a
      cada lado, arriba y abajo; no se renderiza ningún medio tile.
- [ ] La cámara se limita a los bordes del mapa como antes y en los bordes no
      aparecen medios tiles; el jugador sigue visible.
- [ ] El rango visible es exactamente 13×13 tiles y la cámara centrada cae en
      múltiplos de 32 px.
- [ ] El cursor puede recorrer los 13×13 tiles visibles, se limita al viewport y
      sus puntos de camino se recortan igual que antes.
- [ ] El BSP calcula el rectángulo inicial de 13×13 de forma simétrica y el
      enemigo de la semilla de referencia sigue fuera, con distancia de camino
      ≥12.
- [ ] El canvas de respaldo, `MAP_BACKING_SIZE`, el offset del mapa y los
      laterales negros se recalculan; el mapa sigue centrado y el pixel art no se
      ve borroso ni con tiles de grosor desigual.
- [ ] El canvas se presenta en 16:9 y el HUD, los overlays, el feedback y el
      debug no se recortan en 1280×720, 1920×1080 y 900×700.
- [ ] Todos los tests unitarios y E2E afectados se actualizan sin borrar,
      saltar ni debilitar su intención.
- [ ] `pnpm run verify`, `pnpm run test:e2e` y el build pasan.
- [ ] No se añaden dependencias ni se cambian reglas de movimiento, combate,
      turnos, IA, economía o generación (salvo la comprobación del viewport de
      aparición).

# Plan de test

- **Unitario:** derivaciones de layout; cámara centrada, clamps en los cuatro
  bordes y rango visible 13×13; renderer con 13×13 tiles y offset entero;
  cursor limitado al viewport; snapshot/debug/HUD con viewport 416×416; spawn del
  BSP fuera del rectángulo 13×13 y distancia ≥12.
- **Integración:** arranque del host, cámara tras mover al jugador, cursor y
  feedback sobre el tile correcto.
- **E2E / visual:** encuadre 16:9 y mapa 1:1 en tres ventanas, 13×13 tiles,
  laterales negros, cámara centrada y limitada, cursor/camino y QA visual de
  capturas. Revisar que no haya medios tiles ni borrosidad.
- **Manual:** comparar el recuadro con el anterior y confirmar que el jugador se
  ve centrado y los bordes completos.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios de layout, cámara, render, cursor, HUD y BSP |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |
| `pnpm run test:e2e` | 240 s | Encuadre, mapa, cursor y QA visual |
| `pnpm run build` | 120 s | Build final |

# Evidencia esperada

- [ ] Informe en `artifacts/TASK-0016/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0016/attempt-1/test-output.txt`
- [ ] Salida E2E en `artifacts/TASK-0016/attempt-1/e2e-output.txt`
- [ ] Capturas en `artifacts/TASK-0016/attempt-1/screenshots/` con el jugador
      centrado, los bordes completos y el debug con el viewport 416×416
- [ ] Commit SHA en la rama `task/TASK-0016`

# Restricciones

- No cambiar el tamaño de tile (32 px), la relación 16:9, el HUD ni la
  disposición de los laterales.
- No cambiar la distancia mínima de aparición (12 tiles de camino).
- No cambiar el tamaño del mapa, la generación BSP, la economía de turno, el
  combate ni la IA.
- No añadir dependencias ni tocar `package.json`/`pnpm-lock.yaml`.
- No editar `docs/`; la hoja de requisitos, el diseño y los índices los actualiza
  `requirements-writer`.
- No borrar, saltar ni debilitar tests. Actualizar las expectativas de tamaño es
  parte de la tarea.
- Mantener el determinismo y la nitidez del pixel art.

# No objetivos

- Elegir 11×11 o 15×15; el usuario ya eligió 13×13.
- Zoom, viewport no cuadrado o viewports distintos por eje.
- Rediseñar cámara, cursor, HUD, laterales o feedback.
- Cambiar el arte, las animaciones o el audio.
- Hotseat, multijugador, guardado o red.

# Notas

- El cambio es pequeño en producción, pero amplio en expectativas de tests
  hardcodeadas; revisar todas las referencias a 384, 1152, 2048, 448 y 12×12.
- Priorizar una solución con offsets enteros de respaldo sobre conservar una
  proporción interna 16:9 exacta: la presentación final ya la impone el marco y
  lo importante es que los tiles no caigan en medios píxeles.
- Comprobar especialmente `visibleTileRange` en los bordes y con la cámara
  clampada, porque un cálculo con `ceil` puede devolver una columna extra.

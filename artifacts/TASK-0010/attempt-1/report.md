---
type: Task Report
title: "Informe — TASK-0010: host con mapa generado, semilla, muros y debug"
description: Integración del mapa BSP 32×32 en el host con semilla por URL/R/F2, GameSession con estado reproducible, wallTileFor por borde, suelo determinista, snapshot ampliado y capa F1 con salas, huecos, spawns y pasillos anchos.
task: TASK-0010
attempt: 1
report_status: completed
status: stable
result: implemented
branch: task/TASK-0010
commit: 04830cc64e75e0dcb875eedfe7edf988046c0ae9
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:15:00Z }
---

# Resumen

El host deja de usar la sala fija de 20×20 y arranca con el mapa generado de
`REQ-003` v2:

- Partida creada con `createInitialState({ seed })`; jugador y enemigo salen de
  `state.map.spawns`; mundo de 32×32 tiles (1024×1024 px).
- Semilla por `?seed=<entero>`, por defecto `279837264`; `R` reinicia con la
  misma semilla y `F2` genera una semilla nueva en el host y regenera el mapa.
- `GameSession` conserva semilla, opciones y generador y reconstruye el estado
  con ellos al reiniciar o regenerar.
- `wallTileFor(grid, x, y)` decide el muro por borde: `wallSide1` solo con suelo
  al sur; `wallTop` en el resto; `wallSide2` no se usa.
- Suelo con variantes deterministas por coordenada y semilla, sin
  `Math.random`.
- `F1` muestra semilla, salas (límites y rol), huecos con orientación, spawns y
  pasillos anchos con anchura, longitud y carril real; sigue oculta por defecto.
- `window.__game.snapshot()` expone `seed`, `rooms`, `corridors`, `doors` y
  `spawns`, además de los datos anteriores, todo serializable.
- Se mantienen el marco 16:9, la cámara, el HUD y el feedback de ataque.

La semilla de referencia produce 9 salas, 10 corredores, 18 huecos, 1 pasillo
ancho (26 tiles de path, carril real 8), spawns jugador `(6,8)` y enemigo
`(23,28)` con distancia 59.

`pnpm run test`, `pnpm run verify` y `pnpm run test:e2e` pasan. No se ha tocado
el generador, los validadores, `src/game/map.ts`, `src/game/bsp.ts`, el
`Restart` por defecto de `engine.ts`, el HUD, el encuadre ni las dependencias.

# Cambios

Producción:

- `src/host/wall.ts` (nuevo): `WallTile = 'wallTop' | 'wallSide1'` y
  `wallTileFor(grid, x, y)` pura, sin DOM ni Canvas. Solo importa tipos del
  motor.
- `src/host/seed.ts` (nuevo): `parseSeedParam(search)` con semilla por defecto,
  normalización a 32 bits sin signo y aviso no vacío para valores inválidos;
  `nextSeed(previous, random?)` con `crypto.getRandomValues`/`Date.now()` y
  `random` inyectable.
- `src/host/session.ts`: constructor `GameState | CreateInitialStateConfig`,
  conserva `seed`, `options` y `generator`, getter `seed`, `Restart` propio que
  reconstruye con la semilla de la sesión y `regenerate(seed)`.
- `src/host/main.ts`: lee `window.location.search`, avisa con `console.warn` si
  la semilla es inválida, recalcula `world`/`bounds`/cámara en cada render y
  añade la acción host de `F2` (limpia feedback y eventos, no cierra el debug).
- `src/host/input.ts`: intención `new-seed` para `F2`, disponible también con
  partida terminada, y `f2` en `MANAGED_KEYS`.
- `src/host/renderer.ts`: `floorTileFor(x, y, seed)` determinista y muros vía
  `TILE_RECTS[wallTileFor(...)]`. Sin `wallSide2`.
- `src/host/debug.ts`: snapshot con `seed`, `rooms`, `corridors`, `doors` y
  `spawns` clonados desde `state.map` (o `null`/arrays vacíos sin mapa).
- `src/host/hud.ts`: `buildDebugModel` añade `Semilla`, `Salas`, `Huecos`,
  `Spawns`, `Pasillos anchos` y `F2 nueva semilla`.

Tests:

- Nuevos `tests/unit/host/wall.test.ts` (tabla de vecinos, bordes, mapa real,
  nunca `wallSide2`) y `tests/unit/host/seed.test.ts` (ausencia, válidos,
  signo, fuera de rango, inválidos, aviso y `nextSeed`).
- `tests/unit/host/session.test.ts`: arranque con semilla, spawns, `R` conserva
  semilla/mapa, `regenerate` cambia semilla/mapa y sesión manual reinicia al
  estado por defecto; se conservan input/ataque/turno/rechazo.
- `tests/unit/host/camera.test.ts`: mundo 1024, bounds 640, cámara inicial
  `(16,80)`, clamp en los cuatro bordes y rango visible.
- `tests/unit/host/renderer.test.ts`: `wallTop` en borde superior, `wallSide1`
  con suelo al sur, ausencia de `wallSide2`, dibujos idénticos entre renders y
  estado sin mutar.
- `tests/unit/host/debug.test.ts` y `hud.test.ts`: snapshot y overlay con mapa
  generado, round-trip JSON y caso sin mapa conservado.
- `tests/unit/host/input.test.ts`: `F2` produce `new-seed`, también con partida
  terminada; repetición ignorada.
- E2E: nuevo `tests/e2e/game-map.spec.ts` y helper `tests/e2e/support.ts` con
  BFS para rutas reales. Actualizados `game-render`, `game-input-hud` y
  `frame-qa` al mapa 32×32, spawns, cámara y debug, sin teletransportes ni
  `Math.random` en tests.

# Comandos y resultados

Todos los comandos se ejecutaron con el timeout explícito del tool de shell
(el binario `timeout` no existe en macOS/zsh). No se dejaron servidores en
background: Playwright usa su `webServer` y lo cierra solo.

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm exec tsc --noEmit` | 130 s | OK |
| `pnpm run test` | 120 s | 22 archivos, **238 tests OK** |
| `pnpm run verify` | 180 s | OK: docs:check (67 documentos, 11 tareas, 2 experimentos), config:check (3 agentes, 9 skills), test y build |
| `pnpm run build` (dentro de verify) | 120 s | OK, 43 módulos |
| `pnpm run test:e2e` | 240 s | **12 tests OK**, 14,5 s |
| `pnpm exec playwright test tests/e2e/game-map.spec.ts` | 180 s | OK (validación intermedia) |
| `pnpm exec playwright test tests/e2e/frame-qa.spec.ts` | 240 s | 7 tests OK (validación intermedia) |

Salidas completas en `test-output.txt`, `verify-output.txt` y `e2e-output.txt`.

# Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| La partida arranca con mapa 32×32 y spawns del mapa; jugador en sala con salida y enemigo fuera del viewport | Cumple | E2E `game-map`/`game-render`: 1024 tiles, spawns `(6,8)`/`(23,28)`, enemigo fuera de cámara |
| La cámara sigue al jugador, se limita al mundo y se recentra tras `R`/`F2` | Cumple | Unit `camera.test.ts` (bounds 640, clamp 4 bordes); E2E cámara en NW/NE/SW/este y `F2` con `expectedCamera` |
| `wallSide1` solo con suelo al sur; `wallTop` en el resto; sin `wallSide2`; esquinas y pasillo ancho legibles | Cumple | `wall.test.ts`; `renderer.test.ts`; capturas `wall-corner.png` y `wide-corridor.png` |
| Suelos deterministas y sin cambios entre frames | Cumple | `renderer.test.ts` compara dos secuencias de draws; `floorTileFor` puro |
| `?seed` fija semilla; sin parámetro `279837264`; `R` conserva; `F2` cambia y regenera | Cumple | `seed.test.ts`; `session.test.ts`; E2E `game-map` y `game-input-hud` |
| `F1` muestra semilla, salas, huecos, spawns y pasillos anchos; oculta por defecto; no altera la partida | Cumple | `hud.test.ts`; E2E `game-map`: overlay visible/oculto y snapshot idéntico |
| `window.__game` expone seed/rooms/corridors/doors/spawns | Cumple | `debug.test.ts`; `snapshot.json`; round-trip JSON |
| HUD, encuadre 16:9 y feedback de ataque siguen funcionando | Cumple | `frame-qa` (3 viewports), `game-input-hud` (ataque, flash, daño, victoria/derrota) |
| Tests unitarios de muros y semilla; integración de render/cámara | Cumple | 238 tests unitarios, 12 E2E |
| `pnpm run verify` pasa sin debilitar tests | Cumple | `verify-output.txt`; E2E adaptados, no eliminados |

# Métricas del mapa de referencia

Semilla `279837264`, 32×32, opciones de referencia 9/4/11/20.

| Métrica | Valor |
|---|---:|
| Salas | 9 (2 large, 4 medium, 3 small) |
| Corredores | 10 (8 árbol + 2 bucles) |
| Huecos de puerta | 18 |
| Pasillos anchos | 1 (`0→1`, 26 puntos de path, 25 tiles de longitud, carril real 8) |
| Spawn jugador | `(6,8)` |
| Spawn enemigo | `(23,28)` |
| Distancia de camino | 59 |
| Cámara inicial | `(16,80)` |
| Límites de cámara | `(640,640)` |
| Suelo / conectividad | 100 % alcanzable (validado por el generador de TASK-0009) |

# Capturas y artefactos

```text
artifacts/TASK-0010/attempt-1/
  brief.md
  report.md
  test-output.txt
  verify-output.txt
  e2e-output.txt
  snapshot.json              # snapshot completo de window.__game (seed, rooms, ...)
  screenshots/
    debug-on.png             # F1 con semilla, salas, huecos, spawns y pasillos anchos
    debug-off.png            # mismo estado con el overlay oculto
    wall-corner.png          # esquina suroeste de la sala 0
    wide-corridor.png        # pasillo ancho 0→1 (2 tiles)
    frame.png                # marco 16:9 del mapa generado (game-render)
    frame-1280x720.png       # invariantes de encuadre adaptadas
    frame-1920x1080.png
    frame-narrow.png
    camera-edge.png
    hud.png, attack.png, victory.png, defeat.png, debug.png
```

No se sobrescribieron las capturas históricas de TASK-0003/0005/0006: los
specs modificados escriben ahora en `artifacts/TASK-0010/attempt-1/screenshots/`.
Tras ejecutar el E2E se restauraron las capturas de TASK-0007 que reescribe el
spec de experimentos, para no alterar evidencia histórica.

# Desviaciones y limitaciones

1. **Caso E2E “el enemigo aparece en dos turnos” sustituido por una aserción de
   `R-007`.** Con el mapa generado el enemigo está a 59 tiles de camino y el
   viewport es de 12×12; no puede aparecer en dos turnos. El test comprueba ahora
   que el enemigo empieza fuera del viewport, que la distancia declarada es ≥12 y
   que sigue fuera mientras la distancia Chebyshev supera el viewport. No se
   eliminó cobertura de cámara ni de visibilidad.
2. **Esquina sureste exacta en `frame-qa`.** El clamp `(640,640)` exige entrar en
   la sala 8, ocupada por el enemigo, y alteraría la partida. Se comprueba el
   clamp este `(640,336)` en la sala 7 con una ruta BFS real y el clamp sur
   `(0,640)` en la ruta suroeste. Los tests unitarios de cámara sí cubren los
   cuatro bordes del mundo 1024×1024, incluida `(640,640)`.
3. **Rango visible de 13 columnas/filas parciales en el arranque.** La cámara
   centrada en `(6,8)` cae en `(16,80)`, que no está alineada con la rejilla; el
   viewport sigue midiendo 12×12 tiles (384 px) pero intersecta fragmentos de 13
   columnas/filas. Se adaptó la aserción al rango real, sin cambiar cámara ni
   encuadre.
4. **`F2` no se expone como comando del motor.** Es una acción de host (como
   `F1`), así que solo se prueba con teclado/E2E; `window.__game.dispatch` sigue
   aceptando comandos del motor y `Restart`.
5. **Sin puertas físicas, barricadas, escaleras ni pasillos de 3 tiles.** `doors`
   es solo información serializable y el render no dibuja puertas. El ancho 3
   queda fuera de alcance.
6. **Sin cambios en el HUD ni en la ayuda de teclas.** `F2` se menciona solo en
   la capa de debug, como pide el brief.

# Preguntas para el lead

- Confirmar que la sustitución del caso de esquina sureste por los clamps este y
  sur (manteniendo los cuatro bordes en tests unitarios) es aceptable para la
  verificación.
- Confirmar que el cambio de expectativa “enemigo visible en dos turnos” por la
  invariante de distancia de `R-007` es la adaptación esperada al mapa 32×32.

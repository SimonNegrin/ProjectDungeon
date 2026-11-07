---
type: Task Report
title: "Informe — TASK-0011: E2E y QA visual del mapa generado"
description: Spec Playwright generated-map-qa con carga determinista, estructura 32×32, salas, huecos, pasillos anchos, spawns, cámara, F1/R/F2, HUD, encuadre, muros por borde a nivel de píxel, capturas y rendimiento; sin cambios de producción.
task: TASK-0011
attempt: 1
report_status: completed
status: stable
result: implemented
branch: task/TASK-0011
commit: b94dd8117efb2d63b56c87d52094ebdb422d670f
artifacts: artifacts/TASK-0011/attempt-1/
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T23:29:35Z }
verified:
---

# Resumen

Añadida la spec E2E `tests/e2e/generated-map-qa.spec.ts` con cuatro tests que
verifican el mapa generado de `REQ-003` v2 desde los criterios, no desde la
implementación:

1. carga determinista, snapshot serializable, 32×32, salas 8-12, huecos 1-3 por
   sala, pasillos anchos 1-2 con anchura real, spawns, BFS propio, cámara y
   enemigo fuera del viewport;
2. muros por borde: regla estructural en todos los muros totalmente visibles y
   comparación píxel a píxel de cada bloque 96×96 contra los sprites
   `wallTop`/`wallSide1`, sin `wallSide2`, más capturas del mapa y detalles;
3. `F1`/`R`/`F2`, HUD completo y encuadre 16:9;
4. generación 32×32 en navegador (<100 ms) y ventana de frames sin tirones.

No se ha tocado código de producción. El E2E no ha encontrado ningún fallo real
del mapa, los muros, la cámara, el HUD ni el encuadre. `pnpm run test`,
`pnpm run verify` y la suite E2E completa pasan.

La semilla de referencia `279837264` produce 9 salas, 10 corredores, 18 huecos,
1 pasillo ancho `0→1` de 2 tiles y carril real 8, spawns `(6,8)`/`(23,28)` con
distancia BFS 59, cámara `(16,80)` y límites `(640,640)`. La ejecución final de
`F2` generó la semilla `3304860892` (9 salas, 1 pasillo ancho, spawns
`(6,6)`/`(28,4)`, distancia 48, cámara `(16,16)`), que también cumple los
rangos. `F2` es aleatorio por diseño: el test comprueba los rangos en cada
ejecución y no relaja el requisito.

# Corrección tras verificación del lead

La primera captura `wide-corridor.png` se tomaba con la cámara inicial
`(16,80)` y el recorte centrado en mundo `(2*32, 8.5*32)`. En ese tramo el
corredor `0→1` solo tiene 1 tile de ancho: `(1,8)=floor`, `(2,8)=wall`,
`(3,8)=floor`. La imagen mostraba el tramo estrecho, no el pasillo de 2 tiles.

El test se ha corregido sin tocar producción ni debilitar aserciones:

- antes de la captura se camina con `walkTo(page, 3, 12)` (comandos reales
  aceptados) hasta que la cámara queda en `(0,208)`;
- se comprueba en el snapshot que `(1,16)` y `(2,16)` son suelo y `(0,16)` y
  `(3,16)` son muro, repetido en `y = 13, 16, 20`;
- se comprueba que el rectángulo de mundo del recorte contiene las columnas
  `x=1` y `x=2` completas y las filas `y=16` y `y=17`;
- el recorte se centra en `(2*32, 16.5*32)`, dentro del tramo ancho real.

La nueva captura muestra dos columnas de suelo entre los muros laterales. El
análisis de píxeles del PNG final da, en una fila horizontal central, muro a la
izquierda, **dos tiles de suelo consecutivos** en el centro y muro a la derecha.
Commit de la corrección: `b94dd8117efb2d63b56c87d52094ebdb422d670f`.

# Cambios

- `tests/e2e/generated-map-qa.spec.ts` (nuevo): spec autocontenida y determinista
  con viewport 1280×720, `window.__game.snapshot()` y comandos reales
  (`Move`/teclado). No usa `Math.random` para rutas ni semillas ni inyecta estado.
- `artifacts/TASK-0011/attempt-1/`: brief, informe, salidas de test/verify/E2E,
  `performance.txt` y cinco capturas.
- No hay cambios en `src/`, `package.json`, `pnpm-lock.yaml`, HUD, encuadre,
  economía de turno ni `docs/`.

Commit de implementación y evidencia (incluye la corrección de la captura):
`b94dd8117efb2d63b56c87d52094ebdb422d670f`.

Diff resumido: 1 spec nuevo y artefactos de evidencia, con la corrección del
recorte `wide-corridor`; ninguna modificación de producción.

# Comandos y resultados

Todos los comandos se ejecutaron con timeout explícito del tool de shell (macOS
no incluye el binario `timeout`). Playwright usó su `webServer` en el puerto 4173
y lo cerró solo; no quedaron servidores en background.

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm exec tsc --noEmit` | 130 s | OK | incluido en `verify-output.txt` |
| `pnpm run test` | 120 s | 22 archivos, **238 tests OK** | `test-output.txt` |
| `pnpm run verify` | 180 s | OK: docs:check (70 documentos, 11 tareas, 2 experimentos), config:check (3 agentes, 9 skills), 238 tests y build (43 módulos) | `verify-output.txt` |
| `pnpm exec playwright test tests/e2e/generated-map-qa.spec.ts` | 240 s | **4 tests OK**, 5,2 s | `focused-e2e-output.txt` |
| `pnpm run test:e2e` | 300 s | **16 tests OK**, 10,5 s | `e2e-output.txt` |
| `pnpm run build` | 120 s | OK dentro de `verify`, 43 módulos | `verify-output.txt` |

La spec focalizada se ejecutó antes de la suite completa. Tras el E2E se
restauraron con `git checkout --` las capturas históricas de TASK-0007
(experimentos) y TASK-0010 que reescriben specs existentes; el cambio final no
incluye esas modificaciones.

Para la corrección de `wide-corridor.png` se repitieron `tsc --noEmit`, la spec
focalizada y la suite E2E completa. No se repitió `pnpm run verify` porque el
único cambio fue el spec y el informe; no se tocó producción. El
`verify-output.txt` conserva la ejecución anterior, que sigue siendo válida para
el código de producción.

# Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| Carga con `?seed=279837264`: grid 32×32, 8-12 salas, 1-2 pasillos anchos, huecos y spawns distintos | Cumple | Test 1: 1024 tiles, 9 salas, 18 huecos, 1 pasillo ancho, jugador/enemigo en salas distintas |
| Dos cargas de la misma URL producen el mismo snapshot estructural | Cumple | Test 1 compara `grid.tiles`, `seed`, `rooms`, `corridors`, `doors`, `spawns` y `camera`; round-trip JSON |
| `R` conserva la semilla y `F2` cambia semilla y mapa | Cumple | Test 3: `R` conserva seed/tiles/spawns y reinicia a `(6,8)` con 20 HP/6 MP/acción; `F2` cambia seed, tiles y rooms |
| Jugador en sala con salida; enemigo fuera del viewport inicial; cámara sigue y se limita | Cumple | Test 1: BFS 59 ≥ 12, sala del jugador con hueco y acceso estrecho, enemigo no intersecta viewport, cámara `(16,80)` con clamp 640; movimiento real actualiza cámara. Bordes completos en `frame-qa.spec.ts` |
| `F1` muestra semilla, salas, huecos, spawns y anchura de pasillos; se puede ocultar | Cumple | Test 3: overlay visible con `Semilla: 279837264`, `Salas:`, `Huecos:`, `Spawns: …`, `Pasillos anchos: … 2 tiles`; al cerrar, oculto y snapshot idéntico |
| Muros por borde en muestra y capturas, sin `wallSide2`, sin caras verticales fuera de sitio y sin huecos | Cumple | Test 2: 36 muros totalmente visibles (26 `wallTop`, 10 `wallSide1`), `wallTileFor` coincide con la regla y cada bloque 96×96 coincide píxel a píxel con el sprite esperado; capturas `wall-corner.png`, `map-debug-on/off.png` |
| Pasillos anchos de 2 tiles sin puertas; cada sala conserva acceso estrecho con hueco | Cumple | Test 1: 1 pasillo `0→1` `width: 2`, `doorEligible: false`, path 26, tramo real independiente 8 (≥4), ningún hueco en la huella; cada sala con 1-3 huecos y ≥1 corredor `width: 1`. Captura corregida con cámara `(0,208)`, centro `(2*32,16.5*32)` y `(1,16)`/`(2,16)` suelo entre muros `(0,16)`/`(3,16)` |
| HUD, marco 16:9, ataque y feedback siguen funcionando | Cumple | Test 3 comprueba HUD 20/20, 6/6, Sí, Jugador, Turno 1, 10/10 y marco/canvas 16:9 con canvas interno 2048×1152; ataque/flash/daño y cuatro bordes siguen en `game-input-hud.spec.ts` y `frame-qa.spec.ts` de la suite completa |
| Generación 32×32 <100 ms y E2E sin tirones | Cumple | `performance.txt`: generación mediana 3,90 ms, máximo 5,30 ms; frames p95 17,30 ms, máximo 17,70 ms |
| Capturas en `artifacts/TASK-0011/attempt-1/screenshots/` | Cumple | `map-debug-on.png`, `map-debug-off.png`, `alternative-seed.png`, `wall-corner.png`, `wide-corridor.png` |
| `pnpm run verify` y `pnpm run test:e2e` pasan sin borrar, saltar ni debilitar tests | Cumple | 238 unitarios/integración y 16 E2E OK; no se modificó ningún test existente |
| Playtest del usuario aprueba la sensación | Pendiente | Fuera del alcance del runner; la tarea no se marca `done` |

# Métricas de la semilla de referencia

Semilla `279837264`, 32×32, opciones 9/4/11/20.

| Métrica | Valor |
|---|---:|
| Salas | 9 (2 large, 4 medium, 3 small) |
| Corredores | 10 (8 árbol + 2 bucles) |
| Huecos de puerta | 18 |
| Pasillos anchos | 1 (`0→1`, `width: 2`, `doorEligible: false`, 26 puntos de path) |
| Carril real independiente | 8 tiles consecutivos con vecino de suelo fuera del path y de salas |
| Spawn jugador | `(6,8)` |
| Spawn enemigo | `(23,28)` |
| Distancia BFS | 59 (coincide con `spawns.distance`) |
| Cámara inicial | `(16,80)` |
| Límites de cámara | `(640,640)` |
| Viewport | 384×384 (12×12 tiles) |
| Muros visibles muestreados | 36 (26 `wallTop`, 10 `wallSide1`), 0 píxeles distintos del sprite esperado |

La comprobación de anchura real excluye las celdas de sala para no contar el
suelo de una sala como carril del pasillo. La comprobación de “ningún hueco en la
huella” sí incluye las salas (path + todos los vecinos ortogonales de suelo), que
es la lectura literal del brief y resulta más estricta.

## Semilla tras `F2` en la ejecución final

| Métrica | Valor |
|---|---:|
| Semilla | `3304860892` |
| Salas | 9 |
| Pasillos anchos | 1 |
| Spawn jugador | `(6,6)` |
| Spawn enemigo | `(28,4)` |
| Distancia | 48 |
| Cámara | `(16,16)` |
| Grid | 32×32, 1024 tiles |

`F2` usa una semilla nueva por diseño; el test vuelve a comprobar 32×32, 8-12
salas, 1-2 pasillos anchos, 1-3 huecos por sala y cámara con clamp en cada
ejecución. No se fija la semilla aleatoria ni se relaja el rango.

# Rendimiento

Medición final de la suite completa, navegador Chromium headless, servidor Vite
del `webServer`. Generación medida con `import('/src/game/index.ts')` en el page
context, un calentamiento y 9 repeticiones de `createInitialState({ seed })`.
Frames medidos con `requestAnimationFrame`, 10 frames de calentamiento y ventana
de 45 frames; la primera ventana fue válida y no hizo falta repetir.

| Métrica | Valor | Umbral |
|---|---:|---:|
| Generación mínimo | 3,40 ms | — |
| Generación mediana | 4,70 ms | <100 ms |
| Generación p95 | 8,70 ms | — |
| Generación máximo | 8,70 ms | <100 ms |
| Frames p50 | 16,70 ms | — |
| Frames p95 | 17,30 ms | <50 ms |
| Frames máximo | 17,40 ms | <100 ms |

Valores completos en `performance.txt`. No se ocultó ningún pico: la ventana
registrada es la única necesaria y se guardan todos los valores.

# Evidencia visual

- `screenshots/map-debug-off.png`: mapa generado completo con HUD y sin overlay.
- `screenshots/map-debug-on.png`: mismo estado con `F1` visible; se leen semilla,
  salas, huecos, spawns y pasillo ancho `0→1` con 2 tiles.
- `screenshots/alternative-seed.png`: mapa tras `F2`, sin overlay, con HUD y
  encuadre 16:9.
- `screenshots/wall-corner.png`: detalle de la esquina noroeste de la sala 0.
- `screenshots/wide-corridor.png`: detalle del **tramo realmente ancho** de
  `0→1`, con el jugador ya en `(3,12)` y cámara `(0,208)`. El recorte está
  centrado en `(2*32, 16.5*32)` y cubre las dos columnas de suelo `(1,16)` y
  `(2,16)`, con muro en `(0,16)` y `(3,16)`. La imagen muestra dos tiles de suelo
  consecutivos entre los muros laterales; no es el tramo estrecho de `y≈8`.

Qué debe mirar el usuario en el playtest: legibilidad de los muros (cara
vertical solo donde hay suelo al sur, sin `wallSide2`), continuidad del pasillo
ancho y aspecto general de la semilla alternativa.

# Desviaciones y limitaciones

1. **Anchura real independiente sin salas.** El tramo de 4+ tiles se calcula con
   vecino de suelo fuera del path y fuera de salas para demostrar que el carril
   tallado es pasillo y no suelo de sala. La huella para “ningún hueco” incluye
   las salas, de modo que la comprobación de puertas es más estricta.
2. **Muros parcialmente recortados.** La regla estructural se comprueba en todos
   los muros visibles; la comparación de píxeles se limita a muros totalmente
   visibles dentro del viewport de 384×384 para no comparar bloques cortados por
   el borde. La muestra incluye 36 muros y ambos tipos de sprite.
3. **`F2` es aleatorio.** La semilla y las métricas de la tabla corresponden a la
   ejecución final; en una ejecución futura cambiarán. El test fallará si una
   semilla nueva incumple los rangos, en vez de relajar el requisito.
4. **Rendimiento local, no CI.** La medición es de Chromium headless en esta
   máquina, con umbrales holgados (p95 50 ms, máximo 100 ms) para no crear un
   test frágil. Queda muy por debajo de 100 ms de generación.
5. **Sin duplicar cobertura existente.** El ataque, `attack-flash`,
   `damage-feedback` y el recorrido completo de los cuatro bordes de cámara
   siguen cubiertos por `game-input-hud.spec.ts` y `frame-qa.spec.ts`; la spec
   nueva solo comprueba la integración con el mapa generado.
6. **Sin cambios de producción.** No se añadieron hooks, datos ni features. El
   snapshot y `F1` actuales bastaron. No se corrigió producción porque el E2E no
   encontró ningún fallo real.

# Problemas conocidos

- Ninguno funcional en la suite ejecutada.
- El playtest humano sigue pendiente; por eso la tarea no se marca `done` ni se
  tocan `docs/tasks/`.
- `F2` puede producir mapas con métricas distintas; la evidencia recoge solo la
  semilla generada en la ejecución final.

# Preguntas abiertas

- Confirmar que la comprobación de anchura real que excluye salas y la
  comprobación de huella para huecos que sí las incluye es la lectura esperada
  del brief. Se documenta la diferencia para que la verificación sea explícita.
- Confirmar que la captura `wall-corner.png` centrada en la esquina noroeste de
  la sala 0 es suficiente para el playtest, junto con `wide-corridor.png`.
- El usuario debe aprobar la sensación del mapa y de los muros en el playtest;
  no hay decisión creativa que el runner pueda cerrar.

# Estado

- [x] Listo para verificación del lead
- [ ] Bloqueado
- [ ] Fallido

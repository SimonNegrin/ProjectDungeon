---
type: Task Report
title: "Informe — TASK-0006: E2E y QA visual del encuadre 16:9"
description: Resultado del intento 1 con el spec E2E nuevo, la batería de tres viewports, cámara, enemigo, HUD/ataque, capturas y salida de comandos.
task: TASK-0006
attempt: 1
status: stable
branch: task/TASK-0006
commit: 431a61c91eff377d07891fb26c2dc33e46266245
created_at: 2026-11-07T17:18:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:18:00Z }
---

# Estado

**Completado técnicamente; pendiente del playtest del usuario.** Se añadió el
spec E2E `tests/e2e/frame-qa.spec.ts` con 7 tests que cubren el encuadre 16:9 en
tres viewports, el mapa 12×12 con laterales negros, las bandas del escenario, la
cámara en los cuatro bordes y en el centro, la aparición del enemigo y el
HUD/ataque. No se tocó producción, ni el motor, ni `index.html`, ni
`playwright.config.ts`, ni los specs existentes. `pnpm run test`,
`pnpm run verify` y `pnpm run test:e2e` pasan.

El playtest final del usuario **sigue pendiente** y no se afirma nada sobre él.

# Cambios por archivo

Todos los cambios son nuevos; no hay modificaciones de archivos existentes.

- `tests/e2e/frame-qa.spec.ts` (nuevo): spec E2E con la batería parametrizada de
  tres viewports, el test de resize del canvas interno, la cámara, el enemigo y
  el HUD/ataque. Usa `window.__game.snapshot()` / `dispatch()` y eventos de
  teclado; no teletransporta estado ni depende de tiempos reales.
- `artifacts/TASK-0006/attempt-1/test-output.txt` (nuevo): salida y códigos de
  salida de los cinco comandos exigidos.
- `artifacts/TASK-0006/attempt-1/screenshots/*.png` (nuevos): las cinco capturas
  exactas pedidas.
- `artifacts/TASK-0006/attempt-1/logs/probe-frame.json` (nuevo): medición de
  layout a 1280×720, 1920×1080 y 900×700 (cajas, HUD, canvas, estilos).
- `artifacts/TASK-0006/attempt-1/logs/probe-pixels.json` (nuevo): muestreo de
  laterales y mapa del canvas antes de fijar las aserciones.
- `artifacts/TASK-0006/attempt-1/logs/probe-routes.txt` (nuevo): traza de las
  rutas de cámara con `dispatch` y de la fase enemiga.

# Comandos, timeouts y resultados

Todos se ejecutaron con el parámetro `timeout` de la herramienta de shell; en
macOS no existe el binario `timeout`. No se usó npm ni npx.

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | **OK**, 16 archivos / 120 tests | `test-output.txt` |
| `pnpm run verify` | 180 s | **OK**: docs (49 documentos), config (3 agentes, 9 skills), 120 tests, `tsc --noEmit` y `vite build` | `test-output.txt` |
| `pnpm run test:e2e` | 300 s | **OK**, 10 tests (3 existentes + 7 nuevos) | `test-output.txt` |
| `pnpm exec playwright test tests/e2e/frame-qa.spec.ts --repeat-each=3` | 300 s | **OK**, 21 tests | `test-output.txt` |
| `pnpm exec playwright test tests/e2e/game-render.spec.ts --repeat-each=3` | 300 s | **OK**, 3 tests | `test-output.txt` |
| `pnpm run docs:check` (re-ejecución tras añadir este informe) | 120 s | **OK**, 50 documentos, 6 tareas, 1 experimento | `test-output.txt` |

Al terminar cada tanda E2E se comprobó que los puertos 4173 y 5173 están libres
y que no quedan procesos `vite` ni `playwright`. Playwright gestionó Vite con su
`webServer` y lo cerró.

# Cobertura criterio a criterio

| Criterio del brief | Test / aserción | Evidencia |
|---|---|---|
| 1280×720: marco 16:9 ±0,1 % y mapa 1:1 ±0,1 % | `mantiene las invariantes a 1280×720`: `abs(w/h − 16/9) ≤ (16/9)·0,001` sobre `.frame` y canvas; `abs(mapW/mapH − 1) ≤ 0,001` combinando caja del canvas y respaldo 1152/2048 | test verde + `frame-1280x720.png` |
| 1920×1080: proporciones y HUD legible sin recortes | `mantiene las invariantes a 1920×1080`: mismas aserciones; cada `data-testid` del HUD dentro del viewport, `scrollWidth ≤ clientWidth+1`, `scrollHeight ≤ clientHeight+1`; footer dentro de la ventana | test verde + `frame-1920x1080.png` |
| 900×700: marco sin deformar, bandas negras y HUD visible | `mantiene las invariantes a 900×700 (estrecha)`: 16:9, `stage.height − frame.height > 1`, márgenes superior/inferior equilibrados, fondo del stage `rgb(0,0,0)`; HUD y footer dentro de la ventana | test verde + `frame-narrow.png` |
| Laterales negros y mapa sin invadirlos | `measurePixels`: recorrido completo de los dos laterales de respaldo (448×1152 cada uno) con 0 píxeles no negros; 9 puntos puntuales con RGBA `[0,0,0,255]`; rejilla del mapa con 1296/1296 muestras no negras | test verde |
| 12 columnas × 12 filas | `viewport = 384×384`, `viewport/tileSize = 12` en ambos ejes, rango visible del arranque `{minX:0,minY:0,maxX:11,maxY:11}` | test verde |
| Cámara centra lejos de bordes y se detiene en los 4 bordes; jugador visible | `la cámara centra…`: arranque `(4,4)` con cámara `(0,0)`; a `(7,7)` cámara `(48,48)` y centro del jugador a ≤1 px del centro del viewport; NW `(1,1)→(0,0)`, NE `(14,4)→(256,0)`, SW `(4,14)→(0,256)`, SE `(16,14)→(256,256)`; intersección jugador/viewport en cada caso | test verde + `camera-edge.png` |
| Enemigo fuera al arrancar y visible en ≤2 turnos | `el enemigo…`: sin intersección inicial; tras 6 movimientos diagonales (1 turno) el rectángulo del enemigo intersecta cámara+viewport; tras `EndTurn` sigue visible y el enemigo se ha movido; turno 2 ≤ 2 | test verde |
| HUD con vida, MP 6/6, acción, fase, turno y vida del enemigo; ataque con flash y daño | `el HUD…`: `20/20`, `6/6`, `Sí`, `Jugador`, `Turno 1`, `10/10`; acercamiento con comandos reales; ataque con `Space`; `attack-flash.is-active`, `damage-feedback = -5`, enemigo `5/10`, acción `No`, evento `AttackPerformed` con `damage: 5` | test verde + `attack.png` |
| Arte nítido, sin suavizado ni estiramiento | `image-rendering: pixelated`, `imageSmoothingEnabled === false`, canvas interno 2048×1152 (16:9) y mapa 1:1 medido | tests verdes y revisión de las capturas |
| No debilitar tests existentes | Solo se añadió `tests/e2e/frame-qa.spec.ts`; `git diff` de los tres specs existentes está vacío | `git diff 8133f97..HEAD -- tests/e2e/...` vacío |
| `pnpm run verify` y `pnpm run test:e2e` pasan | Ambos con exit code 0 | `test-output.txt` |
| Playtest final del usuario | **No ejecutado por el runner** | queda pendiente |

# Capturas

Todas en `artifacts/TASK-0006/attempt-1/screenshots/`, tamaño real de ventana y
adjuntas con `testInfo.attach`:

| Archivo | Tamaño | Contenido |
|---|---|---|
| `frame-1280x720.png` | 1280×720 | marco 16:9 + HUD + bandas laterales dentro del escenario |
| `frame-1920x1080.png` | 1920×1080 | marco 16:9 + HUD + footer, sin recortes |
| `frame-narrow.png` | 900×700 | marco limitado por anchura con bandas negras arriba/abajo |
| `camera-edge.png` | 1280×720 | cámara en `(256,256)` con el jugador visible y el enemigo cerca |
| `attack.png` | 1280×720 | flash de ataque, `-5` y HUD con enemigo `5/10` y acción `No` |

Se revisaron las cinco imágenes: el marco conserva 16:9, los laterales son negro
plano, el mapa es cuadrado, el arte no aparece estirado y el HUD es legible.

# Desviaciones y hallazgos

1. **El brief sitúa al enemigo en `(11,11)` tras el primer `EndTurn`; el motor
   real lo deja en `(14,14)`.** La IA ejecuta un solo paso por fase enemiga
   (`applyEnemyPlan`), no 4. La visibilidad sigue cumpliéndose: con el jugador
   en `(10,10)` la cámara es `(144,144)` y el enemigo en `(14,14)` ya intersecta
   el viewport. El test verifica la intersección con cámara+viewport, no una
   posición concreta. Traza en `logs/probe-routes.txt`. El criterio "aparece en
   un máximo de 2 turnos" se cumple con 1 turno (incluso aparece ya tras los
   movimientos diagonales, antes del `EndTurn`).
2. **El marco sobresale 0,109 px del stage a 1280×720 y 1920×1080.** El layout
   usa `stage.clientHeight` (entero: 602/962), mientras que el rect del stage es
   fraccionario (601,891/961,891). No hay deformación ni corte visible; los
   márgenes se comparan con tolerancia de ±1 px documentada en el spec.
3. **Ruta del borde sureste:** el enemigo termina en `(14,14)` y bloquea el paso
   directo. La ruta documentada rodea por `(16,14)` con 6 MP. Si la ruta se
   hubiera bloqueado, el helper `dispatchAccepted` habría fallado con
   `CommandRejected`; no ocurrió.
4. **A 900×700 las bandas son verticales**, no laterales, porque el marco queda
   limitado por la anchura del stage. El criterio habla de "bandas negras
   alrededor", que se cumple; el test distingue el eje de banda por viewport.

# Fallos honestos

Ningún test falló. No se hizo diff de píxeles a pantalla completa, no se usó
`toHaveScreenshot` y no se añadieron baselines ni dependencias. No se relajó
ninguna aserción para pasar: los cinco comandos terminaron verdes en la primera
ejecución del spec definitivo.

# Tests existentes y alcance

- `git diff 8133f97..HEAD` no toca `src/**`, `index.html`,
  `playwright.config.ts`, `package.json`, `pnpm-lock.yaml` ni `docs/**`.
- Los tres specs E2E existentes están intactos; no se añadió `.skip`, `.todo` ni
  `.only`.
- Al correr la suite se regeneraron capturas históricas de `TASK-0003`; se
  restauraron con `git checkout -- artifacts/TASK-0003 artifacts/TASK-0005`
  antes del commit, así que el diff solo contiene archivos de `TASK-0006` y el
  spec nuevo.

# Procesos y playtest

- Puertos 4173 y 5173 libres al terminar cada tanda; sin procesos `vite` ni
  `playwright` en background.
- El playtest del usuario para aprobar la sensación del encuadre **sigue
  pendiente**. Este informe no lo declara superado.

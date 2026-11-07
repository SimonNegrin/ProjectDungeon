---
type: Task Brief
title: "Brief — TASK-0006: E2E y QA visual del encuadre 16:9"
description: Brief del intento 1 para cubrir con Playwright el encuadre, la cámara, el enemigo y el HUD en tres tamaños.
task: TASK-0006
attempt: 1
status: stable
branch: task/TASK-0006
created_at: 2026-11-07T17:12:12Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:12:12Z }
---

# Objetivo

Demostrar con tests E2E deterministas y capturas que el encuadre de `REQ-002`
cumple sus invariantes en tres tamaños de ventana. El trabajo es **solo de
tests y evidencia**: no se cambian el motor, el layout ni el HUD para hacer
pasar los tests.

# Contexto mínimo

- Rama: `task/TASK-0006`, creada desde `main` con `TASK-0005` fusionada.
- Requisito: `docs/requirements/REQ-002-encuadre-16-9.md` (v2, aprobada).
- Tarea: `docs/tasks/TASK-0006-e2e-qa-visual-encuadre.md`.
- QA: `docs/harness/visual-qa.md`, `docs/quality/test-strategy.md`.
- Implementación existente:
  - `src/host/layout.ts`: `FRAME_LOGICAL_HEIGHT = 384`,
    `FRAME_LOGICAL_WIDTH = 682.666…`, `RENDER_SCALE = 3`,
    `CANVAS_WIDTH = 2048`, `CANVAS_HEIGHT = 1152`, `MAP_VIEWPORT = 384×384`,
    `MAP_OFFSET_BACKING = 448`, `computeFrameLayout()`.
  - `src/host/renderer.ts`: fondo negro del marco completo, clip al cuadrado del
    mapa, `imageSmoothingEnabled = false`.
  - `src/host/main.ts`: presenta el marco con el tamaño devuelto por
    `computeFrameLayout(stage.clientWidth, stage.clientHeight)`, viewport
    384×384, cámara centrada y limitada.
  - `index.html`: `.hud` fuera del marco, `.stage` negro, `.frame` centrado,
    canvas 2048×1152 con `image-rendering: pixelated`.
  - `window.__game.snapshot()` y `window.__game.dispatch()` son el camino
    determinista; no usar tiempos reales ni teletransportar estado.
- E2E existentes que no deben debilitarse:
  - `tests/e2e/game-render.spec.ts` (comprueba 16:9 con `toBeCloseTo(..., 2)`,
    canvas 2048×1152, cámara y captura de TASK-0005).
  - `tests/e2e/game-input-hud.spec.ts` (loop completo, HUD, ataque, overlays).
  - `tests/e2e/experiment-shell.spec.ts`.
- Config: `playwright.config.ts` usa Vite en `http://127.0.0.1:4173`, Chromium
  headless, `webServer.timeout: 120000`.

# Hechos de referencia ya verificados (no reimplementar)

- `pnpm run verify` y `pnpm run test:e2e` estaban verdes al cerrar TASK-0005
  (120 unitarios/integración, 3 E2E).
- Al arrancar: jugador `(4,4)`, enemigo `(15,15)`, cámara `(0,0)`, límites
  `(256,256)`, viewport `384×384` (12×12 tiles de 32 px).
- A 1280×720 el marco mide aproximadamente `1070,22×602`; a 1920×1080,
  `1710,22×962`; a 900×700 el marco queda limitado por la anchura del
  escenario. El marco se centra en `.stage` y las bandas sobrantes son negras.
- El canvas interno siempre es 2048×1152: mapa `1152×1152` en
  `x = 448..1600`, laterales de respaldo de 448 px.
- Secuencia de referencia para el enemigo: 6 movimientos diagonales desde
  `(4,4)` dejan al jugador en `(10,10)` con 0 MP; `EndTurn` ejecuta la fase
  enemiga y el enemigo queda en `(11,11)`, dentro del viewport. Es decir,
  aparece en 1 turno, que satisface “máximo 2”. Verifica la condición de
  visibilidad, no solo la posición.

# Criterios de aceptación

- [ ] A 1280×720 el marco mantiene 16:9 con tolerancia ±0,1 % y el área de mapa
      mantiene 1:1 con la misma tolerancia.
- [ ] A 1920×1080 se repiten las proporciones y el HUD sigue legible, sin texto
      ni controles cortados.
- [ ] En una ventana estrecha (900×700) el marco se escala sin deformarse y
      aparecen bandas negras alrededor; el HUD sigue visible.
- [ ] Los laterales del marco son negro plano en los píxeles muestreados; el
      mapa no invade los laterales.
- [ ] Se ven 12 columnas y 12 filas de tiles dentro del mapa.
- [ ] La cámara centra al jugador lejos de los bordes y se detiene en los cuatro
      bordes del mundo; el jugador sigue visible.
- [ ] Al arrancar el enemigo no está en el viewport; tras moverse en diagonal
      hacia él un máximo de 2 turnos, aparece.
- [ ] El HUD muestra vida, MP (6/6), acción, fase, turno y vida del enemigo; el
      ataque conserva flash y número de daño.
- [ ] El arte se ve nítido, sin suavizado ni estiramiento, en las capturas.
- [ ] No se borran, saltan ni debilitan tests existentes.
- [ ] `pnpm run verify` y `pnpm run test:e2e` pasan.
- [ ] El usuario hace un playtest final y aprueba la sensación del encuadre.

**El último criterio es del usuario y no lo puede cerrar el runner.** Déjalo sin
marcar y sin afirmar nada sobre él; el `task-lead` dejará la tarea en `review`.

# Qué implementar

Añade un spec E2E nuevo, por ejemplo `tests/e2e/frame-qa.spec.ts`, que cubra
como mínimo:

1. **Tres viewports** (`1280×720`, `1920×1080`, `900×700`) con la misma batería
   de invariantes, parametrizada:
   - `frame` visible y centrado en `.stage`;
   - proporción del marco: `|w/h − 16/9| ≤ (16/9)·0,001`;
   - área de mapa 1:1 con la misma tolerancia, medida a partir del canvas
     (región de respaldo `448..1600`) y de la caja presentada del canvas;
   - canvas interno `2048×1152` inalterado al redimensionar;
   - `imageSmoothingEnabled === false` y `image-rendering: pixelated`;
   - mapa `1152×1152` de respaldo, centrado, con laterales de 448 px;
   - laterales del canvas muestreados en negro puro `[0,0,0,255]` (varios
     puntos en ambos laterales; puedes recorrer las regiones laterales, no
     compares la imagen completa);
   - 12 columnas × 12 filas: `viewport.width/height = 384`,
     `viewport/tileSize = 12`, y rango visible de 12×12 en el arranque;
   - HUD visible y sin recortes: cada `data-testid` del HUD dentro del viewport,
     `scrollWidth ≤ clientWidth + 1`, `scrollHeight ≤ clientHeight + 1`, y sin
     overflow de página;
   - a 1920×1080 y 900×700 comprueba además que el HUD y el footer están dentro
     de la ventana.
2. **Bandas negras alrededor** en la ventana estrecha: `.stage` es mayor que el
   marco en al menos un eje, el marco está centrado con márgenes equilibrados y
   el fondo de `.stage` es negro. En 1280×720 y 1920×1080 también hay bandas
   laterales dentro del escenario: compruébalo sin exigir un tamaño exacto.
3. **Cámara** con comandos reales (`window.__game.dispatch`):
   - arranque en `(0,0)` con el jugador en `(4,4)` centrado salvo clamp;
   - bordes noroeste, noreste, suroeste y sureste: la cámara alcanza
     `(0,0)`, `(256,0)`, `(0,256)` y `(256,256)` respectivamente, y el jugador
     sigue dentro del viewport;
   - lejos de los bordes la cámara centra al jugador (por ejemplo a mitad de
     sala), con tolerancia de ±1 px por el redondeo entero.
   - Puedes reiniciar con `{ type: 'Restart' }` entre recorridos. Diseña las
     rutas para que el enemigo no bloquee ni mate al jugador; si una ruta se
     bloquea, usa otra y documenta la secuencia.
4. **Enemigo**:
   - al arrancar, su rectángulo no intersecta el viewport;
   - en un máximo de 2 turnos de movimientos diagonales del jugador + `EndTurn`,
     el rectángulo del enemigo intersecta el viewport; comprueba la
     intersección con `camera` y `viewport` del snapshot, no un píxel aislado.
5. **HUD y ataque**:
   - valores iniciales: vida `20/20`, MP `6/6`, acción `Sí`, fase `Jugador`,
     turno `Turno 1`, enemigo `10/10`;
   - acerca al jugador con comandos reales hasta adyacencia (puedes reutilizar
     el enfoque de `game-input-hud.spec.ts`, sin copiar estado ni teletransportar);
   - ataca y comprueba `damage-feedback` con `-5`, clase `is-active` en
     `attack-flash`, vida del enemigo `5/10` y acción `No`;
   - captura `attack.png` mientras el flash y el número están activos.
6. **Capturas** en `artifacts/TASK-0006/attempt-1/screenshots/`:
   - `frame-1280x720.png` (página completa, marco + HUD);
   - `frame-1920x1080.png`;
   - `frame-narrow.png` (900×700);
   - `camera-edge.png` (cámara en un borde, jugador visible);
   - `attack.png` (flash + daño + HUD).
   Añádelas también como adjuntos de Playwright (`testInfo.attach`).
7. Consola limpia: sin `console.error` ni `pageerror` en las cargas.

# Sugerencias técnicas

- Usa `page.setViewportSize()` y espera dos `requestAnimationFrame` (o
  `expect.poll` sobre la caja del marco) para que `ResizeObserver` aplique el
  layout antes de medir.
- Redondea comparaciones de caja con tolerancias explícitas y documenta por qué
  (p. ej., el marco tiene tamaño fraccionario).
- Para el mapa, combina la caja presentada del canvas con los offsets de
  respaldo (448/2048) en vez de asumir píxeles CSS enteros.
- Para muestrear píxeles usa `canvas.getContext('2d')!.getImageData(...)` dentro
  de `page.evaluate`; no añadas dependencias de decodificación PNG.
- Para el ataque, replica el helper determinista de `game-input-hud.spec.ts`
  (mover una casilla por comando y `EndTurn` cuando no queden MP).
- Evita `waitForTimeout` como mecanismo de sincronización. Si necesitas esperar
  una animación para la captura, espera por clase/estado y usa un timeout corto
  solo como salvaguarda.
- No uses `toHaveScreenshot` ni baselines nuevas: no hay aprobación humana para
  baselines y las capturas son evidencia.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios/integración existentes |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 300 s | Toda la suite E2E, incluida la nueva |
| `pnpm exec playwright test tests/e2e/frame-qa.spec.ts --repeat-each=3` | 300 s | Estabilidad del nuevo spec |
| `pnpm exec playwright test tests/e2e/game-render.spec.ts --repeat-each=3` | 300 s | Estabilidad del render existente |

Todos los comandos con timeout explícito. Playwright gestiona Vite con su
`webServer`; comprueba al terminar que los puertos 4173 y 5173 están libres.

# Restricciones

- No cambies reglas, valores ni estado del motor (`src/game/**`).
- No cambies el layout, el render, el HUD ni `index.html` para hacer pasar un
  test. Si un criterio falla por un defecto de producción, **para y reporta
  bloqueo** con la evidencia; no lo parchees ni relajes la aserción.
- No borres, saltes (`.skip`, `.todo`, `.only`) ni debilites tests existentes.
- No cambies `playwright.config.ts` salvo que sea imprescindible y lo justifiques;
  preferiblemente no lo toques.
- No añadas dependencias nuevas.
- No uses diff de píxeles a pantalla completa.
- No marques la tarea como `done` ni fusiones a `main`.
- No toques `docs/tasks/TASK-0006-*.md`; lo actualiza el `task-lead`.
- Al ejecutar E2E se regeneran capturas históricas de `TASK-0003` y
  `TASK-0005` por diseño de los specs existentes. Restáuralas con
  `git checkout -- artifacts/TASK-0003 artifacts/TASK-0005` antes de commitear
  si aparecen modificadas, para no ensuciar el diff.

# No objetivos

- Fichas de personaje, arte nuevo o animaciones.
- Rediseño del HUD o del feedback.
- Hotseat, red, QR o móviles.
- Balance o cambios de reglas.
- Baselines visuales aprobadas por humano.

# Evidencia que debes devolver

- Spec(s) nuevo(s) y cualquier helper de test.
- `artifacts/TASK-0006/attempt-1/report.md` (OKF: `type: Task Report`,
  `status: stable`, `generated`, `created_at`, `task`, `attempt`, `branch`,
  `commit`).
- `artifacts/TASK-0006/attempt-1/test-output.txt` con la salida de los comandos.
- Las cinco capturas en `artifacts/TASK-0006/attempt-1/screenshots/`.
- Commit(s) en `task/TASK-0006` con SHA.
- Informe final con: estado, cambios por archivo, comandos/timeouts/resultado,
  cobertura criterio a criterio, desviaciones, fallos honestos, confirmación de
  que no se debilitaron tests y de que no quedan procesos/servidores.

# Formato del informe final

Indica explícitamente:

1. qué criterios técnicos has verificado y con qué aserción/evidencia;
2. qué no has podido verificar y por qué;
3. si algún test falló, la salida exacta y la hipótesis (sin ocultarlo);
4. si tocaste algún archivo fuera de `tests/e2e/**` y
   `artifacts/TASK-0006/**`;
5. que el playtest del usuario queda pendiente.

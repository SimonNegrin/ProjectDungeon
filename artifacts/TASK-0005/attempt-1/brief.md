---
type: Task Brief
title: "Brief de ejecución — TASK-0005: host con encuadre 16:9, render 3× y mapa 12×12"
description: Instrucciones acotadas para sustituir el canvas 960×600 por un marco 16:9 con canvas interno 2048×1152, mapa cuadrado 12×12 y cámara de 384×384.
id: TASK-0005-attempt-1
task: TASK-0005
attempt: 1
status: stable
created_at: 2026-11-07T19:00:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T19:00:00Z }
---

# Brief — TASK-0005: host con encuadre 16:9, render 3× y mapa 12×12

## Estado de partida

- Rama de trabajo: `task/TASK-0005` (creada desde `main`).
- `TASK-0004` está `done` y fusionada en `main` (`2c6135f`). La dependencia se
  cumple.
- `REQ-002` está aprobada y estable. No hay decisiones creativas abiertas.
- Baseline en `main`: `pnpm run test` → 107 tests OK.
- No cambies requisitos, criterios de aceptación ni alcance.
- No adelantes `TASK-0006` (E2E multi-resolución, muestreo visual y playtest).

## Objetivo

Sustituir el canvas de 960×600 por:

1. Marco lógico de **384 px de alto** y **682,666… px de ancho** (16:9 exacto).
2. Canvas de respaldo de **2048×1152** (`RENDER_SCALE = 3`). El 3× es resolución
   interna de dibujo, **no** escala de pantalla.
3. Presentación responsive por CSS/JS al máximo tamaño disponible conservando
   16:9, con bandas negras si el espacio no coincide.
4. Dentro del marco, mapa cuadrado de **1152×1152 px de respaldo** (384×384
   lógicos, 12×12 tiles de 32 px), centrado horizontal y verticalmente.
5. Laterales de **448 px de respaldo** (149,333… lógicos) a cada lado, negro
   plano, sin arte, HUD ni feedback.
6. Cámara con viewport **384×384** sobre un mundo de **640×640**; centra al
   jugador salvo en los bordes y se limita a los cuatro bordes.
7. HUD fuera del marco y feedback DOM posicionado respecto al sub-rectángulo del
   mapa, no respecto al marco completo.
8. Pixel art nítido: `imageSmoothingEnabled = false`, dibujo interno a 3× y
   `image-rendering: pixelated` en CSS.

## Contexto mínimo

- Requisito: `docs/requirements/REQ-002-encuadre-16-9.md` (R-001 a R-007,
  T-001, T-002, T-003, T-005, T-006).
- Tarea: `docs/tasks/TASK-0005-host-encuadre-16-9.md`.
- Arquitectura: `docs/design/architecture.md` (motor sin Canvas/DOM; host sin
  reglas del motor; estado serializable).
- Estrategia de tests: `docs/quality/test-strategy.md`.
- DoR/DoD: `docs/quality/definition-of-ready-done.md`.
- Código afectado: `src/host/` (`main.ts`, `renderer.ts`, `camera.ts`,
  `geometry.ts`, `hud.ts`/`debug.ts` si el snapshot lo necesita), `index.html`.
- Tests afectados: `tests/unit/host/`, `tests/e2e/game-render.spec.ts` y, solo
  si es imprescindible, `tests/e2e/game-input-hud.spec.ts`.
- El motor (`src/game/`) no se toca. Sala 20×20, jugador (4,4) con 6/6 MP,
  enemigo (15,15) con 4/4 MP y reglas actuales quedan intactos.

## Diseño técnico de referencia (no es una decisión creativa nueva)

- `FRAME_LOGICAL_HEIGHT = 384`; `FRAME_LOGICAL_WIDTH = 384 * 16 / 9 =
  682,666…`; `RENDER_SCALE = 3`; `CANVAS_WIDTH = 2048`; `CANVAS_HEIGHT = 1152`.
- `MAP_VIEWPORT = { width: 384, height: 384 }` (12 tiles de 32 px).
- `MAP_BACKING_SIZE = 1152`; offset horizontal de respaldo
  `(2048 - 1152) / 2 = 448`; offset lógico `448 / 3 = 149,333…`. Dibujar con
  `ctx.scale(3, 3)` y trasladar el mapa 149,333… px lógicos cae en 448 px
  enteros de respaldo.
- Fondo del marco negro puro (`#000000`). El área de mapa puede conservar su
  fondo oscuro actual.
- La cámara usa `viewport = 384×384` y `world = 640×640`; límites `(256, 256)`.
  Con el spawn (4,4) la cámara arranca en `(0, 0)`; el enemigo en (15,15) queda
  fuera del viewport inicial (empieza en x=480).
- El layout de presentación debe ser una **función pura y testeable** que reciba
  el espacio disponible y devuelva el rectángulo del marco y su escala. `main`
  debe usarla para dimensionar el canvas presentado (por ejemplo en `resize`/
  `ResizeObserver`), sin deformar ni salirse del viewport. El tamaño interno del
  canvas nunca cambia con la ventana.
- El feedback DOM (casilla activa, flash y daño) se posiciona respecto al
  sub-rectángulo del mapa. Con el marco como contenedor:
  - mapa: `left = 448 / 2048 = 21,875 %`, `width = 1152 / 2048 = 56,25 %`,
    `top = 0`, `height = 100 %`;
  - una casilla de 32 px lógicos dentro del mapa mide
    `32 / 384 = 8,333… %` del mapa (4,6875 % del marco en horizontal) y
    `8,333… %` del marco en vertical.
- Si se expone el layout en `window.__game.snapshot()`, debe ser un dato
  serializable y de solo lectura, aditivo y sin romper los campos existentes.
  No es obligatorio; si se añade, cúbrelo con tests.
- `window.__game` conserva snapshot y `dispatch`; `viewport` pasa a 384×384 y
  `camera.maxX/maxY` a 256.

## Criterios de aceptación (no modificar)

- [ ] El canvas de respaldo mide 2048×1152; el espacio lógico de dibujo sigue
      midiendo 682,666…×384 y solo cambia la escala de presentación.
- [ ] El marco conserva 16:9 exacto al redimensionar; si el espacio no coincide,
      hay bandas negras y no se deforma la imagen.
- [ ] El área de mapa es un cuadrado 1:1 de 1152×1152 de respaldo, centrado
      horizontal y verticalmente en el marco.
- [ ] Se ven exactamente 12×12 tiles de 32 px lógicos dentro del mapa.
- [ ] Los laterales son negro plano, sin arte, HUD ni feedback.
- [ ] La cámara usa un viewport de 384×384 px lógicos, centra al jugador salvo
      en los bordes y se limita al mundo de 640×640.
- [ ] El jugador en (4,4) arranca con la cámara en (0,0) y el enemigo en (15,15)
      queda fuera del viewport inicial.
- [ ] El render sigue sin conocer reglas del motor; el motor sigue sin conocer
      el layout.
- [ ] El pixel art se ve nítido: `imageSmoothingEnabled = false`, escalado
      entero de respaldo y `image-rendering: pixelated` en CSS.
- [ ] No se añaden dependencias para el layout.
- [ ] El HUD, el ataque y el feedback se mantienen funcionales y legibles.
- [ ] `pnpm run verify` pasa y la suite E2E existente queda actualizada solo en
      las expectativas imprescindibles.

## Plan de test exigido

- **Unitario del layout:** 16:9 exacto, ajuste con bandas horizontales y
  verticales, escala correcta, entradas degeneradas sin NaN/división por cero.
- **Unitario de cámara:** viewport 384×384, mundo 640×640, límites (256,256),
  clamp en los cuatro bordes, centrado lejos de bordes y rango visible 12×12.
- **Unitario/integración del render:** el fondo del marco es negro; el mapa
  empieza en x=448 de respaldo; el área de mapa es 1152×1152; los laterales no
  reciben tiles; `imageSmoothingEnabled = false`.
- **E2E:** actualizar solo lo imprescindible (tamaño interno 2048×1152, cámara
  con límites 256, proporción 16:9). Es aceptable una comprobación pequeña y
  determinista de que el sub-rectángulo del mapa es 1:1 y está centrado, usando
  medidas del DOM o un snapshot de layout. No construir la matriz
  multi-resolución ni el muestreo de píxeles de `TASK-0006`.
- **Manual:** no aplica como playtest formal; el usuario revisará en
  `TASK-0006`. Deja una captura inicial para evidencia.

## Archivos y restricciones

- Permitido: `src/host/**`, `index.html`, `tests/unit/host/**`,
  `tests/e2e/game-render.spec.ts` y `tests/e2e/game-input-hud.spec.ts` solo si
  una expectativa imprescindible lo exige.
- Prohibido: `src/game/**`, requisitos, criterios, tareas, dependencias
  (`package.json`, `pnpm-lock.yaml`), `playwright.config.ts` salvo que sea
  estrictamente necesario (justifícalo; no debería serlo).
- No añadir frameworks de UI ni dependencias de layout. Sin imágenes remotas ni
  CDN.
- No cambiar reglas, valores, semántica de comandos/eventos ni determinismo del
  motor.
- No añadir fichas, arte ni contenido en los laterales.
- No mover el HUD dentro del marco.
- No borrar, saltar (`skip`/`todo`/`only`) ni debilitar tests. Los cambios de
  expectativas deben ser consecuencia del nuevo encuadre, no para ocultar fallos.
- No adelantar `TASK-0006`: sin suite multi-resolución, sin baselines visuales
  nuevas ni comparación de píxeles a pantalla completa.
- No sobreescribir artefactos históricos de `TASK-0002`/`TASK-0003`: si el E2E
  regenera sus capturas, restáuralas antes de commitear.

## Comandos y timeouts

Ejecuta todo con pnpm y con timeout explícito del arnés (en macOS no hay
`timeout` de GNU; usa el timeout del tool). Registra comando, timeout y
resultado en el informe.

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Layout, cámara, render y tests existentes |
| `pnpm run verify` | 180 s | Docs, config, unitarios y build |
| `pnpm run test:e2e` | 240 s | Encuadre y loop existente |
| `pnpm run build` | 120 s | Build con el nuevo canvas (incluido en verify) |

- Playwright usa su `webServer` y lo cierra al terminar. No dejes Vite,
  Playwright ni procesos en background al acabar. Comprueba que 4173/5173 quedan
  libres.
- Si un comando agota el timeout, páralo, guarda evidencia y devuelve `blocked`;
  no repitas el mismo comando sin hipótesis nueva.
- Guarda la salida de tests en `artifacts/TASK-0005/attempt-1/test-output.txt`.

## Evidencia y artefactos

Ruta: `artifacts/TASK-0005/attempt-1/`

- `report.md` con estado, cambios, comandos/timeouts/resultados, commits,
  desviaciones y preguntas.
- `test-output.txt` con la salida de `pnpm run test` y `pnpm run verify` (y E2E).
- `screenshots/frame.png`: captura inicial a 1280×720 con el marco completo y el
  HUD visible. No sustituyas capturas de tareas anteriores.
- `logs/` si hace falta guardar salida de E2E o errores.
- Commit(s) en `task/TASK-0005` con SHA(s) en el informe.

## Qué debe devolver el runner

Un informe final con:

1. Estado: `done`, `blocked` o `failed`, y motivo.
2. Resumen de cambios por archivo (producción y tests).
3. Criterios de aceptación marcados con la evidencia concreta de cada uno.
4. Comandos ejecutados con timeout y resultado exacto (tests, verify, e2e).
5. Commit SHA(s) y rama.
6. Artefactos generados y ruta de la captura.
7. Desviaciones, limitaciones y preguntas abiertas.
8. Confirmación explícita de que no se han borrado/saltado/debilitado tests, de
   que no se ha tocado `src/game/` ni dependencias, y de que no quedan procesos
   en background.

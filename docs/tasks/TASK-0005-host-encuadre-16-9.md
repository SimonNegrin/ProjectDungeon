---
type: Task
id: TASK-0005
title: "Host: encuadre 16:9, render interno 3× y mapa 12×12"
description: Renderiza un marco 16:9 responsive con canvas interno de 2048×1152, mapa cuadrado 12×12 centrado, laterales negros y cámara limitada al mapa.
status: stable
task_status: done
task_type: feature
requirement: REQ-002
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-007, T-001, T-002, T-003, T-005, T-006]
depends_on: [TASK-0004]
unlocks: [TASK-0006]
created_at: 2026-11-07T17:10:00Z
completed_at: 2026-11-07T19:40:00Z
assignee: task-runner
attempts: 2
artifacts: artifacts/TASK-0005/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified: { by: task-lead, at: 2026-11-07T19:40:00Z }
---

# Objetivo

Sustituir el canvas de 960×600 por un marco lógico de 384 px de alto con
relación 16:9 exacta, dibujado en un canvas de respaldo de 2048×1152 (3×). Dentro
del marco, el mapa ocupa un cuadrado de 12×12 tiles (1152×1152 de respaldo)
centrado, con laterales negros reservados y una cámara de 384×384 px lógicos que
sigue al jugador y se limita al mundo de 20×20.

# Contexto

- Requisito: [REQ-002](../requirements/REQ-002-encuadre-16-9.md).
- Motor con sala 20×20 y MP 6/4: TASK-0004.
- Arquitectura: [Canvas y cámara](../design/architecture.md).
- Código: `src/host/main.ts`, `src/host/renderer.ts`, `src/host/camera.ts`,
  `src/host/geometry.ts`, `src/host/hud.ts`, `index.html`.
- Tests: `tests/unit/host/` y `tests/e2e/`.

# Diseño técnico de referencia

- `FRAME_LOGICAL_HEIGHT = 384`; `FRAME_LOGICAL_WIDTH = 384 * 16 / 9 =
  682,666…`.
- `MAP_VIEWPORT = { width: 384, height: 384 }` (12 tiles de 32 px).
- `RENDER_SCALE = 3`: canvas de respaldo `2048×1152`; el mapa ocupa
  `1152×1152` y cada lateral mide 448 px de respaldo (149,333… lógicos).
  El 3× es la **resolución interna de dibujo**, no la escala de pantalla. El
  canvas se muestra por CSS al máximo tamaño disponible conservando 16:9, con
  bandas negras si el espacio no coincide.
- Dibujar con `ctx.scale(3, 3)` y desplazar el mapa 149,333… px lógicos; el
  resultado cae en píxeles enteros de respaldo (448).
- Fondo del marco negro puro; sin HUD ni arte en los laterales.
- El HUD sigue fuera del marco, encima, como en `REQ-001`.
- El layout debe ser una función pura y testeable que reciba el espacio
  disponible y devuelva el rectángulo del marco y su escala.
- El feedback DOM (casilla activa, flash y daño) debe posicionarse respecto al
  sub-rectángulo del mapa, no respecto al marco completo.

# Criterios de aceptación

- [x] El canvas de respaldo mide 2048×1152; el espacio lógico de dibujo sigue
      midiendo 682,666…×384 y solo cambia la escala de presentación.
- [x] El marco conserva 16:9 exacto al redimensionar; si el espacio no coincide,
      hay bandas negras y no se deforma la imagen.
- [x] El área de mapa es un cuadrado 1:1 de 1152×1152 de respaldo, centrado
      horizontal y verticalmente en el marco.
- [x] Se ven exactamente 12×12 tiles de 32 px lógicos dentro del mapa.
- [x] Los laterales son negro plano, sin arte, HUD ni feedback.
- [x] La cámara usa un viewport de 384×384 px lógicos, centra al jugador salvo
      en los bordes y se limita al mundo de 640×640.
- [x] El jugador en (4,4) arranca con la cámara en (0,0) y el enemigo en (15,15)
      queda fuera del viewport inicial.
- [x] El render sigue sin conocer reglas del motor; el motor sigue sin conocer el
      layout.
- [x] El pixel art se ve nítido: `imageSmoothingEnabled = false`, escalado
      entero de respaldo y `image-rendering: pixelated` en CSS.
- [x] No se añaden dependencias para el layout.
- [x] El HUD, el ataque y el feedback se mantienen funcionales y legibles.
- [x] `pnpm run verify` pasa y la suite E2E existente queda actualizada solo en
      las expectativas imprescindibles.

# Plan de test

- **Unitario:** función pura de layout (16:9, mapa 1:1, bandas), cámara con
  viewport 384×384 y mundo 640×640, clamp en los cuatro bordes, rango visible
  de 12×12 tiles.
- **Integración:** render sobre canvas de respaldo; comprobar que el mapa
  empieza en x=448 y que los laterales quedan negros.
- **E2E:** cargar la página y comprobar proporción del marco, área de mapa
  cuadrada, cámara y HUD; la cobertura visual ampliada es TASK-0006.
- **Manual:** revisar en 1280×720 que no hay borrosidad ni deformación.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Layout, cámara y render |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 240 s | Encuadre y loop existente |
| `pnpm run build` | 120 s | Build con el nuevo canvas |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0005/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0005/attempt-1/test-output.txt`
- [x] Captura inicial en `artifacts/TASK-0005/attempt-1/screenshots/frame.png`
- [x] Commit SHA en la rama `task/TASK-0005`

# Verificación

- Intento 1 más un follow-up de verificación (intento 2): el primer cierre no
  se aceptó porque `docs:check` fallaba por el `status` OKF del informe y porque
  el `max-width` de `main` impedía llenar la pantalla a 1920×1080. Ambos
  hallazgos se corrigieron antes de fusionar.
- `task-lead` revisó el diff completo de `task/TASK-0005`, fusionado en `main`
  por fast-forward: producción en `src/host/layout.ts` (nuevo),
  `src/host/renderer.ts`, `src/host/main.ts` e `index.html`; tests en
  `tests/unit/host/` y `tests/e2e/game-render.spec.ts`. No cambian
  `src/game/**`, requisitos, dependencias (`package.json`/`pnpm-lock.yaml`),
  `playwright.config.ts` ni `TASK-0006`.
- `pnpm run verify` re-ejecutado de forma independiente: docs (48 documentos, 6
  tareas), config, 120 tests y build OK.
- `pnpm run test:e2e` re-ejecutado: 3 tests OK (render, loop de input/HUD y shell
  de experimentos). Las capturas históricas de `TASK-0003` regeneradas por el
  spec se restauraron; los puertos 4173, 5173 y 4174 quedaron libres.
- Medición independiente con Vite + Playwright
  (`artifacts/TASK-0005/attempt-1/logs/`):
  - 1280×720: marco 1070,21875×602 (16:9, limitado por la altura disponible),
    mapa 601,998×602 (1:1) centrado y HUD encima del marco.
  - 800×600: marco 768×432 (16:9), mapa 432×432, dentro del viewport.
  - 1920×1080: marco 1710,21875×962 (16:9, llena el alto disponible), mapa
    961,998×962, HUD y footer visibles; `scrollWidth/scrollHeight` = 1920/1080
    sin overflow.
  - En los tres tamaños: canvas interno 2048×1152, `imageSmoothingEnabled =
    false`, `image-rendering: pixelated`, laterales muestreados a
    `[0,0,0,255]`, viewport 384×384, cámara (0,0) con límites (256,256), enemigo
    fuera del viewport inicial y casilla activa a menos de 0,016 px de su
    posición esperada respecto al mapa.
- Criterios comprobados: 12×12 tiles por viewport, cámara centrada salvo en los
  cuatro bordes, límites (256,256) sobre 640×640, spawn (4,4) en cámara (0,0),
  enemigo (15,15) fuera, fondo negro del marco con clip al mapa, feedback
  posicionado con los porcentajes 21,875 % / 56,25 % / 8,333… %, HUD fuera del
  marco, overlays y reinicio funcionales, sin dependencias nuevas y con el
  renderer importando solo tipos del motor.
- No se han borrado, saltado ni debilitado tests: 120 frente a 107 previos
  (+13), sin `.skip`, `.todo` ni `.only`. Las expectativas actualizadas son
  consecuencia del viewport 384×384, los límites (256,256), el canvas
  2048×1152 y el nuevo encuadre.
- Desviaciones aceptadas: el follow-up `96a43a3` eliminó el `max-width` de
  `main` para que el marco llene la pantalla a 1920×1080 y corrigió el fallback
  estático del HUD a `MP 6/6`; `1cd3f5a` corrigió el `status` OKF del informe
  (`stable`); la captura E2E de `game-render.spec.ts` escribe ahora en
  `artifacts/TASK-0005/` para no sobrescribir la de `TASK-0002`. Existe un
  `@playwright/test ... test-server` preexistente (PID 88419) ajeno a esta
  tarea y que no escucha en los puertos del proyecto.
- Commits: `9843db4` (ready + brief), `4792109` (implementación), `e4dac92`
  (informe), `1cd3f5a` (OKF), `96a43a3` (follow-up responsive/HUD) y `a97037f`
  (informe final). `main` avanza por fast-forward hasta `a97037f`.
- Pendiente: `TASK-0006` (E2E multi-resolución y QA visual) y playtest del
  usuario.

# Restricciones

- No cambiar reglas ni valores del motor; eso es TASK-0004.
- No añadir fichas, arte ni contenido en los laterales.
- No mover el HUD dentro del marco.
- No usar frameworks de UI ni dependencias de layout.
- No usar imágenes remotas ni CDN.
- No debilitar tests para que pase el E2E.

# No objetivos

- Fichas de personaje en los laterales.
- Rediseño del HUD o del feedback.
- Animaciones, audio o arte final.
- Responsive móvil, hotseat, red o persistencia.
- QA visual multi-resolución completa; eso es TASK-0006.

# Notas

- El canvas interno de 2048×1152 no es un zoom fijo: su tamaño en pantalla lo
  decide el CSS según el espacio disponible. No confundir `RENDER_SCALE` con la
  escala de presentación.
- El eje Y no tiene bandas: el mapa ocupa toda la altura del marco. Las bandas
  solo aparecen en los laterales del marco y, si la ventana no es 16:9, alrededor
  del marco completo.
- Evitar posiciones fraccionarias al dibujar tiles: compensar el offset lógico
  con la escala 3× para que el mapa caiga en 448 px enteros.
- Mantener `window.__game` con snapshot y comandos; si se expone el layout para
  tests, hacerlo como dato serializable y de solo lectura.
- El `task-lead` debe marcar esta tarea como `ready` solo cuando TASK-0004 esté
  `done`.

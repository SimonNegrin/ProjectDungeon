---
type: Task
id: TASK-0005
title: "Host: encuadre 16:9, render interno 3× y mapa 12×12"
description: Renderiza un marco 16:9 responsive con canvas interno de 2048×1152, mapa cuadrado 12×12 centrado, laterales negros y cámara limitada al mapa.
status: stable
task_status: ready
task_type: feature
requirement: REQ-002
requirement_ids: [R-001, R-002, R-003, R-004, R-005, R-007, T-001, T-002, T-003, T-005, T-006]
depends_on: [TASK-0004]
unlocks: [TASK-0006]
created_at: 2026-11-07T17:10:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0005/
priority: P1
risk: high
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified:
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
- [ ] El render sigue sin conocer reglas del motor; el motor sigue sin conocer el
      layout.
- [ ] El pixel art se ve nítido: `imageSmoothingEnabled = false`, escalado
      entero de respaldo y `image-rendering: pixelated` en CSS.
- [ ] No se añaden dependencias para el layout.
- [ ] El HUD, el ataque y el feedback se mantienen funcionales y legibles.
- [ ] `pnpm run verify` pasa y la suite E2E existente queda actualizada solo en
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

- [ ] Informe en `artifacts/TASK-0005/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0005/attempt-1/test-output.txt`
- [ ] Captura inicial en `artifacts/TASK-0005/attempt-1/screenshots/frame.png`
- [ ] Commit SHA en la rama `task/TASK-0005`

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

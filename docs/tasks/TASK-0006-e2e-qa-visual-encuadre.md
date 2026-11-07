---
type: Task
id: TASK-0006
title: "E2E y QA visual del encuadre 16:9"
description: Cubre con Playwright el marco 16:9, el mapa 12×12, la cámara, la aparición del enemigo y la legibilidad del HUD en tres tamaños de ventana.
status: stable
task_status: done
task_type: test
requirement: REQ-002
requirement_ids: [R-006, R-007, R-010, R-011, T-004]
depends_on: [TASK-0005]
unlocks: [TASK-0007, TASK-0008]
created_at: 2026-11-07T17:10:00Z
completed_at: 2026-11-07T17:23:07Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0006/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified:
  - by: task-lead
    at: 2026-11-07T17:20:42Z
  - by: human:simon
    at: 2026-11-07T17:23:07Z
    note: Aprueba el playtest del encuadre 16:9, el mapa 12×12, los laterales negros, la cámara, la aparición del enemigo y el HUD/ataque.
---

# Objetivo

Demostrar con tests deterministas y capturas que el nuevo encuadre cumple
`REQ-002`: marco 16:9 nítido a 1280×720, 1920×1080 y una ventana estrecha; mapa
cuadrado de 12×12 centrado; laterales negros; cámara que sigue y se limita; HUD y
feedback intactos; y enemigo visible en un máximo de 2 turnos desde el spawn.

# Contexto

- Requisito: [REQ-002](../requirements/REQ-002-encuadre-16-9.md).
- Implementación: TASK-0004 (motor) y TASK-0005 (host).
- QA: [estrategia de tests](../quality/test-strategy.md) y
  [QA visual](../harness/visual-qa.md).
- E2E existentes: `tests/e2e/game-render.spec.ts`,
  `tests/e2e/game-input-hud.spec.ts` y `tests/e2e/experiment-shell.spec.ts`.

# Criterios de aceptación

- [x] A 1280×720 el marco mantiene 16:9 con tolerancia ±0,1 % y el área de mapa
      mantiene 1:1 con la misma tolerancia.
- [x] A 1920×1080 se repiten las proporciones y el HUD sigue legible, sin texto
      ni controles cortados.
- [x] En una ventana estrecha (por ejemplo 900×700) el marco se escala sin
      deformarse y aparecen bandas negras alrededor; el HUD sigue visible.
- [x] Los laterales del marco son negro plano en los píxeles muestreados; el
      mapa no invade los laterales.
- [x] Se ven 12 columnas y 12 filas de tiles dentro del mapa.
- [x] La cámara centra al jugador lejos de los bordes y se detiene en los cuatro
      bordes del mundo; el jugador sigue visible.
- [x] Al arrancar el enemigo no está en el viewport; tras moverse en diagonal
      hacia él un máximo de 2 turnos, aparece.
- [x] El HUD muestra vida, MP (6/6), acción, fase, turno y vida del enemigo; el
      ataque conserva flash y número de daño.
- [x] El arte se ve nítido, sin suavizado ni estiramiento, en las capturas.
- [x] No se borran, saltan ni debilitan tests existentes.
- [x] `pnpm run verify` y `pnpm run test:e2e` pasan.
- [x] El usuario hace un playtest final y aprueba la sensación del encuadre.
      Aprobado por `human:simon` el 2026-11-07.

# Plan de test

- **Unitario:** no se esperan tests nuevos de reglas; completar los del layout y
  la cámara si TASK-0005 dejó huecos.
- **Integración:** snapshot de `window.__game` con sala 20×20, MP 6/4 y
  posiciones; el enemigo fuera del viewport inicial.
- **E2E:** tres viewports (1280×720, 1920×1080, 900×700), medidas de proporción,
  muestreo de laterales negros, cámara en bordes, aparición del enemigo y
  feedback de ataque. Guardar capturas.
- **Manual:** playtest del usuario para legibilidad, escala y sensación de
  tablero compacto.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 300 s | Encuadre, cámara, HUD y feedback |
| `pnpm exec playwright test tests/e2e/game-render.spec.ts --repeat-each=3` | 300 s | Estabilidad del render |

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0006/attempt-1/report.md`
- [x] Salida de tests en `artifacts/TASK-0006/attempt-1/test-output.txt`
- [x] Capturas: `frame-1280x720.png`, `frame-1920x1080.png`,
      `frame-narrow.png`, `camera-edge.png` y `attack.png`
- [x] Commit SHA en la rama `task/TASK-0006`: `431a61c` (spec + evidencia) y
      `f02d832` (informe).

# Verificación

Verificación independiente del `task-lead` sobre `task/TASK-0006` (intento 1),
fusionada en `main` por fast-forward hasta `f02d832`.

- **Alcance del diff:** solo `tests/e2e/frame-qa.spec.ts` (nuevo) y
  `artifacts/TASK-0006/**`. Sin cambios en `src/**`, `index.html`,
  `package.json`, `pnpm-lock.yaml`, `playwright.config.ts`, `tests/unit/**` ni
  en los tres specs E2E existentes. No se añadieron dependencias.
- **Criterios:** se leyeron el spec y el informe y se comprobó cada aserción
  contra los valores de `REQ-002`: 16:9 con ±0,1 % en `.frame` y canvas, mapa
  1:1 con la misma tolerancia, canvas interno 2048×1152, viewport 384×384,
  laterales completos de 448×1152 de respaldo sin píxeles no negros, rango
  visible 12×12 en el arranque, bandas negras del stage, HUD sin recortes en los
  tres viewports, cámara centrada y limitada en los cuatro bordes, enemigo fuera
  al arrancar y visible en 1 turno, y HUD/ataque con `-5` y flash.
- **Comandos re-ejecutados por el lead** (timeout de la herramienta de shell;
  macOS no tiene binario `timeout`):
  - `pnpm run verify` (180 s): docs 50, config, 120 tests, `tsc` y build OK.
  - `pnpm run test:e2e` (300 s): 10 tests OK (3 existentes + 7 nuevos).
  - `pnpm exec playwright test tests/e2e/frame-qa.spec.ts --repeat-each=3`
    (300 s): 21 tests OK.
  - `pnpm exec playwright test tests/e2e/game-render.spec.ts --repeat-each=3`
    (300 s): 3 tests OK.
- **Nota de arnés:** una primera ejecución de los dos `--repeat-each=3` en
  paralelo colisionó en el puerto 4173 de Playwright y falló por el servidor
  compartido, no por el spec. Re-ejecutados en secuencia, ambos pasaron. Los
  puertos 4173/5173 quedaron libres y no se dejaron servidores de esta tarea.
- **Tests debilitados:** ninguno. Se añaden 7 tests E2E (de 3 a 10); no hay
  `.skip`, `.todo` ni `.only`; los specs existentes tienen diff vacío.
- **Capturas:** las cinco imágenes se revisaron visualmente: marco 16:9 sin
  deformar, mapa cuadrado 12×12, laterales negros, bandas en la ventana
  estrecha, HUD legible, cámara en borde con jugador visible y ataque con flash
  y `-5`.
- **Desviación respecto al brief:** el brief preveía al enemigo en `(11,11)`
  tras el primer `EndTurn`; la IA ejecuta un solo paso por fase y queda en
  `(14,14)`. El criterio se cumple igualmente: el enemigo ya es visible tras los
  movimientos diagonales del turno 1 y el test comprueba la intersección con el
  viewport, no una posición concreta. Está documentado en el informe y en
  `artifacts/TASK-0006/attempt-1/logs/probe-routes.txt`.
- **Desviación menor:** el marco sobresale 0,109 px del stage a 1280×720 y
  1920×1080 por usar `clientHeight` entero frente al rect fraccionario. No hay
  deformación ni corte; el spec usa ±1 px para márgenes.

# Aprobación del playtest

El usuario (`human:simon`) probó la build servida en `http://127.0.0.1:4173` el
2026-11-07 y aprobó la sensación del encuadre. Comprobó:

- marco 16:9 a 1280×720 y 1920×1080, y ventana estrecha sin deformación;
- mapa cuadrado de 12×12 con laterales negros y HUD legible fuera del marco;
- cámara que sigue al jugador y se detiene en los bordes;
- aparición del enemigo en un máximo de 2 turnos;
- HUD y ataque con flash y número de daño.

Con esta aprobación se cumple el último criterio y la tarea pasa a `done`.
`REQ-002` queda completada.

# Restricciones

- No cambiar reglas del motor ni el layout para hacer pasar los tests; si algo
  falla, se corrige en la tarea correspondiente o se escala.
- No usar diff de píxeles a pantalla completa; medir proporciones, regiones y
  estados.
- No depender de tiempos reales: usar `window.__game.dispatch()` y esperas por
  estado.
- No añadir dependencias nuevas si Playwright ya cubre la necesidad.

# No objetivos

- Fichas de personaje, arte nuevo o animaciones.
- Rediseño del HUD o del feedback.
- Hotseat, red, QR o móviles.
- Balance fino de la economía.

# Notas

- Para muestrear los laterales, usar `canvas.toDataURL()` o un contexto de test
  controlado; no comparar imágenes completas.
- Las capturas deben mostrar el marco completo con el HUD, no solo el canvas.
- Comprobar que los puertos de Vite/Playwright quedan libres y que no hay
  procesos en background al terminar.
- El `task-lead` debe marcar esta tarea como `ready` solo cuando TASK-0005 esté
  `done`.

---
type: Task
id: TASK-0006
title: "E2E y QA visual del encuadre 16:9"
description: Cubre con Playwright el marco 16:9, el mapa 12×12, la cámara, la aparición del enemigo y la legibilidad del HUD en tres tamaños de ventana.
status: stable
task_status: backlog
task_type: test
requirement: REQ-002
requirement_ids: [R-006, R-007, R-010, R-011, T-004]
depends_on: [TASK-0005]
unlocks: []
created_at: 2026-11-07T17:10:00Z
completed_at:
assignee: task-runner
attempts: 0
artifacts: artifacts/TASK-0006/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T17:10:00Z }
verified:
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

- [ ] A 1280×720 el marco mantiene 16:9 con tolerancia ±0,1 % y el área de mapa
      mantiene 1:1 con la misma tolerancia.
- [ ] A 1920×1080 se repiten las proporciones y el HUD sigue legible, sin texto
      ni controles cortados.
- [ ] En una ventana estrecha (por ejemplo 900×700) el marco se escala sin
      deformarse y aparecen bandas negras alrededor; el HUD sigue visible.
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

- [ ] Informe en `artifacts/TASK-0006/attempt-1/report.md`
- [ ] Salida de tests en `artifacts/TASK-0006/attempt-1/test-output.txt`
- [ ] Capturas: `frame-1280x720.png`, `frame-1920x1080.png`,
      `frame-narrow.png`, `camera-edge.png` y `attack.png`
- [ ] Commit SHA en la rama `task/TASK-0006`

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

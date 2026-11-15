---
type: Task Brief
title: "TASK-0129: brief del intento 1"
description: QA E2E del arranque completo de REQ-016 con capturas.
task: TASK-0129
attempt: 1
status: stable
brief_bytes: 2198
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T11:00:00Z }
---

# Objetivo

Añadir un spec E2E nuevo que recorra en navegador real, con URL normal (sin
`?test=1`), el arranque de REQ-016: menú, paso 1, 1/2/6 jugadores, nombre,
variante, resumen, cancelación en los tres puntos y partida con mapa y miniatura
del HUD; capturas a 1280×720 y 900×700. Reportar defectos, no arreglarlos.

# No objetivos

- Cambiar UI, reglas, layout o validaciones; no probar «Cargar» (TASK-0141/0144).
- No tocar `?test=1` ni hotseat, guardado o resultado.

# Invariantes

- Tests existentes intactos; no borrar, saltar ni debilitar.
- `?test=1` sigue saltando el inicio; el spec nuevo usa `/` y `?seed=`.
- Capturas con `E2E_ARTIFACTS_DIR=tests/e2e` en `<spec>/screenshots/`.
- pnpm; timeouts; servidor solo vía `webServer` de Playwright.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0129-qa-e2e-pantalla-inicio.md#criterios-de-aceptación`.

# Contexto mínimo

- `tests/e2e/start-screen.spec.ts`, `player-screen.spec.ts`,
  `party-summary.spec.ts`, `variant-map-hud-qa.spec.ts`: cobertura previa; el
  spec nuevo recorre el flujo completo sin duplicar aserciones frágiles.
- `src/host/start-screen*.ts`, `player-screen*.ts`, `party-summary*.ts`,
  `main.ts`: test ids y transiciones.
- REQ-016: `#flujo`, `#requisitos-creativos-decididos`,
  `#requisitos-técnicos`, `#tabla-de-sprites`.

# Artefactos

- `artifacts/TASK-0129/attempt-1/`: `report.md`, `test-output.txt`,
  `verify-output.txt`, `e2e-output.txt`, `screenshots/`, `logs/`.
- Capturas versionadas en `tests/e2e/<spec>/screenshots/`.

# Riesgos y decisiones abiertas

- 900×700: la ficha exige scroll interno; decidir si es defecto de esta tarea o
  observación documentada (no cambiar layout). Adjuntar captura y medición.
- El error del constructor de `GameSession` solo tiene unitarios; la UI no
  permite datos inválidos. No forzarlo desde E2E.
- Si un criterio falla, reportarlo con evidencia; no cambiar producto.

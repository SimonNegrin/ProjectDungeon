---
type: Task Report
title: "TASK-0144: informe del intento 2"
description: Criterio 7 endurecido; suite completa con 2 fallos ajenos preexistentes.
task: TASK-0144
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:30:23Z }
artifacts: artifacts/TASK-0144/attempt-2/
verified:
---

# Estado

`success`: criterio 7 cerrado. Victoria y Derrota no ofrecen pausa, guardado,
«Reiniciar» ni reinicio rápido, y `Esc`/`R`/`N`/`I` no alteran el estado.

# Cambios

- `tests/e2e/support.ts`: `winGame`/`WIN_GAME_SEED` (semilla 79, partida normal
  de un jugador y `defeatAllEnemies`).
- `tests/e2e/pause-save-load-qa.spec.ts`: criterio 7 endurecido; Victoria por
  flujo normal y Derrota con estado inyectado.
- Commit SHA: `88c9402`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 1734 tests; build y bundle OK | `verify-output.txt` |
| `test:e2e pause-save-load-qa --workers=1` | 7/7, 9.2 s | `e2e-specs.txt` |
| `test:e2e --workers=1` (900 s) | 271 pasan, 2 fallan; 4.3 min | `e2e-output.txt` |

Los 2 fallos son `qa-visual-revision-ui.spec.ts:970` (900x700 y 1280x720), por
`Turno de Ada` en el pie del HUD; reproducidos sin mis cambios
(`e2e-pre-existing.txt`). Puerto 4173 libre al cerrar.

# Evidencia visual

- `pause-save-load-qa/screenshots/resultado-victoria.png` y
  `resultado-derrota.png`: solo Nueva/Cargar, sin pausa ni guardado.
- Sin descargas al pulsar las teclas (aserción con `page.on('download')`).

# Desviaciones

- Derrota sigue con estado inyectado: no hay ruta normal documentada y no se
  inventó. La victoria usa flujo normal real (semilla 79).
- La suite completa escribe artefactos de todos los specs bajo `attempt-2/`;
  solo se commitea `pause-save-load-qa`; el fallo visual queda en
  `e2e-output.txt`.

# Problemas conocidos y preguntas abiertas

- La suite completa está roja por TASK-0151 (HUD «Turno de …»): el E2E de
  REQ-033 aún exige que el pie no contenga «Turno». Fuera de TASK-0144.
- Por lo anterior, el criterio 8 de la ficha queda pendiente de una suite verde.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `test:e2e` rojo en `main` por aserción de HUD obsoleta | `e2e-output.txt`; `d526125` añadió «Turno de»; `e2e-pre-existing.txt` sin mis cambios | Ejecutar specs afectados | Cualquier tarea que corra la suite completa choca | TASK-0151 actualice `qa-visual-revision-ui.spec.ts:396` o el HUD según REQ-033 | Bajo; test | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 1956 |
| `report_bytes` | 2805 |
| `overflow` | `none` |
| `criteria_failed` | 0 (criterio 7); suite completa roja por TASK-0151 |

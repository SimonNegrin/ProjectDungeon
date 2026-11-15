---
type: Task Report
title: "TASK-0153: informe de ejecución"
description: "Resultado Victoria/Derrota con Nueva y Cargar; sin pausa, guardado ni «Reiniciar»."
task: TASK-0153
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T23:15:10Z }
artifacts: artifacts/TASK-0153/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `result.ts` (modelo puro) y `result-view.ts` (diálogo con foco, anuncio y
  mensaje de carga); `main.ts` integra ambos caminos del render, el gate de
  pausa/input y el origen `result` del cargador.
- `index.html`/`ui.css`: `result-screen`; retirados `.overlay`, `overlay-*`,
  «Reiniciar» y `[data-action="restart"]`; `hud.ts` sin overlays.
- Tests nuevos `result.test.ts` y `host-result-qa.spec.ts`; specs `overlay-*`
  pasan a `result-screen`. Commit `b3ffee0`.

# Tests

| Comando (timeout) | Resultado | Evidencia |
|---|---|---|
| `vitest run tests/unit/host/result.test.ts` (120 s) | 8/8 | `test-output.txt` |
| `pnpm run verify` (600 s) | 1734 tests, build y bundle OK | `verify-output.txt` |
| `playwright test host-result-qa --workers=1` (420 s) | 5/5 | `e2e-host-result-qa.txt` |
| 7 specs afectadas en serie (600 s) | 40/40 | `e2e-specs-relacionadas.txt` |
| `motion-qa` en serie (600 s) | 8/8 | `e2e-motion-qa.txt` |

Suite E2E completa no ejecutada (TASK-0154).

# Evidencia visual

`e2e/host-result-qa/screenshots/`: victoria, derrota, 6 jugadores, flujo
normal, paso 1 tras «Nueva», carga inválida y válida. Revisar semilla sin
scroll, foco y mensaje de archivo inválido.

# Criterios cubiertos

Victoria/Derrota con ronda, party y semilla; «Nueva» abre el paso 1 sin
reiniciar; «Cargar» sin confirmación, con rechazo visible y carga válida; sin
pausa, guardado ni «Reiniciar»; sin avance automático; teclado y `aria-live`.

# Desviaciones

- `F1` sigue abriendo el debug con el resultado visible (diagnóstico, no acción
  de juego); lo usan specs de estado final. `F2` sigue bloqueado.
- En `?test=1` «Nueva» no navega (no hay pantalla de inicio); el flujo normal se
  prueba con semilla 79, victoria real con comandos.
- `hud.test.ts` pierde dos tests de overlays: el modelo ya no existe y su
  cobertura vive en `result.test.ts`.

# Problemas conocidos y preguntas abiertas

- ¿Permitir `F1` con el resultado visible o bloquearlo también?

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| No hay ruta documentada a `GameEnded` en flujo normal; `defeatAllEnemies` puede perder y exige buscar semilla | Semillas 4242/279837264/271828182 pierden; 79 gana en ronda 14 | Réplica temporal del helper sobre 80 semillas | Toda QA futura del resultado en flujo normal repite el escaneo | Helper `winGame(page)` o semillas de victoria en `tests/e2e/support.ts` | Bajo; test | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2953 |
| `report_bytes` | 3072 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

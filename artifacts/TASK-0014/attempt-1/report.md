---
type: Task Report
title: "TASK-0014: informe de ejecución"
description: Cursor de selección, input, camino, HUD, avisos y snapshot integrados en el host.
task: TASK-0014
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T01:58:00Z }
artifacts: artifacts/TASK-0014/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- Host: nuevos `cursor.ts` (estado puro, movimiento, clamp y derivación del
  plan), `cursor-view.ts` (cursor y puntos DOM recortados al viewport) y
  `notices.ts` (cuatro avisos aprobados).
- Host: `input.ts` mapea flechas/`WASD` a cursor, `Espacio`/`Enter` a `MoveTo` y
  `F` a `Attack` bajo el cursor; `main.ts` aplica el cursor sin pasar por el
  motor, lo reinicia en `PlayerTurnStarted`/`GameRestarted`/`F2`, lo limita al
  viewport y muestra rechazos; `hud.ts`/`debug.ts` exponen ayuda, aviso y cursor.
- `index.html`: `active-tile` sustituido por cursor y camino con `data-testid` y
  `data-cursor-state`; `hud-message` añadido. Sin botones nuevos.
- Tests: unitarios de cursor, input, avisos, HUD, snapshot y sesión; E2E de humo
  nuevo `game-cursor.spec.ts`; E2E previos actualizados de `Espacio`-atacar a
  `F` y de flechas-mover-jugador a cursor + `Moverse`, conservando cobertura.
- Commit: `2e60eea89b2a31863d7c16cbe4ffa416825498ba`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test` | 120 s | 27 archivos, 305 tests OK | `test-output.txt` |
| `pnpm run verify` | 180 s | Docs 82/15/2, config 3 agentes/9 skills, 305 tests, build 47 módulos OK | `verify-output.txt` |
| `pnpm run test:e2e` | 240 s | 19 tests OK (incluye 3 E2E de cursor) | `e2e-output.txt`, `e2e-cursor-output.txt` |
| `pnpm run build` | 120 s | `tsc --noEmit` + Vite OK | `build-output.txt` |

# Evidencia visual

- `screenshots/cursor-player.png`: cursor blanco de un tile sobre el jugador.
- `screenshots/cursor-path-green.png`: destino verde, dos puntos fuertes.
- `screenshots/cursor-path-amber.png`: destino ámbar discontinuo, puntos fuertes
  hasta el MP y atenuados después, recortados al viewport.
- `screenshots/cursor-blocked.png`: muro con borde rojo doble y sin puntos.
- `screenshots/cursor-enemy.png`: enemigo con borde rojo doble y marca en aspa.
- `screenshots/hud-message.png`: aviso `Destino no válido` sin alterar el estado.
- `screenshots/cursor-attack.png`: ataque con `F`, flash y daño (`5/10`).
- Qué mirar: patrón de borde por estado, contraste sobre suelo/muro, marca de
  objetivo, recorte del camino y ausencia de doble marco sobre el jugador.

# Desviaciones

- Ninguna de alcance. No se tocó `src/game/`, `docs/`, requisitos, criterios ni
  dependencias. El flash y el número de daño siguen funcionando.

# Problemas conocidos y preguntas abiertas

- La fase enemiga es síncrona en el motor actual (`resolveEndTurn` termina en
  fase de jugador), así que la ocultación en fase `enemy` se cubre con unitarios
  y no con un E2E observable; TASK-0015 podrá ampliarla si el motor expone pausa.
- El overlay DOM usa `left: 21.875%`/`width: 56.25%`, derivados del encuadre
  16:9; si cambia la proporción habría que parametrizarlo.
- Color, opacidades, aspa y duración del aviso son placeholders pendientes de
  playtest; no cambian reglas.
- El aviso caduca a 1600 ms y no bloquea la siguiente pulsación (E2E espera su
  desaparición y ejecuta `Moverse` después).

# Fricción reutilizable

| Síntoma | Evidencia | Workaround aplicado | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Ejecutar la suite E2E reescribe capturas versionadas de tareas antiguas y ensucia el diff de la tarea actual. | Tras `pnpm run test:e2e`, `git status --short` mostró PNG/JSON modificados en `artifacts/TASK-0007`, `TASK-0010`, `TASK-0011` y `EXP-000`; se revirtieron con `git checkout --`. | Revertir esos artefactos antes del commit; las capturas nuevas viven en `artifacts/TASK-0014/attempt-1/screenshots/`. | Cualquier tarea que lance E2E mutará evidencia histórica de otras tareas. | Parametrizar la carpeta de capturas en los specs (`E2E_ARTIFACTS_DIR` o `testInfo.outputPath`) con default en `test-results/`; como mínimo, documentar en `docs/harness/visual-qa.md` que las capturas de suite no son evidencia histórica. | Bajo; toca tests y una nota de arnés, sin cambiar criterios. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4123 |
| `report_bytes` | 4754 |
| `overflow` | `none` |
| `criteria_failed` | 0 |
| `cause` | — |

# Checklist

- [x] Criterios cubiertos y sin tests debilitados
- [x] Evidencia guardada y enlazada
- [x] Sin salidas completas pegadas en el informe
- [x] Listo para verificación del lead

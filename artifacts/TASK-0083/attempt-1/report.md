---
type: Task Report
title: "TASK-0083: informe de ejecución"
description: Resultado del intento 1.
task: TASK-0083
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T14:10:00Z }
artifacts: artifacts/TASK-0083/attempt-1/
verified:
---

# Estado

`success`.

# Cambios

- `src/host/input.ts`, `spell-menu.ts`, `spell-menu-view.ts`: `Q` abre/cierra,
  `↑/↓`/`W/S` navegan, `1`-`6` eligen, `Enter` lanza contra el cursor, `Esc`
  cierra o deselecciona y `X` lanza el seleccionado. Cancelar no despacha.
- `src/host/hud.ts`, `index.html`: magia y maná del jugador y del enemigo bajo
  cursor; lista de seis filas con nivel, coste y disponibilidad.
- `src/host/{notices,feedback-config,motion,main}.ts`: motivos de rechazo, beats y
  cues de hechizo, textos `-N`/`Fallo`/`+N`/`Vuelve N PV`, y maná/acción
  progresivos en la presentación.
- Commits: `e5c9ec2` (feat), `8166dce` (test).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run ...` (7 archivos host) | 97/97 | `test-output.txt` |
| `pnpm run verify` | OK: 1169 tests, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 116/116 | `e2e-output.txt` |
| `pnpm run docs:check` | OK | `docs-check-output.txt` |

# Evidencia visual

- `spell-hud-qa/screenshots/hechizos-lista-1280x720.png` y `...-900x700.png`.
- `spell-hud-qa/screenshots/hechizos-curacion-1280x720.png` y `...-900x700.png`.
- Mirar: seis filas con nivel/coste/disponibilidad, HUD `Magia 4`/`Maná
  16/16`, `+4` verde sobre el aliado, y ausencia de texto de réplica.

# Desviaciones

- `spell-menu.ts` y `spell-menu-view.ts` son módulos nuevos del host; no se tocó
  `src/game/**`.
- El E2E usa un estado sin `map` y con 3 acciones para aislar el tope de
  REQ-025 R-006; no cambia reglas.
- `spell-list`/`spell-row-*` son test IDs nuevos del host; el brief solo fijaba
  los de HUD.

# Problemas conocidos y preguntas abiertas

- La resurrección se presenta reutilizando el nodo de texto de daño; hay unitario
  de cue/texto, pero no E2E dedicado de resurrección.
- `Esc` con la lista cerrada y sin selección no hace nada.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| `E2E_ARTIFACTS_DIR` aplicado a la suite completa escribe capturas de todos los specs bajo el intento. | `e2e-output.txt`; 20 MB generados y se conservaron solo los del spec. | Ejecutar el spec focalizado con la variable y la suite completa sin ella. | Afecta a cualquier tarea que capture con la suite completa. | Documentar en workflow que la variable se reserve al spec de la tarea. | Bajo; solo docs. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4092 |
| `report_bytes` | 2886 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

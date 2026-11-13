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
  - by: task-lead
    at: 2026-11-13T14:09:43Z
    note: >-
      Verificación independiente en `task/TASK-0083` (host `e5c9ec2`, tests
      `8166dce`/`d2e0f15`, artefactos `d32e443`, verificación `f71bd31`, fusión
      `d92f059`). Diff completo revisado: solo
      host, `index.html`, tests y artefactos; `src/game/**`, requisitos, arnés,
      plantillas y dependencias intactos. Re-ejecutados `pnpm run verify`
      (1170/1170; docs, config, tsc, build y bundle OK), `pnpm run test:e2e`
      (116/116) y `docs:check` (437 documentos), más el spec focalizado (4/4)
      con capturas byte-idénticas a las del runner. Criterios 1–7 comprobados;
      capturas 1280×720 y 900×700 revisadas. Sin tests borrados, saltados o
      debilitados. Fricción `E2E_ARTIFACTS_DIR` rechazada: `visual-qa` ya limita
      el comando a `<spec>`. Detalle en `lead-verification.md`.
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
- Commits: `e5c9ec2` (feat), `8166dce` y `d2e0f15` (test).

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run ...` (7 archivos host) | 98/98 | `test-output.txt` |
| `pnpm run verify` | OK: 1170 tests, build y bundle | `verify-output.txt` |
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
| `E2E_ARTIFACTS_DIR` aplicado a la suite completa escribe capturas de todos los specs bajo el intento. | `e2e-output.txt`; 20 MB generados y se conservaron solo los del spec. | Ejecutar el spec focalizado con la variable y la suite completa sin ella. | Afecta a cualquier tarea que capture con la suite completa. | Documentar en workflow que la variable se reserve al spec de la tarea. | Bajo; solo docs. | `rejected`: `visual-qa` ya documenta el comando con `<spec>`. |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 4092 |
| `report_bytes` | 3833 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

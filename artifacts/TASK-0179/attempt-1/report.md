---
type: Task Report
title: "TASK-0179: informe de ejecución"
description: Aviso de PV completo, coste/alcance en la lista y E2E de Clérigo con curación adyacente, autocuración y maná +4.
task: TASK-0179
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:30:47Z }
artifacts: artifacts/TASK-0179/attempt-1/
verified:
---

# Estado

`success`: host, tests y E2E actualizados sin tocar reglas, catálogo ni maná.

# Cambios

- `src/host/notices.ts`: `target-full-hp` → «Ya está a PV completo».
- `src/host/spell-menu.ts` + `spell-menu-view.ts`: fila `Nv · maná · alcance`
  desde el catálogo (`alcance 1` / `alcance 1–3`); el modelo expone `range` y
  `meta` y la vista no compone cifras.
- Unitarios: motivo nuevo y meta desde `SPELLS`.
- E2E `spell-hud-qa`: aliado adyacente y escenario de Clérigo con 12 de maná
  (curación adyacente, autocuración, rechazos a PV completo y alcance 2, maná
  12 → 4 → 8, sin errores de consola).
- E2E `damage-types-qa`: aliado a 1 casilla y recarga antes de resucitar (8 + 12
  no caben en 16 de maná).
- E2E `hotseat-flow-qa`: maná al relevar pasa a `min(actual + 4, máximo)`.
- Commit SHA: `daf59f190d470adecdd99ebd2b69b282b5ba8b28`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | ok: 118 archivos, 1911 tests, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | ok: 294 tests | `e2e-output.txt` |

# Evidencia visual

- `spell-hud-qa/screenshots/clerigo-lista-{1280x720,900x700}.png`: Curación III
  «8 maná · alcance 1» y Resurrección IV «12 maná · alcance 1».
- `clerigo-aviso-pv-completo-{1280x720,900x700}.png`: aviso «Ya está a PV
  completo» con maná 12/12 intacto.
- `clerigo-curacion-adyacente-*`, `clerigo-autocuracion-*` y
  `clerigo-mana-recuperado-*`: +6 PV, autocuración y HUD 8/12 en la ronda 2.

# Desviaciones

- El «detalle» del criterio 2 es la línea meta de cada fila: no existe otro
  panel de hechizo. Lista y meta leen `SpellDefinition`.
- Se actualizó `hotseat-flow-qa`, no citado en la ficha, porque su maná lleno
  contradecía la regla +4 ya fusionada y rompía el E2E completo.

# Problemas conocidos y preguntas abiertas

- Ninguna bloqueante. La resurrección se prueba con un cadáver sintético.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Una tarea de regla deja un E2E rojo fuera de los specs que cita la siguiente. | `hotseat-flow-qa:244` fijaba maná 16/16 tras TASK-0177. | Actualizar al `min(actual + 4, máximo)`. | Cada cambio de recurso obliga a buscar la invariante vieja. | Al cerrar una regla, ejecutar el E2E completo o buscar su invariante vieja. | Bajo: solo proceso de cierre. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 |
| `report_bytes` | 2997 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

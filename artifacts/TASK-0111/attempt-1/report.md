---
type: Task Report
title: "TASK-0111: informe de ejecución"
description: "Retrato del HUD ligado al sprite del jugador activo."
task: TASK-0111
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:52:00Z }
artifacts: artifacts/TASK-0111/attempt-1/
verified:
---

# Estado

`success`. `hud-portrait` pinta el recorte de `rogues.png` del jugador activo y
cambia en el mismo render que nombre y arquetipo, sin tocar disposición, escala
ni paleta.

# Cambios

- `src/host/hud.ts`: `HudModel.portrait`, mapa de los nueve arquetipos a celdas
  32×32 y pintado inline con la misma escala que el arma.
- `src/host/hud-detail.ts`: `archetypeLabel` tolera un id fuera del roster para
  cumplir el recorte seguro; con ids válidos no cambia nada.
- `tests/unit/host/hud.test.ts`: nueve recortes, cambio de jugador activo y
  casos sin jugador/arquetipo.
- `tests/e2e/hud-portrait-qa.spec.ts`: carga por arquetipo, cambio con
  `window.__game.setup` sin recargar, CLS ≤1 px y capturas.
- Commit SHA: `4bbbbf676583ad21ac60ff14faaf2a81fc624424`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 93 archivos, 1319 tests; build y bundle OK | `verify-output.txt` |
| `pnpm run test:e2e` | 187 passed (1,6 min) | `e2e-output.txt` |
| `hud-portrait-qa` focalizado | 4 passed; capturas con `E2E_ARTIFACTS_DIR` | `e2e/hud-portrait-qa/` |

`docs:check` mantiene avisos históricos de tamaño; ningún fallo.

# Evidencia visual

- `e2e/hud-portrait-qa/screenshots/`: guerrero, mago y pícaro a 900×700 y
  1280×720.
- Logs de las tres muestras y cajas en `e2e/hud-portrait-qa/logs/`.
- `portrait-audit.json`: `identical: false`, «El retrato varía entre
  arquetipos».
- Mirar `hud-portrait-warrior-900x700.png`, `…-mage-…` y `…-rogue-…`: jinete,
  mago y pícaro distintos, con la misma caja de Personaje antes y después.

# Desviaciones

- La posición se pinta con `calc(var(--ui-scale) * Npx)`, igual que el sprite
  del arma. `--ui-unit` ya es una longitud y multiplicarla por `px` sería
  inválido; el resultado lógico es el mismo (`-sx*2`, `-sy*2`).
- `artifactPath` añade el subdirectorio del spec; las capturas quedan en
  `e2e/hud-portrait-qa/screenshots/`, no en la raíz de `e2e/`.

# Problemas conocidos y preguntas abiertas

- El canvas del mapa sigue dibujando el caballero para todos; queda fuera de
  alcance y no afecta a la aceptación de la miniatura.
- Sin defectos bloqueantes ni preguntas abiertas.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief propone `calc(var(--ui-unit) * -sx2px)`, pero `--ui-unit` es una longitud: multiplicarla por `px` es CSS inválido. | `src/host/ui.css` define `--ui-unit: calc(var(--ui-scale) * 1px)`. | Usar `calc(var(--ui-scale) * Npx)`, como el sprite del arma. | Cualquier brief futuro que copie la fórmula del retrato. | Aclarar en la plantilla: `--ui-scale` para posición y `--ui-unit` con factor unitario. | Bajo; solo redacción. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2539 |
| `report_bytes` | 3276 |
| `overflow` | `none` |
| `criteria_failed` | `none` |

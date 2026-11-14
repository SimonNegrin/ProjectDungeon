---
type: Task Report
title: "TASK-0106: informe del intento 1"
description: Ficha derecha con un solo indicador de tipo, sprite, stats verticales y traits condicionales.
task: TASK-0106
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T13:22:00Z }
artifacts: artifacts/TASK-0106/attempt-1/
verified:
---

# Estado

`success`. Ficha del HUD derecho simplificada sin tocar reglas, inventario,
navegación ni `docs/`.

# Cambios

- Archivos: `src/host/hud-detail.ts`, `hud.ts`, `ui.css`, `index.html`; tests en
  `tests/unit/host/hud-detail.test.ts` y tres specs E2E.
- Commits: código `e493472`; tests `b8f574e`.
- Modelo: fuera `subtitle`, `description` y la fila «Stats»; dentro `stats`
  (valor delante), `traits` y `sprite`. El eyebrow se oculta si repite el título
  y el terreno no repite su tipo en una fila. Panel: seleccionado sin etiqueta,
  equipado con «Equipado».
- DOM/CSS: sprite de `items.png` con `--ui-scale` y `pixelated`; listas
  verticales de stats y traits; sin colores ni medidas fuera de tokens y hoja.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 1309 tests, `tsc`, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` (`E2E_ARTIFACTS_DIR`) | 166/166 en 1,2 min | `e2e-output.txt` |
| Vitest focalizado de host | 481/481 | terminal |

No apareció el flake de EXP-004; no hizo falta `VITEST_MAX_WORKERS=2`.

# Evidencia visual

- `e2e/hud-right-detail-qa/screenshots/ficha-dos-secciones-{900x700,1280x720}.png`
- `ficha-objeto-{sin,con}-traits-{900x700,1280x720}.png` y
  `ficha-hueco-vacio-{900x700,1280x720}.png`
- `e2e/hud-three-zones-qa/screenshots/detalle-{enemigo,objeto,puerta,terreno-suelo,desconocido}.png`
- Mirar: sprite entero y pixelado, una fila por stat, sin «Stats»,
  «Seleccionado», «Sin traits activos» ni descripciones; vacío solo «Equipado» y
  «Vacío».

# Desviaciones

- El catálogo declara `traits: []` y el validador los prohíbe. Para capturar
  «con traits» sin tocar `src/game/**`, el E2E inyecta un trait en el módulo del
  navegador y el unitario lo restaura en `finally`; producción solo lee catálogo.
- El objeto del suelo conserva «Ubicación: Suelo» como fila propia y añade
  sprite/stats.

# Problemas conocidos y preguntas abiertas

- Los traits reales no se verán en partida hasta que REQ-018 los declare.
- «Fondo distinto» se interpreta como sección elevada (`--ui-raised`) frente al
  HUD; ambas secciones comparten token. Si se esperaban dos fondos entre sí, es
  un ajuste de una línea.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| El brief pide capturar traits, pero el catálogo exige `traits: []` y el validador los rechaza. | `src/game/equipment.ts:384`; fixture del E2E | Inyectar un trait en runtime y restaurarlo | Toda verificación de traits o pasivos chocará con el catálogo vacío | Documentar el fixture o eximir la captura | Bajo; solo test | `deferred (harness-keeper)` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2839 |
| `report_bytes` | 3247 |
| `overflow` | `none` |
| `criteria_failed` | `none` |

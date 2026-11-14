---
type: Task Report
title: "TASK-0114: informe de ejecución"
description: Panel arriba, casco en la primera fila y figura sin cabeza.
task: TASK-0114
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T17:05:00Z }
artifacts: artifacts/TASK-0114/attempt-1/
verified:
---

# Estado

`success`: columnas arriba, casco en la fila superior, cabeza fuera de DOM y CSS.

# Cambios

- `index.html`: fuera `.inventory-figure-head`. `ui.css`: `align-content: start`
  en la rejilla de Equipo y figura anclada a `--ui-slot`/`--ui-unit`, recolocada
  detrás de los slots.
- Tests: `ui-foundations.test.ts`, `panel-top-alignment-qa.spec.ts`.
- Commit SHA: `16eacee` (implementación), `7242c91` (tests); artefactos aparte.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (120 s) | OK: 1323 unitarios, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` (180 s) | OK: 192 E2E | `test-output.txt` |
| `panel-top-alignment-qa` | OK: 2/2 | `panel-top-alignment-qa/` |

Cubren ausencia de cabeza, cinco bloques, `align-content: start`, primera fila a
un hueco del título en las tres columnas, casco = inicio del contenido (±1 px),
ningún bloque verde sobre él, `aria-hidden` sin foco ni puntero, slots iguales y
estabilidad al abrir, navegar, equipar, recoger y reabrir.

# Evidencia visual

- `screenshots/panel-arriba-{900x700,1280x720}.png`, `panel-sin-cabeza-1280x720.png`,
  `panel-cls-1280x720.png`; logs en `panel-top-alignment-qa/logs/`.
- Mirar: títulos en una línea, casco arriba al centro sin verde encima y torso,
  brazos y piernas reconocibles tras los slots.

# Desviaciones

- Las piernas desbordan la caja de la figura por abajo para verse bajo los pies;
  la caja sigue midiendo las cinco filas.

# Problemas conocidos y preguntas abiertas

- Ninguno.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Reutilizable | Cambio propuesto | Coste | Disposición |
|---|---|---|---|---|---|---|
| El observer CLS copiado marca como prohibidos los shifts del Suelo. | `li[inventory-ground-item-*]` `forbidden` al recoger con 4 objetos. | Filtrar por `matches` del armazón/slots, no `closest('.inventory-column')`. | Cada spec nuevo lo reimplementa y choca con P-006. | Extraerlo a `tests/e2e/support.ts`. | Bajo | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2596 |
| `report_bytes` | 2479 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

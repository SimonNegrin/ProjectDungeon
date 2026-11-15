---
type: Task Brief
title: "TASK-0127: brief del intento 2"
description: Cierra el mapeo de las 18 celdas y separa la captura del HUD.
task: TASK-0127
attempt: 2
status: stable
brief_bytes: 2329
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T10:35:00Z }
---

# Objetivo

Completar la evidencia del intento 1 sin cambiar el comportamiento: cubrir el
mapeo de las **18** celdas (9 arquetipos × variantes 1 y 2) en la resolución
compartida y hacer que la captura de HUD muestre la miniatura, no el mismo marco
que el mapa.

# Motivo (verificación del lead)

El intento 1 pasa `verify` y E2E 229/229, pero la prueba nueva solo muestrea la
variante 2 en 4 de 9 arquetipos (barbarian, archer, cleric, spellblade y cook no
se comprueban). Una regresión que devolviera la variante 1 en esos cinco pasaría
los tests. Además, `mapa-*.png` y `hud-*.png` son idénticos porque el nodo
`[data-testid="hud"]` ocupa todo el marco.

# Cambios solicitados

- Test parametrizado sobre los 9 arquetipos × 2 variantes: `variantCellFor` (o
  la vía pública que usan mapa y HUD) devuelve exactamente
  `ARCHETYPE_VARIANT_CELLS[id][variant - 1]`, con `sw`/`sh` 32, y HUD y renderer
  comparten esa celda para el mismo jugador. Sin tocar producción salvo que el
  test revele un fallo real.
- En `tests/e2e/variant-map-hud-qa.spec.ts`, capturar el HUD con
  `[data-testid="hud-left"]` (o el nodo que contenga la miniatura) para que
  `hud-variante-*.png` no sea byte a byte igual que `mapa-variante-*.png`.
  Mantener las aserciones actuales de hash de canvas y `background-position`.

# No objetivos

Lo mismo que el intento 1: sin cambios de arte, tabla, roster, cámara, orden,
escala, layout, hotseat, `?test=1` ni «Cargar». No tocar `docs/`.

# Criterios de aceptación

En `docs/tasks/TASK-0127-render-variante-mapa-miniatura-hud.md#criterios-de-aceptación`;
enlazar, no copiar.

# Tests y artefactos

`pnpm exec vitest run tests/unit/host/renderer.test.ts tests/unit/host/hud.test.ts`,
`pnpm run test:e2e tests/e2e/variant-map-hud-qa.spec.ts`, `pnpm run verify`.
Escribe `artifacts/TASK-0127/attempt-2/{report.md,test-output.txt,e2e-output.txt,verify-output.txt}`,
regenera capturas/log bajo `attempt-2/` y conserva el intento 1. Todo comando con
timeout; pnpm; servidor solo con el `webServer` de Playwright.

---
type: Task Report
title: "TASK-0115: informe de ejecución"
description: Siluetas sólidas de los ocho slots de equipamiento vacíos.
task: TASK-0115
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T16:55:00Z }
artifacts: artifacts/TASK-0115/attempt-1/
verified:
---

# Estado

`success`. Los ocho slots de Equipo vacíos pintan su silueta de `items.png` con
`--ui-line-color`; el slot lleno muestra solo el sprite y la silueta reaparece al
desequipar.

# Cambios

- `src/game/equipment.ts`: tabla única `EQUIPMENT_SILHOUETTES` con las ocho
  etiquetas aprobadas; arma, escudo y armadura reutilizan el sprite del catálogo.
- `src/host/inventory-panel-view.ts`: capa `aria-hidden` solo para Equipo,
  posición de máscara desde la tabla y ocultación cuando el slot está ocupado.
  Bolsa y Suelo no crean la capa.
- `src/host/ui.css`: `.inventory-slot-silhouette` con `mask-image`, tamaño de
  hoja y color de token; capa absoluta propia, sin tocar `.ui-inset` ni bisel.
- Tests: `tests/unit/host/slot-silhouette.test.ts` y
  `tests/e2e/equipment-silhouettes-qa.spec.ts`.
- Commit SHA: `23113e1`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 94 archivos, 1328 tests, tsc, build y bundle | `verify-output.txt` |
| `pnpm run test:e2e` | 195/195 en 1.2 min | `test-output.txt` |

La E2E comprueba recorte, color, máscara, ausencia en Bolsa/Suelo, ocultación al
equipar, reaparición al desequipar y geometría/bisel sin cambios.

# Evidencia visual

- `screenshots/ocho-slots-vacios-{1280x720,900x700}.png`
- `screenshots/un-slot-lleno-{1280x720,900x700}.png`
- `screenshots/slot-lleno-equipado-1280x720.png`
- `screenshots/silueta-reaparece-1280x720.png`
- Logs de estilos y recortes en `logs/`.

Revisar: siluetas sólidas y legibles; sin máscara ni resto al equipar; rejilla,
tamaño y bisel inmóviles.

# Desviaciones

- Ninguna funcional. No se tocaron cursor (TASK-0116), figura, reglas,
  navegación, `items.png` ni documentación.

# Problemas conocidos y preguntas abiertas

- Primer E2E completo con un fallo intermitente ajeno en `generated-map-qa`
  (posición tras F2); aislado y en la segunda pasada completa pasó 195/195. Sin
  preguntas abiertas.

# Fricción reutilizable

Ninguna.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2513 |
| `report_bytes` | 2446 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

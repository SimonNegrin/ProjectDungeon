---
type: Task Report
title: "TASK-0096: informe del intento 2"
description: Corrige el pulso del HUD en soltar/desequipar y restaura la aserción de capas.
task: TASK-0096
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-13T21:02:00Z }
artifacts: artifacts/TASK-0096/attempt-2/
verified:
---

# Estado

`success`. Se corrigen los dos defectos de la verificación independiente sin
cambiar cue kinds, duraciones, banners, copy ni reglas.

# Cambios

- `src/host/feedback-events.ts`: `weaponSlotPulseAt` filtra por
  `cue.eventType` (`PickUp`/`SelectWeapon`). `DropItem`/`UnequipItem` siguen
  usando el cue `select-weapon`, pero ya no pulsan el rótulo del arma.
- `tests/unit/host/feedback-events.test.ts`: regresión de soltar/desequipar
  (cue conservado, sin pulso); se mantienen recogida y cambio de arma.
- `tests/unit/host/renderer.test.ts`: el test de orden vuelve a comprobar
  `itemIndex > decalIndex` y `unitIndex > itemIndex`.
- Commit: `bcdacc4`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK (docs, config, unitarios, build, bundle) | `verify-output.txt` |
| `pnpm exec vitest run` focalizado | 157/157 en 8 archivos | `focused-test-output.txt` |

# Evidencia visual

- No aplica en este intento; la QA visual/E2E sigue en TASK-0098.

# Desviaciones

- Ninguna.

# Problemas conocidos y preguntas abiertas

- Ninguno nuevo.

# Fricción reutilizable

Ninguna entrada.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2083 |
| `report_bytes` | 1618 |
| `overflow` | `none` |
| `criteria_failed` | `none` |

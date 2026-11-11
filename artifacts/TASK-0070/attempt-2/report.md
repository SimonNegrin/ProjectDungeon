---
type: Task Report
title: "TASK-0070: informe del intento 2"
description: Hint de acierto/daño en la celda Arma del bloque de combates.
task: TASK-0070
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T22:15:00Z }
artifacts: artifacts/TASK-0070/attempt-2/
verified:
---

# Estado

`success`. Brecha de R-004 cerrada: la celda Arma del enemigo muestra el acierto y
daño del arma equipada sin añadir columnas ni inputs.

# Cambios

- **Archivos:** `experiments/EXP-003-mesa-combate/src/main.ts` y
  `tables.test.ts`.
- **Celda Arma:** añade un `span.weapon-hint` dentro de la celda existente, con
  `formatWeaponBonus`. Sin arma muestra «sin arma»; con arma, «Acierto +N · Daño
  +N».
- **Sincronización:** el hint se actualiza al cambiar el arma del enemigo, al
  editar acierto/daño en la tabla de armas, tras recálculos y en resets. También
  se refresca en `syncCombats` como red de seguridad.
- **Invariantes:** se conservan las 15 columnas, un único input/select por stat y
  el foco del selector (no se reconstruye la celda al recalcular).
- **Test:** nuevo caso que comprueba que el hint sale del catálogo de trabajo:
  arma cambiada, «sin arma» y daño editado.
- **Commit SHA de código:** `afb062a`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm exec vitest run experiments/EXP-003-mesa-combate/src` | 11 archivos, 178 tests OK | `test-output.txt` |
| `pnpm run verify` | 2 intentos: solo falla el timeout ajeno de EXP-004 | `verify-output.txt` |
| secuencia equivalente | docs, config, 974 tests con `--testTimeout=15000`, tsc, vite y bundle OK | `verify-fallback.txt` |

# Evidencia visual

- No hay captura: E2E y QA visual corresponden a TASK-0071.
- Qué revisar en 0071: la celda Arma de cada bloque muestra el hint compacto, se
  actualiza al cambiar arma/acierto/daño y no rompe el ancho de columna a 1280.

# Desviaciones

- Sin Playwright, E2E ni QA visual por alcance de esta tarea.
- El primer `pnpm run verify` y su repetición fallaron solo por el timeout ajeno
  de `EXP-004 spawn`. Se ejecutó la secuencia equivalente con
  `pnpm exec vitest run --testTimeout=15000` + docs/config/build/bundle y quedó
  verde. No se modificó EXP-004.

# Problemas conocidos y preguntas abiertas

- El timeout intermitente de `EXP-004 spawn` sigue siendo un problema ajeno a
  esta tarea; no se ha tocado.
- La comprobación visual final del hint queda para TASK-0071.

# Fricción reutilizable

Ninguna nueva. El fallo intermitente de EXP-004 ya se documentó en el intento 1.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2324 |
| `report_bytes` | 2727 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

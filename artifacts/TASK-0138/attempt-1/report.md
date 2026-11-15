---
type: Task Report
title: "TASK-0138: informe de ejecución"
description: Esquema v1, manifiesto y round-trip determinista del estado.
task: TASK-0138
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:48:00Z }
artifacts: artifacts/TASK-0138/attempt-1/
verified:
---

# Estado

`success`. La v1 se construye, valida y relee con round-trip byte a byte.

# Cambios

- `src/game/save.ts`: API v1, manifiesto y validación estricta.
- `src/game/index.ts`: exporta el módulo nuevo.
- `tests/unit/game/save-schema.test.ts`: 62 tests nuevos.
- Commit SHA: `8c0ddbff530d7fc1b81c44bef6383c67d7cb57eb`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 1630 tests, build y bundle | `verify-output.txt` |
| `pnpm exec vitest run tests/unit/game/save-schema.test.ts tests/unit/game/engine.test.ts` | OK: 109 tests | `test-output.txt` |

Cubre campos completos, `lootable` true/false, cadáveres, contenedores,
fantasma, IA, RNG siguiente, manifiesto estricto, `turn`/`round`, ausencia de
presentación y mutación cero.

# Evidencia visual

No aplica: sin UI, zip ni descarga.

# Desviaciones

- Fantasma y cadáveres usan `makeUnit`/`settleUnitDeath`, no solo comandos: no
  hay ruta acotada que garantice esas muertes. Hay round-trip con muertes del
  motor.
- Sin allocator de ids: se serializan los existentes, como fija el brief.
- `containers`/`groundItems` conservan presencia/ausencia; `map` y `config` son
  obligatorios (`SaveBuildError` si faltan).
- Se usa `phase: player | enemy` (brief); REQ-024 ejemplifica `players`
  (fricción). Con nombre vacío, el resumen usa el del arquetipo; la party
  guardada conserva el original.

# Problemas conocidos y preguntas abiertas

- ADR-028 pendiente; sin migraciones ni cruce del resumen con la partida.
- La v1 queda atada al `Container` actual; REQ-020 debe subir versión si cambia.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| REQ-024 ejemplifica `"phase": "players"`; el brief y `Phase` usan `player \| enemy`. | `REQ-024#formato-de-guardado-v1` vs `types.ts`. | Se implementa `player \| enemy`. | Un lector del requisito puede implementar el valor equivocado. | Corregir el ejemplo a `"player"` (owner de docs). | Bajo: texto. | `pending` |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2334 |
| `report_bytes` | 2555 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

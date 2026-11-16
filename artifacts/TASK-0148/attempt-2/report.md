---
type: Task Report
title: "TASK-0148: informe del intento 2"
description: La resurrección consume el cadáver y recupera su contenido sin duplicar.
task: TASK-0148
attempt: 2
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T00:20:00Z }
artifacts: artifacts/TASK-0148/attempt-2/
verified:
---

# Estado

`success`. REQ-021 v5 R-014/T-014: al resucitar se retira el contenedor
`corpseOf`, se recupera lo que aún guardaba y una segunda muerte crea cadáver
nuevo.

# Cambios

- `src/game/death.ts`: `reclaimPlayerCorpse` retira los contenedores `corpseOf`
  y reparte sus instancias por `ITEMS[].slot`, con la mochila como respaldo;
  conserva lo que el fantasma ya lleva.
- `src/game/magic.ts`: recupera antes de mutar; si algo no cabe, rechaza
  `inventory-full` sin consumir ni retirar el cadáver.
- Tests: 4 en `magic.test.ts` y 1 en `engine.test.ts` (muerte, resurrección y
  segunda muerte).
- Commit SHA: `624a30a`

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `vitest run magic, engine y turn` | 3 archivos, 135 tests OK | `test-output.txt` |
| `pnpm run verify` | 109 archivos, 1751 tests; docs, tsc, build y bundle OK | `verify-output.txt` |

E2E completa no ejecutada: la hace el lead.

# Evidencia visual

- No aplica.

# Desviaciones

- Ninguna de alcance: sin cambios en docs, host, dependencias ni tests previos.

# Problemas conocidos y preguntas abiertas

- Capacidad no cubierta por REQ-021: si la mochila del fantasma más lo que queda
  en el cadáver supera los huecos, se rechaza con `inventory-full` (REQ-018
  T-005). Confirmar la regla deseada.
- La recolocación por `ITEMS[].slot` puede equipar un objeto que estaba en la
  mochila del cadáver; el contenedor no conserva el origen.

# Fricción reutilizable

Ninguna que cumpla disparador.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 2450 |
| `report_bytes` | 1972 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

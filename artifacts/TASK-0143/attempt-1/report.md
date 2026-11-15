---
type: Task Report
title: "TASK-0143: informe del intento 1"
description: ADR-030, glosario y alcance de REQ-034 documentados y verificados.
task: TASK-0143
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:23:00Z }
artifacts: artifacts/TASK-0143/attempt-1/
verified:
  - by: task-lead
    at: 2026-11-15T18:23:11Z
---

# Estado

`success`. ADR-030, glosario, índice de decisiones y alcance describen el botín
de REQ-034 tal como está implementado. El alcance lo aplicó `requirements-writer`
en `95b4f23` tras el bloqueo inicial y el lead verificó el diff contra REQ-034 v1
y el código.

# Cambios

- `docs/decisions/ADR-030-saqueabilidad-botin-enemigos.md`: `lootable` por
  instancia, `lootPolicy` common/progression, tirada 25 %/100 %, RNG derivado sin
  consumir el principal, cadáver como `Container`, retirada al vaciar, coste 0 en
  el mismo tile y guardado sin retirada.
- `docs/glossary.md`: «objeto saqueable» y «saqueo de cadáver»; «cadáver»
  explicita 0 acción/0 MP.
- `docs/decisions/index.md`: entrada de ADR-030.
- `docs/design/architecture.md`: sección «Botín de enemigos».
- `docs/scope.md` (`95b4f23`, requirements-writer): fase 1.16, estado de
  requisitos, decisión confirmada, fuera de alcance y correcciones de pausa y
  guardado.
- Tarea a `done`, log y tablero actualizados.
- Commits: `3af9ff6` (ADR/glosario), `f2fbe4e` (evidencia y bloqueo),
  `95b4f23` (alcance) y cierre.
- Sin brief: tarea `docs` ejecutada por el lead, sin `task-runner`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK; 690 documentos, 160 tareas | `lead-verify/docs-check-output.txt` |
| `pnpm run verify` | 107 archivos/1678 tests, tsc, build y bundle OK | `lead-verify/verify-output.txt` |

# Criterios

1. ADR-030 con modelo, tirada, RNG y cadáver: pasa.
2. Cargar no tira y RNG principal intacto: pasa.
3. Glosario con objeto saqueable, cadáver y coste: pasa.
4. Alcance con cadáver condicionado y llaves reservadas: pasa (`95b4f23`).
5. Índice de decisiones y log con ADR-030 y cierre: pasa.
6. Sin ediciones en `docs/requirements/**`: pasa.
7. `docs:check` y `verify`: pasan.

# Observación no bloqueante

El párrafo «trabajo inmediato» de `docs/scope.md` conserva una lista previa
(inventario, saqueo, muerte, HUD) ya implementada; es deuda de alcance anterior y
no contradice REQ-034. Se difiere a `requirements-writer` como limpieza de bajo
riesgo.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Una tarea `docs` mezcla ADR/glosario con alcance, de dueños distintos | TASK-0128 y TASK-0143 | requirements-writer aplica `docs/scope.md` en la misma rama | Se repite en cada tarea de documentación de un requisito | Reservar el alcance a requirements-writer al planificar | Bajo | `deferred` a requirements-writer |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin runner) |
| `report_bytes` | 3140 |
| `overflow` | `scope-proposal` |
| `criteria_failed` | 0 |

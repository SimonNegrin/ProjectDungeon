---
type: Task Report
title: "TASK-0143: informe del intento 1"
description: ADR-030 y glosario listos y verificados; alcance bloqueado por propiedad de requirements-writer.
task: TASK-0143
attempt: 1
report_status: blocked
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T19:25:00Z }
artifacts: artifacts/TASK-0143/attempt-1/
verified:
---

# Estado

`blocked` por el criterio del alcance. ADR-030, el glosario, el índice de
decisiones y la arquitectura están escritos, verificados y comprometidos. El
criterio 4 exige `docs/scope.md`, que no está en la allowlist de `task-lead`
(ADR-016); su dueño es `requirements-writer`. Propuesta lista en
`scope-proposal.md`.

# Cambios

- `docs/decisions/ADR-030-saqueabilidad-botin-enemigos.md`: modelo implementado
  de `lootable`, `lootPolicy` common/progression, tirada 25 %/100 %, RNG
  derivado sin tocar el principal, cadáver como `Container`, retirada al vaciar,
  coste 0 en el mismo tile y guardado sin retirada.
- `docs/glossary.md`: «objeto saqueable» y «saqueo de cadáver»; «cadáver» pasa a
  decir 0 acción y 0 MP.
- `docs/decisions/index.md`: entrada de ADR-030.
- `docs/design/architecture.md`: sección «Botín de enemigos» con las piezas
  implementadas.
- `docs/tasks/TASK-0143-…md`: `task_status: in_progress`.
- Commit: `3af9ff6`. Sin brief: tarea `docs` ejecutada por el lead.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run docs:check` | OK: 688 documentos, 160 tareas | `docs-check-output.txt` |
| `pnpm run verify` | 107 archivos/1678 tests, tsc, build y bundle OK | `verify-output.txt` |

# Criterios

1. ADR-030 con modelo, tirada, RNG y cadáver: pasa.
2. Cargar no tira y RNG principal intacto: pasa.
3. Glosario con objeto saqueable, cadáver y coste: pasa.
4. Alcance con cadáver condicionado y llaves reservadas: **blocked**.
5. Índice de decisiones: pasa; `docs/log.md` espera al cierre.
6. Sin ediciones en `docs/requirements/**`: pasa.
7. `docs:check` y `verify`: pasan.

# Bloqueo

`docs/scope.md` pertenece a `requirements-writer` y no está en la allowlist del
lead. No se tocó nada fuera de alcance. La propuesta de `scope-proposal.md`
contiene los cinco cambios mínimos (alcance vigente, fase 1.16, estado de
requisitos, decisión confirmada y fuera de alcance) para que el criterio 4 se
cumpla sin cambiar reglas; después el lead puede verificar y cerrar.

# Fricción reutilizable

| Síntoma | Evidencia | Workaround | Por qué es reutilizable | Cambio propuesto | Coste/riesgo | Disposición |
|---|---|---|---|---|---|---|
| Una tarea `docs` mezcla ADR/glosario con alcance, de dueños distintos | TASK-0128 y TASK-0143 | requirements-writer aplica `docs/scope.md` | Se repite en cada tarea de documentación de un requisito | Reservar el alcance a requirements-writer al planificar | Bajo | `deferred` a requirements-writer |

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 0 (sin runner) |
| `report_bytes` | 3083 |
| `overflow` | `scope-proposal` |
| `criteria_failed` | 1 bloqueado, 0 fallidos por implementación |

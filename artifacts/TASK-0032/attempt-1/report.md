---
type: Task Report
title: "TASK-0032: informe de ejecución"
description: Helper E2E compartido para esperar MP sin duplicar bucles.
task: TASK-0032
attempt: 1
report_status: success
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T19:57:00Z }
artifacts: artifacts/TASK-0032/attempt-1/
verified:
  - by: task-lead
    at: 2026-11-08T19:56:00Z
    note: >-
      Re-ejecutados test:e2e (63/63) y verify (491 unitarios) con timeout
      explícito; diff completo revisado; sin tests borrados, saltados o
      debilitados ni cambios fuera de alcance.
---

# Estado

`success`. Un único `ensureMp` acotado sustituye los dos bucles de espera de MP;
suite E2E y `verify` en verde sin tocar producción.

# Cambios

- `tests/e2e/support.ts`: `ensureMp(page, minimum)` usa `snapshot`, `EndTurn`
  real vía `endTurn` (rechazo comprobado + `settle`) y guard de 8 turnos; falla
  si `status !== 'playing'` o no llega el MP, y devuelve el snapshot alcanzado.
- `tests/e2e/combat-equipment-qa.spec.ts`: se elimina `waitForMp`; sus dos
  llamadas pasan a `const beforePickup/beforeDagger = await ensureMp(page, 1)`.
- `tests/e2e/equipment-hud-qa.spec.ts`: el `while` inline pasa a
  `await ensureMp(page, 1)` tras `walkTo`.
- Las llamadas quedan en los mismos puntos; sin cambios en `src/`, `index.html`,
  `public/`, Playwright, semillas ni aserciones.
- Commit: `d157f36`.

# Tests

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run test:e2e` | 180 s | 63 passed (30,6 s) | `test-output.txt` |
| `pnpm run verify` | 180 s | exit 0; 491 unit; build OK; 6 avisos previos | `verify-output.txt` |

# Evidencia visual

No aplica: sin cambios de presentación ni capturas nuevas.

# Desviaciones

- El mensaje de fallo por MP insuficiente es genérico (`No se alcanzaron N MP
  tras 8 turnos sin moverse.`); el anterior decía «junto al arma». Solo afecta
  a la ruta de fallo.
- `equipment-hud-qa` gana el guard de 8 turnos y las comprobaciones de `status`
  y `EndTurn` rechazado del helper; antes el `while` era ilimitado y silencioso.
  En verde se usa 1 turno, igual que antes.
- El helper comprueba el MP también tras el 8.º turno: el máximo de turnos
  terminados sigue siendo 8, pero no falla si el MP llega en el último. El
  `waitForMp` previo fallaba en ese borde; ningún test en verde lo alcanza.

# Problemas conocidos y preguntas abiertas

- Ninguno.

# Fricción reutilizable

Ninguna entrada nueva: el workaround duplicado que motivaba la tarea queda
resuelto por este cambio.

# Métricas de handoff

| Métrica | Valor |
|---|---|
| `brief_bytes` | 1894 |
| `report_bytes` | 2423 |
| `overflow` | `none` |
| `criteria_failed` | 0 |

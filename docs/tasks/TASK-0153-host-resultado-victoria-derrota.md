---
type: Task
id: TASK-0153
title: "Host: resultado Victoria/Derrota con Nueva y Cargar"
description: "Mostrar la pantalla final con Victoria o Derrota, ronda, party, semilla y las acciones «Nueva partida» y «Cargar partida», sin reinicio rápido."
status: stable
task_status: done
task_type: feature
requirement: REQ-031
requirement_ids: [R-020, T-010, T-015]
depends_on: [TASK-0126, TASK-0141, TASK-0146, TASK-0147]
unlocks: [TASK-0144, TASK-0154, TASK-0155, TASK-0159]
created_at: 2026-11-14T23:31:45Z
completed_at: 2026-11-15T23:19:37Z
assignee: task-runner
attempts: 1
artifacts: artifacts/TASK-0153/
priority: P1
risk: medium
review_required: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T23:31:45Z }
verified:
  - by: task-lead
    at: 2026-11-15T23:19:37Z
    note: >-
      Intento 1 verificado (código y tests `b3ffee0`, informe `28f66b3`). Diff
      revisado: host, HTML/CSS, tests y artefactos; sin motor, requisitos,
      arnés, dependencias ni docs ajenas. `pnpm run verify` reejecutado:
      109 archivos/1734 tests, docs 729, config, tsc, build y bundle OK. E2E
      nuevo `host-result-qa` 5/5 y 48/48 specs afectadas en serie. Criterios
      1-7 cumplidos; capturas revisadas. Evidencia en
      `artifacts/TASK-0153/lead-verify/verification.md`.
---

# Objetivo

Que al ganar o perder la mesa vea un resultado claro con lo necesario para
repetir o cargar, y que ninguna de las dos acciones ocurra sin elegirla.

# Contexto

REQ-031
[R-020](../requirements/REQ-031-hotseat-local.md#requisitos-creativos-decididos)
fija el resultado; TASK-0147 emite Victoria o Derrota, TASK-0126 aporta el paso 1
y TASK-0141 el cargador compartido. El resultado no tiene pausa, guardado ni
reinicio rápido.

# Criterios de aceptación

- [x] Al terminar la partida aparece una pantalla con Victoria o Derrota, la
      ronda alcanzada, la party con nombres y arquetipos y la semilla.
- [x] «Nueva partida» abre el paso 1 de REQ-016 y no reinicia automáticamente.
- [x] «Cargar partida» usa el cargador de TASK-0141 sin confirmación, porque no
      hay partida en curso.
- [x] El resultado no ofrece pausa, guardado, «Reiniciar» ni atajo de reinicio.
- [x] La pantalla no avanza sola y las dos acciones son explícitas y navegables
      con teclado, con foco visible y anuncios accesibles.
- [x] La semilla se puede leer para repetir la mazmorra.
- [x] Tests de Victoria, Derrota, datos mostrados, «Nueva», «Cargar» y ausencia
      de pausa/guardado; `pnpm run verify` pasa.

# Plan de test

- Unitario: `tests/unit/host/result.test.ts` nuevo.
- Integración: derrota por wipe y victoria; ambas acciones.
- E2E: captura de Victoria y Derrota; la suite completa va en TASK-0154.
- Manual: comprobar que la semilla se lee sin scroll.

# Evidencia esperada

- [x] Informe en `artifacts/TASK-0153/attempt-1/report.md`
- [x] Salida de `pnpm run verify`
- [x] Commit SHA

# Comandos

| Comando | Timeout |
|---|---:|
| `pnpm exec vitest run tests/unit/host/result.test.ts` | 120 s |
| `pnpm run verify` | 240 s |

# Restricciones

- No cambiar las condiciones de victoria o derrota del motor.
- No implementar guardado tras el resultado ni pausa.
- No añadir reinicio rápido ni repetir la misma party sin pasar por el paso 1.
- Handoff: brief 1,5 KB, informe 2 KB; tope duro 4 KB.

# No objetivos

- Cargar con confirmación; no hay partida en curso.
- Historial de partidas, puntuaciones o progresión.
- Audio o arte final del resultado.
- Cámara o paneo en la pantalla final.
